import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import inspector from 'node:inspector';
import { fileURLToPath } from 'node:url';
import {
    getPaymentStorageKey,
    isRentalPaymentDataValid,
    parseStoredPaymentData,
    splitRentalsByStatus
} from '../features/rentals/rentalHelpers.js';

const wantsCoverage = process.argv.includes('--coverage');
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoRoot = path.resolve(rootDir, '..');
const targetFiles = [
    path.resolve(rootDir, 'src/features/rentals/rentalHelpers.js')
];

const tests = [
    {
        name: 'builds the frontend rental payment storage key from the user id',
        run() {
            assert.equal(getPaymentStorageKey('user-123'), 'summs_card_profile_user-123');
        }
    },
    {
        name: 'parses stored rental payment data when the JSON is valid',
        run() {
            const result = parseStoredPaymentData('{"cardNumber":"4242424242424242","cardFirstName":"Ava","cardLastName":"Lee","cardVerificationCode":"123","expirationDate":"2030-05"}');
            assert.equal(result?.cardLastName, 'Lee');
        }
    },
    {
        name: 'returns null for malformed stored rental payment data',
        run() {
            const result = parseStoredPaymentData('{bad json');
            assert.equal(result, null);
        }
    },
    {
        name: 'accepts valid frontend rental card details',
        run() {
            const result = isRentalPaymentDataValid(
                {
                    cardNumber: '4242424242424242',
                    cardFirstName: 'Ava',
                    cardLastName: 'Lee',
                    cardVerificationCode: '123',
                    expirationDate: '2030-05'
                },
                new Date('2026-04-01T12:00:00Z')
            );

            assert.equal(result, true);
        }
    },
    {
        name: 'rejects expired frontend rental card details',
        run() {
            const result = isRentalPaymentDataValid(
                {
                    cardNumber: '4242424242424242',
                    cardFirstName: 'Ava',
                    cardLastName: 'Lee',
                    cardVerificationCode: '123',
                    expirationDate: '2026-03'
                },
                new Date('2026-04-01T12:00:00Z')
            );

            assert.equal(result, false);
        }
    },
    {
        name: 'splits current and past rentals the same way the page expects',
        run() {
            const { currentBookings, pastBookings } = splitRentalsByStatus([
                { id: '1', status: 'RESERVED' },
                { id: '2', status: 'ACTIVE' },
                { id: '3', status: 'COMPLETED', payment: null },
                { id: '4', status: 'COMPLETED', payment: { id: 'pay-1' } },
                { id: '5', status: 'CANCELLED' }
            ]);

            assert.deepEqual(currentBookings.map((booking) => booking.id), ['1', '2', '3']);
            assert.deepEqual(pastBookings.map((booking) => booking.id), ['4', '5']);
        }
    }
];

const postAsync = (session, method, params = {}) => new Promise((resolve, reject) => {
    session.post(method, params, (error, result) => {
        if (error) reject(error);
        else resolve(result);
    });
});

const lineStarts = (source) => {
    const starts = [0];
    for (let index = 0; index < source.length; index += 1) {
        if (source[index] === '\n') starts.push(index + 1);
    }
    return starts;
};

const offsetToLine = (starts, offset) => {
    let low = 0;
    let high = starts.length - 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (starts[mid] <= offset) low = mid + 1;
        else high = mid - 1;
    }

    return high + 1;
};

const writeLcov = async (coverageResult) => {
    const coverageDir = path.resolve(rootDir, 'coverage');
    fs.mkdirSync(coverageDir, { recursive: true });

    const byFile = new Map();
    for (const script of coverageResult.result) {
        if (!script.url.startsWith('file://')) continue;
        const scriptPath = path.normalize(fileURLToPath(script.url));
        if (!targetFiles.includes(scriptPath)) continue;
        byFile.set(scriptPath, script.functions);
    }

    const report = [];
    for (const file of targetFiles) {
        const source = fs.readFileSync(file, 'utf8');
        const starts = lineStarts(source);
        const executable = new Map();

        for (const fn of byFile.get(file) || []) {
            for (const range of fn.ranges) {
                const startLine = offsetToLine(starts, range.startOffset);
                const endLine = offsetToLine(starts, Math.max(range.startOffset, range.endOffset - 1));
                for (let line = startLine; line <= endLine; line += 1) {
                    const prev = executable.get(line) || 0;
                    executable.set(line, Math.max(prev, range.count));
                }
            }
        }

        const entries = [...executable.entries()].sort((a, b) => a[0] - b[0]);
        const relativeFile = path.relative(repoRoot, file).replace(/\\/g, '/');
        report.push('TN:');
        report.push(`SF:${relativeFile}`);
        for (const [line, count] of entries) {
            report.push(`DA:${line},${count}`);
        }
        report.push(`LF:${entries.length}`);
        report.push(`LH:${entries.filter(([, count]) => count > 0).length}`);
        report.push('end_of_record');
    }

    fs.writeFileSync(path.join(coverageDir, 'lcov.info'), `${report.join('\n')}\n`);
};

const run = async () => {
    const session = wantsCoverage ? new inspector.Session() : null;
    if (session) {
        session.connect();
        await postAsync(session, 'Profiler.enable');
        await postAsync(session, 'Profiler.startPreciseCoverage', { callCount: true, detailed: true });
    }

    let passed = 0;
    try {
        for (const test of tests) {
            test.run();
            passed += 1;
            console.log(`PASS ${test.name}`);
        }
    } finally {
        if (session) {
            const coverageResult = await postAsync(session, 'Profiler.takePreciseCoverage');
            await postAsync(session, 'Profiler.stopPreciseCoverage');
            session.disconnect();
            await writeLcov(coverageResult);
        }
    }

    console.log(`\n${passed}/${tests.length} frontend rental unit tests passed.`);
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
