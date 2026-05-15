import type { CSSProperties } from 'react';

export type VehicleImageNode = {
    imageUrl?: string | null;
};

export type VehicleWithMedia = {
    car?: (VehicleImageNode & { model?: string | null; fuelType?: string | null }) | null;
    bike?: VehicleImageNode | null;
    scooter?: (VehicleImageNode & { fuelType?: string | null }) | null;
};

type VehicleType = 'CAR' | 'BIKE' | 'SCOOTER';

export const fallbackStylesByType: Record<VehicleType, CSSProperties> = {
    CAR: {
        background: '#91aca5',
        color: '#ffffff'
    },
    BIKE: {
        background: '#91aca5',
        color: '#ffffff'
    },
    SCOOTER: {
        background: '#91aca5',
        color: '#ffffff'
    }
};

export const getVehicleType = (vehicle: VehicleWithMedia): VehicleType => {
    if (vehicle.car) return 'CAR';
    if (vehicle.bike) return 'BIKE';
    return 'SCOOTER';
};

export const getVehicleImageUrl = (vehicle: VehicleWithMedia): string | null => {
    const image = vehicle.car?.imageUrl || vehicle.bike?.imageUrl || vehicle.scooter?.imageUrl;
    return typeof image === 'string' && image.trim() ? image.trim() : null;
};

export const getVehicleDisplayName = (vehicle: VehicleWithMedia) => vehicle.car?.model || (vehicle.bike ? 'Bike' : 'Scooter');
