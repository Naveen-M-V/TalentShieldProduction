const mongoose = require('mongoose');
const path = require('path');

// Change to backend directory before loading config
const backendDir = path.join(__dirname, '..');
process.chdir(backendDir);

const User = require('../models/User');
const config = require('../config/environment');

const checkAdminApprovalStatus = async () => {
  try {
    // Connect to MongoDB using environment config
    const mongoUri = config.getConfig().database.uri;
    console.log('🔗 Environment:', config.environment);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    console.log('========================================');
    console.log('🔍 ADMIN/SUPER-ADMIN APPROVAL STATUS');
    console.log('========================================\n');

    // Find ALL admin and super-admin accounts
    const allAdmins = await User.find({
      role: { $in: ['admin', 'super-admin'] }
    })
      .select('_id email firstName lastName role isAdminApproved isActive status')
      .lean();

    if (allAdmins.length === 0) {
      console.log('❌ No admin accounts found in database');
    } else {
      console.log(`Found ${allAdmins.length} admin/super-admin account(s):\n`);
      
      allAdmins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.firstName} ${admin.lastName}`);
        console.log(`   📧 Email: ${admin.email}`);
        console.log(`   🔑 Role: ${admin.role}`);
        console.log(`   ✅ Approved: ${admin.isAdminApproved ? 'YES' : 'NO'}`);
        console.log(`   🔓 Active: ${admin.isActive !== false ? 'YES' : 'NO'}`);
        console.log(`   📊 Status: ${admin.status || 'N/A'}`);
        console.log('');
      });

      // Now check what the query would return
      console.log('========================================');
      console.log('🔎 QUERY TEST: isAdminApproved: true');
      console.log('========================================\n');

      const approvedAdmins = await User.find({
        role: { $in: ['admin', 'super-admin'] },
        isActive: { $ne: false },
        isAdminApproved: true
      })
        .select('_id email firstName lastName role isAdminApproved isActive')
        .lean();

      console.log(`Query result: ${approvedAdmins.length} approved admin(s)\n`);
      
      if (approvedAdmins.length === 0) {
        console.log('❌ NO APPROVED ADMINS FOUND!');
        console.log('\n💡 SOLUTION:');
        console.log('   Run: node scripts/approveAllAdmins.js');
        console.log('');
      } else {
        approvedAdmins.forEach(admin => {
          console.log(`   ✅ ${admin.firstName} ${admin.lastName} (${admin.email})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

checkAdminApprovalStatus();
