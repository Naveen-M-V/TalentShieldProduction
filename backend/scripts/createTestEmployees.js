const mongoose = require('mongoose');
const path = require('path');

// Change to backend directory before loading config
const backendDir = path.join(__dirname, '..');
process.chdir(backendDir);

const EmployeeHub = require('../models/EmployeesHub');
const config = require('../config/environment');

const createTestEmployee = async () => {
  try {
    const mongoUri = config.getConfig().database.uri;
    console.log('🔗 Environment:', config.environment);
    console.log('🔗 Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Check if employee already exists
    const existingEmployee = await EmployeeHub.findOne({ email: 'test.employee@talentshield.co.uk' });
    
    if (existingEmployee) {
      console.log('⚠️  Test employee already exists!');
      console.log(`   Email: ${existingEmployee.email}`);
      console.log(`   Name: ${existingEmployee.firstName} ${existingEmployee.lastName}`);
      console.log(`   Active: ${existingEmployee.isActive}`);
      console.log(`   Role: ${existingEmployee.role}`);
      
      // Update to make sure it's active
      if (!existingEmployee.isActive) {
        existingEmployee.isActive = true;
        await existingEmployee.save();
        console.log('\n✅ Employee activated!');
      }
      
      console.log('\n📝 Login credentials:');
      console.log(`   Email: ${existingEmployee.email}`);
      console.log(`   Password: Use password reset or set with:`);
      console.log(`   node backend/scripts/resetPassword.js ${existingEmployee.email} YourPassword123`);
      
      return;
    }

    // Create new test employee
    const testEmployee = new EmployeeHub({
      email: 'test.employee@talentshield.co.uk',
      password: 'TestPassword123!', // Will be hashed automatically
      firstName: 'Test',
      lastName: 'Employee',
      role: 'employee',
      employeeId: 'EMP001',
      department: 'IT',
      jobTitle: 'Software Developer',
      jobRole: ['Software Developer'],
      isActive: true,
      status: 'Active',
      phoneNumber: '+44 1234 567890',
      emergencyContact: {
        name: 'Emergency Contact',
        relationship: 'Family',
        phoneNumber: '+44 9876 543210'
      },
      dateOfBirth: new Date('1990-01-01'),
      address: {
        street: '123 Test Street',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'United Kingdom'
      }
    });

    await testEmployee.save();
    
    console.log('✅ Test employee created successfully!\n');
    console.log('========================================');
    console.log('📋 TEST EMPLOYEE ACCOUNT');
    console.log('========================================');
    console.log(`Email: ${testEmployee.email}`);
    console.log(`Password: TestPassword123!`);
    console.log(`Name: ${testEmployee.firstName} ${testEmployee.lastName}`);
    console.log(`Role: ${testEmployee.role}`);
    console.log(`Employee ID: ${testEmployee.employeeId}`);
    console.log(`Department: ${testEmployee.department}`);
    console.log(`Active: ${testEmployee.isActive}`);
    console.log('========================================\n');
    console.log('🎯 You can now login with these credentials!');
    console.log('   URL: https://hrms.talentshield.co.uk');
    console.log(`   Email: ${testEmployee.email}`);
    console.log('   Password: TestPassword123!');

  } catch (error) {
    console.error('❌ Error creating test employee:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

// Also create a manager account
const createTestManager = async () => {
  try {
    const mongoUri = config.getConfig().database.uri;
    await mongoose.connect(mongoUri);

    const existingManager = await EmployeeHub.findOne({ email: 'test.manager@talentshield.co.uk' });
    
    if (existingManager) {
      console.log('\n⚠️  Test manager already exists!');
      if (!existingManager.isActive) {
        existingManager.isActive = true;
        await existingManager.save();
        console.log('✅ Manager activated!');
      }
      return;
    }

    const testManager = new EmployeeHub({
      email: 'test.manager@talentshield.co.uk',
      password: 'ManagerPass123!',
      firstName: 'Test',
      lastName: 'Manager',
      role: 'manager',
      employeeId: 'MGR001',
      department: 'IT',
      jobTitle: 'IT Manager',
      jobRole: ['Manager'],
      isActive: true,
      status: 'Active',
      phoneNumber: '+44 1234 567891',
      dateOfBirth: new Date('1985-01-01'),
      address: {
        street: '456 Manager Street',
        city: 'London',
        postcode: 'SW1A 1BB',
        country: 'United Kingdom'
      }
    });

    await testManager.save();
    
    console.log('\n✅ Test manager created!');
    console.log('========================================');
    console.log('📋 TEST MANAGER ACCOUNT');
    console.log('========================================');
    console.log(`Email: ${testManager.email}`);
    console.log(`Password: ManagerPass123!`);
    console.log(`Role: ${testManager.role}`);
    console.log('========================================');

  } catch (error) {
    console.error('❌ Error creating test manager:', error.message);
  } finally {
    await mongoose.connection.close();
  }
};

// Run both
(async () => {
  await createTestEmployee();
  await createTestManager();
})();
