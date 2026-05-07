const Sickness = require('../models/Sickness');
const EmployeeHub = require('../models/EmployeesHub');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const { ADMIN_ROLES, ADMIN_SCOPE_ROLES } = require('../utils/roles');
const { resolveActorId } = require('../utils/identityHelper');
const VALID_SICKNESS_TYPES = ['illness', 'injury', 'medical-appointment', 'mental-health', 'other'];
const VALID_CREATED_BY_ROLES = [...ADMIN_SCOPE_ROLES, 'employee', 'manager'];

/**
 * Create sickness record
 * @route POST /api/sickness/create
 */
exports.createSicknessRecord = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, sicknessType, reason, symptoms, requiresNote } = req.body;

    // Validation
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: startDate, endDate, reason'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Determine if admin is creating for employee or employee self-reporting
    const isAdmin = ADMIN_ROLES.includes(req.user?.role);
    let targetEmployeeId;

    if (isAdmin && employeeId) {
      // Admin creating for employee
      targetEmployeeId = employeeId;
      
      const employee = await EmployeeHub.findById(targetEmployeeId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
    } else {
      // Employee self-reporting — use clean Path-1 property from middleware
      targetEmployeeId = req.employeeHubId;
      
      if (!targetEmployeeId) {
        // Fallback: look up EmployeeHub by userId
        const authId = resolveActorId(req);
        const employee = await EmployeeHub.findOne({ userId: authId });
        if (!employee) {
          return res.status(403).json({
            success: false,
            message: 'Could not find your employee profile'
          });
        }
        targetEmployeeId = employee._id;
      }
    }

    // Check for overlapping sickness records
    const overlapping = await Sickness.findOverlapping(targetEmployeeId, start, end);
    if (overlapping.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have a sickness record for this date range',
        overlapping
      });
    }

    // Actor tracking (Path 1 clean properties)
    const actorUserId = resolveActorId(req);
    const actorRole = VALID_CREATED_BY_ROLES.includes(req.user?.role) ? req.user.role : 'employee';

    const sickness = new Sickness({
      employeeId: targetEmployeeId,
      startDate: start,
      endDate: end,
      sicknessType: VALID_SICKNESS_TYPES.includes(sicknessType) ? sicknessType : 'illness',
      reason,
      symptoms: symptoms || '',
      requiresNote: requiresNote || false,
      approvalStatus: isAdmin ? 'approved' : 'pending', // Admin-created auto-approved
      // Actor/Subject Tracking
      createdBy: actorUserId,
      createdByRole: actorRole,
      isAdminCreated: isAdmin,
      approvedByUserId: isAdmin ? actorUserId : null,
      approverRole: isAdmin ? actorRole : null,
      approvedBy: isAdmin ? (req.user?.employeeId || targetEmployeeId) : null,
      approvedAt: isAdmin ? new Date() : null
    });

    await sickness.save();
    await sickness.populate('employeeId', 'firstName lastName employeeId');

    // Notify admins if employee self-reported
    if (!isAdmin) {
      try {
        const admins = await require('../models/User').find({ role: { $in: ADMIN_ROLES } });
        for (const admin of admins) {
          await Notification.create({
            recipientType: 'profile',
            profileRef: admin._id,
            type: 'alert',
            title: 'New Sickness Report',
            message: `${sickness.employeeId.firstName} ${sickness.employeeId.lastName} has reported sick from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
            priority: 'high'
          });
        }
      } catch (notifError) {
        console.error('Failed to notify admins:', notifError);
      }
    } else {
      // Notify employee if admin created
      try {
        await Notification.create({
          recipientType: 'employee',
          employeeRef: targetEmployeeId,
          type: 'system',
          title: 'Sickness Record Created',
          message: `A sickness record has been created for you from ${start.toLocaleDateString()} to ${end.toLocaleDateString()} by ${req.user?.firstName || 'Admin'}`,
          priority: 'medium'
        });
      } catch (notifError) {
        console.error('Failed to notify employee:', notifError);
      }
    }

    res.status(201).json({
      success: true,
      message: isAdmin ? 'Sickness record created and approved' : 'Sickness record submitted for approval',
      data: sickness
    });
  } catch (error) {
    console.error('Create sickness record error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating sickness record',
      error: error.message
    });
  }
};

/**
 * Get sickness records for employee
 * @route GET /api/sickness/employee/:employeeId
 */
exports.getEmployeeSickness = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate, status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID'
      });
    }

    // Authorization check
    const isAdmin = ADMIN_ROLES.includes(req.user?.role);
    const requestingEmployeeId = resolveActorId(req);

    if (!isAdmin && String(requestingEmployeeId) !== String(employeeId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Build query
    const query = { employeeId };

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    if (status) {
      query.approvalStatus = status;
    }

    const records = await Sickness.find(query)
      .populate('employeeId', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedByUserId', 'firstName lastName email')
      .sort({ startDate: -1 });

    // Calculate statistics
    const stats = await Sickness.getEmployeeStats(
      employeeId,
      startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1),
      endDate ? new Date(endDate) : new Date()
    );

    // Calculate Bradford Factor for current year
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const yearEnd = new Date(new Date().getFullYear(), 11, 31);
    const bradfordFactor = await Sickness.calculateBradfordFactor(employeeId, yearStart, yearEnd);

    res.json({
      success: true,
      data: records,
      stats,
      bradfordFactor
    });
  } catch (error) {
    console.error('Get employee sickness error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sickness records',
      error: error.message
    });
  }
};

/**
 * Get all pending sickness requests (admin only)
 * @route GET /api/sickness/pending
 */
exports.getPendingSickness = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const records = await Sickness.find({ approvalStatus: 'pending' })
      .populate('employeeId', 'firstName lastName employeeId department')
      .populate('createdBy', 'firstName lastName')
      .sort({ startDate: -1 });

    res.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Get pending sickness error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending sickness records',
      error: error.message
    });
  }
};

/**
 * Approve sickness record (admin only)
 * @route PATCH /api/sickness/:id/approve
 */
exports.approveSickness = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { id } = req.params;
    const { adminNotes } = req.body;

    const sickness = await Sickness.findById(id);
    if (!sickness) {
      return res.status(404).json({
        success: false,
        message: 'Sickness record not found'
      });
    }

    if (sickness.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Sickness record is already ${sickness.approvalStatus}`
      });
    }

    // Actor tracking
    const actorUserId = resolveActorId(req);
    const actorRole = req.user?.role || req.user?.userType;

    // Resolve admin EmployeeHub ID
    let adminEmployeeId = req.employeeHubId;
    if (!adminEmployeeId) {
      const adminEmployee = await EmployeeHub.findOne({ userId: actorUserId });
      adminEmployeeId = adminEmployee?._id || null;
    }

    sickness.approvalStatus = 'approved';
    sickness.approvedBy = adminEmployeeId;
    sickness.approvedAt = new Date();
    sickness.adminNotes = adminNotes || '';
    // Actor/Subject Tracking
    sickness.approvedByUserId = actorUserId;
    sickness.approverRole = actorRole;
    sickness.approverComments = adminNotes || 'Approved by admin';

    await sickness.save();

    // Notify employee
    try {
      await Notification.create({
        recipientType: 'employee',
        employeeRef: sickness.employeeId,
        type: 'system',
        title: 'Sickness Record Approved',
        message: `Your sickness record from ${sickness.startDate.toLocaleDateString()} to ${sickness.endDate.toLocaleDateString()} has been approved`,
        priority: 'high'
      });
    } catch (notifError) {
      console.error('Failed to notify employee:', notifError);
    }

    await sickness.populate('employeeId', 'firstName lastName');
    await sickness.populate('approvedByUserId', 'firstName lastName');

    res.json({
      success: true,
      message: 'Sickness record approved successfully',
      data: sickness
    });
  } catch (error) {
    console.error('Approve sickness error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving sickness record',
      error: error.message
    });
  }
};

