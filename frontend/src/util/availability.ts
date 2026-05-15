export type AvailabilityResult = {
    isAvailable: boolean;
    status: 'AVAILABLE' | 'UPCOMING' | 'ENDED';
    text: string;
    from: Date;
    to: Date;
};

export const getAvailability = (
    fromInput: string | Date,
    toInput: string | Date
): AvailabilityResult => {
    const now = new Date();
    const from = new Date(fromInput);
    const to = new Date(toInput);

    const format = (date: Date) =>
        date.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

    if (from <= now && to >= now) {
        return {
            isAvailable: true,
            status: 'AVAILABLE',
            text: 'Available',
            from,
            to
        };
    }

    if (now < from) {
        return {
            isAvailable: false,
            status: 'UPCOMING',
            text: `Available from ${format(from)} to ${format(to)}`,
            from,
            to
        };
    }

    return {
        isAvailable: false,
        status: 'ENDED',
        text: `Ended ${format(to)}`,
        from,
        to
    };
};

