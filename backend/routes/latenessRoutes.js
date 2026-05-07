const express = require('express');
const router = express.Router();
const latenessController = require('../controllers/latenessController');

/**
 * Lateness Management Routes
 * All routes require authentication
 */

// Get lateness records for an employee
router.get('/employee/:employeeId', latenessController.getEmployeeLateness);

// Get all lateness records (admin only)
router.get('/all', latenessController.getAllLateness);

// Create lateness record manually (admin only)
router.post('/create', latenessController.createLatenessRecord);

// Excuse a lateness record (admin only)
router.patch('/:id/excuse', latenessController.excuseLatenessRecord);

// Delete a lateness record (admin only)
router.delete('/:id', latenessController.deleteLatenessRecord);

module.exports = router;
