'use strict';
/**
 * Admin Routes
 * Mounted at:  /api   (with authenticateSession applied per-route where needed)
 *
 * Endpoints:
 *   GET  /api/test                     - health check
 *   GET  /api/users                    - list admin/super-admin users (no auth - used by approver selectors)
 *   GET  /api/my-profile               - current user's profile [auth]
 *   PUT  /api/admin/update-profile     - update admin's own profile [auth]
 *   POST /api/users/create             - admin creates a new user [auth]
 *   POST /api/fix-my-profile           - force-create/repair the calling user's Profile doc [auth]
 */

const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');

const User    = require('../models/User');
const Profile = require('../models/Profile');
const EmployeeHub = require('../models/EmployeesHub');
const { authenticateSession }   = require('../middleware/auth');
const { generateSimplePassword } = require('../utils/passwordGenerator');
const {
  sendAdminNewUserCredentialsEmail,
  sendWelcomeEmailToNewUser,
} = require('../utils/emailService');
const { ADMIN_ROLES } = require('../utils/roles');

// ── GET /api/test ─────────────────────────────────────────────────────────
router.get('/test', (req, res) => {
  res.json({ message: 'API is working', timestamp: new Date().toISOString() });
});

// ── GET /api/users ─────────────────────────────────────────────────────────
// Returns admin + super-admin accounts for use in approver selectors.
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({
      role:            { $in: ADMIN_ROLES },
      isActive:        { $ne: false },
      isAdminApproved: true,
    })
      .select('_id email firstName lastName role isAdminApproved isActive')
      .lean();

    return res.status(200).json({ success: true, data: users || [] });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
  }
});

