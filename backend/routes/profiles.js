'use strict';
/**
 * Profile Routes
 * Handles CRUD operations for Profile documents (interns, trainees, contract trainees).
 * Mounted at:  /api/profiles
 *
 * NOTE: Profile routes do NOT require authentication to support the admin dashboard
 * which uses session-less direct API calls. TODO: add authenticateSession to all
 * mutating routes once the frontend login flow is consistent.
 */

const express  = require('express');
const mongoose = require('mongoose');
const router   = express.Router();

const Profile         = require('../models/Profile');
const Certificate     = require('../models/Certificate');
const User            = require('../models/User');
const Notification    = require('../models/Notification');
const upload          = require('../middleware/upload');
const { validateProfileInput } = require('../middleware/validators');
const { generateSimplePassword }  = require('../utils/passwordGenerator');
const {
  sendNotificationEmail,
  sendUserCredentialsEmail,
} = require('../utils/emailService');
const {
  notifyUserCreation,
  notifyProfileUpdate,
  notifyCertificateAdded,
  notifyCertificateDeleted,
} = require('../utils/notificationService');

// ── GET /api/profiles ─────────────────────────────────────────────────────
// Returns all profiles excluding admins and binary picture data.
router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find({
      $and: [
        { role: { $nin: ['admin', 'super_admin'] } },
        { staffType: { $ne: 'Admin' } },
      ],
    })
      .select('-profilePictureData -profilePictureSize -profilePictureMimeType')
      .sort({ createdOn: -1 })
      .populate('userId', 'email role firstName lastName')
      .lean();

    console.log(`Fetched ${profiles.length} profiles (admins excluded)`);
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/profiles/complete ────────────────────────────────────────────
router.get('/complete', async (req, res) => {
  try {
    const profiles = await Profile.find().sort({ createdOn: -1 }).lean();
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching complete profiles:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/profiles/paginated ───────────────────────────────────────────
router.get('/paginated', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const query = {
      $and: [
        { role:      { $nin: ['admin', 'super_admin'] } },
        { staffType: { $ne: 'Admin' } },
      ],
    };

    const [profiles, total] = await Promise.all([
      Profile.find(query)
        .select('-profilePictureData -profilePictureSize -profilePictureMimeType')
        .sort({ createdOn: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Profile.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({
      profiles,
      pagination: {
        currentPage: page,
        totalPages,
        totalProfiles: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching paginated profiles:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/profiles/by-email/:email ────────────────────────────────────
// Must be declared BEFORE /:id to avoid "by-email" being treated as an ID.
router.get('/by-email/:email', async (req, res) => {
  try {
    const email = (req.params.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const profile = await Profile.findOne({ email });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile by email:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/profiles/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id)
      .select('-profilePictureData -profilePictureSize -profilePictureMimeType')
      .lean();
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/profiles/:id/complete ───────────────────────────────────────
router.get('/:id/complete', async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/profiles/:id/picture ────────────────────────────────────────
router.get('/:id/picture', async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile)                    return res.status(404).json({ message: 'Profile not found' });
    if (!profile.profilePictureData) return res.status(404).json({ message: 'No profile picture found' });

    res.set({
      'Content-Type':        profile.profilePictureMimeType || 'image/jpeg',
      'Content-Length':      profile.profilePictureSize,
      'Content-Disposition': `inline; filename="profile-${profile._id}.jpg"`,
      'Cache-Control':       'public, max-age=31536000',
    });
    res.send(profile.profilePictureData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/profiles/:id/stats ───────────────────────────────────────────
router.get('/:id/stats', async (req, res) => {
  try {
    const profileId = req.params.id;
    const [certificateCount, profile] = await Promise.all([
      Certificate.countDocuments({ profileId }),
      Profile.findById(profileId, 'firstName lastName email'),
    ]);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    res.json({
      profile: { id: profile._id, name: `${profile.firstName} ${profile.lastName}`, email: profile.email },
      certificates: { total: certificateCount },
    });
  } catch (error) {
    console.error('Error getting profile stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/profiles/:profileId/certificates ────────────────────────────
router.get('/:profileId/certificates', async (req, res) => {
  try {
    const certificates = await Certificate.find({
      ownerType:  'profile',
      profileRef: req.params.profileId,
    })
      .populate('uploadedBy', 'firstName lastName employeeId')
      .populate('reviewedBy', 'firstName lastName employeeId')
      .sort({ createdAt: -1 });
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── POST /api/profiles ────────────────────────────────────────────────────
router.post('/', validateProfileInput, async (req, res) => {
  try {
    const profileData = { ...req.body };
    // jobTitle in Profile is a STRING; guard against arrays from frontend
    if (Array.isArray(profileData.jobTitle)) {
      profileData.jobTitle = profileData.jobTitle.length > 0 ? profileData.jobTitle[0] : '';
    }

    const profile      = new Profile(profileData);
    const savedProfile = await profile.save();

    // Create a linked User account for login
    try {
      const existingUser = await User.findOne({ email: savedProfile.email });
      if (!existingUser) {
        const generatedPassword = generateSimplePassword(8);
        const newUser = new User({
          firstName:       savedProfile.firstName,
          lastName:        savedProfile.lastName,
          email:           savedProfile.email,
          password:        generatedPassword,
          vtid:            savedProfile.vtid?.toString(),
          role:            'profile',
          profileType:     'intern',
          isActive:        true,
          isEmailVerified: true,
          isAdminApproved: true,
          profileId:       savedProfile._id,
          startDate:       savedProfile.startDate || new Date(),
        });
        await newUser.save();

        savedProfile.userId = newUser._id;
        await savedProfile.save();

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        await sendUserCredentialsEmail(
          savedProfile.email,
          `${savedProfile.firstName} ${savedProfile.lastName}`,
          generatedPassword,
          `${frontendUrl}/login`
        );
      }
    } catch (userErr) {
      console.error('Error creating user account for profile:', userErr);
    }

    // In-app notifications
    try {
      const linkedUser = await User.findOne({ profileId: savedProfile._id });
      if (linkedUser) {
        await notifyUserCreation(linkedUser, savedProfile, req.session?.user?.userId);
      }
    } catch (notifErr) {
      console.error('Error creating user-creation notifications:', notifErr);
    }

    // Email admins
    try {
      const EmployeesHub = require('../models/EmployeesHub');
      const frontendUrl  = process.env.FRONTEND_URL || 'http://localhost:3000';
      const admins       = await EmployeesHub.find({ role: 'admin' });
      for (const admin of admins) {
        await sendNotificationEmail(
          admin.email,
          `${admin.firstName} ${admin.lastName}`,
          'New Profile Created',
          `A new profile was created:\nName: ${savedProfile.firstName} ${savedProfile.lastName}\nEmail: ${savedProfile.email}`,
          'info'
        );
      }
    } catch (emailErr) {
      console.error('Error sending admin notifications for profile creation:', emailErr);
    }

    res.status(201).json(savedProfile);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Email already exists' });
    res.status(400).json({ message: error.message });
  }
});

// ── PUT /api/profiles/:id ─────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const profileId       = req.params.id;
    const originalProfile = await Profile.findById(profileId);
    if (!originalProfile) return res.status(404).json({ message: 'Profile not found' });

    const updateData = { ...req.body };
    if (Array.isArray(updateData.jobTitle)) {
      updateData.jobTitle = updateData.jobTitle.length > 0 ? updateData.jobTitle[0] : '';
    }

    const updatedProfile = await Profile.findByIdAndUpdate(
      profileId,
      { ...updateData, lastSeen: new Date() },
      { new: true, runValidators: true }
    );

    // Sync certificate profileNames if name changed
    const nameChanged =
      originalProfile.firstName !== updatedProfile.firstName ||
      originalProfile.lastName  !== updatedProfile.lastName;
    if (nameChanged) {
      const newName = `${updatedProfile.firstName} ${updatedProfile.lastName}`;
      await Certificate.updateMany({ profileId }, { profileName: newName });
    }

    // Sync User email if email changed
    if (originalProfile.email !== updatedProfile.email) {
      await User.findOneAndUpdate(
        { profileId },
        { email: updatedProfile.email, firstName: updatedProfile.firstName, lastName: updatedProfile.lastName }
      );
    }

    // In-app notifications
    try {
      const updatedFields = {};
      Object.keys(updateData).forEach(key => {
        if (originalProfile[key] !== updatedProfile[key]) updatedFields[key] = updatedProfile[key];
      });
      if (Object.keys(updatedFields).length > 0) {
        await notifyProfileUpdate(updatedProfile, updatedFields, req.session?.user?.userId);
      }
    } catch (notifErr) {
      console.error('Error creating profile update notifications:', notifErr);
    }

    res.json(updatedProfile);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ── POST /api/profiles/:id/upload-picture ────────────────────────────────
router.post('/:id/upload-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ message: 'File size exceeds 10 MB limit' });
    }

    const profile = await Profile.findByIdAndUpdate(
      req.params.id,
      {
        profilePicture:         `/api/profiles/${req.params.id}/picture`,
        profilePictureData:     req.file.buffer,
        profilePictureSize:     req.file.size,
        profilePictureMimeType: req.file.mimetype,
      },
      { new: true }
    );

    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    res.json({ profilePicture: profile.profilePicture });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── DELETE /api/profiles/:id/delete-picture ───────────────────────────────
router.delete('/:id/delete-picture', async (req, res) => {
  try {
    const profile = await Profile.findByIdAndUpdate(
      req.params.id,
      { $unset: { profilePicture: 1, profilePictureData: 1, profilePictureSize: 1, profilePictureMimeType: 1 } },
      { new: true }
    );
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    res.json({ message: 'Profile picture deleted successfully', profilePicture: null });
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── DELETE /api/profiles/:id ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid profile ID format' });
    }

    const profile = await Profile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    // Email user + admins before deletion
    try {
      await sendNotificationEmail(
        profile.email,
        `${profile.firstName} ${profile.lastName}`,
        'Profile Deletion Notification',
        `Your profile has been deleted from the HRMS system.\n\nIf you have questions, contact your administrator.`,
        'warning'
      );
      const adminUsers = await User.find({ role: 'admin' });
      for (const admin of adminUsers) {
        await sendNotificationEmail(
          admin.email,
          `${admin.firstName} ${admin.lastName}`,
          'Profile Deleted',
          `Profile for ${profile.firstName} ${profile.lastName} (${profile.email}) has been deleted.`,
          'warning'
        );
      }
    } catch (emailErr) {
      console.error('Error sending profile deletion emails:', emailErr);
    }

    // Delete associated certificates and user account
    const deletedCerts = await Certificate.deleteMany({ profileId: req.params.id });
    const assocUser    = await User.findOneAndDelete({ email: profile.email, role: 'user' });

    await Profile.findByIdAndDelete(req.params.id);

    // In-app notifications
    try {
      const adminUsers = await User.find({ role: 'admin' });
      for (const admin of adminUsers) {
        await new Notification({
          recipientType: 'profile',
          profileRef: admin._id,
          type: 'alert',
          title: 'Profile Deleted',
          priority: 'medium',
          message: `Profile deleted: ${profile.firstName} ${profile.lastName}`,
          isRead: false,
        }).save();

        if (deletedCerts.deletedCount > 0) {
          await new Notification({
            recipientType: 'profile',
            profileRef: admin._id,
            type: 'alert',
            title: 'Certificates Deleted',
            priority: 'medium',
            message: `${deletedCerts.deletedCount} certificate(s) deleted with profile: ${profile.firstName} ${profile.lastName}`,
            isRead: false,
          }).save();
        }
      }
    } catch (notifErr) {
      console.error('Error creating delete notifications:', notifErr);
    }

    res.json({
      message: 'Profile and associated data deleted successfully',
      details: {
        profileDeleted:     true,
        certificatesDeleted: deletedCerts.deletedCount,
        userAccountDeleted:  !!assocUser,
      },
    });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
