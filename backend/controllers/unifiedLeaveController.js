const LeaveRequest = require('../models/LeaveRequest');
const LeaveRecord = require('../models/LeaveRecord');
const AnnualLeaveBalance = require('../models/AnnualLeaveBalance');
const EmployeeHub = require('../models/EmployeesHub');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ShiftAssignment = require('../models/ShiftAssignment');
const TimeEntry = require('../models/TimeEntry');
const mongoose = require('mongoose');
const hierarchyHelper = require('../utils/hierarchyHelper');
const { ADMIN_ROLES, ADMIN_SCOPE_ROLES, MANAGER_ROLES, MANAGER_SCOPE_ROLES } = require('../utils/roles');

const normalizeDateInput = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const startOfDay = (value) => {
  const date = normalizeDateInput(value);
  if (!date) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = normalizeDateInput(value);
  if (!date) return null;
  date.setHours(23, 59, 59, 999);
  return date;
};

const buildRange = (startDate, endDate) => {
  const normalizedStart = startOfDay(startDate);
  const normalizedEnd = endOfDay(endDate || startDate);

  if (!normalizedStart || !normalizedEnd) {
    return null;
  }

  if (normalizedStart > normalizedEnd) {
    return null;
  }

  return { start: normalizedStart, end: normalizedEnd };
};

async function hasOverlappingLeave(employeeId, startDate, endDate, excludeId = null) {
  const range = buildRange(startDate, endDate);
  if (!employeeId || !range) {
    return false;
  }

  const overlapMatch = {
    startDate: { $lte: range.end },
    endDate: { $gte: range.start }
  };

  const excludeMatch = excludeId ? { _id: { $ne: excludeId } } : {};

  const [leaveRequestConflict, leaveRecordConflict] = await Promise.all([
    LeaveRequest.exists({
      employeeId,
      status: { $in: ['Pending', 'Approved'] },
      ...excludeMatch,
      ...overlapMatch
    }),
    LeaveRecord.exists({
      user: employeeId,
      status: { $in: ['pending', 'approved'] },
      ...excludeMatch,
      ...overlapMatch
    })
  ]);

  return Boolean(leaveRequestConflict || leaveRecordConflict);
}

exports.hasOverlappingLeave = hasOverlappingLeave;

const resolveActorEmployee = async (user) => {
  if (!user) return null;

  const actorId = user.id || user._id;

  if (actorId && mongoose.Types.ObjectId.isValid(String(actorId))) {
    const actorEmployee = await EmployeeHub.findById(actorId);
    if (actorEmployee) return actorEmployee;
  }

  if (actorId) {
    const actorEmployee = await EmployeeHub.findOne({ userId: actorId });
    if (actorEmployee) return actorEmployee;
  }

  if (user.email) {
    return EmployeeHub.findOne({
      email: user.email.toString().trim().toLowerCase()
    });
  }

  return null;
};

/**
 * UNIFIED LEAVE MANAGEMENT CONTROLLER
 * Handles all leave-related operations in one place
 */

// ==================== EMPLOYEE LEAVE REQUESTS ====================

/**
 * Create leave request from employee dashboard
 * @route POST /api/leave/request
 */
exports.createLeaveRequest = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, status } = req.body;
    
    // Check if user is authenticated
    if (!req.user || (!req.user.id && !req.user._id)) {
      console.error('Authentication error: req.user not found or missing ID');
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in again.'
      });
    }
    
    const employeeId = req.user.id || req.user._id;
    console.log('Creating leave request for employee:', employeeId);

    // Validation
    if (!leaveType || !startDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: leaveType, startDate, reason'
      });
    }

    const start = startOfDay(startDate);
    const end = endOfDay(endDate || startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range provided'
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Calculate numberOfDays (including weekends, excluding time)
    // Support 0.5 increments for half-day leaves
    const { numberOfDays: submitttedDays, halfDayType } = req.body;
    
    let numberOfDays;
    if (submitttedDays && submitttedDays > 0) {
      // Validate that numberOfDays is in 0.5 increments (1, 1.5, 2, 2.5, etc.)
      if (submitttedDays % 0.5 !== 0) {
        return res.status(400).json({
          success: false,
          message: 'Leave days must be in 0.5 increments (e.g., 1, 1.5, 2, 2.5 days)'
        });
      }
      numberOfDays = submitttedDays;
      console.log('Using provided numberOfDays with half-day support:', numberOfDays, 'halfDayType:', halfDayType);
    } else {
      // Fallback calculation if numberOfDays not provided
      const diffTime = Math.abs(end - start);
      numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      console.log('Calculated numberOfDays:', numberOfDays);
    }

    const hasOverlap = await hasOverlappingLeave(employeeId, start, end);

    if (hasOverlap) {
      return res.status(409).json({
        success: false,
        message: 'An existing leave entry overlaps with the requested dates.',
        conflictType: 'overlap'
      });
    }

    // Create leave request - no approverId needed, goes to all admins
    const leaveRequest = new LeaveRequest({
      employeeId,
      approverId: employeeId, // Placeholder, will be updated on approval
      leaveType,
      startDate: start,
      endDate: end,
      numberOfDays,
      reason,
      status: status === 'Draft' ? 'Draft' : 'Pending'
    });

    await leaveRequest.save();
    await leaveRequest.populate('employeeId', 'firstName lastName email department');

    // Notify all admins if status is Pending
    if (leaveRequest.status === 'Pending') {
      await notifyAdminsOfNewRequest(leaveRequest);
    }

    res.status(201).json({
      success: true,
      message: leaveRequest.status === 'Draft' ? 'Leave request saved as draft' : 'Leave request submitted successfully',
      data: leaveRequest
    });
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating leave request',
      error: error.message
    });
  }
};

/**
 * Get employee's own leave requests
 * @route GET /api/leave/my-requests
 */
exports.getMyLeaveRequests = async (req, res) => {
  try {
    const employeeId = req.user.id || req.user._id;
    const { status } = req.query;

    let query = { employeeId };
    if (status) query.status = status;

    const leaveRequests = await LeaveRequest.find(query)
      .populate('approverId', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: leaveRequests
    });
  } catch (error) {
    console.error('Get my leave requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leave requests',
      error: error.message
    });
  }
};

// ==================== ADMIN APPROVAL WORKFLOW ====================

/**
 * Get all pending leave requests for admin dashboard
 * @route GET /api/leave/pending-requests
 */
