import { useEffect, useState } from 'react';
import api from '../lib/api';

const RentalsPage = () => {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchBookings = async () => {
        try {
            const res = await api.get('/bookings/me');
            setBookings(res.data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleAction = async (id: string, action: 'start' | 'end' | 'pay') => {
        try {
            await api.post(`/bookings/${id}/${action}`);
            fetchBookings(); // reload
        } catch (e: any) {
            alert(e.response?.data?.error || e.message);
        }
    };

    if (loading) return <div>Loading rentals...</div>;

    return (
        <div className="page-container">
            <h2>My Rentals</h2>
            {error && <p className="error">{error}</p>}

            {bookings.length === 0 ? <p>No current rentals.</p> : (
                <div className="grid">
                    {bookings.map(b => (
                        <div key={b.id} className="card">
                            <h3>{b.transport?.car?.model || "Mobility Vehicle"}</h3>
                            <p>Status: <strong>{b.status}</strong></p>
                            <p>Date: {new Date(b.bookingDate).toLocaleDateString()}</p>
                            <p>Period: {new Date(b.startTime).toLocaleTimeString()} - {new Date(b.endTime).toLocaleTimeString()}</p>
                            {b.status === 'COMPLETED' && <p>Cost: ${b.totalCost}</p>}

                            <div style={{ marginTop: 10 }}>
                                {b.status === 'RESERVED' && <button onClick={() => handleAction(b.id, 'start')}>Start Rental</button>}
                                {b.status === 'ACTIVE' && <button onClick={() => handleAction(b.id, 'end')}>End Rental</button>}
                                {b.status === 'ACTIVE' && <p style={{ fontSize: '0.8rem', color: '#666' }}>* Ending computes final cost</p>}
                                {b.status === 'COMPLETED' && !b.payment && (
                                    <button onClick={() => handleAction(b.id, 'pay')} className="success-btn">Pay Now</button>
                                )}
                                {b.payment && <span style={{ color: 'green' }}>✓ Paid</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RentalsPage;
