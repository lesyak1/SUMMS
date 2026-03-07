import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getProviders = async (req: Request, res: Response) => {
    try {
        const providers = await prisma.mobilityProvider.findMany();
        res.json(providers);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch providers', details: error.message });
    }
};

export const addVehicle = async (req: Request, res: Response) => {
    try {
        const { providerId, costPerMinute, type, model } = req.body;

        if (!providerId || !costPerMinute || !type) {
            return res.status(400).json({ error: 'Missing required fields: providerId, costPerMinute, type' });
        }

        const transport = await prisma.transport.create({
            data: {
                providerId,
                costPerMinute,
                availability: true, // Default to true when added
                ...(type === 'CAR' ? { car: { create: { model: model || 'Unknown' } } } : {}),
                ...(type === 'BIKE' ? { bike: { create: {} } } : {}),
                ...(type === 'SCOOTER' ? { scooter: { create: {} } } : {}),
            },
            include: { car: true, bike: true, scooter: true }
        });

        res.status(201).json(transport);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to add vehicle', details: error.message });
    }
};

export const updateVehicle = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { costPerMinute, availability, model } = req.body;

        const existingTransport = await prisma.transport.findUnique({
            where: { id },
            include: { car: true, bike: true, scooter: true }
        });

        if (!existingTransport) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        const transportCar = (existingTransport as any).car;

        const updatedTransport = await prisma.transport.update({
            where: { id },
            data: {
                ...(costPerMinute !== undefined && { costPerMinute }),
                ...(availability !== undefined && { availability }),
                ...(model && transportCar ? { car: { update: { model } } } : {})
            },
            include: { car: true, bike: true, scooter: true }
        });

        res.json(updatedTransport);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to update vehicle', details: error.message });
    }
};

export const removeVehicle = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);

        // Check for active bookings
        const activeBookings = await prisma.booking.findFirst({
            where: {
                transportId: id,
                status: { in: ['ACTIVE', 'RESERVED'] }
            }
        });

        if (activeBookings) {
            return res.status(400).json({ error: 'Cannot remove vehicle with active or reserved bookings' });
        }

        await prisma.transport.delete({
            where: { id }
        });

        res.json({ message: 'Vehicle removed successfully' });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to remove vehicle', details: error.message });
    }
};
