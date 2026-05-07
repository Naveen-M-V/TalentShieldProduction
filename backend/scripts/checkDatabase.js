#!/usr/bin/env node

/**
 * Database Health Check Script
 * 
 * This script checks the HRMS database for:
 * - Connection status
 * - Collections and document counts
 * - User accounts (both User and EmployeeHub models)
 * - Profiles
 * - Certificates
 * - Data integrity issues
 * 
 * Usage: node scripts/checkDatabase.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment configuration
const envConfig = require('../config/environment');
const config = envConfig.getConfig();

// Load models
const User = require('../models/User');
const EmployeeHub = require('../models/EmployeesHub');
const Certificate = require('../models/Certificate');
const Notification = require('../models/Notification');

// Profile schema is defined in server.js, so we'll access it after connection
let Profile;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

const log = {
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`  ${msg}`),
  data: (label, value) => console.log(`  ${colors.cyan}${label}:${colors.reset} ${value}`)
};

async function checkDatabase() {
  try {
    log.header();
    console.log(`${colors.bright}${colors.cyan}     HRMS DATABASE HEALTH CHECK${colors.reset}`);
    log.header();

    // 1. Check Database Connection
    log.section('1. DATABASE CONNECTION');
    const MONGODB_URI = config.database.uri;
    
    log.info('Connecting to MongoDB...');
    log.data('URI', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Hide password
    
    await mongoose.connect(MONGODB_URI);
    log.success('Connected to MongoDB successfully');
    
    // Try to get Profile model (it might be registered by server.js)
    try {
      Profile = mongoose.model('Profile');
    } catch (err) {
      // Profile model not registered yet, we'll skip profile checks
      log.warning('Profile model not found - skipping profile checks');
    }
    
    const dbName = mongoose.connection.db.databaseName;
    log.data('Database Name', dbName);
    log.data('Connection State', mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected');

    // 2. Check Collections
    log.section('2. COLLECTIONS OVERVIEW');
    const collections = await mongoose.connection.db.listCollections().toArray();
    log.data('Total Collections', collections.length);
    
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      log.info(`  ${collection.name}: ${count} documents`);
    }

    // 3. Check User Accounts (Profile Users)
    log.section('3. USER ACCOUNTS (Profiles)');
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
    const pendingApproval = await User.countDocuments({ isAdminApproved: false });
    
    log.data('Total Users', totalUsers);
    log.data('Active Users', activeUsers);
    log.data('Email Verified', verifiedUsers);
    log.data('Pending Approval', pendingApproval);
    
    if (totalUsers > 0) {
      const recentUsers = await User.find()
        .select('email firstName lastName vtid profileType isActive isEmailVerified createdAt')
        .sort({ createdAt: -1 })
        .limit(5);
      
      log.info('\n  Recent Users:');
      for (const user of recentUsers) {
        const status = user.isActive ? '✓' : '✗';
        const verified = user.isEmailVerified ? '✓' : '✗';
        log.info(`    ${status} ${user.email} - ${user.firstName} ${user.lastName} (${user.vtid}) - Verified: ${verified}`);
      }
    }

    // 4. Check Employees
    log.section('4. EMPLOYEES (EmployeeHub)');
    const totalEmployees = await EmployeeHub.countDocuments();
    const activeEmployees = await EmployeeHub.countDocuments({ isActive: true });
    const admins = await EmployeeHub.countDocuments({ role: 'admin' });
    const regularEmployees = await EmployeeHub.countDocuments({ role: 'employee' });
    const terminated = await EmployeeHub.countDocuments({ status: 'Terminated' });
    
    log.data('Total Employees', totalEmployees);
    log.data('Active Employees', activeEmployees);
    log.data('Admins', admins);
    log.data('Regular Employees', regularEmployees);
    log.data('Terminated', terminated);
    
    if (totalEmployees > 0) {
      const recentEmployees = await EmployeeHub.find()
        .select('email firstName lastName role department jobTitle isActive status createdAt')
        .sort({ createdAt: -1 })
        .limit(5);
      
      log.info('\n  Recent Employees:');
      for (const emp of recentEmployees) {
        const status = emp.isActive ? '✓' : '✗';
        log.info(`    ${status} ${emp.email} - ${emp.firstName} ${emp.lastName} (${emp.role}) - ${emp.department}`);
      }
    }

    // 5. Check Profiles
    log.section('5. PROFILES');
    if (Profile) {
      const totalProfiles = await Profile.countDocuments();
      const activeProfiles = await Profile.countDocuments({ status: 'active' });
      
      log.data('Total Profiles', totalProfiles);
      log.data('Active Profiles', activeProfiles);
    } else {
      log.warning('Profile model not available - skipping profile checks');
      // Count documents directly from collection
      try {
        const profilesCollection = mongoose.connection.db.collection('profiles');
        const totalProfiles = await profilesCollection.countDocuments();
        log.data('Total Profiles (raw count)', totalProfiles);
      } catch (err) {
        log.info('  Could not access profiles collection');
      }
    }

    // 6. Check Certificates
    log.section('6. CERTIFICATES');
    const totalCertificates = await Certificate.countDocuments();
    const activeCertificates = await Certificate.countDocuments({ active: 'Yes' });
    
    log.data('Total Certificates', totalCertificates);
    log.data('Active Certificates', activeCertificates);
    
    // Check expiring certificates
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const expiringSoon = await Certificate.countDocuments({
      active: 'Yes',
      expiryDate: { 
        $exists: true, 
        $ne: null,
        $gte: today,
        $lte: thirtyDaysFromNow
      }
    });
    
    const expired = await Certificate.countDocuments({
      active: 'Yes',
      expiryDate: { 
        $exists: true, 
        $ne: null,
        $lt: today
      }
    });
    
    if (expiringSoon > 0) {
      log.warning(`${expiringSoon} certificates expiring within 30 days`);
    }
    if (expired > 0) {
      log.error(`${expired} certificates already expired`);
    }

    // 7. Check Notifications
    log.section('7. NOTIFICATIONS');
    const totalNotifications = await Notification.countDocuments();
    const unreadNotifications = await Notification.countDocuments({ read: false });
    
    log.data('Total Notifications', totalNotifications);
    log.data('Unread Notifications', unreadNotifications);

    // 8. Data Integrity Checks
    log.section('8. DATA INTEGRITY CHECKS');
    
    // Check for users without profiles
    const usersWithoutProfiles = await User.countDocuments({ 
      profileId: { $exists: false }
    });
    if (usersWithoutProfiles > 0) {
      log.warning(`${usersWithoutProfiles} users without linked profiles`);
    } else {
      log.success('All users have linked profiles');
    }
    
    // Check for duplicate emails in Users
    const userEmails = await User.aggregate([
      { $group: { _id: '$email', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    if (userEmails.length > 0) {
      log.error(`${userEmails.length} duplicate email(s) in Users collection`);
      for (const dup of userEmails) {
        log.info(`    ${dup._id} (${dup.count} occurrences)`);
      }
    } else {
      log.success('No duplicate emails in Users');
    }
    
    // Check for duplicate emails in Employees
    const employeeEmails = await EmployeeHub.aggregate([
      { $group: { _id: '$email', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    if (employeeEmails.length > 0) {
      log.error(`${employeeEmails.length} duplicate email(s) in Employees collection`);
      for (const dup of employeeEmails) {
        log.info(`    ${dup._id} (${dup.count} occurrences)`);
      }
    } else {
      log.success('No duplicate emails in Employees');
    }
    
    // Check for orphaned certificates
    if (Profile) {
      const orphanedCerts = await Certificate.countDocuments({
        profileId: { $exists: true, $ne: null },
        $expr: {
          $not: {
            $in: ['$profileId', await Profile.distinct('_id')]
          }
        }
      });
      if (orphanedCerts > 0) {
        log.warning(`${orphanedCerts} certificates with invalid profileId references`);
      } else {
        log.success('All certificates have valid profile references');
      }
    }

    // 9. Summary
    log.section('9. SUMMARY');
    log.success('Database connection: OK');
    log.success(`Collections: ${collections.length}`);
    log.success(`Total accounts: ${totalUsers + totalEmployees}`);
    log.success(`Active accounts: ${activeUsers + activeEmployees}`);
    
    if (expiringSoon > 0 || expired > 0) {
      log.warning('Some certificates need attention');
    }
    
    log.header();
    log.success('Database check completed successfully!');
    log.header();

  } catch (error) {
    log.error(`\nDatabase check failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log.info('\nDatabase connection closed');
  }
}

// Run the check
if (require.main === module) {
  checkDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = checkDatabase;
