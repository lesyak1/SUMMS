import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../features/auth/context/useAuth';
import api from '../lib/api';
import { getErrorMessage } from '../lib/apiError';
import {
    getPaymentStorageKey,
    isRentalPaymentDataValid,
    parseStoredPaymentData,
    type RentalPaymentData
} from '../features/rentals/rentalHelpers';

type PaymentData = RentalPaymentData;

const emptyPaymentData: PaymentData = {
    cardNumber: '',
    cardFirstName: '',
    cardLastName: '',
    cardVerificationCode: '',
    expirationDate: ''
};

const PaymentPage = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const bookingId = searchParams.get('bookingId');

    const [paymentData, setPaymentData] = useState<PaymentData>(() => {
        if (!profile) return emptyPaymentData;
        const raw = localStorage.getItem(getPaymentStorageKey(profile.id));
        return parseStoredPaymentData(raw) ?? emptyPaymentData;
    });

    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const cardNumberValid = /^\d{16}$/.test(paymentData.cardNumber);
    const firstNameValid = paymentData.cardFirstName.trim().length > 0;
    const lastNameValid = paymentData.cardLastName.trim().length > 0;
    const cvcValid = /^\d{3}$/.test(paymentData.cardVerificationCode);
    const expiryValid = /^\d{4}-\d{2}$/.test(paymentData.expirationDate);
    const hasAnyInput =
        paymentData.cardNumber !== '' ||
        paymentData.cardFirstName !== '' ||
        paymentData.cardLastName !== '' ||
        paymentData.cardVerificationCode !== '' ||
        paymentData.expirationDate !== '';

    const validationErrors = {
        cardNumber: hasAnyInput && !cardNumberValid ? 'Card number must be exactly 16 digits.' : '',
        cardFirstName: hasAnyInput && !firstNameValid ? 'First name is required.' : '',
        cardLastName: hasAnyInput && !lastNameValid ? 'Last name is required.' : '',
        cardVerificationCode: hasAnyInput && !cvcValid ? 'Verification code must be exactly 3 digits.' : '',
        expirationDate: (() => {
            if (!paymentData.expirationDate) return hasAnyInput ? 'Expiration date is required.' : '';
            if (!expiryValid) return 'Expiration date must be valid.';
            const [year, month] = paymentData.expirationDate.split('-').map(Number);
            const now = new Date();
            const notExpired = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
            return notExpired ? '' : 'Card is expired.';
        })()
    };

    const formValid = isRentalPaymentDataValid(paymentData);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile || !formValid) return;

        setSubmitting(true);
        setError('');

        try {
            // Save card details
            localStorage.setItem(getPaymentStorageKey(profile.id), JSON.stringify(paymentData));

            // If a bookingId was passed, process payment immediately
            if (bookingId) {
                const res = await api.post(`/bookings/${bookingId}/pay`, {
                    paymentMethod: 'CARD',
                    cardNumber: paymentData.cardNumber,
                    cardFirstName: paymentData.cardFirstName,
                    cardLastName: paymentData.cardLastName,
                    cardVerificationCode: paymentData.cardVerificationCode,
                    expirationDate: paymentData.expirationDate
                });
                const txId = (res.data as { transactionId?: string }).transactionId;
                navigate('/rentals/current', { state: { paymentConfirmation: `Payment confirmed. Transaction ID: ${txId}` } });
            } else {
                navigate(-1);
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Unable to process payment.'));
        } finally {
            setSubmitting(false);
        }
    };

    if (!profile) return <div>Loading...</div>;

    return (
        <div className="page-container">
            <h1 className="text-5xl font-bold mb-12">Payment</h1>

            {bookingId && (
                <p style={{ marginBottom: 24, color: '#4d6760' }}>
                    Enter your card details below to complete your payment.
                </p>
            )}

            {error && <div className="card-error-banner" style={{ marginBottom: 20 }}>{error}</div>}

            <form onSubmit={handleSubmit} className="form-card" style={{ maxWidth: 480 }}>
                <h3>Credit Card Details</h3>

                <div className="input-group">
                    <label>Card Number (16 digits)</label>
                    <input
                        className={hasAnyInput && !cardNumberValid ? 'input-invalid' : ''}
                        value={paymentData.cardNumber}
                        maxLength={16}
                        onChange={e => setPaymentData({ ...paymentData, cardNumber: e.target.value.replace(/\D/g, '') })}
                        required
                    />
                    {validationErrors.cardNumber && <p className="error">{validationErrors.cardNumber}</p>}
                </div>

                <div className="input-group">
                    <label>First Name</label>
                    <input
                        className={hasAnyInput && !firstNameValid ? 'input-invalid' : ''}
                        value={paymentData.cardFirstName}
                        onChange={e => setPaymentData({ ...paymentData, cardFirstName: e.target.value })}
                        required
                    />
                    {validationErrors.cardFirstName && <p className="error">{validationErrors.cardFirstName}</p>}
                </div>

                <div className="input-group">
                    <label>Last Name</label>
                    <input
                        className={hasAnyInput && !lastNameValid ? 'input-invalid' : ''}
                        value={paymentData.cardLastName}
                        onChange={e => setPaymentData({ ...paymentData, cardLastName: e.target.value })}
                        required
                    />
                    {validationErrors.cardLastName && <p className="error">{validationErrors.cardLastName}</p>}
                </div>

                <div className="input-group">
                    <label>Verification Code (3 digits)</label>
                    <input
                        className={hasAnyInput && !cvcValid ? 'input-invalid' : ''}
                        value={paymentData.cardVerificationCode}
                        maxLength={3}
                        onChange={e => setPaymentData({ ...paymentData, cardVerificationCode: e.target.value.replace(/\D/g, '') })}
                        required
                    />
                    {validationErrors.cardVerificationCode && <p className="error">{validationErrors.cardVerificationCode}</p>}
                </div>

                <div className="input-group">
                    <label>Expiration Date</label>
                    <input
                        className={hasAnyInput && (Boolean(validationErrors.expirationDate) || !paymentData.expirationDate) ? 'input-invalid' : ''}
                        type="month"
                        value={paymentData.expirationDate}
                        onChange={e => setPaymentData({ ...paymentData, expirationDate: e.target.value })}
                        required
                    />
                    {validationErrors.expirationDate && <p className="error">{validationErrors.expirationDate}</p>}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <button type="submit" disabled={!formValid || submitting} className="rentals-pay-btn">
                        {submitting ? 'Processing...' : bookingId ? 'Save & Pay' : 'Save Card'}
                    </button>
                    <button type="button" style={{ backgroundColor: '#8fa69f' }} onClick={() => navigate(-1)}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PaymentPage;
