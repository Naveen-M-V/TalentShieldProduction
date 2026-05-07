const mongoose = require('mongoose');

/**
 * E-Learning Completion Model
 * Tracks course completions by employees
 */
const elearningCompletionSchema = new mongoose.Schema({
  // Material reference
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentManagement',
    required: [true, 'Material ID is required']
  },
  
  // Employee reference
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: [true, 'Employee ID is required']
  },
  
  // Completion timestamp
  completedDate: {
    type: Date,
    default: Date.now
  },
  
  // Additional metadata — the admin/manager who marked this complete (if not self-service)
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub'
  }
}, {
  timestamps: true
});

// Compound index to ensure each employee can only complete a material once
elearningCompletionSchema.index({ materialId: 1, employeeId: 1 }, { unique: true });

// Index for efficient queries
elearningCompletionSchema.index({ materialId: 1 });
elearningCompletionSchema.index({ employeeId: 1 });
elearningCompletionSchema.index({ completedDate: -1 });

// Virtual for completion age in days
elearningCompletionSchema.virtual('daysAgo').get(function() {
  return Math.floor((Date.now() - this.completedDate) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('ELearningCompletion', elearningCompletionSchema);
