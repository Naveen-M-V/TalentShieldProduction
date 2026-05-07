const express = require('express');
const router = express.Router();
const goalsController = require('../controllers/goalsController');

/**
 * User goals endpoints
 */

// Get user's goals
router.get('/my', goalsController.getUserGoals);

// Get goals summary (admin only) - MUST be before /:id routes
router.get('/summary/all', goalsController.getGoalsSummary);

// Get pending approvals (manager only)
router.get('/pending-approvals', goalsController.getPendingApprovals);

// Create new goal
router.post('/', goalsController.createGoal);

// Batch create goals for single employee (admin only)
router.post('/batch-create', goalsController.batchCreateGoals);

// Update goal (user can update own unapproved goals)
router.put('/:id', goalsController.updateGoal);

// Delete goal (user can delete own unapproved goals)
router.delete('/:id', goalsController.deleteGoal);

/**
 * Performance Management Workflow Endpoints
 */

// Approve objective (manager only)
router.post('/:id/approve-objective', goalsController.approveObjective);

// Send back objective with feedback (manager only)
router.post('/:id/send-back', goalsController.sendBackObjective);

// Submit employee progress input
router.post('/:id/input', goalsController.submitEmployeeInput);

// Review employee input (manager only)
router.put('/:goalId/input/:inputId/review', goalsController.reviewEmployeeInput);

/**
 * Admin-only endpoints (legacy)
 */

// Approve goal (admin only)
router.post('/:id/approve', goalsController.approveGoal);

// Add comment to goal (admin only)
router.post('/:id/comment', goalsController.addCommentToGoal);

// Get goals for a specific employee (admin only) - MUST be before GET /
router.get('/employee/:employeeId', goalsController.getGoalsByEmployee);

// Get all goals (admin only) - MUST be last
router.get('/', goalsController.getAllGoals);

module.exports = router;
