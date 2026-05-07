/**
 * Goals Controller
 * 
 * Handles goal CRUD operations and admin functions
 * - Users can create, read, update, delete their own goals
 * - Admins can view all goals, approve, and add comments
 * - Includes company-wide summary statistics
 */

const Goal = require('../models/Goal');
const EmployeeHub = require('../models/EmployeesHub');
const mongoose = require('mongoose');
const { ADMIN_ROLES, ADMIN_SCOPE_ROLES, MANAGER_SCOPE_ROLES } = require('../utils/roles');
const { resolveActorId } = require('../utils/identityHelper');
const hierarchyHelper = require('../utils/hierarchyHelper');

const resolveEmployeeForRequest = async (req) => {
  if (!req.user) {
    console.error('❌ No req.user found in request');
    return null;
  }

  console.log('🔍 Resolving employee for user:', {
    id: req.user.id,
    _id: req.user._id,
    userId: req.user.userId,
    email: req.user.email
  });

  const authId = resolveActorId(req);
  const authIdStr = authId ? String(authId).trim() : '';
  let employee = null;

  // Try finding by userId field in EmployeesHub (User._id stored here)
  if (authIdStr && mongoose.Types.ObjectId.isValid(authIdStr)) {
    console.log('🔍 Searching by userId field:', authIdStr);
    employee = await EmployeeHub.findOne({ userId: authIdStr });
    if (employee) {
      console.log('✅ Found employee by userId field:', employee._id);
    } else {
      console.log('⚠️  No employee found by userId field, trying direct _id match');
      employee = await EmployeeHub.findById(authIdStr);
      if (employee) {
        console.log('✅ Found employee by _id:', employee._id);
      }
    }
  }

  // Fall back to email lookup
  if (!employee && req.user.email) {
    console.log('🔍 Searching by email:', req.user.email);
    employee = await EmployeeHub.findOne({ email: String(req.user.email).toLowerCase() });
    if (employee) {
      console.log('✅ Found employee by email:', employee._id);
    }
  }

  if (!employee) {
    console.error('❌ Could not resolve employee for user:', req.user.email || req.user.id);
  }

  return employee;
};

const getManagedEmployeeIds = async (req) => {
  const managerEmployee = await resolveEmployeeForRequest(req);
  if (!managerEmployee?._id) {
    return [];
  }

  const userRole = req.user?.role || req.session?.role;
  const includeIndirect = ['senior-manager', 'hr', 'admin', 'super-admin'].includes(userRole);
  const subordinates = await hierarchyHelper.getSubordinates(managerEmployee._id, includeIndirect);
  return subordinates.map((employee) => String(employee._id));
};

/**
 * Get goal by ID
 * GET /api/goals/:id
 */
exports.getGoalById = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role || req.session?.role;
    const isAdmin = ADMIN_SCOPE_ROLES.includes(userRole);
    const employee = await resolveEmployeeForRequest(req);

    if (!isAdmin && !employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    const goal = await Goal.findById(id)
      .populate('userId', 'firstName lastName email department')
      .populate('createdBy', 'firstName lastName email')
      .populate('adminComments.addedBy', 'firstName lastName email')
      .lean();

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    if (!isAdmin && goal.userId?.toString?.() !== employee._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this goal'
      });
    }

    res.json({
      success: true,
      data: goal
    });
  } catch (error) {
    console.error('Error fetching goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goal',
      error: error.message
    });
  }
};

/**
 * Get user's goals
 * GET /api/goals/my
 */
exports.getUserGoals = async (req, res) => {
  try {
    const employee = await resolveEmployeeForRequest(req);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    const goals = await Goal.find({ userId: employee._id })
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: goals.length,
      data: goals
    });
  } catch (error) {
    console.error('Error fetching user goals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goals',
      error: error.message
    });
  }
};

/**
 * Get goals for a specific employee (admin only)
 * GET /api/goals/employee/:employeeId
 */
