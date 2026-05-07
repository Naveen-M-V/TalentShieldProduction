const mongoose = require('mongoose');
const path = require('path');

// Change to backend directory before loading config
const backendDir = path.join(__dirname, '..');
process.chdir(backendDir);

const User = require('../models/User');
const EmployeeHub = require('../models/EmployeesHub');
const config = require('../config/environment');

const resetPassword = async (email, newPassword) => {
  try {
    // Connect to MongoDB using environment config
    const mongoUri = config.getConfig().database.uri;
    console.log('🔗 Environment:', config.environment);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    console.log('========================================');
    console.log('🔑 RESET PASSWORD');
    console.log('========================================\n');

    const normalizedEmail = email.toLowerCase().trim();
    
    // Try to find user in User collection first
    let user = await User.findOne({ email: normalizedEmail });
    let collection = 'User';
    
    // If not found, try EmployeeHub
    if (!user) {
      user = await EmployeeHub.findOne({ email: normalizedEmail });
      collection = 'EmployeeHub';
    }

    if (!user) {
      console.error(`❌ No account found with email: ${email}`);
      return;
    }

    console.log(`👤 Found account in ${collection} collection:`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log('');

    // Set the plain password - the model's pre-save hook will hash it
    user.password = newPassword;
    
    // Clear any reset tokens
    if (collection === 'User') {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
    } else {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
    }
    
    // Mark password as modified to ensure it gets hashed
    user.markModified('password');
    
    await user.save();
    
    console.log('✅ Password saved and hashed by model');

    console.log('========================================');
    console.log('✅ PASSWORD RESET SUCCESSFUL!');
    console.log('========================================');
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log('');
    console.log('⚠️  Please share this password securely with the user.');
    console.log('💡 Recommend the user to change it after first login.');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
};

// Get email and password from command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('❌ Usage: node resetAdminPassword.js <email> <new-password>');
  console.log('');
  console.log('Examples:');
  console.log('  node resetAdminPassword.js admin@talentshield.com NewPass123!');
  console.log('  node resetAdminPassword.js dean.cumming@vitrux.co.uk TempPass456');
  console.log('');
  process.exit(1);
}

if (newPassword.length < 6) {
  console.log('❌ Password must be at least 6 characters long');
  process.exit(1);
}

resetPassword(email, newPassword);
