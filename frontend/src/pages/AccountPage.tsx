import { useState } from 'react';
import { useAuth } from '../features/auth/context/useAuth';
import type { UserProfile } from '../features/auth/context/authContext';
import api from '../lib/api';
import { getErrorMessage } from '../lib/apiError';

type FormData = {
    city: string;
    firstName: string;
    lastName: string;
    preferredMobility: string;
    username: string;
};

type PaymentData = {
    cardFirstName: string;
    cardLastName: string;
    cardNumber: string;
    cardVerificationCode: string;
    expirationDate: string;
};

const emptyPaymentData: PaymentData = {
    cardNumber: '',
    cardFirstName: '',
    cardLastName: '',
    cardVerificationCode: '',
    expirationDate: ''
};

const createFormData = (profile: UserProfile): FormData => ({
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    username: profile.username || '',
    city: profile.city || '',
    preferredMobility: profile.preferredMobility || 'CAR'
});

const getPaymentStorageKey = (userId: string) => `summs_card_profile_${userId}`;
const getProviderCompanyStorageKey = (userId: string) => `summs_provider_company_${userId}`;

const parsePaymentData = (rawPaymentData: string | null): PaymentData => {
    if (!rawPaymentData) return emptyPaymentData;

    try {
        const parsed = JSON.parse(rawPaymentData) as Partial<PaymentData>;
        return {
            cardNumber: parsed.cardNumber || '',
            cardFirstName: parsed.cardFirstName || '',
            cardLastName: parsed.cardLastName || '',
            cardVerificationCode: parsed.cardVerificationCode || '',
            expirationDate: parsed.expirationDate || ''
        };
    } catch {
        return emptyPaymentData;
    }
};

