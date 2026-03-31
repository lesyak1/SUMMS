import { PrismaClient } from '@prisma/client';
import type {
    VehicleAvailabilityEvent,
    VehicleAvailabilityObserver
} from './vehicleAvailabilityObserver.js';

export class VehicleAvailabilityAccessLogObserver implements VehicleAvailabilityObserver {
    constructor(private readonly prisma: PrismaClient) {}

    async update(event: VehicleAvailabilityEvent) {
        if (!event.actorUserId) {
            return;
        }

        await this.prisma.accessLog.create({
            data: {
                userId: event.actorUserId,
                serviceType: 'RENTAL',
                timeStamp: event.changedAt
            }
        });
    }
}
