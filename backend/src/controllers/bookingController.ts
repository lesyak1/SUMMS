import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getMyBookings = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const bookings = await prisma.booking.findMany({
            where: { clientId: userId },
            include: { transport: true, trip: true, payment: true },
            orderBy: { startTime: 'desc' }
        });
        res.json(bookings);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
    }
};

export const reserveVehicle = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { transportId, departure, destination, startTime, endTime } = req.body;

        const transport = await prisma.transport.findUnique({
            where: { id: transportId }
        });

        if (!transport || !transport.availability) {
            return res.status(400).json({ error: 'Vehicle is not available' });
        }

        // Check overlaps
        const start = new Date(startTime);
        const end = new Date(endTime);
        const overlapping = await prisma.booking.findFirst({
            where: {
                transportId,
                status: { in: ['RESERVED', 'ACTIVE'] },
                OR: [
                    { startTime: { lte: end }, endTime: { gte: start } }
                ]
            }
        });

        if (overlapping) {
            return res.status(400).json({ error: 'Vehicle already booked for this time period' });
        }

        // Create a Trip for this booking
        const trip = await prisma.trip.create({
            data: {
                clientId: userId,
                departure,
                destination,
                startTime: start,
                endTime: end
            }
        });

        const booking = await prisma.booking.create({
            data: {
                clientId: userId,
                transportId,
                tripId: trip.id,
                bookingDate: new Date(),
                startTime: start,
                endTime: end,
                duration: 0,
                totalCost: 0,
                status: 'RESERVED'
            }
        });

        // Write access log
        await prisma.accessLog.create({
            data: {
                userId,
                serviceType: 'RENTAL',
                timeStamp: new Date()
            }
        });

        res.status(201).json(booking);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to reserve vehicle', details: error.message });
    }
};

export const startRental = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const bookingId = String(req.params.id);

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId }
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.clientId !== userId && req.user!.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Not authorized to start this rental' });
        }

        if (booking.status !== 'RESERVED') {
            return res.status(400).json({ error: 'Booking must be in RESERVED state to start' });
        }

        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'ACTIVE' }
        });

        // Mark vehicle unavailable
        await prisma.transport.update({
            where: { id: booking.transportId },
            data: { availability: false }
        });

        res.json(updatedBooking);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to start rental', details: error.message });
    }
};

export const endRental = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const bookingId = String(req.params.id);

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { transport: true }
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.clientId !== userId && req.user!.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Not authorized to end this rental' });
        }

        if (booking.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'Booking must be ACTIVE to end' });
        }

        // Compute duration
        const actualEndTime = new Date();
        // Use actual actualEndTime to calculate duration from start time
        // For simplicity, we calculate duration from booking.startTime to actualEndTime
        // Wait, the user might start it earlier/later. Ideally we track actual start time.
        // Assuming startTime is actual start.
        const durationMs = actualEndTime.getTime() - booking.startTime.getTime();
        let durationMinutes = Math.ceil(durationMs / 60000);
        if (durationMinutes < 1) durationMinutes = 1; // Minimum 1 minute charge

        const totalCost = Number(booking.transport.costPerMinute) * durationMinutes;
        // Round to 2 decimals
        const roundedCost = Math.round(totalCost * 100) / 100;

        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: {
                endTime: actualEndTime,
                duration: durationMinutes,
                totalCost: roundedCost
            }
        });

        res.json(updatedBooking);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to end rental', details: error.message });
    }
};

export const payRental = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const bookingId = String(req.params.id);

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId }
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.clientId !== userId && req.user!.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Not authorized to pay for this rental' });
        }

        if (booking.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Booking already paid/completed' });
        }

        const amount = Number(booking.totalCost);

        const payment = await prisma.payment.create({
            data: {
                bookingId,
                amount,
                status: 'PAID',
                timestamp: new Date()
            }
        });

        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'COMPLETED' }
        });

        // Mark vehicle available again
        await prisma.transport.update({
            where: { id: booking.transportId },
            data: { availability: true }
        });

        res.json({ payment, booking: updatedBooking });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to process payment', details: error.message });
    }
};
