const mongoose = require('mongoose');

/**
 * Leave Record Schema
 * Tracks individual leave/absence records for employees
 * Supports annual leave, sick leave, unpaid leave, and absences
 */
const leaveRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'Annual Leave',
      'Bank Holiday',
      'Maternity Leave',
      'Paternity Leave',
      'Adoption Leave',
      'Shared Parental Leave',
      'Parental Leave',
      'Carer\'s Leave',
      'Parental Bereavement Leave',
      'Neonatal Care Leave',
      'Time Off for Dependants',
      'Sick Leave',
      'Jury Service',
      'Trade Union Duties',
      'Public Duty Leave',
      'Study / Training Leave',
      'Medical / Dental Appointment',
      'Absent'
    ],
    default: 'Annual Leave',
    required: true
  },
  status: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved',
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  days: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub'  // Changed: Only employees can approve, not profiles
  },
  approvedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub'  // Changed: Only employees can reject, not profiles
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub'  // Changed: Created by employee
  },
  notes: String
}, {
  timestamps: true
});

// Compound indexes for efficient queries
// Performance indexes
leaveRecordSchema.index({ user: 1, startDate: 1 });
leaveRecordSchema.index({ startDate: 1, endDate: 1 });
leaveRecordSchema.index({ type: 1, status: 1 });
// NEW: Compound indexes for date range queries
leaveRecordSchema.index({ user: 1, startDate: 1, endDate: 1 }); // User's leaves in range
leaveRecordSchema.index({ status: 1, startDate: 1 }); // Approved leaves by date
leaveRecordSchema.index({ type: 1, status: 1, startDate: 1 }); // Leave type filtering

// Method to check if leave record covers a specific date
leaveRecordSchema.methods.coversDate = function(date) {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  const start = new Date(this.startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(this.endDate);
  end.setHours(23, 59, 59, 999);
  
  return checkDate >= start && checkDate <= end;
};

// Static method to find active leave for a user on a specific date
leaveRecordSchema.statics.findActiveLeave = async function(userId, date = new Date()) {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  const nextDay = new Date(checkDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  return await this.findOne({
    user: userId,
    status: 'approved',
    startDate: { $lte: nextDay },
    endDate: { $gte: checkDate }
  }).populate('user', 'firstName lastName email vtid');
};

// Static method to get all approved leave records for a date range
leaveRecordSchema.statics.findLeaveInRange = async function(userId, startDate, endDate) {
  return await this.find({
    user: userId,
    status: 'approved',
    $or: [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
    ]
  }).sort({ startDate: 1 });
};

// Pre-save hook to update annual leave balance if approved
leaveRecordSchema.post('save', async function(doc) {
  if (doc.type === 'annual' && doc.status === 'approved') {
    const AnnualLeaveBalance = mongoose.model('AnnualLeaveBalance');
    
    // Find the leave year that covers the start date
    const balance = await AnnualLeaveBalance.findOne({
      user: doc.user,
      leaveYearStart: { $lte: doc.startDate },
      leaveYearEnd: { $gte: doc.startDate }
    });
    
    if (balance) {
      // Recalculate used days
      await AnnualLeaveBalance.recalculateUsedDays(
        doc.user,
        balance.leaveYearStart,
        balance.leaveYearEnd
      );
    }
  }
});

// Post-delete hook to update annual leave balance
leaveRecordSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.type === 'annual' && doc.status === 'approved') {
    const AnnualLeaveBalance = mongoose.model('AnnualLeaveBalance');
    
    const balance = await AnnualLeaveBalance.findOne({
      user: doc.user,
      leaveYearStart: { $lte: doc.startDate },
      leaveYearEnd: { $gte: doc.startDate }
    });
    
    if (balance) {
      await AnnualLeaveBalance.recalculateUsedDays(
        doc.user,
        balance.leaveYearStart,
        balance.leaveYearEnd
      );
    }
  }
});

module.exports = mongoose.model('LeaveRecord', leaveRecordSchema);
