const mongoose = require('mongoose');
const path = require('path');

// Change to backend directory before loading config
const backendDir = path.join(__dirname, '..');
process.chdir(backendDir);

const EmployeeHub = require('../models/EmployeesHub');
const User = require('../models/User');
const config = require('../config/environment');

const listAdminEmails = async () => {
  try {
    // Connect to MongoDB using environment config
    const mongoUri = config.getConfig().database.uri;
    console.log('🔗 Environment:', config.environment);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    console.log('========================================');
    console.log('👑 SUPER ADMIN & ADMIN ACCOUNTS');
    console.log('========================================\n');

    // Find super-admins and admins in User collection
    const adminUsers = await User.find({
      role: { $in: ['admin', 'super-admin'] }
    })
      .select('email firstName lastName role isAdminApproved')
      .sort({ role: 1, firstName: 1 });

    // Find admins in EmployeeHub collection
    const adminEmployees = await EmployeeHub.find({
      role: { $in: ['admin', 'super-admin'] },
      isActive: true
    })
      .select('email firstName lastName role employeeId')
      .sort({ role: 1, firstName: 1 });

    // Combine and deduplicate
    const allAdmins = [];
    const emailSet = new Set();

    // Add from User collection
    adminUsers.forEach(user => {
      if (!emailSet.has(user.email)) {
        emailSet.add(user.email);
        allAdmins.push({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          source: 'User',
          approved: user.isAdminApproved !== false
        });
      }
    });

    // Add from EmployeeHub collection
    adminEmployees.forEach(emp => {
      if (!emailSet.has(emp.email)) {
        emailSet.add(emp.email);
        allAdmins.push({
          email: emp.email,
          name: `${emp.firstName} ${emp.lastName}`,
          role: emp.role,
          source: 'EmployeeHub',
          employeeId: emp.employeeId
        });
      }
    });

    if (allAdmins.length === 0) {
      console.log('❌ No admin accounts found');
    } else {
      // Group by role
      const superAdmins = allAdmins.filter(a => a.role === 'super-admin');
      const admins = allAdmins.filter(a => a.role === 'admin');

      if (superAdmins.length > 0) {
        console.log('🌟 SUPER ADMINS:\n');
        superAdmins.forEach((admin, index) => {
          console.log(`${index + 1}. ${admin.name}`);
          console.log(`   📧 Email: ${admin.email}`);
          console.log(`   🔑 Role: ${admin.role}`);
          console.log(`   📁 Source: ${admin.source}`);
          if (admin.employeeId) console.log(`   🆔 Employee ID: ${admin.employeeId}`);
          if (admin.source === 'User') console.log(`   ✅ Approved: ${admin.approved ? 'Yes' : 'Pending'}`);
          console.log('');
        });
      }

      if (admins.length > 0) {
        console.log('👤 ADMINS:\n');
        admins.forEach((admin, index) => {
          console.log(`${index + 1}. ${admin.name}`);
          console.log(`   📧 Email: ${admin.email}`);
          console.log(`   🔑 Role: ${admin.role}`);
          console.log(`   📁 Source: ${admin.source}`);
          if (admin.employeeId) console.log(`   🆔 Employee ID: ${admin.employeeId}`);
          if (admin.source === 'User') console.log(`   ✅ Approved: ${admin.approved ? 'Yes' : 'Pending'}`);
          console.log('');
        });
      }

      console.log('========================================');
      console.log('📊 SUMMARY');
      console.log('========================================');
      console.log(`Total Super Admins: ${superAdmins.length}`);
      console.log(`Total Admins: ${admins.length}`);
      console.log(`Total Admin Accounts: ${allAdmins.length}`);
      console.log('');
      
      console.log('📋 EMAIL LIST (Copy-Paste Ready):');
      console.log('========================================');
      const emailList = allAdmins.map(a => a.email).join(', ');
      console.log(emailList);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

listAdminEmails();