exports.getGoalsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const userRole = req.user?.role || req.session?.role;
    const isAdminScope = ADMIN_SCOPE_ROLES.includes(userRole);
    const isManagerScope = MANAGER_SCOPE_ROLES.includes(userRole);

    if (!isManagerScope) {
      return res.status(403).json({
        success: false,
        message: 'Manager access required to view employee goals'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID'
      });
    }

    if (!isAdminScope) {
      const managedEmployeeIds = await getManagedEmployeeIds(req);
      if (!managedEmployeeIds.includes(String(employeeId))) {
        return res.status(403).json({
          success: false,
          message: 'You can only view objectives for your team members'
        });
      }
    }

    const goals = await Goal.find({ userId: employeeId })
      .populate('userId', 'firstName lastName email department')
      .populate('createdBy', 'firstName lastName email')
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: goals.length,
      data: goals
    });
  } catch (error) {
    console.error('Error fetching employee goals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee goals',
      error: error.message
    });
  }
};

/**
 * Create a new goal
 * POST /api/goals
 */
exports.createGoal = async (req, res) => {
  try {
    const {
      title, description, category, deadline, startDate, endDate,
      progressPercent, status,
      userId: targetUserId, userIds,
      targetEmployeeId  // frontend alias for targetUserId
    } = req.body;
    const currentUserId = req.user?._id || req.user?.id || req.session?.userId;
    const userRole = req.user?.role || req.session?.role;
    const isManagerUser = MANAGER_SCOPE_ROLES.includes(userRole);

    // Validate required fields — only title is required; deadline & description are optional
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Date validation
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date'
      });
    }

    let goalOwnerIds = [];
    if (isManagerUser) {
      const ownerTarget = targetUserId || targetEmployeeId;
      if (Array.isArray(userIds) && userIds.length > 0) {
        goalOwnerIds = userIds;
      } else if (ownerTarget) {
        goalOwnerIds = [ownerTarget];
      }
    }

    if (!goalOwnerIds.length) {
      const employee = await resolveEmployeeForRequest(req);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee record not found'
        });
      }
      goalOwnerIds = [employee._id];
    }

    // Get employee documents
    const employeeDocs = await EmployeeHub.find({ _id: { $in: goalOwnerIds } });
    if (!employeeDocs.length) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const employeeById = new Map(employeeDocs.map((e) => [e._id.toString(), e]));
    const missing = goalOwnerIds.filter((id) => !employeeById.has(String(id)));
    if (missing.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more employees were not found',
        missingUserIds: missing
      });
    }

    if (isManagerUser && !ADMIN_SCOPE_ROLES.includes(userRole)) {
      const managedEmployeeIds = await getManagedEmployeeIds(req);
      const unauthorizedTargets = goalOwnerIds.filter((id) => !managedEmployeeIds.includes(String(id)));
      if (unauthorizedTargets.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only create objectives for your team members'
        });
      }
    }

    const resolvedStatus = ['TO_DO', 'IN_PROGRESS', 'ACHIEVED', 'OVERDUE'].includes(status)
      ? status : 'TO_DO';

    const resolvedDeadline = deadline || endDate || null;
    const normalizedDeadline = resolvedDeadline ? new Date(resolvedDeadline) : null;
    const finalDeadline = normalizedDeadline && !Number.isNaN(normalizedDeadline.getTime())
      ? normalizedDeadline
      : null;

    const goalPayload = goalOwnerIds.map((id) => {
      const employee = employeeById.get(String(id));
      const setBy = isManagerUser ? 'manager' : 'employee';
      return {
        userId: employee._id,
        title: title.trim(),
        description: description ? description.trim() : '',
        category: category || 'Business Contributor',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        deadline: finalDeadline,
        progressPercent: Number(progressPercent) || 0,
        progress: Number(progressPercent) || 0,
        status: resolvedStatus,
        createdBy: currentUserId,
        setBy,
        approvalStatus: setBy === 'manager' ? 'approved' : 'pending'
      };
    });

    const createdGoals = await Goal.insertMany(goalPayload, { ordered: true });

    // Notify manager when employee creates objective
    if (!isManagerUser && createdGoals.length) {
      try {
        const employee = await resolveEmployeeForRequest(req);
        const Notification = require('../models/Notification');
        if (employee?._id) {
          await Notification.create({
            recipientType: 'employee',
            employeeRef: employee._id,
            type: 'objective_request',
            title: 'Objective Submitted for Approval',
            message: `Your objective "${title.trim()}" has been submitted and is awaiting manager approval`,
            priority: 'medium',
            metadata: { relatedId: createdGoals[0]._id, relatedType: 'Goal' },
            actionUrl: '/performance',
            actionText: 'View Objective'
          });
        }
      } catch (notifErr) {
        console.error('Notification error (non-fatal):', notifErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      count: createdGoals.length,
      data: createdGoals
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create goal',
      error: error.message
    });
  }
};

