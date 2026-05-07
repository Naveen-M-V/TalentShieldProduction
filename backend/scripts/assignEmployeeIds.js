const mongoose = require('mongoose');
const EmployeeHub = require('../models/EmployeesHub');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

/**
 * Migration script to assign unique employeeId to all employees without one
 * Run this once after deployment to ensure all employees have employeeIds
 */
async function assignEmployeeIds() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://thaya:pass@65.21.71.57:27017/talentshield_staging';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all employees without employeeId
    const employeesWithoutId = await EmployeeHub.find({
      $or: [
        { employeeId: { $exists: false } },
        { employeeId: null },
        { employeeId: '' }
      ]
    }).sort({ createdAt: 1 });

    if (employeesWithoutId.length === 0) {
      console.log('✅ All employees already have employeeIds');
      return;
    }

    console.log(`📝 Found ${employeesWithoutId.length} employees without employeeId`);

    // Find the highest existing employeeId
    const lastEmployee = await EmployeeHub.findOne({ 
      employeeId: { $exists: true, $ne: null, $ne: '' } 
    }, { employeeId: 1 })
      .sort({ employeeId: -1 })
      .lean();

    let nextId = 1001; // Default starting ID
    
    if (lastEmployee && lastEmployee.employeeId) {
      const match = lastEmployee.employeeId.match(/EMP-(\d+)/);
      if (match) {
        nextId = parseInt(match[1]) + 1;
      }
    }

    console.log(`🔢 Starting from employeeId: EMP-${String(nextId).padStart(4, '0')}`);

    // Assign employeeIds
    let updatedCount = 0;
    for (const employee of employeesWithoutId) {
      const employeeId = `EMP-${String(nextId).padStart(4, '0')}`;
      
      await EmployeeHub.findByIdAndUpdate(
        employee._id,
        { employeeId: employeeId }
      );

      console.log(`✅ Assigned ${employeeId} to ${employee.firstName} ${employee.lastName}`);
      
      nextId++;
      updatedCount++;
    }

    console.log(`\n✅ Successfully assigned employeeIds to ${updatedCount} employees`);

    // Verify all employees now have employeeIds
    const remainingWithoutId = await EmployeeHub.countDocuments({
      $or: [
        { employeeId: { $exists: false } },
        { employeeId: null },
        { employeeId: '' }
      ]
    });

    if (remainingWithoutId === 0) {
      console.log('✅ Verification passed: All employees now have employeeIds');
    } else {
      console.log(`⚠️ Warning: ${remainingWithoutId} employees still without employeeId`);
    }

  } catch (error) {
    console.error('❌ Error assigning employeeIds:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
assignEmployeeIds()
  .then(() => {
    console.log('\n🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
