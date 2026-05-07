'use strict';
/**
 * Legacy Certificate Routes  (Profile-Certificate System)
 * Mounted at:  /api/certificates
 *
 * Uses the "legacy" Certificate schema registered inline in server.js
 * (fields: certificate, category, profileId, expiryDate, fileData, …).
 * This is separate from the unified Certificate model in models/Certificate.js
 * which powers the employee-side certificate system.
 *
 * TODO: Consolidate the two certificate schemas in a future migration.
 */

const express  = require('express');
const mongoose = require('mongoose');
const router   = express.Router();

// Get the legacy Certificate model (registered by server.js before routes load)
const Certificate = require('../models/Certificate');
const Profile     = require('../models/Profile');
const User        = require('../models/User');
const upload      = require('../middleware/upload');
const { validateCertificateInput } = require('../middleware/validators');
const {
  sendNotificationEmail,
} = require('../utils/emailService');
const {
  notifyCertificateAdded,
  notifyCertificateDeleted,
  notifyCertificateUpdated,
} = require('../utils/notificationService');

// ── Date helpers ─────────────────────────────────────────────────────────
const parseDateString = (dateString) => {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;
  try {
    const clean = dateString.toString().trim();
    let date;
    if (clean.match(/^\d{4}-\d{2}-\d{2}/)) {
      date = new Date(clean);
    } else if (clean.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [day, month, year] = clean.split('/');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      date = new Date(clean);
    }
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const parseExpiryDate = (dateString) => {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;
  try {
    const clean = dateString.toString().trim();
    let date;
    if (clean.match(/^\d{4}-\d{2}-\d{2}/)) {
      date = new Date(clean);
    } else if (clean.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [day, month, year] = clean.split('/');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (clean.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
      const [year, month, day] = clean.split('/');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      date = new Date(clean);
    }
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date format: ${dateString}`);
      return null;
    }
    return date;
  } catch {
    return null;
  }
};

// ── GET /api/certificates ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const certificates = await Certificate.find()
      .select('-fileData')
      .sort({ createdOn: -1 })
      .populate('profileId', 'vtid firstName lastName');
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/certificates/dashboard-stats ────────────────────────────────
router.get('/dashboard-stats', async (req, res) => {
  try {
    const days  = Number.parseInt(req.query.days, 10) || 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date();
    cutoff.setDate(today.getDate() + days);
    cutoff.setHours(23, 59, 59, 999);

    const allCertificates = await Certificate.find(
      { expiryDate: { $exists: true, $ne: null } },
      { certificate: 1, expiryDate: 1, profileId: 1, profileName: 1, category: 1, active: 1, status: 1 }
    )
      .populate('profileId', 'firstName lastName')
      .lean();

    const categoryCounts = {};
    const expiring = [];
    const expired  = [];
    const active   = [];

    for (const cert of allCertificates) {
      const expiryDate = parseExpiryDate(cert.expiryDate);
      if (!expiryDate) continue;
      expiryDate.setHours(23, 59, 59, 999);

      const base = {
        id:          cert._id?.toString?.() || cert.id,
        certificate: cert.certificate,
        expiryDate:  cert.expiryDate,
        profileName: cert.profileName || [cert.profileId?.firstName, cert.profileId?.lastName].filter(Boolean).join(' '),
      };

      if (expiryDate >= today) {
        active.push(cert);
        if (cert.category) categoryCounts[cert.category] = (categoryCounts[cert.category] || 0) + 1;
      }

      if (expiryDate >= today && expiryDate <= cutoff) {
        expiring.push({ ...base, _expiry: expiryDate });
      } else if (expiryDate < today) {
        expired.push({ ...base, _expiry: expiryDate });
      }
    }

    expiring.sort((a, b) => a._expiry - b._expiry);
    expired.sort((a, b) => a._expiry - b._expiry);

    res.json({
      activeCount:          active.length,
      expiringCertificates: expiring.slice(0, 10).map(({ _expiry, ...rest }) => rest),
      expiredCertificates:  expired.slice(0, 10).map(({ _expiry, ...rest }) => rest),
      categoryCounts,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/certificates/analytics/stats ────────────────────────────────
router.get('/analytics/stats', async (req, res) => {
  try {
    const today         = new Date();
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(today.getDate() + 30);

    const [total, active, withExpiry] = await Promise.all([
      Certificate.countDocuments(),
      Certificate.countDocuments({ active: 'Yes', status: 'Approved' }),
      Certificate.find({ active: 'Yes', status: 'Approved', expiryDate: { $exists: true, $ne: null } }),
    ]);

    let expiring = 0, expired = 0;
    withExpiry.forEach(cert => {
      const d = parseExpiryDate(cert.expiryDate);
      if (!d) return;
      if (d < today)            expired++;
      else if (d <= thirtyDaysOut) expiring++;
    });

    res.json({ total, active, expiring, expired });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/certificates/analytics/by-category ──────────────────────────
router.get('/analytics/by-category', async (req, res) => {
  try {
    const certs = await Certificate.find({ active: 'Yes', status: 'Approved' });
    const counts = {};
    certs.forEach(c => {
      const cat = c.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    res.json(counts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/certificates/analytics/by-job-role ──────────────────────────
router.get('/analytics/by-job-role', async (req, res) => {
  try {
    const certs = await Certificate.find({ active: 'Yes', status: 'Approved' });
    const counts = {};
    certs.forEach(c => {
      const jr = c.jobRole || 'Unspecified';
      counts[jr] = (counts[jr] || 0) + 1;
    });
    res.json(counts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/certificates/expiring/:days ─────────────────────────────────
router.get('/expiring/:days?', async (req, res) => {
  try {
    const days       = parseInt(req.params.days) || 30;
    const today      = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const certs = await Certificate.find({
      active: 'Yes', status: 'Approved', expiryDate: { $exists: true, $ne: null },
    }).populate('profileId');

    const result = certs.filter(c => {
      const d = parseExpiryDate(c.expiryDate);
      return d && d >= today && d <= futureDate;
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/certificates/expired ────────────────────────────────────────
router.get('/expired', async (req, res) => {
  try {
    const today = new Date();
    const certs = await Certificate.find({
      active: 'Yes', expiryDate: { $exists: true, $ne: null },
    }).populate('profileId');

    res.json(certs.filter(c => {
      const d = parseExpiryDate(c.expiryDate);
      return d && d < today;
    }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/certificates/debug-dates ────────────────────────────────────
router.get('/debug-dates', async (req, res) => {
  try {
    const today = new Date();
    const certs = await Certificate.find({ expiryDate: { $exists: true, $ne: null } }).limit(10);
    res.json({
      today,
      certificates: certs.map(c => {
        const d = parseExpiryDate(c.expiryDate);
        return {
          id: c._id, certificate: c.certificate, originalDate: c.expiryDate,
          parsedDate: d, isValid: d && !isNaN(d.getTime()),
          isExpired: d && d < today,
          daysFromNow: d ? Math.ceil((d - today) / (1000 * 60 * 60 * 24)) : null,
        };
      }),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── POST /api/certificates/delete-request ────────────────────────────────
router.post('/delete-request', async (req, res) => {
  try {
    const { certificateId, certificateName, userEmail, userName, profileId } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@talentshield.com';
    await sendNotificationEmail(
      adminEmail, 'Super Admin',
      `Certificate Deletion Request - ${certificateName}`,
      `Certificate deletion requested by ${userName} for: ${certificateName}`,
      'warning'
    );
    res.json({ message: 'Delete request sent successfully' });
  } catch (error) {
    console.error('Error sending delete request email:', error);
    res.status(500).json({ message: 'Failed to send delete request' });
  }
});

// ── GET /api/certificates/:id ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id)
      .select('-fileData')
      .populate('profileId', 'vtid firstName lastName');
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });
    res.json(cert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── POST /api/certificates ────────────────────────────────────────────────
router.post('/', upload.single('certificateFile'), validateCertificateInput, async (req, res) => {
  try {
    const certData = { ...req.body };

    if (certData.profileId) {
      if (!mongoose.Types.ObjectId.isValid(certData.profileId)) {
        return res.status(400).json({ message: 'Invalid profileId format' });
      }
      const profile = await Profile.findById(certData.profileId);
      if (!profile) return res.status(404).json({ message: 'Profile not found' });
      certData.profileName = `${profile.firstName} ${profile.lastName}`;
    }

    if (req.file) {
      certData.certificateFile = req.file.originalname;
      certData.fileData        = req.file.buffer;
      certData.fileSize        = req.file.size;
      certData.mimeType        = req.file.mimetype;
    }

    const saved = await new Certificate(certData).save();

    // Notifications
    if (certData.profileId) {
      try {
        const profile = await Profile.findById(certData.profileId);
        if (profile) {
          await sendNotificationEmail(
            profile.email, `${profile.firstName} ${profile.lastName}`,
            'Certificate Added',
            `Certificate "${saved.certificate}" (${saved.category}) has been added to your profile.`,
            'success'
          );
          await notifyCertificateAdded(saved, profile, req.session?.user?.userId);
        }
      } catch (notifErr) {
        console.error('Error sending certificate-added notifications:', notifErr);
      }
    }

    res.status(201).json(saved);
  } catch (error) {
    console.error('Certificate creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

// ── PUT /api/certificates/:id ─────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const original = await Certificate.findById(req.params.id).populate('profileId');
    if (!original) return res.status(404).json({ message: 'Certificate not found' });

    const updated = await Certificate.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedOn: new Date() },
      { new: true, runValidators: true }
    ).populate('profileId').select('-fileData');

    // Notifications for significant field changes
    try {
      const profile = updated.profileId;
      if (profile) {
        const sig     = ['certificate', 'expiryDate', 'status', 'approvalStatus'];
        const changed = {};
        sig.forEach(f => { if (original[f] !== updated[f]) changed[f] = updated[f]; });
        if (Object.keys(changed).length) {
          await notifyCertificateUpdated(updated, profile, changed, req.session?.user?.userId);
        }
      }
    } catch (notifErr) {
      console.error('Error sending certificate-updated notifications:', notifErr);
    }

    res.json(updated);
  } catch (error) {
    console.error('Certificate update error:', error);
    res.status(400).json({ message: error.message });
  }
});

// ── PUT /api/certificates/:id/upload ─────────────────────────────────────
router.put('/:id/upload', upload.single('certificateFile'), async (req, res) => {
  try {
    const updateData = { updatedOn: new Date(), ...req.body };

    if (req.file) {
      updateData.certificateFile = req.file.originalname;
      updateData.fileData        = req.file.buffer;
      updateData.fileSize        = req.file.size;
      updateData.mimeType        = req.file.mimetype;
    }

    const cert = await Certificate.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });

    res.json(cert);
  } catch (error) {
    console.error('Error in certificate file upload:', error);
    res.status(400).json({ message: error.message });
  }
});

// ── GET /api/certificates/:id/file ───────────────────────────────────────
router.get('/:id/file', async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert)            return res.status(404).json({ message: 'Certificate not found' });
    if (!cert.fileData)   return res.status(404).json({ message: 'No file found for this certificate' });

    res.set({
      'Content-Type':        cert.mimeType || 'application/octet-stream',
      'Content-Length':      cert.fileSize,
      'Content-Disposition': `inline; filename="${cert.certificateFile}"`,
      'Cache-Control':       'public, max-age=31536000',
    });
    res.send(cert.fileData);
  } catch (error) {
    console.error('Error serving certificate file:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── DELETE /api/certificates/:id/file ────────────────────────────────────
router.delete('/:id/file', async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });

    cert.certificateFile = null;
    cert.fileData        = null;
    cert.fileSize        = null;
    cert.mimeType        = null;
    cert.updatedOn       = new Date();
    await cert.save();

    const updated = await Certificate.findById(req.params.id).select('-fileData');
    res.json({ message: 'Certificate file deleted successfully', certificate: updated });
  } catch (error) {
    console.error('Error deleting certificate file:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── DELETE /api/certificates/:id ─────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id).populate('profileId');
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });

    const profile = cert.profileId;
    await Certificate.findByIdAndDelete(req.params.id);

    // Notifications
    if (profile) {
      try {
        await sendNotificationEmail(
          profile.email, `${profile.firstName} ${profile.lastName}`,
          'Certificate Deleted',
          `Certificate "${cert.certificate}" has been removed from your profile.`,
          'warning'
        );
        await notifyCertificateDeleted(cert, profile, req.session?.user?.userId);
      } catch (notifErr) {
        console.error('Error sending certificate-deleted notifications:', notifErr);
      }
    }

    res.json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