/**
 * Reject sickness record (admin only)
 * @route PATCH /api/sickness/:id/reject
 */
exports.rejectSickness = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const sickness = await Sickness.findById(id);
    if (!sickness) {
      return res.status(404).json({
        success: false,
        message: 'Sickness record not found'
      });
    }

    if (sickness.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Sickness record is already ${sickness.approvalStatus}`
      });
    }

    // Actor tracking
    const actorUserId = resolveActorId(req);
    const actorRole = req.user?.role || req.user?.userType;

    // Resolve admin EmployeeHub ID
    let adminEmployeeId = req.employeeHubId;
    if (!adminEmployeeId) {
      const adminEmployee = await EmployeeHub.findOne({ userId: actorUserId });
      adminEmployeeId = adminEmployee?._id || null;
    }

    sickness.approvalStatus = 'rejected';
    sickness.rejectedBy = adminEmployeeId;
    sickness.rejectedAt = new Date();
    sickness.rejectionReason = rejectionReason;
    // Actor/Subject Tracking
    sickness.approvedByUserId = actorUserId; // Reuse for rejector
    sickness.approverRole = actorRole;
    sickness.approverComments = rejectionReason;

    await sickness.save();

    // Notify employee
    try {
      await Notification.create({
        recipientType: 'employee',
        employeeRef: sickness.employeeId,
        type: 'system',
        title: 'Sickness Record Rejected',
        message: `Your sickness record from ${sickness.startDate.toLocaleDateString()} to ${sickness.endDate.toLocaleDateString()} has been rejected. Reason: ${rejectionReason}`,
        priority: 'high'
      });
    } catch (notifError) {
      console.error('Failed to notify employee:', notifError);
    }

    await sickness.populate('employeeId', 'firstName lastName');
    await sickness.populate('approvedByUserId', 'firstName lastName');

    res.json({
      success: true,
      message: 'Sickness record rejected',
      data: sickness
    });
  } catch (error) {
    console.error('Reject sickness error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting sickness record',
      error: error.message
    });
  }
};

/**
 * Delete sickness record (admin only)
 * @route DELETE /api/sickness/:id
 */
exports.deleteSickness = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { id } = req.params;

    const sickness = await Sickness.findByIdAndDelete(id);
    if (!sickness) {
      return res.status(404).json({
        success: false,
        message: 'Sickness record not found'
      });
    }

    res.json({
      success: true,
      message: 'Sickness record deleted successfully'
    });
  } catch (error) {
    console.error('Delete sickness error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting sickness record',
      error: error.message
    });
  }
};
