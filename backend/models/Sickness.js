const mongoose = require('mongoose');

/**
 * Sickness Record Model
 * Tracks employee sickness absences with approval workflow
 */
const sicknessSchema = new mongoose.Schema({
  // Employee Reference (Subject)
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: [true, 'Employee reference is required'],
    index: true
  },
  
  // Sickness Details
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    index: true
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  numberOfDays: {
    type: Number,
    required: [true, 'Number of days is required'],
    min: [1, 'Number of days must be at least 1']
  },
  sicknessType: {
    type: String,
    enum: ['illness', 'injury', 'medical-appointment', 'mental-health', 'other'],
    default: 'illness'
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    maxlength: [1000, 'Reason cannot exceed 1000 characters']
  },
  symptoms: {
    type: String,
    maxlength: [500, 'Symptoms cannot exceed 500 characters']
  },
  
  // Medical Documentation
  requiresNote: {
    type: Boolean,
    default: false
  },
  noteProvided: {
    type: Boolean,
    default: false
  },
  noteDocument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentManagement',
    default: null
  },
  
  // Approval Workflow
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'under-review'],
    default: 'pending',
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  adminNotes: {
    type: String,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  },
  
  // Actor/Subject Tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },
  createdByRole: {
    type: String,
    enum: ['admin', 'super-admin', 'hr', 'employee', 'manager'],
    required: false,
    default: 'employee'
  },
  isAdminCreated: {
    type: Boolean,
    default: false
  },
  approvedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },
  approverRole: {
    type: String,
    enum: ['admin', 'super-admin', 'hr', 'manager'],
    required: false,
    default: null
  },
  approverComments: {
    type: String,
    maxlength: 500,
    required: false
  },
  
  // Return to Work
  returnedToWork: {
    type: Boolean,
    default: false
  },
  actualReturnDate: {
    type: Date,
    default: null
  },
  fitForWork: {
    type: Boolean,
    default: true
  },
  restrictionsOnReturn: {
    type: String,
    maxlength: [500, 'Restrictions cannot exceed 500 characters']
  },
  
  // Bradford Factor Calculation Support
  isRecurring: {
    type: Boolean,
    default: false
  },
  linkedToEarlierSickness: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sickness',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
sicknessSchema.index({ employeeId: 1, startDate: -1 });
sicknessSchema.index({ approvalStatus: 1, startDate: -1 });
sicknessSchema.index({ startDate: 1, endDate: 1 });

// Virtual for duration in days
sicknessSchema.virtual('durationDays').get(function() {
  if (!this.endDate || !this.startDate) return 0;
  const diffTime = Math.abs(this.endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
});

// Auto-calculate numberOfDays before validation
sicknessSchema.pre('validate', function(next) {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    this.numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  
  // Auto-set requiresNote if absence is 5+ days
  if (this.numberOfDays >= 5) {
    this.requiresNote = true;
  }
  
  next();
});

// Static method to calculate Bradford Factor for an employee
sicknessSchema.statics.calculateBradfordFactor = async function(employeeId, startDate, endDate) {
  const records = await this.find({
    employeeId,
    approvalStatus: 'approved',
    startDate: { $gte: startDate, $lte: endDate }
  });
  
  const totalSpells = records.length;
  const totalDays = records.reduce((sum, r) => sum + r.numberOfDays, 0);
  
  // Bradford Factor = S² × D (S = number of spells, D = total days)
  const bradfordFactor = Math.pow(totalSpells, 2) * totalDays;
  
  return {
    totalSpells,
    totalDays,
    bradfordFactor,
    riskLevel: bradfordFactor < 50 ? 'low' : bradfordFactor < 200 ? 'medium' : 'high'
  };
};

// Static method to get employee sickness statistics
sicknessSchema.statics.getEmployeeStats = async function(employeeId, startDate, endDate) {
  const records = await this.find({
    employeeId,
    startDate: { $gte: startDate, $lte: endDate }
  });
  
  const approvedRecords = records.filter(r => r.approvalStatus === 'approved');
  
  return {
    totalIncidents: records.length,
    approvedIncidents: approvedRecords.length,
    pendingIncidents: records.filter(r => r.approvalStatus === 'pending').length,
    rejectedIncidents: records.filter(r => r.approvalStatus === 'rejected').length,
    totalDaysOff: approvedRecords.reduce((sum, r) => sum + r.numberOfDays, 0),
    averageDaysPerIncident: approvedRecords.length > 0 
      ? (approvedRecords.reduce((sum, r) => sum + r.numberOfDays, 0) / approvedRecords.length).toFixed(2)
      : 0,
    withMedicalNote: approvedRecords.filter(r => r.noteProvided).length,
    withoutMedicalNote: approvedRecords.filter(r => !r.noteProvided && r.requiresNote).length
  };
};

// Method to check for overlapping sickness records
sicknessSchema.statics.findOverlapping = async function(employeeId, startDate, endDate, excludeId = null) {
  const query = {
    employeeId,
    approvalStatus: { $in: ['pending', 'approved'] },
    $or: [
      { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
    ]
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return await this.find(query);
};

module.exports = mongoose.model('Sickness', sicknessSchema);
