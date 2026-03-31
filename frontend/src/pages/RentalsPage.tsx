import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../features/auth/context/AuthContext';
import { Link } from 'react-router-dom';

const RentalsPage = () => {
    const { profile } = useAuth();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<any>(null);
    const [paymentConfirmation, setPaymentConfirmation] = useState('');
    const [paymentError, setPaymentError] = useState('');

    const getPaymentStorageKey = (userId: string) => `summs_card_profile_${userId}`;

    const getStoredPaymentData = () => {
        if (!profile) return null;
        const raw = localStorage.getItem(getPaymentStorageKey(profile.id));
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    };

    const isPaymentDataValid = (paymentData: any) => {
        if (!paymentData) return false;
        const cardNumberValid = /^\d{16}$/.test(String(paymentData.cardNumber || ''));
        const firstNameValid = String(paymentData.cardFirstName || '').trim().length > 0;
        const lastNameValid = String(paymentData.cardLastName || '').trim().length > 0;
        const cvcValid = /^\d{3}$/.test(String(paymentData.cardVerificationCode || ''));
        const expiryRaw = String(paymentData.expirationDate || '');
        const expiryValid = /^\d{4}-\d{2}$/.test(expiryRaw);
        if (!expiryValid) return false;

        const [year, month] = expiryRaw.split('-').map(Number);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const notExpired = year > currentYear || (year === currentYear && month >= currentMonth);

        return cardNumberValid && firstNameValid && lastNameValid && cvcValid && notExpired;
    };

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
        const paymentData = getStoredPaymentData();
        if (!isPaymentDataValid(paymentData)) {
            setPaymentError('Payment cannot be processed yet. Please enter valid credit card details in Account Settings.');
            return;
        }
        setPaymentError('');
        setSelectedBookingForPayment(booking);
        setPaymentModalOpen(true);
    };

    const confirmPayment = async () => {
        if (!selectedBookingForPayment) return;
        try {
            const paymentData = getStoredPaymentData();
            if (!isPaymentDataValid(paymentData)) {
                setPaymentError('Payment cannot be processed yet. Please enter valid credit card details in Account Settings.');
                return;
            }

            const res = await api.post(`/bookings/${selectedBookingForPayment.id}/pay`, {
                paymentMethod: 'CARD',
                cardNumber: paymentData.cardNumber,
                cardFirstName: paymentData.cardFirstName,
                cardLastName: paymentData.cardLastName,
                cardVerificationCode: paymentData.cardVerificationCode,
                expirationDate: paymentData.expirationDate
            });
            setPaymentConfirmation(`Payment confirmed. Transaction ID: ${res.data.transactionId}`);
            setPaymentError('');
            setPaymentModalOpen(false);
            setSelectedBookingForPayment(null);
            fetchBookings(); // reload
        } catch (e: any) {
            setPaymentError(e.response?.data?.error || e.message);
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
            <h1 className="text-5xl font-bold mb-12">My Rentals</h1>
            {error && <p className="error">{error}</p>}
            {paymentConfirmation && <p className="status-msg">{paymentConfirmation}</p>}
            {paymentError && (
                <div className="card-error-banner" style={{ marginBottom: 20 }}>
                    {paymentError} <Link to="/account">Go to Account Settings</Link>
                </div>
            )}

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

                            <div style={{ marginTop: "auto" }}>
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
                        <p>Total amount to pay: <strong>${selectedBookingForPayment.totalCost}</strong></p>
                        <p>Payment method: <strong>Credit Card</strong></p>
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
