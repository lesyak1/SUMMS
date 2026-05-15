import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log('Seeding database...');
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
            availability: true,
            car: { create: { model: 'Tesla Model 3' } }
        }
    });
    await prisma.transport.create({
        data: {
            providerId: provider.id,
            costPerMinute: 0.15,
            availability: true,
            bike: { create: {} }
        }
    });
    await prisma.transport.create({
        data: {
            providerId: provider.id,
            costPerMinute: 0.25,
            availability: true,
            scooter: { create: {} }
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
    console.log('Database seeded successfully. Note: Users are handled by Supabase Auth and should be registered via UI.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map