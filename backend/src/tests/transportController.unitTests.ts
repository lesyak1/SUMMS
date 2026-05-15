import assert from 'node:assert/strict';
import { getRoutes } from '../controllers/transportController.js';
import { stub, mockRequest, mockResponse } from './support/testHelpers.js';
import { accessLogCreator } from '../services/creators/accessLogCreator.js';
import type { ControllerTest } from './controllers.unitTests.js';

const transportTests: ControllerTest[] = [
    {
        name: 'getRoutes - fetches mock routes and logs access for logged in user',
        async run() {
            let logCreated = false;
            stub(accessLogCreator, 'create', async () => { logCreated = true; });

            const req = mockRequest({ user: { id: 'u1' } });
            const res = mockResponse();

            await getRoutes(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.length, 3);
            assert.equal(logCreated, true);
        }
    },
    {
        name: 'getRoutes - fetches mock routes and skips log for anonymous user',
        async run() {
            let logCreated = false;
            stub(accessLogCreator, 'create', async () => { logCreated = true; });

            const req = mockRequest();
            const res = mockResponse();

            await getRoutes(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(logCreated, false);
        }
    },
    {
        name: 'getRoutes - returns expected transport route details',
        async run() {
            const req = mockRequest();
            const res = mockResponse();

            await getRoutes(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData[0].type, 'BUS');
            assert.equal(res.jsonData[1].name, 'City Circle Line');
            assert.equal(res.jsonData[2].schedule, 'Every 20 mins');
        }
    },
    {
        name: 'getRoutes - 500 fallback',
        async run() {
            stub(accessLogCreator, 'create', async () => { throw new Error('fail'); });
            const req = mockRequest({ user: { id: 'u1' } });
            const res = mockResponse();

            await getRoutes(req, res);
            assert.equal(res.statusCode, 500);
        }
    }
];

export default transportTests;
