import prisma from '../../prisma.js';
interface CreateParkingReservationInput {
    spotId: string;
    clientId: string;
    startTime: Date;
    endTime: Date;
}

class ParkingReservationCreator {
    async create(input: CreateParkingReservationInput) {
        return prisma.parkingReservation.create({
            data: {
                spotId: input.spotId,
                clientId: input.clientId,
                startTime: input.startTime,
                endTime: input.endTime
            }
        });
    }
}

export const parkingReservationCreator = new ParkingReservationCreator();