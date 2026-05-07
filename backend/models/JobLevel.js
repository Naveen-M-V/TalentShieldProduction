'use strict';
const mongoose = require('mongoose');

const jobLevelSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true, default: '' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
  usageCount:  { type: Number, default: 1 }
});

jobLevelSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.models.JobLevel || mongoose.model('JobLevel', jobLevelSchema);
