import prisma from '../../prisma.js';
interface CreateTransportInput {
    providerId: string;
    costPerMinute: number;
    type: string;
    model?: string;
}

class TransportCreator {
    async create(input: CreateTransportInput) {
        const normalizedType = String(input.type).toUpperCase();

        return prisma.transport.create({
            data: {
                providerId: input.providerId,
                costPerMinute: input.costPerMinute,
                availability: true,
                ...(normalizedType === 'CAR'
                    ? { car: { create: { model: input.model || 'Unknown' } } }
                    : {}),
                ...(normalizedType === 'BIKE'
                    ? { bike: { create: {} } }
                    : {}),
                ...(normalizedType === 'SCOOTER'
                    ? { scooter: { create: {} } }
                    : {})
            },
            include: {
                car: true,
                bike: true,
                scooter: true
            }
        });
    }
}

export const transportCreator = new TransportCreator();