const express = require('express');
const router = express.Router();
const sicknessController = require('../controllers/sicknessController');

/**
 * Sickness Management Routes
 * All routes require authentication
 */

// Create sickness record (employee self-report or admin for employee)
router.post('/create', sicknessController.createSicknessRecord);

// Get sickness records for an employee
router.get('/employee/:employeeId', sicknessController.getEmployeeSickness);

// Get all pending sickness requests (admin only)
router.get('/pending', sicknessController.getPendingSickness);

// Approve sickness record (admin only)
router.patch('/:id/approve', sicknessController.approveSickness);

// Reject sickness record (admin only)
router.patch('/:id/reject', sicknessController.rejectSickness);

// Delete sickness record (admin only)
router.delete('/:id', sicknessController.deleteSickness);

module.exports = router;
