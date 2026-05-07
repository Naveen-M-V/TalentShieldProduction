/**
 * Reviews Controller
 * 
 * Handles performance review workflow:
 * 1. User submits self-assessment
 * 2. Manager/Admin submits feedback
 * 3. Review completed
 */

const Review = require('../models/Review');
const EmployeeHub = require('../models/EmployeesHub');
const mongoose = require('mongoose');
const { ADMIN_SCOPE_ROLES, REVIEW_MANAGER_ROLES } = require('../utils/roles');
const { resolveActorId } = require('../utils/identityHelper');
const hierarchyHelper = require('../utils/hierarchyHelper');
const { getRatingDisplayLabel } = require('../utils/ratingConstants');

// Admin roles that have full manager permissions
const getUserId = (req) => resolveActorId(req);
const getUserRole = (req) => req.user?.role || req.session?.role;
const isManager = (req) => REVIEW_MANAGER_ROLES.includes(getUserRole(req));
const getUserModel = (req) => (req.user?.userType === 'profile' ? 'User' : 'EmployeeHub');
const isAdminScope = (role) => ADMIN_SCOPE_ROLES.includes(role);
const normalizeEmployeeId = (value) => String(value?._id || value || '').trim();

const getManagedEmployeeIds = async (req) => {
  const managerEmployee = await resolveEmployeeForRequest(req);
  if (!managerEmployee?._id) {
    return [];
  }

  const subordinates = await hierarchyHelper.getSubordinates(managerEmployee._id, false);
  return subordinates.map((employee) => String(employee._id));
};

const canAccessReviewEmployee = async (req, employeeId) => {
  const userRole = getUserRole(req);
  if (isAdminScope(userRole)) {
    return true;
  }

  if (!REVIEW_MANAGER_ROLES.includes(userRole)) {
    return false;
  }

  const managedEmployeeIds = await getManagedEmployeeIds(req);
  return managedEmployeeIds.includes(normalizeEmployeeId(employeeId));
};

/**
 * Enhanced employee ID resolution for authenticated user
 * Handles the mapping from auth User ID to EmployeeHub ID with comprehensive debugging
 * 
 * Resolution Strategy (4 steps):
 * 1. Check if cached employeeId exists in req.employeeId (from middleware)
 * 2. Try auth ID as EmployeeHub._id (employee login tokens)
 * 3. Try auth ID as User._id → EmployeeHub.userId link (profile/admin tokens)
 * 4. Fallback to email match in EmployeeHub
 */
