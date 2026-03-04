import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const VehicleDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [vehicle, setVehicle] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [reservation, setReservation] = useState({
        departure: 'Downtown',
        destination: 'Uptown',
        startTime: new Date().toISOString().slice(0, 16),
        endTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16) // +1 hour
    });

    useEffect(() => {
        api.get(`/vehicles/${id}`)
            .then(res => setVehicle(res.data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    const handleReserve = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/bookings', {
                transportId: id,
                ...reservation,
                startTime: new Date(reservation.startTime).toISOString(),
                endTime: new Date(reservation.endTime).toISOString()
            });
            navigate('/rentals/current');
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        }
    };

    if (loading) return <div>Loading details...</div>;
    if (!vehicle) return <div>Vehicle not found</div>;

    return (
        <div className="page-container">
            <h2>Vehicle Details</h2>
            {error && <p className="error">{error}</p>}

            <div className="card">
                <h3>{vehicle.car?.model || (vehicle.bike ? 'City Bike' : 'Electric Scooter')}</h3>
                <p>Price per minute: ${vehicle.costPerMinute}</p>
                <p>Availability: {vehicle.availability ? 'Available' : 'Currently Rented'}</p>
            </div>

            {vehicle.availability && (
                <form onSubmit={handleReserve} className="form-card" style={{ marginTop: '20px' }}>
                    <h3>Reserve Now</h3>
                    <div className="input-group">
                        <label>Departure</label>
                        <input value={reservation.departure} onChange={e => setReservation({ ...reservation, departure: e.target.value })} required />
                    </div>
                    <div className="input-group">
                        <label>Destination</label>
                        <input value={reservation.destination} onChange={e => setReservation({ ...reservation, destination: e.target.value })} required />
                    </div>
                    <div className="input-group">
                        <label>Start Time</label>
                        <input type="datetime-local" value={reservation.startTime} onChange={e => setReservation({ ...reservation, startTime: e.target.value })} required />
                    </div>
                    <div className="input-group">
                        <label>End Time</label>
                        <input type="datetime-local" value={reservation.endTime} onChange={e => setReservation({ ...reservation, endTime: e.target.value })} required />
                    </div>
                    <button type="submit" style={{ marginTop: '10px' }}>Confirm Booking</button>
                </form>
            )}
        </div>
    );
};

export default VehicleDetailPage;
