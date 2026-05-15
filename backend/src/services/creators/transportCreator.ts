import prisma from '../../prisma.js';

const EMISSION_FACTORS: Record<string, number> = {
    petrol: 185,
    diesel: 171,
    electric: 0
};

interface CreateTransportInput {
    providerId: string;
    costPerMinute: number;
    type: string;
    model?: string;
    fuelType?: string;
    imageUrl?: string;
    availability: boolean;
    availableFrom: Date;
    availableTo: Date;
}class TransportCreator {
    async create(input: CreateTransportInput) {
        const normalizedType = String(input.type).toUpperCase();
        const fuelType = input.fuelType || 'petrol';
        const emissionFactorGPerKm = EMISSION_FACTORS[fuelType] ?? 185;
        const imageUrl = input.imageUrl?.trim() || undefined;

        const imageCreateData = imageUrl ? { imageUrl } : {};

        if (!input.availableFrom || !input.availableTo) {
            throw new Error('Missing availability dates');
        }

        if (input.availableFrom >= input.availableTo) {
            throw new Error('Invalid availability range');
        }

        return prisma.transport.create({
            data: {
                providerId: input.providerId,
                costPerMinute: input.costPerMinute,
                availability: true,
                availableFrom: input.availableFrom,
                availableTo: input.availableTo,

                ...(normalizedType === 'CAR'
                    ? {
                        car: {
                            create: {
                                model: input.model || 'Unknown',
                                fuelType,
                                emissionFactorGPerKm,
                                ...imageCreateData
                            }
                        }
                    }
                    : {}),

                ...(normalizedType === 'BIKE'
                    ? {
                        bike: {
                            create: { ...imageCreateData }
                        }
                    }
                    : {}),

                ...(normalizedType === 'SCOOTER'
                    ? {
                        scooter: {
                            create: {
                                fuelType,
                                emissionFactorGPerKm,
                                ...imageCreateData
                            }
                        }
                    }
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