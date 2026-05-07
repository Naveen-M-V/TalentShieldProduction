const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');

// Manager Dashboard
router.get('/dashboard', managerController.getManagerDashboard);

// Team Management
router.get('/team/members', managerController.getTeamMembers);
router.get('/team/summary', managerController.getTeamSummary);

// Approvals
router.get('/approvals/pending', managerController.getPendingApprovals);

// Reports
router.get('/reports/performance', managerController.getPerformanceReports);
router.get('/reports/attendance', managerController.getAttendanceReports);

module.exports = router;
