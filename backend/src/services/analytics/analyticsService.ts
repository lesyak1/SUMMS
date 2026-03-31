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
        const usageByCityMap = new Map<string, number>();

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
            usageByCityMap.set(bookingCity, (usageByCityMap.get(bookingCity) || 0) + 1);
        }

        const rentalsByVehicle = Array.from(rentalsByVehicleMap.values()).sort(
            (a, b) => b.rentalCount - a.rentalCount
        );

        const usagePerCity = Array.from(usageByCityMap.entries()).map(([cityName, count]) => ({
            city: cityName,
            count
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

        const scootersCurrentlyAvailableWhere: any = {
            availability: true,
            scooter: { isNot: null }
        };

        if (role === 'MOBILITY_PROVIDER' && providerId) {
            bikesCurrentlyRentedWhere.transport.providerId = providerId;
            scootersCurrentlyAvailableWhere.providerId = providerId;
        }

        const bicyclesCurrentlyRented = await prisma.booking.count({
            where: bikesCurrentlyRentedWhere
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
                scootersCurrentlyAvailable,
                tripsCompletedToday,
                mostUsedMobilityOption,
                usagePerCity
            },
            rentalsByVehicle
        };
    }
};