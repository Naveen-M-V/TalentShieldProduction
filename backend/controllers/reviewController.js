const Review = require('../models/Review');
const ReviewEmployeeComment = require('../models/ReviewEmployeeComment');
const EmployeesHub = require('../models/EmployeesHub');
const mongoose = require('mongoose');

// ==================== ADMIN CONTROLLERS ====================

/**
 * Create a new review (Admin only)
 * Initial status: DRAFT
 */
exports.createReview = async (req, res) => {
    try {
        const { employeeId, reviewType, reviewPeriodStart, reviewPeriodEnd, performanceSummary, strengths, improvements, rating } = req.body;
        
        // Validate input
        if (!employeeId) {
            return res.status(400).json({ message: 'Employee ID is required' });
        }
        
        if (!reviewType || !['ANNUAL', 'PROBATION', 'AD_HOC'].includes(reviewType)) {
            return res.status(400).json({ message: 'Valid review type is required (ANNUAL, PROBATION, or AD_HOC)' });
        }
        
        // Check if employee exists
        const employee = await EmployeesHub.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        
        // Get admin ID from authenticated user
        const adminId = req.user?._id || req.user?.id;
        if (!adminId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        
        // Create review
        const review = new Review({
            employee: employeeId,
            reviewType,
            reviewPeriodStart: reviewPeriodStart || undefined,
            reviewPeriodEnd: reviewPeriodEnd || undefined,
            performanceSummary: performanceSummary || undefined,
            strengths: strengths || undefined,
            improvements: improvements || undefined,
            rating: rating || undefined,
            status: 'DRAFT',
            createdBy: adminId
        });
        
        await review.save();
        
        // Populate for response
        await review.populate('employee', 'firstName lastName email employeeId');
        await review.populate('createdBy', 'firstName lastName email');
        
        console.log(`[Review Created] ID: ${review._id}, Type: ${reviewType}, Employee: ${employee.firstName} ${employee.lastName}, Status: DRAFT`);
        
        res.status(201).json({
            success: true,
            message: 'Review created successfully',
            review
        });
        
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error creating review', 
            error: error.message 
        });
    }
};

/**
 * Update review (Admin only, only if status = DRAFT)
 */
exports.updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { performanceSummary, strengths, improvements, rating, reviewPeriodStart, reviewPeriodEnd } = req.body;
        
        // Find review
        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        
        // Check if review can be edited
        if (!review.canEdit()) {
            return res.status(403).json({ 
                message: 'Review cannot be edited',
                reason: `Review status is ${review.status}. Only DRAFT reviews can be edited.`
            });
        }
        
        // Update fields
        if (performanceSummary !== undefined) review.performanceSummary = performanceSummary;
        if (strengths !== undefined) review.strengths = strengths;
        if (improvements !== undefined) review.improvements = improvements;
        if (rating !== undefined) review.rating = rating;
        if (reviewPeriodStart !== undefined) review.reviewPeriodStart = reviewPeriodStart;
        if (reviewPeriodEnd !== undefined) review.reviewPeriodEnd = reviewPeriodEnd;
        
        await review.save();
        await review.populate('employee', 'firstName lastName email employeeId');
        await review.populate('createdBy', 'firstName lastName email');
        
        console.log(`[Review Updated] ID: ${review._id}, Status: ${review.status}`);
        
        res.json({
            success: true,
            message: 'Review updated successfully',
            review
        });
        
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error updating review', 
            error: error.message 
        });
    }
};

/**
 * Submit review (Admin only)
 * Transition: DRAFT -> SUBMITTED
 * Makes review visible to employee
 */
exports.submitReview = async (req, res) => {
    try {
        const { id } = req.params;
        
        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        
        // Can only submit DRAFT reviews
        if (review.status !== 'DRAFT') {
            return res.status(400).json({ 
                message: 'Review cannot be submitted',
                reason: `Review status is ${review.status}. Only DRAFT reviews can be submitted.`
            });
        }
        
        // Validate required fields
        if (!review.performanceSummary) {
            return res.status(400).json({ 
                message: 'Cannot submit review',
                reason: 'Performance summary is required'
            });
        }
        
        // Update status
        review.status = 'SUBMITTED';
        await review.save();
        
        await review.populate('employee', 'firstName lastName email employeeId');
        await review.populate('createdBy', 'firstName lastName email');
        
        console.log(`[Review Submitted] ID: ${review._id}, Employee: ${review.employee.firstName} ${review.employee.lastName}`);
        
        res.json({
            success: true,
            message: 'Review submitted successfully. Employee can now view it.',
            review
        });
        
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error submitting review', 
            error: error.message 
        });
    }
};

/**
 * Complete review (Admin only)
 * Transition: SUBMITTED -> COMPLETED
 * Makes review immutable
 */
