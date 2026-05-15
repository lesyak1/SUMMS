import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { getErrorMessage } from '../lib/apiError';
import type { VehicleWithMedia } from '../components/vehicles/vehicleMedia.shared';

type Vehicle = {
    costPerMinute: number;
    availableSlots: { start: string; end: string }[];
    isAvailable: boolean;
} & VehicleWithMedia;

const format = (date: string) =>
    new Date(date).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

const getAvailabilityDisplay = (v: Vehicle) => {
    if (!v.availableSlots || v.availableSlots.length === 0) {
        return {
            text: ['Fully booked'],
            color: '#dc2626'
        };
    }

    const now = new Date();
    const ranges: string[] = [];

    for (const slot of v.availableSlots) {
        const start = new Date(slot.start);
        const end = new Date(slot.end);

        if (start <= now && end >= now) {
            ranges.push(`Available now until ${format(slot.end)}`);
        } else if (start > now) {
            ranges.push(`Available from ${format(slot.start)} to ${format(slot.end)}`);
        }
    }

    return {
        text: ranges,
        color: '#fff'
    };
};

const isWithinAvailableSlots = (
    start: Date,
    end: Date,
    slots: { start: string; end: string }[]
) => {
    return slots.some(slot => {
        const s = new Date(slot.start);
        const e = new Date(slot.end);
        return start >= s && end <= e;
    });
};

const VehicleDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [reservation, setReservation] = useState(() => {
        const start = new Date();
        const end = new Date(start.getTime() + 3600000);
        return {
            departure: 'Downtown',
            destination: 'Uptown',
            startTime: start.toISOString().slice(0, 16),
            endTime: end.toISOString().slice(0, 16)
        };
    });

    useEffect(() => {
        api.get(`/vehicles/${id}`)
            .then(res => setVehicle(res.data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    const handleReserve = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!vehicle) return;

        const start = new Date(reservation.startTime);
        const end = new Date(reservation.endTime);

        if (start >= end) {
            setError('End time must be after start time');
            return;
        }

        if (!isWithinAvailableSlots(start, end, vehicle.availableSlots)) {
            setError('Selected time is not within available slots');
            return;
        }

        try {
            await api.post('/bookings', {
                transportId: id,
                ...reservation,
                startTime: start.toISOString(),
                endTime: end.toISOString()
            });

            navigate('/rentals/current');
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Unable to reserve this vehicle.'));
        }
    };

    if (loading) return <div>Loading details...</div>;
    if (!vehicle) return <div>Vehicle not found</div>;

    const availability = getAvailabilityDisplay(vehicle);

    return (
        <div className="page-container">
            <h1 className="text-5xl font-bold mb-12">Vehicle Details</h1>

            {error && <p className="error">{error}</p>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                <div className="card">
                    <h3>
                        {vehicle.car?.model || (vehicle.bike ? 'City Bike' : 'Electric Scooter')}
                    </h3>

                    {(vehicle.car?.fuelType === 'electric' ||
                        vehicle.scooter?.fuelType === 'electric') && (
                            <span style={{
                                background: '#d1fae5',
                                color: '#065f46',
                                fontSize: 12,
                                padding: '2px 10px',
                                borderRadius: 99,
                                fontWeight: 500,
                                display: 'inline-block',
                                marginBottom: 8
                            }}>
                                Zero emissions
                            </span>
                        )}

                    <p>Price per minute: ${vehicle.costPerMinute}</p>

                    <p style={{ marginTop: 10 }}>
                        Availability:
                        <span style={{ display: 'block', marginTop: 6, color: availability.color }}>
                            {availability.text.map((t, i) => (
                                <div key={i}>{t}</div>
                            ))}
                        </span>
                    </p>

                </div>

                <div />

                {vehicle.isAvailable && (
                    <form onSubmit={handleReserve} className="form-card" style={{ marginTop: '20px' }}>
                        <h3>Reserve Now</h3>

                        <div className="input-group">
                            <label>Departure</label>
                            <input
                                value={reservation.departure}
                                onChange={e => setReservation({ ...reservation, departure: e.target.value })}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Destination</label>
                            <input
                                value={reservation.destination}
                                onChange={e => setReservation({ ...reservation, destination: e.target.value })}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Start Time</label>
                            <input
                                type="datetime-local"
                                value={reservation.startTime}
                                onChange={e => setReservation({ ...reservation, startTime: e.target.value })}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>End Time</label>
                            <input
                                type="datetime-local"
                                value={reservation.endTime}
                                onChange={e => setReservation({ ...reservation, endTime: e.target.value })}
                                required
                            />
                        </div>

                        <button type="submit" style={{ marginTop: '10px' }}>
                            Confirm Booking
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default VehicleDetailPage;