type ApiErrorData = {
    details?: string;
    error?: string;
};

type ApiErrorLike = {
    message?: string;
    response?: {
        data?: ApiErrorData;
    };
};

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong.') => {
    if (typeof error !== 'object' || error === null) {
        return fallback;
    }

    const apiError = error as ApiErrorLike;

    return apiError.response?.data?.error
        || apiError.response?.data?.details
        || apiError.message
        || fallback;
};
