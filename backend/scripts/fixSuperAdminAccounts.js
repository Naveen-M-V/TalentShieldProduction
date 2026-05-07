/**
 * Fix Super Admin Accounts Script
 * 
 * This script updates super admin accounts to ensure they can login:
 * - Sets role to 'super-admin' 
 * - Sets isAdminApproved to true
 * - Sets isEmailVerified to true
 * - Sets isActive to true
 * 
 * Run: node backend/scripts/fixSuperAdminAccounts.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const EmployeeHub = require('../models/EmployeesHub');

// Super admin emails from environment
const SUPER_ADMIN_EMAILS = process.env.SUPER_ADMIN_EMAIL 
  ? process.env.SUPER_ADMIN_EMAIL.split(',').map(email => email.trim().toLowerCase())
  : [];

console.log('🔧 Super Admin emails from .env:', SUPER_ADMIN_EMAILS);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  console.error('💡 Make sure .env file exists in the project root');
  process.exit(1);
}

if (SUPER_ADMIN_EMAILS.length === 0) {
  console.error('❌ SUPER_ADMIN_EMAIL not found in environment variables');
  console.error('💡 Add SUPER_ADMIN_EMAIL to your .env file');
  process.exit(1);
}

async function fixSuperAdminAccounts() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(60));
    console.log('FIXING SUPER ADMIN ACCOUNTS');
    console.log('='.repeat(60));

    let fixedCount = 0;
    let notFoundEmails = [];

    for (const email of SUPER_ADMIN_EMAILS) {
      console.log(`\n🔍 Checking email: ${email}`);

      // Check in User model first
      const user = await User.findOne({ email: email }).select('+password');
      
      if (user) {
        console.log(`   ✓ Found in User model`);
        console.log(`   Current state:`, {
          role: user.role,
          isAdminApproved: user.isAdminApproved,
          isEmailVerified: user.isEmailVerified,
          isActive: user.isActive,
          vtid: user.vtid
        });

        // Update the user
        const updates = {
          role: 'super-admin',
          isAdminApproved: true,
          isEmailVerified: true,
          isActive: true
        };

        // Add VTID if missing
        if (!user.vtid) {
          updates.vtid = `VT${String(9000 + fixedCount).padStart(4, '0')}`;
          console.log(`   ⚠️  No VTID found, assigning: ${updates.vtid}`);
        }

        await User.updateOne({ email: email }, { $set: updates });
        
        console.log(`   ✅ Updated User account with:`, updates);
        fixedCount++;
        continue;
      }

      // Check in EmployeeHub model
      const employee = await EmployeeHub.findOne({ email: email }).select('+password');
      
      if (employee) {
        console.log(`   ✓ Found in EmployeeHub model`);
        console.log(`   Current state:`, {
          role: employee.role,
          isActive: employee.isActive,
          status: employee.status
        });

        // Update the employee
        const updates = {
          role: 'super-admin',
          isActive: true,
          status: 'Active'
        };

        await EmployeeHub.updateOne({ email: email }, { $set: updates });
        
        console.log(`   ✅ Updated EmployeeHub account with:`, updates);
        fixedCount++;
        continue;
      }

      // Not found in either model
      console.log(`   ❌ Account not found in User or EmployeeHub models`);
      notFoundEmails.push(email);
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Fixed accounts: ${fixedCount}`);
    console.log(`❌ Not found: ${notFoundEmails.length}`);
    
    if (notFoundEmails.length > 0) {
      console.log('\n⚠️  These emails were not found in the database:');
      notFoundEmails.forEach(email => console.log(`   - ${email}`));
      console.log('\n💡 These accounts may need to be created manually.');
    }

    console.log('\n✅ Script completed successfully!');
    console.log('🔄 Please restart your backend server for changes to take effect.\n');

  } catch (error) {
    console.error('❌ Error fixing super admin accounts:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
fixSuperAdminAccounts();
