import { useEffect, useState } from 'react';
import api from '../lib/api';

const ParkingPage = () => {
    const [spots, setSpots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');

    const fetchSpots = async () => {
        try {
            const res = await api.get('/parking-spots');
            setSpots(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSpots();
    }, []);

    const reserveSpot = async (spotId: string) => {
        try {
            // Mock hardcoded time for reservation
            const start = new Date();
            const end = new Date(start.getTime() + 7200000); // 2 hours

            await api.post('/parking-spots/reservations', {
                spotId,
                startTime: start.toISOString(),
                endTime: end.toISOString()
            });
            setMsg('Spot reserved successfully (for 2 hours)!');
            fetchSpots();
        } catch (err: any) {
            setMsg(err.response?.data?.error || err.message);
        }
    };

    return (
        <div className="page-container">
            <h2>Parking Availability</h2>
            {msg && <p className="status-msg">{msg}</p>}

            {loading ? <p>Loading...</p> : (
                <div className="grid">
                    {spots.map(spot => (
                        <div key={spot.id} className="card">
                            <h3>{spot.location}</h3>
                            <p>Status: {spot.status}</p>
                            <button
                                onClick={() => reserveSpot(spot.id)}
                                disabled={spot.status !== 'AVAILABLE'}
                            >
                                Reserve Spot
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ParkingPage;
