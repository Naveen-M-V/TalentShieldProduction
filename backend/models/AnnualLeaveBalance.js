const mongoose = require('mongoose');

/**
 * Annual Leave Balance Schema
 * Tracks annual leave entitlements, usage, and remaining balance per employee per leave year
 */
const annualLeaveBalanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: true,
    index: true
  },
  leaveYearStart: {
    type: Date,
    required: true,
    index: true
  },
  leaveYearEnd: {
    type: Date,
    required: true
  },
  entitlementDays: {
    type: Number,
    required: true,
    min: 0,
    default: 20 // UK statutory minimum is 28 days including bank holidays
  },
  carryOverDays: {
    type: Number,
    default: 0,
    min: 0
  },
  adjustments: [{
    days: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeHub'
    },
    at: {
      type: Date,
      default: Date.now
    }
  }],
  usedDays: {
    type: Number,
    default: 0,
    min: 0
  },
  importBatchId: {
    type: String,
    index: true
  },
  notes: String
}, {
  timestamps: true
});

// Compound unique index: one balance record per user per leave year
annualLeaveBalanceSchema.index({ user: 1, leaveYearStart: 1 }, { unique: true });

// Virtual field for remaining days
annualLeaveBalanceSchema.virtual('remainingDays').get(function() {
  const adjustmentsTotal = (this.adjustments || []).reduce((sum, adj) => sum + (adj.days || 0), 0);
  return (this.entitlementDays || 0) + (this.carryOverDays || 0) + adjustmentsTotal - (this.usedDays || 0);
});

// Ensure virtuals are included when converting to JSON/Object
annualLeaveBalanceSchema.set('toJSON', { virtuals: true });
annualLeaveBalanceSchema.set('toObject', { virtuals: true });

// Static method to recalculate used days based on approved leave records
annualLeaveBalanceSchema.statics.recalculateUsedDays = async function(userId, leaveYearStart, leaveYearEnd) {
  const LeaveRecord = mongoose.model('LeaveRecord');
  
  // Sum all approved annual leave days within this leave year
  const result = await LeaveRecord.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: 'annual',
        status: 'approved',
        startDate: { $lte: new Date(leaveYearEnd) },
        endDate: { $gte: new Date(leaveYearStart) }
      }
    },
    {
      $group: {
        _id: null,
        totalDays: { $sum: '$days' }
      }
    }
  ]);
  
  const usedDays = result.length > 0 ? result[0].totalDays : 0;
  
  // Update the balance record
  await this.findOneAndUpdate(
    { user: userId, leaveYearStart: new Date(leaveYearStart) },
    { usedDays },
    { new: true }
  );
  
  return usedDays;
};

// Static method to get current leave year balance for a user
annualLeaveBalanceSchema.statics.getCurrentBalance = async function(userId) {
  const now = new Date();
  
  // Find the balance record that covers the current date
  const balance = await this.findOne({
    user: userId,
    leaveYearStart: { $lte: now },
    leaveYearEnd: { $gte: now }
  }).populate('user', 'firstName lastName email vtid');
  
  return balance;
};

module.exports = mongoose.model('AnnualLeaveBalance', annualLeaveBalanceSchema);
