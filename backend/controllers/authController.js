const EmployeeHub = require('../models/EmployeesHub');
const User        = require('../models/User');
const jwt         = require('jsonwebtoken');
const { ADMIN_ROLES } = require('../utils/roles');

/**
 * Unified Authentication Controller — Path 1 (clean JWT payload)
 *
 * JWT payload contract (ALL login paths emit these fields):
 *   id            – primary _id of the authenticated record
 *   employeeHubId – EmployeeHub ObjectId  (null for admin/profile without one)
 *   userId        – User ObjectId         (null for employees)
 *   email, role, userType, firstName, lastName
 *
 * Middleware (middleware/auth.js) reads these and sets:
 *   req.employeeHubId / req.userId / req.actorId / req.user
 * so routes never have to guess which collection an id belongs to.
 */

const JWT_SECRET     = process.env.JWT_SECRET     || 'fallback_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/** Sign a pre-built payload object */
const generateToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

/**
 * Build JWT payload for an EmployeeHub user (employee / manager / hr).
 * id and employeeHubId both resolve to EmployeeHub._id.
 * userId is null — employees authenticate through EmployeesHub, not User.
 */
const buildEmployeePayload = (employee) => ({
  id:            employee._id.toString(),
  employeeHubId: employee._id.toString(),
  userId:        null,
  email:         employee.email,
  role:          employee.role,
  userType:      'employee',
  firstName:     employee.firstName,
  lastName:      employee.lastName,
  mustChangePassword: employee.mustChangePassword || false,
});

/**
 * Build JWT payload for a User record (admin / super-admin / profile).
 * Does ONE DB lookup by email to resolve employeeHubId — this single lookup
 * at login time eliminates all the scattered email-based cross-reference
 * lookups that previously existed throughout routes.
 */
const buildAdminPayload = async (user) => {
  const emp = await EmployeeHub
    .findOne({
      $or: [
        { userId: user._id },
        { email: user.email.toLowerCase() }
      ]
    })
    .select('_id')
    .lean();

  return {
    id:            user._id.toString(),
    userId:        user._id.toString(),
    employeeHubId: emp ? emp._id.toString() : null,
    email:         user.email,
    role:          user.role,
    userType:      user.role === 'profile' ? 'profile' : 'admin',
    firstName:     user.firstName,
    lastName:      user.lastName,
    mustChangePassword: user.mustChangePassword || false,
  };
};

// Employee/Admin Login
exports.employeeLogin = async (req, res) => {
  try {
    // Handle both 'email' and 'identifier' fields for compatibility
    const email = req.body.email || req.body.identifier;
    const { password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Authenticate employee
    const employee = await EmployeeHub.authenticate(email.toLowerCase(), password);

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const payload = buildEmployeePayload(employee);
    const token   = generateToken(payload);

    res.status(200).json({
      success: true,
      message: `Welcome back, ${employee.firstName}!`,
      data: {
        user: {
          id:            employee._id,
          employeeHubId: employee._id,   // MongoDB ObjectId — use for all API calls
          userId:        null,
          email:         employee.email,
          firstName:     employee.firstName,
          lastName:      employee.lastName,
          role:          employee.role,
          employeeId:    employee.employeeId, // string "EMP-1001" — display only
          department:    employee.department,
          jobTitle:      employee.jobTitle,
          team:          employee.team,
          isActive:      employee.isActive,
          lastLogin:     employee.lastLogin,
          mustChangePassword: employee.mustChangePassword || false,
        },
        token,
        userType: 'employee',
      }
    });

  } catch (error) {
    console.error('Employee login error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error during login' });
  }
};

// Profile Login
exports.profileLogin = async (req, res) => {
  try {
    // Handle both 'email' and 'identifier' fields for compatibility
    const email = req.body.email || req.body.identifier;
    const { password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Authenticate profile
    const profile = await User.authenticate(email.toLowerCase(), password);

    if (!profile) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if profile is approved (only if explicitly set to false)
    if (profile.isAdminApproved === false) {
      return res.status(403).json({ success: false, message: 'Your profile is pending admin approval' });
    }

    const payload = await buildAdminPayload(profile);
    const token   = generateToken(payload);

    res.status(200).json({
      success: true,
      message: `Welcome back, ${profile.firstName}!`,
      data: {
        user: {
          id:            profile._id,
          userId:        profile._id,       // MongoDB ObjectId — User collection
          employeeHubId: payload.employeeHubId, // EmployeeHub ObjectId if exists
          email:         profile.email,
          firstName:     profile.firstName,
          lastName:      profile.lastName,
          role:          profile.role,
          vtid:          profile.vtid,
          profileType:   profile.profileType,
          institution:   profile.institution,
          course:        profile.course,
          isActive:      profile.isActive,
          lastLogin:     profile.lastLogin,
          mustChangePassword: profile.mustChangePassword || false,
        },
        token,
        userType: payload.userType,
      }
    });

  } catch (error) {
    console.error('Profile login error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error during login' });
  }
};