exports.getPendingLeaveRequests = async (req, res) => {
  try {
    const userRole = req.user.role;
    const { leaveType, startDate, endDate } = req.query;
    const actorEmployee = await resolveActorEmployee(req.user);

    const isAdminScope = ADMIN_SCOPE_ROLES.includes(userRole);
    const isManagerScope = MANAGER_ROLES.includes(userRole);

    if (!isAdminScope && !isManagerScope) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Manager or admin privileges required.'
      });
    }

    let query = { status: 'Pending' };

    // Managers can only view pending requests from their team hierarchy
    if (isManagerScope) {
      if (!actorEmployee?._id) {
        return res.status(400).json({
          success: false,
          message: 'Approver employee record not found. Please link your account to EmployeeHub.'
        });
      }

      const includeIndirect = userRole === 'senior-manager';
      const teamMembers = await hierarchyHelper.getSubordinates(actorEmployee._id, includeIndirect);
      const teamIds = teamMembers.map((member) => member._id);

      if (!teamIds.length) {
        return res.json({ success: true, count: 0, data: [] });
      }

      query.employeeId = { $in: teamIds };
    }

    if (leaveType) query.leaveType = leaveType;
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const leaveRequests = await LeaveRequest.find(query)
      .populate('employeeId', 'firstName lastName email vtid department jobTitle')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: leaveRequests.length,
      data: leaveRequests
    });
  } catch (error) {
    console.error('Get pending leave requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending leave requests',
      error: error.message
    });
  }
};

exports.getApprovedLeaveRequestsByApprover = async (req, res) => {
  try {
    const userRole = req.user.role;
    const { leaveType, startDate, endDate } = req.query;
    const actorEmployee = await resolveActorEmployee(req.user);

    const isAdminScope = ADMIN_SCOPE_ROLES.includes(userRole);
    const isManagerScope = MANAGER_ROLES.includes(userRole);

    if (!isAdminScope && !isManagerScope) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Manager or admin privileges required.'
      });
    }

    // Admin dashboard "Approved Requests" should show all approved requests.
    // Keep approverId data for display/audit, but don't filter by it.
    let query = { status: 'Approved' };

    if (isManagerScope) {
      if (!actorEmployee?._id) {
        return res.status(400).json({
          success: false,
          message: 'Approver employee record not found. Please link your account to EmployeeHub.'
        });
      }

      const includeIndirect = userRole === 'senior-manager';
      const teamMembers = await hierarchyHelper.getSubordinates(actorEmployee._id, includeIndirect);
      const teamIds = teamMembers.map((member) => member._id);

      if (!teamIds.length) {
        return res.json({ success: true, count: 0, data: [] });
      }

      query.employeeId = { $in: teamIds };
    }

    if (leaveType) query.leaveType = leaveType;
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const leaveRequests = await LeaveRequest.find(query)
      .populate('employeeId', 'firstName lastName email vtid department jobTitle')
      .populate('approvedBy', 'firstName lastName email')
      .populate('approverId', 'firstName lastName email')
      .populate('approvedByUserId', 'firstName lastName name email')
      .sort({ approvedAt: -1, createdAt: -1 });

    res.json({
      success: true,
      count: leaveRequests.length,
      data: leaveRequests
    });
  } catch (error) {
    console.error('Get approved leave requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching approved leave requests',
      error: error.message
    });
  }
};

/**
 * Cancel approved leave request
 * - Employee: can cancel own approved leave
 * - Manager: can cancel approved leave for subordinate
 * - Admin/HR: can cancel any approved leave
 * @route PATCH /api/leave/cancel/:id
 */
exports.cancelApprovedLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body || {};
    const actorRole = req.user?.role || req.user?.userType;
    const actorUserId = req.user?.id || req.user?._id || null;

    const leaveRequest = await LeaveRequest.findById(id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (leaveRequest.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: `Only approved leave can be cancelled. Current status: ${leaveRequest.status}`
      });
    }

    const actorEmployee = await resolveActorEmployee(req.user);
    const actorEmployeeId = actorEmployee?._id ? String(actorEmployee._id) : null;
    const employeeId = String(leaveRequest.employeeId);

    const isAdminScope = ADMIN_SCOPE_ROLES.includes(actorRole);
    const isManagerScope = MANAGER_ROLES.includes(actorRole);
    const isEmployeeActor = String(actorRole || '').toLowerCase() === 'employee';

    let allowed = false;
    if (isAdminScope) {
      allowed = true;
    } else if (isEmployeeActor) {
      allowed = Boolean(actorEmployeeId && actorEmployeeId === employeeId);
    } else if (isManagerScope) {
      if (!actorEmployeeId) {
        return res.status(400).json({
          success: false,
          message: 'Approver employee record not found. Please link your account to EmployeeHub.'
        });
      }
      allowed = await hierarchyHelper.canApproveLeave(actorEmployeeId, leaveRequest.employeeId);
    }

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to cancel this leave request'
      });
    }

    // Mark leave request as cancelled
    leaveRequest.status = 'Cancelled';
    leaveRequest.cancelledAt = new Date();
    leaveRequest.cancelledBy = actorEmployeeId || undefined;
    leaveRequest.cancelledByUserId = actorUserId || null;
    leaveRequest.cancellationReason = (cancellationReason || '').toString().trim();
    await leaveRequest.save();

    // Remove matching leave record entry (created on approval)
    await LeaveRecord.deleteMany({
      user: leaveRequest.employeeId,
      status: 'approved',
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      days: leaveRequest.numberOfDays
    });

    // Roll back leave balance usage for paid categories
    if (leaveRequest.leaveType !== 'Unpaid') {
      const balance = await AnnualLeaveBalance.getCurrentBalance(leaveRequest.employeeId);
      if (balance) {
        const used = Number(balance.usedDays || 0);
        const deduction = Number(leaveRequest.numberOfDays || 0);
        balance.usedDays = Math.max(0, used - deduction);
        await balance.save();
      }
    }

    await leaveRequest.populate('employeeId', 'firstName lastName email');

    return res.json({
      success: true,
      message: 'Approved leave cancelled successfully',
      data: leaveRequest
    });
  } catch (error) {
    console.error('Cancel approved leave error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error cancelling approved leave request',
      error: error.message
    });
  }
};

