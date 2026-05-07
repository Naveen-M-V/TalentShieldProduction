'use strict';
/**
 * Startup Utilities
 * Extracted from server.js — functions that run on first DB connection to seed data.
 *
 * Usage (called from the mongoose 'connected' event handler in server.js):
 *   const { createDefaultUser, createDefaultSuppliers, seedDefaultCategories } = require('./utils/startup');
 */

const mongoose = require('mongoose');

// ── createDefaultUser ─────────────────────────────────────────────────────
// Reads SUPER_ADMIN_EMAIL env var and creates super-admin accounts for each.
const createDefaultUser = async () => {
  try {
    const User = require('../models/User');

    // Remove users with old schema artifacts (migration safety)
    await User.deleteMany({
      $or: [
        { department: { $exists: true } },
        { position:   { $exists: true } },
      ],
    });

    const superAdminEmails = (process.env.SUPER_ADMIN_EMAIL || '')
      .split(',').map(e => e.trim()).filter(Boolean);

    if (superAdminEmails.length === 0) {
      console.warn('⚠️  No super admin emails in SUPER_ADMIN_EMAIL env variable');
    }

    for (const email of superAdminEmails) {
      if (!email.includes('@')) {
        console.warn(`Skipping invalid email: ${email}`);
        continue;
      }
      const exists = await User.findOne({ email: email.toLowerCase() });
      if (!exists) {
        const emailPrefix = email.split('@')[0];
        const parts       = emailPrefix.split('.');
        const firstName   = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Admin';
        const lastName    = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'User';

        await new User({
          firstName, lastName,
          email:    email.toLowerCase(),
          password: 'TalentShield@2025',   // Hashed by pre-save hook; admin should change on first login
          role:     'admin',
          isActive: true,
          isEmailVerified: true,
          adminApprovalStatus: 'approved',
        }).save();

        console.log(`✅ Super admin created: ${email}`);
      } else {
        console.log(`⏭️  Super admin already exists: ${email}`);
      }
    }
  } catch (error) {
    console.error('Error creating default super admins:', error);
  }
};

// ── createDefaultSuppliers ────────────────────────────────────────────────
const createDefaultSuppliers = async () => {
  try {
    const Supplier = require('../models/Supplier');

    const defaults = [
      'SKILLS PROVIDER', 'Internal Training', 'External Provider',
      'Certification Body', 'Online Training Platform',
      'Professional Institute', 'Trade Association',
    ];

    for (const name of defaults) {
      if (!await Supplier.findOne({ name })) {
        await new Supplier({ name, usageCount: 0 }).save();
      }
    }
    console.log('✅ Default suppliers ensured');
  } catch (error) {
    console.error('Error creating default suppliers:', error);
  }
};

// ── seedDefaultCategories ─────────────────────────────────────────────────
const seedDefaultCategories = async () => {
  try {
    const ObjectiveCategory = require('../models/ObjectiveCategory');
    const User              = require('../models/User');

    const existing = await ObjectiveCategory.countDocuments();
    if (existing > 0) return;

    const admin = await User.findOne({ role: 'super-admin' }) ||
                  await User.findOne({ role: 'admin' });
    if (!admin) {
      console.warn('⚠️  No admin user found — skipping objective category seed');
      return;
    }

    await ObjectiveCategory.insertMany([
      { name: 'Business Contributor',    createdBy: admin._id, isDefault: true },
      { name: 'Value Creation',          createdBy: admin._id, isDefault: true },
      { name: 'Self / People Development', createdBy: admin._id, isDefault: true },
      { name: 'Other',                   createdBy: admin._id, isDefault: true },
    ]);
    console.log('✅ Default objective categories seeded');
  } catch (error) {
    console.error('Error seeding objective categories:', error);
  }
};

module.exports = { createDefaultUser, createDefaultSuppliers, seedDefaultCategories };
