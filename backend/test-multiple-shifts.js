#!/usr/bin/env node

/**
 * Test Script: Multiple Shifts Per Day
 * 
 * Tests the following sequence:
 * 1. Clock in → confirm status shows clocked-in
 * 2. Clock out → confirm status shows clocked-out and hours recorded
 * 3. Clock in again (same day) → confirm a new TimeEntry is created, status shows clocked-in
 * 4. Clock out again → confirm status shows clocked-out, total hours = sum of both shifts
 * 5. Attempt clock-in while already active → confirm 400 with correct message
 * 
 * Expected outcomes:
 * - Multiple TimeEntry documents for same employee/date (clocked-out entries don't block)
 * - All status values use hyphens (clocked-in, clocked-out, on-break)
 * - Hours are summed across all completed entries for the day
 */

const mongoose = require('mongoose');
const axios = require('axios');
const moment = require('moment-timezone');

const API_URL = 'http://localhost:5003/api';

// Models
const TimeEntry = require('./models/TimeEntry');
const EmployeesHub = require('./models/EmployeesHub');

let testEmployee = null;
let testResults = {
  totalDocuments: 0,
  allHyphenated: true,
  underscoreFound: [],
  summedHours: 0,
  testsPassed: 0,
  testsFailed: 0,
  messages: []
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

async function clockInEmployee() {
  try {
    const payload = {
      employeeId: testEmployee._id.toString(),
      location: 'Test Office',
      workType: 'Regular'
    };
    
    const response = await axios.post(`${API_URL}/clock/in`, payload);
    if (response.data.success) {
      log(`Clock-in successful. Entry ID: ${response.data.entry._id}`, 'success');
      testResults.testsPassed++;
      return response.data.entry;
    } else {
      log(`Clock-in failed: ${response.data.message}`, 'error');
      testResults.testsFailed++;
      return null;
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    const errorStatus = err.response?.status;
    const errorData = JSON.stringify(err.response?.data || {});
    log(`Clock-in error (${errorStatus}): ${errorMsg}`, 'error');
    if (errorData && errorData !== '{}') {
      log(`  Response data: ${errorData}`, 'error');
    }
    testResults.testsFailed++;
    return null;
  }
}

async function clockOutEmployee() {
  try {
    const payload = {
      employeeId: testEmployee._id.toString()
    };
    
    const response = await axios.post(`${API_URL}/clock/out`, payload);
    if (response.data.success) {
      const hoursWorked = response.data.data.hoursWorked || 0;
      log(`Clock-out successful. Hours worked: ${hoursWorked}`, 'success');
      testResults.testsPassed++;
      return { entry: response.data.data.timeEntry, hoursWorked };
    } else {
      log(`Clock-out failed: ${response.data.message}`, 'error');
      testResults.testsFailed++;
      return null;
    }
  } catch (err) {
    log(`Clock-out error: ${err.response?.data?.message || err.message}`, 'error');
    testResults.testsFailed++;
    return null;
  }
}

async function getEmployeeStatus() {
  try {
    const response = await axios.get(`${API_URL}/clock/status/${testEmployee._id}`);
    if (response.data.success) {
      const status = response.data.data.currentStatus;
      log(`Current status: ${status}`, 'test');
      return status;
    }
    return null;
  } catch (err) {
    log(`Get status error: ${err.message}`, 'error');
    return null;
  }
}

async function attemptClockInWhileActive() {
  try {
    const payload = {
      employeeId: testEmployee._id.toString(),
      location: 'Test Office'
    };
    
    const response = await axios.post(`${API_URL}/clock/in`, payload);
    // Should NOT succeed
    log(`ERROR: Clock-in while active should have been blocked!`, 'error');
    testResults.testsFailed++;
    return false;
  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.message;
    
    if (status === 400 && message && message.includes('currently clocked in')) {
      log(`Correctly blocked: ${message}`, 'success');
      testResults.testsPassed++;
      return true;
    } else {
      log(`Unexpected error response: ${status} - ${message}`, 'error');
      testResults.testsFailed++;
      return false;
    }
  }
}

async function verifyTimeEntries() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const entries = await TimeEntry.find({
      employee: testEmployee._id,
      date: today
    }).sort({ clockIn: 1 });
    
    log(`Found ${entries.length} TimeEntry documents for today`, 'test');
    testResults.totalDocuments = entries.length;
    
    if (entries.length < 2) {
      log('ERROR: Should have at least 2 entries (2 shifts)', 'error');
      testResults.testsFailed++;
    } else {
      testResults.testsPassed++;
    }
    
    // Check status values - should all be hyphenated
    let totalHours = 0;
    entries.forEach((entry, idx) => {
      const status = entry.status;
      const isHyphenated = ['clocked-in', 'clocked-out', 'on-break'].includes(status);
      const hasUnderscore = ['clocked_in', 'clocked_out', 'on_break'].includes(status);
      
      log(`Entry ${idx + 1}: status="${status}", clockIn=${entry.clockIn?.toISOString() || 'N/A'}, clockOut=${entry.clockOut?.toISOString() || 'N/A'}`, 'test');
      
      if (!isHyphenated) {
        testResults.allHyphenated = false;
        if (hasUnderscore) {
          testResults.underscoreFound.push(`Entry ${idx + 1}: ${status}`);
        }
      }
      
      // Sum hoursWorked for completed entries
      if (entry.clockOut && entry.hoursWorked) {
        const hours = parseFloat(entry.hoursWorked) || 0;
        totalHours += hours;
        log(`Entry ${idx + 1} hours: ${hours.toFixed(2)}`, 'test');
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
    
    log(`Total hours worked (sum of completed shifts): ${totalHours.toFixed(2)}`, 'test');
    return entries;
  } catch (err) {
    log(`Verify entries error: ${err.message}`, 'error');
    testResults.testsFailed++;
    return [];
  }
}

async function runTests() {
  log('Starting Multiple Shifts Per Day Test', 'test');
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
  
  // Test Sequence
  log('\n--- TEST 1: Initial Clock-In ---', 'test');
  const entry1 = await clockInEmployee();
  if (!entry1) process.exit(1);
  
  let status = await getEmployeeStatus();
  if (status !== 'clocked-in') {
    log(`Expected status 'clocked-in', got '${status}'`, 'error');
    testResults.testsFailed++;
  } else {
    testResults.testsPassed++;
  }
  
  // Add small delay before clock-out
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  log('\n--- TEST 2: First Clock-Out ---', 'test');
  const out1 = await clockOutEmployee();
  if (!out1) process.exit(1);
  
  status = await getEmployeeStatus();
  if (status !== 'clocked-out') {
    log(`Expected status 'clocked-out', got '${status}'`, 'error');
    testResults.testsFailed++;
  } else {
    testResults.testsPassed++;
  }
  
  // Add delay before second shift
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  log('\n--- TEST 3: Second Clock-In (Same Day) ---', 'test');
  const entry2 = await clockInEmployee();
  if (!entry2) process.exit(1);
  
  // Verify it's a different document
  if (entry1._id.toString() === entry2._id.toString()) {
    log(`ERROR: Should have created a NEW TimeEntry document, got same one!`, 'error');
    testResults.testsFailed++;
  } else {
    log(`✓ New TimeEntry document created (ID: ${entry2._id})`, 'success');
    testResults.testsPassed++;
  }
  
  status = await getEmployeeStatus();
  if (status !== 'clocked-in') {
    log(`Expected status 'clocked-in', got '${status}'`, 'error');
    testResults.testsFailed++;
  } else {
    testResults.testsPassed++;
  }
  
  // Add delay before second clock-out
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  log('\n--- TEST 4: Second Clock-Out ---', 'test');
  const out2 = await clockOutEmployee();
  if (!out2) process.exit(1);
  
  status = await getEmployeeStatus();
  if (status !== 'clocked-out') {
    log(`Expected status 'clocked-out', got '${status}'`, 'error');
    testResults.testsFailed++;
  } else {
    testResults.testsPassed++;
  }
  
  log('\n--- TEST 5: Attempt Clock-In While Already Active ---', 'test');
  // First, clock in for the third time
  await clockInEmployee();
  const blockResult = await attemptClockInWhileActive();
  if (!blockResult) process.exit(1);
  
  // Clock out to clean up
  await clockOutEmployee();
  
  log('\n--- FINAL VERIFICATION ---', 'test');
  const entries = await verifyTimeEntries();
  
  // Summary
  log('\n' + '='.repeat(60), 'result');
  log('TEST RESULTS SUMMARY', 'result');
  log('='.repeat(60), 'result');
  log(`Total TimeEntry documents: ${testResults.totalDocuments}`, 'result');
  log(`All status values hyphenated: ${testResults.allHyphenated ? 'YES ✓' : 'NO ✗'}`, 'result');
  log(`Total hours worked (summed): ${testResults.summedHours.toFixed(2)}`, 'result');
  log(`Tests passed: ${testResults.testsPassed}`, 'result');
  log(`Tests failed: ${testResults.testsFailed}`, 'result');
  
  if (testResults.underscoreFound.length > 0) {
    log(`Underscore values found: ${testResults.underscoreFound.join(', ')}`, 'error');
  }
  
  log('='.repeat(60), 'result');
  
  const success = testResults.testsFailed === 0 && testResults.allHyphenated;
  if (success) {
    log('ALL TESTS PASSED ✓', 'success');
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