// ── GET /api/my-profile ───────────────────────────────────────────────────
router.get('/my-profile', authenticateSession, async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Admins: merge User record + Profile extras
    if (ADMIN_ROLES.includes(req.user.role)) {
      const user = await User.findOne({ email: req.user.email }).select('-password -__v').lean();
      if (!user) return res.status(404).json({ message: 'Admin profile not found' });

      let profileExtras = {};
      try {
        let prof = await Profile.findOne({ email: req.user.email })
          .select('-profilePictureData -profilePictureSize -profilePictureMimeType -__v');

        // Auto-create a Profile record if one doesn't exist for this admin
        if (!prof) {
          if (user.profileId) {
            await User.findByIdAndUpdate(user._id, { $unset: { profileId: 1 } });
          }
          if (!user.firstName || !user.lastName) {
            return res.status(400).json({
              message: 'Profile creation failed: First name and last name are required.',
              missingFields: { firstName: !user.firstName, lastName: !user.lastName },
            });
          }
          const jobTitleValue = Array.isArray(user.jobTitle)
            ? (user.jobTitle.length > 0 ? user.jobTitle[0] : '')
            : (user.jobTitle || '');

          prof = await Profile.create({
            email: req.user.email, firstName: user.firstName, lastName: user.lastName,
            mobile: user.mobile || '', company: user.company || 'VitruX Ltd',
            jobTitle: jobTitleValue, jobRole: [], staffType: user.staffType || 'Direct',
            role: user.role || 'admin', dateOfBirth: user.dateOfBirth || null,
            gender: user.gender || '', nationality: user.nationality || '',
            address: user.address || {}, emergencyContact: user.emergencyContact || {},
          });
          await User.findByIdAndUpdate(user._id, { profileId: prof._id });
        }

        if (prof) {
          const pd = prof.toObject ? prof.toObject() : prof;
          profileExtras = {
            profileId:       pd._id.toString(),
            mobile:          pd.mobile,
            bio:             pd.bio,
            jobTitle:        pd.jobTitle || '',
            department:      pd.department || '',
            company:         pd.company,
            staffType:       pd.staffType,
            dateOfBirth:     pd.dateOfBirth,
            nationality:     pd.nationality,
            gender:          pd.gender,
            location:        pd.location,
            address:         pd.address,
            emergencyContact: pd.emergencyContact,
            profilePicture:  pd.profilePicture,
          };
        }
      } catch (mergeErr) {
        console.error('Admin/Profile merge failed:', mergeErr?.message);
      }

      return res.json({ ...user, ...profileExtras, isAdmin: true, permissions: ['all'] });
    }

    // Regular users/managers: return Profile record.
    // If missing, attempt self-heal by creating a Profile from EmployeeHub/User identity.
    let profile = await Profile.findOne({ email: req.user.email })
      .select('-profilePictureData -profilePictureSize -profilePictureMimeType');

    if (!profile) {
      let sourceUser = await User.findOne({ email: req.user.email }).select('-password -__v').lean();
      let sourceEmployee = null;

      if (req.employeeHubId && mongoose.Types.ObjectId.isValid(String(req.employeeHubId))) {
        sourceEmployee = await EmployeeHub.findById(req.employeeHubId).lean();
      }
      if (!sourceEmployee) {
        sourceEmployee = await EmployeeHub.findOne({ email: req.user.email.toLowerCase() }).lean();
      }

      const firstName = sourceUser?.firstName || sourceEmployee?.firstName;
      const lastName = sourceUser?.lastName || sourceEmployee?.lastName;

      if (!firstName || !lastName) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      const newProfilePayload = {
        email: req.user.email,
        firstName,
        lastName,
        mobile: sourceUser?.mobile || sourceEmployee?.phone || '',
        company: sourceUser?.company || sourceEmployee?.office || 'VitruX Ltd',
        jobTitle: sourceUser?.jobTitle || sourceEmployee?.jobTitle || '',
        role: req.user.role || sourceUser?.role || sourceEmployee?.role || 'user',
        dateOfBirth: sourceUser?.dateOfBirth || sourceEmployee?.dateOfBirth || null,
        gender: sourceUser?.gender || sourceEmployee?.gender || '',
        nationality: sourceUser?.nationality || sourceEmployee?.ethnicity || '',
        department: sourceUser?.department || sourceEmployee?.department || '',
        address: sourceUser?.address || {
          line1: sourceEmployee?.address1 || '',
          line2: sourceEmployee?.address2 || '',
          city: sourceEmployee?.townCity || '',
          postCode: sourceEmployee?.postcode || '',
          country: sourceEmployee?.county || ''
        },
        emergencyContact: sourceUser?.emergencyContact || {
          name: sourceEmployee?.emergencyContactName || '',
          relationship: sourceEmployee?.emergencyContactRelation || '',
          phone: sourceEmployee?.emergencyContactPhone || ''
        }
      };

      if (sourceUser?._id && mongoose.Types.ObjectId.isValid(String(sourceUser._id))) {
        const existingByUserId = await Profile.findOne({ userId: sourceUser._id }).select('_id').lean();
        if (!existingByUserId) {
          newProfilePayload.userId = sourceUser._id;
        }
      }

      profile = await Profile.create(newProfilePayload);

      if (sourceUser?._id) {
        await User.findByIdAndUpdate(sourceUser._id, { profileId: profile._id });
      }
    }

    const profileObj = profile.toObject ? profile.toObject() : profile;
    delete profileObj.profilePictureData;
    delete profileObj.profilePictureSize;
    delete profileObj.profilePictureMimeType;

    res.json(profileObj);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── PUT /api/admin/update-profile ─────────────────────────────────────────
router.put('/admin/update-profile', authenticateSession, async (req, res) => {
  try {
    if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { firstName, lastName, email, mobile, bio, jobTitle, department,
            company, staffType, dateOfBirth, nationality, gender, location,
            address, emergencyContact } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: 'First name, last name, and email are required' });
    }

    const update = {
      firstName, lastName, email,
      mobile: mobile ?? '', bio: bio ?? '', jobTitle: jobTitle ?? '',
      department: department ?? '', company: company ?? '',
      staffType: staffType ?? 'Admin', nationality: nationality ?? '',
      gender: gender ?? '', location: location ?? '',
      address: address ?? {}, emergencyContact: emergencyContact ?? {},
      updatedAt: new Date(),
    };
    if (dateOfBirth) update.dateOfBirth = new Date(dateOfBirth);

    const updated = await Profile.findOneAndUpdate({ email }, update, { new: true, upsert: true });
    return res.json({ success: true, message: 'Admin profile updated successfully', profile: updated });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    return res.status(500).json({ message: 'Failed to update admin profile', error: error.message });
  }
});

