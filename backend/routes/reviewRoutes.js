const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');
const Review = require('../models/Review');
const { REVIEW_MANAGER_ROLES } = require('../utils/roles');

const getUserId = (req) => req.user?._id || req.user?.id || req.session?.userId;
const getUserRole = (req) => req.user?.role || req.session?.role;
const canManageReviews = (req) => REVIEW_MANAGER_ROLES.includes(getUserRole(req));

const requireManager = (req, res, next) => {
  if (!canManageReviews(req)) {
    return res.status(403).json({
      success: false,
      message: 'Manager, HR, or Admin access required'
    });
  }
  next();
};

const canAccessReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Managers can always access
    if (canManageReviews(req)) {
      req.review = review;
      return next();
    }

    // For employees, check ownership - but need to resolve employee ID properly
    // Since this involves DB lookup, we'll pass the review and let controller validate
    // Controller has proper resolveEmployeeForRequest function
    
    // Block access to DRAFT reviews for non-managers
    if (review.status === 'DRAFT') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view draft reviews'
      });
    }

    // Pass review to controller for ownership validation
    req.review = review;
    next();
  } catch (error) {
    console.error('Review access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to authorize review access'
    });
  }
};

const requireDraftAndManager = async (req, res, next) => {
  try {
    if (!canManageReviews(req)) {
      return res.status(403).json({
        success: false,
        message: 'Manager/HR access required'
      });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Only draft reviews can be edited'
      });
    }

    req.review = review;
    next();
  } catch (error) {
    console.error('Review draft check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to authorize review edit'
    });
  }
};

const requirePublishedAndManager = async (req, res, next) => {
  try {
    if (!canManageReviews(req)) {
      return res.status(403).json({
        success: false,
        message: 'Manager/HR access required'
      });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (!['RATING_PUBLISHED', 'SUBMITTED'].includes(review.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only published reviews can be closed'
      });
    }

    req.review = review;
    next();
  } catch (error) {
    console.error('Review publish check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to authorize review action'
    });
  }
};

const requireSubmittedAndManager = requirePublishedAndManager;

const requireEmployeeSubmitted = async (req, res, next) => {
  try {
    // Block managers from using this endpoint
    if (canManageReviews(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only employees can add comments'
      });
    }

    // Fetch review and validate it exists
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Validate review is in RATING_PUBLISHED status
    if (review.status !== 'RATING_PUBLISHED') {
      return res.status(400).json({
        success: false,
        message: 'You can only comment on published reviews'
      });
    }

    // Pass review to controller - it will validate ownership with proper employee resolution
    req.review = review;
    next();
  } catch (error) {
    console.error('Review comment auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to authorize employee comment'
    });
  }
};

/**
 * User review endpoints
 */

router.get('/my', reviewsController.getMyReviews);

router.get('/', requireManager, reviewsController.listReviews);

router.post('/', requireManager, reviewsController.createReview);

router.get('/:id', canAccessReview, reviewsController.getReview);

router.put('/:id', requireDraftAndManager, reviewsController.updateReview);

// Publish: DRAFT → RATING_PUBLISHED (employees can see rating)
router.post('/:id/publish', requireDraftAndManager, reviewsController.publishReview);

// Legacy submit alias → same as publish
router.post('/:id/submit', requireDraftAndManager, reviewsController.submitReview);

// Employee acknowledgement comment (only on RATING_PUBLISHED reviews)
router.post('/:id/comment', requireEmployeeSubmitted, reviewsController.addEmployeeComment);

// Close: RATING_PUBLISHED → REVIEW_CLOSED
router.post('/:id/close', requirePublishedAndManager, reviewsController.closeReview);

module.exports = router;
