const mongoose = require('mongoose');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveRecord = require('../models/LeaveRecord');
const AnnualLeaveBalance = require('../models/AnnualLeaveBalance');
const ShiftAssignment = require('../models/ShiftAssignment');

/**
 * DATA MIGRATION SCRIPT
 * Migrates existing leave data to ensure compatibility with unified leave system
 * Run this script once before deploying the unified system
 */

async function migrateLeaveData() {
  try {
    console.log('🔄 Starting leave data migration...\n');

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms';
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB\n');
    }

    // Step 1: Verify existing data
    console.log('📊 Step 1: Analyzing existing data...');
    const leaveRequestCount = await LeaveRequest.countDocuments();
    const leaveRecordCount = await LeaveRecord.countDocuments();
    const balanceCount = await AnnualLeaveBalance.countDocuments();
    const shiftCount = await ShiftAssignment.countDocuments();

    console.log(`   - LeaveRequests: ${leaveRequestCount}`);
    console.log(`   - LeaveRecords: ${leaveRecordCount}`);
    console.log(`   - AnnualLeaveBalances: ${balanceCount}`);
    console.log(`   - ShiftAssignments: ${shiftCount}\n`);

    // Step 2: Ensure all approved LeaveRequests have corresponding LeaveRecords
    console.log('📋 Step 2: Creating missing LeaveRecords for approved requests...');
    const approvedRequests = await LeaveRequest.find({ status: 'Approved' });
    let createdRecords = 0;

    for (const request of approvedRequests) {
      // Check if LeaveRecord already exists
      const existingRecord = await LeaveRecord.findOne({
        user: request.employeeId,
        startDate: request.startDate,
        endDate: request.endDate,
        status: 'approved'
      });

      if (!existingRecord) {
        // Map leave type
        const leaveTypeMap = {
          'Annual Leave': 'annual',
          'Bank Holiday': 'annual',
          'Maternity Leave': 'annual',
          'Paternity Leave': 'annual',
          'Adoption Leave': 'annual',
          'Shared Parental Leave': 'annual',
          'Parental Leave': 'annual',
          'Carer\'s Leave': 'annual',
          'Parental Bereavement Leave': 'annual',
          'Neonatal Care Leave': 'annual',
          'Time Off for Dependants': 'annual',
          'Sick Leave': 'sick',
          'Jury Service': 'annual',
          'Trade Union Duties': 'annual',
          'Public Duty Leave': 'annual',
          'Study / Training Leave': 'annual',
          'Medical / Dental Appointment': 'annual',
          // Legacy mappings for backwards compatibility
          'Sick': 'sick',
          'Casual': 'annual',
          'Paid': 'annual',
          'Unpaid': 'unpaid',
          'Maternity': 'annual',
          'Paternity': 'annual',
          'Bereavement': 'annual',
          'Other': 'annual'
        };

        await LeaveRecord.create({
          user: request.employeeId,
          type: leaveTypeMap[request.leaveType] || 'annual',
          status: 'approved',
          startDate: request.startDate,
          endDate: request.endDate,
          days: request.numberOfDays,
          reason: request.reason,
          approvedBy: request.approverId,
          approvedAt: request.approvedAt || new Date(),
          createdBy: request.approverId,
          notes: 'Migrated from LeaveRequest'
        });
        createdRecords++;
      }
    }
    console.log(`   ✅ Created ${createdRecords} missing LeaveRecords\n`);

    // Step 3: Recalculate all leave balances
    console.log('💰 Step 3: Recalculating leave balances...');
    const balances = await AnnualLeaveBalance.find();
    let recalculatedCount = 0;

    for (const balance of balances) {
      try {
        await AnnualLeaveBalance.recalculateUsedDays(
          balance.user,
          balance.leaveYearStart,
          balance.leaveYearEnd
        );
        recalculatedCount++;
      } catch (error) {
        console.error(`   ⚠️ Error recalculating balance for user ${balance.user}:`, error.message);
      }
    }
    console.log(`   ✅ Recalculated ${recalculatedCount} leave balances\n`);

    // Step 4: Cancel shifts for employees with approved leave (retroactive)
    console.log('🔄 Step 4: Cancelling shifts for approved leaves (retroactive)...');
    const approvedLeaves = await LeaveRequest.find({ 
      status: 'Approved',
      endDate: { $gte: new Date() } // Only future and current leaves
    });
    let cancelledShifts = 0;

    for (const leave of approvedLeaves) {
      const result = await ShiftAssignment.updateMany(
        {
          employeeId: leave.employeeId,
          date: {
            $gte: leave.startDate,
            $lte: leave.endDate
          },
          status: { $in: ['Scheduled', 'Pending'] }
        },
        {
          status: 'Cancelled',
          notes: 'Auto-cancelled during migration - employee has approved leave'
        }
      );
      cancelledShifts += result.modifiedCount;
    }
    console.log(`   ✅ Cancelled ${cancelledShifts} shifts\n`);

    // Step 5: Add numberOfDays to old LeaveRequests if missing
    console.log('📏 Step 5: Calculating numberOfDays for old requests...');
    const requestsWithoutDays = await LeaveRequest.find({ 
      numberOfDays: { $exists: false }
    });
    let updatedRequests = 0;

    for (const request of requestsWithoutDays) {
      if (request.startDate && request.endDate) {
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        request.numberOfDays = diffDays;
        await request.save();
        updatedRequests++;
      }
    }
    console.log(`   ✅ Updated ${updatedRequests} requests with numberOfDays\n`);

    // Step 6: Verify data integrity
    console.log('🔍 Step 6: Verifying data integrity...');
    const approvedRequestsCount = await LeaveRequest.countDocuments({ status: 'Approved' });
    const approvedRecordsCount = await LeaveRecord.countDocuments({ status: 'approved' });
    
    console.log(`   - Approved LeaveRequests: ${approvedRequestsCount}`);
    console.log(`   - Approved LeaveRecords: ${approvedRecordsCount}`);
    
    if (approvedRecordsCount >= approvedRequestsCount) {
      console.log('   ✅ Data integrity verified\n');
    } else {
      console.log('   ⚠️ Warning: Some approved requests may not have corresponding records\n');
    }

    // Step 7: Create backup information
    console.log('💾 Step 7: Creating backup information...');
    const backupInfo = {
      migrationDate: new Date(),
      beforeMigration: {
        leaveRequests: leaveRequestCount,
        leaveRecords: leaveRecordCount,
        balances: balanceCount,
        shifts: shiftCount
      },
      afterMigration: {
        leaveRequests: await LeaveRequest.countDocuments(),
        leaveRecords: await LeaveRecord.countDocuments(),
        balances: await AnnualLeaveBalance.countDocuments(),
        shifts: await ShiftAssignment.countDocuments()
      },
      changes: {
        createdRecords,
        recalculatedBalances: recalculatedCount,
        cancelledShifts,
        updatedRequests
      }
    };

    console.log('\n📊 Migration Summary:');
    console.log(JSON.stringify(backupInfo, null, 2));

    // Save backup info to file
    const fs = require('fs');
    const path = require('path');
    const backupPath = path.join(__dirname, `migration-backup-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backupInfo, null, 2));
    console.log(`\n💾 Backup information saved to: ${backupPath}`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Review the migration summary above');
    console.log('   2. Test the unified leave system endpoints');
    console.log('   3. Update frontend to use new API endpoints');
    console.log('   4. Monitor logs for any issues');
    console.log('   5. Keep the backup file for reference\n');

    return backupInfo;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback function (if needed)
 * This will restore shifts that were cancelled during migration
 */
async function rollbackShiftCancellations() {
  try {
    console.log('🔄 Rolling back shift cancellations...');
    
    const result = await ShiftAssignment.updateMany(
      {
        status: 'Cancelled',
        notes: { $regex: /Auto-cancelled during migration/ }
      },
      {
        status: 'Scheduled',
        $unset: { notes: '' }
      }
    );

    console.log(`✅ Restored ${result.modifiedCount} shifts`);
    return result;
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

/**
 * Dry run - shows what would be changed without making changes
 */
async function dryRun() {
  try {
    console.log('🔍 DRY RUN - No changes will be made\n');

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms';
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB\n');
    }

    console.log('📊 Current state:');
    console.log(`   - LeaveRequests: ${await LeaveRequest.countDocuments()}`);
    console.log(`   - LeaveRecords: ${await LeaveRecord.countDocuments()}`);
    console.log(`   - AnnualLeaveBalances: ${await AnnualLeaveBalance.countDocuments()}`);
    console.log(`   - ShiftAssignments: ${await ShiftAssignment.countDocuments()}\n`);

    // Check approved requests without records
    const approvedRequests = await LeaveRequest.find({ status: 'Approved' });
    let missingRecords = 0;

    for (const request of approvedRequests) {
      const existingRecord = await LeaveRecord.findOne({
        user: request.employeeId,
        startDate: request.startDate,
        endDate: request.endDate,
        status: 'approved'
      });
      if (!existingRecord) missingRecords++;
    }

    console.log('📋 Changes that would be made:');
    console.log(`   - LeaveRecords to create: ${missingRecords}`);

    // Check shifts that would be cancelled
    const approvedLeaves = await LeaveRequest.find({ 
      status: 'Approved',
      endDate: { $gte: new Date() }
    });
    let shiftsToCancel = 0;

    for (const leave of approvedLeaves) {
      const count = await ShiftAssignment.countDocuments({
        employeeId: leave.employeeId,
        date: {
          $gte: leave.startDate,
          $lte: leave.endDate
        },
        status: { $in: ['Scheduled', 'Pending'] }
      });
      shiftsToCancel += count;
    }

    console.log(`   - Shifts to cancel: ${shiftsToCancel}`);

    // Check requests without numberOfDays
    const requestsWithoutDays = await LeaveRequest.countDocuments({ 
      numberOfDays: { $exists: false }
    });
    console.log(`   - Requests to update with numberOfDays: ${requestsWithoutDays}\n`);

    console.log('✅ Dry run completed. Run migrateLeaveData() to apply changes.\n');
  } catch (error) {
    console.error('❌ Dry run failed:', error);
    throw error;
  }
}

// If running directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--dry-run')) {
    dryRun()
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  } else if (args.includes('--rollback')) {
    rollbackShiftCancellations()
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  } else {
    migrateLeaveData()
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  }
}

module.exports = {
  migrateLeaveData,
  rollbackShiftCancellations,
  dryRun
};