// Unified Login (detects user type automatically)
exports.unifiedLogin = async (req, res) => {
  try {
    // Handle both 'email' and 'identifier' fields for compatibility
    const email = req.body.email || req.body.identifier;
    const { password, userType } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // If userType is specified, use specific login
    if (userType === 'employee') {
      return exports.employeeLogin(req, res);
    } else if (userType === 'profile') {
      return exports.profileLogin(req, res);
    }

    // Auto-detect user type
    const normalizedEmail = email.toLowerCase();

    // SINGLE ADMIN AUTH SOURCE:
    // If this email exists in User as admin/profile, always authenticate via User.
    // This prevents ambiguous login identity when an admin also has an EmployeeHub shadow record.
    const userIdentity = await User.findOne({
      email: normalizedEmail,
      role: { $in: ['profile', 'admin', 'super-admin'] },
      isActive: true
    }).select('_id role isAdminApproved').lean();

    if (userIdentity) {
      return exports.profileLogin(req, res);
    }

    // Otherwise authenticate as EmployeeHub identity
    try {
      const employee = await EmployeeHub.authenticate(normalizedEmail, password);
      if (employee) {
        const payload = buildEmployeePayload(employee);
        const token   = generateToken(payload);

        return res.status(200).json({
          success: true,
          message: `Welcome back, ${employee.firstName}!`,
          data: {
            user: {
              id:            employee._id,
              employeeHubId: employee._id,
              userId:        null,
              email:         employee.email,
              firstName:     employee.firstName,
              lastName:      employee.lastName,
              role:          employee.role,
              employeeId:    employee.employeeId, // string "EMP-1001" — display only
              department:    employee.department,
              jobTitle:      employee.jobTitle,
              team:          employee.team,
              isActive:      employee.isActive,
              lastLogin:     employee.lastLogin,
              mustChangePassword: employee.mustChangePassword || false,
            },
            token,
            userType: 'employee',
          }
        });
      }
    } catch (employeeError) {
      // Employee login failed
    }

    // Both logins failed
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });

  } catch (error) {
    console.error('Unified login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during login'
    });
  }
};

// Get Current User (validates token and returns fresh user data with clean id fields)
exports.getCurrentUser = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.userType === 'employee') {
      const employee = await EmployeeHub.findById(decoded.id)
        .select('-password')
        .populate('team', 'name initials');

      if (!employee || !employee.isActive) {
        return res.status(401).json({ success: false, message: 'Employee not found or inactive' });
      }

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id:            employee._id,
            employeeHubId: employee._id,
            userId:        null,
            email:         employee.email,
            firstName:     employee.firstName,
            lastName:      employee.lastName,
            role:          employee.role,
            employeeId:    employee.employeeId,
            department:    employee.department,
            jobTitle:      employee.jobTitle,
            team:          employee.team,
            isActive:      employee.isActive,
            lastLogin:     employee.lastLogin,
          },
          userType: 'employee',
        }
      });

    } else if (decoded.userType === 'profile' || decoded.userType === 'admin') {
      // 'admin' is the new userType value emitted for admin/super-admin Users
      const profile = await User.findById(decoded.id).select('-password');

      if (!profile || !profile.isActive) {
        return res.status(401).json({ success: false, message: 'Profile not found or inactive' });
      }

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id:            profile._id,
            userId:        profile._id,
            employeeHubId: decoded.employeeHubId || null, // preserve from token
            email:         profile.email,
            firstName:     profile.firstName,
            lastName:      profile.lastName,
            role:          profile.role,
            vtid:          profile.vtid,
            profileType:   profile.profileType,
            institution:   profile.institution,
            course:        profile.course,
            isActive:      profile.isActive,
            lastLogin:     profile.lastLogin,
          },
          userType: decoded.userType,
        }
      });

    } else {
      return res.status(401).json({ success: false, message: 'Invalid user type in token' });
    }

  } catch (error) {
    console.error('Get current user error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Logout (client-side token removal)
exports.logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can add token blacklisting if needed
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout'
    });
  }
};

// Change Password (for both employees and profiles)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    if (decoded.userType === 'employee') {
      const employee = await EmployeeHub.findById(decoded.id).select('+password');
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Verify current password
      const isMatch = await employee.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      employee.password = newPassword;
      await employee.save();

    } else if (decoded.userType === 'profile' || decoded.userType === 'admin') {
      const profile = await User.findById(decoded.id).select('+password');
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Verify current password
      const isMatch = await profile.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      profile.password = newPassword;
      await profile.save();
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Mandatory password change for users with mustChangePassword: true
exports.changePasswordMandatory = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    let userRecord;
    if (decoded.userType === 'employee') {
      userRecord = await EmployeeHub.findById(decoded.id);
    } else if (decoded.userType === 'profile' || decoded.userType === 'admin') {
      userRecord = await User.findById(decoded.id);
    }

    if (!userRecord) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    // Update password and clear mandatory flag
    userRecord.password = newPassword;
    userRecord.mustChangePassword = false;
    await userRecord.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully. You can now access the system.'
    });

  } catch (error) {
    console.error('Mandatory password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during password update'
    });
  }
};

// Get Approvers (admins/super-admins with EmployeeHub entries)
exports.getApprovers = async (req, res) => {
  try {
    // Find all active, approved admin and super-admin users
    const adminUsers = await User.find({
      role: { $in: ADMIN_ROLES },
      isActive: true,
      isAdminApproved: true
    }).select('email firstName lastName role');

    if (!adminUsers || adminUsers.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No approved admins found'
      });
    }

    // Get their emails
    const adminEmails = adminUsers.map(user => user.email.toLowerCase());

    // Find corresponding EmployeeHub entries
    const employeeHubRecords = await EmployeeHub.find({
      email: { $in: adminEmails },
      isActive: true
    }).select('_id email firstName lastName role');

    // Map User admins to EmployeeHub records
    const approvers = employeeHubRecords.map(emp => {
      // Find the matching User record to get the correct role
      const userRecord = adminUsers.find(u => u.email.toLowerCase() === emp.email.toLowerCase());
      return {
        _id: emp._id, // This is the EmployeeHub ID needed for approverId
        email: emp.email,
        firstName: emp.firstName,
        lastName: emp.lastName,
        role: userRecord ? userRecord.role : emp.role // Use User role (admin/super-admin)
      };
    });

    res.status(200).json({
      success: true,
      data: approvers,
      count: approvers.length
    });

  } catch (error) {
    console.error('Get approvers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching approvers'
    });
  }
};
