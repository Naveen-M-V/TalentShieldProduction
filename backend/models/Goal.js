/**
 * Goal / Objective Model
 *
 * 4-step performance workflow:
 *  Step 1  Employee or Manager sets objective
 *  Step 2  Manager approves (only when setBy='employee')
 *  Step 3  Employee submits contribution inputs
 *  Step 4  Manager creates review, links this objective, publishes rating
 *
 * approvalStatus: pending → approved | sent_back
 * status:         TO_DO  → IN_PROGRESS → ACHIEVED | OVERDUE
 */

const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  // References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: [true, 'User ID is required'],
    index: true
  },

  // Goal Details
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },

  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    default: ''
  },

  // Free-text; presets: 'Business Contributor' | 'Value Creation' |
  // 'Self / People Development' | 'Other'  (user may add custom)
  category: {
    type: String,
    default: 'Business Contributor',
    required: true,
    // indexed via goalSchema.index({ category: 1 }) below
  },

  // Objective Workflow Fields
  setBy: {
    type: String,
    enum: ['manager', 'employee'],
    default: 'manager'
  },

  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'sent_back'],
    default: 'pending',
    index: true
  },

  sentBackReason: {
    type: String
  },

  // Timing
  startDate: {
    type: Date
  },

  endDate: {
    type: Date
  },

  deadline: {
    type: Date,
    default: null
  },

  // Progress & Status
  progress: {
    type: Number,
    min: [0, 'Progress cannot be less than 0'],
    max: [100, 'Progress cannot exceed 100'],
    default: 0
  },

  progressPercent: {
    type: Number,
    min: [0, 'Progress cannot be less than 0'],
    max: [100, 'Progress cannot exceed 100'],
    default: 0
  },

  status: {
    type: String,
    enum: ['TO_DO', 'IN_PROGRESS', 'ACHIEVED', 'OVERDUE'],
    default: 'TO_DO',
    required: true,
    index: true
  },

  // Link to review (set when manager creates review covering this objective)
  linkedReviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    default: null
  },

  // Employee Input/Contributions
  employeeInput: [{
    date: {
      type: Date,
      default: Date.now
    },
    contribution: {
      type: String,
      required: true
    },
    progress: {
      type: Number,
      min: 0,
      max: 100
    },
    comments: String,
    status: {
      type: String,
      enum: ['manager_review_pending', 'reviewed', 'approved'],
      default: 'manager_review_pending'
    },
    managerFeedback: String,
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeHub'
    }
  }],

  // Link to the formal performance review cycle covering this goal
  reviewCycle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  },

  adminComments: [{
    comment: {
      type: String,
      required: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      // Can be either User (admin) or EmployeeHub
      refPath: 'adminComments.addedByModel'
    },
    addedByModel: {
      type: String,
      enum: ['User', 'EmployeeHub'],
      default: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub'
  }

}, { timestamps: true });

// Virtuals
goalSchema.virtual('isOverdue').get(function () {
  return this.endDate &&
    this.status !== 'ACHIEVED' &&
    new Date() > new Date(this.endDate);
});

// Indexes
goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, approvalStatus: 1 });
goalSchema.index({ approvalStatus: 1, setBy: 1 });
goalSchema.index({ createdBy: 1, setBy: 1 });
goalSchema.index({ category: 1 });
goalSchema.index({ reviewCycle: 1 });

module.exports = mongoose.model('Goal', goalSchema);
