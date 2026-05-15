import type { Request, Response } from 'express';
import { accessLogCreator } from '../services/creators/accessLogCreator.js';

import prisma from '../prisma.js';
export const listSpots = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const now = new Date();
        const spots = await prisma.parkingSpot.findMany({
            include: {
                reservations: {
                    where: {
                        endTime: { gte: now }
                    },
                    orderBy: { startTime: 'asc' },
                    take: 1
                }
            }
        });

        res.json(spots.map((spot) => {
            const activeReservation = spot.reservations[0] ?? null;
            const effectiveStatus = activeReservation ? 'RESERVED' : 'AVAILABLE';

            // Mock coordinates near Concordia University (SGW Campus), Montreal
            let latitude = 45.4971; 
            let longitude = -73.5789;

            // Add some random offsets for variety
            latitude += (Math.random() - 0.5) * 0.005;
            longitude += (Math.random() - 0.5) * 0.005;

            return {
                ...spot,
                location: spot.location.replace('Toronto', 'Montreal').replace('Yonge St', 'St Catherine St').replace('Main St', 'Sherbrooke St'),
                status: effectiveStatus,
                activeReservation,
                reservedByCurrentUser: activeReservation?.clientId === userId,
                latitude,
                longitude
            };
        }));
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

        const reservation = await prisma.$transaction(async (tx) => {
            const spot = await tx.parkingSpot.findUnique({
                where: { id: spotId },
                select: { id: true, status: true }
            });

            if (!spot) {
                throw new Error('Parking spot not found');
            }

            if (spot.status !== 'AVAILABLE') {
                throw new Error('Parking spot is not currently available');
            }

            const createdReservation = await tx.parkingReservation.create({
                data: {
                    spotId,
                    clientId: userId,
                    startTime: start,
                    endTime: end
                }
            });

            await tx.parkingSpot.update({
                where: { id: spotId },
                data: { status: 'RESERVED' }
            });

            return createdReservation;
        });

        // Write access log
        await accessLogCreator.create({
            userId,
            serviceType: 'PARKING'
        });

        res.status(201).json(reservation);
    } catch (error: any) {
        if (error.message === 'Parking spot not found') {
            return res.status(404).json({ error: error.message });
        }

        if (error.message === 'Parking spot is not currently available') {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to reserve spot', details: error.message });
    }
};

export const unreserveSpot = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const spotId = String(req.params.spotId);
        const now = new Date();

        const reservation = await prisma.parkingReservation.findFirst({
            where: {
                spotId,
                clientId: userId,
                endTime: { gte: now }
            },
            orderBy: { startTime: 'asc' }
        });

        if (!reservation) {
            return res.status(404).json({ error: 'No active reservation found for this parking spot' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.parkingReservation.delete({
                where: { id: reservation.id }
            });

            const remainingReservation = await tx.parkingReservation.findFirst({
                where: {
                    spotId,
                    endTime: { gte: now }
                }
            });

            await tx.parkingSpot.update({
                where: { id: spotId },
                data: {
                    status: remainingReservation ? 'RESERVED' : 'AVAILABLE'
                }
            });
        });

        res.json({ message: 'Parking spot unreserved successfully' });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to unreserve spot', details: error.message });
    }
};
