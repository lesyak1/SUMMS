export type RentalSummary = {
    completedRentals?: number;
    totalRentals?: number;
    totalRevenue?: number;
};

export type VehicleStatusEntry = {
    available?: number;
    rented?: number;
    type: string;
};

export type UsagePerCityEntry = {
    city: string;
    count: number;
};

export type RentalByVehicle = {
    completedRentalCount: number;
    rentalCount: number;
    totalRevenue: number;
    transportId: string;
    vehicleName: string;
    vehicleType: string;
};

export type RentalsAnalytics = {
    requiredMetrics?: {
        mostUsedMobilityOption?: string;
        tripsCompletedToday?: number;
        usagePerCity?: UsagePerCityEntry[];
        vehicleStatusTable?: VehicleStatusEntry[];
    };
    rentalsByVehicle?: RentalByVehicle[];
    summary?: RentalSummary;
};

export type GatewaySummaryEntry = {
    _count: {
        id: number;
    };
    serviceType: string;
};
