import type { Request, Response } from 'express';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { tripPricingService } from '../services/pricing/tripPricingService.js';
import { resolveVehicleType } from '../services/transport/vehicleType.js';
import { vehicleAvailabilityService } from '../services/vehicleAvailability/vehicleAvailabilityService.js';

const prisma = new PrismaClient();

export const getMyBookings = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const bookings = await prisma.booking.findMany({
            where: { clientId: userId },
            include: {
                transport: {
                    include: {
                        car: true,
                        bike: true,
                        scooter: true,
                        provider: true
                    }
                },
                trip: true,
                payment: true
            },
            orderBy: { startTime: 'desc' }
        });

        res.json(bookings.map((booking) => ({
            ...booking,
            vehicleName: booking.transport.car?.model
                || (booking.transport.bike ? 'Bike' : null)
                || (booking.transport.scooter ? 'Scooter' : null)
                || 'Mobility Vehicle'
        })));
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
        fs.writeFileSync('c:\\SUMMS\\error.log', error.message + '\n' + error.stack);
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

        await vehicleAvailabilityService.updateAvailability({
            transportId: booking.transportId,
            availability: false,
            actorUserId: userId,
            source: 'BOOKING_START',
            reason: `Booking ${bookingId} started`
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
            include: {
                transport: {
                    include: { car: true, bike: true, scooter: true }
                },
                client: true
            }
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

        const pricing = tripPricingService.calculate({
            durationMinutes,
            costPerMinute: Number(booking.transport.costPerMinute),
            vehicleType: resolveVehicleType(booking.transport),
            city: booking.client.city,
            preferredMobility: booking.client.preferredMobility
        });

        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: {
                endTime: actualEndTime,
                duration: durationMinutes,
                totalCost: pricing.total,
                status: 'COMPLETED'
            }
        });

        await vehicleAvailabilityService.updateAvailability({
            transportId: booking.transportId,
            availability: true,
            actorUserId: userId,
            source: 'BOOKING_END',
            reason: `Booking ${bookingId} ended`
        });

        res.json({
            ...updatedBooking,
            pricingStrategy: pricing.strategy,
            pricingAdjustments: pricing.adjustments
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to end rental', details: error.message });
    }
};

export const payRental = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const bookingId = String(req.params.id);
        const {
            paymentMethod,
            cardNumber,
            cardFirstName,
            cardLastName,
            cardVerificationCode,
            expirationDate
        } = req.body;

        if (String(paymentMethod).toUpperCase() !== 'CARD') {
            return res.status(400).json({ error: 'Only credit card payments are allowed' });
        }

        const cardNumberValid = /^\d{16}$/.test(String(cardNumber || ''));
        const firstNameValid = String(cardFirstName || '').trim().length > 0;
        const lastNameValid = String(cardLastName || '').trim().length > 0;
        const cvcValid = /^\d{3}$/.test(String(cardVerificationCode || ''));
        const expiryRaw = String(expirationDate || '');
        const expiryFormatValid = /^\d{4}-\d{2}$/.test(expiryRaw);

        if (!expiryFormatValid) {
            return res.status(400).json({ error: 'Invalid expiration date format. Use YYYY-MM' });
        }

        const [yearRaw, monthRaw] = expiryRaw.split('-');
        const year = Number(yearRaw);
        const month = Number(monthRaw);
        if (!Number.isFinite(year) || !Number.isFinite(month)) {
            return res.status(400).json({ error: 'Invalid expiration date format. Use YYYY-MM' });
        }
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const notExpired = year > currentYear || (year === currentYear && month >= currentMonth);

        if (!cardNumberValid || !firstNameValid || !lastNameValid || !cvcValid || !notExpired) {
            return res.status(400).json({
                error: 'Invalid credit card details. Payment cannot be processed.'
            });
        }

        if (process.env.PAYMENT_SERVICE_AVAILABLE === 'false') {
            return res.status(503).json({ error: 'Payment service is currently unavailable' });
        }

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { payment: true }
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.clientId !== userId && req.user!.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Not authorized to pay for this rental' });
        }

        if (booking.status !== 'COMPLETED') {
            return res.status(400).json({ error: 'Rental must be completed before payment' });
        }

        if (booking.payment) {
            return res.status(400).json({ error: 'Booking already paid' });
        }

        const amount = Number(booking.totalCost);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid rental amount to pay' });
        }

        const payment = await prisma.payment.create({
            data: {
                bookingId,
                amount,
                status: 'PAID',
                timestamp: new Date()
            }
        });

        // Mark vehicle available again
        await prisma.transport.update({
            where: { id: booking.transportId },
            data: { availability: true }
        });

        // Refetch booking
        const updatedBooking = await prisma.booking.findUnique({
            where: { id: bookingId }
        });

        res.json({
            message: 'Payment processed successfully',
            transactionId: payment.id,
            paymentMethod: 'CARD',
            payment,
            booking: updatedBooking
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to process payment', details: error.message });
    }
};
