const mongoose = require('mongoose');

const objectiveRequestSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: true,
    index: true
  },

  employeeName: String,
  department: String,

  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: true
  },

  requestedByName: String,

  message: {
    type: String,
    required: [true, 'Request message is required']
  },

  deadline: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ['pending', 'completed', 'overdue', 'cancelled'],
    default: 'pending',
    index: true
  },

  completedAt: Date,

  notes: String

}, { timestamps: true });

// Indexes
objectiveRequestSchema.index({ employeeId: 1, status: 1 });
objectiveRequestSchema.index({ requestedBy: 1, status: 1 });
objectiveRequestSchema.index({ deadline: 1, status: 1 });

module.exports = mongoose.model('ObjectiveRequest', objectiveRequestSchema);