exports.completeReview = async (req, res) => {
    try {
        const { id } = req.params;
        
        const adminId = req.user?._id || req.user?.id;
        if (!adminId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        
        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        
        // Can only complete SUBMITTED reviews
        if (review.status !== 'SUBMITTED') {
            return res.status(400).json({ 
                message: 'Review cannot be completed',
                reason: `Review status is ${review.status}. Only SUBMITTED reviews can be completed.`
            });
        }
        
        // Update status and audit fields
        review.status = 'COMPLETED';
        review.completedBy = adminId;
        review.completedAt = new Date();
        
        await review.save();
        
        await review.populate('employee', 'firstName lastName email employeeId');
        await review.populate('createdBy', 'firstName lastName email');
        await review.populate('completedBy', 'firstName lastName email');
        
        console.log(`[Review Completed] ID: ${review._id}, CompletedBy: ${review.completedBy.firstName} ${review.completedBy.lastName}, CompletedAt: ${review.completedAt}`);
        
        res.json({
            success: true,
            message: 'Review completed successfully. This review is now a permanent record.',
            review
        });
        
    } catch (error) {
        console.error('Error completing review:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error completing review', 
            error: error.message 
        });
    }
};

/**
 * Get all reviews (Admin only)
 * With optional filters
 */
exports.getAllReviews = async (req, res) => {
    try {
        const { status, reviewType, employeeId } = req.query;
        
        const filters = {};
        if (status) filters.status = status;
        if (reviewType) filters.reviewType = reviewType;
        if (employeeId) filters.employeeId = employeeId;
        
        const reviews = await Review.getAdminReviews(filters);
        
        // Get comment counts for each review
        const reviewsWithComments = await Promise.all(reviews.map(async (review) => {
            const commentCount = await ReviewEmployeeComment.countDocuments({ review: review._id });
            return {
                ...review.toObject(),
                commentCount
            };
        }));
        
        res.json({
            success: true,
            count: reviewsWithComments.length,
            reviews: reviewsWithComments
        });
        
    } catch (error) {
        console.error('Error fetching all reviews:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching reviews', 
            error: error.message 
        });
    }
};

/**
 * Get single review by ID (Admin and Employee)
 * Employee can only see if status is SUBMITTED or COMPLETED
 */
exports.getReviewById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const review = await Review.findById(id)
            .populate('employee', 'firstName lastName email employeeId')
            .populate('createdBy', 'firstName lastName email')
            .populate('completedBy', 'firstName lastName email');
        
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        
        // Check permissions
        const userRole = req.user?.role;
        const userId = req.user?._id || req.user?.id;
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'admin' || userRole === 'super-admin';
        
        // If not admin, check if user is the employee and review is visible
        if (!isAdmin) {
            const employeeIdStr = String(review.employee._id);
            const userIdStr = String(userId);
            
            if (employeeIdStr !== userIdStr) {
                return res.status(403).json({ message: 'Access denied. This review is not assigned to you.' });
            }
            
            if (!review.isVisibleToEmployee()) {
                return res.status(403).json({ message: 'This review is not yet available for viewing.' });
            }
        }
        
        // Get employee comments
        const comments = await ReviewEmployeeComment.getReviewComments(id);
        
        res.json({
            success: true,
            review: {
                ...review.toObject(),
                comments,
                canEdit: isAdmin && review.canEdit(),
                isImmutable: review.isImmutable()
            }
        });
        
    } catch (error) {
        console.error('Error fetching review:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching review', 
            error: error.message 
        });
    }
};

/**
 * Delete review (Admin only, only if status = DRAFT)
 */
exports.deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        
        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        
        // Can only delete DRAFT reviews
        if (review.status !== 'DRAFT') {
            return res.status(403).json({ 
                message: 'Review cannot be deleted',
                reason: `Review status is ${review.status}. Only DRAFT reviews can be deleted.`
            });
        }
        
        await Review.findByIdAndDelete(id);
        
        console.log(`[Review Deleted] ID: ${id}, Status was: DRAFT`);
        
        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error deleting review', 
            error: error.message 
        });
    }
};

// ==================== EMPLOYEE CONTROLLERS ====================

/**
 * Get my reviews (Employee)
 * Only returns SUBMITTED or COMPLETED reviews
 */