exports.getDeniedLeaveRequestsByApprover = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id || req.user._id;
    const { leaveType, startDate, endDate } = req.query;

    // Allow admin/super-admin or manager/senior-manager
    const isAdmin = userRole === 'admin' || userRole === 'super-admin';
    const isManager = userRole === 'manager' || userRole === 'senior-manager';

    if (!isAdmin && !isManager) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or manager privileges required.'
      });
    }

    let query = { status: 'Rejected' };
    
    // For managers, scope to their team members; for admins, no scoping
    if (isManager && !isAdmin) {
      const scopedEmployees = await hierarchyHelper.getSubordinates(userId, true);
      const scopedEmployeeIds = Array.isArray(scopedEmployees)
        ? scopedEmployees.map((employee) => employee?._id).filter(Boolean)
        : [];

      query.employeeId = { $in: scopedEmployeeIds };
    }

    if (leaveType) query.leaveType = leaveType;
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const leaveRequests = await LeaveRequest.find(query)
      .populate('employeeId', 'firstName lastName email vtid department jobTitle')
      .populate('rejectedBy', 'firstName lastName email')
      .populate('approverId', 'firstName lastName email')
      .sort({ rejectedAt: -1, createdAt: -1 });

    res.json({
      success: true,
      count: leaveRequests.length,
      data: leaveRequests
    });
  } catch (error) {
    console.error('Get denied leave requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching denied leave requests',
      error: error.message
    });
  }
};

/**
 * Approve leave request
 * @route PATCH /api/leave/approve/:id
 */
exports.approveLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminComment } = req.body;
    const adminUserId = req.user.id || req.user._id;

    const approverEmp = await resolveActorEmployee(req.user);

    const leaveRequest = await LeaveRequest.findById(id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    const approverId = approverEmp?._id || null;
    const actorRole = req.user?.role || req.user?.userType || approverEmp?.role;

    const isAdminScope = ADMIN_SCOPE_ROLES.includes(actorRole);

    // Profile-type admins may not have an EmployeeHub record.
    if (!approverId && !isAdminScope) {
      return res.status(400).json({
        success: false,
        message: 'Approver employee record not found. Please link the admin user to an EmployeeHub record.'
      });
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve a ${leaveRequest.status} leave request`
      });
    }

    // Manager-level hierarchy enforcement (admins/hr keep full scope)
    if (!isAdminScope) {
      const canApprove = await hierarchyHelper.canApproveLeave(approverId, leaveRequest.employeeId);
      if (!canApprove) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to approve this leave request'
        });
      }
    }

    // Update leave request
    leaveRequest.status = 'Approved';
    if (approverId) {
      leaveRequest.approverId = approverId;
      leaveRequest.approvedBy = approverId; // Track who approved (EmployeeHub ID)
    }
    leaveRequest.adminComment = adminComment || '';
    leaveRequest.approvedAt = new Date();
    
    // Track admin User ID if admin approval (actor/subject tracking)
    if (actorRole && ADMIN_SCOPE_ROLES.includes(actorRole)) {
      leaveRequest.approvedByUserId = adminUserId; // User._id (actor)
      leaveRequest.approverRole = actorRole;
      leaveRequest.approverComments = adminComment || 'Approved by admin';
    }
    
    await leaveRequest.save();

    // Create LeaveRecord for reporting
    const leaveTypeMap = {
      'Annual Leave': 'annual',
      'Bank Holiday': 'annual',
      'Maternity Leave': 'annual',
      'Paternity Leave': 'annual',
      'Adoption Leave': 'annual',
      'Shared Parental Leave': 'annual',
      'Parental Leave': 'annual',
      'Carer\'s Leave': 'annual',
      'Parental Bereavement Leave': 'annual',
      'Neonatal Care Leave': 'annual',
      'Time Off for Dependants': 'annual',
      'Sick Leave': 'sick',
      'Jury Service': 'annual',
      'Trade Union Duties': 'annual',
      'Public Duty Leave': 'annual',
      'Study / Training Leave': 'annual',
      'Medical / Dental Appointment': 'annual',
      // Legacy mappings for backwards compatibility
      'Sick': 'sick',
      'Casual': 'annual',
      'Paid': 'annual',
      'Unpaid': 'unpaid',
      'Maternity': 'annual',
      'Paternity': 'annual',
      'Bereavement': 'annual',
      'Other': 'annual'
    };

    const leaveRecordData = {
      user: leaveRequest.employeeId,
      type: leaveTypeMap[leaveRequest.leaveType] || 'annual',
      status: 'approved',
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      days: leaveRequest.numberOfDays,
      reason: leaveRequest.reason,
      approvedAt: new Date()
    };

    if (approverId) {
      leaveRecordData.approvedBy = approverId;
      leaveRecordData.createdBy = approverId;
    }

    await LeaveRecord.create(leaveRecordData);

    // Update leave balance if applicable
    if (leaveRequest.leaveType !== 'Unpaid') {
      await updateLeaveBalance(leaveRequest.employeeId, leaveRequest.numberOfDays);
    }

    // Cancel shifts on leave dates
    await cancelShiftsForLeave(leaveRequest);

    // Notify employee
    await notifyEmployeeOfApproval(leaveRequest, adminComment);

    // Notify only the employee's manager (not teammates)
    await notifyManagerOfLeave(leaveRequest);

    await leaveRequest.populate('employeeId', 'firstName lastName email');
    await leaveRequest.populate('approverId', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Leave request approved successfully',
      data: leaveRequest
    });
  } catch (error) {
    console.error('Approve leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving leave request',
      error: error.message
    });
  }
};

/**
 * Reject leave request
 * @route PATCH /api/leave/reject/:id
 */
exports.rejectLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const adminUserId = req.user.id || req.user._id;

    const approverEmp = await resolveActorEmployee(req.user);

    const leaveRequest = await LeaveRequest.findById(id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    const approverId = approverEmp?._id || null;
    const actorRole = req.user?.role || req.user?.userType || approverEmp?.role;

    const isAdminScope = ADMIN_SCOPE_ROLES.includes(actorRole);

    // Profile-type admins may not have an EmployeeHub record.
    if (!approverId && !isAdminScope) {
      return res.status(400).json({
        success: false,
        message: 'Approver employee record not found. Please link the admin user to an EmployeeHub record.'
      });
    }

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject a ${leaveRequest.status} leave request`
      });
    }

    // Manager-level hierarchy enforcement (admins/hr keep full scope)
    if (!isAdminScope) {
      const canReject = await hierarchyHelper.canApproveLeave(approverId, leaveRequest.employeeId);
      if (!canReject) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to reject this leave request'
        });
      }
    }

    leaveRequest.status = 'Rejected';
    if (approverId) {
      leaveRequest.approverId = approverId;
      leaveRequest.rejectedBy = approverId; // Track who rejected (EmployeeHub ID)
    }
    leaveRequest.rejectionReason = rejectionReason;
    leaveRequest.rejectedAt = new Date();
    
    // Track admin User ID if admin rejection (actor/subject tracking)
    if (actorRole && ADMIN_SCOPE_ROLES.includes(actorRole)) {
      leaveRequest.approvedByUserId = adminUserId; // Reuse field for rejector User._id (actor)
      leaveRequest.approverRole = actorRole;
      leaveRequest.approverComments = rejectionReason || 'Rejected by admin';
    }
    
    await leaveRequest.save();

    // Notify employee
    await notifyEmployeeOfRejection(leaveRequest, rejectionReason);

    await leaveRequest.populate('employeeId', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Leave request rejected',
      data: leaveRequest
    });
  } catch (error) {
    console.error('Reject leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting leave request',
      error: error.message
    });
  }
};

