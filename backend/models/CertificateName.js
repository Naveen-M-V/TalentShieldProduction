/**
 * CertificateName Model — extracted from server.js (Phase 5 decomposition)
 * Stores a curated list of known certificate type names used in autocomplete.
 */
'use strict';

const mongoose = require('mongoose');

const certificateNameSchema = new mongoose.Schema({
  name:       { type: String, required: true, unique: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdOn:  { type: Date, default: Date.now },
  usageCount: { type: Number, default: 1 }
});

module.exports = mongoose.models.CertificateName || mongoose.model('CertificateName', certificateNameSchema);
