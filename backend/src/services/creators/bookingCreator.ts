import prisma from '../../prisma.js';
interface CreateBookingInput {
    clientId: string;
    transportId: string;
    departure: string;
    destination: string;
    startTime: Date;
    endTime: Date;
}

class BookingCreator {
    async create(input: CreateBookingInput) {
        const trip = await prisma.trip.create({
            data: {
                clientId: input.clientId,
                departure: input.departure,
                destination: input.destination,
                startTime: input.startTime,
                endTime: input.endTime
            }
        });

        const booking = await prisma.booking.create({
            data: {
                clientId: input.clientId,
                transportId: input.transportId,
                tripId: trip.id,
                bookingDate: new Date(),
                startTime: input.startTime,
                endTime: input.endTime,
                duration: 0,
                totalCost: 0,
                status: 'RESERVED'
            }
        });

        return { trip, booking };
    }
}

export const bookingCreator = new BookingCreator();