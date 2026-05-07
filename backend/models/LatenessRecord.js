const mongoose = require('mongoose');

/**
 * Lateness Record Model
 * Tracks employee lateness incidents
 */
const latenessRecordSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: [true, 'Employee reference is required'],
    index: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true
  },
  scheduledStart: {
    type: Date,
    required: [true, 'Scheduled start time is required']
  },
  actualStart: {
    type: Date,
    required: [true, 'Actual start time is required']
  },
  minutesLate: {
    type: Number,
    required: [true, 'Minutes late is required'],
    min: [0, 'Minutes late cannot be negative']
  },
  // Link to the shift assignment for this lateness incident
  shiftAssignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShiftAssignment',
    default: null
  },
  reason: {
    type: String,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  excused: {
    type: Boolean,
    default: false
  },
  excusedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    default: null
  },
  excusedAt: {
    type: Date,
    default: null
  },
  excuseReason: {
    type: String,
    maxlength: [500, 'Excuse reason cannot exceed 500 characters']
  },
  // Actor/Subject Tracking (for admin-created lateness records)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: false,
    default: null
  },
  createdByRole: {
    type: String,
    enum: ['admin', 'super-admin', 'hr', 'manager', 'system'],
    required: false,
    default: 'system'
  },
  isAdminCreated: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
latenessRecordSchema.index({ employee: 1, date: -1 });
latenessRecordSchema.index({ date: 1, excused: 1 });
latenessRecordSchema.index({ minutesLate: -1 });

// Virtual for formatted lateness
latenessRecordSchema.virtual('formattedLateness').get(function() {
  const hours = Math.floor(this.minutesLate / 60);
  const minutes = this.minutesLate % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

// Static method to calculate lateness stats for an employee
latenessRecordSchema.statics.getEmployeeStats = async function(employeeId, startDate, endDate) {
  const records = await this.find({
    employee: employeeId,
    date: { $gte: startDate, $lte: endDate }
  });
  
  return {
    totalIncidents: records.length,
    excusedIncidents: records.filter(r => r.excused).length,
    unexcusedIncidents: records.filter(r => !r.excused).length,
    totalMinutesLate: records.reduce((sum, r) => sum + r.minutesLate, 0),
    averageMinutesLate: records.length > 0 
      ? (records.reduce((sum, r) => sum + r.minutesLate, 0) / records.length).toFixed(2)
      : 0
  };
};

// Method to excuse lateness
latenessRecordSchema.methods.excuse = async function(userId, reason) {
  this.excused = true;
  this.excusedBy = userId;
  this.excusedAt = new Date();
  this.excuseReason = reason;
  return this.save();
};

const LatenessRecord = mongoose.model('LatenessRecord', latenessRecordSchema);

module.exports = LatenessRecord;