const AccountPageContent = ({ profile }: { profile: UserProfile }) => {
    const [formData, setFormData] = useState<FormData>(() => createFormData(profile));
    const [paymentData, setPaymentData] = useState<PaymentData>(() => parsePaymentData(localStorage.getItem(getPaymentStorageKey(profile.id))));
    const [providerCompanyName, setProviderCompanyName] = useState(() => localStorage.getItem(getProviderCompanyStorageKey(profile.id)) || '');
    const [msg, setMsg] = useState('');

    const isPaymentDataValid = () => {
        const cardNumberValid = /^\d{16}$/.test(paymentData.cardNumber);
        const firstNameValid = paymentData.cardFirstName.trim().length > 0;
        const lastNameValid = paymentData.cardLastName.trim().length > 0;
        const cvcValid = /^\d{3}$/.test(paymentData.cardVerificationCode);
        const expiryValid = /^\d{4}-\d{2}$/.test(paymentData.expirationDate);

        if (!expiryValid) return false;
        const [year, month] = paymentData.expirationDate.split('-').map(Number);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const notExpired = year > currentYear || (year === currentYear && month >= currentMonth);

        return cardNumberValid && firstNameValid && lastNameValid && cvcValid && notExpired;
    };

    const isPaymentDataEmpty = () => (
        paymentData.cardNumber.trim() === ''
        && paymentData.cardFirstName.trim() === ''
        && paymentData.cardLastName.trim() === ''
        && paymentData.cardVerificationCode.trim() === ''
        && paymentData.expirationDate.trim() === ''
    );

    const paymentValidationErrors = {
        cardNumber: paymentData.cardNumber.length > 0 && !/^\d{16}$/.test(paymentData.cardNumber)
            ? 'Card number must be exactly 16 digits.'
            : '',
        cardFirstName: paymentData.cardFirstName.length > 0 && paymentData.cardFirstName.trim().length === 0
            ? 'First name is required.'
            : '',
        cardLastName: paymentData.cardLastName.length > 0 && paymentData.cardLastName.trim().length === 0
            ? 'Last name is required.'
            : '',
        cardVerificationCode: paymentData.cardVerificationCode.length > 0 && !/^\d{3}$/.test(paymentData.cardVerificationCode)
            ? 'Verification code must be exactly 3 digits.'
            : '',
        expirationDate: (() => {
            if (!paymentData.expirationDate) return '';
            if (!/^\d{4}-\d{2}$/.test(paymentData.expirationDate)) return 'Expiration date must be valid.';
            const [year, month] = paymentData.expirationDate.split('-').map(Number);
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;
            const notExpired = year > currentYear || (year === currentYear && month >= currentMonth);
            return notExpired ? '' : 'Card is expired.';
        })()
    };

    const hasPaymentValidationErrors = Object.values(paymentValidationErrors).some(Boolean);
    const hasMissingCardFields =
        !paymentData.cardNumber
        || !paymentData.cardFirstName.trim()
        || !paymentData.cardLastName.trim()
        || !paymentData.cardVerificationCode
        || !paymentData.expirationDate;
    const paymentDataEmpty = isPaymentDataEmpty();
    const hasAnyCardInput =
        paymentData.cardNumber.trim() !== ''
        || paymentData.cardFirstName.trim() !== ''
        || paymentData.cardLastName.trim() !== ''
        || paymentData.cardVerificationCode.trim() !== ''
        || paymentData.expirationDate.trim() !== '';

    const handleSaveProfile = async () => {
        try {
            await api.put('/me', formData);
            if (profile.role === 'MOBILITY_PROVIDER') {
                localStorage.setItem(getProviderCompanyStorageKey(profile.id), providerCompanyName.trim());
            } else {
                localStorage.removeItem(getProviderCompanyStorageKey(profile.id));
            }
            setMsg('Profile saved successfully.');
        } catch (err: unknown) {
            setMsg(`Failed to update account: ${getErrorMessage(err, 'Unable to update your profile.')}`);
        }
    };

    const handleSavePayment = () => {
        if (!paymentDataEmpty && !isPaymentDataValid()) {
            setMsg('Invalid credit card details. Use 16-digit card number, 3-digit verification code, valid names, and a non-expired date.');
            return;
        }

        if (paymentDataEmpty) {
            localStorage.removeItem(getPaymentStorageKey(profile.id));
            setMsg('Payment details removed.');
            return;
        }

        localStorage.setItem(getPaymentStorageKey(profile.id), JSON.stringify(paymentData));
        setMsg('Payment details updated successfully!');
    };

    const handleRemoveCreditCard = () => {
        localStorage.removeItem(getPaymentStorageKey(profile.id));
        setPaymentData(emptyPaymentData);
        setMsg('Credit card details removed.');
    };

    const handleRemoveProviderCompanyName = () => {
        localStorage.removeItem(getProviderCompanyStorageKey(profile.id));
        setProviderCompanyName('');
        setMsg('Mobility provider company name removed.');
    };

    const isErrorMsg = msg.startsWith('Failed') || msg.startsWith('Invalid');

    return (
        <div className="page-container account-page">
            <h1 className="text-4xl font-bold mb-8">Account Settings</h1>

            {msg && (
                <div className={isErrorMsg ? 'account-banner account-banner-error' : 'account-banner'}>
                    {isErrorMsg ? 'Heads up: ' : 'All set: '}
                    {msg}
                </div>
            )}

            <div className="account-form-layout">
                <div className="form-card account-form-card">
                    <h3>Account Details</h3>
                    <div>
                        <label>First Name</label><br />
                        <input value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                    </div>
                    <div>
                        <label>Last Name</label><br />
                        <input value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                    </div>
                    <div>
                        <label>Username</label><br />
                        <input value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                    </div>
                    <div>
                        <label>City</label><br />
                        <input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                    </div>
                    <div>
                        <label>Preferred Mobility</label><br />
                        <select value={formData.preferredMobility} onChange={e => setFormData({ ...formData, preferredMobility: e.target.value })}>
                            <option value="CAR">Car</option>
                            <option value="BIKE">Bike</option>
                            <option value="SCOOTER">Scooter</option>
                        </select>
                    </div>

                    {profile.role === 'MOBILITY_PROVIDER' && (
                        <div>
                            <label>Mobility Provider Company Name</label><br />
                            <input
                                value={providerCompanyName}
                                onChange={e => setProviderCompanyName(e.target.value)}
                                placeholder="Enter registered company name"
                            />
                            <button
                                type="button"
                                className="del-btn"
                                style={{ marginTop: 10 }}
                                onClick={handleRemoveProviderCompanyName}
                            >
                                Remove Mobility Provider Company Name
                            </button>
                        </div>
                    )}

                    <button type="button" style={{ marginTop: 10 }} onClick={handleSaveProfile}>
                        Save Profile
                    </button>
                </div>

                <div className="form-card account-form-card">
                    <h3>Credit Card Details</h3>
                    {!paymentDataEmpty && (hasMissingCardFields || hasPaymentValidationErrors) && (
                        <div className="card-error-banner">
                            Complete valid credit card details before saving your account.
                        </div>
                    )}
                    <div>
                        <label>Card Number (16 digits)</label><br />
                        <input
                            className={hasAnyCardInput && !/^\d{16}$/.test(paymentData.cardNumber) ? 'input-invalid' : ''}
                            value={paymentData.cardNumber}
                            maxLength={16}
                            onChange={e => setPaymentData({ ...paymentData, cardNumber: e.target.value.replace(/\D/g, '') })}
                        />
                        {paymentValidationErrors.cardNumber && <p className="error">{paymentValidationErrors.cardNumber}</p>}
                    </div>
                    <div>
                        <label>First Name</label><br />
                        <input
                            className={hasAnyCardInput && paymentData.cardFirstName.trim().length === 0 ? 'input-invalid' : ''}
                            value={paymentData.cardFirstName}
                            onChange={e => setPaymentData({ ...paymentData, cardFirstName: e.target.value })}
                        />
                        {paymentValidationErrors.cardFirstName && <p className="error">{paymentValidationErrors.cardFirstName}</p>}
                    </div>
                    <div>
                        <label>Last Name</label><br />
                        <input
                            className={hasAnyCardInput && paymentData.cardLastName.trim().length === 0 ? 'input-invalid' : ''}
                            value={paymentData.cardLastName}
                            onChange={e => setPaymentData({ ...paymentData, cardLastName: e.target.value })}
                        />
                        {paymentValidationErrors.cardLastName && <p className="error">{paymentValidationErrors.cardLastName}</p>}
                    </div>
                    <div>
                        <label>Verification Code (3 digits)</label><br />
                        <input
                            className={hasAnyCardInput && !/^\d{3}$/.test(paymentData.cardVerificationCode) ? 'input-invalid' : ''}
                            value={paymentData.cardVerificationCode}
                            maxLength={3}
                            onChange={e => setPaymentData({ ...paymentData, cardVerificationCode: e.target.value.replace(/\D/g, '') })}
                        />
                        {paymentValidationErrors.cardVerificationCode && <p className="error">{paymentValidationErrors.cardVerificationCode}</p>}
                    </div>
                    <div>
                        <label>Expiration Date</label><br />
                        <input
                            className={hasAnyCardInput && (Boolean(paymentValidationErrors.expirationDate) || !paymentData.expirationDate) ? 'input-invalid' : ''}
                            type="month"
                            value={paymentData.expirationDate}
                            onChange={e => setPaymentData({ ...paymentData, expirationDate: e.target.value })}
                        />
                        {paymentValidationErrors.expirationDate && <p className="error">{paymentValidationErrors.expirationDate}</p>}
                    </div>
                    <button
                        type="button"
                        style={{ marginTop: 10 }}
                        onClick={handleSavePayment}
                        disabled={!paymentDataEmpty && (hasPaymentValidationErrors || !isPaymentDataValid())}
                    >
                        Save Payment Details
                    </button>
                    <button
                        type="button"
                        className="del-btn"
                        style={{ marginTop: 10 }}
                        onClick={handleRemoveCreditCard}
                    >
                        Remove Credit Card
                    </button>
                </div>
            </div>
        </div>
    );
};

const AccountPage = () => {
    const { profile } = useAuth();

    if (!profile) return <div>Loading account...</div>;

    return <AccountPageContent key={profile.id} profile={profile} />;
};

export default AccountPage;
