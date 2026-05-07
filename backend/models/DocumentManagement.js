const mongoose = require('mongoose');


/**
 * Unified Document Schema for Document Management
 * Supports admin and employee uploads, folder organization, and robust access control
 */
const documentManagementSchema = new mongoose.Schema({
  // Document Information
  name: { type: String, required: true, trim: true, maxlength: 255 },
  fileUrl: { type: String, required: false, trim: true }, // Optional if using fileData
  fileData: { type: Buffer, required: false }, // Optional if using fileUrl
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },

  // Ownership and Upload Info
  // uploaderModel tells Mongoose which collection uploadedBy points to
  uploaderModel: { type: String, enum: ['EmployeeHub', 'User'], default: 'EmployeeHub' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'uploaderModel', required: true },
  uploadedByRole: { type: String, enum: ['admin', 'employee'], required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeHub', default: null },
  
  // Actor/Subject Tracking
  performedByAdmin: { type: Boolean, default: false },
  targetEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeHub', default: null },

  // Folder Organization
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },

  // Access Control
  accessControl: {
    visibility: { type: String, enum: ['all', 'admin', 'employee', 'custom'], default: 'all' },
    allowedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },

  // Categorization
  category: { type: String, enum: ['passport', 'visa', 'contract', 'certificate', 'id_proof', 'resume', 'e_learning', 'other'], default: 'other' },
  tags: [{ type: String, trim: true, maxlength: 50 }],

  // Version Control
  version: { type: Number, default: 1 },
  parentDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentManagement', default: null },

  // Expiry and Reminders
  expiresOn: { type: Date, default: null },
  reminderEnabled: { type: Boolean, default: false },
  reminderDays: { type: Number, default: 30, min: 1, max: 365 },
  lastReminderSent: { type: Date, default: null },

  // Status and Metadata
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  downloadCount: { type: Number, default: 0 },
  lastAccessedAt: { type: Date, default: null },

  // Audit Trail
  auditLog: [{
    action: { type: String, enum: ['uploaded', 'viewed', 'downloaded', 'shared', 'updated', 'archived', 'deleted'], required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeHub', required: false },
    timestamp: { type: Date, default: Date.now },
    details: { type: String, maxlength: 500 }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
documentManagementSchema.index({ folderId: 1, isActive: 1 });
documentManagementSchema.index({ uploadedBy: 1 });
documentManagementSchema.index({ ownerId: 1 });
documentManagementSchema.index({ expiresOn: 1 });
documentManagementSchema.index({ category: 1 });
documentManagementSchema.index({ createdAt: -1 });
documentManagementSchema.index({ name: 'text', category: 'text' });

// Virtual for document age in days
documentManagementSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for days until expiry
documentManagementSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiresOn) return null;
  return Math.ceil((this.expiresOn - Date.now()) / (1000 * 60 * 60 * 24));
});

// Virtual for is expired
documentManagementSchema.virtual('isExpired').get(function() {
  if (!this.expiresOn) return false;
  return this.expiresOn < new Date();
});

// Virtual for file size in human readable format
documentManagementSchema.virtual('fileSizeFormatted').get(function() {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = this.fileSize;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
});

// Provide legacy-compatible virtuals
documentManagementSchema.virtual('fileName').get(function() {
  return this.name;
});

// Backwards-compat: expose employeeId as alias for ownerId
documentManagementSchema.virtual('employeeId').get(function() {
  return this.ownerId;
});

// Ensure virtuals are included when converting to JSON / Object
documentManagementSchema.set('toObject', { virtuals: true });
documentManagementSchema.set('toJSON', { virtuals: true });

// Pre-save middleware to handle expiry
documentManagementSchema.pre('save', function(next) {
  if (this.expiresOn && this.expiresOn < new Date() && this.isActive) {
    this.isActive = false;
  }
  next();
});

// Static method to get documents by folder
documentManagementSchema.statics.getByFolder = function(folderId, options = {}) {
  const query = { folderId, isActive: true };

  // By default, hide archived documents to match folder counts and standard UI behavior
  if (!options.includeArchived) query.isArchived = false;

  if (options.category) query.category = options.category;
  if (options.ownerId) query.ownerId = options.ownerId;

  return this.find(query)
    .populate('uploadedBy', 'firstName lastName email')
    .populate('ownerId', 'firstName lastName employeeId')
    .sort({ createdAt: -1 });
};

// Static method to get expiring documents
documentManagementSchema.statics.getExpiringSoon = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    expiresOn: { 
      $gte: new Date(),
      $lte: futureDate 
    },
    isActive: true,
    reminderEnabled: true
  })
  .populate('folderId', 'name')
  .populate('employeeId', 'firstName lastName employeeId')
  .sort({ expiresOn: 1 });
};

