const Team = require('../models/Team');
const EmployeeHub = require('../models/EmployeesHub');

/**
 * Get all teams
 */
exports.getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find({ isActive: true })
      .populate('members', 'firstName lastName jobTitle email')
      .populate('teamLead', 'firstName lastName')
      .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      count: teams.length,
      data: teams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching teams',
      error: error.message
    });
  }
};

/**
 * Get a single team by ID with filtered active members
 */
exports.getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate({
        path: 'members',
        select: 'firstName lastName jobTitle email office status isActive deleted',
        match: { 
          status: 'Active', 
          isActive: true, 
          deleted: { $ne: true } 
        }
      })
      .populate('teamLead', 'firstName lastName');
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Auto-clean invalid member IDs (null, undefined, or non-existent)
    const validMembers = team.members.filter(member => member != null);
    if (validMembers.length !== team.members.length) {
      console.log(`🧹 Cleaning ${team.members.length - validMembers.length} invalid member IDs from team ${team._id}`);
      await Team.updateOne(
        { _id: team._id },
        { $pull: { members: null } }
      );
      team.members = validMembers;
    }
    
    res.status(200).json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching team',
      error: error.message
    });
  }
};

/**
 * Create a new team
 */
exports.createTeam = async (req, res) => {
  try {
    const { name, initials, color, description, members, teamLead, department } = req.body;
    
    // Check if team with same name already exists
    const existingTeam = await Team.findOne({ name });
    if (existingTeam) {
      if (existingTeam.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Team with this name already exists'
        });
      }
      // Remove the stale inactive record to free up the name
      await Team.deleteOne({ _id: existingTeam._id });
    }
    
    // Create new team
    const team = await Team.create({
      name,
      initials,
      color: color || '#3B82F6',
      description,
      members: members || [],
      teamLead,
      department
    });
    
    // Update employees' team field
    if (members && members.length > 0) {
      await EmployeeHub.updateMany(
        { _id: { $in: members } },
        { $set: { team: name } }
      );
    }
    
    const populatedTeam = await Team.findById(team._id)
      .populate('members', 'firstName lastName jobTitle email')
      .populate('teamLead', 'firstName lastName');
    
    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: populatedTeam
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Team with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating team',
      error: error.message || 'Unknown error'
    });
  }
};

/**
 * Update a team
 */
exports.updateTeam = async (req, res) => {
  try {
    const { name, initials, color, description, members, teamLead, department } = req.body;
    
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Update team fields
    if (name) team.name = name;
    if (initials) team.initials = initials;
    if (color) team.color = color;
    if (description !== undefined) team.description = description;
    if (teamLead !== undefined) team.teamLead = teamLead;
    if (department !== undefined) team.department = department;
    
    // Update members if provided
    if (members) {
      // Remove team assignment from old members
      const oldMembers = team.members.filter(
        memberId => !members.includes(memberId.toString())
      );
      if (oldMembers.length > 0) {
        await EmployeeHub.updateMany(
          { _id: { $in: oldMembers } },
          { $set: { team: '' } }
        );
      }
      
      // Add team assignment to new members
      const newMembers = members.filter(
        memberId => !team.members.some(oldId => oldId.toString() === memberId)
      );
      if (newMembers.length > 0) {
        await EmployeeHub.updateMany(
          { _id: { $in: newMembers } },
          { $set: { team: name || team.name } }
        );
      }
      
      team.members = members;
    }
    
    await team.save();
    
    const updatedTeam = await Team.findById(team._id)
      .populate('members', 'firstName lastName jobTitle email')
      .populate('teamLead', 'firstName lastName');
    
    res.status(200).json({
      success: true,
      message: 'Team updated successfully',
      data: updatedTeam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating team',
      error: error.message
    });
  }
};

/**
 * Delete a team (hard delete)
 */
exports.deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Remove team assignment from all members
    await EmployeeHub.updateMany(
      { _id: { $in: team.members } },
      { $set: { team: '' } }
    );
    
    // Hard delete the team so name can be reused
    await Team.deleteOne({ _id: team._id });
    
    res.status(200).json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting team',
      error: error.message
    });
  }
};

/**
 * Add member to team
 */
exports.addMemberToTeam = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    const employee = await EmployeeHub.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    await team.addMember(employeeId);
    employee.team = team.name;
    await employee.save();
    
    const updatedTeam = await Team.findById(team._id)
      .populate('members', 'firstName lastName jobTitle email');
    
    res.status(200).json({
      success: true,
      message: 'Member added to team successfully',
      data: updatedTeam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding member to team',
      error: error.message
    });
  }
};

/**
 * Remove member from team
 */
exports.removeMemberFromTeam = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    await team.removeMember(employeeId);
    
    const employee = await EmployeeHub.findById(employeeId);
    if (employee) {
      employee.team = '';
      await employee.save();
    }
    
    const updatedTeam = await Team.findById(team._id)
      .populate('members', 'firstName lastName jobTitle email');
    
    res.status(200).json({
      success: true,
      message: 'Member removed from team successfully',
      data: updatedTeam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing member from team',
      error: error.message
    });
  }
};
