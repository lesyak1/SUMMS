import type {
    VehicleAvailabilityEvent,
    VehicleAvailabilityObserver
} from './vehicleAvailabilityObserver.js';

export class VehicleAvailabilitySubject {
    private readonly observers = new Set<VehicleAvailabilityObserver>();

    subscribe(observer: VehicleAvailabilityObserver) {
        this.observers.add(observer);
    }

    unsubscribe(observer: VehicleAvailabilityObserver) {
        this.observers.delete(observer);
    }

    async notify(event: VehicleAvailabilityEvent) {
        await Promise.all(
            [...this.observers].map(async (observer) => {
                await observer.update(event);
            })
        );
    }
}
