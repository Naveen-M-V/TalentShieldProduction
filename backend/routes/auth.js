const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authController = require('../controllers/authController');

/**
 * Authentication Routes
 * Handles dual login system for Employees and Profiles
 */

// POST /api/auth/login/employee - Employee/Admin Login
router.post('/login/employee', authController.employeeLogin);

// POST /api/auth/login/profile - Profile Login
router.post('/login/profile', authController.profileLogin);

// POST /api/auth/login - Unified Login (auto-detect user type)
router.post('/login', authController.unifiedLogin);

// GET /api/auth/me - Get Current User (token validation)
router.get('/me', authController.getCurrentUser);

// POST /api/auth/logout - Logout
router.post('/logout', authController.logout);

// POST /api/auth/change-password - Change Password
router.post('/change-password', authController.changePassword);

// POST /api/auth/change-password-mandatory - Mandatory Password Change
router.post('/change-password-mandatory', authController.changePasswordMandatory);

// GET /api/auth/approvers - Get admin/super-admin approvers
router.get('/approvers', authController.getApprovers);

// ── Email verification (link sent on signup) ──────────────────────────────
// GET /api/auth/verify-email?token=...
router.get('/verify-email', async (req, res) => {
  const User = require('../models/User');
  const JWT_SECRET = process.env.JWT_SECRET;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Missing verification token');

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(400).send('Invalid or expired verification token');
    }

    let user = await User.findOne({ email: payload.email, verificationToken: token });

    if (!user) {
      user = await User.findOne({ email: payload.email });
      if (!user) return res.status(404).send('User not found. The link may have expired.');
      if (user.isEmailVerified) {
        return res.redirect(`${frontendUrl}/login?verified=true&message=already_verified`);
      }
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return res.redirect(`${frontendUrl}/login?verified=true`);
  } catch (error) {
    console.error('Verify email error:', error);
    return res.redirect(`${frontendUrl}/login?error=verification_failed`);
  }
});

// ── Admin account approval (link sent to super-admins) ───────────────────
// GET /api/auth/approve-admin?token=...
router.get('/approve-admin', async (req, res) => {
  const User = require('../models/User');
  const { sendUserCredentialsEmail } = require('../utils/emailService');
  const JWT_SECRET = process.env.JWT_SECRET;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Missing approval token');

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(400).send('Invalid or expired approval token');
    }

    const user = await User.findOne({ email: payload.email, adminApprovalToken: token });
    if (!user) return res.status(404).send('User not found or approval link has expired');

    if (user.isAdminApproved) {
      return res.redirect(`${frontendUrl}/login?approved=true&message=already_approved`);
    }

    user.isAdminApproved = true;
    user.adminApprovalToken = undefined;
    await user.save();

    try {
      await sendUserCredentialsEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        user.email,
        '(use your signup password)'
      );
    } catch (emailError) {
      console.error('Failed to send approval notification:', emailError);
    }

    return res.redirect(`${frontendUrl}/login?approved=true&message=admin_approved`);
  } catch (error) {
    console.error('Admin approval error:', error);
    return res.redirect(`${frontendUrl}/login?error=approval_failed`);
  }
});

