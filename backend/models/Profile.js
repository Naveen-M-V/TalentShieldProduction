/**
 * Profile Model — extracted from server.js (Phase 5 decomposition)
 *
 * Represents interns, trainees, and contract-trainees managed by the admin.
 * Each Profile has an associated User record (for authentication) linked via userId/profileId.
 * Profiles are separate from EmployeesHub — they do NOT clock-in or appear on rota.
 */
'use strict';

const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  // User Reference (populated when User account is created for login)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true, index: true },

  // Basic Info
  firstName: { type: String, required: true, index: true },
  lastName:  { type: String, required: true, index: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  mobile:    String,
  dateOfBirth: Date,
  gender: String,

  // Profile Picture (stored as binary in DB)
  profilePicture:         String,   // URL path, e.g. /api/profiles/:id/picture
  profilePictureData:     Buffer,
  profilePictureSize:     Number,
  profilePictureMimeType: String,

  // Job Details
  role:      { type: String, default: 'User' },
  staffType: { type: String, default: 'Direct' },
  company:   { type: String, default: 'VitruX Ltd' },
  jobRole:   [String],
  jobTitle:  { type: String, default: '' },
  jobLevel:  String,
  department: String,
  language:  { type: String, default: 'English' },
  startDate: Date,

  // System IDs
  vtid:               { type: Number, unique: true, sparse: true, index: true },
  skillkoId:          { type: Number, unique: true, index: true },
  externalSystemId:   String,
  extThirdPartySystemId: String,
  nopsID:             String,
  insuranceNumber:    String,

  // Additional Employee Details
  poc:              String,
  nationality:      String,
  circetUIN:        String,
  circetSCID:       String,
  morrisonsIDNumber: String,
  morrisonsUIN:     String,
  status: { type: String, default: 'Onboarding' }, // Onboarded | Onboarding | Dropped Out | Left

  // Emergency Contact
  emergencyContact: {
    name:         String,
    relationship: String,
    phone:        String
  },

  // Address
  address: {
    line1:    String,
    line2:    String,
    city:     String,
    postCode: String,
    country:  { type: String, default: '' }
  },

  // Metadata
  createdOn:      { type: Date, default: Date.now },
  lastSeen:       { type: Date, default: Date.now },
  isActive:       { type: Boolean, default: true },
  emailVerified:  { type: Boolean, default: true },
  mobileVerified: { type: Boolean, default: false },

  bio:              String,
  otherInformation: String
});

// ── Auto-generate VTID (sequential, 1000–9000) ─────────────────────────────
profileSchema.pre('save', async function (next) {
  if (!this.vtid) {
    const lastProfile = await this.constructor
      .findOne({ vtid: { $exists: true } })
      .sort({ vtid: -1 })
      .select('vtid')
      .lean();

    let newVtid = 1000;
    if (lastProfile && lastProfile.vtid) {
      newVtid = lastProfile.vtid + 1;
    }

    if (newVtid > 9000) {
      return next(new Error('VTID limit exceeded. Maximum VTID is 9000.'));
    }

    this.vtid = newVtid;
  }
  next();
});

// ── Auto-generate skillkoId (random 4-digit, unique) ───────────────────────
profileSchema.pre('save', async function (next) {
  if (!this.skillkoId) {
    let newId;
    let isUnique = false;
    while (!isUnique) {
      newId = Math.floor(Math.random() * 9000) + 1000;
      const existing = await this.constructor.findOne({ skillkoId: newId });
      if (!existing) isUnique = true;
    }
    this.skillkoId = newId;
  }
  next();
});

// ── Compound indexes ────────────────────────────────────────────────────────
profileSchema.index({ firstName: 1, lastName: 1, email: 1 });
profileSchema.index({ company: 1, createdOn: -1 });
profileSchema.index({ skillkoId: 1, vtid: 1 });
profileSchema.index({ createdOn: -1 });

module.exports = mongoose.models.Profile || mongoose.model('Profile', profileSchema);