/**
 * Create multiple goals for a single employee (batch)
 * POST /api/goals/batch-create
 */
exports.batchCreateGoals = async (req, res) => {
  try {
    const { employeeId, goals } = req.body;
    const currentUserId = req.user?._id || req.session?.userId;
    const userRole = req.user?.role || req.session?.role;
    const isAdmin = ADMIN_ROLES.includes(userRole);

    // Validate required fields
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    if (!Array.isArray(goals) || goals.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Goals array is required and must contain at least one goal'
      });
    }

    // Only admins can batch create goals for others
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can batch create goals'
      });
    }

    // Validate each goal
    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];
      if (!goal.objective || !goal.startDate || !goal.endDate) {
        return res.status(400).json({
          success: false,
          message: `Goal ${i + 1}: Objective, start date, and end date are required`
        });
      }
      // Date validation
      if (new Date(goal.endDate) < new Date(goal.startDate)) {
        return res.status(400).json({
          success: false,
          message: `Goal ${i + 1}: End date cannot be before start date`
        });
      }
    }

    // Fetch employee
    const employee = await EmployeeHub.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Build goal payloads matching frontend structure
    const setBy = isAdmin ? 'manager' : 'employee';
    
    const goalPayloads = goals.map((goal) => ({
      userId: employee._id,
      title: goal.objective.trim(),
      description: goal.objective.trim(),
      category: goal.category || 'Business Contributor',
      startDate: new Date(goal.startDate),
      endDate: new Date(goal.endDate),
      deadline: new Date(goal.endDate),
      progress: Number(goal.progressPercent) || 0,
      progressPercent: Number(goal.progressPercent) || 0,
      status: ['TO_DO', 'IN_PROGRESS', 'ACHIEVED', 'OVERDUE'].includes(goal.status) ? goal.status : 'TO_DO',
      createdBy: currentUserId,
      setBy,
      approvalStatus: setBy === 'manager' ? 'approved' : 'pending'
    }));

    // Insert all goals in batch
    const createdGoals = await Goal.insertMany(goalPayloads, { ordered: true });

    // Return success with count and employee name
    res.status(201).json({
      success: true,
      message: `Successfully created ${createdGoals.length} goals for ${employee.firstName} ${employee.lastName}`,
      createdCount: createdGoals.length,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      data: createdGoals
    });
  } catch (error) {
    console.error('Error batch creating goals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create goals',
      error: error.message
    });
  }
};

/**
 * Update a goal
 * PUT /api/goals/:id
 */
