import assert from 'node:assert/strict';
import { listSpots, reserveSpot, unreserveSpot } from '../controllers/parkingController.js';
import { stub, mockRequest, mockResponse } from './support/testHelpers.js';
import prisma from '../prisma.js';
import { accessLogCreator } from '../services/creators/accessLogCreator.js';
import type { ControllerTest } from './controllers.unitTests.js';

const parkingTests: ControllerTest[] = [
    {
        name: 'listSpots - maps parking spot coordinates and active reservations',
        async run() {
            stub(prisma.parkingSpot, 'findMany', async () => [
                { id: 'p1', location: 'Toronto', reservations: [] },
                { id: 'p2', location: 'Yonge St', reservations: [{ clientId: 'u1' }] }
            ]);

            const req = mockRequest({ user: { id: 'u1' } });
            const res = mockResponse();

            await listSpots(req, res);

            assert.equal(res.statusCode, 200);
            const spots = res.jsonData;
            assert.equal(spots[0].location, 'Montreal');
            assert.equal(spots[0].status, 'AVAILABLE');
            assert.equal(spots[0].reservedByCurrentUser, false);

            assert.equal(spots[1].location, 'St Catherine St');
            assert.equal(spots[1].status, 'RESERVED');
            assert.equal(spots[1].reservedByCurrentUser, true);
        }
    },
    {
        name: 'listSpots - maps Main St and other-user reservation correctly',
        async run() {
            stub(prisma.parkingSpot, 'findMany', async () => [
                { id: 'p3', location: 'Main St', reservations: [{ clientId: 'u2' }] }
            ]);

            const req = mockRequest({ user: { id: 'u1' } });
            const res = mockResponse();

            await listSpots(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData[0].location, 'Sherbrooke St');
            assert.equal(res.jsonData[0].status, 'RESERVED');
            assert.equal(res.jsonData[0].reservedByCurrentUser, false);
        }
    },
    {
        name: 'listSpots - 500 error',
        async run() {
            stub(prisma.parkingSpot, 'findMany', async () => { throw new Error('fail'); });
            const res = mockResponse();
            await listSpots(mockRequest(), res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'reserveSpot - overlaps return 400',
        async run() {
            stub(prisma.parkingReservation, 'findFirst', async () => ({ id: 'res1' }));
            const req = mockRequest({ body: { spotId: 's1', startTime: '2026-06-01', endTime: '2026-06-02' }, user: { id: 'u1' } });
            const res = mockResponse();
            await reserveSpot(req, res);
            assert.equal(res.statusCode, 400);
            assert.match(res.jsonData.error, /already reserved/);
        }
    },
    {
        name: 'reserveSpot - succeeds and writes log',
        async run() {
            stub(prisma.parkingReservation, 'findFirst', async () => null);
            stub(accessLogCreator, 'create', async () => ({}));

            let txPassed = false;
            stub(prisma, '$transaction', async (cb: any) => {
                txPassed = true;
                const mockTx = {
                    parkingSpot: {
                        findUnique: async () => ({ id: 's1', status: 'AVAILABLE' }),
                        update: async () => ({})
                    },
                    parkingReservation: {
                        create: async () => ({ id: 'new-res' })
                    }
                };
                return cb(mockTx);
            });

            const req = mockRequest({ body: { spotId: 's1', startTime: '2026-06-01', endTime: '2026-06-02' }, user: { id: 'u1' } });
            const res = mockResponse();

            await reserveSpot(req, res);

            assert.equal(txPassed, true);
            assert.equal(res.statusCode, 201);
            assert.equal(res.jsonData.id, 'new-res');
        }
    },
    {
        name: 'reserveSpot - handles transaction errors correctly',
        async run() {
            stub(prisma.parkingReservation, 'findFirst', async () => null);

            stub(prisma, '$transaction', async (cb: any) => {
                const mockTx = {
                    parkingSpot: { findUnique: async () => null }
                };
                return cb(mockTx);
            });
            let req = mockRequest({ body: {}, user: { id: 'u1' } });
            let res = mockResponse();
            await reserveSpot(req, res);
            assert.equal(res.statusCode, 404);
            assert.match(res.jsonData.error, /not found/);

            stub(prisma, '$transaction', async (cb: any) => {
                const mockTx = {
                    parkingSpot: { findUnique: async () => ({ status: 'RESERVED' }) }
                };
                return cb(mockTx);
            });
            res = mockResponse();
            await reserveSpot(req, res);
            assert.equal(res.statusCode, 400);
            assert.match(res.jsonData.error, /not currently available/);

            stub(prisma, '$transaction', async () => { throw new Error('DB DOWN'); });
            res = mockResponse();
            await reserveSpot(req, res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'unreserveSpot - 404 on no active reservation',
        async run() {
            stub(prisma.parkingReservation, 'findFirst', async () => null);
            const req = mockRequest({ params: { spotId: 's1' }, user: { id: 'u1' } });
            const res = mockResponse();
            await unreserveSpot(req, res);
            assert.equal(res.statusCode, 404);
        }
    },
    {
        name: 'unreserveSpot - success updates spot state',
        async run() {
            stub(prisma.parkingReservation, 'findFirst', async () => ({ id: 'r1' }));
            
            let updatedSpotStatus = '';
            stub(prisma, '$transaction', async (cb: any) => {
                const mockTx = {
                    parkingReservation: {
                        delete: async () => ({}),
                        findFirst: async () => null // means no remaining reservations
                    },
                    parkingSpot: {
                        update: async ({ data }: any) => { updatedSpotStatus = data.status; return {}; }
                    }
                };
                return cb(mockTx);
            });

            const req = mockRequest({ params: { spotId: 's1' }, user: { id: 'u1' } });
            const res = mockResponse();

            await unreserveSpot(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(updatedSpotStatus, 'AVAILABLE');
        }
    },
    {
        name: 'unreserveSpot - keeps reserved status when another reservation remains',
        async run() {
            stub(prisma.parkingReservation, 'findFirst', async () => ({ id: 'r1' }));

            let updatedSpotStatus = '';
            stub(prisma, '$transaction', async (cb: any) => {
                const mockTx = {
                    parkingReservation: {
                        delete: async () => ({}),
                        findFirst: async () => ({ id: 'r2' })
                    },
                    parkingSpot: {
                        update: async ({ data }: any) => { updatedSpotStatus = data.status; return {}; }
                    }
                };
                return cb(mockTx);
            });

            const req = mockRequest({ params: { spotId: 's1' }, user: { id: 'u1' } });
            const res = mockResponse();

            await unreserveSpot(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(updatedSpotStatus, 'RESERVED');
        }
    },
    {
        name: 'unreserveSpot - fallback 500',
        async run() {
            stub(prisma.parkingReservation, 'findFirst', async () => { throw new Error('fail') });
            const req = mockRequest({ params: { spotId: 's1' }, user: { id: 'u1' } });
            const res = mockResponse();
            await unreserveSpot(req, res);
            assert.equal(res.statusCode, 500);
        }
    }
];

export default parkingTests;
