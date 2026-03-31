import type { Request, Response } from 'express';
import { vehicleAvailabilityService } from '../services/vehicleAvailability/vehicleAvailabilityService.js';

import prisma from '../prisma.js';
import { analyticsService } from '../services/analytics/analyticsService.js';

export const getRentalAnalytics = async (req: Request, res: Response) => {
    try {
        const { from, to, city, type } = req.query;

        const role = req.user?.role === 'MOBILITY_PROVIDER' ? 'MOBILITY_PROVIDER' : 'ADMIN';

        const analyticsOptions: any = {
            role
        };
        
        if (req.user?.role === 'MOBILITY_PROVIDER') {
            analyticsOptions.providerId = req.user.id;
        }
        
        if (from) analyticsOptions.from = String(from);
        if (to) analyticsOptions.to = String(to);
        if (city) analyticsOptions.city = String(city);
        if (type) analyticsOptions.type = String(type);
        
        const analytics = await analyticsService.getRentalAnalytics(analyticsOptions);

        res.json({
            ...analytics,
            availabilitySnapshot:
                req.user?.role === 'ADMIN'
                    ? vehicleAvailabilityService.getAnalyticsSnapshot()
                    : null
        });
    } catch (error: any) {
        res.status(500).json({
            error: 'Failed to fetch rental analytics',
            details: error.message
        });
    }
};

export const getGatewayAnalytics = async (req: Request, res: Response) => {
    try {
        const { from, to, serviceType } = req.query;

        const whereClause: any = {};
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
                id: true
            }
        });

        res.json({ summary: accessLogs });
    } catch (error: any) {
        res.status(500).json({
            error: 'Failed to fetch gateway analytics',
            details: error.message
        });
    }
};
