const mongoose = require('mongoose');

/**
 * Unified Notification Schema for Employees and Profiles
 * Supports dual user system: EmployeesHub and User schemas
 * Handles all system notifications for both employees and profiles
 */
const notificationSchema = new mongoose.Schema({
  // Dual User Support - Exactly one must be provided
  recipientType: {
    type: String,
    enum: ['employee', 'profile'],
    required: [true, 'Recipient type is required']
  },
  employeeRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    default: null,
    validate: {
      validator: function(v) {
        // If recipientType is 'employee', employeeRef is required
        if (this.recipientType === 'employee') {
          return v != null;
        }
        return true;
      },
      message: 'Employee reference is required when recipientType is employee'
    }
  },
  profileRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    validate: {
      validator: function(v) {
        // If recipientType is 'profile', profileRef is required
        if (this.recipientType === 'profile') {
          return v != null;
        }
        return true;
      },
      message: 'Profile reference is required when recipientType is profile'
    }
  },
  
  // Notification Content
  type: {
    type: String,
    required: true,
    enum: [
      'certificate',      // Certificate-related notifications
      'rota',            // Rota/shift notifications  
      'clock-in',        // Clock-in notifications
      'document',        // Document notifications
      'system',          // System notifications
      'welcome',         // Welcome messages
      'profile_created', // Profile creation
      'employee_created', // Employee creation
      'shift_assigned',  // Shift assignments
      'break_started',   // Break notifications
      'work_resumed',    // Work resumed notifications
      'admin_clock_in',  // Admin clock-in
      'admin_clock_out', // Admin clock-out
      'leave',           // Leave request notifications
      'absence',         // Absence detection notifications
      'lateness',        // Lateness detection notifications
      'missed_shift',    // Missed-shift detection notifications
      'reminder',        // General reminders
      'alert',           // Critical alerts
      'objective_request',     // Manager requests objectives from employee
      'objective_approved',    // Manager approves employee objective
      'objective_sent_back',   // Manager sends back employee objective
      'objective_overdue',     // Objective is overdue
      'input_submitted',       // Employee submits progress input
      'review_published',      // Performance review published
      'review_acknowledged',   // Employee acknowledges review
      'expense'                // Expense workflow notifications
    ]
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Read Status
  isRead: {
    type: Boolean,
    default: false
  },
  read: { // Add alias for compatibility with existing code
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  
  // Additional Data
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date,
    default: null // For auto-expiring notifications
  },
  
  // Action Links (optional)
  actionUrl: {
    type: String,
    trim: true,
    default: null
  },
  actionText: {
    type: String,
    trim: true,
    maxlength: [50, 'Action text cannot exceed 50 characters'],
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
notificationSchema.index({ recipientType: 1, employeeRef: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientType: 1, profileRef: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ priority: 1, isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for recipient information
notificationSchema.virtual('recipientInfo', {
  ref: function(doc) {
    return doc.recipientType === 'employee' ? 'EmployeeHub' : 'User';
  },
  localField: function(doc) {
    return doc.recipientType === 'employee' ? 'employeeRef' : 'profileRef';
  },
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to validate dual ownership
notificationSchema.pre('save', function(next) {
  // Ensure exactly one reference is provided
  const hasEmployeeRef = this.employeeRef != null;
  const hasProfileRef = this.profileRef != null;
  
  if (this.recipientType === 'employee' && !hasEmployeeRef) {
    return next(new Error('Employee reference is required when recipientType is employee'));
  }
  
  if (this.recipientType === 'profile' && !hasProfileRef) {
    return next(new Error('Profile reference is required when recipientType is profile'));
  }
  
  if (hasEmployeeRef && hasProfileRef) {
    return next(new Error('Cannot have both employeeRef and profileRef'));
  }
  
  // Sync read status fields
  if (this.isRead !== this.read) {
    this.read = this.isRead;
  }
  
  next();
});

// Static method to create notification for employee
notificationSchema.statics.createForEmployee = function(employeeId, type, title, message, priority = 'medium', metadata = {}) {
  return this.create({
    recipientType: 'employee',
    employeeRef: employeeId,
    type,
    title,
    message,
    priority,
    metadata
  });
};

// Static method to create notification for profile
notificationSchema.statics.createForProfile = function(profileId, type, title, message, priority = 'medium', metadata = {}) {
  return this.create({
    recipientType: 'profile',
    profileRef: profileId,
    type,
    title,
    message,
    priority,
    metadata
  });
};

// Static method to get notifications for employee
notificationSchema.statics.getByEmployee = function(employeeId, options = {}) {
  const query = { recipientType: 'employee', employeeRef: employeeId };
  
  if (options.isRead !== undefined) {
    query.isRead = options.isRead;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .populate('recipientInfo', 'firstName lastName email employeeId vtid')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Static method to get notifications for profile
notificationSchema.statics.getByProfile = function(profileId, options = {}) {
  const query = { recipientType: 'profile', profileRef: profileId };
  
  if (options.isRead !== undefined) {
    query.isRead = options.isRead;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .populate('recipientInfo', 'firstName lastName email vtid')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Static method to get unread count for employee
notificationSchema.statics.getUnreadCountForEmployee = function(employeeId) {
  return this.countDocuments({
    recipientType: 'employee',
    employeeRef: employeeId,
    isRead: false
  });
};

// Static method to get unread count for profile
notificationSchema.statics.getUnreadCountForProfile = function(profileId) {
  return this.countDocuments({
    recipientType: 'profile',
    profileRef: profileId,
    isRead: false
  });
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.read = true; // Set both fields for compatibility
  this.readAt = new Date();
  return await this.save();
};

// Instance method to mark as unread
notificationSchema.methods.markAsUnread = async function() {
  this.isRead = false;
  this.read = false; // Set both fields for compatibility
  this.readAt = null;
  return await this.save();
};

// Prevent model re-compilation
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

module.exports = Notification;
