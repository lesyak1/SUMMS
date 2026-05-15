import assert from 'node:assert/strict';
import { getRentalAnalytics, getGatewayAnalytics } from '../controllers/adminController.js';
import { stub, mockRequest, mockResponse } from './support/testHelpers.js';
import { analyticsService } from '../services/analytics/analyticsService.js';
import { vehicleAvailabilityService } from '../services/vehicleAvailability/vehicleAvailabilityService.js';
import prisma from '../prisma.js';
import type { ControllerTest } from './controllers.unitTests.js';

const adminTests: ControllerTest[] = [
    {
        name: 'getRentalAnalytics - ADMIN role fetches full analytics and availability snapshot',
        async run() {
            stub(analyticsService, 'getRentalAnalytics', async (opts: any) => ({ mockData: 'analytics', opts }));
            stub(vehicleAvailabilityService, 'getAnalyticsSnapshot', () => ({ snapshot: 'data' }));

            const req = mockRequest({ query: { city: 'Toronto' }, user: { role: 'ADMIN' } });
            const res = mockResponse();

            await getRentalAnalytics(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.mockData, 'analytics');
            assert.equal(res.jsonData.opts.role, 'ADMIN');
            assert.equal(res.jsonData.opts.city, 'Toronto');
            assert.equal(res.jsonData.availabilitySnapshot.snapshot, 'data');
        }
    },
    {
        name: 'getRentalAnalytics - MOBILITY_PROVIDER role restricts options and omits snapshot',
        async run() {
            stub(analyticsService, 'getRentalAnalytics', async (opts: any) => ({ mockData: 'provider-analytics', opts }));

            const req = mockRequest({ query: { type: 'CAR' }, user: { id: 'prov-1', role: 'MOBILITY_PROVIDER' } });
            const res = mockResponse();

            await getRentalAnalytics(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.mockData, 'provider-analytics');
            assert.equal(res.jsonData.opts.role, 'MOBILITY_PROVIDER');
            assert.equal(res.jsonData.opts.providerId, 'prov-1');
            assert.equal(res.jsonData.availabilitySnapshot, null);
        }
    },
    {
        name: 'getRentalAnalytics - catches and returns 500 on service error',
        async run() {
            stub(analyticsService, 'getRentalAnalytics', async () => { throw new Error('DB Down'); });

            const req = mockRequest({});
            const res = mockResponse();

            await getRentalAnalytics(req, res);

            assert.equal(res.statusCode, 500);
            assert.equal(res.jsonData.error, 'Failed to fetch rental analytics');
            assert.equal(res.jsonData.details, 'DB Down');
        }
    },
    {
        name: 'getGatewayAnalytics - fetches access logs based on from/to and serviceType constraints',
        async run() {
            stub(prisma.accessLog, 'groupBy', async (opts: any) => {
                return [{ serviceType: 'RENTAL', _count: { id: 5 }, opts }];
            });

            const req = mockRequest({ query: { from: '2026-01-01', to: '2026-01-31', serviceType: 'rental' } });
            const res = mockResponse();

            await getGatewayAnalytics(req, res);

            assert.equal(res.statusCode, 200);
            const callArgs = res.jsonData.summary[0].opts;
            assert.equal(callArgs.by[0], 'serviceType');
            assert.equal(callArgs.where.serviceType, 'RENTAL');
            assert.notEqual(callArgs.where.timeStamp.gte, undefined);
        }
    },
    {
        name: 'getGatewayAnalytics - catches and returns 500 on db error',
        async run() {
            stub(prisma.accessLog, 'groupBy', async () => { throw new Error('Crash'); });

            const req = mockRequest({});
            const res = mockResponse();

            await getGatewayAnalytics(req, res);

            assert.equal(res.statusCode, 500);
            assert.equal(res.jsonData.details, 'Crash');
        }
    }
];

export default adminTests;
