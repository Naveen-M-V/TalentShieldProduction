const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * Employee Hub Model
 * Stores comprehensive employee information for the Employee Hub section
 * Includes personal details, job information, team assignments, and authentication
 * NOW INCLUDES LOGIN CREDENTIALS FOR EMPLOYEES AND ADMINS
 */
const employeeHubSchema = new mongoose.Schema({
  // Personal Information
  title: {
    type: String,
    trim: true
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  middleName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Unspecified'],
    default: 'Unspecified'
  },
  ethnicity: {
    type: String,
    default: 'Unspecified'
  },
  dateOfBirth: {
    type: Date
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  phone: {
    type: String,
    trim: true
  },
  workPhone: {
    type: String,
    trim: true
  },
  profilePhoto: {
    type: String,
    required: false,
    trim: true
  },
  
  // Job Information
  jobTitle: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  team: {
    type: String,
    required: false,
    trim: true
  },
  
  // Office/Location Information
  office: {
    type: String,
    required: false, // Made optional since frontend uses OrganisationName instead
    trim: true,
    default: ''
  },
  workLocation: {
    type: String,
    enum: ['On-site', 'Remote', 'Hybrid'],
    default: 'On-site'
  },
  
  // Profile Display
  avatar: {
    type: String, // URL to avatar image
    default: null
  },
  initials: {
    type: String,
    trim: true,
    maxlength: 3
  },
  color: {
    type: String, // Hex color for avatar background
    default: '#3B82F6'
  },
  
  // Employment Details
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  probationEndDate: {
    type: Date
  },
  endDate: {
    type: Date,
    default: null
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Intern'],
    default: 'Full-time'
  },
  
  // Manager/Reporting
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    default: null
  },
  
  // Role & Authority (for approval hierarchy)
  role: {
    type: String,
    enum: ['employee', 'manager', 'senior-manager', 'hr', 'admin', 'super-admin'],
    default: 'employee',
    required: true,
    index: true
  },
  
  // User Account Link (optional - only if profile exists)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Status
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave', 'Terminated'],
    default: 'Active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  terminatedDate: {
    type: Date,
    default: null
  },
  terminationNote: {
    type: String,
    default: null
  },
  
  // Authentication & Access Control
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  isEmailVerified: {
    type: Boolean,
    default: true
  },
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  
  // Address Information
  address1: {
    type: String,
    trim: true
  },
  address2: {
    type: String,
    trim: true
  },
  address3: {
    type: String,
    trim: true
  },
  townCity: {
    type: String,
    trim: true
  },
  county: {
    type: String,
    trim: true
  },
  postcode: {
    type: String,
    trim: true
  },

  // Emergency Contact Information
  emergencyContactName: {
    type: String,
    trim: true
  },
  emergencyContactRelation: {
    type: String,
    trim: true
  },
  emergencyContactPhone: {
    type: String,
    trim: true
  },
  emergencyContactEmail: {
    type: String,
    trim: true
  },

  leaveEntitlement: {
    type: Number,
    default: null
  },
  leaveAllowance: {
    type: Number,
    default: null
  },

  // Salary Details
  salary: {
    type: String,
    default: '0'
  },
  rate: {
    type: String,
    trim: true
  },
  paymentFrequency: {
    type: String,
    trim: true
  },
  effectiveFrom: {
    type: Date
  },
  reason: {
    type: String,
    trim: true
  },
  payrollNumber: {
    type: String,
    trim: true
  },

  // Bank Details
  accountName: {
    type: String,
    trim: true
  },
  bankName: {
    type: String,
    trim: true
  },
  bankBranch: {
    type: String,
    trim: true
  },
  accountNumber: {
    type: String,
    trim: true
  },
  sortCode: {
    type: String,
    trim: true
  },

  // Tax & National Insurance
  taxCode: {
    type: String,
    trim: true
  },
  niNumber: {
    type: String,
    trim: true
  },

  // UK Work Eligibility / Compliance
  isUKCitizen: {
    type: Boolean,
    default: true
  },

  // Passport Information
  passportNumber: {
    type: String,
    trim: true
  },
  passportCountry: {
    type: String,
    trim: true
  },
  passportExpiryDate: {
    type: Date
  },
  passportDocument: {
    type: String,
    trim: true,
    default: ''
  },

  // Driving Licence Information
  licenceType: {
    type: String,
    enum: [
      'NA',
      'Full UK Manual Licence',
      'Full UK Automatic Licence',
      'Provisional Licence'
    ],
    trim: true
  },
  licenceNumber: {
    type: String,
    trim: true
  },
  licenceCountry: {
    type: String,
    trim: true
  },
  licenceClass: {
    type: String,
    trim: true
  },
  penaltyPoints: {
    type: Number,
    min: 0,
    max: 14,
    default: 0
  },
  licenceExpiryDate: {
    type: Date
  },
  licenceDocument: {
    type: String,
    trim: true,
    default: ''
  },

  // Visa Information
  visaNumber: {
    type: String,
    trim: true
  },
  visaExpiryDate: {
    type: Date
  },
  visaDocument: {
    type: String,
    trim: true,
    default: ''
  },

  // Compliance & Consent
  dvlaConsent: {
    type: Boolean,
    default: false
  },
  rightToWorkDeclaration: {
    type: Boolean,
    default: false
  },

  // Additional Information
  notes: {
    type: String,
    default: ''
  },
  skills: [{
    type: String,
    trim: true
  }],
  // @deprecated — do not write new data here. Use the Certificate collection instead.
  // Kept to avoid dropping existing embedded snapshot data.
  certifications: [{
    name: String,
    issueDate: Date,
    expiryDate: Date
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
// Performance indexes
employeeHubSchema.index({ firstName: 1, lastName: 1 });
// Note: email index is already created by unique: true
employeeHubSchema.index({ team: 1 });
employeeHubSchema.index({ department: 1 });
employeeHubSchema.index({ status: 1 });
employeeHubSchema.index({ isActive: 1 });
// NEW: Compound indexes for common queries
employeeHubSchema.index({ department: 1, team: 1 }); // Department + team filtering
employeeHubSchema.index({ status: 1, isActive: 1 }); // Status queries
employeeHubSchema.index({ managerId: 1 }); // Manager hierarchy queries
employeeHubSchema.index({ managerId: 1, role: 1 }); // Team lookups by manager + role
employeeHubSchema.index({ role: 1, isActive: 1 }); // Role-based active user lists
employeeHubSchema.index({ managerId: 1, isActive: 1 }); // Active direct report queries
// Text search index for name and email
employeeHubSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

// Virtual for full name
employeeHubSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to generate initials and employeeId if not provided
employeeHubSchema.pre('save', async function(next) {
  // Generate initials
  if (!this.initials && this.firstName && this.lastName) {
    this.initials = `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
  }
  
  // Generate unique employeeId if not provided
  if (!this.employeeId && this.isNew) {
    try {
      // Find the highest existing employee ID
      const lastEmployee = await this.constructor.findOne({}, { employeeId: 1 })
        .sort({ employeeId: -1 })
        .lean();
      
      let nextId = 1001; // Start from EMP-1001
      
      if (lastEmployee && lastEmployee.employeeId) {
        // Extract number from format EMP-XXXX
        const match = lastEmployee.employeeId.match(/EMP-(\d+)/);
        if (match) {
          nextId = parseInt(match[1]) + 1;
        }
      }
      
      this.employeeId = `EMP-${String(nextId).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  
  next();
});

// Method to check if employee is currently employed
employeeHubSchema.methods.isCurrentlyEmployed = function() {
  return this.isActive && (!this.endDate || this.endDate > new Date());
};

// Static method to get employees by team
employeeHubSchema.statics.getByTeam = function(teamName) {
  return this.find({ team: teamName, isActive: true }).sort({ firstName: 1 });
};

// Password hashing middleware
employeeHubSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
employeeHubSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to check if account is locked
employeeHubSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts and lock account if needed
employeeHubSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
employeeHubSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

// Static method to authenticate employee
employeeHubSchema.statics.authenticate = async function(email, password) {
  try {
    // Find employee with password field included
    const employee = await this.findOne({ 
      email: email.toLowerCase(), 
      isActive: true 
    }).select('+password');
    
    if (!employee) {
      return null;
    }
    
    // Check if employee is terminated - block login for terminated employees
    if (employee.status === 'Terminated') {
      throw new Error('Access denied: Employee account has been terminated');
    }
    
    // Check if account is locked
    if (employee.isLocked()) {
      throw new Error('Account is temporarily locked due to too many failed login attempts');
    }
    
    // Compare password
    const isMatch = await employee.comparePassword(password);
    
    if (!isMatch) {
      await employee.incLoginAttempts();
      return null;
    }
    
    // Reset login attempts on successful login
    await employee.resetLoginAttempts();
    
    // Return employee without password
    employee.password = undefined;
    return employee;
    
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('EmployeeHub', employeeHubSchema);
