const LatenessRecord = require('../models/LatenessRecord');
const EmployeeHub = require('../models/EmployeesHub');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const { ADMIN_ROLES } = require('../utils/roles');
const { resolveActorId } = require('../utils/identityHelper');

/**
 * Get lateness records for an employee
 * @route GET /api/lateness/employee/:employeeId
 */
exports.getEmployeeLateness = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate, excused } = req.query;

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
    const query = { employee: employeeId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (excused !== undefined) {
      query.excused = excused === 'true';
    }

    const records = await LatenessRecord.find(query)
      .populate('employee', 'firstName lastName employeeId')
      .populate('excusedBy', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ date: -1 });

    // Calculate statistics
    const stats = await LatenessRecord.getEmployeeStats(
      employeeId,
      startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1),
      endDate ? new Date(endDate) : new Date()
    );

    res.json({
      success: true,
      data: records,
      stats
    });
  } catch (error) {
    console.error('Get employee lateness error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lateness records',
      error: error.message
    });
  }
};

/**
 * Get all lateness records (admin only)
 * @route GET /api/lateness/all
 */
exports.getAllLateness = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { startDate, endDate, excused, limit = 100 } = req.query;

    const query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (excused !== undefined) {
      query.excused = excused === 'true';
    }

    const records = await LatenessRecord.find(query)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('excusedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ date: -1 })
      .limit(parseInt(limit));

    // Calculate totals
    const totalMinutesLate = records.reduce((sum, r) => sum + r.minutesLate, 0);
    const excusedCount = records.filter(r => r.excused).length;

    res.json({
      success: true,
      data: records,
      summary: {
        totalRecords: records.length,
        totalMinutesLate,
        averageMinutesLate: records.length > 0 ? (totalMinutesLate / records.length).toFixed(2) : 0,
        excusedCount,
        unexcusedCount: records.length - excusedCount
      }
    });
  } catch (error) {
    console.error('Get all lateness error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lateness records',
      error: error.message
    });
  }
};

/**
 * Create lateness record manually (admin only)
 * @route POST /api/lateness/create
 */
exports.createLatenessRecord = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { employeeId, date, scheduledStart, actualStart, minutesLate, reason, excused } = req.body;

    if (!employeeId || !date || !scheduledStart || !actualStart || minutesLate === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate employee exists
    const employee = await EmployeeHub.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Actor tracking
    const actorUserId = resolveActorId(req);
    const actorRole = req.user?.role || req.user?.userType;

    const record = new LatenessRecord({
      employee: employeeId,
      date: new Date(date),
      scheduledStart: new Date(scheduledStart),
      actualStart: new Date(actualStart),
      minutesLate,
      reason: reason || '',
      excused: excused || false,
      // Actor/Subject Tracking
      createdBy: actorUserId,
      createdByRole: actorRole,
      isAdminCreated: true,
      excusedBy: excused ? actorUserId : null,
      excusedAt: excused ? new Date() : null,
      excuseReason: excused && reason ? reason : null
    });

    await record.save();

    // Notify employee
    try {
      await Notification.create({
        recipientType: 'employee',
        employeeRef: employeeId,
        type: 'system',
        title: excused ? 'Excused Lateness Record Added' : 'Lateness Record Added',
        message: `A lateness record for ${minutesLate} minutes on ${new Date(date).toLocaleDateString()} has been added${excused ? ' and excused' : ''} by ${req.user?.firstName || 'Admin'}`,
        priority: excused ? 'low' : 'medium'
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    await record.populate('employee', 'firstName lastName employeeId');
    await record.populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Lateness record created successfully',
      data: record
    });
  } catch (error) {
    console.error('Create lateness record error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating lateness record',
      error: error.message
    });
  }
};

/**
 * Excuse lateness record (admin only)
 * @route PATCH /api/lateness/:id/excuse
 */
exports.excuseLatenessRecord = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { id } = req.params;
    const { excuseReason } = req.body;

    const record = await LatenessRecord.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Lateness record not found'
      });
    }

    if (record.excused) {
      return res.status(400).json({
        success: false,
        message: 'This lateness record is already excused'
      });
    }

    const actorUserId = resolveActorId(req);

    record.excused = true;
    record.excusedBy = actorUserId;
    record.excusedAt = new Date();
    record.excuseReason = excuseReason || 'Excused by admin';

    await record.save();

    // Notify employee
    try {
      await Notification.create({
        recipientType: 'employee',
        employeeRef: record.employee,
        type: 'system',
        title: 'Lateness Record Excused',
        message: `Your lateness record from ${record.date.toLocaleDateString()} has been excused. Reason: ${record.excuseReason}`,
        priority: 'low'
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    await record.populate('employee', 'firstName lastName');
    await record.populate('excusedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Lateness record excused successfully',
      data: record
    });
  } catch (error) {
    console.error('Excuse lateness record error:', error);
    res.status(500).json({
      success: false,
      message: 'Error excusing lateness record',
      error: error.message
    });
  }
};

/**
 * Delete lateness record (admin only)
 * @route DELETE /api/lateness/:id
 */
exports.deleteLatenessRecord = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { id } = req.params;

    const record = await LatenessRecord.findByIdAndDelete(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Lateness record not found'
      });
    }

    res.json({
      success: true,
      message: 'Lateness record deleted successfully'
    });
  } catch (error) {
    console.error('Delete lateness record error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting lateness record',
      error: error.message
    });
  }
};