// Static method to search documents
documentManagementSchema.statics.searchDocuments = function(searchTerm, options = {}) {
  const query = {
    $text: { $search: searchTerm },
    isActive: true
  };
  
  if (options.folderId) {
    query.folderId = options.folderId;
  }
  
  return this.find(query)
    .populate('folderId', 'name')
    .populate('uploadedBy', 'firstName lastName email')
    .populate('ownerId', 'firstName lastName employeeId')
    .sort({ score: { $meta: 'textScore' } });
};

// Instance method to check permission
documentManagementSchema.methods.hasPermission = function(action, user) {
  // action is currently unused but kept for future extension
  if (!user) return false;
  const userRole = user.role || 'employee';
  const userId = user._id || user.userId || user.id || null;
  const userEmployeeId = user.employeeId || null;

  if (userRole === 'admin' || userRole === 'super-admin') return true;

  const ac = this.accessControl || { visibility: 'all', allowedUserIds: [] };

  if (ac.visibility === 'all') return true;
  if (ac.visibility === 'admin') return false;
  if (ac.visibility === 'employee') {
    // allow if ownerId matches employeeId
    if (this.ownerId && userEmployeeId && String(this.ownerId) === String(userEmployeeId)) return true;
    // also check if user's id directly matches ownerId (for employee users where id IS the employeeHub _id)
    if (this.ownerId && userId && String(this.ownerId) === String(userId)) return true;
    // allow if uploader matches
    if (this.uploadedBy && userId && String(this.uploadedBy) === String(userId)) return true;
    if (this.uploadedBy && userEmployeeId && String(this.uploadedBy) === String(userEmployeeId)) return true;
    return false;
  }
  if (ac.visibility === 'custom') {
    if (!Array.isArray(ac.allowedUserIds)) return false;
    return ac.allowedUserIds.some(id => String(id) === String(userId) || (userEmployeeId && String(id) === String(userEmployeeId)));
  }
  return false;
};

// Instance method to add audit log entry
documentManagementSchema.methods.addAuditLog = function(action, performedBy, details = '') {
  this.auditLog.push({
    action,
    performedBy,
    timestamp: new Date(),
    details
  });
  return this.save();
};

// Instance method to increment download count
documentManagementSchema.methods.incrementDownload = function(userId) {
  this.downloadCount += 1;
  this.lastAccessedAt = new Date();
  this.addAuditLog('downloaded', userId, 'Document downloaded');
  return this.save();
};

// Instance method to create new version
documentManagementSchema.methods.createNewVersion = function(fileData, newFileName, newFileSize, newMimeType, uploadedBy) {
  const newDocument = new this.constructor({
    folderId: this.folderId,
    ownerId: this.ownerId,
    name: newFileName,
    fileData: fileData,
    fileUrl: null,
    fileSize: newFileSize,
    mimeType: newMimeType,
    version: this.version + 1,
    parentDocument: this._id,
    category: this.category,
    tags: [...this.tags],
    uploadedBy: uploadedBy,
    uploadedByRole: this.uploadedByRole,
    accessControl: { ...this.accessControl },
    expiresOn: this.expiresOn,
    reminderEnabled: this.reminderEnabled,
    reminderDays: this.reminderDays
  });

  return newDocument.save();
};

// Instance method to archive document
documentManagementSchema.methods.archive = function(userId) {
  this.isArchived = true;
  this.isActive = false;
  this.addAuditLog('archived', userId, 'Document archived');
  return this.save();
};

// Prevent model re-compilation
const DocumentManagement = mongoose.models.DocumentManagement || mongoose.model('DocumentManagement', documentManagementSchema);

module.exports = DocumentManagement;