exports.updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, deadline, endDate, startDate, progress, progressPercent, status } = req.body;
    const userRole = req.user?.role || req.session?.role;
    const isAdmin = ADMIN_ROLES.includes(userRole);
    const isManager = MANAGER_SCOPE_ROLES.includes(userRole);
    const employee = await resolveEmployeeForRequest(req);

    if (!isAdmin && !isManager && !employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    const goal = await Goal.findById(id);
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Check permissions
    const isOwnGoal = employee && goal.userId.toString() === employee._id.toString();
    const isManagerOfGoalOwner = isManager && !isAdmin 
      ? (await getManagedEmployeeIds(req)).includes(String(goal.userId))
      : false;
    const hasPermission = isAdmin || isOwnGoal || isManagerOfGoalOwner;

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this goal'
      });
    }

    // Date validation for updates
    const newStart = startDate ? new Date(startDate) : goal.startDate;
    const newEnd = endDate ? new Date(endDate) : goal.endDate;
    if (newStart && newEnd && new Date(newEnd) < new Date(newStart)) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date'
      });
    }

    // Track if we need to reset approval due to progress/status changes
    const progressChanged = (typeof progressPercent === 'number' && progressPercent !== goal.progressPercent)
      || (typeof progress === 'number' && progress !== goal.progress);
    const statusChanged = status && status !== goal.status;

    // If objective was sent_back and employee updates it, reset to pending for re-review
    if (!isAdmin && !isManager && goal.approvalStatus === 'sent_back' && (progressChanged || statusChanged || req.body.description || req.body.title)) {
      goal.approvalStatus = 'pending';
      goal.sentBackReason = null;
    }

    // Update allowed fields
    if (!isAdmin && !isManagerOfGoalOwner) {
      // Employees can only edit objectives that are not yet approved
      if (goal.approvalStatus === 'approved') {
        return res.status(403).json({
          success: false,
          message: 'Approved objectives cannot be edited. Contact your manager.'
        });
      }
    }

    // Managers can only update progress/status on approved goals, not structural changes
    if (isManagerOfGoalOwner && goal.approvalStatus === 'approved') {
      const allowedFields = ['progress', 'progressPercent', 'status'];
      const requestedFields = Object.keys(req.body).filter(k => req.body[k] !== undefined);
      const hasDisallowedField = requestedFields.some(k => !allowedFields.includes(k));
      if (hasDisallowedField) {
        return res.status(403).json({
          success: false,
          message: 'You can only update progress and status for approved objectives'
        });
      }
    }

    if (title) goal.title = title.trim();
    if (description !== undefined) goal.description = description.trim();
    if (category) goal.category = category;
    if (deadline) goal.deadline = new Date(deadline);
    if (endDate) goal.endDate = new Date(endDate);
    if (startDate) goal.startDate = new Date(startDate);
    const resolvedProgress = typeof progressPercent === 'number' ? progressPercent
      : (typeof progress === 'number' ? progress : undefined);
    if (typeof resolvedProgress === 'number') {
      goal.progress = Math.min(Math.max(resolvedProgress, 0), 100);
      goal.progressPercent = goal.progress;
    }
    if (status && ['TO_DO', 'IN_PROGRESS', 'ACHIEVED', 'OVERDUE'].includes(status)) {
      goal.status = status;
    }

    goal.updatedAt = new Date();
    await goal.save();

    res.json({
      success: true,
      message: 'Goal updated successfully',
      data: goal
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update goal',
      error: error.message
    });
  }
};

/**
 * Delete a goal
 * DELETE /api/goals/:id
 */
exports.deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role || req.session?.role;
    const isAdmin = ADMIN_ROLES.includes(userRole);
    const employee = await resolveEmployeeForRequest(req);

    if (!isAdmin && !employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    const goal = await Goal.findById(id);
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Users can only delete unapproved goals
    if (!isAdmin && goal.userId.toString() !== employee._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own goals'
      });
    }

    if (goal.approvalStatus === 'approved' && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete approved objectives'
      });
    }

    await Goal.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete goal',
      error: error.message
    });
  }
};

/**
 * Get all goals with filters (admin only)
 * GET /api/goals?department=&employee=
 */
exports.getAllGoals = async (req, res) => {
  try {
    const userRole = req.user?.role || req.session?.role;
    const isAdminScope = ADMIN_SCOPE_ROLES.includes(userRole);

    // Managers and admins can view all goals
    if (!MANAGER_SCOPE_ROLES.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view all goals'
      });
    }

    const { department, employee, status, approvalStatus } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;
    if (approvalStatus && approvalStatus !== 'all') query.approvalStatus = approvalStatus;

    if (!isAdminScope) {
      const managedEmployeeIds = await getManagedEmployeeIds(req);
      if (employee) {
        if (!managedEmployeeIds.includes(String(employee))) {
          return res.status(403).json({
            success: false,
            message: 'You can only view objectives for your team members'
          });
        }
        query.userId = employee;
      } else {
        query.userId = { $in: managedEmployeeIds };
      }
    } else if (employee && mongoose.Types.ObjectId.isValid(employee)) {
      query.userId = employee;
    }

    const goals = await Goal.find(query)
      .populate('userId', 'firstName lastName email department')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    const filteredGoals = department
      ? goals.filter((goal) => String(goal.userId?.department || '').toLowerCase() === String(department).toLowerCase())
      : goals;

    res.json({
      success: true,
      count: filteredGoals.length,
      data: filteredGoals
    });
  } catch (error) {
    console.error('Error fetching all goals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goals',
      error: error.message
    });
  }
};

