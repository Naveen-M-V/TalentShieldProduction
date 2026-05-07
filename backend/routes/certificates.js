const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Certificate = require('../models/Certificate'); // adjust path if your model is elsewhere
const {
  notifyCertificateAdded,
  notifyCertificateDeleted,
  notifyCertificateUpdated,
  getUserProfile
} = require('../utils/notificationService');

// ----------------------
// Dashboard Stats
// ----------------------
router.get('/dashboard-stats', async (req, res) => {
  try {
    const allCertificates = await Certificate.find();
    
    // Get days parameter from query, default to 30
    const days = parseInt(req.query.days) || 30;

    // Set time to start of day for accurate comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Active certificates = not expired (today <= expiry date)
    const activeCertificates = allCertificates.filter(cert => {
      const [expDay, expMonth, expYear] = cert.expiryDate.split('/');
      const expiry = new Date(expYear, expMonth - 1, expDay);
      expiry.setHours(23, 59, 59, 999);
      
      return today <= expiry;
    });

    // Expiring certificates = expiring within selected days (but not expired yet)
    const expiringCertificates = allCertificates.filter(cert => {
      const [day, month, year] = cert.expiryDate.split('/');
      const expiry = new Date(year, month - 1, day);
      expiry.setHours(23, 59, 59, 999);
      
      const diffTime = expiry - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= days;
    });

    // Expired certificates
    const expiredCertificates = allCertificates.filter(cert => {
      const [day, month, year] = cert.expiryDate.split('/');
      const expiry = new Date(year, month - 1, day);
      expiry.setHours(23, 59, 59, 999);
      return expiry < today;
    });

    // Category counts
    const categoryCounts = {};
    allCertificates.forEach(cert => {
      categoryCounts[cert.category] = (categoryCounts[cert.category] || 0) + 1;
    });

    // Job role counts
    const jobRoleCounts = {};
    allCertificates.forEach(cert => {
      jobRoleCounts[cert.jobRole] = (jobRoleCounts[cert.jobRole] || 0) + 1;
    });

    res.json({
      activeCount: activeCertificates.length,
      expiringCertificates,
      expiredCertificates,
      categoryCounts,
      jobRoleCounts
    });

  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ----------------------
// Get certificates by employee ID
// ----------------------
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }

    const certificates = await Certificate.find({ 
      ownerType: 'employee', 
      employeeRef: employeeId 
    })
    .populate('uploadedBy', 'firstName lastName employeeId')
    .populate('reviewedBy', 'firstName lastName employeeId')
    .sort({ createdAt: -1 });

    res.json(certificates);

  } catch (error) {
    console.error("Error fetching certificates by employee ID:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ----------------------
// Get certificate by ID
// ----------------------
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid certificate ID' });
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    res.json(certificate);

  } catch (error) {
    console.error("Error fetching certificate by ID:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ----------------------
// Create a new certificate
// ----------------------
router.post('/', async (req, res) => {
  try {
    console.log('Creating certificate with data:', req.body);
    const newCert = new Certificate(req.body);
    const savedCert = await newCert.save();
    
    // Send notification for certificate creation
    try {
      if (savedCert.profileId) {
        const profileData = await getUserProfile(savedCert.profileId);
        if (profileData) {
          const addedByUserId = req.session?.user?.userId || req.user?.userId || req.user?.id;
          await notifyCertificateAdded(savedCert, profileData, addedByUserId);
          console.log('Certificate added notification sent');
        }
      }
    } catch (notifError) {
      console.error('Failed to send certificate added notification:', notifError);
    }
    
    res.status(201).json(savedCert);
  } catch (error) {
    console.error("Error creating certificate:", error);
    console.error("Error details:", error.message);
    
    // Check for validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: "Validation Error", 
        errors: error.errors,
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      message: "Internal Server Error",
      error: error.message 
    });
  }
});

// ----------------------
// Update a certificate
// ----------------------
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid certificate ID' });
    }

    const originalCert = await Certificate.findById(id);
    const updatedCert = await Certificate.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedCert) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    
    // Send notification for certificate update
    try {
      if (updatedCert.profileId && originalCert) {
        const profileData = await getUserProfile(updatedCert.profileId);
        if (profileData) {
          // Detect changed fields
          const updatedFields = {};
          Object.keys(req.body).forEach(key => {
            if (originalCert[key] !== updatedCert[key]) {
              updatedFields[key] = updatedCert[key];
            }
          });
          
          if (Object.keys(updatedFields).length > 0) {
            const updatedByUserId = req.session?.user?.userId || req.user?.userId || req.user?.id;
            await notifyCertificateUpdated(updatedCert, profileData, updatedFields, updatedByUserId);
            console.log('Certificate updated notification sent');
          }
        }
      }
    } catch (notifError) {
      console.error('Failed to send certificate updated notification:', notifError);
    }
    
    res.json(updatedCert);
  } catch (error) {
    console.error("Error updating certificate:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ----------------------
// Delete a certificate
// ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid certificate ID' });
    }

    const deletedCert = await Certificate.findByIdAndDelete(id);
    if (!deletedCert) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    
    // Send notification for certificate deletion
    try {
      if (deletedCert.profileId) {
        const profileData = await getUserProfile(deletedCert.profileId);
        if (profileData) {
          const deletedByUserId = req.session?.user?.userId || req.user?.userId || req.user?.id;
          await notifyCertificateDeleted(deletedCert, profileData, deletedByUserId);
          console.log('Certificate deleted notification sent');
        }
      }
    } catch (notifError) {
      console.error('Failed to send certificate deleted notification:', notifError);
    }
    
    res.json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    console.error("Error deleting certificate:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