// ── POST /api/users/create ────────────────────────────────────────────────
router.post('/users/create', authenticateSession, async (req, res) => {
  try {
    if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { firstName, lastName, email, vtid } = req.body;
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: 'First name, last name, and email are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    if (await Profile.findOne({ email })) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const generatedPassword = generateSimplePassword(8);

    const newProfile = await new Profile({
      firstName, lastName, email,
      vtid:          vtid || `VT${Date.now()}`,
      role:          'user',
      isActive:      true,
      emailVerified: true,
    }).save();

    // Create User account for login
    try {
      if (!await User.findOne({ email })) {
        const newUser = await new User({
          firstName, lastName, email,
          password:        generatedPassword,
          vtid:            newProfile.vtid?.toString(),
          role:            'user',
          isActive:        true,
          isEmailVerified: true,
          profileId:       newProfile._id,
        }).save();

        newProfile.userId = newUser._id;
        await newProfile.save();
      }
    } catch (userErr) {
      await Profile.findByIdAndDelete(newProfile._id);
      throw new Error('Failed to create user account. Please try again.');
    }

    const loginUrl  = `${process.env.FRONTEND_URL || 'https://talentshield.co.uk'}/login`;
    const userName  = `${firstName} ${lastName}`;

    // Email admin who created the user
    try {
      await sendAdminNewUserCredentialsEmail(req.user.email, userName, email, generatedPassword, loginUrl);
    } catch (e) { console.error('Failed to email admin credentials:', e); }

    // Welcome email to new user
    try {
      await sendWelcomeEmailToNewUser(email, userName, loginUrl);
    } catch (e) { console.error('Failed to send welcome email:', e); }

    res.status(201).json({
      success: true,
      message: 'User created successfully. Credentials sent to your email.',
      user: {
        id:        newProfile._id,
        firstName: newProfile.firstName,
        lastName:  newProfile.lastName,
        email:     newProfile.email,
        vtid:      newProfile.vtid,
        role:      newProfile.role,
        isActive:  newProfile.isActive,
        createdAt: newProfile.createdOn,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
});

// ── POST /api/fix-my-profile ──────────────────────────────────────────────
// Force-creates or repairs the calling user's Profile document.
router.post('/fix-my-profile', authenticateSession, async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await User.findOne({ email: req.user.email }).select('-password -__v');
    let employee = null;

    if (req.employeeHubId && mongoose.Types.ObjectId.isValid(String(req.employeeHubId))) {
      employee = await EmployeeHub.findById(req.employeeHubId);
    }
    if (!employee) {
      employee = await EmployeeHub.findOne({ email: req.user.email.toLowerCase() });
    }

    const sourceFirstName = user?.firstName || employee?.firstName;
    const sourceLastName = user?.lastName || employee?.lastName;

    if (!sourceFirstName || !sourceLastName) {
      return res.status(400).json({
        message: 'Cannot create profile: First name and last name are required in User/Employee record',
        userData: {
          email: req.user.email,
          firstName: sourceFirstName || null,
          lastName: sourceLastName || null,
        },
      });
    }

    // Clear stale profileId
    if (user?.profileId) {
      const existing = await Profile.findById(user.profileId);
      if (!existing) {
        await User.findByIdAndUpdate(user._id, { $unset: { profileId: 1 } });
      } else {
        return res.json({
          success: true, message: 'Profile already exists', profileId: existing._id.toString(),
          profile: { _id: existing._id, email: existing.email, firstName: existing.firstName, lastName: existing.lastName },
        });
      }
    }

    let profile = await Profile.findOne({ email: req.user.email });

    if (!profile && employee?.email) {
      profile = await Profile.findOne({ email: employee.email.toLowerCase() });
    }

    if (!profile) {
      const jobTitleValue = Array.isArray(user?.jobTitle)
        ? (user.jobTitle.length > 0 ? user.jobTitle[0] : '')
        : (user?.jobTitle || employee?.jobTitle || '');

      profile = await Profile.create({
        email: req.user.email,
        firstName: sourceFirstName,
        lastName: sourceLastName,
        mobile: user?.mobile || employee?.phone || '',
        company: user?.company || employee?.office || 'VitruX Ltd',
        jobTitle: jobTitleValue, jobRole: [], staffType: user?.staffType || 'Direct',
        role: user?.role || req.user.role || employee?.role || 'user',
        dateOfBirth: user?.dateOfBirth || employee?.dateOfBirth || null,
        gender: user?.gender || employee?.gender || '',
        nationality: user?.nationality || employee?.ethnicity || '',
        address: user?.address || {
          line1: employee?.address1 || '',
          line2: employee?.address2 || '',
          city: employee?.townCity || '',
          postCode: employee?.postcode || '',
          country: employee?.county || ''
        },
        emergencyContact: user?.emergencyContact || {
          name: employee?.emergencyContactName || '',
          relationship: employee?.emergencyContactRelation || '',
          phone: employee?.emergencyContactPhone || ''
        },
        ...(user?._id ? { userId: user._id } : {})
      });
    }

    if (user?._id) {
      await User.findByIdAndUpdate(user._id, { profileId: profile._id });
    }

    res.json({
      success: true, message: 'Profile fixed successfully', profileId: profile._id.toString(),
      profile: { _id: profile._id, email: profile.email, firstName: profile.firstName, lastName: profile.lastName },
    });
  } catch (error) {
    console.error('❌ CRITICAL ERROR in /fix-my-profile:', error);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
});

module.exports = router;
