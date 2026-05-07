const mongoose = require('mongoose');

const overtimeSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  scheduledHours: {
    type: Number,
    required: true,
    min: 0
  },
  workedHours: {
    type: Number,
    required: true,
    min: 0
  },
  overtimeHours: {
    type: Number,
    required: true,
    min: 0
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
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
  rejectionReason: {
    type: String,
    default: null
  },
  // Actor/Subject Tracking (for admin approvals)
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
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate entries for same employee on same date
overtimeSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Auto-calculate overtime hours before validation
overtimeSchema.pre('validate', function(next) {
  if (this.workedHours !== undefined && this.scheduledHours !== undefined) {
    this.overtimeHours = Math.max(0, this.workedHours - this.scheduledHours);
  }
  next();
});

// Update timestamp on save
overtimeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Overtime', overtimeSchema);
