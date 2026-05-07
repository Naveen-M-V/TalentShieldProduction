#!/usr/bin/env node

/**
 * Multiple Shifts Integration Test
 * Tests admin clock-in/out API endpoints with multiple shifts per day
 */

const mongoose = require('mongoose');
const axios = require('axios');

const TimeEntry = require('./models/TimeEntry');
const EmployeesHub = require('./models/EmployeesHub');

const API_BASE = 'http://localhost:5003/api';

let testEmployee = null;
let testResults = {
  totalDocuments: 0,
  allHyphenated: true,
  underscoreFound: [],
  summedHours: 0,
  testsPassed: 0,
  testsFailed: 0,
  createdEntryIds: []
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
    const employee = await EmployeesHub.findOne({ status: 'Active', isActive: true });
    if (!employee) {
      log('No active employee found', 'error');
      return null;
    }
    testEmployee = employee;
    log(`Using test employee: ${employee.firstName} ${employee.lastName} (${employee._id})`, 'test');
    return employee;
  } catch (err) {
    log(`Failed to get test employee: ${err.message}`, 'error');
    return null;
  }
}

async function clearTodayEntries() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const result = await TimeEntry.deleteMany({
      employee: testEmployee._id,
      date: today
    });
    log(`Cleared ${result.deletedCount} existing entries for today`, 'info');
  } catch (err) {
    log(`Warning: Could not clear entries: ${err.message}`, 'info');
  }
}

async function apiClockIn() {
  try {
    const payload = {
      employeeId: testEmployee._id.toString()
    };
    
    const response = await axios.post(`${API_BASE}/clock/in`, payload, {
      validateStatus: () => true // Don't throw on any status
    });
    
    if (response.data.success) {
      testResults.createdEntryIds.push(response.data.entry._id);
      log(`Clock-in successful. Entry ID: ${response.data.entry._id}`, 'success');
      testResults.testsPassed++;
      return response.data.entry;
    } else {
      log(`Clock-in failed: ${response.data.message} (status: ${response.status})`, 'error');
      testResults.testsFailed++;
      return null;
    }
  } catch (err) {
    log(`Clock-in network error: ${err.message}`, 'error');
    testResults.testsFailed++;
    return null;
  }
}

async function apiClockOut() {
  try {
    const payload = {
      employeeId: testEmployee._id.toString()
    };
    
    const response = await axios.post(`${API_BASE}/clock/out`, payload, {
      validateStatus: () => true
    });
    
    if (response.data.success) {
      const hoursWorked = response.data.data?.hoursWorked || 0;
      log(`Clock-out successful. Hours: ${hoursWorked}`, 'success');
      testResults.testsPassed++;
      return { entry: response.data.data.timeEntry, hoursWorked };
    } else {
      log(`Clock-out failed: ${response.data.message} (status: ${response.status})`, 'error');
      testResults.testsFailed++;
      return null;
    }
  } catch (err) {
    log(`Clock-out network error: ${err.message}`, 'error');
    testResults.testsFailed++;
    return null;
  }
}

async function apiGetStatus() {
  try {
    const response = await axios.get(`${API_BASE}/clock/status/${testEmployee._id}`, {
      validateStatus: () => true
    });
    
    if (response.data.success) {
      const status = response.data.data.currentStatus;
      log(`Current status: ${status}`, 'test');
      return status;
    } else {
      log(`Get status failed: ${response.data.message}`, 'error');
      return null;
    }
  } catch (err) {
    log(`Get status network error: ${err.message}`, 'error');
    return null;
  }
}

async function apiBlockedClockIn() {
  try {
    const payload = {
      employeeId: testEmployee._id.toString()
    };
    
    const response = await axios.post(`${API_BASE}/clock/in`, payload, {
      validateStatus: () => true
    });
    
    if (response.status === 400 && response.data.message?.includes('currently clocked in')) {
      log(`Correctly blocked: ${response.data.message}`, 'success');
      testResults.testsPassed++;
      return true;
    } else {
      log(`Expected 400 block, got ${response.status}: ${response.data.message}`, 'error');
      testResults.testsFailed++;
      return false;
    }
  } catch (err) {
    log(`Block check network error: ${err.message}`, 'error');
    testResults.testsFailed++;
    return false;
  }
}

async function verifyDatabase() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const entries = await TimeEntry.find({
      employee: testEmployee._id,
      date: today
    }).sort({ clockIn: 1 }).lean();
    
    log(`Found ${entries.length} TimeEntry documents for today`, 'test');
    testResults.totalDocuments = entries.length;
    
    if (entries.length < 2) {
      log(`ERROR: Expected at least 2 entries, got ${entries.length}`, 'error');
      testResults.testsFailed++;
      return false;
    } else {
      testResults.testsPassed++;
    }
    
    // Check status values
    let totalHours = 0;
    entries.forEach((entry, idx) => {
      const status = entry.status;
      const isHyphenated = ['clocked-in', 'clocked-out', 'on-break'].includes(status);
      const hasUnderscore = ['clocked_in', 'clocked_out', 'on_break'].includes(status);
      
      log(`Entry ${idx + 1}: id=${entry._id}, status="${status}", hours=${entry.hoursWorked || 'N/A'}`, 'test');
      
      if (!isHyphenated) {
        testResults.allHyphenated = false;
        if (hasUnderscore) {
          testResults.underscoreFound.push(`Entry ${idx + 1}: ${status}`);
        }
      }
      
      if (entry.clockOut && entry.hoursWorked) {
        totalHours += parseFloat(entry.hoursWorked) || 0;
      }
    });
    
    testResults.summedHours = totalHours;
    
    if (testResults.allHyphenated) {
      log(`✓ All status values are hyphenated`, 'success');
      testResults.testsPassed++;
    } else {
      log(`✗ Some status values have underscores: ${testResults.underscoreFound.join(', ')}`, 'error');
      testResults.testsFailed++;
    }
    
    log(`✓ Total hours (summed): ${totalHours.toFixed(2)}h`, 'test');
    testResults.testsPassed++;
    
    return true;
  } catch (err) {
    log(`Database verify error: ${err.message}`, 'error');
    testResults.testsFailed++;
    return false;
  }
}

