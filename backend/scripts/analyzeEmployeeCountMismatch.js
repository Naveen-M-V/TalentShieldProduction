#!/usr/bin/env node

/**
 * Employee Count Mismatch Analysis Script
 * 
 * This script investigates the mismatch between Total Employees shown on:
 * - Home page summary metrics endpoint
 * - Employee Hub page (via /employees endpoint)
 * 
 * It checks:
 * 1. Source of truth for each count
 * 2. Schema relationships and data integrity
 * 3. Filtering logic differences
 * 4. Orphan records
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment configuration
const envConfig = require('../config/environment');
const config = envConfig.getConfig();

// Load models
const User = require('../models/User');
const EmployeeHub = require('../models/EmployeesHub');

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
  header: () => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.blue}### ${msg}${colors.reset}`),
  subsection: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`  ${msg}`),
  data: (label, value) => console.log(`  ${colors.cyan}${label}:${colors.reset} ${value}`),
  highlight: (msg) => console.log(`\n${colors.bright}${colors.yellow}>>> ${msg}${colors.reset}\n`)
};

async function analyzeEmployeeCounts() {
  try {
    log.header();
    console.log(`${colors.bright}${colors.cyan}EMPLOYEE COUNT MISMATCH ANALYSIS${colors.reset}`);
    log.header();

    // Connect to database
    log.section('1. DATABASE CONNECTION');
    await mongoose.connect(config.database.uri);
    log.success('Connected to database');
    log.data('Database', mongoose.connection.name);

    // ========================================================================
    // PART 1: RAW COLLECTION COUNTS
    // ========================================================================
    log.section('2. RAW COLLECTION COUNTS');
    
    const totalUsersCount = await User.countDocuments();
    const totalEmployeesHubCount = await EmployeeHub.countDocuments();
    
    log.data('Total documents in User collection', totalUsersCount);
    log.data('Total documents in EmployeesHub collection', totalEmployeesHubCount);

    // ========================================================================
    // PART 2: HOME PAGE COUNT
    // ========================================================================
    log.section('3. HOME PAGE COUNT');
    log.subsection('Query Logic:');
    log.info('Collection: EmployeesHub');
    log.info('Filter: { isActive: true, status: { $ne: "Terminated" } }');
    
    const homepageQuery = { isActive: true, status: { $ne: 'Terminated' } };
    const homepageCount = await EmployeeHub.countDocuments(homepageQuery);
    const homepageEmployees = await EmployeeHub.find(homepageQuery)
      .select('firstName lastName email role status isActive')
      .lean();
    
    log.data('HOME PAGE Employee Count', homepageCount);
    
    // Breakdown by role
    const homepageRoleBreakdown = {};
    homepageEmployees.forEach(emp => {
      const role = emp.role || 'undefined';
      homepageRoleBreakdown[role] = (homepageRoleBreakdown[role] || 0) + 1;
    });
    
    log.subsection('Breakdown by Role:');
    Object.entries(homepageRoleBreakdown).forEach(([role, count]) => {
      log.data(`  ${role}`, count);
    });

    // ========================================================================
    // PART 3: EMPLOYEE HUB COUNT
    // ========================================================================
    log.section('4. EMPLOYEE HUB COUNT - /employees?includeAdmins=true');
    log.subsection('Query Logic (Step 1 - EmployeesHub):');
    log.info('Collection: EmployeesHub');
    log.info('Filter: { isActive: true, status: { $ne: "Terminated" } }');
    
    const employeeHubQuery = { isActive: true, status: { $ne: 'Terminated' } };
    const employeeHubInitialCount = await EmployeeHub.countDocuments(employeeHubQuery);
    const employeeHubEmployees = await EmployeeHub.find(employeeHubQuery)
      .select('firstName lastName email role status isActive')
      .lean();
    
    log.data('Initial EmployeesHub Count', employeeHubInitialCount);
    
    // Step 2: Filter out profile users
    log.subsection('Step 2 - Filter out Profile Users:');
    log.info('Gets all users with role="profile" from User collection');
    log.info('Removes matching emails from EmployeesHub results');
    
    const profileUsers = await User.find({ role: 'profile' }).select('email').lean();
    const profileEmails = profileUsers.map(u => u.email.toLowerCase());
    
    log.data('Profile users found', profileUsers.length);
    
    const filteredEmployees = employeeHubEmployees.filter(emp => 
      !profileEmails.includes(emp.email.toLowerCase())
    );
    
    log.data('After filtering profiles', filteredEmployees.length);
    
    // Step 3: Add admins if includeAdmins=true
    log.subsection('Step 3 - Add Admin Users:');
    log.info('Gets users with role in [admin, super-admin] from User collection');
    log.info('Excludes admins already in EmployeesHub');
    
    const existingEmails = new Set(
      filteredEmployees
        .map(e => e.email)
        .filter(Boolean)
        .map(e => e.toLowerCase())
    );
    
    const adminUsers = await User.find({
      role: { $in: ['admin', 'super-admin'] },
      isActive: { $ne: false },
      deleted: { $ne: true }
    })
      .select('firstName lastName email role')
      .lean();
    
    const uniqueAdmins = adminUsers.filter(u => 
      u.email && !existingEmails.has(u.email.toLowerCase())
    );
    
    log.data('Admin users found', adminUsers.length);
    log.data('Unique admins to add', uniqueAdmins.length);
    
    const finalEmployeeHubCount = filteredEmployees.length + uniqueAdmins.length;
    
    log.data('EMPLOYEE HUB Final Count', finalEmployeeHubCount);

    // ========================================================================
    // PART 4: COMPARISON & MISMATCH ANALYSIS
    // ========================================================================
    log.section('5. MISMATCH ANALYSIS');
    
    const difference = Math.abs(homepageCount - finalEmployeeHubCount);
    
    log.highlight(`HOME PAGE COUNT: ${homepageCount}`);
    log.highlight(`EMPLOYEE HUB COUNT: ${finalEmployeeHubCount}`);
    log.highlight(`DIFFERENCE: ${difference}`);
    
    if (difference === 0) {
      log.success('NO MISMATCH - Counts are identical!');
    } else {
      log.error(`MISMATCH DETECTED - Difference of ${difference} employees`);
      
      log.subsection('Root Causes:');
      
      // Cause 1: Profile user filtering
      const profilesInHomepage = homepageEmployees.filter(emp =>
        profileEmails.includes(emp.email.toLowerCase())
      );
      
      if (profilesInHomepage.length > 0) {
        log.warning(`Profile users included in Homepage: ${profilesInHomepage.length}`);
        log.info('Employee Hub filters these out');
        profilesInHomepage.forEach(emp => {
          log.info(`  - ${emp.firstName} ${emp.lastName} (${emp.email})`);
        });
      }
      
      // Cause 2: Admin users
      if (uniqueAdmins.length > 0) {
        log.warning(`Admin users added in Employee Hub: ${uniqueAdmins.length}`);
        log.info('Homepage does NOT include these admins');
        uniqueAdmins.forEach(admin => {
          log.info(`  - ${admin.firstName} ${admin.lastName} (${admin.email}) [${admin.role}]`);
        });
      }
      
      // Cause 3: Duplicate records
      const emailCounts = {};
      homepageEmployees.forEach(emp => {
        const email = emp.email.toLowerCase();
        emailCounts[email] = (emailCounts[email] || 0) + 1;
      });
      
      const duplicates = Object.entries(emailCounts).filter(([email, count]) => count > 1);
      if (duplicates.length > 0) {
        log.error(`Duplicate emails found in EmployeesHub: ${duplicates.length}`);
        duplicates.forEach(([email, count]) => {
          log.info(`  - ${email} (appears ${count} times)`);
        });
      }
    }

    // ========================================================================
    // PART 5: DATA INTEGRITY CHECKS
    // ========================================================================
    log.section('6. DATA INTEGRITY CHECKS');
    
    // Check for orphan EmployeeHub records (no User account)
    log.subsection('Orphan EmployeesHub Records:');
    const employeesWithUserId = await EmployeeHub.find({
      userId: { $exists: true, $ne: null }
    }).select('email userId').lean();
    
    log.data('EmployeesHub with userId link', employeesWithUserId.length);
    
    let orphanedEmployees = 0;
    for (const emp of employeesWithUserId) {
      const userExists = await User.exists({ _id: emp.userId });
      if (!userExists) {
        orphanedEmployees++;
        log.warning(`Orphan: ${emp.email} - userId ${emp.userId} does not exist in User collection`);
      }
    }
    
    if (orphanedEmployees === 0) {
      log.success('No orphaned EmployeesHub records');
    } else {
      log.error(`Found ${orphanedEmployees} orphaned EmployeesHub records`);
    }
    
    // Check for User accounts without EmployeeHub records
    log.subsection('User Accounts without EmployeesHub Records:');
    const allUsers = await User.find({ role: { $ne: 'profile' } })
      .select('email role')
      .lean();
    
    const employeeEmails = new Set(
      (await EmployeeHub.find().select('email').lean())
        .map(e => e.email.toLowerCase())
    );
    
    const usersWithoutEmployee = allUsers.filter(user =>
      !employeeEmails.has(user.email.toLowerCase())
    );
    
    if (usersWithoutEmployee.length > 0) {
      log.warning(`Users without EmployeeHub record: ${usersWithoutEmployee.length}`);
      usersWithoutEmployee.forEach(user => {
        log.info(`  - ${user.email} [${user.role}]`);
      });
    } else {
      log.success('All non-profile users have EmployeeHub records');
    }

    // ========================================================================
    // PART 6: RECOMMENDATIONS
    // ========================================================================
    log.section('7. RECOMMENDATIONS');
    
    log.subsection('Single Source of Truth:');
    log.info('✓ Use EmployeesHub collection as primary source');
    log.info('✓ Apply IDENTICAL filters on both endpoints:');
    log.info('  { isActive: true, status: { $ne: "Terminated" } }');
    
    log.subsection('Consistent Handling:');
    log.info('✓ Decide on profile user inclusion (currently excluded in Hub)');
    log.info('✓ Decide on admin user inclusion (currently added in Hub with includeAdmins=true)');
    log.info('✓ Both endpoints should use the same logic');
    
    log.subsection('Data Integrity:');
    log.info('✓ Remove duplicate email entries in EmployeesHub');
    log.info('✓ Clean up orphaned userId references');
    log.info('✓ Consider using userId as primary link instead of email');
    
    log.subsection('Endpoint Unification:');
    log.info('✓ Both endpoints should call the same service/controller method');
    log.info('✓ Centralize filtering logic in one place');

    log.header();
    log.success('Analysis Complete');
    log.header();

  } catch (error) {
    log.error(`Analysis failed: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    log.info('Database connection closed');
  }
}

// Run the analysis
analyzeEmployeeCounts().catch(console.error);
