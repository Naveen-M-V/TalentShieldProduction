const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * User Schema for Profiles and Admin Accounts
 * Handles:
 * 1. Profile accounts (interns, trainees, contract trainees) - require VTID, profileType, startDate
 * 2. Admin/Super-Admin accounts - standalone system administrators
 * Profiles and Admins DO NOT clock-in, DO NOT have rota/shift, DO NOT belong to EmployeesHub
 */
const userSchema = new mongoose.Schema({
  // Personal Information
  firstName: { 
    type: String, 
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: { 
    type: String, 
    required: [true, 'Last name is required'],
    trim: true
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true, 
    lowercase: true, 
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  phone: {
    type: String,
    trim: true
  },
  
  // Profile Information (optional for admin accounts)
  vtid: {
    type: String,
    unique: true,
    sparse: true, // Allow null values for admin accounts
    required: function() {
      return this.role === 'profile'; // Only required for profiles
    },
    match: [/^VT\d{4}$/, 'VTID must be in format VT1234']
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Unspecified'],
    default: 'Unspecified'
  },
  
  // Profile Type (only for profile role, not for admins)
  profileType: {
    type: String,
    enum: ['intern', 'trainee', 'contract-trainee'],
    required: function() {
      return this.role === 'profile'; // Only required for profiles
    }
  },
  institution: {
    type: String,
    trim: true
  },
  course: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: function() {
      return this.role === 'profile'; // Only required for profiles
    }
  },
  endDate: {
    type: Date
  },
  
  // Authentication
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  role: { 
    type: String, 
    enum: ['profile', 'user', 'manager', 'super-admin', 'admin'], 
    default: 'profile',
    required: true
  },
  
  // Account Status
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  verificationToken: String,
  adminApprovalToken: String,
  isAdminApproved: { type: Boolean, default: false },
  mustChangePassword: { type: Boolean, default: false },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  
  // Profile Status
  status: {
    type: String,
    enum: ['active', 'completed', 'terminated', 'suspended'],
    default: 'active'
  },
  
  // Additional Information
  department: String,
  company: String,
  staffType: String,
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to generate VTID if not provided
userSchema.pre('save', async function(next) {
  if (!this.vtid && this.isNew) {
    try {
      // Generate unique 4-digit VTID
      const generateVTID = () => {
        const min = 1000;
        const max = 9999;
        return Math.floor(Math.random() * (max - min + 1)) + min;
      };

      // Ensure unique VTID
      let vtid;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 100;

      while (!isUnique && attempts < maxAttempts) {
        vtid = `VT${generateVTID()}`;
        const existing = await this.constructor.findOne({ vtid });
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error('Unable to generate unique VTID after multiple attempts');
      }

      this.vtid = vtid;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts and lock account if needed
userSchema.methods.incLoginAttempts = function() {
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
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

// Static method to authenticate profile
userSchema.statics.authenticate = async function(email, password) {
  try {
    // Find profile with password field included
    // Allow profile, admin, and super-admin roles
    const profile = await this.findOne({ 
      email: email.toLowerCase(), 
      role: { $in: ['profile', 'admin', 'super-admin'] },
      isActive: true 
    }).select('+password');
    
    if (!profile) {
      return null;
    }
    
    // Check if account is locked
    if (profile.isLocked()) {
      throw new Error('Account is temporarily locked due to too many failed login attempts');
    }
    
    // Compare password
    const isMatch = await profile.comparePassword(password);
    
    if (!isMatch) {
      await profile.incLoginAttempts();
      return null;
    }
    
    // Reset login attempts on successful login
    await profile.resetLoginAttempts();
    
    // Return profile without password
    profile.password = undefined;
    return profile;
    
  } catch (error) {
    throw error;
  }
};

// Static method to get profiles by type
userSchema.statics.getByProfileType = function(profileType) {
  return this.find({ 
    profileType: profileType, 
    isActive: true 
  }).sort({ firstName: 1 });
};

// Ensure a default super-admin exists for initial setup
userSchema.statics.ensureAdminExists = async function () {
  try {
    const adminCount = await this.countDocuments({ role: { $in: ['admin', 'super-admin'] } });
    if (adminCount === 0) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      await this.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@talentshield.com',
        password: hashedPassword,
        role: 'super-admin',
        isActive: true,
        isEmailVerified: true,
        isAdminApproved: true
      });
      console.log('Default super-admin account created');
    }
  } catch (error) {
    console.error('Error ensuring admin exists:', error);
  }
};

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Prevent model re-compilation when file is required multiple times
// (server.js registers the inline schema first; this guard avoids OverwriteModelError)
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
