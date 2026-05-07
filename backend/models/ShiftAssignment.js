const mongoose = require('mongoose');

/**
 * Shift Assignment Schema for Employees Only
 * Assigns employees to specific shifts on specific dates
 * Employees ONLY - Profiles CANNOT have shift assignments
 */
const shiftAssignmentSchema = new mongoose.Schema({
  // Employee Reference (EmployeesHub only)
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: [true, 'Employee ID is required'],
    index: true
  },
  groupId: {
    type: String,
    default: null,
    index: true
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  shiftName: {
    type: String,
    default: ''
  },
  assignmentTargetType: {
    type: String,
    enum: ['employee', 'team'],
    default: 'employee'
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null,
    index: true
  },
  teamName: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
  },
  location: {
    type: String,
    enum: ['Office', 'Home', 'Field', 'Client Site'],
    required: [true, 'Location is required'],
    default: 'Office'
  },
  workType: {
    type: String,
    enum: ['Regular', 'Overtime', 'Weekend overtime', 'Client side overtime'],
    required: [true, 'Work type is required'],
    default: 'Regular'
  },
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'On Break', 'Completed', 'Missed', 'Swapped', 'Cancelled'],
    default: 'Scheduled'
  },
  actualStartTime: {
    type: String,
    default: null
  },
  actualEndTime: {
    type: String,
    default: null
  },
  timeEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeEntry',
    default: null
  },
  breakDuration: {
    type: Number,
    default: 0,
    min: [0, 'Break duration cannot be negative']
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedByName: {
    type: String,
    default: ''
  },
  swapRequest: {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeHub', // employee requesting the swap
      default: null
    },
    requestedWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeHub', // target employee for the swap
      default: null
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'None'],
      default: 'None'
    },
    reason: {
      type: String,
      default: ''
    },
    requestedAt: {
      type: Date,
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound indexes covering all common query patterns
shiftAssignmentSchema.index({ employeeId: 1, date: 1 });
shiftAssignmentSchema.index({ groupId: 1, date: 1 });
shiftAssignmentSchema.index({ date: 1, location: 1 });
shiftAssignmentSchema.index({ status: 1, date: 1 });
shiftAssignmentSchema.index({ employeeId: 1, status: 1 });

// Prevent model re-compilation
const ShiftAssignment = mongoose.models.ShiftAssignment || mongoose.model('ShiftAssignment', shiftAssignmentSchema);

module.exports = ShiftAssignment;
