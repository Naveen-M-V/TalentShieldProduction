const express = require('express');
const router = express.Router();
const {
  createRequest,
  getRequests,
  getMyRequests,
  updateRequestStatus,
  checkOverdue,
  deleteRequest
} = require('../controllers/objectiveRequestController');

// Routes
router.get('/', getRequests);
router.get('/my', getMyRequests);
router.get('/check-overdue', checkOverdue);
router.post('/', createRequest);
router.put('/:id', updateRequestStatus);
router.delete('/:id', deleteRequest);

module.exports = router;
