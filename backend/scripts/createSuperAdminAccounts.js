/**
 * Create/Update Super Admin Accounts Script
 * 
 * This script ensures super admin accounts exist and are properly configured:
 * - Creates admin accounts in User model if they don't exist
 * - Sets role to 'super-admin' 
 * - Sets isAdminApproved to true
 * - Sets isEmailVerified to true
 * - Sets isActive to true
 * - Does NOT require VTID, profileType, or startDate (admin-specific accounts)
 * 
 * Run: node backend/scripts/createSuperAdminAccounts.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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

// Define User schema inline (without profile requirements)
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  
  // Profile Information (optional for admin accounts)
  vtid: { type: String, unique: true, sparse: true },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other', 'Unspecified'], default: 'Unspecified' },
  
  // Profile Type (only for profile role)
  profileType: { type: String, enum: ['intern', 'trainee', 'contract-trainee'] },
  institution: { type: String, trim: true },
  course: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  
  // Authentication
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['profile', 'super-admin', 'admin'], default: 'profile', required: true },
  
  // Account Status
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  verificationToken: String,
  adminApprovalToken: String,
  isAdminApproved: { type: Boolean, default: false },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  
  // Profile Status
  status: { type: String, enum: ['active', 'completed', 'terminated', 'suspended'], default: 'active' },
  
  // Additional Information
  department: String,
  company: String,
  staffType: String,
  notes: { type: String, default: '' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createSuperAdminAccounts() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(60));
    console.log('CREATING/UPDATING SUPER ADMIN ACCOUNTS');
    console.log('='.repeat(60));

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const email of SUPER_ADMIN_EMAILS) {
      console.log(`\n🔍 Processing: ${email}`);

      // Check if user exists
      const existingUser = await User.findOne({ email: email }).select('+password');
      
      if (existingUser) {
        console.log(`   ✓ User already exists`);
        console.log(`   Current role: ${existingUser.role}`);
        
        // Update if not already super-admin
        if (existingUser.role !== 'super-admin') {
          await User.updateOne(
            { email: email },
            {
              $set: {
                role: 'super-admin',
                isAdminApproved: true,
                isEmailVerified: true,
                isActive: true
              },
              $unset: {
                vtid: '',
                profileType: '',
                startDate: '',
                institution: '',
                course: ''
              }
            }
          );
          console.log(`   ✅ Updated to super-admin role`);
          updatedCount++;
        } else {
          console.log(`   ⏭️  Already configured as super-admin`);
          skippedCount++;
        }
      } else {
        // Create new super admin account
        const defaultPassword = 'Admin@123'; // You should change this after first login
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);
        
        const newAdmin = await User.create({
          firstName: email.split('@')[0].split('.')[0] || 'Admin',
          lastName: email.split('@')[0].split('.')[1] || 'User',
          email: email,
          password: hashedPassword,
          role: 'super-admin',
          isActive: true,
          isEmailVerified: true,
          isAdminApproved: true,
          // NO vtid, profileType, or startDate for admin accounts
        });
        
        console.log(`   ✅ Created new super-admin account`);
        console.log(`   📧 Email: ${email}`);
        console.log(`   🔑 Default Password: ${defaultPassword}`);
        console.log(`   ⚠️  IMPORTANT: Change password after first login!`);
        createdCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Created: ${createdCount}`);
    console.log(`🔄 Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped (already configured): ${skippedCount}`);
    console.log(`📊 Total processed: ${SUPER_ADMIN_EMAILS.length}`);
    
    console.log('\n✅ Script completed successfully!');
    console.log('🔄 Please restart your backend server for changes to take effect.\n');

    if (createdCount > 0) {
      console.log('⚠️  NEW ACCOUNTS CREATED - Default password is "Admin@123"');
      console.log('🔐 Please change passwords immediately after first login!\n');
    }

  } catch (error) {
    console.error('❌ Error creating/updating super admin accounts:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
createSuperAdminAccounts();
