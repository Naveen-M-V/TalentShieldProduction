const mongoose = require('mongoose');
const path = require('path');

// Change to backend directory before loading config
const backendDir = path.join(__dirname, '..');
process.chdir(backendDir);

const EmployeeHub = require('../models/EmployeesHub');
const config = require('../config/environment');

const checkUserRole = async (email) => {
  try {
    const mongoUri = config.getConfig().database.uri;
    console.log('🔗 Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected\n');

    const employee = await EmployeeHub.findOne({ email: email.toLowerCase() });

    if (!employee) {
      console.log(`❌ Employee not found with email: ${email}`);
      return;
    }

    console.log('📋 Employee Details:');
    console.log('='.repeat(60));
    console.log(`Name: ${employee.name || `${employee.firstName} ${employee.lastName}`}`);
    console.log(`Email: ${employee.email}`);
    console.log(`Employee ID: ${employee.employeeId}`);
    console.log(`Role: ${employee.role}`);
    console.log(`Department: ${employee.department}`);
    console.log(`Job Title: ${employee.jobTitle}`);
    console.log(`Status: ${employee.status}`);
    console.log(`Is Active: ${employee.isActive}`);
    console.log(`Created: ${employee.createdAt}`);
    console.log('='.repeat(60));

    // Check if role is valid
    const validRoles = ['employee', 'manager', 'senior-manager', 'hr', 'admin', 'super-admin'];
    if (!validRoles.includes(employee.role)) {
      console.log('\n⚠️  WARNING: Invalid role detected!');
      console.log(`Current role "${employee.role}" is not in valid roles list: ${validRoles.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

const email = process.argv[2];
if (!email) {
  console.log('Usage: node checkUserRole.js <email>');
  console.log('Example: node checkUserRole.js mr.nagendran.mg@gmail.com');
  process.exit(1);
}

checkUserRole(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
