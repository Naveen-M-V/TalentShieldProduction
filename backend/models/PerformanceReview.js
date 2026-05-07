/**
 * @deprecated PerformanceReview — superseded by Review.js (canonical model)
 *
 * This model and its route (/api/performance-reviews) are kept temporarily to
 * preserve existing data. DO NOT write new data to this collection.
 * Goal.reviewCycle has been migrated to ref: 'Review'.
 *
 * Migration TODO (Phase 5):
 *   1. Export existing performancereviews documents
 *   2. Transform and import into the reviews collection
 *   3. Remove this file and its route from server.js
 */
const mongoose = require('mongoose');

const performanceReviewSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: true,
    index: true
  },

  employeeName: String,
  department: String,

  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: true
  },

  managerName: String,

  objectives: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  }],

  reviewType: {
    type: String,
    enum: [
      'Quarterly Review',
      'Mid-Year Review',
      'Annual Review',
      'Probation Review',
      'Spot Review',
      'Project Completion Review',
      'Promotion Review',
      'Performance Improvement Review',
      'Exit Review'
    ],
    default: 'Quarterly Review'
  },

  reviewPeriodStart: {
    type: Date,
    required: true
  },

  reviewPeriodEnd: {
    type: Date,
    required: true
  },

  reviewDate: {
    type: Date,
    default: Date.now
  },

  // Manager's Review
  overallRating: {
    type: Number,
    min: 1,
    max: 4,
    enum: [1, 2, 3, 4]
  },

  managerFeedback: {
    strengths: String,
    areasForImprovement: String,
    achievements: String,
    developmentNeeds: String,
    generalComments: String
  },

  // Employee Response
  employeeAcknowledged: {
    type: Boolean,
    default: false
  },

  employeeAcknowledgedAt: Date,

  employeeComments: String,

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'completed', 'acknowledged', 'archived'],
    default: 'draft',
    index: true
  },

  isPublished: {
    type: Boolean,
    default: false
  },

  publishedAt: Date,

  // Next Review
  nextReviewDate: Date,

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub'
  }

}, { timestamps: true });

// Indexes for common queries
performanceReviewSchema.index({ employeeId: 1, reviewPeriodStart: -1 });
performanceReviewSchema.index({ managerId: 1, status: 1 });
performanceReviewSchema.index({ status: 1, reviewDate: -1 });
performanceReviewSchema.index({ isPublished: 1, employeeId: 1 });

module.exports = mongoose.model('PerformanceReview', performanceReviewSchema);
