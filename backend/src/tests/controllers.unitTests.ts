import { restoreAllStubs } from './support/testHelpers.js';
import adminTests from './adminController.unitTests.js';
import authMiddlewareTests from './authMiddleware.unitTests.js';
import availabilityTests from './availability.unitTests.js';
import bookingTests from './bookingController.unitTests.js';
import parkingTests from './parkingController.unitTests.js';
import providerTests from './providerController.unitTests.js';
import transportTests from './transportController.unitTests.js';
import userTests from './userController.unitTests.js';
import vehicleTests from './vehicleController.unitTests.js';
import vehicleTypeTests from './vehicleType.unitTests.js';

export type ControllerTest = {
    name: string;
    run: () => Promise<void> | void;
};

const allTestGroups = [
    { title: 'Admin Controller', tests: adminTests },
    { title: 'Auth Middleware', tests: authMiddlewareTests },
    { title: 'Availability Utilities', tests: availabilityTests },
    { title: 'Booking Controller', tests: bookingTests },
    { title: 'Parking Controller', tests: parkingTests },
    { title: 'Provider Controller', tests: providerTests },
    { title: 'Transport Controller', tests: transportTests },
    { title: 'User Controller', tests: userTests },
    { title: 'Vehicle Controller', tests: vehicleTests },
    { title: 'Vehicle Type Utilities', tests: vehicleTypeTests }
];

const runControllerTests = async () => {
    let passed = 0;
    let total = 0;

    for (const group of allTestGroups) {
        console.log(`\n--- ${group.title} ---`);
        for (const test of group.tests) {
            total += 1;
            try {
                restoreAllStubs(); // Ensures hermetic mocking between tests
                await test.run();
                passed += 1;
                console.log(`PASS ${test.name}`);
            } catch (error: any) {
                console.error(`FAIL ${test.name}`);
                console.error(error);
                process.exitCode = 1;
            } finally {
                restoreAllStubs();
            }
        }
    }

    console.log(`\n${passed}/${total} backend controller tests passed.`);
};

runControllerTests().catch((error) => {
    console.error('Test runner catastrophic failure', error);
    process.exitCode = 1;
});