// ==================== ADMIN TIME OFF CREATION ====================

/**
 * Admin creates time off for employee (from calendar "+ Time Off" button)
 * @route POST /api/leave/admin/time-off
 */
exports.createTimeOff = async (req, res) => {
  try {
    const { employeeId, leaveType, startDate, endDate, reason } = req.body;
    
    // Check authentication first
    if (!req.user || (!req.user.id && !req.user._id)) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const adminId = req.user.id || req.user._id;
    const approverEmployee = await resolveActorEmployee(req.user);
    const approverEmployeeId = approverEmployee?._id;
    // IMPORTANT: Prefer EmployeeHub role when present.
    // Some manager users may also have a User/profile role of admin for access,
    // but leave workflow authority must follow operational employee role.
    const callerRole = approverEmployee?.role || req.user?.role || req.user?.userType;
    const normalizedCallerRole = typeof callerRole === 'string' ? callerRole.toLowerCase() : '';
    const isAdminActor = ADMIN_ROLES.includes(normalizedCallerRole);
    const isManagerActor = MANAGER_ROLES.includes(normalizedCallerRole);
    const isEmployeeActor = normalizedCallerRole === 'employee';

    // Allow super-admins/admins (User model only) to create time-off without EmployeeHub record
    const isProfileAdmin = !approverEmployeeId && isAdminActor;

    if (!approverEmployeeId && !isProfileAdmin && !isManagerActor && !isEmployeeActor) {
      return res.status(400).json({
        success: false,
        message: 'Approver employee record not found. Please link the admin user to an EmployeeHub record.'
      });
    }

    if (!employeeId || !leaveType || !startDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: employeeId, leaveType, startDate, reason'
      });
    }

    // Calculate number of days
    const start = startOfDay(startDate);
    const end = endOfDay(endDate || startDate);

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range provided'
      });
    }

    const hasOverlap = await hasOverlappingLeave(employeeId, start, end);

    if (hasOverlap) {
      return res.status(409).json({
        success: false,
        message: 'An existing leave entry overlaps with the requested dates.',
        conflictType: 'overlap'
      });
    }

    const diffTime = Math.abs(end - start);
    const numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Admin/super-admin actors approve directly; managers/senior-managers submit pending requests for admin approval.
    const shouldAutoApprove = isAdminActor;
    const approverId = shouldAutoApprove ? (approverEmployeeId || employeeId) : (approverEmployeeId || employeeId);

    const leaveRequest = new LeaveRequest({
      employeeId,
      approverId: approverId,
      leaveType,
      startDate: start,
      endDate: end,
      numberOfDays, // Explicitly set it
      reason,
      status: shouldAutoApprove ? 'Approved' : 'Pending',
      adminComment: shouldAutoApprove ? 'Time off added by admin' : 'Time off request submitted for approval',
      approvedBy: shouldAutoApprove ? (approverEmployeeId || undefined) : undefined,
      approvedAt: shouldAutoApprove ? new Date() : undefined
    });

    if (shouldAutoApprove) {
      leaveRequest.approvedByUserId = adminId;
      leaveRequest.approverRole = normalizedCallerRole;
      leaveRequest.approverComments = 'Time off added by admin';
    } else {
      leaveRequest.approverRole = normalizedCallerRole || null;
      leaveRequest.approverComments = 'Time off request submitted for approval';
    }

    await leaveRequest.save();

    if (shouldAutoApprove) {
      // Create LeaveRecord
      const leaveTypeMap = {
        'Annual Leave': 'annual',
        'Bank Holiday': 'annual',
        'Maternity Leave': 'annual',
        'Paternity Leave': 'annual',
        'Adoption Leave': 'annual',
        'Shared Parental Leave': 'annual',
        'Parental Leave': 'annual',
        'Carer\'s Leave': 'annual',
        'Parental Bereavement Leave': 'annual',
        'Neonatal Care Leave': 'annual',
        'Time Off for Dependants': 'annual',
        'Sick Leave': 'sick',
        'Jury Service': 'annual',
        'Trade Union Duties': 'annual',
        'Public Duty Leave': 'annual',
        'Study / Training Leave': 'annual',
        'Medical / Dental Appointment': 'annual',
        // Legacy mappings for backwards compatibility
        'Sick': 'sick',
        'Casual': 'annual',
        'Paid': 'annual',
        'Unpaid': 'unpaid',
        'Maternity': 'annual',
        'Paternity': 'annual',
        'Bereavement': 'annual',
        'Other': 'annual'
      };

      const leaveRecordData = {
        user: employeeId,
        type: leaveTypeMap[leaveType] || 'annual',
        status: 'approved',
        startDate: start,
        endDate: end,
        days: numberOfDays,
        reason,
        approvedAt: new Date()
      };

      if (approverEmployeeId) {
        leaveRecordData.approvedBy = approverEmployeeId;
        leaveRecordData.createdBy = approverEmployeeId;
      }

      await LeaveRecord.create(leaveRecordData);

      // Update balance
      if (leaveType !== 'Unpaid') {
        await updateLeaveBalance(employeeId, leaveRequest.numberOfDays);
      }

      // Cancel shifts
      await cancelShiftsForLeave(leaveRequest);

      // Notify employee
      await notifyEmployeeOfApproval(leaveRequest, 'Time off added by admin');
    } else {
      if (isEmployeeActor) {
        await notifyManagerOfPendingTimeOff(leaveRequest);
      } else {
        // Manager/senior-manager submission: notify admin approvers and keep pending
        await notifyAdminsOfPendingTimeOff(leaveRequest);
      }
    }

    res.status(201).json({
      success: true,
      message: shouldAutoApprove ? 'Time off created successfully' : 'Time off request submitted for approval',
      data: leaveRequest
    });
  } catch (error) {
    console.error('Create time off error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating time off',
      error: error.message
    });
  }
};

// ==================== EMPLOYEE HUB ABSENCE SECTION ====================

