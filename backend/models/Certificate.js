const mongoose = require('mongoose');

/**
 * Unified Certificate Schema for Employees and Profiles
 * Supports dual ownership: employeeRef OR profileRef
 * Stores certificates with approval workflow and expiry tracking
 */
const certificateSchema = new mongoose.Schema({
  // Dual Ownership - Exactly one must be provided
  ownerType: {
    type: String,
    enum: ['employee', 'profile'],
    required: [true, 'Owner type is required']
  },
  employeeRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    default: null,
    validate: {
      validator: function(v) {
        // If ownerType is 'employee', employeeRef is required
        if (this.ownerType === 'employee') {
          return v != null;
        }
        return true;
      },
      message: 'Employee reference is required when ownerType is employee'
    }
  },
  profileRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    validate: {
      validator: function(v) {
        // If ownerType is 'profile', profileRef is required
        if (this.ownerType === 'profile') {
          return v != null;
        }
        return true;
      },
      message: 'Profile reference is required when ownerType is profile'
    }
  },
  
  // Certificate Information
  title: {
    type: String,
    required: [true, 'Certificate title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  certificateNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Certificate number cannot exceed 100 characters']
  },
  issuingOrganization: {
    type: String,
    required: [true, 'Issuing organization is required'],
    trim: true,
    maxlength: [200, 'Issuing organization cannot exceed 200 characters']
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
  
  // Date Information
  issueDate: {
    type: Date,
    required: [true, 'Issue date is required']
  },
  expiryDate: {
    type: Date,
    default: null
  },
  
  // Approval Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: [true, 'Uploaded by reference is required']
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
  
  // Certificate Categories
  category: {
    type: String,
    enum: [
      'technical',
      'professional',
      'safety',
      'medical',
      'educational',
      'language',
      'management',
      'other'
    ],
    default: 'other'
  },
  level: {
    type: String,
    enum: ['basic', 'intermediate', 'advanced', 'expert'],
    default: 'basic'
  },
  
  // Metadata
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  
  // Activity Tracking
  downloadCount: {
    type: Number,
    default: 0
  },
  lastAccessedAt: {
    type: Date,
    default: null
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDate: {
    type: Date,
    default: null
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
certificateSchema.index({ ownerType: 1, employeeRef: 1 });
certificateSchema.index({ ownerType: 1, profileRef: 1 });
certificateSchema.index({ status: 1 });
certificateSchema.index({ expiryDate: 1 });
certificateSchema.index({ uploadedBy: 1 });
certificateSchema.index({ reviewedBy: 1 });
certificateSchema.index({ category: 1 });
certificateSchema.index({ createdAt: -1 });

// Virtual for certificate age in days
certificateSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for days until expiry
certificateSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate) return null;
  return Math.ceil((this.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
});

// Virtual for is expired
certificateSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return this.expiryDate < new Date();
});

// Virtual for is expiring soon (within 30 days)
certificateSchema.virtual('isExpiringSoon').get(function() {
  if (!this.expiryDate) return false;
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.expiryDate <= thirtyDaysFromNow && this.expiryDate > new Date();
});

// Virtual for owner information
certificateSchema.virtual('ownerInfo', {
  ref: function(doc) {
    return doc.ownerType === 'employee' ? 'EmployeeHub' : 'User';
  },
  localField: function(doc) {
    return doc.ownerType === 'employee' ? 'employeeRef' : 'profileRef';
  },
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to validate dual ownership
certificateSchema.pre('save', function(next) {
  // Ensure exactly one reference is provided
  const hasEmployeeRef = this.employeeRef != null;
  const hasProfileRef = this.profileRef != null;
  
  if (this.ownerType === 'employee' && !hasEmployeeRef) {
    return next(new Error('Employee reference is required when ownerType is employee'));
  }
  
  if (this.ownerType === 'profile' && !hasProfileRef) {
    return next(new Error('Profile reference is required when ownerType is profile'));
  }
  
  if (hasEmployeeRef && hasProfileRef) {
    return next(new Error('Cannot have both employeeRef and profileRef'));
  }
  
  // Auto-update status to 'expired' if expired
  if (this.expiryDate && this.expiryDate < new Date() && this.status === 'approved') {
    this.status = 'expired';
  }
  
  next();
});

// Static method to get certificates by employee
certificateSchema.statics.getByEmployee = function(employeeId, options = {}) {
  const query = { ownerType: 'employee', employeeRef: employeeId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.category) {
    query.category = options.category;
  }
  
  return this.find(query)
    .populate('uploadedBy', 'firstName lastName employeeId')
    .populate('reviewedBy', 'firstName lastName employeeId')
    .sort({ createdAt: -1 });
};

// Static method to get certificates by profile
certificateSchema.statics.getByProfile = function(profileId, options = {}) {
  const query = { ownerType: 'profile', profileRef: profileId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.category) {
    query.category = options.category;
  }
  
  return this.find(query)
    .populate('uploadedBy', 'firstName lastName employeeId')
    .populate('reviewedBy', 'firstName lastName employeeId')
    .sort({ createdAt: -1 });
};

// Static method to get pending certificates for admin review
certificateSchema.statics.getPendingForReview = function() {
  return this.find({ status: 'pending' })
    .populate({
      path: 'ownerInfo',
      select: 'firstName lastName employeeId vtid email'
    })
    .populate('uploadedBy', 'firstName lastName employeeId')
    .sort({ createdAt: 1 });
};

// Static method to get expiring certificates
certificateSchema.statics.getExpiringSoon = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    expiryDate: { 
      $gte: new Date(),
      $lte: futureDate 
    },
    status: 'approved'
  })
  .populate({
    path: 'ownerInfo',
    select: 'firstName lastName employeeId vtid email'
  })
  .sort({ expiryDate: 1 });
};

// Static method to get expired certificates
certificateSchema.statics.getExpired = function() {
  return this.find({
    expiryDate: { $lt: new Date() },
    status: { $in: ['approved', 'expired'] }
  })
  .populate({
    path: 'ownerInfo',
    select: 'firstName lastName employeeId vtid email'
  })
  .sort({ expiryDate: -1 });
};

// Instance method to approve certificate
certificateSchema.methods.approve = function(reviewedBy, comments = '') {
  this.status = 'approved';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  this.reviewComments = comments;
  return this.save();
};

// Instance method to reject certificate
certificateSchema.methods.reject = function(reviewedBy, comments = '') {
  this.status = 'rejected';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  this.reviewComments = comments;
  return this.save();
};

// Instance method to verify certificate
certificateSchema.methods.verify = function(verifiedBy) {
  this.isVerified = true;
  this.verificationDate = new Date();
  this.verifiedBy = verifiedBy;
  return this.save();
};

// Instance method to increment download count
certificateSchema.methods.incrementDownload = function() {
  this.downloadCount += 1;
  this.lastAccessedAt = new Date();
  return this.save();
};

// Prevent model re-compilation
const Certificate = mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);

module.exports = Certificate;
