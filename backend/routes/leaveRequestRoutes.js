const express = require('express');
const router = express.Router();
const leaveRequestController = require('../controllers/leaveRequestController');

/**
 * Leave Request Routes
 * Handles leave request submission, approval, and retrieval
 * Note: Authentication is handled by authenticateSession middleware in server.js
 * Role-based authorization is checked within controller functions
 */

// @route   POST /api/leave-requests
// @desc    Create a new leave request (employee)
// @access  Private (Employee)
router.post('/', leaveRequestController.createLeaveRequest);

// @route   GET /api/leave-requests/my-requests
// @desc    Get current user's leave requests
// @access  Private (Employee)
router.get('/my-requests', leaveRequestController.getMyLeaveRequests);

// @route   GET /api/leave-requests/pending
// @desc    Get pending leave requests for approval (admin/manager)
// @access  Private (Admin/Manager)
router.get('/pending', leaveRequestController.getPendingLeaveRequests);

// @route   GET /api/leave-requests/:id
// @desc    Get a specific leave request
// @access  Private
router.get('/:id', leaveRequestController.getLeaveRequestById);

// @route   PATCH /api/leave-requests/:id/approve
// @desc    Approve a leave request
// @access  Private (Admin/Manager)
router.patch('/:id/approve', leaveRequestController.approveLeaveRequest);

// @route   PATCH /api/leave-requests/:id/reject
// @desc    Reject a leave request
// @access  Private (Admin/Manager)
router.patch('/:id/reject', leaveRequestController.rejectLeaveRequest);

// @route   PATCH /api/leave-requests/:id
// @desc    Update a leave request (draft)
// @access  Private (Employee)
router.patch('/:id', leaveRequestController.updateLeaveRequest);

// @route   DELETE /api/leave-requests/:id
// @desc    Delete a leave request (draft only)
// @access  Private (Employee)
router.delete('/:id', leaveRequestController.deleteLeaveRequest);

// @route   GET /api/leave-requests/employee/:employeeId/upcoming
// @desc    Get upcoming approved leaves for an employee
// @access  Private
router.get('/employee/:employeeId/upcoming', leaveRequestController.getUpcomingLeaves);

module.exports = router;
