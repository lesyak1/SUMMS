import type { VehicleType } from '../transport/vehicleType.js';
import { normalizeVehicleType } from '../transport/vehicleType.js';

export interface TripPricingContext {
    durationMinutes: number;
    costPerMinute: number;
    vehicleType: VehicleType;
    city?: string | null;
    preferredMobility?: string | null;
}

export interface TripPricingResult {
    strategy: string;
    total: number;
    adjustments: string[];
}

export interface TripPricingStrategy {
    supports(context: TripPricingContext): boolean;
    calculate(context: TripPricingContext): TripPricingResult;
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const baseCost = (context: TripPricingContext) => context.costPerMinute * context.durationMinutes;

const cityMultipliers: Record<string, number> = {
    toronto: 1.15,
    montreal: 1.1,
    vancouver: 1.12,
    waterloo: 0.95
};

const vehicleTypeMultipliers: Record<Exclude<VehicleType, 'UNKNOWN'>, number> = {
    CAR: 1.2,
    BIKE: 0.75,
    SCOOTER: 0.9
};

export class PreferenceAlignedTripPricingStrategy implements TripPricingStrategy {
    supports(context: TripPricingContext) {
        return normalizeVehicleType(context.preferredMobility) === context.vehicleType;
    }

    calculate(context: TripPricingContext): TripPricingResult {
        const total = roundCurrency(baseCost(context) * 0.9);

        return {
            strategy: 'PREFERENCE_ALIGNED_PRICING',
            total,
            adjustments: ['Applied a 10% discount because the trip matched the user preference']
        };
    }
}

export class CityTripPricingStrategy implements TripPricingStrategy {
    supports(context: TripPricingContext) {
        return Boolean(context.city && cityMultipliers[context.city.trim().toLowerCase()]);
    }

    calculate(context: TripPricingContext): TripPricingResult {
        const normalizedCity = context.city!.trim().toLowerCase();
        const multiplier = cityMultipliers[normalizedCity] ?? 1;
        const total = roundCurrency(baseCost(context) * multiplier);

        return {
            strategy: 'CITY_PRICING',
            total,
            adjustments: [`Applied a ${multiplier}x city multiplier for ${context.city}`]
        };
    }
}

export class VehicleTypeTripPricingStrategy implements TripPricingStrategy {
    supports(context: TripPricingContext) {
        return context.vehicleType !== 'UNKNOWN';
    }

    calculate(context: TripPricingContext): TripPricingResult {
        const multiplier = vehicleTypeMultipliers[context.vehicleType as Exclude<VehicleType, 'UNKNOWN'>];
        const total = roundCurrency(baseCost(context) * multiplier);

        return {
            strategy: 'VEHICLE_TYPE_PRICING',
            total,
            adjustments: [`Applied a ${multiplier}x multiplier for ${context.vehicleType.toLowerCase()} rentals`]
        };
    }
}

export class StandardTripPricingStrategy implements TripPricingStrategy {
    supports() {
        return true;
    }

    calculate(context: TripPricingContext): TripPricingResult {
        return {
            strategy: 'STANDARD_PRICING',
            total: roundCurrency(baseCost(context)),
            adjustments: ['Applied the default per-minute pricing rule']
        };
    }
}
