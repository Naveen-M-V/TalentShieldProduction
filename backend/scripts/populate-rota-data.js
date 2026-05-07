const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Populate Sample Rota Data Script
 * Creates test employees, shifts, and generates sample rota
 */

const Employee = require('../models/Employee');
const Shift = require('../models/Shift');
const Rota = require('../models/Rota');

const sampleEmployees = [
  { name: 'John Smith', email: 'john.smith@company.com', department: 'Operations', isActive: true },
  { name: 'Jane Doe', email: 'jane.doe@company.com', department: 'Operations', isActive: true },
  { name: 'Bob Wilson', email: 'bob.wilson@company.com', department: 'Sales', isActive: true },
  { name: 'Alice Johnson', email: 'alice.johnson@company.com', department: 'IT', isActive: true },
  { name: 'Charlie Brown', email: 'charlie.brown@company.com', department: 'Operations', isActive: true }
];

const defaultShifts = [
  { name: 'Morning', startTime: '09:00', endTime: '17:00', color: '#3b82f6' },
  { name: 'Evening', startTime: '17:00', endTime: '01:00', color: '#f59e0b' },
  { name: 'Night', startTime: '01:00', endTime: '09:00', color: '#8b5cf6' }
];

const populateData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('Connected to MongoDB');

    console.log('\n1. Checking for existing data...');
    const existingEmployees = await Employee.countDocuments();
    const existingShifts = await Shift.countDocuments();

    console.log(`   Found ${existingEmployees} employees, ${existingShifts} shifts`);

    if (existingShifts === 0) {
      console.log('\n2. Creating default shifts...');
      await Shift.insertMany(defaultShifts);
      console.log('   ✅ Created 3 default shifts');
    } else {
      console.log('\n2. Shifts already exist, skipping creation');
    }

    if (existingEmployees === 0) {
      console.log('\n3. Creating sample employees...');
      await Employee.insertMany(sampleEmployees);
      console.log(`   ✅ Created ${sampleEmployees.length} sample employees`);
    } else {
      console.log('\n3. Employees already exist, skipping creation');
    }

    console.log('\n4. Sample data populated successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Start your backend server: npm start');
    console.log('   2. Navigate to Rota Management page');
    console.log('   3. Click "Generate Rota" to create schedules');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('Error populating data:', error);
    process.exit(1);
  }
};

populateData();
