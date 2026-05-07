const mongoose = require('mongoose');
const path = require('path');

// Change to backend directory before loading config
const backendDir = path.join(__dirname, '..');
process.chdir(backendDir);

const User = require('../models/User');
const config = require('../config/environment');

const approveAllAdmins = async () => {
  try {
    // Connect to MongoDB using environment config
    const mongoUri = config.getConfig().database.uri;
    console.log('🔗 Environment:', config.environment);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    console.log('========================================');
    console.log('✅ APPROVING ALL ADMIN ACCOUNTS');
    console.log('========================================\n');

    // Find all pending admin/super-admin accounts
    const pendingAdmins = await User.find({
      role: { $in: ['admin', 'super-admin'] },
      $or: [
        { isAdminApproved: false },
        { isAdminApproved: { $exists: false } }
      ]
    });

    if (pendingAdmins.length === 0) {
      console.log('✅ No pending admin accounts found. All admins are already approved.');
    } else {
      console.log(`Found ${pendingAdmins.length} pending admin account(s):\n`);
      
      for (const admin of pendingAdmins) {
        console.log(`👤 ${admin.firstName} ${admin.lastName}`);
        console.log(`   📧 Email: ${admin.email}`);
        console.log(`   🔑 Role: ${admin.role}`);
        console.log(`   Status: Pending → Approved ✅`);
        
        // Approve the account
        admin.isAdminApproved = true;
        await admin.save();
        
        console.log('');
      }

      console.log('========================================');
      console.log(`✅ Successfully approved ${pendingAdmins.length} admin account(s)!`);
      console.log('========================================\n');
      console.log('These accounts can now log in to the system.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

approveAllAdmins();