/**
 * Approve a goal (admin only)
 * POST /api/goals/:id/approve
 */
exports.approveGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role || req.session?.role;

    // Only admins can approve
    if (userRole !== 'admin' && userRole !== 'super-admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to approve goals'
      });
    }

    // Use findByIdAndUpdate to avoid re-validating unchanged fields
    // This prevents validation errors on denormalized fields (employeeName, department)
    const goal = await Goal.findByIdAndUpdate(
      id,
      { 
        adminApproved: true,
        updatedAt: new Date()
      },
      { 
        new: true,
        runValidators: false  // Skip validation on fields we're not changing
      }
    ).populate('userId', 'firstName lastName email department');

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    res.json({
      success: true,
      message: 'Goal approved successfully',
      data: goal
    });
  } catch (error) {
    console.error('Error approving goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve goal',
      error: error.message
    });
  }
};

/**
 * Add comment to a goal (admin only)
 * POST /api/goals/:id/comment
 */
exports.addCommentToGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userRole = req.user?.role || req.session?.role;
    const userId = req.user?._id || req.user?.id || req.session?.userId;

    // Only admins can comment
    if (!ADMIN_ROLES.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to comment on goals'
      });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot be empty'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const goal = await Goal.findById(id);
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Determine the model type for the user
    const userModel = req.user?.userType === 'employee' ? 'EmployeeHub' : 'User';

    goal.adminComments.push({
      comment: comment.trim(),
      addedBy: userId,
      addedByModel: userModel,
      addedAt: new Date()
    });

    goal.updatedAt = new Date();
    await goal.save();

    // Populate admin details for response - populate both possible models
    await goal.populate([
      { path: 'adminComments.addedBy', select: 'firstName lastName email' }
    ]);

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: goal
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
};

/**
 * Get goal summary - percent achieved company-wide
 * GET /api/goals/summary
 */
exports.getGoalsSummary = async (req, res) => {
  try {
    const userRole = req.user?.role || req.session?.role;

    // Only admins can view summary
    if (userRole !== 'admin' && userRole !== 'super-admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view goal summary'
      });
    }

    const totalGoals = await Goal.countDocuments();
    const achievedGoals = await Goal.countDocuments({ status: 'ACHIEVED' });
    const inProgressGoals = await Goal.countDocuments({ status: 'IN_PROGRESS' });
    const todoGoals = await Goal.countDocuments({ status: 'TO_DO' });
    const overdueGoals = await Goal.countDocuments({ status: 'OVERDUE' });
    const approvedGoals = await Goal.countDocuments({ approvalStatus: 'approved' });
    const pendingApprovalGoals = await Goal.countDocuments({ approvalStatus: 'pending' });

    const percentAchieved = totalGoals > 0 ? Math.round((achievedGoals / totalGoals) * 100) : 0;

    // Breakdown by userId (populate for department)
    const departmentBreakdown = await Goal.aggregate([
      { $lookup: { from: 'employeehubs', localField: 'userId', foreignField: '_id', as: 'employee' } },
      { $unwind: { path: '$employee', preserveNullAndEmpty: true } },
      {
        $group: {
          _id: '$employee.department',
          total: { $sum: 1 },
          achieved: { $sum: { $cond: [{ $eq: ['$status', 'ACHIEVED'] }, 1, 0] } }
        }
      },
      {
        $project: {
          department: '$_id',
          total: 1,
          achieved: 1,
          percentAchieved: {
            $cond: [
              { $gt: ['$total', 0] },
              { $round: [{ $multiply: [{ $divide: ['$achieved', '$total'] }, 100] }] },
              0
            ]
          }
        }
      },
      { $sort: { percentAchieved: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalGoals,
        achieved: achievedGoals,
        inProgress: inProgressGoals,
        todo: todoGoals,
        overdue: overdueGoals,
        approved: approvedGoals,
        pendingApproval: pendingApprovalGoals,
        percentAchieved,
        departmentBreakdown
      }
    });
  } catch (error) {
    console.error('Error getting goals summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get goals summary',
      error: error.message
    });
  }
};

