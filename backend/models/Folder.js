const mongoose = require('mongoose');

/**
 * Simplified Folder Schema for Document Management Module
 */
const folderSchema = new mongoose.Schema({
  // Folder Information
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true,
    maxlength: [100, 'Folder name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  
  // Organization
  parentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },

  // Access Control
  permissions: {
    // Employee-based permissions (for employee users with EmployeeHub records)
    viewEmployeeIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeHub',
      index: true
    }],
    editEmployeeIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeHub',
      index: true
    }],
    deleteEmployeeIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeHub',
      index: true
    }],
    // User-based permissions (for profile-type admins with User records only)
    viewUserIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    }],
    editUserIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    }],
    deleteUserIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    }]
  },
  
  // Metadata
  createdBy: {
    type: String, // Changed from ObjectId to String for simplicity
    required: false,
    default: null
  },

  createdByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },

  createdByEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: false,
    default: null,
    index: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Instance method to check permission (supports both employee and user-based)
folderSchema.methods.hasPermission = function(action, user) {
  const role = user?.role || 'employee';
  if (role === 'admin' || role === 'super-admin') return true;

  const employeeId = user?.employeeId;
  const userId = user?._id || user?.userId || user?.id;
  const empIdStr = employeeId ? employeeId.toString() : null;
  const userIdStr = userId ? userId.toString() : null;

  const perms = this.permissions || {};
  
  // Employee-based permission arrays
  const viewEmpIds = Array.isArray(perms.viewEmployeeIds) ? perms.viewEmployeeIds.map(v => v.toString()) : [];
  const editEmpIds = Array.isArray(perms.editEmployeeIds) ? perms.editEmployeeIds.map(v => v.toString()) : [];
  const deleteEmpIds = Array.isArray(perms.deleteEmployeeIds) ? perms.deleteEmployeeIds.map(v => v.toString()) : [];
  
  // User-based permission arrays (for profile-type admins)
  const viewUserIds = Array.isArray(perms.viewUserIds) ? perms.viewUserIds.map(v => v.toString()) : [];
  const editUserIds = Array.isArray(perms.editUserIds) ? perms.editUserIds.map(v => v.toString()) : [];
  const deleteUserIds = Array.isArray(perms.deleteUserIds) ? perms.deleteUserIds.map(v => v.toString()) : [];

  // Check permissions based on action type
  if (action === 'view' || action === 'download') {
    // Check employee permissions
    if (empIdStr && (viewEmpIds.includes(empIdStr) || editEmpIds.includes(empIdStr) || deleteEmpIds.includes(empIdStr))) {
      return true;
    }
    // Check user permissions (for profile admins)
    if (userIdStr && (viewUserIds.includes(userIdStr) || editUserIds.includes(userIdStr) || deleteUserIds.includes(userIdStr))) {
      return true;
    }
    return false;
  }
  
  if (action === 'edit' || action === 'upload') {
    // Check employee permissions
    if (empIdStr && (editEmpIds.includes(empIdStr) || deleteEmpIds.includes(empIdStr))) {
      return true;
    }
    // Check user permissions (for profile admins)
    if (userIdStr && (editUserIds.includes(userIdStr) || deleteUserIds.includes(userIdStr))) {
      return true;
    }
    return false;
  }
  
  if (action === 'delete') {
    // Check employee permissions
    if (empIdStr && deleteEmpIds.includes(empIdStr)) {
      return true;
    }
    // Check user permissions (for profile admins)
    if (userIdStr && deleteUserIds.includes(userIdStr)) {
      return true;
    }
    return false;
  }

  // Legacy fallback (older folders)
  const legacy = perms[action];
  if (!legacy) return false;
  if (!Array.isArray(legacy)) return false;
  return legacy.includes(role);
};

// Prevent model re-compilation
const Folder = mongoose.models.Folder || mongoose.model('Folder', folderSchema);

module.exports = Folder;