/**
 * Add annual leave for employee (from EmployeeHub Absence section)
 * @route POST /api/leave/employee-hub/annual-leave
 */
exports.addAnnualLeave = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, reason } = req.body;
    const adminUserId = req.user.id || req.user._id;
    const approverEmployee = await resolveActorEmployee(req.user);
    const approverEmployeeId = approverEmployee?._id;
    const actorRole = req.user?.role || req.user?.userType || approverEmployee?.role;
    const isAdminScope = ADMIN_SCOPE_ROLES.includes(actorRole);

    // Profile-type admins may not have an EmployeeHub record.
    if (!approverEmployeeId && !isAdminScope) {
      return res.status(400).json({
        success: false,
        message: 'Approver employee record not found. Please link the admin user to an EmployeeHub record.'
      });
    }

    if (!employeeId || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Calculate number of days
    const start = startOfDay(startDate);
    const end = endOfDay(endDate || startDate);

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range provided'
      });
    }

    const hasOverlap = await hasOverlappingLeave(employeeId, start, end);

    if (hasOverlap) {
      return res.status(409).json({
        success: false,
        message: 'An existing leave entry overlaps with the requested dates.',
        conflictType: 'overlap'
      });
    }

    const diffTime = Math.abs(end - start);
    const numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // LeaveRequest.approverId is required and references EmployeeHub.
    // For profile-type admins without EmployeeHub mapping, keep a valid EmployeeHub id
    // by using the target employee id and track actual actor in approvedByUserId.
    const approverIdForRequest = approverEmployeeId || employeeId;

    const leaveRequest = new LeaveRequest({
      employeeId,
      approverId: approverIdForRequest,
      leaveType: 'Paid',
      startDate: start,
      endDate: end,
      numberOfDays, // Explicitly set it
      reason: reason || 'Annual leave added by admin',
      status: 'Approved',
      adminComment: 'Added from EmployeeHub',
      approvedBy: approverEmployeeId || undefined,
      approvedAt: new Date()
    });

    if (isAdminScope) {
      leaveRequest.approvedByUserId = adminUserId;
      leaveRequest.approverRole = actorRole;
      leaveRequest.approverComments = 'Annual leave added by admin';
    }

    await leaveRequest.save();

    const leaveRecordData = {
      user: employeeId,
      type: 'annual',
      status: 'approved',
      startDate: start,
      endDate: end,
      days: numberOfDays,
      reason: reason || 'Annual leave',
      approvedAt: new Date()
    };

    if (approverEmployeeId) {
      leaveRecordData.approvedBy = approverEmployeeId;
      leaveRecordData.createdBy = approverEmployeeId;
    }

    await LeaveRecord.create(leaveRecordData);

    await updateLeaveBalance(employeeId, numberOfDays);
    await cancelShiftsForLeave(leaveRequest);

    res.status(201).json({
      success: true,
      message: 'Annual leave added successfully',
      data: leaveRequest
    });
  } catch (error) {
    console.error('Add annual leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding annual leave',
      error: error.message
    });
  }
};

/**
 * Add sickness record
 * @route POST /api/leave/employee-hub/sickness
 */
exports.addSickness = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, reason } = req.body;
    const adminUserId = req.user.id || req.user._id;
    const approverEmployee = await resolveActorEmployee(req.user);
    const approverEmployeeId = approverEmployee?._id;
    const actorRole = req.user?.role || req.user?.userType || approverEmployee?.role;
    const isAdminScope = ADMIN_SCOPE_ROLES.includes(actorRole);

    // Profile-type admins may not have an EmployeeHub record.
    if (!approverEmployeeId && !isAdminScope) {
      return res.status(400).json({
        success: false,
        message: 'Approver employee record not found. Please link the admin user to an EmployeeHub record.'
      });
    }

    if (!employeeId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leaveRequest = new LeaveRequest({
      employeeId,
      approverId: approverEmployeeId || employeeId,
      leaveType: 'Sick',
      startDate: start,
      endDate: end,
      numberOfDays: days,
      reason: reason || 'Sickness',
      status: 'Approved',
      adminComment: 'Sickness added from EmployeeHub',
      approvedBy: approverEmployeeId || undefined,
      approvedAt: new Date()
    });

    if (isAdminScope) {
      leaveRequest.approvedByUserId = adminUserId;
      leaveRequest.approverRole = actorRole;
      leaveRequest.approverComments = 'Sickness added by admin';
    }

    await leaveRequest.save();

    const sickRecordData = {
      user: employeeId,
      type: 'sick',
      status: 'approved',
      startDate: start,
      endDate: end,
      days,
      reason: reason || 'Sickness',
      approvedAt: new Date()
    };

    if (approverEmployeeId) {
      sickRecordData.approvedBy = approverEmployeeId;
      sickRecordData.createdBy = approverEmployeeId;
    }

    const sickRecord = await LeaveRecord.create(sickRecordData);

    // Cancel shifts
    await ShiftAssignment.updateMany(
      {
        employeeId,
        date: { $gte: start, $lte: end },
        status: { $in: ['Scheduled', 'Pending'] }
      },
      {
        status: 'Cancelled',
        notes: 'Auto-cancelled due to sickness'
      }
    );

    res.status(201).json({
      success: true,
      message: 'Sickness record added successfully',
      data: sickRecord
    });
  } catch (error) {
    console.error('Add sickness error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding sickness record',
      error: error.message
    });
  }
};

/**
 * Add lateness record
 * @route POST /api/leave/employee-hub/lateness
 */
exports.addLateness = async (req, res) => {
  try {
    const { employeeId, date, lateMinutes, reason } = req.body;
    const adminId = req.user.id || req.user._id;

    if (!employeeId || !date || !lateMinutes) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Store as a note in TimeEntry or create a separate tracking mechanism
    const timeEntry = await TimeEntry.findOne({
      employee: employeeId,
      date: new Date(date).toISOString().split('T')[0]
    });

    if (timeEntry) {
      timeEntry.notes = `${timeEntry.notes || ''}\nLateness: ${lateMinutes} minutes - ${reason || 'No reason provided'}`.trim();
      await timeEntry.save();
    }

    res.json({
      success: true,
      message: 'Lateness recorded successfully',
      data: { employeeId, date, lateMinutes, reason }
    });
  } catch (error) {
    console.error('Add lateness error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording lateness',
      error: error.message
    });
  }
};

/**
 * Update carry over days
 * @route PATCH /api/leave/employee-hub/carry-over
 */
