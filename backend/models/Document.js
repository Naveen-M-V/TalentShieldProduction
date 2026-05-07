const mongoose = require('mongoose');

/**
 * Document Schema for Employees Only
 * Stores employee documents with approval workflow
 * Profiles DO NOT use this schema
 */
const documentSchema = new mongoose.Schema({
  // Document Reference
  employeeRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: [true, 'Employee reference is required'],
    index: true
  },
  
  // Document Information
  docType: {
    type: String,
    enum: ['certificate', 'id_proof', 'resume', 'contract', 'other'],
    required: [true, 'Document type is required']
  },
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // File Information
  fileUrl: {
    type: String,
    required: [true, 'File URL is required'],
    trim: true
  },
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required']
  },
  
  // Approval Status
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewComments: {
    type: String,
    trim: true,
    maxlength: [1000, 'Review comments cannot exceed 1000 characters']
  },
  
  // Metadata
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: [true, 'Uploaded by reference is required']
  },
  expiryDate: {
    type: Date,
    default: null
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  
  // Version Control
  version: {
    type: Number,
    default: 1
  },
  parentDocument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null
  },
  
  // Activity Tracking
  downloadCount: {
    type: Number,
    default: 0
  },
  lastAccessedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
documentSchema.index({ employeeRef: 1, docType: 1 });
documentSchema.index({ employeeRef: 1, approvalStatus: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ reviewedBy: 1 });
documentSchema.index({ expiryDate: 1 });
documentSchema.index({ createdAt: -1 });

// Virtual for document age in days
documentSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for days until expiry
documentSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate) return null;
  return Math.ceil((this.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
});

// Virtual for is expired
documentSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return this.expiryDate < new Date();
});

// Pre-save middleware to update expiry status
documentSchema.pre('save', function(next) {
  // Auto-update approval status to 'expired' if expired
  if (this.expiryDate && this.expiryDate < new Date() && this.approvalStatus === 'approved') {
    this.approvalStatus = 'expired';
  }
  next();
});

// Static method to get documents by employee
documentSchema.statics.getByEmployee = function(employeeId, options = {}) {
  const query = { employeeRef: employeeId };
  
  if (options.docType) {
    query.docType = options.docType;
  }
  
  if (options.approvalStatus) {
    query.approvalStatus = options.approvalStatus;
  }
  
  return this.find(query)
    .populate('uploadedBy', 'firstName lastName employeeId')
    .populate('reviewedBy', 'firstName lastName employeeId')
    .sort({ createdAt: -1 });
};

// Static method to get pending documents for admin review
documentSchema.statics.getPendingForReview = function() {
  return this.find({ approvalStatus: 'pending' })
    .populate('employeeRef', 'firstName lastName employeeId')
    .populate('uploadedBy', 'firstName lastName employeeId')
    .sort({ createdAt: 1 });
};

// Static method to get expiring documents
documentSchema.statics.getExpiringSoon = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    expiryDate: { 
      $gte: new Date(),
      $lte: futureDate 
    },
    approvalStatus: 'approved'
  })
  .populate('employeeRef', 'firstName lastName employeeId')
  .sort({ expiryDate: 1 });
};

// Instance method to approve document
documentSchema.methods.approve = function(reviewedBy, comments = '') {
  this.approvalStatus = 'approved';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  this.reviewComments = comments;
  return this.save();
};

// Instance method to reject document
documentSchema.methods.reject = function(reviewedBy, comments = '') {
  this.approvalStatus = 'rejected';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  this.reviewComments = comments;
  return this.save();
};

// Instance method to increment download count
documentSchema.methods.incrementDownload = function() {
  this.downloadCount += 1;
  this.lastAccessedAt = new Date();
  return this.save();
};

// Instance method to create new version
documentSchema.methods.createNewVersion = function(newFileUrl, newFileName, newFileSize, newMimeType, uploadedBy) {
  const newDocument = new this.constructor({
    employeeRef: this.employeeRef,
    docType: this.docType,
    title: this.title,
    description: this.description,
    fileUrl: newFileUrl,
    fileName: newFileName,
    fileSize: newFileSize,
    mimeType: newMimeType,
    uploadedBy: uploadedBy,
    expiryDate: this.expiryDate,
    isPublic: this.isPublic,
    tags: [...this.tags],
    version: this.version + 1,
    parentDocument: this._id
  });
  
  return newDocument.save();
};

// Prevent model re-compilation
const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);

module.exports = Document;
