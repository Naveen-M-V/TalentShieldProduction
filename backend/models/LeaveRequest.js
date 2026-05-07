const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeHub',
      required: true,
      index: true
    },
    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeHub',
      required: true
    },
    leaveType: {
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
        'Medical / Dental Appointment'
      ],
      default: 'Annual Leave',
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    numberOfDays: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 500
    },
    status: {
      type: String,
      enum: ['Draft', 'Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Draft'
    },
    adminComment: {
      type: String,
      maxlength: 300
    },
    rejectionReason: {
      type: String,
      maxlength: 300
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeHub'
    },
    approvedAt: {
      type: Date
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeHub'
    },
    rejectedAt: {
      type: Date
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeHub'
    },
    cancelledByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null
    },
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String,
      maxlength: 500,
      required: false,
      default: ''
    },
    // Actor/Subject Tracking (for admin actions)
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
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
leaveRequestSchema.index({ employeeId: 1, status: 1 });
leaveRequestSchema.index({ approverId: 1, status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });

// Calculate number of days before saving
leaveRequestSchema.pre('save', function(next) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    this.numberOfDays = diffDays;
  }
  next();
});

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