exports.updateCarryOver = async (req, res) => {
  try {
    const { employeeId, carryOverDays, reason } = req.body;
    const adminId = req.user.id || req.user._id;

    if (!employeeId || carryOverDays === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const balance = await AnnualLeaveBalance.getCurrentBalance(employeeId);
    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'No leave balance found for current year'
      });
    }

    balance.carryOverDays = carryOverDays;
    if (reason) {
      balance.adjustments.push({
        days: 0,
        reason: `Carry over updated: ${reason}`,
        adjustedBy: adminId,
        at: new Date()
      });
    }
    await balance.save();

    res.json({
      success: true,
      message: 'Carry over days updated successfully',
      data: balance
    });
  } catch (error) {
    console.error('Update carry over error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating carry over',
      error: error.message
    });
  }
};

/**
 * Get recent absences for employee
 * @route GET /api/leave/employee-hub/absences/:employeeId
 */
exports.getRecentAbsences = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { limit = 10 } = req.query;

    const absences = await LeaveRecord.find({
      user: employeeId,
      type: { $in: ['sick', 'absent'] },
      status: 'approved'
    })
      .sort({ startDate: -1 })
      .limit(parseInt(limit))
      .populate('approvedBy', 'firstName lastName');

    res.json({
      success: true,
      data: absences
    });
  } catch (error) {
    console.error('Get recent absences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching absences',
      error: error.message
    });
  }
};

// ==================== CALENDAR DATA ====================

/**
 * Get approved leaves for calendar display
 * @route GET /api/leave/calendar
 */
exports.getCalendarLeaves = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    const userRole = req.user.role;
    const actorEmployee = await resolveActorEmployee(req.user);
    const actorEmployeeId = actorEmployee?._id ? String(actorEmployee._id) : null;

    let query = { status: 'Approved' };

    // Employees must only see their own leaves, regardless of any supplied employeeId.
    if (userRole === 'employee') {
      if (!actorEmployeeId) {
        return res.status(403).json({
          success: false,
          message: 'Employee profile not found for current user'
        });
      }
      query.employeeId = actorEmployeeId;
    } else if (MANAGER_ROLES.includes(userRole)) {
      if (!actorEmployeeId) {
        return res.status(403).json({
          success: false,
          message: 'Manager profile not found for current user'
        });
      }

      const includeIndirect = userRole === 'senior-manager';
      const teamMembers = await hierarchyHelper.getSubordinates(actorEmployeeId, includeIndirect);
      const teamIds = teamMembers.map((member) => String(member._id));

      if (!teamIds.length) {
        return res.json({ success: true, data: [] });
      }

      if (employeeId) {
        if (teamIds.includes(String(employeeId))) {
          query.employeeId = employeeId;
        } else {
          return res.json({ success: true, data: [] });
        }
      } else {
        query.employeeId = { $in: teamIds };
      }
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    if (startDate && endDate) {
      query.$or = [
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { startDate: { $lte: new Date(startDate) }, endDate: { $gte: new Date(endDate) } }
      ];
    }

    const leaves = await LeaveRequest.find(query)
      .populate('employeeId', 'firstName lastName email department')
      .populate('approvedBy', 'firstName lastName email')
      .sort({ startDate: 1 });

    res.json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Get calendar leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar leaves',
      error: error.message
    });
  }
};

/**
 * Detect overlapping leaves for team/department
 * @route GET /api/leave/overlaps
 */
