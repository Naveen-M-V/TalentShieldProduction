const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  entityType: {
    type: String,
    enum: ['Goal', 'PerformanceReview', 'ObjectiveRequest', 'ObjectiveCategory'],
    required: true,
    index: true
  },

  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },

  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'approve', 'send_back', 'publish', 'acknowledge'],
    required: true,
    index: true
  },

  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: true
  },

  changedByName: String,

  changes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  ipAddress: String,

  userAgent: String

}, { timestamps: true });

// Indexes
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ changedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
