import prisma from '../../prisma.js';

type AnalyticsRole = 'ADMIN' | 'MOBILITY_PROVIDER';

interface AnalyticsOptions {
    role: AnalyticsRole;
    providerId?: string;
    from?: string;
    to?: string;
    city?: string;
    type?: string;
}

export const analyticsService = {
    async getRentalAnalytics(options: AnalyticsOptions) {
        const { role, providerId, from, to, city, type } = options;

        const whereClause: any = {};
        const transportFilter: any = {};

        if (from || to) {
            whereClause.bookingDate = {};
            if (from) whereClause.bookingDate.gte = new Date(String(from));
            if (to) whereClause.bookingDate.lte = new Date(String(to));
        }

        if (city) {
            whereClause.client = { city };
        }

        if (
            type &&
            typeof type === 'string' &&
            ['CAR', 'BIKE', 'SCOOTER'].includes(type.toUpperCase())
        ) {
            const t = type.toUpperCase();
            transportFilter[t.toLowerCase()] = { isNot: null };
        }

        if (role === 'MOBILITY_PROVIDER' && providerId) {
            transportFilter.providerId = providerId;
        }

        if (Object.keys(transportFilter).length > 0) {
            whereClause.transport = transportFilter;
        }

        const totalRentals = await prisma.booking.count({
            where: whereClause
        });

        const completedRentals = await prisma.booking.count({
            where: {
                ...whereClause,
                status: 'COMPLETED'
            }
        });

        const aggregateCost = await prisma.booking.aggregate({
            where: {
                ...whereClause,
                status: 'COMPLETED'
            },
            _sum: { totalCost: true }
        });

        const bookings = await prisma.booking.findMany({
            where: whereClause,
            include: {
                transport: {
                    include: {
                        car: true,
                        bike: true,
                        scooter: true,
                        provider: true
                    }
                },
                client: true
            }
        });

        const rentalsByVehicleMap = new Map<string, any>();
        const usageByCityMap = new Map<string, { count: number; activeRentals: number }>();

        let bikeRentals = 0;
        let scooterRentals = 0;

        for (const booking of bookings) {
            const transport = booking.transport;

            const vehicleName =
                transport.car?.model ||
                (transport.bike ? 'Bike' : null) ||
                (transport.scooter ? 'Scooter' : null) ||
                'Mobility Vehicle';

            const vehicleType =
                transport.car ? 'CAR' :
                transport.bike ? 'BIKE' :
                transport.scooter ? 'SCOOTER' :
                'UNKNOWN';

            if (!rentalsByVehicleMap.has(transport.id)) {
                rentalsByVehicleMap.set(transport.id, {
                    transportId: transport.id,
                    vehicleName,
                    vehicleType,
                    providerName: transport.provider?.name || null,
                    rentalCount: 0,
                    completedRentalCount: 0,
                    totalRevenue: 0
                });
            }

            const entry = rentalsByVehicleMap.get(transport.id);
            entry.rentalCount += 1;

            if (booking.status === 'COMPLETED') {
                entry.completedRentalCount += 1;
                entry.totalRevenue += Number(booking.totalCost || 0);
            }

            if (vehicleType === 'BIKE') bikeRentals += 1;
            if (vehicleType === 'SCOOTER') scooterRentals += 1;

            const bookingCity = booking.client?.city || 'Unknown';
            const usageEntry = usageByCityMap.get(bookingCity) || { count: 0, activeRentals: 0 };
            usageEntry.count += 1;
            if (booking.status === 'ACTIVE') {
                usageEntry.activeRentals += 1;
            }
            usageByCityMap.set(bookingCity, usageEntry);
        }

        const rentalsByVehicle = Array.from(rentalsByVehicleMap.values()).sort(
            (a, b) => b.rentalCount - a.rentalCount
        );

        const usagePerCity = Array.from(usageByCityMap.entries()).map(([cityName, entry]) => ({
            city: cityName,
            count: entry.count,
            activeRentals: entry.activeRentals
        }));

        const mostUsedMobilityOption =
            bikeRentals > scooterRentals
                ? 'BIKE'
                : scooterRentals > bikeRentals
                ? 'SCOOTER'
                : 'TIE';

        const bikesCurrentlyRentedWhere: any = {
            status: 'ACTIVE',
            transport: {
                bike: { isNot: null }
            }
        };

        const carsCurrentlyRentedWhere: any = {
            status: 'ACTIVE',
            transport: {
                car: { isNot: null }
            }
        };

        const scootersCurrentlyRentedWhere: any = {
            status: 'ACTIVE',
            transport: {
                scooter: { isNot: null }
            }
        };

        const carsCurrentlyAvailableWhere: any = {
            availability: true,
            car: { isNot: null }
        };

        const bikesCurrentlyAvailableWhere: any = {
            availability: true,
            bike: { isNot: null }
        };

        const scootersCurrentlyAvailableWhere: any = {
            availability: true,
            scooter: { isNot: null }
        };

        if (role === 'MOBILITY_PROVIDER' && providerId) {
            bikesCurrentlyRentedWhere.transport.providerId = providerId;
            carsCurrentlyRentedWhere.transport.providerId = providerId;
            scootersCurrentlyRentedWhere.transport.providerId = providerId;
            carsCurrentlyAvailableWhere.providerId = providerId;
            bikesCurrentlyAvailableWhere.providerId = providerId;
            scootersCurrentlyAvailableWhere.providerId = providerId;
        }

        const bicyclesCurrentlyRented = await prisma.booking.count({
            where: bikesCurrentlyRentedWhere
        });

        const carsCurrentlyRented = await prisma.booking.count({
            where: carsCurrentlyRentedWhere
        });

        const scootersCurrentlyRented = await prisma.booking.count({
            where: scootersCurrentlyRentedWhere
        });

        const carsCurrentlyAvailable = await prisma.transport.count({
            where: carsCurrentlyAvailableWhere
        });

        const bicyclesCurrentlyAvailable = await prisma.transport.count({
            where: bikesCurrentlyAvailableWhere
        });

        const scootersCurrentlyAvailable = await prisma.transport.count({
            where: scootersCurrentlyAvailableWhere
        });

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const tripsCompletedTodayWhere: any = {
            status: 'COMPLETED',
            endTime: {
                gte: todayStart,
                lte: todayEnd
            }
        };

        if (role === 'MOBILITY_PROVIDER' && providerId) {
            tripsCompletedTodayWhere.transport = { providerId };
        }

        const tripsCompletedToday = await prisma.booking.count({
            where: tripsCompletedTodayWhere
        });

        return {
            summary: {
                totalRentals,
                completedRentals,
                totalRevenue: aggregateCost._sum.totalCost || 0
            },
            requiredMetrics: {
                bicyclesCurrentlyRented,
                bicyclesCurrentlyAvailable,
                carsCurrentlyRented,
                carsCurrentlyAvailable,
                scootersCurrentlyRented,
                scootersCurrentlyAvailable,
                tripsCompletedToday,
                mostUsedMobilityOption,
                usagePerCity,
                vehicleStatusTable: [
                    {
                        type: 'CAR',
                        rented: carsCurrentlyRented,
                        available: carsCurrentlyAvailable
                    },
                    {
                        type: 'BIKE',
                        rented: bicyclesCurrentlyRented,
                        available: bicyclesCurrentlyAvailable
                    },
                    {
                        type: 'SCOOTER',
                        rented: scootersCurrentlyRented,
                        available: scootersCurrentlyAvailable
                    }
                ]
            },
            rentalsByVehicle
        };
    }
};