exports.detectLeaveOverlaps = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    let employeeQuery = { isActive: true };
    if (department) employeeQuery.department = department;

    const employees = await EmployeeHub.find(employeeQuery).select('_id firstName lastName department');
    const employeeIds = employees.map(emp => emp._id);

    const leaves = await LeaveRequest.find({
      employeeId: { $in: employeeIds },
      status: 'Approved',
      $or: [
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { startDate: { $lte: new Date(startDate) }, endDate: { $gte: new Date(endDate) } }
      ]
    }).populate('employeeId', 'firstName lastName department');

    // Group by date
    const dateMap = {};
    leaves.forEach(leave => {
      let current = new Date(leave.startDate);
      const end = new Date(leave.endDate);

      while (current <= end) {
        const dateKey = current.toISOString().split('T')[0];
        if (!dateMap[dateKey]) dateMap[dateKey] = [];
        dateMap[dateKey].push({
          employee: leave.employeeId,
          leaveType: leave.leaveType
        });
        current.setDate(current.getDate() + 1);
      }
    });

    const overlaps = Object.entries(dateMap)
      .filter(([date, empList]) => empList.length > 1)
      .map(([date, empList]) => ({
        date,
        employeesOnLeave: empList.length,
        employees: empList
      }))
      .sort((a, b) => b.employeesOnLeave - a.employeesOnLeave);

    res.json({
      success: true,
      totalEmployees: employees.length,
      overlappingDates: overlaps.length,
      data: overlaps
    });
  } catch (error) {
    console.error('Detect leave overlaps error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect leave overlaps',
      error: error.message
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

async function notifyAdminsOfNewRequest(leaveRequest) {
  try {
    const employee = await EmployeeHub.findById(leaveRequest.employeeId);

    const admins = await User.find({
      role: { $in: ADMIN_SCOPE_ROLES },
      isActive: true
    }).select('_id firstName lastName email role');

    const notifications = admins.map(admin => ({
      recipientType: 'profile',
      profileRef: admin._id,
      type: 'leave',
      title: 'New Leave Request',
      message: `${employee.firstName} ${employee.lastName} has submitted a ${leaveRequest.leaveType} leave request from ${leaveRequest.startDate.toLocaleDateString()} to ${leaveRequest.endDate.toLocaleDateString()}`,
      metadata: { relatedId: leaveRequest._id },
      priority: 'high',
      isRead: false
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error('Failed to notify admins:', error);
  }
}

async function notifyAdminsOfPendingTimeOff(leaveRequest) {
  try {
    const employee = await EmployeeHub.findById(leaveRequest.employeeId);

    const admins = await User.find({
      role: { $in: ADMIN_SCOPE_ROLES },
      isActive: true
    }).select('_id');

    const notifications = admins.map(admin => ({
      recipientType: 'profile',
      profileRef: admin._id,
      type: 'leave',
      title: 'Time Off Request Pending Approval',
      message: `${employee.firstName} ${employee.lastName} has submitted a time off request from ${leaveRequest.startDate.toLocaleDateString()} to ${leaveRequest.endDate.toLocaleDateString()}`,
      metadata: { relatedId: leaveRequest._id, requestStatus: 'Pending' },
      priority: 'high',
      isRead: false
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error('Failed to notify admins of pending time off:', error);
  }
}

async function notifyManagerOfPendingTimeOff(leaveRequest) {
  try {
    const employee = await EmployeeHub.findById(leaveRequest.employeeId).select('firstName lastName managerId');
    if (!employee?.managerId) {
      await notifyAdminsOfPendingTimeOff(leaveRequest);
      return;
    }

    const manager = await EmployeeHub.findById(employee.managerId).select('_id firstName lastName email');
    if (!manager?._id) {
      await notifyAdminsOfPendingTimeOff(leaveRequest);
      return;
    }

    await Notification.create({
      recipientType: 'employee',
      employeeRef: manager._id,
      type: 'leave',
      title: 'New Leave Request Pending Approval',
      message: `${employee.firstName} ${employee.lastName} has submitted a leave request from ${leaveRequest.startDate.toLocaleDateString()} to ${leaveRequest.endDate.toLocaleDateString()}`,
      priority: 'high',
      isRead: false,
      metadata: {
        relatedId: leaveRequest._id,
        leaveType: leaveRequest.leaveType,
        requestStatus: 'Pending'
      }
    });
  } catch (error) {
    console.error('Failed to notify manager of pending time off:', error);
  }
}

async function notifyEmployeeOfApproval(leaveRequest, comment) {
  try {
    const employee = await EmployeeHub.findById(leaveRequest.employeeId);

    await Notification.create({
      recipientType: 'employee',
      employeeRef: leaveRequest.employeeId,
      type: 'leave',
      title: 'Leave Request Approved',
      message: `Your ${leaveRequest.leaveType} leave request for ${leaveRequest.numberOfDays} day(s) has been approved${comment ? ': ' + comment : ''}`,
      priority: 'medium',
      metadata: {
        relatedId: leaveRequest._id,
        leaveType: leaveRequest.leaveType,
        status: 'approved'
      }
    });

    // Send email
    try {
      const { sendLeaveApprovalEmail } = require('../utils/emailService');
      await sendLeaveApprovalEmail(
        employee.email,
        `${employee.firstName} ${employee.lastName}`,
        leaveRequest.leaveType,
        leaveRequest.startDate.toLocaleDateString(),
        leaveRequest.endDate.toLocaleDateString(),
        comment || 'Your leave request has been approved.',
        'approved'
      );
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }
  } catch (error) {
    console.error('Failed to notify employee of approval:', error);
  }
}

async function notifyEmployeeOfRejection(leaveRequest, reason) {
  try {
    const employee = await EmployeeHub.findById(leaveRequest.employeeId);

    await Notification.create({
      recipientType: 'employee',
      employeeRef: leaveRequest.employeeId,
      type: 'leave',
      title: 'Leave Request Rejected',
      message: `Your ${leaveRequest.leaveType} leave request has been rejected: ${reason}`,
      priority: 'high',
      metadata: {
        relatedId: leaveRequest._id,
        leaveType: leaveRequest.leaveType,
        status: 'rejected',
        rejectionReason: reason
      }
    });

    // Send email
    try {
      const { sendLeaveRejectionEmail } = require('../utils/emailService');
      await sendLeaveRejectionEmail(
        employee.email,
        `${employee.firstName} ${employee.lastName}`,
        leaveRequest.leaveType,
        leaveRequest.startDate.toLocaleDateString(),
        leaveRequest.endDate.toLocaleDateString(),
        reason
      );
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }
  } catch (error) {
    console.error('Failed to notify employee of rejection:', error);
  }
}

async function notifyManagerOfLeave(leaveRequest) {
  try {
    const employee = await EmployeeHub.findById(leaveRequest.employeeId)
      .select('firstName lastName managerId');

    if (!employee?.managerId) {
      return;
    }

    await Notification.create({
      recipientType: 'employee',
      employeeRef: employee.managerId,
      type: 'leave',
      title: 'Employee on Leave',
      message: `${employee.firstName} ${employee.lastName} is on ${leaveRequest.leaveType} leave from ${leaveRequest.startDate.toLocaleDateString()} to ${leaveRequest.endDate.toLocaleDateString()}`,
      priority: 'low',
      metadata: {
        relatedEmployeeId: employee._id,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        relatedId: leaveRequest._id
      }
    });
  } catch (error) {
    console.error('Failed to notify manager:', error);
  }
}

async function cancelShiftsForLeave(leaveRequest) {
  try {
    const result = await ShiftAssignment.updateMany(
      {
        employeeId: leaveRequest.employeeId,
        date: {
          $gte: leaveRequest.startDate,
          $lte: leaveRequest.endDate
        },
        status: { $in: ['Scheduled', 'Pending'] }
      },
      {
        status: 'Cancelled',
        notes: `Auto-cancelled due to approved ${leaveRequest.leaveType} leave`
      }
    );

    console.log(`Cancelled ${result.modifiedCount} shift assignments for leave`);
  } catch (error) {
    console.error('Failed to cancel shifts:', error);
  }
}

async function updateLeaveBalance(employeeId, days) {
  try {
    const balance = await AnnualLeaveBalance.getCurrentBalance(employeeId);
    if (balance) {
      balance.usedDays = (balance.usedDays || 0) + days;
      await balance.save();
    }
  } catch (error) {
    console.error('Failed to update leave balance:', error);
  }
}

// ==================== PORTED FROM LEGACY LEAVEROUTES ====================

/**
 * Bulk upload leave balances from CSV array
 * @route POST /api/leave/balances/upload
 * @access Private (Admin)
 */
exports.uploadLeaveBalances = async (req, res) => {
  try {
    const { balances, importBatchId } = req.body;
    
    if (!Array.isArray(balances) || balances.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'balances array is required'
      });
    }
    
    const results = {
      success: [],
      failed: [],
      total: balances.length
    };
    
    const batchId = importBatchId || `BATCH_${Date.now()}`;
    
    for (const item of balances) {
      try {
        const { identifier, leaveYearStart, leaveYearEnd, entitlementDays, carryOverDays } = item;
        
        // Find employee by email in EmployeesHub
        let employee;
        
        if (identifier && identifier.includes('@')) {
          employee = await EmployeeHub.findOne({ email: identifier.toLowerCase() });
        } else {
          results.failed.push({
            identifier,
            reason: 'Invalid identifier format (use email)'
          });
          continue;
        }
        
        if (!employee) {
          results.failed.push({
            identifier,
            reason: 'Employee not found in EmployeesHub'
          });
          continue;
        }
        
        // Create or update balance
        await AnnualLeaveBalance.findOneAndUpdate(
          { 
            user: employee._id, 
            leaveYearStart: new Date(leaveYearStart) 
          },
          {
            user: employee._id,
            leaveYearStart: new Date(leaveYearStart),
            leaveYearEnd: new Date(leaveYearEnd),
            entitlementDays: entitlementDays || 20,
            carryOverDays: carryOverDays || 0,
            importBatchId: batchId
          },
          { 
            new: true, 
            upsert: true,
            runValidators: true
          }
        );
        
        results.success.push(identifier);
        
      } catch (error) {
        results.failed.push({
          identifier: item.identifier,
          reason: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Processed ${results.total} records: ${results.success.length} succeeded, ${results.failed.length} failed`,
      data: results
    });
    
  } catch (error) {
    console.error('Upload balances error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error uploading leave balances'
    });
  }
};

/**
 * Export all leave balances to CSV file
 * @route GET /api/leave/balances/export
 * @access Private (Admin)
 */
exports.exportLeaveBalances = async (req, res) => {
  try {
    const balances = await AnnualLeaveBalance.find({})
      .populate('user', 'firstName lastName email vtid department')
      .sort({ leaveYearStart: -1 });
    
    // Generate CSV
    let csv = 'Employee Name,Email,VTID,Department,Leave Year Start,Leave Year End,Entitlement Days,Carry Over Days,Adjustments,Used Days,Remaining Days\n';
    
    balances.forEach(balance => {
      const employeeName = balance.user ? 
        `${balance.user.firstName} ${balance.user.lastName}` : 'Unknown';
      const email = balance.user?.email || '';
      const vtid = balance.user?.vtid || '';
      const department = balance.user?.department || '';
      const yearStart = balance.leaveYearStart.toLocaleDateString();
      const yearEnd = balance.leaveYearEnd.toLocaleDateString();
      const entitlement = balance.entitlementDays;
      const carryOver = balance.carryOverDays;
      const adjustments = balance.adjustments.reduce((sum, adj) => sum + adj.days, 0);
      const used = balance.usedDays;
      const remaining = balance.remainingDays;
      
      csv += `"${employeeName}",${email},${vtid},"${department}",${yearStart},${yearEnd},${entitlement},${carryOver},${adjustments},${used},${remaining}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leave-balances.csv"');
    res.send(csv);
    
  } catch (error) {
    console.error('Export balances error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error exporting leave balances'
    });
  }
};

/**
 * Update a leave record (status, dates, reason, rejection info)
 * @route PUT /api/leave/records/:id
 * @access Private (Admin)
 */
exports.updateLeaveRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, days, reason, startDate, endDate } = req.body;
    
    const record = await LeaveRecord.findById(id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Leave record not found'
      });
    }
    
    if (status !== undefined) {
      record.status = status;
      if (status === 'approved') {
        record.approvedBy = req.actorId;
        record.approvedAt = new Date();
      } else if (status === 'rejected') {
        record.rejectedBy = req.actorId;
        record.rejectedAt = new Date();
      }
    }
    
    if (days !== undefined) record.days = days;
    if (reason !== undefined) record.reason = reason;
    if (startDate) record.startDate = new Date(startDate);
    if (endDate) record.endDate = new Date(endDate);
    
    await record.save();
    
    const updatedRecord = await LeaveRecord.findById(id)
      .populate('user', 'firstName lastName email vtid')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName');
    
    res.json({
      success: true,
      message: 'Leave record updated successfully',
      data: updatedRecord
    });
    
  } catch (error) {
    console.error('Update leave record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating leave record'
    });
  }
};

/**
 * Update leave balance for a user with validation (0-60 days)
 * Merged with /admin/balance/:userId to consolidate duplicate endpoints
 * @route PUT /balance/:userId (mounted under /api/leave)
 * @access Private (Admin)
 */
exports.updateLeaveBalanceWithValidation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { totalDays, entitlementDays, carryOverDays, reason } = req.body;
    
    // Support both request formats:
    // Legacy: { totalDays: number }
    // Enhanced: { entitlementDays: number, carryOverDays: number, reason: string }
    const daysToSet = totalDays !== undefined ? totalDays : entitlementDays;
    
    if (daysToSet === undefined) {
      return res.status(400).json({
        success: false,
        message: 'totalDays or entitlementDays is required'
      });
    }
    
    // Validate range: 0-60 days
    if (daysToSet < 0 || daysToSet > 60) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entitlement days. Must be between 0 and 60.'
      });
    }
    
    // Find current leave year balance
    const now = new Date();
    let balance = await AnnualLeaveBalance.findOne({
      user: userId,
      leaveYearStart: { $lte: now },
      leaveYearEnd: { $gte: now }
    });
    
    if (!balance) {
      // Create new balance record for current year if using enhanced format
      if (entitlementDays !== undefined) {
        const currentYear = now.getFullYear();
        const month = now.getMonth();
        const leaveYearStart = month >= 3 ? new Date(currentYear, 3, 1) : new Date(currentYear - 1, 3, 1);
        const leaveYearEnd = month >= 3 ? new Date(currentYear + 1, 2, 31) : new Date(currentYear, 2, 31);

        balance = new AnnualLeaveBalance({
          user: userId,
          leaveYearStart,
          leaveYearEnd,
          entitlementDays: entitlementDays || 28,
          carryOverDays: carryOverDays || 0,
          usedDays: 0
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Leave balance not found for current year'
        });
      }
    } else {
      // Update existing balance
      const oldEntitlement = balance.entitlementDays;
      
      if (daysToSet !== undefined && daysToSet !== oldEntitlement) {
        balance.entitlementDays = daysToSet;
        
        // Add adjustment record if reason provided
        if (reason) {
          balance.adjustments.push({
            days: daysToSet - oldEntitlement,
            reason: reason,
            adjustedBy: req.actorId,
            at: new Date()
          });
        }
      }
      
      if (carryOverDays !== undefined) {
        balance.carryOverDays = carryOverDays;
      }
    }
    
    await balance.save();
    
    // Recalculate used days if method exists
    if (AnnualLeaveBalance.recalculateUsedDays) {
      await AnnualLeaveBalance.recalculateUsedDays(
        balance.user,
        balance.leaveYearStart,
        balance.leaveYearEnd
      );
    }
    
    const updatedBalance = await AnnualLeaveBalance.findById(balance._id)
      .populate('user', 'firstName lastName email vtid');
    
    res.json({
      success: true,
      message: 'Leave balance updated successfully',
      data: updatedBalance
    });
    
  } catch (error) {
    console.error('Error updating leave balance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update leave balance', 
      error: error.message 
    });
  }
};

module.exports = exports;
