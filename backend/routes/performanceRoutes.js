const express = require('express');
const router = express.Router();
const  performanceController = require('../controllers/performanceController');
const goalsController = require('../controllers/goalsController');

// Goal routes - Specific routes MUST come before parameterized routes
router.get('/goals/my-goals', goalsController.getUserGoals); // legacy alias
router.get('/goals/my', goalsController.getUserGoals);       // new canonical path
router.get('/goals/summary/all', goalsController.getGoalsSummary);
router.get('/goals/pending-approvals', goalsController.getPendingApprovals);
router.get('/goals', goalsController.getAllGoals);
router.post('/goals', goalsController.createGoal);
router.get('/goals/employee/:employeeId', goalsController.getGoalsByEmployee);
router.get('/goals/:id', goalsController.getGoalById);
router.put('/goals/:id', goalsController.updateGoal);
router.delete('/goals/:id', goalsController.deleteGoal);
router.post('/goals/:id/approve', goalsController.approveGoal);
router.post('/goals/:id/approve-objective', goalsController.approveObjective);
router.post('/goals/:id/send-back', goalsController.sendBackObjective);
router.post('/goals/:id/input', goalsController.submitEmployeeInput);
router.post('/goals/:id/comment', goalsController.addCommentToGoal);

// ⚠️ DEPRECATED: Review routes moved to /api/reviews endpoint
// DO NOT USE /api/performance/reviews* - Use /api/reviews* instead
// Routes kept commented for reference only
/*
router.get('/reviews', performanceController.getAllReviews);
router.get('/reviews/my-reviews', performanceController.getMyReviews);
router.get('/reviews/:id', performanceController.getReviewById);
router.put('/reviews/:id', performanceController.updateReview);
router.delete('/reviews/:id', performanceController.deleteReview);
*/

// Performance Notes
router.post('/notes', performanceController.createNote);
router.get('/notes/:employeeId', performanceController.getNotesForEmployee);
router.delete('/notes/:id', performanceController.deleteNote);

// Disciplinary records
router.post('/disciplinary', performanceController.createDisciplinary);
router.get('/disciplinary/:employeeId', performanceController.getDisciplinaryForEmployee);

// Improvement plans (PIP)
router.post('/pips', performanceController.createImprovementPlan);
router.get('/pips/:employeeId', performanceController.getImprovementPlansForEmployee);

module.exports = router;
