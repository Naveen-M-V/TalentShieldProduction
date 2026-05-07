const mongoose = require('mongoose');
const EmployeesHub = require('../models/EmployeesHub');
const AnnualLeaveBalance = require('../models/AnnualLeaveBalance');
require('dotenv').config();

/**
 * Initialize Annual Leave Balances for all EmployeesHub employees
 * This script creates default leave balances for employees who don't have one
 */

const initializeLeaveBalances = async () => {
  try {
    console.log('🚀 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/talentshield');
    console.log('✅ Connected to MongoDB');

    // Get all active employees from EmployeesHub
    const employees = await EmployeesHub.find({ 
      isActive: true,
      status: { $ne: 'Terminated' }
    });
    
    console.log(`📊 Found ${employees.length} active employees`);

    // Current leave year (Apr 1, 2024 - Mar 31, 2025)
    const currentYear = new Date().getFullYear();
    const leaveYearStart = new Date(currentYear, 3, 1); // April 1
    const leaveYearEnd = new Date(currentYear + 1, 2, 31); // March 31 next year

    let created = 0;
    let existing = 0;
    let errors = 0;

    for (const employee of employees) {
      try {
        // Check if balance already exists
        const existingBalance = await AnnualLeaveBalance.findOne({
          user: employee._id,
          leaveYearStart: leaveYearStart
        });

        if (existingBalance) {
          existing++;
          console.log(`⏭️  Balance already exists for ${employee.firstName} ${employee.lastName}`);
          continue;
        }

        // Create new balance
        const balance = new AnnualLeaveBalance({
          user: employee._id,
          userModel: 'EmployeeHub',
          leaveYearStart: leaveYearStart,
          leaveYearEnd: leaveYearEnd,
          entitlementDays: 28, // UK standard (including bank holidays)
          carryOverDays: 0,
          usedDays: 0,
          notes: 'Auto-initialized by script'
        });

        await balance.save();
        created++;
        console.log(`✅ Created balance for ${employee.firstName} ${employee.lastName} (${employee.email})`);

      } catch (err) {
        errors++;
        console.error(`❌ Error creating balance for ${employee.firstName} ${employee.lastName}:`, err.message);
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Already existed: ${existing}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('\n🎉 Leave balances initialized successfully!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run if called directly
if (require.main === module) {
  initializeLeaveBalances();
}

module.exports = { initializeLeaveBalances };
