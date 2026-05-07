const mongoose = require('mongoose');

/**
 * Performance Review Model
 *
 * Status flow: DRAFT → RATING_PUBLISHED → REVIEW_CLOSED
 * Employees see review only after RATING_PUBLISHED.
 * Manager links approved objectives; employee inputs are snapshot on create.
 */

const reviewSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: [true, 'Employee ID is required'],
    index: true
  },

  reviewType: {
    type: String,
    enum: [
      'QUARTERLY',
      'MID_YEAR',
      'ANNUAL',
      'PROBATION',
      'PIP',
      'MONTHLY',
      'WEEKLY',
      'HR_REVIEW',
      'LEAVE_MANAGEMENT'
    ],
    default: 'ANNUAL',
    required: true,
    index: true
  },

  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'RATING_PUBLISHED', 'REVIEW_CLOSED'],
    default: 'DRAFT',
    required: true,
    index: true
  },

  reviewPeriodStart: {
    type: Date,
    default: null
  },

  reviewPeriodEnd: {
    type: Date,
    default: null
  },

  discussionDate: {
    type: Date,
    default: null
  },

  managerFeedback: {
    rating: {
      type: Number,
      min: [1, 'Rating must be 1-4'],
      max: [4, 'Rating must be 1-4'],
      default: null
    },
    feedback: {
      type: String,
      maxlength: 5000,
      default: null
    },
    areasForImprovement: {
      type: String,
      maxlength: 5000,
      default: null
    }
  },

  // Objectives linked to this review (approved goals)
  linkedObjectiveIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  }],

  // Snapshot of employee inputs captured at review creation time (audit trail)
  employeeInputSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  employeeComment: {
    comment: {
      type: String,
      maxlength: 2000,
      default: null
    },
    updatedAt: {
      type: Date,
      default: null
    }
  },

  submittedAt: {
    type: Date,
    default: null
  },

  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  submittedByModel: {
    type: String,
    enum: ['EmployeeHub', 'User'],
    default: null
  },

  publishedAt: { type: Date, default: null },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  publishedByModel: {
    type: String,
    enum: ['EmployeeHub', 'User'],
    default: null
  },

  completedAt: {
    type: Date,
    default: null
  },

  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  completedByModel: {
    type: String,
    enum: ['EmployeeHub', 'User'],
    default: null
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  createdByModel: {
    type: String,
    enum: ['EmployeeHub', 'User'],
    required: true
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  updatedByModel: {
    type: String,
    enum: ['EmployeeHub', 'User'],
    default: null
  }

}, { timestamps: true });

// === INDEXES ===
reviewSchema.index({ employeeId: 1, status: 1 });
reviewSchema.index({ employeeId: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });

// === INSTANCE METHODS ===

/**
 * Check if user can edit self-assessment
 */
reviewSchema.methods.isReadOnly = function() {
  return this.status === 'REVIEW_CLOSED';
};

/**
 * Returns true when the employee can view this review
 */
reviewSchema.methods.canEmployeeView = function() {
  return this.status === 'RATING_PUBLISHED' || this.status === 'REVIEW_CLOSED';
};

/**
 * Returns true when the employee can add a comment
 */
reviewSchema.methods.canEmployeeComment = function() {
  return this.status === 'RATING_PUBLISHED';
};

module.exports = mongoose.model('Review', reviewSchema);
