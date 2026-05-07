const express = require('express');
const router = express.Router();
const reportLibraryController = require('../controllers/reportLibraryController');
const { authenticateSession, requireRole } = require('../middleware/auth');
const { MANAGER_SCOPE_ROLES } = require('../utils/roles');

// Report generation endpoints require authentication and manager/admin role
const reportAuth = [authenticateSession, requireRole(MANAGER_SCOPE_ROLES)];

// Get all available report types (no auth required for UI to show available options)
router.get('/types', reportLibraryController.getReportTypes);

// Absence Report
router.post('/absence', reportAuth, reportLibraryController.generateAbsenceReport);

// Annual Leave Report
router.post('/annual-leave', reportAuth, reportLibraryController.generateAnnualLeaveReport);

// Lateness Report
router.post('/lateness', reportAuth, reportLibraryController.generateLatenessReport);

// Overtime Report
router.post('/overtime', reportAuth, reportLibraryController.generateOvertimeReport);

// Rota Report
router.post('/rota', reportAuth, reportLibraryController.generateRotaReport);

// Sickness Report
router.post('/sickness', reportAuth, reportLibraryController.generateSicknessReport);

// Employee Details Report
router.post('/employee-details', reportAuth, reportLibraryController.generateEmployeeDetailsReport);

// Payroll Exceptions Report
router.post('/payroll-exceptions', reportAuth, reportLibraryController.generatePayrollExceptionsReport);

// Expenses Report
router.post('/expenses', reportAuth, reportLibraryController.generateExpensesReport);

// Length of Service Report
router.post('/length-of-service', reportAuth, reportLibraryController.generateLengthOfServiceReport);

// Turnover & Retention Report
router.post('/turnover', reportAuth, reportLibraryController.generateTurnoverReport);

// Working Status Report
router.post('/working-status', reportAuth, reportLibraryController.generateWorkingStatusReport);

// Sensitive Information Report
router.post('/sensitive-info', reportAuth, reportLibraryController.generateSensitiveInfoReport);

// Furloughed Employees Report
router.post('/furloughed', reportAuth, reportLibraryController.generateFurloughedReport);

// Export routes (CSV/PDF) - POST to send report data
router.post('/export/csv', reportAuth, reportLibraryController.exportReportCSV);
router.post('/export/pdf', reportAuth, reportLibraryController.exportReportPDF);

module.exports = router;
