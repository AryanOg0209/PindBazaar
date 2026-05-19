require('dotenv').config();
const prisma = require('../utils/prisma');
const DISTRICTS = require('../utils/districts');

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Admin user
  const admin = await prisma.user.upsert({
    where: { phone: process.env.ADMIN_PHONE || '9999999999' },
    update: {},
    create: {
      phone: process.env.ADMIN_PHONE || '9999999999',
      name: 'PindBazaar Admin',
      role: 'admin',
      status: 'approved',
    },
  });
  console.log('✅ Admin created:', admin.phone);

  // 2. Districts
  const districtData = [];
  for (const [state, districts] of Object.entries(DISTRICTS)) {
    for (const district of districts) {
      districtData.push({ state, district });
    }
  }

  for (const d of districtData) {
    await prisma.district.upsert({
      where: { state_district: { state: d.state, district: d.district } },
      update: {},
      create: d,
    });
  }
  console.log(`✅ ${districtData.length} districts seeded`);

  // 3. Sample pending farmer
  const farmer = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: {},
    create: {
      phone: '9876543210',
      name: 'Gurpreet Singh',
      role: 'farmer',
      status: 'pending',
    },
  });
  await prisma.farmerProfile.upsert({
    where: { userId: farmer.id },
    update: {},
    create: {
      userId: farmer.id,
      fullName: 'Gurpreet Singh',
      village: 'Nangal',
      state: 'Punjab',
      district: 'Rupnagar',
      pincode: '140124',
      landAcres: 5.5,
      cropTypes: ['Wheat', 'Rice'],
    },
  });
  console.log('✅ Sample farmer seeded');

  // 4. Sample pending baler
  const baler = await prisma.user.upsert({
    where: { phone: '9812345678' },
    update: {},
    create: {
      phone: '9812345678',
      name: 'Harjinder Baler',
      role: 'baler',
      status: 'pending',
    },
  });
  await prisma.balerProfile.upsert({
    where: { userId: baler.id },
    update: {},
    create: {
      userId: baler.id,
      fullName: 'Harjinder Singh',
      village: 'Morinda',
      state: 'Punjab',
      district: 'Rupnagar',
      pincode: '140101',
      machineType: 'square',
      machineCount: 2,
      pricePerBale: 25.0,
    },
  });
  console.log('✅ Sample baler seeded');

  console.log('\n🎉 Seed complete!');
  console.log('📱 Admin login OTP: use phone 9999999999 and check server console for OTP');
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
