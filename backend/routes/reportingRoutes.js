const express = require('express');
const router = express.Router();
const reportingController = require('../controllers/reportingController');
const { authenticateSession, requireRole } = require('../middleware/auth');
const { MANAGER_SCOPE_ROLES } = require('../utils/roles');

// All reporting endpoints require authentication and manager/admin role
const reportAuth = [authenticateSession, requireRole(MANAGER_SCOPE_ROLES)];

// @route   GET /api/reports/leave-trends
// @desc    Get leave trends report with monthly breakdown and top leave takers
// @access  Private (Manager/Admin)
router.get('/leave-trends', reportAuth, reportingController.getLeaveTrendsReport);

// @route   GET /api/reports/shift-coverage
// @desc    Get shift coverage report with daily coverage and overtime stats
// @access  Private (Manager/Admin)
router.get('/shift-coverage', reportAuth, reportingController.getShiftCoverageReport);

// @route   GET /api/reports/attendance-summary
// @desc    Get attendance summary with punctuality metrics
// @access  Private (Manager/Admin)
router.get('/attendance-summary', reportAuth, reportingController.getAttendanceSummaryReport);

// @route   GET /api/reports/employee-productivity
// @desc    Get employee productivity metrics
// @access  Private (Manager/Admin)
router.get('/employee-productivity', reportAuth, reportingController.getEmployeeProductivity);

module.exports = router;
