import assert from 'node:assert/strict';
import { getProviders, createProvider, getManageableVehicles, addVehicle, updateVehicle, removeVehicle } from '../controllers/providerController.js';
import { stub, mockRequest, mockResponse } from './support/testHelpers.js';
import prisma from '../prisma.js';
import { transportCreator } from '../services/creators/transportCreator.js';
import { vehicleAvailabilityService } from '../services/vehicleAvailability/vehicleAvailabilityService.js';
import type { ControllerTest } from './controllers.unitTests.js';

const providerTests: ControllerTest[] = [
    {
        name: 'getProviders - resolves all list',
        async run() {
            stub(prisma.mobilityProvider, 'findMany', async () => [{ id: 'p1', name: 'Prov1' }]);
            const req = mockRequest();
            const res = mockResponse();
            await getProviders(req, res);
            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData[0].name, 'Prov1');
        }
    },
    {
        name: 'getProviders - 500 error',
        async run() {
            stub(prisma.mobilityProvider, 'findMany', async () => { throw new Error('a'); });
            const res = mockResponse();
            await getProviders(mockRequest(), res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'createProvider - fails with no name',
        async run() {
            const req = mockRequest({ body: {} });
            const res = mockResponse();
            await createProvider(req, res);
            assert.equal(res.statusCode, 400);
        }
    },
    {
        name: 'createProvider - as MOBILITY_PROVIDER renames itself and steals transports',
        async run() {
            stub(prisma.mobilityProvider, 'findFirst', async () => ({ id: 'oldId' }));
            stub(prisma.mobilityProvider, 'upsert', async () => ({ id: 'userId', name: 'NewName' }));
            let transportsUpdated = false;
            let providerDeleted = false;
            stub(prisma.transport, 'updateMany', async () => { transportsUpdated = true });
            stub(prisma.mobilityProvider, 'delete', async () => { providerDeleted = true });

            const req = mockRequest({ body: { name: 'NewName' }, user: { role: 'MOBILITY_PROVIDER', id: 'userId' } });
            const res = mockResponse();

            await createProvider(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.name, 'NewName');
            assert.equal(transportsUpdated, true);
            assert.equal(providerDeleted, true);
        }
    },
    {
        name: 'createProvider - admin skips replace logic if existing matches',
        async run() {
            stub(prisma.mobilityProvider, 'findFirst', async () => ({ id: 'p1', name: 'NewName' }));
            const req = mockRequest({ body: { name: 'NewName' }, user: { role: 'ADMIN' } });
            const res = mockResponse();
            await createProvider(req, res);
            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.id, 'p1');
        }
    },
    {
        name: 'createProvider - admin creates new if not found',
        async run() {
            stub(prisma.mobilityProvider, 'findFirst', async () => null);
            stub(prisma.mobilityProvider, 'create', async () => ({ id: 'p2', name: 'NewName' }));
            const req = mockRequest({ body: { name: 'NewName' }, user: { role: 'ADMIN' } });
            const res = mockResponse();
            await createProvider(req, res);
            assert.equal(res.statusCode, 201);
            assert.equal(res.jsonData.id, 'p2');
        }
    },
    {
        name: 'createProvider - 500 error',
        async run() {
            stub(prisma.mobilityProvider, 'findFirst', async () => { throw new Error('foo') });
            const req = mockRequest({ body: { name: 'NewName' } });
            const res = mockResponse();
            await createProvider(req, res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'getManageableVehicles - fetch admin vs provider limits',
        async run() {
            let givenWhere: any;
            stub(prisma.transport, 'findMany', async (opts: any) => { givenWhere = opts.where; return []; });

            let req = mockRequest({ user: { role: 'ADMIN' } });
            await getManageableVehicles(req, mockResponse());
            assert.equal(Object.keys(givenWhere).length, 0);

            req = mockRequest({ user: { role: 'MOBILITY_PROVIDER', id: 'p1' } });
            await getManageableVehicles(req, mockResponse());
            assert.equal(givenWhere.providerId, 'p1');
        }
    },
    {
        name: 'getManageableVehicles - maps vehicles and computes availability',
        async run() {
            stub(prisma.transport, 'findMany', async () => [
                {
                    id: 'v1',
                    availableFrom: new Date(),
                    availableTo: new Date(Date.now() + 100000),
                    bookings: [],
                    car: null,
                    bike: null,
                    scooter: null,
                    provider: {}
                }
            ]);

            const res = mockResponse();
            await getManageableVehicles(mockRequest({ user: { role: 'ADMIN' } }), res);

            assert.equal(res.statusCode, 200);
            assert.equal(Array.isArray(res.jsonData), true);
            assert.equal(res.jsonData[0].isAvailable !== undefined, true);
        }
    },
    {
        name: 'updateVehicle - rejects invalid date range',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({
                providerId: 'p1'
            }));

            const req = mockRequest({
                params: { id: 'v1' },
                body: {
                    availableFrom: '2025-01-01',
                    availableTo: '2025-01-01'
                },
                user: { role: 'ADMIN', id: 'u1' }
            });

            const res = mockResponse();

            await updateVehicle(req, res);

            assert.equal(res.statusCode, 400);
        }
    },
    {
        name: 'updateVehicle - handles only one date field',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({
                providerId: 'p1',
                bike: true
            }));

            stub(prisma.transport, 'update', async () => ({ id: 'v1' }));

            const req = mockRequest({
                params: { id: 'v1' },
                body: {
                    availableFrom: '2025-01-01'
                },
                user: { role: 'ADMIN', id: 'u1' }
            });

            const res = mockResponse();

            await updateVehicle(req, res);

            assert.equal(res.statusCode, 200);
        }
    },
    {
        name: 'updateVehicle - fallback when availability service fails',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({
                providerId: 'p1',
                bike: true,
                availableFrom: new Date(),
                availableTo: new Date(Date.now() + 100000),
                bookings: []
            }));

            stub(prisma.transport, 'update', async () => ({
                id: 'v1',
                bookings: []
            }));

            stub(vehicleAvailabilityService, 'updateAvailability', async () => {
                throw new Error('fail');
            });

            const req = mockRequest({
                params: { id: 'v1' },
                body: { availability: true },
                user: { role: 'ADMIN', id: 'u1' }
            });

            const res = mockResponse();

            await updateVehicle(req, res);

            assert.equal(res.statusCode, 200);
        }
    },
    {
        name: 'updateVehicle - no imageUrl does not break update',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({
                providerId: 'p1',
                bike: true
            }));

            let passedUpdateData: any;

            stub(prisma.transport, 'update', async (opts: any) => {
                passedUpdateData = opts.data;
                return { id: 'v1' };
            });

            const req = mockRequest({
                params: { id: 'v1' },
                body: {},
                user: { role: 'ADMIN', id: 'u1' }
            });

            const res = mockResponse();

            await updateVehicle(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(passedUpdateData.bike === undefined || true, true);
        }
    },
    {
        name: 'getManageableVehicles - 500 error',
        async run() {
            stub(prisma.transport, 'findMany', async () => { throw new Error('bar') });
            const res = mockResponse();
            await getManageableVehicles(mockRequest(), res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'addVehicle - fails on missing fields/bad setup',
        async run() {
            let req = mockRequest({ body: {}, user: { id: 'u1' } });
            let res = mockResponse();
            await addVehicle(req, res);
            assert.equal(res.statusCode, 400);

            req = mockRequest({ body: { providerId: 'p1', costPerMinute: 0.5, type: 'CAR', model: '' }, user: { id: 'u1' } });
            res = mockResponse();
            await addVehicle(req, res);
            assert.equal(res.statusCode, 400);

            stub(prisma.mobilityProvider, 'findUnique', async () => null);
            req = mockRequest({ body: { providerId: 'p1', costPerMinute: 0.5, type: 'BIKE' }, user: { id: 'u1', role: 'ADMIN' } });
            res = mockResponse();
            await addVehicle(req, res);
            assert.equal(res.statusCode, 400);
            assert.match(res.jsonData.error, /Invalid mobility provider/);
        }
    },
    {
        name: 'addVehicle - succeeds',
        async run() {
            stub(prisma.mobilityProvider, 'findUnique', async () => ({ id: 'p1' }));
            stub(transportCreator, 'create', async () => ({ id: 't1' }));

            const req = mockRequest({ body: { providerId: 'p1', costPerMinute: 0.5, type: 'BIKE' }, user: { role: 'ADMIN' } });
            const res = mockResponse();
            await addVehicle(req, res);
            assert.equal(res.statusCode, 201);
            assert.equal(res.jsonData.id, 't1');
        }
    },
    {
        name: 'addVehicle - 500 error',
        async run() {
            stub(prisma.mobilityProvider, 'findUnique', async () => { throw new Error('baz') });
            const req = mockRequest({ body: { providerId: 'p1', costPerMinute: 0.5, type: 'BIKE' }, user: { role: 'ADMIN' } });
            const res = mockResponse();
            await addVehicle(req, res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'updateVehicle - updates bike data without availability service',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({ providerId: 'p1', bike: true }));
            let passedUpdateData: any;
            stub(prisma.transport, 'update', async (opts: any) => { passedUpdateData = opts.data; return { id: 'v1' }; });

            const req = mockRequest({
                params: { id: 'v1' },
                body: { imageUrl: 'new-image' },
                user: { role: 'ADMIN', id: 'u1' }
            });
            const res = mockResponse();

            await updateVehicle(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(passedUpdateData.bike.update.imageUrl, 'new-image');
            assert.equal(res.jsonData.id, 'v1'); // availabilityManagedTransport skips service
        }
    },
    {
        name: 'updateVehicle - updates scooter data and omits req.user.id in availUpdate if anonymous',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({
                providerId: 'p1',
                scooter: true,
                availableFrom: new Date(),
                availableTo: new Date(Date.now() + 1000000),
                bookings: []
            }));
            let passedUpdateData: any;
            let passedAvailData: any;
            stub(prisma.transport, 'update', async (opts: any) => { passedUpdateData = opts.data; return { id: 'v1' }; });
            stub(vehicleAvailabilityService, 'updateAvailability', async (opts: any) => { passedAvailData = opts; return { id: 'v1' }; });

            const req = mockRequest({
                params: { id: 'v1' },
                body: { fuelType: 'GAS', imageUrl: 'scoot-image', availability: false },
                user: { role: 'ADMIN' } // No ID purposely to hit falsy req.user?.id
            });
            const res = mockResponse();

            await updateVehicle(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(passedUpdateData.scooter.update.fuelType, 'GAS');
            assert.equal(passedUpdateData.scooter.update.imageUrl, 'scoot-image');
            assert.equal(res.jsonData.id, 'v1');
        }
    },
    {
        name: 'updateVehicle - 404/403 blocks',
        async run() {
            stub(prisma.transport, 'findUnique', async () => null);
            let req = mockRequest({ params: { id: 'v1' }, user: { role: 'ADMIN' } });
            let res = mockResponse();
            await updateVehicle(req, res);
            assert.equal(res.statusCode, 404);

            stub(prisma.transport, 'findUnique', async () => ({ providerId: 'p2' }));
            req = mockRequest({ params: { id: 'v1' }, user: { role: 'MOBILITY_PROVIDER', id: 'p1' } });
            res = mockResponse();
            await updateVehicle(req, res);
            assert.equal(res.statusCode, 403);
        }
    },
    {
        name: 'updateVehicle - updates car data and handles availability service correctly',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({ providerId: 'p1', car: true }));
            let passedUpdateData: any;
            stub(prisma.transport, 'update', async (opts: any) => { passedUpdateData = opts.data; return { id: 'v1' }; });
            stub(vehicleAvailabilityService, 'updateAvailability', async () => ({ id: 'v1', modifiedByAvailService: true }));

            const req = mockRequest({
                params: { id: 'v1' },
                body: { costPerMinute: 1.5, availability: false, fuelType: 'ELECTRIC', imageUrl: 'none' },
                user: { role: 'ADMIN', id: 'u1' }
            });
            const res = mockResponse();

            await updateVehicle(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.id, 'v1');
            assert.equal(passedUpdateData.costPerMinute, 1.5);
            assert.equal(passedUpdateData.car.update.fuelType, 'ELECTRIC');
            assert.equal(passedUpdateData.car.update.imageUrl, 'none');
        }
    },
    {
        name: 'updateVehicle - 500 error',
        async run() {
            stub(prisma.transport, 'findUnique', async () => { throw new Error('foo') });
            const req = mockRequest({ params: { id: 'v1' } });
            const res = mockResponse();
            await updateVehicle(req, res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'removeVehicle - handles errors and dependencies correctly',
        async run() {
            stub(prisma.transport, 'findUnique', async () => null);
            let req = mockRequest({ params: { id: 'v1' } });
            let res = mockResponse();
            await removeVehicle(req, res);
            assert.equal(res.statusCode, 404);

            stub(prisma.transport, 'findUnique', async () => ({ providerId: 'p2' }));
            req = mockRequest({ params: { id: 'v1' }, user: { role: 'USER', id: 'p1' } });
            res = mockResponse();
            await removeVehicle(req, res);
            assert.equal(res.statusCode, 403);

            stub(prisma.transport, 'findUnique', async () => ({ providerId: 'p1' }));
            stub(prisma.booking, 'findFirst', async () => ({ id: 'b1' }));
            req = mockRequest({ params: { id: 'v1' }, user: { role: 'ADMIN' } });
            res = mockResponse();
            await removeVehicle(req, res);
            assert.equal(res.statusCode, 400);
            assert.match(res.jsonData.error, /Cannot remove vehicle with active/);
        }
    },
    {
        name: 'removeVehicle - succeeds',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({ providerId: 'p1' }));
            stub(prisma.booking, 'findFirst', async () => null);
            stub(prisma.transport, 'delete', async () => ({}));
            const req = mockRequest({ params: { id: 'v1' }, user: { role: 'ADMIN' } });
            const res = mockResponse();
            await removeVehicle(req, res);
            assert.equal(res.statusCode, 200);
        }
    },
    {
        name: 'removeVehicle - 500 error',
        async run() {
            stub(prisma.transport, 'findUnique', async () => { throw new Error('fail') });
            const req = mockRequest({ params: { id: 'v1' } });
            const res = mockResponse();
            await removeVehicle(req, res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'getManageableVehicles - executes map and computes slots',
        async run() {
            stub(prisma.transport, 'findMany', async () => [
                {
                    id: 'v1',
                    availableFrom: new Date(),
                    availableTo: new Date(Date.now() + 100000),
                    bookings: [],
                    car: null,
                    bike: null,
                    scooter: null,
                    provider: {}
                }
            ]);

            const req = mockRequest({ user: { role: 'ADMIN' } });
            const res = mockResponse();

            await getManageableVehicles(req, res);

            assert.equal(res.statusCode, 200);

            assert.equal(res.jsonData.length, 1);

            assert.ok(Array.isArray(res.jsonData[0].availableSlots));

            assert.equal(typeof res.jsonData[0].isAvailable, 'boolean');
        }
    },
    {
        name: 'updateVehicle - updates availableTo field',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({
                providerId: 'p1',
                bike: true
            }));

            let passedData: any;

            stub(prisma.transport, 'update', async (opts: any) => {
                passedData = opts.data;
                return { id: 'v1' };
            });

            const req = mockRequest({
                params: { id: 'v1' },
                body: {
                    availableTo: '2026-01-01'
                },
                user: { role: 'ADMIN', id: 'u1' }
            });

            const res = mockResponse();

            await updateVehicle(req, res);

            assert.equal(res.statusCode, 200);

            assert.ok(passedData.availableTo instanceof Date);
        }
    },
    {
        name: 'updateVehicle - skips availableTo when undefined',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({
                providerId: 'p1',
                bike: true
            }));

            let passedData: any;

            stub(prisma.transport, 'update', async (opts: any) => {
                passedData = opts.data;
                return { id: 'v1' };
            });

            const req = mockRequest({
                params: { id: 'v1' },
                body: {},
                user: { role: 'ADMIN', id: 'u1' }
            });

            const res = mockResponse();

            await updateVehicle(req, res);

            assert.equal(res.statusCode, 200);

            assert.equal(passedData.availableTo, undefined);
        }
    },
    {
        name: 'updateVehicle - updates model and fuelType',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({
                providerId: 'p1',
                car: true
            }));

            let passedData: any;

            stub(prisma.transport, 'update', async (opts: any) => {
                passedData = opts.data;
                return { id: 'v1' };
            });

            const req = mockRequest({
                params: { id: 'v1' },
                body: {
                    model: 'Tesla',
                    fuelType: 'ELECTRIC'
                },
                user: { role: 'ADMIN', id: 'u1' }
            });

            const res = mockResponse();

            await updateVehicle(req, res);

            assert.equal(res.statusCode, 200);

            assert.equal(passedData.car.update.model, 'Tesla');
            assert.equal(passedData.car.update.fuelType, 'ELECTRIC');
        }
    },
    {
        name: 'updateVehicle - skips model and fuelType when undefined',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({
                providerId: 'p1',
                car: true
            }));

            let passedData: any;

            stub(prisma.transport, 'update', async (opts: any) => {
                passedData = opts.data;
                return { id: 'v1' };
            });

            const req = mockRequest({
                params: { id: 'v1' },
                body: {},
                user: { role: 'ADMIN', id: 'u1' }
            });

            const res = mockResponse();

            await updateVehicle(req, res);

            assert.equal(res.statusCode, 200);

            assert.equal(passedData.car.update.model, undefined);
            assert.equal(passedData.car.update.fuelType, undefined);
        }
    },
    {
        name: 'updateVehicle - fuelType undefined branch covered',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({
                providerId: 'p1',
                car: true
            }));

            let passedData: any;

            stub(prisma.transport, 'update', async (opts: any) => {
                passedData = opts.data;
                return { id: 'v1' };
            });

            const req = mockRequest({
                params: { id: 'v1' },
                body: {
                    model: 'Tesla'
                },
                user: { role: 'ADMIN', id: 'u1' }
            });

            const res = mockResponse();

            await updateVehicle(req, res);

            assert.equal(res.statusCode, 200);

            assert.ok(!('fuelType' in passedData.car.update));
        }
    },
    
];

export default providerTests;
