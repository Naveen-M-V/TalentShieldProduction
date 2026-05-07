const mongoose = require('mongoose');

const performanceNoteSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeHub', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeHub', required: true },
  content: { type: String, required: true },
  visibility: { type: String, enum: ['hr_manager_only','private'], default: 'hr_manager_only' },
  createdAt: { type: Date, default: Date.now }
});

performanceNoteSchema.index({ employee: 1, createdAt: -1 });

module.exports = mongoose.model('PerformanceNote', performanceNoteSchema);
