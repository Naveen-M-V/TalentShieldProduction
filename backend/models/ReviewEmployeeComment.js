const mongoose = require('mongoose');

/**
 * Review Employee Comment Model
 * 
 * Stores employee feedback on performance reviews.
 * Employees can:
 * - Add comments to reviews they can see (SUBMITTED or COMPLETED)
 * - Acknowledge they have read the review
 * - Cannot edit admin feedback
 * 
 * Comments are timestamped and permanent.
 */
const reviewEmployeeCommentSchema = new mongoose.Schema({
    // === REFERENCES ===
    review: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review',
        required: true,
        index: true
    },
    
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmployeeHub',
        required: true,
        index: true
    },
    
    // === EMPLOYEE INPUT ===
    comment: {
        type: String,
        required: true,
        maxlength: 2000
    },
    
    acknowledged: {
        type: Boolean,
        default: false
    },
    
    // === METADATA ===
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// === INDEXES ===
reviewEmployeeCommentSchema.index({ review: 1, employee: 1 });
reviewEmployeeCommentSchema.index({ employee: 1, createdAt: -1 });

// === STATIC METHODS ===

/**
 * Get all comments for a review
 */
reviewEmployeeCommentSchema.statics.getReviewComments = function(reviewId) {
    return this.find({ review: reviewId })
        .populate('employee', 'firstName lastName email employeeId')
        .sort({ createdAt: 1 });
};

/**
 * Get employee's comment for a specific review
 */
reviewEmployeeCommentSchema.statics.getEmployeeComment = function(reviewId, employeeId) {
    return this.findOne({ review: reviewId, employee: employeeId })
        .populate('employee', 'firstName lastName email employeeId');
};

/**
 * Check if employee has acknowledged the review
 */
reviewEmployeeCommentSchema.statics.hasAcknowledged = async function(reviewId, employeeId) {
    const comment = await this.findOne({ review: reviewId, employee: employeeId });
    return comment ? comment.acknowledged : false;
};

module.exports = mongoose.model('ReviewEmployeeComment', reviewEmployeeCommentSchema);
