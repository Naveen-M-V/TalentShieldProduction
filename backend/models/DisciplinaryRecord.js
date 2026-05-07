const mongoose = require('mongoose');

const disciplinarySchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeHub', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeHub', required: true },
  type: { type: String, enum: ['verbal','written','final'], required: true },
  reason: { type: String, required: true },
  outcome: { type: String, default: '' },
  attachments: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

disciplinarySchema.index({ employee: 1, createdAt: -1 });

module.exports = mongoose.model('DisciplinaryRecord', disciplinarySchema);