// ── POST /api/auth/signup ─────────────────────────────────────────────────
// Creates a new user (profile or admin pending approval).
router.post('/signup', async (req, res) => {
  const User = require('../models/User');
  const EmployeeHub = require('../models/EmployeesHub');
  const { ensureMyDocumentsFolder } = require('../utils/documentFolderHelpers');
  const jwt  = require('jsonwebtoken');
  const {
    sendVerificationEmail,
    sendAdminApprovalRequestEmail,
  } = require('../utils/emailService');
  const JWT_SECRET = process.env.JWT_SECRET;

  const generateAdminEmployeeId = async () => {
    let employeeId;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 50;

    while (!isUnique && attempts < maxAttempts) {
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      employeeId = `ADM${randomDigits}`;
      const existing = await EmployeeHub.findOne({ employeeId }).select('_id').lean();
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Unable to generate unique admin employee ID');
    }

    return employeeId;
  };

  try {
    const {
      firstName, lastName, email, password,
      role = 'user',
      termsAccepted = false,
      requireEmailVerification = true,
    } = req.body;

    const normalizedEmail = (email || '').toLowerCase().trim();

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const isAdminSignup = role === 'admin';
    const user = new User({
      firstName, lastName, email: normalizedEmail, password,
      role:            isAdminSignup ? 'admin' : 'user',
      isActive:        true,
      termsAcceptedAt: termsAccepted ? new Date() : undefined,
      isEmailVerified: !requireEmailVerification,
      isAdminApproved: !isAdminSignup,
    });

    if (requireEmailVerification) {
      user.verificationToken = jwt.sign({ email: normalizedEmail }, JWT_SECRET, { expiresIn: '48h' });
    }
    if (isAdminSignup) {
      user.adminApprovalToken = jwt.sign({ email: normalizedEmail, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    }

    await user.save();

    // Ensure every admin account has a linked EmployeeHub record.
    if (isAdminSignup) {
      let ensuredEmployeeHub = null;
      const existingEmployeeHub = await EmployeeHub.findOne({ email: normalizedEmail });

      if (existingEmployeeHub) {
        existingEmployeeHub.userId = user._id;
        existingEmployeeHub.firstName = firstName;
        existingEmployeeHub.lastName = lastName;
        existingEmployeeHub.role = user.role;
        existingEmployeeHub.isActive = true;
        existingEmployeeHub.status = 'Active';
        existingEmployeeHub.department = existingEmployeeHub.department || 'Administration';
        existingEmployeeHub.jobTitle = user.role === 'super-admin' ? 'Super Administrator' : 'Administrator';
        existingEmployeeHub.startDate = existingEmployeeHub.startDate || user.createdAt || new Date();
        if (!existingEmployeeHub.password) {
          existingEmployeeHub.password = password;
        }
        ensuredEmployeeHub = await existingEmployeeHub.save();
      } else {
        const employeeId = await generateAdminEmployeeId();
        ensuredEmployeeHub = await EmployeeHub.create({
          userId: user._id,
          email: normalizedEmail,
          firstName,
          lastName,
          password,
          role: user.role,
          isActive: true,
          status: 'Active',
          department: 'Administration',
          jobTitle: user.role === 'super-admin' ? 'Super Administrator' : 'Administrator',
          startDate: user.createdAt || new Date(),
          employeeId,
          phone: '',
          office: 'Head Office',
          workLocation: 'On-site',
          employmentType: 'Full-time',
        });
      }

      if (ensuredEmployeeHub?._id) {
        await ensureMyDocumentsFolder(ensuredEmployeeHub._id);
      }
    }

    // Send verification email
    if (requireEmailVerification && user.verificationToken) {
      try {
        const baseUrl   = process.env.API_PUBLIC_URL || process.env.BACKEND_URL || 'https://talentshield.co.uk';
        const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(user.verificationToken)}`;
        await sendVerificationEmail(user.email, verifyUrl, `${user.firstName} ${user.lastName}`.trim());
      } catch (e) { console.error('Failed to send verification email:', e); }
    }

    // Notify super-admins for admin signups
    if (isAdminSignup && user.adminApprovalToken) {
      try {
        const baseUrl    = process.env.API_PUBLIC_URL || process.env.BACKEND_URL || 'https://talentshield.co.uk';
        const approveUrl = `${baseUrl}/api/auth/approve-admin?token=${encodeURIComponent(user.adminApprovalToken)}`;
        const superAdmins = (process.env.SUPER_ADMIN_EMAIL || '').split(',').map(e => e.trim()).filter(Boolean);
        for (const sa of superAdmins) {
          await sendAdminApprovalRequestEmail(sa, `${user.firstName} ${user.lastName}`.trim(), user.email, approveUrl);
        }
      } catch (e) { console.error('Failed to send admin approval emails:', e); }
    }

    res.status(201).json({
      message:          isAdminSignup ? 'Admin account created. Pending super-admin approval.' : 'User created successfully',
      requiresApproval: isAdminSignup,
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────
// Request a password reset link for an employee or user account
router.post('/forgot-password', async (req, res) => {
  const User = require('../models/User');
  const EmployeeHub = require('../models/EmployeesHub');
  const { sendPasswordResetEmail } = require('../utils/emailService');
  const JWT_SECRET = process.env.JWT_SECRET;
  const baseUrl = process.env.API_PUBLIC_URL || process.env.BACKEND_URL || 'https://talentshield.co.uk';

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check in User collection first
    let user = await User.findOne({ email: normalizedEmail });
    let collection = 'user';

    // If not in User, check EmployeeHub
    if (!user) {
      user = await EmployeeHub.findOne({ email: normalizedEmail });
      collection = 'employee';
    }

    // For security, always return success message even if user not found
    // This prevents email enumeration attacks
    if (!user) {
      return res.status(200).json({
        message: 'If an account with this email exists, a password reset link has been sent to your email address.',
      });
    }

    // Generate password reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { email: user.email, collection },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token in database (with expiry)
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    if (collection === 'employee') {
      // EmployeesHub schema uses passwordResetToken/passwordResetExpires
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetTokenExpiry;
      // Backward compatibility in case older docs used resetPassword* keys
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpiry;
    } else {
      // User schema uses resetPasswordToken/resetPasswordExpires
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpiry;
      // Backward compatibility in case older docs used passwordReset* keys
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetTokenExpiry;
    }
    await user.save();

    // Build reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    // Send reset email
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    await sendPasswordResetEmail(user.email, fullName, resetUrl, resetToken);

    console.log(`✅ Password reset email sent to ${user.email}`);

    // Always return success for security
    return res.status(200).json({
      message: 'If an account with this email exists, a password reset link has been sent to your email address.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      message: 'An error occurred while processing your request.',
    });
  }
});

// ── POST /api/auth/reset-password-token ───────────────────────────────────
// Reset password using token from forgot-password email
router.post('/reset-password-token', async (req, res) => {
  const User = require('../models/User');
  const EmployeeHub = require('../models/EmployeesHub');
  const JWT_SECRET = process.env.JWT_SECRET;

  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Verify token
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const normalizedEmail = payload.email.toLowerCase().trim();
    const collection = payload.collection;

    // Find user based on collection hint
    let user;
    if (collection === 'employee') {
      user = await EmployeeHub.findOne({ email: normalizedEmail });
    } else {
      user = await User.findOne({ email: normalizedEmail });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify token matches and hasn't expired
    const storedToken = user.resetPasswordToken || user.passwordResetToken;
    const storedExpiry = user.resetPasswordExpires || user.passwordResetExpires;

    if (storedToken !== token) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    if (!storedExpiry || new Date() > storedExpiry) {
      return res.status(400).json({ message: 'Reset token has expired. Please request a new password reset.' });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    console.log(`✅ Password reset successful for ${user.email}`);

    return res.status(200).json({
      message: 'Password has been reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password token error:', error);
    return res.status(500).json({
      message: 'An error occurred while resetting your password.',
    });
  }
});

module.exports = router;

