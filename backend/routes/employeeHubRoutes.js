const express = require('express');
const router = express.Router();
const employeeHubController = require('../controllers/employeeHubController');

// Employee CRUD operations
// NOTE: Specific routes MUST come before parameterized routes to avoid conflicts
router.get('/by-user-id/:userId', employeeHubController.getEmployeeByUserId);
router.get('/by-email/:email', employeeHubController.getEmployeeByEmail);
router.get('/', employeeHubController.getAllEmployees);
router.get('/with-clock-status', employeeHubController.getEmployeesWithClockStatus);
router.get('/unregistered-brighthr', employeeHubController.getUnregisteredBrightHR);
router.get('/without-team', employeeHubController.getEmployeesWithoutTeam);
router.get('/archived', employeeHubController.getArchivedEmployees);
router.get('/team/:teamName', employeeHubController.getEmployeesByTeam);

// Organizational Chart routes
router.get('/org-chart', employeeHubController.getOrganizationalChart);
router.post('/org-chart/save', employeeHubController.saveOrganizationalChart);
router.get('/direct-reports/:managerId', employeeHubController.getDirectReports);
router.patch('/:employeeId/manager', employeeHubController.updateEmployeeManager);

// POST, PUT, DELETE before GET /:id to ensure they're matched first
router.post('/', employeeHubController.createEmployee);
router.put('/:id', employeeHubController.updateEmployee);
router.patch('/:id/terminate', employeeHubController.terminateEmployee);
router.patch('/:id/rehire', employeeHubController.rehireEmployee);
router.delete('/archived/bulk', employeeHubController.bulkDeleteArchivedEmployees);
router.delete('/bulk', employeeHubController.bulkDeleteEmployees);
router.delete('/:id', employeeHubController.deleteEmployee);
// GET /:id should be LAST to avoid matching specific routes
router.get('/:id', employeeHubController.getEmployeeById);

module.exports = router;
