import { useEffect, useState } from 'react';
import { Leaf } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../features/auth/context/useAuth';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getErrorMessage } from '../lib/apiError';
import {
    getPaymentStorageKey,
    isRentalPaymentDataValid,
    parseStoredPaymentData,
    splitRentalsByStatus,
    type RentalPaymentData
} from '../features/rentals/rentalHelpers';

type BookingTransport = {
    car?: {
        model?: string | null;
    } | null;
};

type Booking = {
    bookingDate: string;
    co2Kg?: number | null;
    endTime: string;
    id: string;
    payment?: Record<string, unknown> | null;
    startTime: string;
    status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED' | 'RESERVED';
    totalCost: number;
    transport?: BookingTransport | null;
};

const RentalsPage = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<Booking | null>(null);
    const [paymentConfirmation, setPaymentConfirmation] = useState(
        (location.state as { paymentConfirmation?: string } | null)?.paymentConfirmation ?? ''
    );
    const [paymentError, setPaymentError] = useState('');

    const getStoredPaymentData = (): RentalPaymentData | null => {
        if (!profile) return null;
        const raw = localStorage.getItem(getPaymentStorageKey(profile.id));
        return parseStoredPaymentData(raw);
    };

    const fetchBookings = async () => {
        try {
            const res = await api.get('/bookings/me');
            setBookings(res.data as Booking[]);
        } catch (e: unknown) {
            setError(getErrorMessage(e, 'Unable to load rentals.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const openPaymentModal = (booking: Booking) => {
        const paymentData = getStoredPaymentData();
        if (!isRentalPaymentDataValid(paymentData)) {
            navigate(`/payment?bookingId=${booking.id}`);
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
            if (!isRentalPaymentDataValid(paymentData)) {
                setPaymentError('Payment cannot be processed yet. Please enter valid credit card details in Account Settings.');
                return;
            }
            if (!paymentData) {
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
        } catch (e: unknown) {
            setPaymentError(getErrorMessage(e, 'Unable to process payment.'));
        }
    }

    const handleAction = async (id: string, action: 'start' | 'end') => {
        try {
            await api.post(`/bookings/${id}/${action}`);
            fetchBookings(); // reload
        } catch (e: unknown) {
            alert(getErrorMessage(e, `Unable to ${action} this rental.`));
        }
    };

    if (loading) return <div>Loading rentals...</div>;

    const { currentBookings, pastBookings } = splitRentalsByStatus(bookings);
    const totalCo2Kg = profile?.totalCo2Kg || 0;

    return (
        <div className="page-container">
            <h1 className="text-5xl font-bold mb-12">My Rentals</h1>

            <div className="card analytics-co2-card rentals-co2-card">
                <div className="analytics-co2-header">
                    <div>
                        <h3>My CO2 Tracker</h3>
                        <p className="analytics-co2-description">Your completed-trip emissions so far.</p>
                    </div>
                    <Leaf size={30} color="white" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <div className="analytics-co2-grid rentals-co2-grid">
                    <div className="analytics-co2-stat analytics-co2-stat-primary">
                        <p className="analytics-co2-label">Total CO2</p>
                        <p className="analytics-co2-value">{totalCo2Kg.toFixed(2)} kg</p>
                    </div>
                </div>
            </div>
            {error && <p className="error">{error}</p>}
            {paymentConfirmation && <p className="status-msg">{paymentConfirmation}</p>}
            {paymentError && (
                <div className="card-error-banner" style={{ marginBottom: 20 }}>
                    {paymentError} <Link to="/account">Go to Account Settings</Link>
                </div>
            )}

            <h3 className="rentals-section-title">Current Rentals & Actions</h3>
            {currentBookings.length === 0 ? <p>No current rentals need your attention.</p> : (
                <div className="grid">
                    {currentBookings.map(b => (
                        <div
                            key={b.id}
                            className={b.status === 'ACTIVE' ? 'card rentals-current-card rentals-active-card' : 'card rentals-current-card'}
                        >
                            <h3>{b.transport?.car?.model || "Mobility Vehicle"}</h3>
                            <p>Status: <strong>{b.status}</strong></p>
                            <p>Date: {new Date(b.bookingDate).toLocaleDateString()}</p>
                            <p>Period: {new Date(b.startTime).toLocaleTimeString()} - {new Date(b.endTime).toLocaleTimeString()}</p>
                            {b.status === 'COMPLETED' && <p>Cost: ${b.totalCost}</p>}
                            {b.co2Kg != null && <p style={{ color: '#6c757d', fontSize: 13 }}>CO2: {b.co2Kg.toFixed(2)} kg</p>}

                            <div style={{ marginTop: "auto" }}>
                                {b.status === 'RESERVED' && <button onClick={() => handleAction(b.id, 'start')}>Start Rental</button>}
                                {b.status === 'ACTIVE' && <button className="del-btn" onClick={() => handleAction(b.id, 'end')}>End Rental</button>}
                                {b.status === 'ACTIVE' && <p style={{ fontSize: '0.8rem', color: '#666' }}>* Ending computes final cost</p>}
                                {b.status === 'COMPLETED' && !b.payment && (
                                    <button onClick={() => openPaymentModal(b)} className="rentals-pay-btn">Pay Now</button>
                                )}
                                {b.payment && <span style={{ color: 'green' }}>✓ Paid</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <h3 className="rentals-section-title" style={{ marginTop: '40px' }}>Past Rentals</h3>
            {pastBookings.length === 0 ? <p>No past rentals.</p> : (
                <div className="grid">
                    {pastBookings.map(b => (
                        <div key={b.id} className="card rentals-past-card" style={{ opacity: 0.8 }}>
                            <h3>{b.transport?.car?.model || "Mobility Vehicle"}</h3>
                            <p>Status: <strong>{b.status}</strong></p>
                            <p>Date: {new Date(b.bookingDate).toLocaleDateString()}</p>
                            <p>Period: {new Date(b.startTime).toLocaleTimeString()} - {new Date(b.endTime).toLocaleTimeString()}</p>
                            {b.status === 'COMPLETED' && <p>Cost: ${b.totalCost}</p>}
                            {b.co2Kg != null && <p style={{ color: '#6c757d', fontSize: 13 }}>CO2: {b.co2Kg.toFixed(2)} kg</p>}
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
