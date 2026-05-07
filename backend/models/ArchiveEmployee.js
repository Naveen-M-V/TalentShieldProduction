const mongoose = require('mongoose');

const archiveEmployeeSchema = new mongoose.Schema({
  // Reference back to the original EmployeesHub record (before deletion)
  originalEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    index: true,
    default: null
  },
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true
  },
  department: {
    type: String,
    default: null
  },
  jobTitle: {
    type: String,
    default: null
  },
  startDate: {
    type: Date,
    default: null
  },
  terminationReason: {
    type: String,
    default: null
  },
  exitDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    default: 'Deleted'
  },
  terminatedDate: {
    type: Date,
    default: null
  },
  deletedDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  snapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Simple indexes to avoid startup issues
archiveEmployeeSchema.index({ deletedDate: -1 });

// Create and export model
const ArchiveEmployee = mongoose.model('ArchiveEmployee', archiveEmployeeSchema);

module.exports = ArchiveEmployee;
