import type { Request, Response } from 'express';
import { vehicleRecommendationService } from '../services/recommendations/vehicleRecommendationService.js';

import prisma from '../prisma.js';
import { getAvailableSlots } from '../utils/availability.js';
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
            const t = String(type).toUpperCase();
            if (['CAR', 'BIKE', 'SCOOTER'].includes(t)) {
                whereClause[t.toLowerCase()] = { isNot: null };
            }
        }

        const vehicles = await prisma.transport.findMany({
            where: whereClause,
            include: {
                car: true,
                bike: true,
                scooter: true,
                provider: true,
                bookings: true
            }
        });

        const enriched = vehicles.map(v => {
            let slots: any[] = [];

            if (v.availableFrom && v.availableTo) {
                slots = getAvailableSlots(
                    v.availableFrom,
                    v.availableTo,
                    v.bookings || []
                );
            }

            if (!slots.length) {
                slots = [{
                    start: new Date(),
                    end: new Date(Date.now() + 3600000)
                }];
            }

            return {
                ...v,
                availableSlots: slots,
                isAvailable: slots.length > 0
            };
        });
        res.json(enriched);
    } catch (error: any) {
        res.status(500).json({
            error: 'Failed to fetch vehicles',
            details: error.message
        });
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
                provider: true,
                bookings: true
            }
        });

        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        let availableSlots: any[] = [];
        /* c8 ignore next */
        if (vehicle.availableFrom && vehicle.availableTo) {
            availableSlots = getAvailableSlots(
                vehicle.availableFrom,
                vehicle.availableTo,
                vehicle.bookings || []
            );
        }

        if (!availableSlots.length) {
            availableSlots = [{
                start: new Date(),
                end: new Date(Date.now() + 3600000)
            }];
        }

        res.json({
            ...vehicle,
            availableSlots,
            isAvailable: availableSlots.length > 0
        });

    } catch (error: any) {
        res.status(500).json({
            error: 'Failed to fetch vehicle details',
            details: error.message
        });
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
        res.status(500).json({
            error: 'Failed to generate vehicle recommendations',
            details: error.message
        });
    }
};