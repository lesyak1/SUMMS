import type {
    VehicleAvailabilityEvent,
    VehicleAvailabilityObserver
} from './vehicleAvailabilityObserver.js';

export interface RecentAvailabilityChange {
    transportId: string;
    providerId: string;
    availability: boolean;
    source: string;
    reason?: string;
    changedAt: string;
}

export interface TrackedVehicleAvailability {
    availability: boolean;
    providerId: string;
    lastChangedAt: string;
    source: string;
}

export interface VehicleAvailabilityAnalyticsSnapshot {
    trackedVehicles: number;
    availableVehicles: number;
    unavailableVehicles: number;
    totalUpdates: number;
    recentChanges: RecentAvailabilityChange[];
}

export class VehicleAvailabilityAnalyticsObserver implements VehicleAvailabilityObserver {
    private readonly vehicleStates = new Map<string, TrackedVehicleAvailability>();
    private readonly recentChanges: RecentAvailabilityChange[] = [];
    private totalUpdates = 0;

    async update(event: VehicleAvailabilityEvent) {
        this.totalUpdates += 1;
        this.vehicleStates.set(event.transportId, {
            availability: event.currentAvailability,
            providerId: event.providerId,
            lastChangedAt: event.changedAt.toISOString(),
            source: event.source
        });

        this.recentChanges.unshift({
            transportId: event.transportId,
            providerId: event.providerId,
            availability: event.currentAvailability,
            source: event.source,
            ...(event.reason ? { reason: event.reason } : {}),
            changedAt: event.changedAt.toISOString()
        });

        if (this.recentChanges.length > 10) {
            this.recentChanges.length = 10;
        }
    }

    getSnapshot(): VehicleAvailabilityAnalyticsSnapshot {
        const states = [...this.vehicleStates.values()];
        const availableVehicles = states.filter((state) => state.availability).length;
        const unavailableVehicles = states.length - availableVehicles;

        return {
            trackedVehicles: states.length,
            availableVehicles,
            unavailableVehicles,
            totalUpdates: this.totalUpdates,
            recentChanges: this.recentChanges
        };
    }
}
