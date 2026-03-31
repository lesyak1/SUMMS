import type {
    VehicleRecommendationContext,
    VehicleRecommendationResult,
    VehicleRecommendationStrategy
} from './vehicleRecommendationStrategy.js';
import {
    CheapestAvailableRecommendationStrategy,
    CityRecommendationStrategy,
    PreferredMobilityRecommendationStrategy,
    VehicleTypeRecommendationStrategy
} from './vehicleRecommendationStrategy.js';

class VehicleRecommendationService {
    private readonly strategies: VehicleRecommendationStrategy[] = [
        new VehicleTypeRecommendationStrategy(),
        new PreferredMobilityRecommendationStrategy(),
        new CityRecommendationStrategy(),
        new CheapestAvailableRecommendationStrategy()
    ];

    recommend(context: VehicleRecommendationContext): VehicleRecommendationResult {
        const candidateVehicles = context.vehicles.filter((vehicle) => vehicle.availability);
        const vehicles = candidateVehicles.length > 0 ? candidateVehicles : context.vehicles;
        const strategy = this.strategies.find((candidate) => candidate.supports({ ...context, vehicles }));

        if (!strategy) {
            throw new Error('No recommendation strategy available');
        }

        return strategy.recommend({ ...context, vehicles });
    }
}

export const vehicleRecommendationService = new VehicleRecommendationService();
