const mongoose = require('mongoose');

/**
 * Time Entry Schema for Employees Only
 * Tracks employee clock in/out times with multi-session support
 */
const timeEntrySchema = new mongoose.Schema({
  // Employee/User Reference (supports both EmployeeHub and User/Admin)
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: false,
    index: true
  },
  
  // Date Information (YYYY-MM-DD format for consistency)
  date: {
    type: String, // Change to String to store YYYY-MM-DD
    required: [true, 'Date is required'],
    index: true
  },
  
  // Overall Status for the day
  status: {
    type: String,
    enum: ['not-started', 'clocked-in', 'on-break', 'clocked-out'],
    default: 'not-started'
  },
  
  // Multi-session support
  sessions: [{
    clockIn: {
      type: Date,
      required: true
    },
    clockOut: {
      type: Date,
      default: null
    },
    breakIn: {
      type: Date,
      default: null
    },
    breakOut: {
      type: Date,
      default: null
    },
    location: {
      type: String,
      default: 'Office'
    },
    workType: {
      type: String,
      default: 'Regular'
    },
    notes: {
      type: String,
      default: ''
    },
    gpsLocationIn: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      capturedAt: { type: Date, default: null }
    },
    gpsLocationOut: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      capturedAt: { type: Date, default: null }
    }
  }],
  
  // Legacy fields for backward compatibility
  clockIn: {
    type: Date,
    default: null
  },
  clockOut: {
    type: Date,
    default: null
  },
  breakIn: {
    type: Date,
    default: null
  },
  breakOut: {
    type: Date,
    default: null
  },
  breakDuration: {
    type: Number,
    default: 0
  },
  totalHours: {
    type: Number,
    default: 0
  },
  
  // Actor/Subject Tracking (for admin actions on behalf of employees)
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: false,
    default: null
  },
  performedByRole: {
    type: String,
    enum: ['admin', 'super-admin', 'employee', 'hr'],
    required: false,
    default: null
  },
  isAdminAction: {
    type: Boolean,
    default: false
  },
  actionNotes: {
    type: String,
    default: null
  },
  
  // Location and Work Type
  location: {
    type: String,
    default: null
  },
  workType: {
    type: String,
    default: 'regular'
  },
  notes: {
    type: String,
    default: ''
  },
  
  // GPS location tracking (legacy)
  gpsLocationIn: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    accuracy: { type: Number, default: null },
    timestamp: { type: Date, default: null }
  },
  gpsLocationOut: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    accuracy: { type: Number, default: null },
    timestamp: { type: Date, default: null }
  },
  
  // Approval System
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
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
  approvalComments: {
    type: String,
    default: ''
  },
  
  // Additional fields for compatibility
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    default: null
  },
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShiftAssignment',
    default: null
  },
  scheduledHours: {
    type: Number,
    default: 0
  },
  variance: {
    type: Number,
    default: 0
  },
  breaks: [{
    breakIn: Date,
    breakOut: Date,
    duration: Number,
    notes: String
  }]
}, {
  timestamps: true
});

// Indexes for better performance
timeEntrySchema.index({ employee: 1, date: -1 });
timeEntrySchema.index({ date: 1, status: 1 });
timeEntrySchema.index({ employee: 1, clockIn: -1 });

// Pre-save middleware to update total hours and maintain backward compatibility
timeEntrySchema.pre('save', function(next) {
  if (this.status) this.status = this.status.replace(/_/g, '-');

  // Update total hours based on sessions
  if (this.isModified('sessions') && this.sessions && this.sessions.length > 0) {
    let totalHours = 0;
    this.sessions.forEach(session => {
      if (session.clockIn && session.clockOut) {
        const duration = (session.clockOut - session.clockIn) / (1000 * 60 * 60); // Convert to hours
        totalHours += duration;
      }
    });
    this.totalHours = Math.round(totalHours * 100) / 100;
    
    // Update legacy fields for backward compatibility
    if (this.sessions.length > 0) {
      const firstSession = this.sessions[0];
      const lastSession = this.sessions[this.sessions.length - 1];
      
      this.clockIn = firstSession.clockIn;
      this.clockOut = lastSession.clockOut || null;
      
      // Find the last break
      for (let i = this.sessions.length - 1; i >= 0; i--) {
        if (this.sessions[i].breakIn) {
          this.breakIn = this.sessions[i].breakIn;
          this.breakOut = this.sessions[i].breakOut || null;
          break;
        }
      }
    }
  }
  next();
});

const normalizeUpdateStatus = function(next) {
  const update = this.getUpdate();

  if (update?.status) {
    update.status = String(update.status).replace(/_/g, '-');
  }

  if (update?.$set?.status) {
    update.$set.status = String(update.$set.status).replace(/_/g, '-');
  }

  next();
};

timeEntrySchema.pre('findOneAndUpdate', normalizeUpdateStatus);
timeEntrySchema.pre('updateOne', normalizeUpdateStatus);

// Compile the model
const TimeEntry = mongoose.model('TimeEntry', timeEntrySchema);

module.exports = TimeEntry;