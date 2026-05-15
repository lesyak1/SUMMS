import assert from 'node:assert/strict';
import { normalizeVehicleType, resolveVehicleType } from '../services/transport/vehicleType.js';
import type { ControllerTest } from './controllers.unitTests.js';

const vehicleTypeTests: ControllerTest[] = [
    {
        name: 'vehicle type utilities normalize and resolve supported values',
        run() {
            assert.equal(normalizeVehicleType('  car  '), 'CAR');
            assert.equal(normalizeVehicleType('BIKE'), 'BIKE');
            assert.equal(normalizeVehicleType('spaceship'), 'UNKNOWN');

            assert.equal(resolveVehicleType({ car: { id: 'c1' } }), 'CAR');
            assert.equal(resolveVehicleType({ bike: { id: 'b1' } }), 'BIKE');
            assert.equal(resolveVehicleType({ scooter: { id: 's1' } }), 'SCOOTER');
            assert.equal(resolveVehicleType({}), 'UNKNOWN');
        }
    }
];

export default vehicleTypeTests;
