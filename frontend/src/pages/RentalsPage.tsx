import { useEffect, useState } from 'react';
import api from '../lib/api';

const RentalsPage = () => {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<any>(null);

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

    const openPaymentModal = (booking: any) => {
        setSelectedBookingForPayment(booking);
        setPaymentModalOpen(true);
    };

    const confirmPayment = async () => {
        if (!selectedBookingForPayment) return;
        try {
            await api.post(`/bookings/${selectedBookingForPayment.id}/pay`);
            setPaymentModalOpen(false);
            setSelectedBookingForPayment(null);
            fetchBookings(); // reload
        } catch (e: any) {
            alert(e.response?.data?.error || e.message);
        }
    }

    const handleAction = async (id: string, action: 'start' | 'end') => {
        try {
            await api.post(`/bookings/${id}/${action}`);
            fetchBookings(); // reload
        } catch (e: any) {
            alert(e.response?.data?.error || e.message);
        }
    };

    if (loading) return <div>Loading rentals...</div>;

    const currentBookings = bookings.filter(b => b.status === 'RESERVED' || b.status === 'ACTIVE' || (b.status === 'COMPLETED' && !b.payment));
    const pastBookings = bookings.filter(b => (b.status === 'COMPLETED' && b.payment) || b.status === 'CANCELLED');

    return (
        <div className="page-container">
            <h2>My Rentals</h2>
            {error && <p className="error">{error}</p>}

            <h3>Current Rentals & Actions</h3>
            {currentBookings.length === 0 ? <p>No current rentals need your attention.</p> : (
                <div className="grid">
                    {currentBookings.map(b => (
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
                                    <button onClick={() => openPaymentModal(b)} className="success-btn">Pay Now</button>
                                )}
                                {b.payment && <span style={{ color: 'green' }}>✓ Paid</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <h3 style={{ marginTop: '40px' }}>Past Rentals</h3>
            {pastBookings.length === 0 ? <p>No past rentals.</p> : (
                <div className="grid">
                    {pastBookings.map(b => (
                        <div key={b.id} className="card" style={{ opacity: 0.8 }}>
                            <h3>{b.transport?.car?.model || "Mobility Vehicle"}</h3>
                            <p>Status: <strong>{b.status}</strong></p>
                            <p>Date: {new Date(b.bookingDate).toLocaleDateString()}</p>
                            <p>Period: {new Date(b.startTime).toLocaleTimeString()} - {new Date(b.endTime).toLocaleTimeString()}</p>
                            {b.status === 'COMPLETED' && <p>Cost: ${b.totalCost}</p>}
                            {b.payment && <span style={{ color: 'green', fontWeight: 'bold' }}>✓ Paid</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* Payment Modal */}
            {paymentModalOpen && selectedBookingForPayment && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h3>Confirm Payment</h3>
                        <p>Are you sure you want to process the payment of <strong>${selectedBookingForPayment.totalCost}</strong> for this rental?</p>
                        <div className="modal-actions">
                            <button onClick={confirmPayment} className="success-btn">Confirm Payment</button>
                            <button onClick={() => setPaymentModalOpen(false)} style={{ backgroundColor: '#6c757d' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RentalsPage;
