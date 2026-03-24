import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { vehicleRecommendationService } from '../services/recommendations/vehicleRecommendationService.js';

const prisma = new PrismaClient();

export const searchVehicles = async (req: Request, res: Response) => {
    try {
        const { type, maxPrice, availability } = req.query;

        let whereClause: any = {};
        if (availability !== undefined) {
            whereClause.availability = availability === 'true';
        }
        if (maxPrice) {
            whereClause.costPerMinute = { lte: Number(maxPrice) };
        }

        if (type) {
            if (typeof type === 'string' && ['CAR', 'BIKE', 'SCOOTER'].includes(type.toUpperCase())) {
                const t = type.toUpperCase();
                whereClause[t.toLowerCase()] = { isNot: null };
            }
        }

        const vehicles = await prisma.transport.findMany({
            where: whereClause,
            include: {
                car: true,
                bike: true,
                scooter: true,
                provider: true
            }
        });

        res.json(vehicles);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch vehicles', details: error.message });
    }
};

export const getVehicleDetails = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const vehicle = await prisma.transport.findUnique({
            where: { id },
            include: {
                car: true,
                bike: true,
                scooter: true,
                provider: true
            }
        });

        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json(vehicle);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch vehicle details', details: error.message });
    }
};

export const getRecommendedVehicles = async (req: Request, res: Response) => {
    try {
        const vehicles = await prisma.transport.findMany({
            include: {
                car: true,
                bike: true,
                scooter: true,
                provider: true
            }
        });

        const recommendation = vehicleRecommendationService.recommend({
            vehicles,
            ...(typeof req.query.type === 'string' ? { requestedType: req.query.type } : {}),
            ...(req.user?.preferredMobility !== undefined ? { preferredMobility: req.user.preferredMobility } : {}),
            ...(req.user?.city !== undefined ? { city: req.user.city } : {})
        });

        res.json(recommendation);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to generate vehicle recommendations', details: error.message });
    }
};
