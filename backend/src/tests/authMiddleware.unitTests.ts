import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { stub, mockRequest, mockResponse } from './support/testHelpers.js';
import prisma from '../prisma.js';
import type { ControllerTest } from './controllers.unitTests.js';

const authMiddlewareTests: ControllerTest[] = [
    {
        name: 'authenticateToken - attaches user and calls next for valid token',
        async run() {
            delete process.env.SUPABASE_JWT_SECRET;

            stub(jwt, 'decode', () => ({ sub: 'u1' }));
            stub(prisma.userProfile, 'findUnique', async () => ({
                id: 'u1',
                role: 'CLIENT',
                email: 'user@example.com'
            }));

            const req = mockRequest({
                headers: { authorization: 'Bearer valid-token' }
            });
            const res = mockResponse();

            let nextCalled = false;
            await authenticateToken(req, res, () => {
                nextCalled = true;
            });

            assert.equal(nextCalled, true);
            assert.equal(req.user?.id, 'u1');
            assert.equal(req.user?.role, 'CLIENT');
            assert.equal(res.statusCode, 200);
        }
    },
    {
        name: 'requireRole - allows authorized role and calls next',
        run() {
            const req = mockRequest({
                user: { id: 'admin-1', role: 'ADMIN' }
            });
            const res = mockResponse();
            const middleware = requireRole(['ADMIN', 'MOBILITY_PROVIDER']);

            let nextCalled = false;
            middleware(req, res, () => {
                nextCalled = true;
            });

            assert.equal(nextCalled, true);
            assert.equal(res.statusCode, 200);
        }
    }
];

export default authMiddlewareTests;
