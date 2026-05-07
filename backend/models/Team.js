const mongoose = require('mongoose');

/**
 * Team Model for Employees Only
 * Stores team information for the Manage Teams section
 * Tracks team members and team metadata
 * Employees ONLY - Profiles do NOT belong to teams
 */
const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    unique: true,
    trim: true
  },
  initials: {
    type: String,
    required: [true, 'Team initials are required'],
    trim: true,
    maxlength: 5
  },
  color: {
    type: String, // Hex color for team avatar background
    default: '#3B82F6'
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Team Members (EmployeesHub only)
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    required: true
  }],
  memberCount: {
    type: Number,
    default: 0
  },
  teamLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeHub',
    default: null
  },
  department: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
teamSchema.index({ isActive: 1 });

// Pre-save middleware to update member count
teamSchema.pre('save', function(next) {
  this.memberCount = this.members.length;
  next();
});

// Method to add a member to the team
teamSchema.methods.addMember = function(employeeId) {
  if (!this.members.includes(employeeId)) {
    this.members.push(employeeId);
    this.memberCount = this.members.length;
  }
  return this.save();
};

// Method to remove a member from the team
teamSchema.methods.removeMember = function(employeeId) {
  this.members = this.members.filter(id => !id.equals(employeeId));
  this.memberCount = this.members.length;
  return this.save();
};

// Static method to get all active teams
teamSchema.statics.getActiveTeams = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to get team with populated members
teamSchema.statics.getTeamWithMembers = function(teamId) {
  return this.findById(teamId).populate('members teamLead');
};

module.exports = mongoose.model('Team', teamSchema);
