const express = require('express');
const router = express.Router();
const EmployeeHub = require('../models/EmployeesHub');
const crypto = require('crypto');

// Create test employee endpoint
router.post('/create-test-employee', async (req, res) => {
  try {
    const testPassword = 'test123';
    const employeeId = 'EMP9999';
    
    // Check if test employee already exists
    const existingEmployee = await EmployeeHub.findOne({ email: 'test@company.com' });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Test employee already exists'
      });
    }
    
    // Create test employee
    const testEmployee = new EmployeeHub({
      employeeId,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@company.com',
      password: testPassword, // Will be hashed by pre-save hook
      jobTitle: 'Test Employee',
      department: 'Testing',
      office: 'Test Office',
      role: 'employee',
      isActive: true,
      isEmailVerified: true
    });
    
    await testEmployee.save();
    
    res.status(201).json({
      success: true,
      message: 'Test employee created successfully',
      credentials: {
        email: 'test@company.com',
        password: testPassword
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
