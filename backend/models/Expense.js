const mongoose = require('mongoose');

/**
 * Expense Model
 * Tracks employee expense claims and reimbursements
 * Supports both Receipt and Mileage claim types
 */
const expenseSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: [true, 'Employee reference is required'],
    index: true
  },
  
  // Claim Type
  claimType: {
    type: String,
    enum: ['receipt', 'mileage'],
    required: [true, 'Claim type is required'],
    default: 'receipt'
  },
  
  // Common fields
  date: {
    type: Date,
    required: [true, 'Expense date is required'],
    index: true
  },
  currency: {
    type: String,
    default: 'GBP',
    enum: ['GBP', 'USD', 'EUR']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  
  // Receipt-specific fields
  supplier: {
    type: String,
    trim: true
  },
  receiptValue: {
    type: Number,
    min: [0, 'Receipt value cannot be negative']
  },
  
  // Mileage-specific fields
  mileage: {
    distance: {
      type: Number,
      min: [0, 'Distance cannot be negative']
    },
    unit: {
      type: String,
      enum: ['miles', 'km']
    },
    ratePerUnit: {
      type: Number,
      min: [0, 'Rate cannot be negative']
    },
    destinations: [{
      address: String,
      latitude: Number,
      longitude: Number,
      order: Number
    }],
    calculatedDistance: Number
  },
  
  // Attachments (up to 5 files)
  attachments: [{
    fileName: {
      type: String,
      required: true
    },
    fileUrl: String,
    fileData: Buffer, // Store in MongoDB or use fileUrl for external storage
    mimeType: String,
    fileSize: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Approval workflow
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined', 'paid'],
    default: 'pending',
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',  // Changed: Only employees can approve, not profiles
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  declinedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',  // Changed: Only employees can decline, not profiles
    default: null
  },
  declinedAt: {
    type: Date,
    default: null
  },
  declineReason: {
    type: String,
    maxlength: [500, 'Decline reason cannot exceed 500 characters']
  },
  paidAt: {
    type: Date,
    default: null
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',  // Changed: Only employees can mark as paid, not profiles
    default: null
  },
  
  // Submitted by (for manager submission on behalf of employee)
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',  // Changed: Submitted by employee
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
expenseSchema.index({ employee: 1, date: -1 });
expenseSchema.index({ status: 1, date: -1 });
expenseSchema.index({ category: 1, status: 1 });
expenseSchema.index({ claimType: 1, status: 1 });
expenseSchema.index({ tags: 1 });

// Validation: Limit attachments to 5
expenseSchema.pre('validate', function(next) {
  if (this.attachments && this.attachments.length > 5) {
    next(new Error('Maximum 5 attachments allowed per expense claim'));
  }
  next();
});

// Virtual for display amount
expenseSchema.virtual('displayAmount').get(function() {
  return `${this.currency} ${this.totalAmount.toFixed(2)}`;
});

// Virtual for attachment count
expenseSchema.virtual('attachmentCount').get(function() {
  return this.attachments ? this.attachments.length : 0;
});

// Method to approve expense
expenseSchema.methods.approve = async function(userId) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

// Method to decline expense
expenseSchema.methods.decline = async function(userId, reason) {
  this.status = 'declined';
  this.declinedBy = userId;
  this.declinedAt = new Date();
  this.declineReason = reason;
  return this.save();
};

// Method to mark as paid
expenseSchema.methods.markAsPaid = async function(userId) {
  this.status = 'paid';
  this.paidBy = userId;
  this.paidAt = new Date();
  return this.save();
};

// Static method to get expenses for approval (for managers)
expenseSchema.statics.getPendingApprovals = function(managerId) {
  // TODO: Implement manager-employee relationship check
  return this.find({ status: 'pending' })
    .populate('employee', 'firstName lastName employeeId department')
    .populate('submittedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;
