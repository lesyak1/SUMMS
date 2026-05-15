import assert from 'node:assert/strict';
import { searchVehicles, getVehicleDetails, getRecommendedVehicles } from '../controllers/vehicleController.js';
import { stub, mockRequest, mockResponse } from './support/testHelpers.js';
import prisma from '../prisma.js';
import { vehicleRecommendationService } from '../services/recommendations/vehicleRecommendationService.js';
import type { ControllerTest } from './controllers.unitTests.js';
import { getManageableVehicles } from '../controllers/providerController.js';
import { getAvailableSlots } from '../utils/availability.js';

const vehicleTests: ControllerTest[] = [
    {
        name: 'searchVehicles - builds correct where clause based on query',
        async run() {
            let givenWhere: any;
            stub(prisma.transport, 'findMany', async (opts: any) => { givenWhere = opts.where; return []; });

            const req = mockRequest({ query: { availability: 'true', maxPrice: '2.5', type: 'car' } });
            const res = mockResponse();

            await searchVehicles(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(givenWhere.availability, true);
            assert.equal(givenWhere.costPerMinute.lte, 2.5);
            assert.notEqual(givenWhere.car.isNot, undefined);
        }
    },
    {
        name: 'searchVehicles - formats nextAvailableAt correctly when booked',
        async run() {
            stub(prisma.transport, 'findMany', async () => [
                { id: 'v1', availability: true, bookings: [] },
                { id: 'v2', availability: false, bookings: [{ endTime: new Date('2026-01-01') }] }
            ]);

            const req = mockRequest();
            const res = mockResponse();

            await searchVehicles(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData[0].availableSlots.length, 1);
            assert.equal(res.jsonData[1].availableSlots.length, 1);
        }
    },
    {
        name: 'searchVehicles - 500 error',
        async run() {
            stub(prisma.transport, 'findMany', async () => { throw new Error('fail'); });
            const req = mockRequest();
            const res = mockResponse();
            await searchVehicles(req, res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'getVehicleDetails - 404',
        async run() {
            stub(prisma.transport, 'findUnique', async () => null);
            const req = mockRequest({ params: { id: 'v1' } });
            const res = mockResponse();
            await getVehicleDetails(req, res);
            assert.equal(res.statusCode, 404);
        }
    },
    {
        name: 'getVehicleDetails - success with nextAvailableAt formatting (null)',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({ id: 'v3', availability: true, bookings: [] }));
            const req = mockRequest({ params: { id: 'v3' } });
            const res = mockResponse();
            await getVehicleDetails(req, res);
            assert.equal(res.statusCode, 200);
            assert.ok(Array.isArray(res.jsonData.availableSlots));
        }
    },
    {
        name: 'getVehicleDetails - success with nextAvailableAt formatting',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({ id: 'v2', availability: false, bookings: [{ endTime: new Date('2026-02-02') }] }));
            const req = mockRequest({ params: { id: 'v2' } });
            const res = mockResponse();
            await getVehicleDetails(req, res);
            assert.equal(res.statusCode, 200);
            assert.ok(res.jsonData.availableSlots.length > 0);
        }
    },
    {
        name: 'getVehicleDetails - 500 error',
        async run() {
            stub(prisma.transport, 'findUnique', async () => { throw new Error('fail'); });
            const req = mockRequest({ params: { id: 'v2' } });
            const res = mockResponse();
            await getVehicleDetails(req, res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'getRecommendedVehicles - succeeds with no query constraints',
        async run() {
            stub(prisma.transport, 'findMany', async () => [{ id: 'v2' }]);
            stub(vehicleRecommendationService, 'recommend', (opts: any) => ({ recommendation: 'best-vehicle-2', opts }));

            const req = mockRequest({ query: {}, user: {} });
            const res = mockResponse();

            await getRecommendedVehicles(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.recommendation, 'best-vehicle-2');
            assert.equal(res.jsonData.opts.requestedType, undefined);
        }
    },
    {
        name: 'getRecommendedVehicles - combines params and service output',
        async run() {
            stub(prisma.transport, 'findMany', async () => [{ id: 'v1' }]);
            stub(vehicleRecommendationService, 'recommend', (opts: any) => ({ recommendation: 'best-vehicle', opts }));

            const req = mockRequest({ query: { type: 'bike' }, user: { preferredMobility: 'bike', city: 'Toronto' } });
            const res = mockResponse();

            await getRecommendedVehicles(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.recommendation, 'best-vehicle');
            assert.equal(res.jsonData.opts.requestedType, 'bike');
            assert.equal(res.jsonData.opts.preferredMobility, 'bike');
            assert.equal(res.jsonData.opts.city, 'Toronto');
        }
    },
    {
        name: 'getRecommendedVehicles - 500 error',
        async run() {
            stub(prisma.transport, 'findMany', async () => { throw new Error('fail'); });
            const req = mockRequest();
            const res = mockResponse();
            await getRecommendedVehicles(req, res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'searchVehicles - uses getAvailableSlots when dates exist',
        async run() {
            stub(prisma.transport, 'findMany', async () => [
                {
                    id: 'v1',
                    availableFrom: new Date(),
                    availableTo: new Date(Date.now() + 100000),
                    bookings: []
                }
            ]);

            const req = mockRequest();
            const res = mockResponse();

            await searchVehicles(req, res);

            assert.equal(res.statusCode, 200);
            assert.ok(res.jsonData[0].availableSlots.length >= 0);
        }
    },
    {
        name: 'searchVehicles - ignores invalid type filter',
        async run() {
            let givenWhere: any;
            stub(prisma.transport, 'findMany', async (opts: any) => {
                givenWhere = opts.where;
                return [];
            });

            const req = mockRequest({ query: { type: 'plane' } });
            const res = mockResponse();

            await searchVehicles(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(givenWhere.car, undefined);
            assert.equal(givenWhere.bike, undefined);
        }
    },
    {
        name: 'searchVehicles - availability false filter',
        async run() {
            let givenWhere: any;
            stub(prisma.transport, 'findMany', async (opts: any) => {
                givenWhere = opts.where;
                return [];
            });

            const req = mockRequest({ query: { availability: 'false' } });
            const res = mockResponse();

            await searchVehicles(req, res);

            assert.equal(givenWhere.availability, false);
        }
    },
    {
        name: 'searchVehicles - availability false filter',
        async run() {
            let givenWhere: any;
            stub(prisma.transport, 'findMany', async (opts: any) => {
                givenWhere = opts.where;
                return [];
            });

            const req = mockRequest({ query: { availability: 'false' } });
            const res = mockResponse();

            await searchVehicles(req, res);

            assert.equal(givenWhere.availability, false);
        }
    },
    {
        name: 'getManageableVehicles - handles undefined bookings fallback',
        async run() {
            stub(prisma.transport, 'findMany', async () => [
                {
                    id: 'v1',
                    availableFrom: new Date(),
                    availableTo: new Date(Date.now() + 100000),
                    bookings: undefined, // 🔥 triggers fallback
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
            assert.ok(Array.isArray(res.jsonData[0].availableSlots));
        }
    },
    {
        name: 'getVehicleDetails - executes getAvailableSlots when dates exist',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({
                id: 'v1',
                availableFrom: new Date(),
                availableTo: new Date(Date.now() + 100000),
                bookings: []
            }));

            const req = mockRequest({ params: { id: 'v1' } });
            const res = mockResponse();

            await getVehicleDetails(req, res);

            assert.equal(res.statusCode, 200);

            assert.ok(Array.isArray(res.jsonData.availableSlots));
        }
    },
    {
        name: 'searchVehicles - bookings fallback executes inside slot calculation',
        async run() {
            stub(prisma.transport, 'findMany', async () => [
                {
                    id: 'v1',
                    availableFrom: new Date(),
                    availableTo: new Date(Date.now() + 100000),
                    bookings: undefined // 🔥 triggers fallback
                }
            ]);

            const req = mockRequest();
            const res = mockResponse();

            await searchVehicles(req, res);

            assert.equal(res.statusCode, 200);

            assert.ok(Array.isArray(res.jsonData[0].availableSlots));
        }
    },
    {
        name: 'getVehicleDetails - covers slot calculation and bookings fallback',
        async run() {
            stub(prisma.transport, 'findUnique', async () => ({
                id: 'v1',
                availableFrom: new Date(),
                availableTo: new Date(Date.now() + 100000),
                bookings: undefined
            }));

            const req = mockRequest({ params: { id: 'v1' } });
            const res = mockResponse();

            await getVehicleDetails(req, res);

            assert.equal(res.statusCode, 200);

            assert.ok(Array.isArray(res.jsonData.availableSlots));
        }
    }
];

export default vehicleTests;
