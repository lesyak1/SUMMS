export type VehicleAvailabilitySource =
    | 'BOOKING_START'
    | 'BOOKING_END'
    | 'PROVIDER_DASHBOARD';

export interface VehicleAvailabilityEvent {
    transportId: string;
    providerId: string;
    previousAvailability: boolean;
    currentAvailability: boolean;
    actorUserId?: string;
    source: VehicleAvailabilitySource;
    reason?: string;
    changedAt: Date;
}

export interface VehicleAvailabilityObserver {
    update(event: VehicleAvailabilityEvent): Promise<void>;
}