/**
 * Approve objective (Manager approves employee-created objective)
 * POST /api/goals/:id/approve
 */
exports.approveObjective = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    const userRole = req.user.role;

    if (!MANAGER_SCOPE_ROLES.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can approve objectives'
      });
    }

    const goal = await Goal.findById(id).populate('userId', 'firstName lastName email userId');
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Objective not found' });
    }

    if (!ADMIN_SCOPE_ROLES.includes(userRole)) {
      const managedEmployeeIds = await getManagedEmployeeIds(req);
      if (!managedEmployeeIds.includes(String(goal.userId?._id || goal.userId))) {
        return res.status(403).json({
          success: false,
          message: 'You can only approve objectives for your team members'
        });
      }
    }

    if (goal.approvalStatus === 'approved') {
      return res.status(400).json({ success: false, message: 'Objective is already approved' });
    }

    goal.approvalStatus = 'approved';
    goal.sentBackReason = null;
    await goal.save();

    // Notify employee
    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        recipientType: 'employee',
        employeeRef: goal.userId._id,
        type: 'objective_approved',
        title: 'Objective Approved',
        message: `Your objective "${goal.title}" has been approved by your manager`,
        priority: 'medium',
        metadata: { relatedId: goal._id, relatedType: 'Goal' },
        actionUrl: '/performance',
        actionText: 'View Objective'
      });
    } catch (notifErr) {
      console.error('Notification error (non-fatal):', notifErr.message);
    }

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      entityType: 'Goal', entityId: goal._id, action: 'approve',
      changedBy: userId,
      changedByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
      changes: { approvalStatus: 'approved' }, ipAddress: req.ip, userAgent: req.headers['user-agent']
    });

    res.json({ success: true, message: 'Objective approved successfully', data: goal });
  } catch (error) {
    console.error('Error approving objective:', error);
    res.status(500).json({ success: false, message: 'Failed to approve objective', error: error.message });
  }
};

/**
 * Send back objective (Manager sends back with feedback)
 * POST /api/goals/:id/send-back
 */
exports.sendBackObjective = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id || req.user.id;
    const userRole = req.user.role;

    if (!MANAGER_SCOPE_ROLES.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can send back objectives'
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Reason is required when sending back an objective'
      });
    }

    const goal = await Goal.findById(id).populate('userId', 'firstName lastName email userId');
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Objective not found'
      });
    }

    if (!ADMIN_SCOPE_ROLES.includes(userRole)) {
      const managedEmployeeIds = await getManagedEmployeeIds(req);
      if (!managedEmployeeIds.includes(String(goal.userId?._id || goal.userId))) {
        return res.status(403).json({
          success: false,
          message: 'You can only send back objectives for your team members'
        });
      }
    }

    goal.approvalStatus = 'sent_back';
    goal.sentBackReason = reason.trim();
    await goal.save();

    // Create notification for employee
    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        recipientType: 'employee',
        employeeRef: goal.userId._id,
        type: 'objective_sent_back',
        title: 'Objective Needs Revision',
        message: `Your objective "${goal.title}" has been sent back: ${reason.trim()}`,
        priority: 'high',
        metadata: {
          relatedId: goal._id, relatedType: 'Goal',
          sentBackBy: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
          reason: reason.trim()
        },
        actionUrl: '/performance',
        actionText: 'View & Edit'
      });
    } catch (notifErr) {
      console.error('Notification error (non-fatal):', notifErr.message);
    }

    // Audit log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      entityType: 'Goal',
      entityId: goal._id,
      action: 'send_back',
      changedBy: userId,
      changedByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
      changes: { approvalStatus: 'sent_back', reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Objective sent back successfully',
      data: goal
    });
  } catch (error) {
    console.error('Error sending back objective:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send back objective',
      error: error.message
    });
  }
};

/**
 * Submit employee input (Employee updates progress with contributions)
 * POST /api/goals/:id/input
 */
