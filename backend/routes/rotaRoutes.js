const express = require('express');
const router = express.Router();
const rotaController = require('../controllers/rotaController');
const { validateShiftAssignment } = require('../middleware/shiftValidation');

// ── Shift Assignment Routes ───────────────────────────────────────────────────
router.post('/assign-shift',      validateShiftAssignment, rotaController.assignShiftToEmployee);
router.post('/assign-shift/team',                          rotaController.assignShiftToTeam);

router.get('/shift-assignments/all',                  rotaController.getAllShiftAssignments);
router.get('/shift-assignments/grouped',              rotaController.getGroupedShiftAssignments);
router.get('/shift-assignments/statistics',           rotaController.getShiftStatistics);
router.get('/shift-assignments/location/:location',   rotaController.getShiftsByLocation);
router.get('/shift-assignments/employee/:employeeId', rotaController.getEmployeeShifts);

router.put('/shift-assignments/:shiftId',             rotaController.updateShiftAssignment);
router.delete('/shift-assignments/:shiftId',          rotaController.deleteShiftAssignment);
router.delete('/shift-assignments/group/:groupId',    rotaController.deleteShiftAssignmentGroup);

router.post('/shift-assignments/:shiftId/swap-request', rotaController.requestShiftSwap);
router.post('/shift-assignments/:shiftId/swap-approve', rotaController.approveShiftSwap);

// ── Grouped/filtered rota views (read-only, served from ShiftAssignment) ─────
router.get('/all',    rotaController.getAllRotas);
router.get('/active', rotaController.getActiveRotas);
router.get('/old',    rotaController.getOldRotas);

module.exports = router;
