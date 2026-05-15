import assert from 'node:assert/strict';
import { getMyBookings, reserveVehicle, startRental, endRental, payRental, getCo2Summary } from '../controllers/bookingController.js';
import { stub, mockRequest, mockResponse } from './support/testHelpers.js';
import prisma from '../prisma.js';
import { bookingCreator } from '../services/creators/bookingCreator.js';
import { accessLogCreator } from '../services/creators/accessLogCreator.js';
import { vehicleAvailabilityService } from '../services/vehicleAvailability/vehicleAvailabilityService.js';
import { tripPricingService } from '../services/pricing/tripPricingService.js';
import { paymentCreator } from '../services/creators/paymentCreator.js';
import * as fs from 'fs';
import { fsWrapper } from '../controllers/bookingController.js';
import type { ControllerTest } from './controllers.unitTests.js';

const mockTransport = {
    id: 'tid',
    costPerMinute: 0.5,
    availableFrom: new Date('2026-01-01'),
    availableTo: new Date('2026-12-31'),
    bookings: []
};

const bookingTests: ControllerTest[] = [
    {
        name: 'getMyBookings - fetches user bookings with fallback vehicle names',
        async run() {
            stub(prisma.booking, 'findMany', async () => [
                { id: 'b1', transport: { car: { model: 'Civic' } } },
                { id: 'b2', transport: { bike: true } },
                { id: 'b3', transport: { scooter: true } },
                { id: 'b4', transport: {} } // Hits 'Mobility Vehicle'
            ]);

            const req = mockRequest({ user: { id: 'u1' } });
            const res = mockResponse();

            await getMyBookings(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData[0].vehicleName, 'Civic');
            assert.equal(res.jsonData[1].vehicleName, 'Bike');
            assert.equal(res.jsonData[2].vehicleName, 'Scooter');
            assert.equal(res.jsonData[3].vehicleName, 'Mobility Vehicle');
        }
    },
    {
        name: 'getMyBookings - 500 error',
        async run() {
            stub(prisma.booking, 'findMany', async () => { throw new Error('fail'); });
            const req = mockRequest({ user: { id: 'u1' } });
            const res = mockResponse();
            await getMyBookings(req, res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'reserveVehicle - missing transport or not available fails',
        async run() {
            stub(prisma.transport, 'findUnique', async () => null);

            const req = mockRequest({ body: { transportId: 'x' }, user: { id: 'u1' } });
            const res = mockResponse();

            await reserveVehicle(req, res);

            assert.equal(res.statusCode, 400);
            assert.match(res.jsonData.error, /Vehicle is not available/);
        }
    },
    {
        name: 'reserveVehicle - overlaps reject booking',
        async run() {
            stub(prisma.transport, 'findUnique', async () => mockTransport);
            stub(prisma.booking, 'findFirst', async () => ({ id: 'existing' }));

            const req = mockRequest({ body: { transportId: 'tid', startTime: '2026-06-01', endTime: '2026-06-02' }, user: { id: 'u1' } });
            const res = mockResponse();

            await reserveVehicle(req, res);

            assert.equal(res.statusCode, 400);
            assert.match(res.jsonData.error, /already booked/);
        }
    },
    {
        name: 'reserveVehicle - succeeds when valid',
        async run() {
            stub(prisma.transport, 'findUnique', async () => mockTransport);
            stub(prisma.booking, 'findFirst', async () => null);
            stub(bookingCreator, 'create', async () => ({ booking: { id: 'bnew' } }));
            stub(accessLogCreator, 'create', async () => ({}));

            const req = mockRequest({ body: { transportId: 'tid', startTime: '2026-06-01', endTime: '2026-06-02' }, user: { id: 'u1' } });
            const res = mockResponse();

            await reserveVehicle(req, res);

            assert.equal(res.statusCode, 201);
            assert.equal(res.jsonData.id, 'bnew');
        }
    },
    {
        name: 'reserveVehicle - fs writeFileSync handles crash',
        async run() {
            stub(prisma.transport, 'findUnique', async () => { throw new Error('DB DOWN'); });
            const req = mockRequest({ body: {}, user: { id: 'u1' } });
            const res = mockResponse();

            await reserveVehicle(req, res);
            assert.equal(res.statusCode, 500);
            assert.match(res.jsonData.error, /Failed to reserve/);
        }
    },
    {
        name: 'startRental - succeeds when user owns RESERVED booking',
        async run() {
            stub(prisma.booking, 'findUnique', async () => ({ id: 'b1', clientId: 'u1', status: 'RESERVED', transportId: 't1' }));
            stub(prisma.booking, 'update', async () => ({ status: 'ACTIVE' }));
            stub(vehicleAvailabilityService, 'updateAvailability', async () => { });

            const req = mockRequest({ params: { id: 'b1' }, user: { id: 'u1' } });
            const res = mockResponse();

            await startRental(req, res);
            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.status, 'ACTIVE');
        }
    },
    {
        name: 'startRental - 403 when wrong user',
        async run() {
            stub(prisma.booking, 'findUnique', async () => ({ id: 'b1', clientId: 'u2' }));
            const req = mockRequest({ params: { id: 'b1' }, user: { id: 'u1', role: 'USER' } });
            const res = mockResponse();
            await startRental(req, res);
            assert.equal(res.statusCode, 403);
        }
    },
    {
        name: 'startRental - 400 when not RESERVED',
        async run() {
            stub(prisma.booking, 'findUnique', async () => ({ id: 'b1', clientId: 'u1', status: 'COMPLETED' }));
            const req = mockRequest({ params: { id: 'b1' }, user: { id: 'u1', role: 'USER' } });
            const res = mockResponse();
            await startRental(req, res);
            assert.equal(res.statusCode, 400);
        }
    },
    {
        name: 'startRental - 404 when not found',
        async run() {
            stub(prisma.booking, 'findUnique', async () => null);
            const req = mockRequest({ params: { id: 'b1' }, user: { id: 'u1', role: 'USER' } });
            const res = mockResponse();
            await startRental(req, res);
            assert.equal(res.statusCode, 404);
        }
    },
    {
        name: 'startRental - 500 on db crash',
        async run() {
            stub(prisma.booking, 'findUnique', async () => { throw new Error('fail'); });
            const req = mockRequest({ params: { id: 'b1' }, user: { id: 'u1', role: 'USER' } });
            const res = mockResponse();
            await startRental(req, res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'endRental - succeeds',
        async run() {
            const t0 = new Date(Date.now() - 600000); // 10 mins ago
            stub(prisma.booking, 'findUnique', async () => ({ id: 'b1', clientId: 'u1', status: 'ACTIVE', transportId: 't1', startTime: t0, client: {}, transport: { car: { emissionFactorGPerKm: 120 } } }));
            stub(tripPricingService, 'calculate', () => ({ total: 10, strategy: 'BASE', adjustments: [] }));
            stub(prisma.booking, 'update', async () => ({ status: 'COMPLETED' }));
            stub(prisma.userProfile, 'update', async () => ({}));
            stub(vehicleAvailabilityService, 'updateAvailability', async () => { });

            const req = mockRequest({ params: { id: 'b1' }, user: { id: 'u1' } });
            const res = mockResponse();

            await endRental(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.status, 'COMPLETED');
            assert.equal(res.jsonData.pricingStrategy, 'BASE');
        }
    },
    {
        name: 'endRental - scooter emission mapping works',
        async run() {
            const t0 = new Date(Date.now() - 600000); // 10 mins ago
            stub(prisma.booking, 'findUnique', async () => ({ id: 'b1', clientId: 'u1', status: 'ACTIVE', transportId: 't1', startTime: t0, client: {}, transport: { scooter: { emissionFactorGPerKm: 50 } } }));
            stub(tripPricingService, 'calculate', () => ({ total: 10, strategy: 'BASE', adjustments: [] }));
            stub(prisma.booking, 'update', async () => ({ status: 'COMPLETED' }));
            stub(prisma.userProfile, 'update', async () => ({}));
            stub(vehicleAvailabilityService, 'updateAvailability', async () => { });

            const req = mockRequest({ params: { id: 'b1' }, user: { id: 'u1' } });
            const res = mockResponse();
            await endRental(req, res);
            assert.equal(res.statusCode, 200);
        }
    },
    {
        name: 'endRental - 404, 403, 400 paths',
        async run() {
            stub(tripPricingService, 'calculate', () => ({}));
            stub(prisma.booking, 'findUnique', async () => null);
            let req = mockRequest({ params: { id: 'b1' }, user: { id: 'u1' } });
            let res = mockResponse();
            await endRental(req, res);
            assert.equal(res.statusCode, 404);

            stub(prisma.booking, 'findUnique', async () => ({ clientId: 'u2', status: 'ACTIVE', client: {}, transport: {} }));
            req = mockRequest({ params: { id: 'b1' }, user: { id: 'u1', role: 'USER' } });
            res = mockResponse();
            await endRental(req, res);
            assert.equal(res.statusCode, 403);

            stub(prisma.booking, 'findUnique', async () => ({ clientId: 'u1', status: 'RESERVED', client: {}, transport: {} }));
            req = mockRequest({ params: { id: 'b1' }, user: { id: 'u1' } });
            res = mockResponse();
            await endRental(req, res);
            assert.equal(res.statusCode, 400);

            stub(prisma.booking, 'findUnique', async () => { throw new Error('boom'); });
            res = mockResponse();
            await endRental(req, res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'payRental - rejects invalid card format',
        async run() {
            const req = mockRequest({ body: { paymentMethod: 'CARD', cardNumber: '123', expirationDate: '2099-12' }, user: { id: 'u1' } });
            const res = mockResponse();
            await payRental(req, res);
            assert.equal(res.statusCode, 400);
            assert.match(res.jsonData.error, /Invalid credit card details/);
        }
    },
    {
        name: 'payRental - rejects invalid expiry date format',
        async run() {
            const req = mockRequest({ body: { paymentMethod: 'CARD', cardNumber: '1111222233334444', cardFirstName: 'a', cardLastName: 'b', cardVerificationCode: '123', expirationDate: '01-20' }, user: { id: 'u1' } });
            const res = mockResponse();
            await payRental(req, res);
            assert.equal(res.statusCode, 400);
            assert.match(res.jsonData.error, /Invalid expiration date format/);
        }
    },
    {
        name: 'payRental - handles non card',
        async run() {
            const req = mockRequest({ body: { paymentMethod: 'CASH' }, user: { id: 'u1' } });
            const res = mockResponse();
            await payRental(req, res);
            assert.equal(res.statusCode, 400);
            assert.match(res.jsonData.error, /Only credit card payments/);
        }
    },
    {
        name: 'payRental - rejects invalid year/month parsing',
        async run() {
            const req = mockRequest({ body: { paymentMethod: 'CARD', cardNumber: '1111222233334444', cardFirstName: 'a', cardLastName: 'b', cardVerificationCode: '123', expirationDate: 'YYYY-MM' }, user: { id: 'u1' } });
            const res = mockResponse();
            await payRental(req, res);
            assert.equal(res.statusCode, 400);
            assert.match(res.jsonData.error, /Invalid expiration date format/);
        }
    },
    {
        name: 'payRental - succeeds on valid card, completed booking',
        async run() {
            process.env.PAYMENT_SERVICE_AVAILABLE = 'true';
            stub(prisma.booking, 'findUnique', async () => ({ id: 'b1', clientId: 'u1', status: 'COMPLETED', totalCost: 10, payment: null }));
            stub(paymentCreator, 'create', async () => ({ id: 'pay1' }));
            stub(prisma.transport, 'update', async () => ({}));

            const req = mockRequest({ body: { paymentMethod: 'CARD', cardNumber: '1111222233334444', cardFirstName: 'A', cardLastName: 'B', cardVerificationCode: '123', expirationDate: '2099-12' }, user: { id: 'u1' }, params: { id: 'b1' } });
            const res = mockResponse();

            await payRental(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.transactionId, 'pay1');
        }
    },
    {
        name: 'payRental - accepts card expiring in current month',
        async run() {
            process.env.PAYMENT_SERVICE_AVAILABLE = 'true';

            const now = new Date();
            const expirationDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            stub(prisma.booking, 'findUnique', async () => ({
                id: 'b1',
                clientId: 'u1',
                status: 'COMPLETED',
                totalCost: 10,
                payment: null,
                transportId: 't1'
            }));
            stub(paymentCreator, 'create', async () => ({ id: 'pay-current-month' }));
            stub(prisma.transport, 'update', async () => ({}));

            const req = mockRequest({
                body: {
                    paymentMethod: 'CARD',
                    cardNumber: '1111222233334444',
                    cardFirstName: 'A',
                    cardLastName: 'B',
                    cardVerificationCode: '123',
                    expirationDate
                },
                user: { id: 'u1' },
                params: { id: 'b1' }
            });
            const res = mockResponse();

            await payRental(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.transactionId, 'pay-current-month');
        }
    },
    {
        name: 'payRental - other code paths (404, 403, 400, 503, 500)',
        async run() {
            process.env.PAYMENT_SERVICE_AVAILABLE = 'false';
            let req = mockRequest({ body: { paymentMethod: 'CARD', cardNumber: '1111222233334444', cardFirstName: 'A', cardLastName: 'B', cardVerificationCode: '123', expirationDate: '2099-12' }, user: { id: 'u1' }, params: { id: 'b1' } });
            let res = mockResponse();
            await payRental(req, res);
            assert.equal(res.statusCode, 503);
            process.env.PAYMENT_SERVICE_AVAILABLE = 'true';

            stub(prisma.booking, 'findUnique', async () => null);
            res = mockResponse();
            await payRental(req, res);
            assert.equal(res.statusCode, 404);

            stub(prisma.booking, 'findUnique', async () => ({ clientId: 'u2' }));
            res = mockResponse();
            await payRental(req, res);
            assert.equal(res.statusCode, 403);

            stub(prisma.booking, 'findUnique', async () => ({ clientId: 'u1', status: 'ACTIVE' }));
            res = mockResponse();
            await payRental(req, res);
            assert.equal(res.statusCode, 400);

            stub(prisma.booking, 'findUnique', async () => ({ clientId: 'u1', status: 'COMPLETED', payment: { id: 'p1' } }));
            res = mockResponse();
            await payRental(req, res);
            assert.equal(res.statusCode, 400);

            stub(prisma.booking, 'findUnique', async () => ({ clientId: 'u1', status: 'COMPLETED', payment: null, totalCost: 0 }));
            res = mockResponse();
            await payRental(req, res);
            assert.equal(res.statusCode, 400);

            stub(prisma.booking, 'findUnique', async () => { throw new Error('crash'); });
            res = mockResponse();
            await payRental(req, res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'getCo2Summary - groups by mobility type',
        async run() {
            stub(prisma.booking, 'findMany', async () => [
                { co2Kg: 10, transport: { car: true } },
                { co2Kg: 2, transport: { scooter: true } },
                { co2Kg: 0, transport: { bike: true } }
            ]);

            const req = mockRequest({ user: { id: 'u1' } });
            const res = mockResponse();

            await getCo2Summary(req, res);
            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.car, 10);
            assert.equal(res.jsonData.scooter, 2);
            assert.equal(res.jsonData.bike, 0);
            assert.equal(res.jsonData.total, 12);
        }
    },
    {
        name: 'getCo2Summary - role conditionals and 500 error',
        async run() {
            let passedFilter: any = null;
            stub(prisma.booking, 'findMany', async (opts: any) => { passedFilter = opts.where; return []; });

            let req = mockRequest({ user: { id: 'prov1', role: 'MOBILITY_PROVIDER' } });
            let res = mockResponse();
            await getCo2Summary(req, res);
            assert.equal(res.statusCode, 200);
            assert.equal(passedFilter.transport.is.providerId, 'prov1');

            stub(prisma.booking, 'findMany', async () => { throw new Error('db') });
            res = mockResponse();
            await getCo2Summary(mockRequest(), res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'getCo2Summary - admin does not apply ownership filters',
        async run() {
            let passedFilter: any = null;

            stub(prisma.booking, 'findMany', async (opts: any) => {
                passedFilter = opts.where;
                return [];
            });

            const req = mockRequest({ user: { id: 'admin1', role: 'ADMIN' } });
            const res = mockResponse();

            await getCo2Summary(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(passedFilter.status, 'COMPLETED');
            assert.equal(passedFilter.co2Kg.not, null);
            assert.equal('clientId' in passedFilter, false);
            assert.equal('transport' in passedFilter, false);
        }
    },
    {
        name: 'reserveVehicle - invalid time range',
        async run() {
            stub(prisma.transport, 'findUnique', async () => mockTransport);

            const req = mockRequest({
                body: {
                    transportId: 'tid',
                    startTime: '2026-06-02',
                    endTime: '2026-06-01'
                },
                user: { id: 'u1' }
            });

            const res = mockResponse();

            await reserveVehicle(req, res);

            assert.equal(res.statusCode, 400);
            assert.match(res.jsonData.error, /Invalid time range/);
        }
    },
    {
        name: 'reserveVehicle - invalid slot selection',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({
                ...mockTransport,
                availableFrom: new Date('2026-01-01'),
                availableTo: new Date('2026-01-02'),
                bookings: []
            }));

            const req = mockRequest({
                body: {
                    transportId: 'tid',
                    startTime: '2026-02-01',
                    endTime: '2026-02-02'
                },
                user: { id: 'u1' }
            });

            const res = mockResponse();

            await reserveVehicle(req, res);

            assert.equal(res.statusCode, 400);
            assert.match(res.jsonData.error, /not within available slots/);
        }
    },
    {
        name: 'startRental - admin can start others booking',
        async run() {
            stub(prisma.booking, 'findUnique', async () => ({
                id: 'b1',
                clientId: 'other',
                status: 'RESERVED',
                transportId: 't1'
            }));

            stub(prisma.booking, 'update', async () => ({ status: 'ACTIVE' }));
            stub(vehicleAvailabilityService, 'updateAvailability', async () => { });

            const req = mockRequest({
                params: { id: 'b1' },
                user: { id: 'admin', role: 'ADMIN' }
            });

            const res = mockResponse();

            await startRental(req, res);

            assert.equal(res.statusCode, 200);
        }
    },
    {
        name: 'endRental - admin can end another user booking',
        async run() {
            const t0 = new Date(Date.now() - 600000);

            stub(prisma.booking, 'findUnique', async () => ({
                id: 'b1',
                clientId: 'other',
                status: 'ACTIVE',
                transportId: 't1',
                startTime: t0,
                client: {},
                transport: { car: { emissionFactorGPerKm: 120 } }
            }));
            stub(tripPricingService, 'calculate', () => ({ total: 10, strategy: 'BASE', adjustments: [] }));
            stub(prisma.booking, 'update', async () => ({ status: 'COMPLETED' }));
            stub(prisma.userProfile, 'update', async () => ({}));
            stub(vehicleAvailabilityService, 'updateAvailability', async () => { });

            const req = mockRequest({
                params: { id: 'b1' },
                user: { id: 'admin', role: 'ADMIN' }
            });
            const res = mockResponse();

            await endRental(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.status, 'COMPLETED');
        }
    },
    {
        name: 'endRental - bike emission defaults to 0',
        async run() {
            const t0 = new Date(Date.now() - 600000);

            stub(prisma.booking, 'findUnique', async () => ({
                id: 'b1',
                clientId: 'u1',
                status: 'ACTIVE',
                transportId: 't1',
                startTime: t0,
                client: {},
                transport: { bike: true }
            }));

            stub(tripPricingService, 'calculate', () => ({
                total: 10,
                strategy: 'BASE',
                adjustments: []
            }));

            stub(prisma.booking, 'update', async () => ({ status: 'COMPLETED' }));
            stub(prisma.userProfile, 'update', async () => ({}));
            stub(vehicleAvailabilityService, 'updateAvailability', async () => { });

            const req = mockRequest({ params: { id: 'b1' }, user: { id: 'u1' } });
            const res = mockResponse();

            await endRental(req, res);

            assert.equal(res.statusCode, 200);
        }
    },
    {
        name: 'payRental - expired card rejected',
        async run() {
            const pastYear = new Date().getFullYear() - 1;

            const req = mockRequest({
                body: {
                    paymentMethod: 'CARD',
                    cardNumber: '1111222233334444',
                    cardFirstName: 'A',
                    cardLastName: 'B',
                    cardVerificationCode: '123',
                    expirationDate: `${pastYear}-01`
                },
                user: { id: 'u1' }
            });

            const res = mockResponse();

            await payRental(req, res);

            assert.equal(res.statusCode, 400);
        }
    },
    {
        name: 'getCo2Summary - normal user filter applied',
        async run() {
            let passedFilter: any;

            stub(prisma.booking, 'findMany', async (opts: any) => {
                passedFilter = opts.where;
                return [];
            });

            const req = mockRequest({ user: { id: 'u1', role: 'USER' } });
            const res = mockResponse();

            await getCo2Summary(req, res);

            assert.equal(passedFilter.clientId, 'u1');
        }
    },
    {
        name: 'reserveVehicle - inner fs catch executes',
        async run() {
            stub(prisma.transport, 'findUnique', async () => {
                throw new Error('DB FAIL');
            });

            stub(fsWrapper, 'existsSync', () => {
                throw new Error('FS FAIL');
            });

            const req = mockRequest({ body: {}, user: { id: 'u1' } });
            const res = mockResponse();

            await reserveVehicle(req, res);

            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'endRental - enforces minimum 1 minute duration',
        async run() {
            const now = new Date();

            const t0 = new Date(now.getTime() - 1000); // 1 second ago

            stub(prisma.booking, 'findUnique', async () => ({
                id: 'b1',
                clientId: 'u1',
                status: 'ACTIVE',
                transportId: 't1',
                startTime: t0,
                client: {},
                transport: { car: { emissionFactorGPerKm: 100 } }
            }));

            let capturedDuration: number = 0;

            stub(tripPricingService, 'calculate', (opts: any) => {
                capturedDuration = opts.durationMinutes;
                return { total: 5, strategy: 'BASE', adjustments: [] };
            });

            stub(prisma.booking, 'update', async () => ({ status: 'COMPLETED' }));
            stub(prisma.userProfile, 'update', async () => ({}));
            stub(vehicleAvailabilityService, 'updateAvailability', async () => { });

            const req = mockRequest({ params: { id: 'b1' }, user: { id: 'u1' } });
            const res = mockResponse();

            await endRental(req, res);

            assert.equal(res.statusCode, 200);

            assert.equal(capturedDuration, 1);
        }
    },
    {
        name: 'payRental - admin can pay another user booking',
        async run() {
            process.env.PAYMENT_SERVICE_AVAILABLE = 'true';

            let findUniqueCalls = 0;
            stub(prisma.booking, 'findUnique', async () => {
                findUniqueCalls += 1;
                return findUniqueCalls === 1
                    ? { id: 'b1', clientId: 'u2', status: 'COMPLETED', totalCost: 10, payment: null, transportId: 't1' }
                    : { id: 'b1', clientId: 'u2', status: 'COMPLETED', totalCost: 10, transportId: 't1' };
            });
            stub(paymentCreator, 'create', async () => ({ id: 'pay-admin-1' }));
            stub(prisma.transport, 'update', async () => ({}));

            const req = mockRequest({
                body: {
                    paymentMethod: 'CARD',
                    cardNumber: '1111222233334444',
                    cardFirstName: 'Admin',
                    cardLastName: 'User',
                    cardVerificationCode: '123',
                    expirationDate: '2099-12'
                },
                user: { id: 'admin-1', role: 'ADMIN' },
                params: { id: 'b1' }
            });

            const res = mockResponse();

            await payRental(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.transactionId, 'pay-admin-1');
        }
    },
    {
        name: 'payRental - missing expirationDate triggers empty string branch',
        async run() {
            const req = mockRequest({
                body: {
                    paymentMethod: 'CARD',
                    cardNumber: '1111222233334444',
                    cardFirstName: 'A',
                    cardLastName: 'B',
                    cardVerificationCode: '123'
                    // ❌ NO expirationDate
                },
                user: { id: 'u1' }
            });

            const res = mockResponse();

            await payRental(req, res);

            assert.equal(res.statusCode, 400);
            assert.match(res.jsonData.error, /Invalid expiration date format/);
        }
    }
];

export default bookingTests;
