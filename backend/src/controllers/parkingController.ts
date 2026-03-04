import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const listSpots = async (req: Request, res: Response) => {
    try {
        const spots = await prisma.parkingSpot.findMany();
        res.json(spots);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch parking spots', details: error.message });
    }
};

export const reserveSpot = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { spotId, startTime, endTime } = req.body;

        const start = new Date(startTime);
        const end = new Date(endTime);

        // Check overlaps
        const overlapping = await prisma.parkingReservation.findFirst({
            where: {
                spotId,
                OR: [
                    { startTime: { lte: end }, endTime: { gte: start } }
                ]
            }
        });

        if (overlapping) {
            return res.status(400).json({ error: 'Spot already reserved for this time period' });
        }

        const reservation = await prisma.parkingReservation.create({
            data: {
                spotId,
                clientId: userId,
                startTime: start,
                endTime: end
            }
        });

        // Write access log
        await prisma.accessLog.create({
            data: {
                userId,
                serviceType: 'PARKING',
                timeStamp: new Date()
            }
        });

        res.status(201).json(reservation);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to reserve spot', details: error.message });
    }
};
