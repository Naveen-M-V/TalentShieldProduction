const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const EmployeeHub = require('../models/EmployeesHub');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/talentshield';

// Fixed accounts requested by user
const ACCOUNTS = {
  admin: {
    email: 'mvnaveen18@gmail.com',
    password: 'Talent@12345',
    firstName: 'Naveen',
    lastName: 'Admin'
  },
  manager: {
    email: 'manager.test@talentshield.local',
    password: 'Talent@12345',
    firstName: 'Test',
    lastName: 'Manager'
  },
  employee1: {
    email: 'employee1.test@talentshield.local',
    password: 'Talent@12345',
    firstName: 'Test',
    lastName: 'EmployeeOne'
  },
  employee2: {
    email: 'employee2.test@talentshield.local',
    password: 'Talent@12345',
    firstName: 'Test',
    lastName: 'EmployeeTwo'
  }
};

async function clearAllCollections() {
  const collections = await mongoose.connection.db.collections();

  for (const collection of collections) {
    await collection.deleteMany({});
  }

  return collections.length;
}

async function seedAccounts() {
  // 1) Admin in User collection (admin login path)
  const adminUser = await User.create({
    firstName: ACCOUNTS.admin.firstName,
    lastName: ACCOUNTS.admin.lastName,
    email: ACCOUNTS.admin.email,
    password: ACCOUNTS.admin.password,
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    isAdminApproved: true,
    status: 'active',
    mustChangePassword: false,
    department: 'Administration',
    company: 'TalentShield',
    staffType: 'Permanent'
  });

  // 2) Matching admin shadow record in EmployeeHub (for dashboards/clock context)
  const adminEmployee = await EmployeeHub.create({
    firstName: ACCOUNTS.admin.firstName,
    lastName: ACCOUNTS.admin.lastName,
    email: ACCOUNTS.admin.email,
    password: ACCOUNTS.admin.password,
    employeeId: 'EMP-0001',
    role: 'admin',
    managerId: null,
    userId: adminUser._id,
    jobTitle: 'System Administrator',
    department: 'Administration',
    office: 'Head Office',
    startDate: new Date('2025-01-01'),
    employmentType: 'Full-time',
    status: 'Active',
    isActive: true,
    isEmailVerified: true,
    mustChangePassword: false
  });

  // 3) Manager in EmployeeHub
  const manager = await EmployeeHub.create({
    firstName: ACCOUNTS.manager.firstName,
    lastName: ACCOUNTS.manager.lastName,
    email: ACCOUNTS.manager.email,
    password: ACCOUNTS.manager.password,
    employeeId: 'EMP-0002',
    role: 'manager',
    managerId: null,
    jobTitle: 'Engineering Manager',
    department: 'Engineering',
    office: 'Head Office',
    startDate: new Date('2025-01-01'),
    employmentType: 'Full-time',
    status: 'Active',
    isActive: true,
    isEmailVerified: true,
    mustChangePassword: false
  });

  // 4) Employee 1 in EmployeeHub
  const employee1 = await EmployeeHub.create({
    firstName: ACCOUNTS.employee1.firstName,
    lastName: ACCOUNTS.employee1.lastName,
    email: ACCOUNTS.employee1.email,
    password: ACCOUNTS.employee1.password,
    employeeId: 'EMP-0003',
    role: 'employee',
    managerId: manager._id,
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    office: 'Head Office',
    startDate: new Date('2025-01-01'),
    employmentType: 'Full-time',
    status: 'Active',
    isActive: true,
    isEmailVerified: true,
    mustChangePassword: false
  });

  // 5) Employee 2 in EmployeeHub
  const employee2 = await EmployeeHub.create({
    firstName: ACCOUNTS.employee2.firstName,
    lastName: ACCOUNTS.employee2.lastName,
    email: ACCOUNTS.employee2.email,
    password: ACCOUNTS.employee2.password,
    employeeId: 'EMP-0004',
    role: 'employee',
    managerId: manager._id,
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    office: 'Head Office',
    startDate: new Date('2025-01-01'),
    employmentType: 'Full-time',
    status: 'Active',
    isActive: true,
    isEmailVerified: true,
    mustChangePassword: false
  });

  return { adminUser, adminEmployee, manager, employee1, employee2 };
}

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const deletedCollectionsCount = await clearAllCollections();
    console.log(`🧹 Cleared all entries from ${deletedCollectionsCount} collections`);

    const seeded = await seedAccounts();

    console.log('\n✅ Database reset complete. Only 4 accounts remain:\n');
    console.log('1) ADMIN');
    console.log(`   Username: ${ACCOUNTS.admin.email}`);
    console.log(`   Password: ${ACCOUNTS.admin.password}`);
    console.log(`   User ID:  ${seeded.adminUser._id}`);
    console.log(`   Emp ID:   ${seeded.adminEmployee._id}`);

    console.log('\n2) MANAGER TEST');
    console.log(`   Username: ${ACCOUNTS.manager.email}`);
    console.log(`   Password: ${ACCOUNTS.manager.password}`);
    console.log(`   Emp ID:   ${seeded.manager._id}`);

    console.log('\n3) EMPLOYEE TEST 1');
    console.log(`   Username: ${ACCOUNTS.employee1.email}`);
    console.log(`   Password: ${ACCOUNTS.employee1.password}`);
    console.log(`   Emp ID:   ${seeded.employee1._id}`);

    console.log('\n4) EMPLOYEE TEST 2');
    console.log(`   Username: ${ACCOUNTS.employee2.email}`);
    console.log(`   Password: ${ACCOUNTS.employee2.password}`);
    console.log(`   Emp ID:   ${seeded.employee2._id}`);

    console.log('\n🎉 Done. All other DB data has been removed.');
  } catch (error) {
    console.error('❌ Failed to reset database:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
