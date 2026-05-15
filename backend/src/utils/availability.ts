export function getAvailableSlots(
    availableFrom: Date,
    availableTo: Date,
    bookings: { startTime: Date; endTime: Date }[]
) {
    const sorted = bookings.sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    const slots: { start: Date; end: Date }[] = [];
    let current = new Date(availableFrom);

    for (const b of sorted) {
        if (b.startTime > current) {
            slots.push({ start: new Date(current), end: new Date(b.startTime) });
        }
        current = new Date(Math.max(current.getTime(), b.endTime.getTime()));
    }

    if (current < availableTo) {
        slots.push({ start: current, end: new Date(availableTo) });
    }

    return slots;
}