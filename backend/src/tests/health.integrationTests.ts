import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import app from '../app.js';

const runIntegrationTests = async () => {
    const server = app.listen(0);

    try {
        await new Promise<void>((resolve) => server.once('listening', resolve));

        const { port } = server.address() as AddressInfo;
        const response = await fetch(`http://127.0.0.1:${port}/api/health`);
        const payload = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(payload, { status: 'OK' });

        console.log('PASS GET /api/health returns OK');
        console.log('\n1/1 backend integration tests passed.');
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }
};

try {
    await runIntegrationTests();
} catch (error) {
    console.error('FAIL GET /api/health returns OK');
    console.error(error);
    process.exitCode = 1;
}