const resolveEmployeeForRequest = async (req) => {
  console.log('🔍 [reviewsController] Starting employee resolution...');
  
  // Step 0: Check if already cached from middleware
  if (req.employeeId) {
    console.log('✅ [reviewsController] Using cached employeeId:', req.employeeId);
    const employee = await EmployeeHub.findById(req.employeeId);
    if (employee) {
      console.log('✅ [reviewsController] Cached employee found:', {
        id: employee._id,
        email: employee.email,
        name: `${employee.firstName} ${employee.lastName}`
      });
      return employee;
    }
  }

  // Extract all possible ID sources
  const authId = resolveActorId(req);
  const authIdStr = authId ? String(authId).trim() : '';
  const isValidObjectId = mongoose.Types.ObjectId.isValid(authIdStr);
  
  console.log('🔍 [reviewsController] Auth context:', {
    authId: authIdStr,
    isValidObjectId,
    userEmail: req.user?.email,
    sessionUserId: req.session?.userId,
    userRole: req.user?.role
  });

  let employee = null;

  // Step 1: Try as EmployeeHub _id (employee login tokens)
  if (isValidObjectId) {
    console.log('🔍 [reviewsController] Step 1: Trying authId as EmployeeHub._id:', authIdStr);
    employee = await EmployeeHub.findById(authIdStr);
    if (employee) {
      console.log('✅ [reviewsController] Found employee by _id:', {
        id: employee._id,
        email: employee.email,
        name: `${employee.firstName} ${employee.lastName}`,
        role: employee.role
      });
      return employee;
    } else {
      console.log('⚠️ [reviewsController] No employee found with _id:', authIdStr);
    }
  }

  // Step 2: Try as User._id → EmployeeHub.userId link (profile/admin tokens)
  if (!employee && isValidObjectId) {
    console.log('🔍 [reviewsController] Step 2: Trying authId as User._id → EmployeeHub.userId:', authIdStr);
    employee = await EmployeeHub.findOne({ userId: authIdStr });
    if (employee) {
      console.log('✅ [reviewsController] Found employee by userId link:', {
        id: employee._id,
        userId: employee.userId,
        email: employee.email,
        name: `${employee.firstName} ${employee.lastName}`,
        role: employee.role
      });
      return employee;
    } else {
      console.log('⚠️ [reviewsController] No employee found with userId:', authIdStr);
    }
  }

  // Step 3: Fallback to email match
  if (!employee && req.user?.email) {
    const email = String(req.user.email).toLowerCase().trim();
    console.log('🔍 [reviewsController] Step 3: Trying email match:', email);
    employee = await EmployeeHub.findOne({ email });
    if (employee) {
      console.log('✅ [reviewsController] Found employee by email:', {
        id: employee._id,
        email: employee.email,
        name: `${employee.firstName} ${employee.lastName}`,
        role: employee.role
      });
      return employee;
    } else {
      console.log('⚠️ [reviewsController] No employee found with email:', email);
    }
  }

  console.error('❌ [reviewsController] Employee resolution failed - all methods exhausted');
  return null;
};

/**
 * Enhance review(s) with rating labels
 * Adds ratingLabel and ratingCode fields based on managerFeedback.rating
 */
const enhanceReviewWithRatingLabel = (review) => {
  const plain = review && review.toObject ? review.toObject() : { ...review };
  if (plain.managerFeedback?.rating) {
    plain.managerFeedback.ratingLabel = getRatingDisplayLabel(plain.managerFeedback.rating);
  }
  return plain;
};

const enhanceReviewsWithRatingLabels = (reviews) => {
  return Array.isArray(reviews) ? reviews.map(enhanceReviewWithRatingLabel) : [enhanceReviewWithRatingLabel(reviews)];
};

const VALID_REVIEW_TYPES = [
  'QUARTERLY', 'MID_YEAR', 'ANNUAL', 'PROBATION', 'PIP',
  'MONTHLY', 'WEEKLY', 'HR_REVIEW', 'LEAVE_MANAGEMENT'
];
const validateReviewType = (reviewType) => VALID_REVIEW_TYPES.includes(reviewType);
const trimOrNull = (v) => {
  if (typeof v !== 'string') return v ?? null;
  const t = v.trim();
  return t ? t : null;
};

const validateRatingOrNull = (rating) => {
  if (rating === null || rating === undefined || rating === '') return null;
  const n = Number(rating);
  if (!Number.isFinite(n) || n < 1 || n > 4) return '__INVALID__';
  return n;
};

/**
 * Get user's reviews (history)
 * GET /api/reviews/my
 */
