const mongoose = require('mongoose');

const objectiveCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: true
  },

  isDefault: {
    type: Boolean,
    default: false
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

// Indexes
objectiveCategorySchema.index({ isDefault: 1, isActive: 1 }); // name uniqueness enforced by unique:true on field

module.exports = mongoose.model('ObjectiveCategory', objectiveCategorySchema);
