/**
 * Supplier Model — extracted from server.js (Phase 5 decomposition)
 * Used by the certificate / profile management to track training providers.
 */
'use strict';

const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name:       { type: String, required: true, unique: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdOn:  { type: Date, default: Date.now },
  updatedOn:  { type: Date, default: Date.now },
  usageCount: { type: Number, default: 1 }
});

module.exports = mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);
