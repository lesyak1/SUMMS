export type VehicleType = 'CAR' | 'BIKE' | 'SCOOTER' | 'UNKNOWN';

interface TransportTypeShape {
    car?: unknown | null;
    bike?: unknown | null;
    scooter?: unknown | null;
}

export const normalizeVehicleType = (value?: string | null): VehicleType => {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'CAR' || normalized === 'BIKE' || normalized === 'SCOOTER') {
        return normalized;
    }

    return 'UNKNOWN';
};

export const resolveVehicleType = (transport: TransportTypeShape): VehicleType => {
    if (transport.car) {
        return 'CAR';
    }

    if (transport.bike) {
        return 'BIKE';
    }

    if (transport.scooter) {
        return 'SCOOTER';
    }

    return 'UNKNOWN';
};
