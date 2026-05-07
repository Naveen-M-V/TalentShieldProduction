const mongoose = require('mongoose');
const path = require('path');

// Change to backend directory before loading config
const backendDir = path.join(__dirname, '..');
process.chdir(backendDir);

const User = require('../models/User');
const config = require('../config/environment');

const checkAccount = async (email) => {
  try {
    // Connect to MongoDB using environment config
    const mongoUri = config.getConfig().database.uri;
    console.log('🔗 Environment:', config.environment);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    console.log('========================================');
    console.log('🔍 ACCOUNT DETAILS');
    console.log('========================================\n');

    const normalizedEmail = email.toLowerCase().trim();
    
    // Find user with ALL fields including password status
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      console.error(`❌ No account found with email: ${email}`);
      return;
    }

    console.log(`👤 Account Information:`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   VTID: ${user.vtid || 'N/A'}`);
    console.log('');
    console.log(`🔑 Authentication Status:`);
    console.log(`   Password Set: ${user.password ? '✅ Yes' : '❌ No'}`);
    console.log(`   Is Active: ${user.isActive !== false ? '✅ Yes' : '❌ No (BLOCKED)'}`);
    console.log(`   Is Approved: ${user.isAdminApproved !== false ? '✅ Yes' : '❌ No (PENDING)'}`);
    console.log(`   Account Locked: ${user.loginAttempts >= 5 ? '❌ Yes (Too many attempts)' : '✅ No'}`);
    console.log(`   Login Attempts: ${user.loginAttempts || 0}`);
    console.log('');
    
    if (user.lastLogin) {
      console.log(`📅 Last Login: ${user.lastLogin}`);
    } else {
      console.log(`📅 Last Login: Never logged in`);
    }
    console.log('');

    // Check what's blocking login
    const issues = [];
    if (!user.password) issues.push('❌ No password set');
    if (user.isActive === false) issues.push('❌ Account is inactive');
    if (user.isAdminApproved === false) issues.push('❌ Account pending approval');
    if (user.loginAttempts >= 5) issues.push('❌ Account locked (too many attempts)');

    if (issues.length > 0) {
      console.log('========================================');
      console.log('⚠️  LOGIN BLOCKED DUE TO:');
      console.log('========================================');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('');
      console.log('💡 SOLUTIONS:');
      if (user.isAdminApproved === false) {
        console.log('   • Run: node scripts/approveAllAdmins.js');
      }
      if (!user.password) {
        console.log('   • Run: node scripts/resetAdminPassword.js', email, '<password>');
      }
      if (user.isActive === false) {
        console.log('   • Update isActive to true in database');
      }
      if (user.loginAttempts >= 5) {
        console.log('   • Wait 2 hours or reset login attempts in database');
      }
      console.log('');
    } else {
      console.log('========================================');
      console.log('✅ ACCOUNT READY FOR LOGIN');
      console.log('========================================');
      console.log('All checks passed. Account should be able to log in.');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
};

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('❌ Usage: node checkAccountStatus.js <email>');
  console.log('');
  console.log('Example:');
  console.log('  node checkAccountStatus.js karthiramesh04356@gmail.com');
  console.log('');
  process.exit(1);
}

checkAccount(email);
