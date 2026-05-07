const mongoose = require('mongoose');
const path = require('path');

// Change to backend directory before loading config
const backendDir = path.join(__dirname, '..');
process.chdir(backendDir);

const EmployeeHub = require('../models/EmployeesHub');
const User = require('../models/User');
const config = require('../config/environment');

const listAllAccounts = async () => {
  try {
    // Connect to MongoDB using environment config
    const mongoUri = config.getConfig().database.uri;
    console.log('🔗 Environment:', config.environment);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    console.log('\n========================================');
    console.log('📋 EMPLOYEE ACCOUNTS (EmployeeHub)');
    console.log('========================================\n');

    const employees = await EmployeeHub.find({ isActive: true })
      .select('email firstName lastName role employeeId department jobTitle status')
      .sort({ role: -1, firstName: 1 });

    if (employees.length === 0) {
      console.log('❌ No active employees found in database');
    } else {
      employees.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.firstName} ${emp.lastName}`);
        console.log(`   Email: ${emp.email}`);
        console.log(`   Role: ${emp.role}`);
        console.log(`   Employee ID: ${emp.employeeId || 'N/A'}`);
        console.log(`   Department: ${emp.department || 'N/A'}`);
        console.log(`   Job Title: ${emp.jobTitle || 'N/A'}`);
        console.log(`   Status: ${emp.status || 'Active'}`);
        console.log(`   Password: [Encrypted - Use password reset to set new password]`);
        console.log('');
      });
      console.log(`Total Employees: ${employees.length}`);
    }

    console.log('\n========================================');
    console.log('👤 PROFILE/USER ACCOUNTS (User)');
    console.log('========================================\n');

    const users = await User.find()
      .select('email firstName lastName role vtid isAdminApproved')
      .sort({ role: -1, firstName: 1 });

    if (users.length === 0) {
      console.log('❌ No users/profiles found in database');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   VTID: ${user.vtid || 'N/A'}`);
        console.log(`   Approved: ${user.isAdminApproved !== false ? 'Yes' : 'Pending'}`);
        console.log(`   Password: [Encrypted - Use password reset to set new password]`);
        console.log('');
      });
      console.log(`Total Users/Profiles: ${users.length}`);
    }

    console.log('\n========================================');
    console.log('💡 PASSWORD RESET INSTRUCTIONS');
    console.log('========================================\n');
    console.log('To reset a password, use the forgot password feature:');
    console.log('1. Go to the login page');
    console.log('2. Click "Forgot Password?"');
    console.log('3. Enter the email address');
    console.log('4. Check the email for reset link');
    console.log('\nOR run the password reset script:');
    console.log('node backend/scripts/resetPassword.js <email> <newpassword>');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
};

listAllAccounts();
