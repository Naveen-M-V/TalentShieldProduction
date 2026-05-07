const mongoose = require('mongoose');
const EmployeeHub = require('../models/EmployeesHub');
require('dotenv').config({ path: '../.env' });

/**
 * Migration Script: Add Role Hierarchy to EmployeesHub
 * 
 * This script:
 * 1. Adds 'role' field to all existing employees (default: 'employee')
 * 2. Auto-detects managers (anyone who has direct reports)
 * 3. Identifies HR department employees
 * 4. Identifies senior management by job title
 * 5. Preserves existing data
 * 
 * Run this ONCE after deploying the model changes
 */

async function migrateRoleHierarchy() {
  try {
    console.log('🔄 Starting Role Hierarchy Migration...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://thaya:pass@65.21.71.57:27017/talentshield_staging';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all employees
    const employees = await EmployeeHub.find({}).select('firstName lastName employeeId jobTitle department managerId role');
    console.log(`📊 Found ${employees.length} employees to process\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const employee of employees) {
      try {
        // Skip if role already assigned (and not default)
        if (employee.role && employee.role !== 'employee') {
          console.log(`⏩ Skipped ${employee.firstName} ${employee.lastName} (${employee.employeeId}) - Role already set: ${employee.role}`);
          skipped++;
          continue;
        }

        let newRole = 'employee';
        let reason = 'Default role';

        // Check if they have direct reports (manager detection)
        const directReports = await EmployeeHub.countDocuments({ 
          managerId: employee._id 
        });

        if (directReports > 0) {
          newRole = 'manager';
          reason = `Manages ${directReports} employee(s)`;
        }

        // Check job title for senior management
        const jobTitleLower = (employee.jobTitle || '').toLowerCase();
        const seniorTitles = [
          'director', 'head of', 'senior manager', 'department head', 
          'vp', 'vice president', 'chief', 'ceo', 'cto', 'cfo', 'coo'
        ];
        
        if (seniorTitles.some(title => jobTitleLower.includes(title))) {
          newRole = 'senior-manager';
          reason = `Senior title: ${employee.jobTitle}`;
        }

        // Check if HR department
        const deptLower = (employee.department || '').toLowerCase();
        if (deptLower.includes('hr') || deptLower.includes('human resource')) {
          newRole = 'hr';
          reason = `HR Department: ${employee.department}`;
        }

        // Check for admin keywords in job title
        if (jobTitleLower.includes('admin') && 
            (jobTitleLower.includes('system') || jobTitleLower.includes('it'))) {
          newRole = 'admin';
          reason = `Admin title: ${employee.jobTitle}`;
        }

        // Update employee role
        employee.role = newRole;
        await employee.save();

        console.log(`✅ Updated ${employee.firstName} ${employee.lastName} (${employee.employeeId}) → ${newRole.toUpperCase()} (${reason})`);
        updated++;

      } catch (error) {
        console.error(`❌ Error updating ${employee.employeeId}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏩ Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📦 Total: ${employees.length}`);
    console.log('='.repeat(80));

    // Show role distribution
    console.log('\n📈 ROLE DISTRIBUTION:');
    const roleStats = await EmployeeHub.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    roleStats.forEach(stat => {
      console.log(`   ${(stat._id || 'undefined').toUpperCase().padEnd(20)} : ${stat.count}`);
    });

    console.log('\n✅ Migration completed successfully!\n');

    // Verification queries
    console.log('🔍 VERIFICATION QUERIES:');
    console.log('   View all managers:');
    console.log('   > db.employeehub.find({ role: "manager" }, { firstName: 1, lastName: 1, employeeId: 1, role: 1 })');
    console.log('\n   View hierarchy for a specific employee:');
    console.log('   > db.employeehub.findOne({ employeeId: "EMP-1001" }).populate("managerId")');
    console.log('\n   Count employees by role:');
    console.log('   > db.employeehub.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }])');
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
  }
}

// Handle script execution
if (require.main === module) {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🔄  HRMS Role Hierarchy Migration Script                  ║
║                                                               ║
║     This will add role fields to all employees and            ║
║     auto-detect managers based on reporting relationships.    ║
║                                                               ║
║     ⚠️  IMPORTANT: Make sure you have a database backup!      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('\n✋ Do you want to proceed? (yes/no): ', (answer) => {
    readline.close();
    
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      migrateRoleHierarchy();
    } else {
      console.log('\n❌ Migration cancelled by user.\n');
      process.exit(0);
    }
  });
}

module.exports = { migrateRoleHierarchy };