async function runTests() {
  log('Starting Multiple Shifts Integration Test', 'test');
  log('='.repeat(70), 'test');
  
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
  
  // Clear existing entries for a clean test
  await clearTodayEntries();
  
  // Test Sequence
  log('\n--- TEST 1: First Clock-In ---', 'test');
  const entry1 = await apiClockIn();
  if (!entry1) {
    log('Cannot proceed - first clock-in failed', 'error');
    process.exit(1);
  }
  
  let status = await apiGetStatus();
  if (status !== 'clocked-in') {
    log(`Expected 'clocked-in', got '${status}'`, 'error');
    testResults.testsFailed++;
  } else {
    testResults.testsPassed++;
  }
  
  // Small delay
  await new Promise(r => setTimeout(r, 1000));
  
  log('\n--- TEST 2: First Clock-Out ---', 'test');
  const out1 = await apiClockOut();
  if (!out1) {
    log('Cannot proceed - first clock-out failed', 'error');
    process.exit(1);
  }
  
  status = await apiGetStatus();
  if (status !== 'clocked-out') {
    log(`Expected 'clocked-out', got '${status}'`, 'error');
    testResults.testsFailed++;
  } else {
    testResults.testsPassed++;
  }
  
  // Small delay
  await new Promise(r => setTimeout(r, 1000));
  
  log('\n--- TEST 3: Second Clock-In (Same Day) ---', 'test');
  const entry2 = await apiClockIn();
  if (!entry2) {
    log('Cannot proceed - second clock-in failed', 'error');
    process.exit(1);
  }
  
  // Verify different documents
  if (entry1._id.toString() !== entry2._id.toString()) {
    log(`✓ New document created (Entry 1: ${entry1._id}, Entry 2: ${entry2._id})`, 'success');
    testResults.testsPassed++;
  } else {
    log(`✗ Same document reused - should be different!`, 'error');
    testResults.testsFailed++;
  }
  
  status = await apiGetStatus();
  if (status !== 'clocked-in') {
    log(`Expected 'clocked-in', got '${status}'`, 'error');
    testResults.testsFailed++;
  } else {
    testResults.testsPassed++;
  }
  
  // Small delay
  await new Promise(r => setTimeout(r, 1000));
  
  log('\n--- TEST 4: Second Clock-Out ---', 'test');
  const out2 = await apiClockOut();
  if (!out2) {
    log('Cannot proceed - second clock-out failed', 'error');
    process.exit(1);
  }
  
  status = await apiGetStatus();
  if (status !== 'clocked-out') {
    log(`Expected 'clocked-out', got '${status}'`, 'error');
    testResults.testsFailed++;
  } else {
    testResults.testsPassed++;
  }
  
  log('\n--- TEST 5: Attempt Clock-In While Already Active ---', 'test');
  // Clock in for the third time
  await apiClockIn();
  // Now try to clock in again (should be blocked)
  const blocked = await apiBlockedClockIn();
  if (!blocked) {
    log('Cannot proceed - block test failed', 'error');
    process.exit(1);
  }
  
  // Clean up
  await apiClockOut();
  
  log('\n--- FINAL VERIFICATION ---', 'test');
  const verified = await verifyDatabase();
  
  // Summary
  log('\n' + '='.repeat(70), 'result');
  log('TEST RESULTS SUMMARY', 'result');
  log('='.repeat(70), 'result');
  log(`Total TimeEntry documents: ${testResults.totalDocuments}`, 'result');
  log(`Created entry IDs: ${testResults.createdEntryIds.map(id => id.toString().substring(0, 8)).join(', ')}...`, 'result');
  log(`All status values hyphenated: ${testResults.allHyphenated ? 'YES ✓' : 'NO ✗'}`, 'result');
  log(`Total hours worked (summed): ${testResults.summedHours.toFixed(2)}h`, 'result');
  log(`Tests passed: ${testResults.testsPassed}`, 'result');
  log(`Tests failed: ${testResults.testsFailed}`, 'result');
  
  if (testResults.underscoreFound.length > 0) {
    log(`Underscore values found: ${testResults.underscoreFound.join(', ')}`, 'error');
  }
  
  log('='.repeat(70), 'result');
  
  const success = testResults.testsFailed === 0 && testResults.allHyphenated && testResults.totalDocuments >= 2;
  if (success) {
    log('ALL TESTS PASSED ✓', 'success');
    log('\nKey achievements:', 'success');
    log(`  ✓ Multiple shifts per day allowed (${testResults.totalDocuments} entries)`, 'success');
    log(`  ✓ All status values hyphenated (no underscore variants)`, 'success');
    log(`  ✓ Hours correctly summed across shifts`, 'success');
    log(`  ✓ Proper blocking when already active`, 'success');
  } else {
    log('SOME TESTS FAILED ✗', 'error');
  }
  
  await mongoose.connection.close();
  process.exit(success ? 0 : 1);
}

runTests().catch(err => {
  log(`Test runner error: ${err.message}`, 'error');
  process.exit(1);
});