exports.getMyReviews = async (req, res) => {
  try {
    const authId = getUserId(req);
    if (!authId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Resolve to EmployeeHub ID
    const employee = await resolveEmployeeForRequest(req);
    if (!employee) {
      console.warn('⚠️ getMyReviews: Employee record not found for user:', authId);
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    const employeeId = employee._id;
    console.log('📋 Fetching reviews for employee:', employeeId);

    const query = { employeeId };
    const reviews = await Review.find(query)
      .select('-__v')
      .populate('employeeId', 'firstName lastName email department employeeId')
      .sort({ createdAt: -1 })
      .lean();

    // Filter: employees only see published/closed reviews
    const filtered = reviews.filter((r) => ['RATING_PUBLISHED', 'REVIEW_CLOSED'].includes(r.status));

    // Enhance with rating labels
    const enhanced = enhanceReviewsWithRatingLabels(filtered);

    res.json({
      success: true,
      count: enhanced.length,
      data: enhanced
    });
  } catch (error) {
    console.error('❌ Error fetching my reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
};

exports.listReviews = async (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({
        success: false,
        message: 'Manager/HR access required'
      });
    }

    const { status, employeeId, reviewType } = req.query;
    const query = {};
    if (status) query.status = status;
    if (employeeId) query.employeeId = employeeId;
    if (reviewType) query.reviewType = reviewType;

    if (!isAdminScope(getUserRole(req))) {
      const managedEmployeeIds = await getManagedEmployeeIds(req);
      if (employeeId && !managedEmployeeIds.includes(String(employeeId))) {
        return res.status(403).json({
          success: false,
          message: 'You can only view reviews for your direct team members'
        });
      }
      query.employeeId = employeeId ? employeeId : { $in: managedEmployeeIds };
    }

    const reviews = await Review.find(query)
      .select('-__v')
      .populate('employeeId', 'firstName lastName email department employeeId')
      .sort({ createdAt: -1 })
      .lean();

    // Enhance with rating labels
    const enhanced = enhanceReviewsWithRatingLabels(reviews);

    res.json({
      success: true,
      count: enhanced.length,
      data: enhanced
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
};

/**
 * Get a specific review
 * GET /api/reviews/:id
 */
exports.getReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id)
      .populate('employeeId', 'firstName lastName email department employeeId');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const managerView = isManager(req);
    if (!managerView) {
      // Resolve employee ID from authenticated user
      const employee = await resolveEmployeeForRequest(req);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee record not found'
        });
      }

      const employeeId = employee._id;
      const isOwner = employeeId && review.employeeId?._id?.toString() === employeeId.toString();
      
      if (!isOwner || review.status === 'DRAFT') {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this review'
        });
      }
    } else if (!isAdminScope(getUserRole(req))) {
      const allowed = await canAccessReviewEmployee(req, review.employeeId);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: 'You can only view reviews for your direct team members'
        });
      }
    }

    const payload = review.toObject();
    const enhanced = enhanceReviewWithRatingLabel(payload);

    res.json({
      success: true,
      data: enhanced
    });
  } catch (error) {
    console.error('❌ Error fetching review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review',
      error: error.message
    });

            if (!(await canAccessReviewEmployee(req, review.employeeId))) {
              return res.status(403).json({
                success: false,
                message: 'You can only edit reviews for your direct team members'
              });
            }
  }
};

exports.createReview = async (req, res) => {
  try {
    const userRole = getUserRole(req);
    const userId = getUserId(req);
    const userModel = getUserModel(req);
    
    console.log('👤 Review creation attempt:', {
      userId,
      userRole,
      userModel,
      userType: req.user?.userType,
      isManager: isManager(req),
      isAdminScope: isAdminScope(userRole),
      isSuperAdmin: userRole === 'super-admin'
    });

    if (!isManager(req)) {
      console.log('❌ Access denied - not a manager/admin');
      return res.status(403).json({
        success: false,
        message: 'Manager/HR access required'
      });
    }

    const { employeeId, reviewType, reviewPeriodStart, reviewPeriodEnd, discussionDate, managerFeedback, linkedObjectiveIds } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    if (reviewType !== undefined && !validateReviewType(reviewType)) {
      return res.status(400).json({ success: false, message: 'Invalid review type' });
    }

    const employee = await EmployeeHub.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (!(await canAccessReviewEmployee(req, employeeId))) {
      return res.status(403).json({
        success: false,
        message: 'You can only create reviews for your direct team members'
      });
    }

    const rating = validateRatingOrNull(managerFeedback?.rating);
    if (rating === '__INVALID__') {
      return res.status(400).json({ success: false, message: 'Rating must be between 1-4' });
    }

    const model = getUserModel(req);

    // Validate and snapshot linked objectives
    let resolvedObjectiveIds = [];
    let inputSnapshot = null;
    if (Array.isArray(linkedObjectiveIds) && linkedObjectiveIds.length > 0) {
      const Goal = require('../models/Goal');
      const objectives = await Goal.find({
        _id: { $in: linkedObjectiveIds },
        userId: employeeId,
        approvalStatus: 'approved'
      }).lean();
      resolvedObjectiveIds = objectives.map((o) => o._id);
      // Build snapshot of employee inputs at creation time
      inputSnapshot = objectives.map((o) => ({
        objectiveId: o._id,
        title: o.title,
        category: o.category,
        employeeInput: o.employeeInput || []
      }));
    }

    const review = await Review.create({
      employeeId,
      reviewType: reviewType || 'ANNUAL',
      status: 'DRAFT',
      reviewPeriodStart: reviewPeriodStart || null,
      reviewPeriodEnd: reviewPeriodEnd || null,
      discussionDate: discussionDate || null,
      linkedObjectiveIds: resolvedObjectiveIds,
      employeeInputSnapshot: inputSnapshot,
      managerFeedback: {
        rating,
        feedback: trimOrNull(managerFeedback?.feedback),
        areasForImprovement: trimOrNull(managerFeedback?.areasForImprovement)
      },
      createdBy: userId,
      createdByModel: model,
      updatedBy: userId,
      updatedByModel: model
    });

    res.status(201).json({ success: true, data: enhanceReviewWithRatingLabel(review) });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create review'
    });
  }
};

