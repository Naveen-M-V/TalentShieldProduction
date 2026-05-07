'use strict';
/**
 * JobTitle Model
 * Stores available job title options used across the HRMS system.
 */

const mongoose = require('mongoose');

const jobTitleSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true, default: '' },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdOn:   { type: Date, default: Date.now },
  updatedOn:   { type: Date, default: Date.now },
});

module.exports = mongoose.models.JobTitle || mongoose.model('JobTitle', jobTitleSchema);
