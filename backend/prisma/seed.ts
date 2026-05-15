import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    const now = new Date();
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days

    // 1. Create a dummy provider
    const provider = await prisma.mobilityProvider.create({
        data: {
            name: 'CityMobility Co.',
        }
    });

    console.log('Created provider:', provider.name);

    // 2. Create sample vehicles

    await prisma.transport.create({
        data: {
            providerId: provider.id,
            costPerMinute: 0.50,

            availableFrom: now,
            availableTo: future,
            availability: true,

            car: {
                create: {
                    model: 'Tesla Model 3',
                    fuelType: 'electric',
                    emissionFactorGPerKm: 0
                }
            }
        }
    });

    await prisma.transport.create({
        data: {
            providerId: provider.id,
            costPerMinute: 0.15,

            // ✅ REQUIRED
            availableFrom: now,
            availableTo: future,
            availability: true,

            bike: {
                create: {}
            }
        }
    });

    await prisma.transport.create({
        data: {
            providerId: provider.id,
            costPerMinute: 0.25,

            // ✅ 
            availableFrom: now,
            availableTo: future,
            availability: true,

            scooter: {
                create: {}
            }
        }
    });

    // 3. Create Sample Parking Spots
    await prisma.parkingSpot.createMany({
        data: [
            { status: 'AVAILABLE', location: '100 Main St Level 1 Spot 1' },
            { status: 'AVAILABLE', location: '100 Main St Level 1 Spot 2' },
            { status: 'AVAILABLE', location: '200 Downtown Ave Spot A' },
            { status: 'AVAILABLE', location: 'Yonge St Spot 1' },
            { status: 'AVAILABLE', location: 'Yonge St Spot 2' }
        ]
    });

    console.log('Database seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });