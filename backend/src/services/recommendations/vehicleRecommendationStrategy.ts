import type { VehicleType } from '../transport/vehicleType.js';
import { normalizeVehicleType, resolveVehicleType } from '../transport/vehicleType.js';

interface RecommendationTransport {
    id: string;
    availability: boolean;
    costPerMinute: unknown;
    providerId: string;
    car?: unknown | null;
    bike?: unknown | null;
    scooter?: unknown | null;
    provider?: unknown;
}

export interface VehicleRecommendationContext {
    vehicles: RecommendationTransport[];
    requestedType?: string;
    preferredMobility?: string | null;
    city?: string | null;
}

export interface RecommendedVehicle {
    transport: RecommendationTransport;
    vehicleType: VehicleType;
    score: number;
    reasons: string[];
}

export interface VehicleRecommendationResult {
    strategy: string;
    vehicles: RecommendedVehicle[];
}

export interface VehicleRecommendationStrategy {
    supports(context: VehicleRecommendationContext): boolean;
    recommend(context: VehicleRecommendationContext): VehicleRecommendationResult;
}

const scoreByPrice = (value: unknown) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? Math.max(0, 100 - numericValue * 10) : 0;
};

const sortRecommendations = (vehicles: RecommendedVehicle[]) => (
    vehicles.sort((left, right) => {
        if (right.score !== left.score) {
            return right.score - left.score;
        }

        return Number(left.transport.costPerMinute) - Number(right.transport.costPerMinute);
    })
);

const toRecommendation = (
    transport: RecommendationTransport,
    score: number,
    reasons: string[]
): RecommendedVehicle => ({
    transport,
    vehicleType: resolveVehicleType(transport),
    score,
    reasons
});

const cityPreferences: Record<string, VehicleType[]> = {
    toronto: ['SCOOTER', 'BIKE', 'CAR'],
    montreal: ['BIKE', 'SCOOTER', 'CAR'],
    vancouver: ['BIKE', 'SCOOTER', 'CAR'],
    waterloo: ['SCOOTER', 'BIKE', 'CAR']
};

export class VehicleTypeRecommendationStrategy implements VehicleRecommendationStrategy {
    supports(context: VehicleRecommendationContext) {
        return normalizeVehicleType(context.requestedType) !== 'UNKNOWN';
    }

    recommend(context: VehicleRecommendationContext): VehicleRecommendationResult {
        const requestedType = normalizeVehicleType(context.requestedType);
        const vehicles = context.vehicles.map((vehicle) => {
            const vehicleType = resolveVehicleType(vehicle);
            const score = (vehicleType === requestedType ? 80 : 20) + scoreByPrice(vehicle.costPerMinute);
            const reasons = vehicleType === requestedType
                ? [`Matches the requested vehicle type: ${requestedType}`]
                : ['Included as a fallback when requested type inventory is limited'];

            return toRecommendation(vehicle, score, reasons);
        });

        return {
            strategy: 'VEHICLE_TYPE_RECOMMENDATION',
            vehicles: sortRecommendations(vehicles)
        };
    }
}

export class PreferredMobilityRecommendationStrategy implements VehicleRecommendationStrategy {
    supports(context: VehicleRecommendationContext) {
        return normalizeVehicleType(context.preferredMobility) !== 'UNKNOWN';
    }

    recommend(context: VehicleRecommendationContext): VehicleRecommendationResult {
        const preferredType = normalizeVehicleType(context.preferredMobility);
        const vehicles = context.vehicles.map((vehicle) => {
            const vehicleType = resolveVehicleType(vehicle);
            const score = (vehicleType === preferredType ? 85 : 25) + scoreByPrice(vehicle.costPerMinute);
            const reasons = vehicleType === preferredType
                ? [`Aligned with the user's preferred mobility type: ${preferredType}`]
                : ['Alternative option suggested outside the saved mobility preference'];

            return toRecommendation(vehicle, score, reasons);
        });

        return {
            strategy: 'PREFERRED_MOBILITY_RECOMMENDATION',
            vehicles: sortRecommendations(vehicles)
        };
    }
}

export class CityRecommendationStrategy implements VehicleRecommendationStrategy {
    supports(context: VehicleRecommendationContext) {
        return Boolean(context.city && cityPreferences[context.city.trim().toLowerCase()]);
    }

    recommend(context: VehicleRecommendationContext): VehicleRecommendationResult {
        const normalizedCity = context.city!.trim().toLowerCase();
        const rankedTypes = cityPreferences[normalizedCity] ?? ['CAR', 'BIKE', 'SCOOTER'];
        const vehicles = context.vehicles.map((vehicle) => {
            const vehicleType = resolveVehicleType(vehicle);
            const rank = rankedTypes.indexOf(vehicleType);
            const preferenceBoost = rank === -1 ? 10 : 70 - rank * 20;
            const reasons = rank === -1
                ? [`Offered as a general option for ${context.city}`]
                : [`Ranked for ${context.city} based on local mobility fit`];

            return toRecommendation(vehicle, preferenceBoost + scoreByPrice(vehicle.costPerMinute), reasons);
        });

        return {
            strategy: 'CITY_RECOMMENDATION',
            vehicles: sortRecommendations(vehicles)
        };
    }
}

export class CheapestAvailableRecommendationStrategy implements VehicleRecommendationStrategy {
    supports() {
        return true;
    }

    recommend(context: VehicleRecommendationContext): VehicleRecommendationResult {
        const vehicles = context.vehicles.map((vehicle) => (
            toRecommendation(vehicle, scoreByPrice(vehicle.costPerMinute), ['Ranked by availability and lower cost'])
        ));

        return {
            strategy: 'CHEAPEST_AVAILABLE_RECOMMENDATION',
            vehicles: sortRecommendations(vehicles)
        };
    }
}