exports.getMyReviews = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        
        // Find employee record
        let employee = await EmployeesHub.findById(userId);
        
        if (!employee) {
            // Try finding by userId field
            employee = await EmployeesHub.findOne({ userId: userId });
        }
        
        if (!employee && req.user?.email) {
            // Fallback to email lookup
            employee = await EmployeesHub.findOne({ email: String(req.user.email).toLowerCase() });
        }
        
        if (!employee) {
            return res.status(404).json({ message: 'Employee record not found' });
        }
        
        const reviews = await Review.getEmployeeReviews(employee._id);
        
        // Get comment info for each review
        const reviewsWithComments = await Promise.all(reviews.map(async (review) => {
            const employeeComment = await ReviewEmployeeComment.getEmployeeComment(review._id, employee._id);
            return {
                ...review.toObject(),
                hasCommented: !!employeeComment,
                acknowledged: employeeComment?.acknowledged || false,
                myComment: employeeComment || null
            };
        }));
        
        res.json({
            success: true,
            count: reviewsWithComments.length,
            reviews: reviewsWithComments
        });
        
    } catch (error) {
        console.error('Error fetching my reviews:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching reviews', 
            error: error.message 
        });
    }
};

/**
 * Add comment to review (Employee)
 * Employee can comment on SUBMITTED or COMPLETED reviews
 */
exports.addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { comment, acknowledged } = req.body;
        
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        
        // Validate input
        if (!comment || comment.trim().length === 0) {
            return res.status(400).json({ message: 'Comment is required' });
        }
        
        if (comment.length > 2000) {
            return res.status(400).json({ message: 'Comment cannot exceed 2000 characters' });
        }
        
        // Find review
        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        
        // Check if review is visible to employee
        if (!review.isVisibleToEmployee()) {
            return res.status(403).json({ message: 'This review is not yet available for commenting.' });
        }
        
        // Find employee record
        let employee = await EmployeesHub.findById(userId);
        if (!employee) {
            employee = await EmployeesHub.findOne({ userId: userId });
        }
        if (!employee && req.user?.email) {
            employee = await EmployeesHub.findOne({ email: String(req.user.email).toLowerCase() });
        }
        if (!employee) {
            return res.status(404).json({ message: 'Employee record not found' });
        }
        
        // Check if employee is the subject of the review
        if (String(review.employee) !== String(employee._id)) {
            return res.status(403).json({ message: 'You can only comment on your own reviews.' });
        }
        
        // Check if employee already has a comment
        let existingComment = await ReviewEmployeeComment.findOne({
            review: id,
            employee: employee._id
        });
        
        if (existingComment) {
            // Update existing comment
            existingComment.comment = comment;
            existingComment.acknowledged = acknowledged !== undefined ? acknowledged : existingComment.acknowledged;
            existingComment.updatedAt = new Date();
            await existingComment.save();
            
            console.log(`[Comment Updated] Review: ${id}, Employee: ${employee.firstName} ${employee.lastName}`);
            
            res.json({
                success: true,
                message: 'Comment updated successfully',
                comment: existingComment
            });
        } else {
            // Create new comment
            const newComment = new ReviewEmployeeComment({
                review: id,
                employee: employee._id,
                comment: comment.trim(),
                acknowledged: acknowledged || false
            });
            
            await newComment.save();
            await newComment.populate('employee', 'firstName lastName email employeeId');
            
            console.log(`[Comment Added] Review: ${id}, Employee: ${employee.firstName} ${employee.lastName}`);
            
            res.status(201).json({
                success: true,
                message: 'Comment added successfully',
                comment: newComment
            });
        }
        
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error adding comment', 
            error: error.message 
        });
    }
};

/**
 * Acknowledge review (Employee)
 * Updates the acknowledged flag on employee's comment
 */
exports.acknowledgeReview = async (req, res) => {
    try {
        const { id } = req.params;
        
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        
        // Find employee
        let employee = await EmployeesHub.findById(userId);
        if (!employee) {
            employee = await EmployeesHub.findOne({ userId: userId });
        }
        if (!employee && req.user?.email) {
            employee = await EmployeesHub.findOne({ email: String(req.user.email).toLowerCase() });
        }
        if (!employee) {
            return res.status(404).json({ message: 'Employee record not found' });
        }
        
        // Find or create comment
        let comment = await ReviewEmployeeComment.findOne({
            review: id,
            employee: employee._id
        });
        
        if (comment) {
            comment.acknowledged = true;
            comment.updatedAt = new Date();
            await comment.save();
        } else {
            // Create a minimal comment with acknowledgement
            comment = new ReviewEmployeeComment({
                review: id,
                employee: employee._id,
                comment: 'Review acknowledged',
                acknowledged: true
            });
            await comment.save();
        }
        
        console.log(`[Review Acknowledged] Review: ${id}, Employee: ${employee.firstName} ${employee.lastName}`);
        
        res.json({
            success: true,
            message: 'Review acknowledged successfully',
            comment
        });
        
    } catch (error) {
        console.error('Error acknowledging review:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error acknowledging review', 
            error: error.message 
        });
    }
};