exports.updateReview = async (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({
        success: false,
        message: 'Manager/HR access required'
      });
    }

    const review = req.review || await Review.findById(req.params.id);
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

    if (!(await canAccessReviewEmployee(req, review.employeeId))) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit reviews for your direct team members'
      });
    }

    const { reviewType, reviewPeriodStart, reviewPeriodEnd, discussionDate, managerFeedback, linkedObjectiveIds } = req.body;
    if (reviewType !== undefined && !validateReviewType(reviewType)) {
      return res.status(400).json({ success: false, message: 'Invalid review type' });
    }

    if (reviewType !== undefined) review.reviewType = reviewType;
    if (reviewPeriodStart !== undefined) review.reviewPeriodStart = reviewPeriodStart || null;
    if (reviewPeriodEnd !== undefined) review.reviewPeriodEnd = reviewPeriodEnd || null;
    if (discussionDate !== undefined) review.discussionDate = discussionDate || null;

    // Update linked objectives and refresh snapshot
    if (Array.isArray(linkedObjectiveIds)) {
      const Goal = require('../models/Goal');
      const objectives = await Goal.find({
        _id: { $in: linkedObjectiveIds },
        userId: review.employeeId,
        approvalStatus: 'approved'
      }).lean();
      review.linkedObjectiveIds = objectives.map((o) => o._id);
      review.employeeInputSnapshot = objectives.map((o) => ({
        objectiveId: o._id,
        title: o.title,
        category: o.category,
        employeeInput: o.employeeInput || []
      }));
    }

    if (managerFeedback !== undefined) {
      const rating = validateRatingOrNull(managerFeedback?.rating);
      if (rating === '__INVALID__') {
        return res.status(400).json({ success: false, message: 'Rating must be between 1-4' });
      }
      review.managerFeedback = {
        rating,
        feedback: trimOrNull(managerFeedback?.feedback),
        areasForImprovement: trimOrNull(managerFeedback?.areasForImprovement)
      };
    }

    const userId = getUserId(req);
    const model = getUserModel(req);
    review.updatedBy = userId;
    review.updatedByModel = model;

    await review.save();
    const enhanced = enhanceReviewWithRatingLabel(review);
    res.json({
      success: true,
      data: enhanced
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review'
    });
  }
};

exports.submitReview = async (req, res) => {
  // Legacy: transition DRAFT → SUBMITTED (kept for backward compatibility)
  return exports.publishReview(req, res);
};

