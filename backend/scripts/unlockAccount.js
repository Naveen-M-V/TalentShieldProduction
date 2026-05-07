const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const EmployeeHub = require('../models/EmployeesHub');

async function run() {
  const emailArg = process.argv[2];
  if (!emailArg) {
    console.error('Usage: node scripts/unlockAccount.js <email>');
    process.exit(1);
  }

  const email = emailArg.toLowerCase().trim();

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({ email });
    const employee = await EmployeeHub.findOne({ email });

    if (!user && !employee) {
      console.error(`No account found with email: ${email}`);
      process.exit(1);
    }

    if (user) {
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();
      console.log(`✅ Unlocked User account: ${email}`);
    }

    if (employee) {
      employee.loginAttempts = 0;
      employee.lockUntil = null;
      await employee.save();
      console.log(`✅ Unlocked EmployeeHub account: ${email}`);
    }

    console.log('Done. You can try logging in again now.');
  } catch (err) {
    console.error('Failed to unlock account:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
