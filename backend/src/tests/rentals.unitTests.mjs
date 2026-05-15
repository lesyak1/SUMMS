import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import inspector from 'node:inspector';
import { fileURLToPath } from 'node:url';
import { calculateRentalPricing } from './support/rentalPricing.mjs';
import { validateCardPaymentDetails } from './support/paymentValidation.mjs';

const wantsCoverage = process.argv.includes('--coverage');
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoRoot = path.resolve(rootDir, '..');
const targetFiles = [
    path.resolve(rootDir, 'src/tests/support/rentalPricing.mjs'),
    path.resolve(rootDir, 'src/tests/support/paymentValidation.mjs')
];

const tests = [
    {
        name: 'applies the preference discount before other rental pricing strategies',
        run() {
            const result = calculateRentalPricing({
                durationMinutes: 20,
                costPerMinute: 0.5,
                vehicleType: 'CAR',
                city: 'Toronto',
                preferredMobility: 'car'
            });

            assert.equal(result.strategy, 'PREFERENCE_ALIGNED_PRICING');
            assert.equal(result.total, 9);
            assert.deepEqual(result.adjustments, [
                'Applied a 10% discount because the trip matched the user preference'
            ]);
        }
    },
    {
        name: 'falls back to city pricing when the rental preference does not match',
        run() {
            const result = calculateRentalPricing({
                durationMinutes: 10,
                costPerMinute: 1,
                vehicleType: 'SCOOTER',
                city: 'Montreal',
                preferredMobility: 'bike'
            });

            assert.equal(result.strategy, 'CITY_PRICING');
            assert.equal(result.total, 11);
            assert.match(result.adjustments[0] ?? '', /1\.1x city multiplier/i);
        }
    },
    {
        name: 'uses the vehicle-type multiplier when no preference or city rule applies',
        run() {
            const result = calculateRentalPricing({
                durationMinutes: 8,
                costPerMinute: 1.25,
                vehicleType: 'BIKE'
            });

            assert.equal(result.strategy, 'VEHICLE_TYPE_PRICING');
            assert.equal(result.total, 7.5);
            assert.match(result.adjustments[0] ?? '', /bike rentals/i);
        }
    },
    {
        name: 'accepts a valid non-expired rental payment card',
        run() {
            const result = validateCardPaymentDetails(
                {
                    cardNumber: '4242424242424242',
                    cardFirstName: 'Alex',
                    cardLastName: 'Rider',
                    cardVerificationCode: '123',
                    expirationDate: '2030-06'
                },
                new Date('2026-04-01T12:00:00Z')
            );

            assert.deepEqual(result, { valid: true });
        }
    },
    {
        name: 'rejects malformed rental payment expiry dates',
        run() {
            const result = validateCardPaymentDetails(
                {
                    cardNumber: '4242424242424242',
                    cardFirstName: 'Alex',
                    cardLastName: 'Rider',
                    cardVerificationCode: '123',
                    expirationDate: '06/2030'
                },
                new Date('2026-04-01T12:00:00Z')
            );

            assert.deepEqual(result, {
                valid: false,
                error: 'Invalid expiration date format. Use YYYY-MM'
            });
        }
    },
    {
        name: 'rejects expired rental payment cards',
        run() {
            const result = validateCardPaymentDetails(
                {
                    cardNumber: '4242424242424242',
                    cardFirstName: 'Alex',
                    cardLastName: 'Rider',
                    cardVerificationCode: '123',
                    expirationDate: '2026-03'
                },
                new Date('2026-04-01T12:00:00Z')
            );

            assert.deepEqual(result, {
                valid: false,
                error: 'Invalid credit card details. Payment cannot be processed.'
            });
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

    console.log(`\n${passed}/${tests.length} backend rental unit tests passed.`);
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
