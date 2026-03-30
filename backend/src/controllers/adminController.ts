import type { Request, Response } from 'express';
import { vehicleAvailabilityService } from '../services/vehicleAvailability/vehicleAvailabilityService.js';

import prisma from '../prisma.js';
export const getRentalAnalytics = async (req: Request, res: Response) => {
    try {
        const { from, to, city, type } = req.query;

        let whereClause: any = {};
        if (from || to) {
            whereClause.bookingDate = {};
            if (from) whereClause.bookingDate.gte = new Date(String(from));
            if (to) whereClause.bookingDate.lte = new Date(String(to));
        }

        if (city) {
            whereClause.client = { city };
        }

        // Filter by type requires joining Transport -> car/bike/scooter logic
        // For simplicity with Prisma count/aggregate, we fetch and reduce in JS since it's an MVP,
        // or query specific ones.
        if (type && typeof type === 'string' && ['CAR', 'BIKE', 'SCOOTER'].includes(type.toUpperCase())) {
            const t = type.toUpperCase();
            whereClause.transport = {
                [t.toLowerCase()]: { isNot: null }
            };
        }

        const totalRentals = await prisma.booking.count({ where: whereClause });
        const completedRentals = await prisma.booking.count({
            where: { ...whereClause, status: 'COMPLETED' }
        });

        const aggregateCost = await prisma.booking.aggregate({
            where: { ...whereClause, status: 'COMPLETED' },
            _sum: { totalCost: true }
        });

        res.json({
            totalRentals,
            completedRentals,
            totalRevenue: aggregateCost._sum.totalCost || 0,
            availabilitySnapshot: vehicleAvailabilityService.getAnalyticsSnapshot()
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch rental analytics', details: error.message });
    }
};

export const getGatewayAnalytics = async (req: Request, res: Response) => {
    try {
        const { from, to, serviceType } = req.query;

        let whereClause: any = {};
        if (from || to) {
            whereClause.timeStamp = {};
            if (from) whereClause.timeStamp.gte = new Date(String(from));
            if (to) whereClause.timeStamp.lte = new Date(String(to));
        }

        if (serviceType) {
            whereClause.serviceType = String(serviceType).toUpperCase();
        }

        const accessLogs = await prisma.accessLog.groupBy({
            by: ['serviceType'],
            where: whereClause,
            _count: {
                id: true,
            },
        });

        res.json({ summary: accessLogs });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch gateway analytics', details: error.message });
    }
};
