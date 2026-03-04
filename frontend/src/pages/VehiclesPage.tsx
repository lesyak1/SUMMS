import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const VehiclesPage = () => {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('');
    const [priceFilter, setPriceFilter] = useState('');
    const navigate = useNavigate();

    const fetchVehicles = async () => {
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
    };

    useEffect(() => {
        fetchVehicles();
    }, [typeFilter, priceFilter]);

    return (
        <div className="page-container">
            <h2>Find a Vehicle</h2>

            <div className="filters">
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="CAR">Car</option>
                    <option value="BIKE">Bike</option>
                    <option value="SCOOTER">Scooter</option>
                </select>
                <input
                    type="number"
                    placeholder="Max Price per Min"
                    value={priceFilter}
                    onChange={e => setPriceFilter(e.target.value)}
                />
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="grid">
                    {vehicles.map(v => (
                        <div key={v.id} className="card">
                            <h3>{v.car?.model || (v.bike ? 'Bike' : 'Scooter')}</h3>
                            <p>Type: {v.car ? 'Car' : v.bike ? 'Bike' : 'Scooter'}</p>
                            <p>Price: ${v.costPerMinute}/min</p>
                            <p>Available: {v.availability ? 'Yes' : 'No'}</p>
                            <button
                                onClick={() => navigate(`/vehicles/${v.id}`)}
                                disabled={!v.availability}
                            >
                                View Details
                            </button>
                        </div>
                    ))}
                    {vehicles.length === 0 && <p>No vehicles found.</p>}
                </div>
            )}
        </div>
    );
};

export default VehiclesPage;
