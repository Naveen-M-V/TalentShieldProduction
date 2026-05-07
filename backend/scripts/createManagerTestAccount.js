const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const EmployeeHub = require('../models/EmployeesHub');

const parseArg = (name, fallback = null) => {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
};

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

async function generateUniqueEmployeeId() {
  const latest = await EmployeeHub.aggregate([
    {
      $match: {
        employeeId: { $type: 'string', $regex: '^EMP-\\d+$' }
      }
    },
    {
      $project: {
        numericId: {
          $toInt: {
            $arrayElemAt: [{ $split: ['$employeeId', '-'] }, 1]
          }
        }
      }
    },
    { $sort: { numericId: -1 } },
    { $limit: 1 }
  ]);

  let next = (latest[0]?.numericId || 1000) + 1;

  while (await EmployeeHub.exists({ employeeId: `EMP-${String(next).padStart(4, '0')}` })) {
    next += 1;
  }

  return `EMP-${String(next).padStart(4, '0')}`;
}

async function connectDb() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/talentshield';
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');
}

async function createOrUpdateManager() {
  const firstName = parseArg('firstName', 'Test');
  const lastName = parseArg('lastName', 'Manager');
  const email = parseArg('email', 'manager.test@talentshield.local').toLowerCase();
  const password = parseArg('password', 'Test@12345');
  const department = parseArg('department', 'Engineering');
  const jobTitle = parseArg('jobTitle', 'Engineering Manager');
  const teamSize = toNumber(parseArg('teamSize', '2'), 2);

  let manager = await EmployeeHub.findOne({ email });

  if (!manager) {
    const managerEmployeeId = await generateUniqueEmployeeId();

    manager = await EmployeeHub.create({
      firstName,
      lastName,
      email,
      password,
      employeeId: managerEmployeeId,
      role: 'manager',
      managerId: null,
      jobTitle,
      department,
      startDate: new Date(),
      employmentType: 'Full-time',
      status: 'Active',
      isActive: true,
      isEmailVerified: true
    });

    console.log(`✅ Created manager: ${manager.firstName} ${manager.lastName} (${manager.email})`);
  } else {
    manager.role = 'manager';
    manager.managerId = null;
    manager.employeeId = manager.employeeId || await generateUniqueEmployeeId();
    manager.jobTitle = manager.jobTitle || jobTitle;
    manager.department = manager.department || department;
    manager.isActive = true;
    manager.status = manager.status || 'Active';

    // Optional password reset for repeat testing
    if (password) {
      manager.password = password; // hashed by model pre-save hook
    }

    await manager.save();
    console.log(`✅ Updated existing user as manager: ${manager.firstName} ${manager.lastName} (${manager.email})`);
  }

  const createdTeamMembers = [];
  for (let i = 1; i <= teamSize; i++) {
    const memberEmail = `employee${i}.${Date.now()}@talentshield.local`;
    const memberEmployeeId = await generateUniqueEmployeeId();

    const employee = await EmployeeHub.create({
      firstName: `Team${i}`,
      lastName: 'Member',
      email: memberEmail,
      password: 'Test@12345',
      employeeId: memberEmployeeId,
      role: 'employee',
      managerId: manager._id,
      jobTitle: 'Software Engineer',
      department,
      startDate: new Date(),
      employmentType: 'Full-time',
      status: 'Active',
      isActive: true,
      isEmailVerified: true
    });

    createdTeamMembers.push(employee);
  }

  console.log('✅ Created test team members:');
  createdTeamMembers.forEach((m) => {
    console.log(`   - ${m.firstName} ${m.lastName} | ${m.email}`);
  });

  console.log('\n🧪 Test credentials:');
  console.log(`Manager Email: ${manager.email}`);
  console.log(`Manager Password: ${password}`);
  console.log(`Manager ID: ${manager._id}`);
}

(async () => {
  try {
    await connectDb();
    await createOrUpdateManager();
    console.log('\n🎉 Manager test data ready.');
  } catch (error) {
    console.error('❌ Failed to create manager test account:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
})();
