const express = require('express');
const router = express.Router();
const overtimeController = require('../controllers/overtimeController');

// Employee Routes
router.post('/create', overtimeController.createOvertimeEntry);
router.post('/entry', overtimeController.createOvertimeEntry); // Backward compatibility
router.get('/employee/:employeeId', overtimeController.getEmployeeOvertime);

// Admin Routes
router.get('/pending', overtimeController.getAllPendingOvertime);
router.post('/approve/:overtimeId', overtimeController.approveOvertime);
router.put('/approve/:overtimeId', overtimeController.approveOvertime); // Backward compatibility
router.post('/reject/:overtimeId', overtimeController.rejectOvertime);
router.put('/reject/:overtimeId', overtimeController.rejectOvertime); // Backward compatibility

module.exports = router;
