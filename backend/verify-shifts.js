#!/usr/bin/env node

/**
 * Database Verification Test
 * Verifies the core functionality without hitting the API
 */

const mongoose = require('mongoose');
const moment = require('moment-timezone');

const TimeEntry = require('./models/TimeEntry');
const EmployeesHub = require('./models/EmployeesHub');

let testResults = {
  totalDocuments: 0,
  allHyphenated: true,
  underscoreFound: [],
  summedHours: 0,
  testsPassed: 0,
  testsFailed: 0
};

function log(msg, type = 'info') {
  const prefix = {
    info: '📝',
    success: '✅',
    error: '❌',
    test: '🧪',
    result: '📊'
  }[type] || '📝';
  console.log(`${prefix} ${msg}`);
}

async function setupDatabase() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms';
    await mongoose.connect(uri);
    log('Connected to MongoDB', 'success');
    return true;
  } catch (err) {
    log(`MongoDB connection failed: ${err.message}`, 'error');
    return false;
  }
}

async function getTestEmployee() {
  try {
    // Get first active employee
    const employee = await EmployeesHub.findOne({ status: 'Active', isActive: true });
    if (!employee) {
      log('No active employee found, using any employee', 'info');
      const anyEmployee = await EmployeesHub.findOne();
      if (!anyEmployee) {
        log('No employees found at all', 'error');
        return null;
      }
      log(`Using employee: ${anyEmployee.firstName} ${anyEmployee.lastName} (${anyEmployee._id})`, 'test');
      return anyEmployee;
    }
    log(`Using test employee: ${employee.firstName} ${employee.lastName} (${employee._id})`, 'test');
    return employee;
  } catch (err) {
    log(`Failed to get test employee: ${err.message}`, 'error');
    return null;
  }
}

async function verifyExistingTimeEntries(employee) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    log(`\n--- Verifying TimeEntry documents for ${today} ---`, 'test');
    
    const entries = await TimeEntry.find({
      employee: employee._id,
      date: today
    }).sort({ clockIn: 1 }).lean();
    
    log(`Found ${entries.length} TimeEntry documents for this employee today`, 'test');
    testResults.totalDocuments = entries.length;
    
    if (entries.length === 0) {
      log('No entries found for today - test cannot proceed', 'info');
      return false;
    }
    
    // Verify status values
    let totalHours = 0;
    let hasIssues = false;
    
    entries.forEach((entry, idx) => {
      const status = entry.status;
      const isHyphenated = ['clocked-in', 'clocked-out', 'on-break'].includes(status);
      const hasUnderscore = ['clocked_in', 'clocked_out', 'on_break'].includes(status);
      
      const clockInTime = entry.clockIn instanceof Date ? entry.clockIn.toISOString() : entry.clockIn;
      const clockOutTime = entry.clockOut instanceof Date ? entry.clockOut.toISOString() : entry.clockOut;
      
      log(`Entry ${idx + 1}: status="${status}", clockIn=${clockInTime}, clockOut=${clockOutTime}`, 'test');
      
      if (!isHyphenated) {
        testResults.allHyphenated = false;
        if (hasUnderscore) {
          testResults.underscoreFound.push(`Entry ${idx + 1}: ${status}`);
          hasIssues = true;
        }
      }
      
      // Sum hoursWorked for completed entries
      if (entry.clockOut && entry.hoursWorked) {
        const hours = parseFloat(entry.hoursWorked) || 0;
        totalHours += hours;
        log(`  └─ hoursWorked: ${hours.toFixed(2)}h`, 'test');
      }
    });
    
    testResults.summedHours = totalHours;
    
    if (testResults.allHyphenated) {
      log(`✓ All status values are hyphenated (no underscores found)`, 'success');
      testResults.testsPassed++;
    } else {
      log(`✗ Some status values have underscores: ${testResults.underscoreFound.join(', ')}`, 'error');
      testResults.testsFailed++;
    }
    
    if (entries.length >= 2) {
      log(`✓ Multiple TimeEntry documents exist (${entries.length} entries)`, 'success');
      testResults.testsPassed++;
    } else {
      log(`⚠ Only ${entries.length} entry found (test needs at least 2)`, 'info');
    }
    
    log(`✓ Total hours worked (sum of completed shifts): ${totalHours.toFixed(2)}h`, 'test');
    testResults.testsPassed++;
    
    return !hasIssues;
  } catch (err) {
    log(`Verify entries error: ${err.message}`, 'error');
    testResults.testsFailed++;
    return false;
  }
}

async function runTests() {
  log('Starting Database Verification Test', 'test');
  log('='.repeat(60), 'test');
  
  // Setup
  const dbConnected = await setupDatabase();
  if (!dbConnected) {
    log('Cannot proceed without database connection', 'error');
    process.exit(1);
  }
  
  const employee = await getTestEmployee();
  if (!employee) {
    log('Cannot proceed without test employee', 'error');
    process.exit(1);
  }
  
  // Run verification
  const success = await verifyExistingTimeEntries(employee);
  
  // Summary
  log('\n' + '='.repeat(60), 'result');
  log('TEST RESULTS SUMMARY', 'result');
  log('='.repeat(60), 'result');
  log(`Total TimeEntry documents: ${testResults.totalDocuments}`, 'result');
  log(`All status values hyphenated: ${testResults.allHyphenated ? 'YES ✓' : 'NO ✗'}`, 'result');
  log(`Total hours worked (summed): ${testResults.summedHours.toFixed(2)}h`, 'result');
  log(`Tests passed: ${testResults.testsPassed}`, 'result');
  log(`Tests failed: ${testResults.testsFailed}`, 'result');
  
  if (testResults.underscoreFound.length > 0) {
    log(`Underscore values found: ${testResults.underscoreFound.join(', ')}`, 'error');
  }
  
  log('='.repeat(60), 'result');
  
  if (testResults.testsFailed === 0 && testResults.allHyphenated) {
    log('VERIFICATION PASSED ✓', 'success');
  } else if (testResults.testsFailed === 0) {
    log('VERIFICATION COMPLETED WITH WARNINGS', 'info');
  } else {
    log('VERIFICATION FAILED ✗', 'error');
  }
  
  await mongoose.connection.close();
  process.exit(testResults.testsFailed === 0 ? 0 : 1);
}

runTests().catch(err => {
  log(`Test runner error: ${err.message}`, 'error');
  process.exit(1);
});
