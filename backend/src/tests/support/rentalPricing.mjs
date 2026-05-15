const normalizeVehicleType = (value) => {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'CAR' || normalized === 'BIKE' || normalized === 'SCOOTER') {
        return normalized;
    }

    return 'UNKNOWN';
};

const roundCurrency = (value) => Math.round(value * 100) / 100;
const baseCost = (context) => context.costPerMinute * context.durationMinutes;

const cityMultipliers = {
    toronto: 1.15,
    montreal: 1.1,
    vancouver: 1.12,
    waterloo: 0.95
};

const vehicleTypeMultipliers = {
    CAR: 1.2,
    BIKE: 0.75,
    SCOOTER: 0.9
};

export const calculateRentalPricing = (context) => {
    if (normalizeVehicleType(context.preferredMobility) === context.vehicleType) {
        return {
            strategy: 'PREFERENCE_ALIGNED_PRICING',
            total: roundCurrency(baseCost(context) * 0.9),
            adjustments: ['Applied a 10% discount because the trip matched the user preference']
        };
    }

    const normalizedCity = String(context.city || '').trim().toLowerCase();
    if (normalizedCity && cityMultipliers[normalizedCity]) {
        const multiplier = cityMultipliers[normalizedCity];
        return {
            strategy: 'CITY_PRICING',
            total: roundCurrency(baseCost(context) * multiplier),
            adjustments: [`Applied a ${multiplier}x city multiplier for ${context.city}`]
        };
    }

    if (context.vehicleType !== 'UNKNOWN') {
        const multiplier = vehicleTypeMultipliers[context.vehicleType];
        return {
            strategy: 'VEHICLE_TYPE_PRICING',
            total: roundCurrency(baseCost(context) * multiplier),
            adjustments: [`Applied a ${multiplier}x multiplier for ${context.vehicleType.toLowerCase()} rentals`]
        };
    }

    return {
        strategy: 'STANDARD_PRICING',
        total: roundCurrency(baseCost(context)),
        adjustments: ['Applied the default per-minute pricing rule']
    };
};
