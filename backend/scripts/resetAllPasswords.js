const mongoose = require('mongoose');
const path = require('path');

// Change to backend directory before loading config
const backendDir = path.join(__dirname, '..');
process.chdir(backendDir);

const EmployeeHub = require('../models/EmployeesHub');
const config = require('../config/environment');

const resetAllPasswords = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = config.getConfig().database.uri;
    console.log('🔗 Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Default temporary password
    const tempPassword = 'TalentShield@2025';

    // Get all active employees
    const employees = await EmployeeHub.find({ isActive: true }).sort({ employeeId: 1 });

    if (employees.length === 0) {
      console.log('❌ No active employees found.');
      return;
    }

    console.log(`📋 Found ${employees.length} active employees\n`);
    console.log('🔄 Resetting passwords to temporary password...\n');

    const results = [];

    for (const employee of employees) {
      try {
        // Set password (will be auto-hashed by pre-save hook)
        employee.password = tempPassword;
        await employee.save();

        results.push({
          success: true,
          employeeId: employee.employeeId,
          name: employee.name,
          email: employee.email,
          department: employee.department,
          jobTitle: employee.jobTitle
        });

        console.log(`✅ ${employee.employeeId} - ${employee.name} (${employee.email})`);
      } catch (error) {
        results.push({
          success: false,
          employeeId: employee.employeeId,
          name: employee.name,
          email: employee.email,
          error: error.message
        });
        console.log(`❌ ${employee.employeeId} - ${employee.name}: ${error.message}`);
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Employees: ${employees.length}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('\n🔑 TEMPORARY PASSWORD: ${tempPassword}');
    console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
    console.log('1. Share this password securely with each employee');
    console.log('2. Ask employees to change their password immediately after first login');
    console.log('3. This password is temporary and should not be used long-term');
    console.log('4. Consider implementing forced password change on first login');
    console.log('='.repeat(60));

    // Export list to file
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const outputFile = path.join(__dirname, `password-reset-${timestamp}.txt`);
    
    let output = `PASSWORD RESET REPORT - ${new Date().toISOString()}\n`;
    output += `${'='.repeat(80)}\n\n`;
    output += `TEMPORARY PASSWORD: ${tempPassword}\n\n`;
    output += `EMPLOYEE LOGIN CREDENTIALS:\n`;
    output += `${'='.repeat(80)}\n\n`;

    results.filter(r => r.success).forEach((emp, index) => {
      output += `${index + 1}. ${emp.name}\n`;
      output += `   Email: ${emp.email}\n`;
      output += `   Employee ID: ${emp.employeeId}\n`;
      output += `   Department: ${emp.department}\n`;
      output += `   Job Title: ${emp.jobTitle}\n`;
      output += `   Password: ${tempPassword}\n`;
      output += `   Login URL: https://hrms.talentshield.co.uk\n\n`;
    });

    if (failed > 0) {
      output += `\nFAILED RESETS:\n`;
      output += `${'='.repeat(80)}\n`;
      results.filter(r => !r.success).forEach((emp) => {
        output += `- ${emp.employeeId} (${emp.email}): ${emp.error}\n`;
      });
    }

    output += `\n${'='.repeat(80)}\n`;
    output += `SECURITY REMINDERS:\n`;
    output += `- This password is TEMPORARY\n`;
    output += `- Employees MUST change password after first login\n`;
    output += `- Do not share passwords via insecure channels\n`;
    output += `- Delete this file after distributing credentials\n`;

    fs.writeFileSync(outputFile, output);
    console.log(`\n📄 Full report saved to: ${outputFile}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run the script
resetAllPasswords()
  .then(() => {
    console.log('\n✅ Password reset completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
