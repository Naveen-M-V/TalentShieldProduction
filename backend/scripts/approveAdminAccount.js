const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');

async function run() {
  const emailArg = process.argv[2];
  if (!emailArg) {
    console.error('Usage: node scripts/approveAdminAccount.js <email>');
    process.exit(1);
  }

  const email = String(emailArg).toLowerCase().trim();

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    user.isAdminApproved = true;
    user.isEmailVerified = true;
    user.isActive = true;
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    console.log(`✅ Admin approved: ${email}`);
    console.log(`   role: ${user.role}`);
    console.log(`   isAdminApproved: ${user.isAdminApproved}`);
    console.log(`   isEmailVerified: ${user.isEmailVerified}`);
    console.log(`   isActive: ${user.isActive}`);
  } catch (error) {
    console.error('❌ Failed to approve admin account:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
