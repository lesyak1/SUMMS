import assert from 'node:assert/strict';
import { getAvailableSlots } from '../utils/availability.js';
import type { ControllerTest } from './controllers.unitTests.js';

const availabilityTests: ControllerTest[] = [
    {
        name: 'getAvailableSlots - returns sorted gaps between bookings',
        run() {
            const availableFrom = new Date('2026-06-01T09:00:00.000Z');
            const availableTo = new Date('2026-06-01T18:00:00.000Z');

            const slots = getAvailableSlots(availableFrom, availableTo, [
                {
                    startTime: new Date('2026-06-01T13:00:00.000Z'),
                    endTime: new Date('2026-06-01T14:00:00.000Z')
                },
                {
                    startTime: new Date('2026-06-01T10:00:00.000Z'),
                    endTime: new Date('2026-06-01T12:00:00.000Z')
                }
            ]);

            assert.equal(slots.length, 3);
            assert.equal(slots[0].start.toISOString(), '2026-06-01T09:00:00.000Z');
            assert.equal(slots[0].end.toISOString(), '2026-06-01T10:00:00.000Z');
            assert.equal(slots[1].start.toISOString(), '2026-06-01T12:00:00.000Z');
            assert.equal(slots[1].end.toISOString(), '2026-06-01T13:00:00.000Z');
            assert.equal(slots[2].start.toISOString(), '2026-06-01T14:00:00.000Z');
            assert.equal(slots[2].end.toISOString(), '2026-06-01T18:00:00.000Z');
        }
    }
];

export default availabilityTests;
