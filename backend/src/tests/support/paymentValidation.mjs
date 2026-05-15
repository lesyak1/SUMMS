export const validateCardPaymentDetails = (details, now = new Date()) => {
    const cardNumberValid = /^\d{16}$/.test(String(details.cardNumber || ''));
    const firstNameValid = String(details.cardFirstName || '').trim().length > 0;
    const lastNameValid = String(details.cardLastName || '').trim().length > 0;
    const cvcValid = /^\d{3}$/.test(String(details.cardVerificationCode || ''));
    const expiryRaw = String(details.expirationDate || '');
    const expiryFormatValid = /^\d{4}-\d{2}$/.test(expiryRaw);

    if (!expiryFormatValid) {
        return {
            valid: false,
            error: 'Invalid expiration date format. Use YYYY-MM'
        };
    }

    const [yearRaw, monthRaw] = expiryRaw.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
        return {
            valid: false,
            error: 'Invalid expiration date format. Use YYYY-MM'
        };
    }

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const notExpired = year > currentYear || (year === currentYear && month >= currentMonth);

    if (!cardNumberValid || !firstNameValid || !lastNameValid || !cvcValid || !notExpired) {
        return {
            valid: false,
            error: 'Invalid credit card details. Payment cannot be processed.'
        };
    }

    return { valid: true };
};
