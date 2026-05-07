const mongoose = require('mongoose');

/**
 * Payroll Exception Model
 * Tracks issues that need resolution before payroll processing
 */
const payrollExceptionSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: [true, 'Employee reference is required'],
    index: true
  },
  payPeriodStart: {
    type: Date,
    required: [true, 'Pay period start date is required'],
    index: true
  },
  payPeriodEnd: {
    type: Date,
    required: [true, 'Pay period end date is required'],
    index: true
  },
  exceptionType: {
    type: String,
    enum: [
      'missing_timesheet',
      'unapproved_leave',
      'missing_expenses',
      'overtime_approval',
      'negative_balance',
      'missing_clockout',
      'duplicate_entries',
      'other'
    ],
    required: [true, 'Exception type is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolution: {
    type: String,
    maxlength: [1000, 'Resolution cannot exceed 1000 characters']
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  affectedAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
payrollExceptionSchema.index({ employee: 1, payPeriodStart: 1, payPeriodEnd: 1 });
payrollExceptionSchema.index({ resolved: 1, severity: 1 });
payrollExceptionSchema.index({ payPeriodStart: 1, resolved: 1 });

// Static method to find unresolved exceptions for a pay period
payrollExceptionSchema.statics.findUnresolvedForPeriod = function(startDate, endDate) {
  return this.find({
    payPeriodStart: { $gte: startDate },
    payPeriodEnd: { $lte: endDate },
    resolved: false
  })
  .populate('employee', 'firstName lastName employeeId department')
  .sort({ severity: -1, createdAt: 1 });
};

// Method to resolve exception
payrollExceptionSchema.methods.resolve = async function(userId, resolution) {
  this.resolved = true;
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  this.resolution = resolution;
  return this.save();
};

const PayrollException = mongoose.model('PayrollException', payrollExceptionSchema);

module.exports = PayrollException;
