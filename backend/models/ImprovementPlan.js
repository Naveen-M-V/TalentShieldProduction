const mongoose = require('mongoose');

const improvementPlanSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeHub', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeHub', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  goals: [{ description: String, targetDate: Date }],
  reviewComments: { type: String, default: '' },
  outcome: { type: String, enum: ['pass','fail','ongoing','not-set'], default: 'not-set' },
  status: { type: String, enum: ['active','completed','cancelled'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

improvementPlanSchema.index({ employee: 1, startDate: -1 });

module.exports = mongoose.model('ImprovementPlan', improvementPlanSchema);
