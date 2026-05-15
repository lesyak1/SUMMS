import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import VehicleMedia from '../components/vehicles/VehicleMedia';
import { getVehicleDisplayName, type VehicleWithMedia } from '../components/vehicles/vehicleMedia.shared';

type Vehicle = {
    id: string;
    costPerMinute: number;
    availableSlots: { start: string; end: string }[];
    isAvailable: boolean;
    provider?: { name?: string | null } | null;
} & VehicleWithMedia;

const format = (date: string) =>
    new Date(date).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });


const VehiclesPage = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('');
    const [priceFilter, setPriceFilter] = useState('5.00');
    const navigate = useNavigate();

    const minPrice = 0.05;
    const maxPrice = 5.0;
    const priceValue = Number(priceFilter);
    const sliderProgress = Math.min(100, Math.max(0, ((priceValue - minPrice) / (maxPrice - minPrice)) * 100));

    const fetchVehicles = useCallback(async () => {
        setLoading(true);
        try {
            let query = '?';
            if (typeFilter) query += `type=${typeFilter}&`;
            if (priceFilter) query += `maxPrice=${priceFilter}&`;

            const res = await api.get(`/vehicles${query}`);
            setVehicles(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [typeFilter, priceFilter]);

    useEffect(() => {
        fetchVehicles();
    }, [fetchVehicles]);

    const handleResetFilters = () => {
        setTypeFilter('');
        setPriceFilter('5.00');
    };

    return (
        <div className="page-container vehicles-page">
            <h1 className="text-5xl font-bold mb-12">Find Vehicles</h1>

            <div className="card vehicles-filters-card">
                <div className="vehicles-filter-top-row">
                    <h3>Filter Vehicles</h3>
                    <p className="vehicles-price-readout">Max Price: ${Number(priceFilter).toFixed(2)}/min</p>
                </div>

                <div className="vehicles-range-wrap">
                    <input
                        type="range"
                        value={priceFilter}
                        onChange={(e) => setPriceFilter(e.target.value)}
                        min={0.05}
                        max={5.0}
                        step={0.05}
                        className="vehicles-range"
                        style={{ '--range-progress': `${sliderProgress}%` } as CSSProperties}
                    />
                    <div className="vehicles-range-labels">
                        <span>$0.05</span>
                        <span>$5.00</span>
                    </div>
                </div>

                <div className="vehicles-type-buttons">
                    {['', 'Car', 'Bike', 'Scooter'].map((type) => (
                        <button
                            key={type || 'ALL'}
                            type="button"
                            onClick={() => setTypeFilter(type)}
                            className={typeFilter === type ? 'vehicles-type-btn vehicles-type-btn-active' : 'vehicles-type-btn'}
                        >
                            {type || 'All'}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="vehicles-reset-btn"
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="text-gray-500">Loading...</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vehicles.map((v) => {

                        return (
                            <div
                                key={v.id}
                                className="bg-white rounded-xl shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition"
                            >
                                <VehicleMedia
                                    vehicle={v}
                                    alt={getVehicleDisplayName(v)}
                                    className="h-40 w-full object-cover mb-4"
                                />

                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold mb-2">
                                        {v.car?.model || (v.bike ? 'Bike' : 'Scooter')}
                                    </h3>

                                    {(v.car?.fuelType === 'electric' || v.scooter?.fuelType === 'electric' || v.bike) ? (
                                        <span className="inline-block bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full mb-2">
                                            Zero emissions
                                        </span>
                                    ) : <span style={{opacity: "0"}}className="inline-block bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full mb-2">
                                 
                                    </span> // putting this here so alll content appears on the same line (otherwise inputs will misallign with other cards)
                                    }

                                    <p className="text-sm text-gray-600 mb-1">
                                        Type: {v.car ? 'Car' : v.bike ? 'Bike' : 'Scooter'}
                                    </p>

                                    <p className="text-sm text-gray-600 mb-1">
                                        Price:{' '}
                                        <span className="font-medium">${v.costPerMinute}/min</span>
                                    </p>


                                </div>
                                {v.availableSlots?.length > 0 && <p>Next available time</p>}

                                {v.availableSlots?.length > 0 ? (
                                    <select
                                        className="mt-2 p-2 border rounded w-full text-sm"
                                        style={{ marginBottom: 10 }}
                                    >

                                        {v.availableSlots.map((slot, index) => (
                                            <option key={slot.start} value={index}>
                                                {format(slot.start)} → {format(slot.end)}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-xs text-red-500 mt-2">No available times</p>
                                )}
                                <button
                                    onClick={() => navigate(`/vehicles/${v.id}`)}
                                    disabled={!v.isAvailable}
                                    className={
                                        v.isAvailable
                                            ? 'vehicles-view-btn'
                                            : 'vehicles-view-btn vehicles-view-btn-disabled'
                                    }
                                >
                                    View Details
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && vehicles.length === 0 && (
                <p className="vehicles-empty">No vehicles found.</p>
            )}
        </div>
    );
};

export default VehiclesPage;