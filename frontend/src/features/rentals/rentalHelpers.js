export const getPaymentStorageKey = (userId) => `summs_card_profile_${userId}`;

export const parseStoredPaymentData = (raw) => {
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

export const isRentalPaymentDataValid = (paymentData, now = new Date()) => {
    if (!paymentData) return false;
    const cardNumberValid = /^\d{16}$/.test(String(paymentData.cardNumber || ''));
    const firstNameValid = String(paymentData.cardFirstName || '').trim().length > 0;
    const lastNameValid = String(paymentData.cardLastName || '').trim().length > 0;
    const cvcValid = /^\d{3}$/.test(String(paymentData.cardVerificationCode || ''));
    const expiryRaw = String(paymentData.expirationDate || '');
    const expiryValid = /^\d{4}-\d{2}$/.test(expiryRaw);
    if (!expiryValid) return false;

    const [year, month] = expiryRaw.split('-').map(Number);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const notExpired = year > currentYear || (year === currentYear && month >= currentMonth);

    return cardNumberValid && firstNameValid && lastNameValid && cvcValid && notExpired;
};

export const splitRentalsByStatus = (bookings) => {
    const currentBookings = bookings.filter(
        (booking) => booking.status === 'RESERVED'
            || booking.status === 'ACTIVE'
            || (booking.status === 'COMPLETED' && !booking.payment)
    );

    const pastBookings = bookings.filter(
        (booking) => (booking.status === 'COMPLETED' && booking.payment)
            || booking.status === 'CANCELLED'
    );

    return {
        currentBookings,
        pastBookings
    };
};
