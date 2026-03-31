import type { TripPricingContext, TripPricingResult, TripPricingStrategy } from './tripPricingStrategy.js';
import {
    CityTripPricingStrategy,
    PreferenceAlignedTripPricingStrategy,
    StandardTripPricingStrategy,
    VehicleTypeTripPricingStrategy
} from './tripPricingStrategy.js';

class TripPricingService {
    private readonly strategies: TripPricingStrategy[] = [
        new PreferenceAlignedTripPricingStrategy(),
        new CityTripPricingStrategy(),
        new VehicleTypeTripPricingStrategy(),
        new StandardTripPricingStrategy()
    ];

    calculate(context: TripPricingContext): TripPricingResult {
        const strategy = this.strategies.find((candidate) => candidate.supports(context));

        if (!strategy) {
            throw new Error('No trip pricing strategy available');
        }

        return strategy.calculate(context);
    }
}

export const tripPricingService = new TripPricingService();
