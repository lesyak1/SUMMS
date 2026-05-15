import assert from 'node:assert/strict';
import { getMe, getAllUsers, updateMe, updateUserRole } from '../controllers/userController.js';
import { stub, mockRequest, mockResponse } from './support/testHelpers.js';
import prisma from '../prisma.js';
import type { ControllerTest } from './controllers.unitTests.js';

const userTests: ControllerTest[] = [
    {
        name: 'getMe - successfully returns user',
        async run() {
            const req = mockRequest({ user: { id: 'u1', name: 'John' } });
            const res = mockResponse();
            await getMe(req, res);
            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.name, 'John');
        }
    },
    {
        name: 'getMe - 500 error',
        async run() {
            const req = mockRequest();
            Object.defineProperty(req, 'user', { get() { throw new Error('fail'); } });
            const res = mockResponse();
            await getMe(req, res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'getAllUsers - fetches user list',
        async run() {
            stub(prisma.userProfile, 'findMany', async () => [{ id: 'u1' }, { id: 'u2' }]);
            const req = mockRequest();
            const res = mockResponse();
            await getAllUsers(req, res);
            assert.equal(res.statusCode, 200);
            assert.equal(res.jsonData.length, 2);
        }
    },
    {
        name: 'getAllUsers - 500 error',
        async run() {
            stub(prisma.userProfile, 'findMany', async () => { throw new Error('fail'); });
            const req = mockRequest();
            const res = mockResponse();
            await getAllUsers(req, res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'updateMe - succeeds',
        async run() {
            let passData: any;
            stub(prisma.userProfile, 'update', async (opts: any) => { passData = opts.data; return { id: 'u1' }; });
            const req = mockRequest({ user: { id: 'u1' }, body: { firstName: 'Jane', city: 'Toronto' } });
            const res = mockResponse();
            await updateMe(req, res);
            assert.equal(res.statusCode, 200);
            assert.equal(passData.firstName, 'Jane');
            assert.equal(passData.city, 'Toronto');
        }
    },
    {
        name: 'updateMe - forwards optional profile fields',
        async run() {
            let passData: any;
            stub(prisma.userProfile, 'update', async (opts: any) => {
                passData = opts.data;
                return { id: 'u1' };
            });

            const req = mockRequest({
                user: { id: 'u1' },
                body: {
                    lastName: 'Doe',
                    username: 'janedoe',
                    email: 'jane@example.com',
                    preferredMobility: 'BIKE'
                }
            });
            const res = mockResponse();

            await updateMe(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(passData.lastName, 'Doe');
            assert.equal(passData.username, 'janedoe');
            assert.equal(passData.email, 'jane@example.com');
            assert.equal(passData.preferredMobility, 'BIKE');
        }
    },
    {
        name: 'updateMe - 500 error',
        async run() {
            stub(prisma.userProfile, 'update', async () => { throw new Error('fail'); });
            const req = mockRequest({ user: { id: 'u1' } });
            const res = mockResponse();
            await updateMe(req, res);
            assert.equal(res.statusCode, 500);
        }
    },
    {
        name: 'updateUserRole - rejects invalid role',
        async run() {
            const req = mockRequest({ params: { id: 'u1' }, body: { role: 'HACKER' } });
            const res = mockResponse();
            await updateUserRole(req, res);
            assert.equal(res.statusCode, 400);
        }
    },
    {
        name: 'updateUserRole - updates valid role',
        async run() {
            let passedRole: string = '';
            stub(prisma.userProfile, 'update', async (opts: any) => { passedRole = opts.data.role; return { id: 'u2' }; });
            const req = mockRequest({ params: { id: 'u2' }, body: { role: 'ADMIN' } });
            const res = mockResponse();
            await updateUserRole(req, res);
            assert.equal(res.statusCode, 200);
            assert.equal(passedRole, 'ADMIN');
        }
    },
    {
        name: 'updateUserRole - accepts mobility provider role',
        async run() {
            let passedRole: string = '';
            stub(prisma.userProfile, 'update', async (opts: any) => {
                passedRole = opts.data.role;
                return { id: 'u3' };
            });

            const req = mockRequest({ params: { id: 'u3' }, body: { role: 'MOBILITY_PROVIDER' } });
            const res = mockResponse();

            await updateUserRole(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(passedRole, 'MOBILITY_PROVIDER');
        }
    },
    {
        name: 'updateUserRole - 500 error',
        async run() {
            stub(prisma.userProfile, 'update', async () => { throw new Error('fail'); });
            const req = mockRequest({ params: { id: 'u2' }, body: { role: 'ADMIN' } });
            const res = mockResponse();
            await updateUserRole(req, res);
            assert.equal(res.statusCode, 500);
        }
    }
];

export default userTests;
