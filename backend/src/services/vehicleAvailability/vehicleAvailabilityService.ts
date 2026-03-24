import { PrismaClient } from '@prisma/client';
import { VehicleAvailabilityAnalyticsObserver } from './vehicleAvailabilityAnalyticsObserver.js';
import { VehicleAvailabilityAccessLogObserver } from './vehicleAvailabilityAccessLogObserver.js';
import type {
    VehicleAvailabilityEvent,
    VehicleAvailabilitySource
} from './vehicleAvailabilityObserver.js';
import type { VehicleAvailabilityAnalyticsSnapshot } from './vehicleAvailabilityAnalyticsObserver.js';
import { VehicleAvailabilitySubject } from './vehicleAvailabilitySubject.js';

const prisma = new PrismaClient();
const subject = new VehicleAvailabilitySubject();
const analyticsObserver = new VehicleAvailabilityAnalyticsObserver();

subject.subscribe(analyticsObserver);
subject.subscribe(new VehicleAvailabilityAccessLogObserver(prisma));

interface UpdateVehicleAvailabilityInput {
    transportId: string;
    availability: boolean;
    actorUserId?: string;
    source: VehicleAvailabilitySource;
    reason?: string;
}

class VehicleAvailabilityService {
    async updateAvailability(input: UpdateVehicleAvailabilityInput) {
        const existingTransport = await prisma.transport.findUnique({
            where: { id: input.transportId },
            select: { id: true, providerId: true, availability: true }
        });

        if (!existingTransport) {
            throw new Error('Vehicle not found');
        }

        if (existingTransport.availability === input.availability) {
            return prisma.transport.findUnique({
                where: { id: input.transportId },
                include: { car: true, bike: true, scooter: true, provider: true }
            });
        }

        const updatedTransport = await prisma.transport.update({
            where: { id: input.transportId },
            data: { availability: input.availability },
            include: { car: true, bike: true, scooter: true, provider: true }
        });

        const event: VehicleAvailabilityEvent = {
            transportId: existingTransport.id,
            providerId: existingTransport.providerId,
            previousAvailability: existingTransport.availability,
            currentAvailability: input.availability,
            source: input.source,
            ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
            ...(input.reason ? { reason: input.reason } : {}),
            changedAt: new Date()
        };

        await subject.notify(event);

        return updatedTransport;
    }

    getAnalyticsSnapshot(): VehicleAvailabilityAnalyticsSnapshot {
        return analyticsObserver.getSnapshot();
    }
}

export const vehicleAvailabilityService = new VehicleAvailabilityService();
