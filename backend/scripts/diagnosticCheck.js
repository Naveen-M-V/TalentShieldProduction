const mongoose = require('mongoose');
const path = require('path');

// Change to backend directory before loading config
// This ensures environment files are found correctly
const backendDir = path.join(__dirname, '..');
process.chdir(backendDir);

const EmployeeHub = require('../models/EmployeesHub');
const User = require('../models/User');
const config = require('../config/environment');

const diagnosticCheck = async () => {
  try {
    // Connect to MongoDB using environment config
    const mongoUri = config.getConfig().database.uri;
    console.log('🔗 Environment:', config.environment);
    console.log('🔗 Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Check database name
    const dbName = mongoose.connection.db.databaseName;
    console.log('📊 Database Name:', dbName);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Collections in database:');
    collections.forEach(col => console.log(`   - ${col.name}`));

    console.log('\n========================================');
    console.log('📋 EMPLOYEE ACCOUNTS (employeehubs collection)');
    console.log('========================================\n');

    // Get ALL employees (not just active)
    const allEmployees = await EmployeeHub.find({})
      .select('email firstName lastName role employeeId department jobTitle status isActive')
      .sort({ createdAt: -1 });

    console.log(`Total Employee Records: ${allEmployees.length}\n`);

    if (allEmployees.length === 0) {
      console.log('❌ No employee records found in EmployeeHub collection');
      console.log('   Collection might be empty or use different name');
    } else {
      const activeCount = allEmployees.filter(e => e.isActive).length;
      const inactiveCount = allEmployees.filter(e => !e.isActive).length;
      
      console.log(`   Active: ${activeCount}`);
      console.log(`   Inactive: ${inactiveCount}\n`);

      allEmployees.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.firstName || 'N/A'} ${emp.lastName || 'N/A'}`);
        console.log(`   Email: ${emp.email}`);
        console.log(`   Role: ${emp.role}`);
        console.log(`   Employee ID: ${emp.employeeId || 'N/A'}`);
        console.log(`   Department: ${emp.department || 'N/A'}`);
        console.log(`   Job Title: ${emp.jobTitle || 'N/A'}`);
        console.log(`   Status: ${emp.status || 'N/A'}`);
        console.log(`   Active: ${emp.isActive ? '✅ Yes' : '❌ No'}`);
        console.log('');
      });
    }

    console.log('\n========================================');
    console.log('👤 PROFILE/USER ACCOUNTS (users collection)');
    console.log('========================================\n');

    const allUsers = await User.find({})
      .select('email firstName lastName role vtid isAdminApproved status')
      .sort({ createdAt: -1 });

    console.log(`Total User Records: ${allUsers.length}\n`);

    if (allUsers.length === 0) {
      console.log('❌ No user records found in User collection');
      console.log('   Collection might be empty or use different name');
    } else {
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   VTID: ${user.vtid || 'N/A'}`);
        console.log(`   Approved: ${user.isAdminApproved !== false ? '✅ Yes' : '❌ No'}`);
        console.log(`   Status: ${user.status || 'active'}`);
        console.log('');
      });
    }

    console.log('\n========================================');
    console.log('🔍 DIRECT COLLECTION QUERY');
    console.log('========================================\n');

    // Try to query collections directly
    try {
      const employeehubsCollection = mongoose.connection.db.collection('employeehubs');
      const employeehubsCount = await employeehubsCollection.countDocuments();
      console.log(`employeehubs collection count: ${employeehubsCount}`);
      
      if (employeehubsCount > 0) {
        const sample = await employeehubsCollection.findOne({});
        console.log('\nSample document from employeehubs:');
        console.log(JSON.stringify(sample, null, 2));
      }
    } catch (err) {
      console.log('❌ Error querying employeehubs:', err.message);
    }

    try {
      const usersCollection = mongoose.connection.db.collection('users');
      const usersCount = await usersCollection.countDocuments();
      console.log(`\nusers collection count: ${usersCount}`);
      
      if (usersCount > 0) {
        const sample = await usersCollection.findOne({});
        console.log('\nSample document from users:');
        console.log(JSON.stringify(sample, null, 2));
      }
    } catch (err) {
      console.log('❌ Error querying users:', err.message);
    }

    console.log('\n========================================');
    console.log('💡 RECOMMENDATIONS');
    console.log('========================================\n');

    if (allEmployees.length === 0 && allUsers.length === 0) {
      console.log('🚨 Database appears to be empty!');
      console.log('\nPossible reasons:');
      console.log('1. Wrong database connection string');
      console.log('2. Database was cleared/reset');
      console.log('3. Collections use different names');
      console.log('4. Data is in a different MongoDB instance');
      console.log('\nTo create test accounts, run:');
      console.log('   node backend/scripts/createSuperAdminAccounts.js');
    } else {
      console.log('✅ Database has data');
      if (activeCount === 0 && allEmployees.length > 0) {
        console.log('⚠️  All employees are marked as inactive');
        console.log('   This might be why login is failing');
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

diagnosticCheck();
