const mongoose = require('mongoose');

/**
 * Shift Model
 * Defines different shift types with their start and end times
 * Examples: Morning (09:00-17:00), Evening (17:00-01:00), Night (01:00-09:00)
 */
const shiftSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Shift name is required'],
    enum: ['Morning', 'Evening', 'Night'],
    unique: true
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
  },
  color: {
    type: String,
    default: '#3b82f6'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Shift', shiftSchema);