exports.submitEmployeeInput = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, contribution: rawContribution, progress, comments } = req.body;
    // Accept both field names: 'contribution' (legacy) and 'text' (current frontend)
    const contribution = rawContribution || text;
    if (!contribution || !String(contribution).trim()) {
      return res.status(400).json({ success: false, message: 'Contribution text is required' });
    }
    const employee = await resolveEmployeeForRequest(req);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    const goal = await Goal.findById(id);
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Objective not found'
      });
    }

    // Check ownership
    if (goal.userId.toString() !== employee._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only submit input for your own objectives'
      });
    }

    // Objective must be approved before employee can submit input
    if (goal.approvalStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'You can only submit input for approved objectives'
      });
    }

    // Add input entry
    goal.employeeInput.push({
      date: new Date(),
      contribution,
      progress: progress !== undefined ? Number(progress) : goal.progressPercent,
      comments,
      status: 'manager_review_pending'
    });

    // Update overall progress
    if (progress !== undefined) {
      goal.progressPercent = Number(progress);
      goal.progress = Number(progress);
    }

    // Transition TO_DO → IN_PROGRESS on first input
    if (goal.status === 'TO_DO') {
      goal.status = 'IN_PROGRESS';
    }

    await goal.save();

    // Notify the manager who created this goal (only when setBy='manager' so we don't
    // notify the employee about their own submission).
    // ALL staff (employees, managers, HR, admin) are stored in EmployeesHub — the User
    // model is only for the external 'profile' role which never creates goals.
    // So goal.createdBy is always an EmployeesHub._id → use recipientType:'employee'.
    if (goal.createdBy && goal.setBy === 'manager') {
      try {
        const Notification = require('../models/Notification');
        const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email;
        await Notification.create({
          recipientType: 'employee',
          employeeRef: goal.createdBy,
          type: 'input_submitted',
          title: 'Employee Progress Update',
          message: `${employeeName} submitted progress for "${goal.title}"`,
          priority: 'medium',
          metadata: {
            relatedId: goal._id,
            relatedType: 'Goal',
            employeeName
          },
          actionUrl: '/performance',
          actionText: 'Review Progress'
        });
      } catch (notifErr) {
        console.error('Notification error in submitEmployeeInput (non-fatal):', notifErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Progress submitted successfully',
      data: goal
    });
  } catch (error) {
    console.error('Error submitting employee input:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit progress',
      error: error.message
    });
  }
};

/**
 * Review employee input (Manager reviews and provides feedback)
 * PUT /api/goals/:goalId/input/:inputId/review
 */
exports.reviewEmployeeInput = async (req, res) => {
  try {
    const { goalId, inputId } = req.params;
    const { feedback, status } = req.body;
    const userId = req.user._id || req.user.id;
    const userRole = req.user.role;

    // Check if user is admin
    if (!ADMIN_ROLES.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can review employee input'
      });
    }

    const goal = await Goal.findById(goalId).populate('userId', 'firstName lastName email userId');
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Objective not found'
      });
    }

    const input = goal.employeeInput.id(inputId);
    if (!input) {
      return res.status(404).json({
        success: false,
        message: 'Progress input not found'
      });
    }

    input.managerFeedback = feedback;
    input.status = status || 'reviewed';
    input.reviewedAt = new Date();
    input.reviewedBy = userId;

    await goal.save();

    res.json({
      success: true,
      message: 'Progress reviewed successfully',
      data: goal
    });
  } catch (error) {
    console.error('Error reviewing employee input:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review progress',
      error: error.message
    });
  }
};

/**
 * Get pending approvals (Manager view of all pending objectives)
 * GET /api/goals/pending-approvals
 */
exports.getPendingApprovals = async (req, res) => {
  try {
    const userRole = req.user.role;
    const isAdminScope = ADMIN_SCOPE_ROLES.includes(userRole);

    if (!MANAGER_SCOPE_ROLES.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can view pending approvals'
      });
    }

    const query = {
      approvalStatus: 'pending',
      setBy: 'employee'
    };

    if (!isAdminScope) {
      const managedEmployeeIds = await getManagedEmployeeIds(req);
      query.userId = { $in: managedEmployeeIds };
    }

    const pendingGoals = await Goal.find(query)
      .populate('userId', 'firstName lastName email department')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: pendingGoals,
      count: pendingGoals.length
    });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending approvals',
      error: error.message
    });
  }
};