exports.publishReview = async (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({ success: false, message: 'Manager/HR access required' });
    }

    const review = req.review || await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Only draft reviews can be published' });
    }

    if (!(await canAccessReviewEmployee(req, review.employeeId))) {
      return res.status(403).json({
        success: false,
        message: 'You can only publish reviews for your direct team members'
      });
    }

    review.status = 'RATING_PUBLISHED';
    review.publishedAt = new Date();
    review.publishedBy = getUserId(req);
    review.publishedByModel = getUserModel(req);
    review.updatedBy = getUserId(req);
    review.updatedByModel = getUserModel(req);
    await review.save();

    // Notify employee
    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        recipientType: 'employee',
        employeeRef: review.employeeId,
        type: 'review_published',
        title: 'Performance Review Published',
        message: 'Your performance review has been published. You can now view your rating and feedback.',
        priority: 'high',
        metadata: { relatedId: review._id, relatedType: 'Review' },
        actionUrl: '/performance',
        actionText: 'View Review'
      });
    } catch (notifErr) {
      console.error('Notification error (non-fatal):', notifErr.message);
    }

    res.json({ success: true, data: enhanceReviewWithRatingLabel(review) });
  } catch (error) {
    console.error('Error publishing review:', error);
    res.status(500).json({ success: false, message: 'Failed to publish review' });
  }
};

exports.addEmployeeComment = async (req, res) => {
  try {
    const review = req.review || await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Resolve employee ID from authenticated user
    const employee = await resolveEmployeeForRequest(req);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    const employeeId = employee._id;
    const isOwner = employeeId && review.employeeId?.toString() === employeeId.toString();
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only comment on your own reviews'
      });
    }

    if (review.status !== 'RATING_PUBLISHED') {
      return res.status(400).json({
        success: false,
        message: 'You can only comment on published reviews'
      });
    }

    const comment = trimOrNull(req.body?.comment);
    if (!comment) {
      return res.status(400).json({
        success: false,
        message: 'Comment is required'
      });
    }
    if (comment.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot exceed 2000 characters'
      });
    }

    if (review.employeeComment?.comment) {
      return res.status(400).json({
        success: false,
        message: 'Employee comment has already been added'
      });
    }

    const userId = getUserId(req);
    review.employeeComment = {
      comment,
      updatedAt: new Date()
    };
    review.updatedBy = userId;
    review.updatedByModel = getUserModel(req);

    await review.save();
    
    // Notify manager (createdBy)
    try {
      const Notification = require('../models/Notification');
      const empName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email;
      if (review.createdBy) {
        await Notification.create({
          recipientType: review.createdByModel === 'EmployeeHub' ? 'employee' : 'profile',
          ...(review.createdByModel === 'EmployeeHub'
            ? { employeeRef: review.createdBy }
            : { profileRef: review.createdBy }),
          type: 'review_acknowledged',
          title: 'Employee Commented on Review',
          message: `${empName} has added a comment to their performance review`,
          priority: 'medium',
          metadata: { relatedId: review._id, relatedType: 'Review' },
          actionUrl: '/performance',
          actionText: 'View Review'
        });
      }
    } catch (notifErr) {
      console.error('Notification error (non-fatal):', notifErr.message);
    }

    res.json({ success: true, data: review });
  } catch (error) {
    console.error('❌ Error adding employee comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
};

exports.closeReview = async (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({
        success: false,
        message: 'Manager/HR access required'
      });
    }

    const review = req.review || await Review.findById(req.params.id);
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

    if (!(await canAccessReviewEmployee(req, review.employeeId))) {
      return res.status(403).json({
        success: false,
        message: 'You can only close reviews for your direct team members'
      });
    }

    review.status = 'REVIEW_CLOSED';
    review.completedAt = new Date();
    review.completedBy = getUserId(req);
    review.completedByModel = getUserModel(req);
    review.updatedBy = getUserId(req);
    review.updatedByModel = getUserModel(req);

    await review.save();
    res.json({ success: true, data: enhanceReviewWithRatingLabel(review) });
  } catch (error) {
    console.error('Error closing review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close review'
    });
  }
};
