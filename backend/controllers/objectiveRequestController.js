const ObjectiveRequest = require('../models/ObjectiveRequest');
const EmployeeHub = require('../models/EmployeesHub');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { ADMIN_ROLES } = require('../utils/roles');

/**
 * Create objective request (Manager requests employee to create objectives)
 * @route POST /api/objective-requests
 * @access Manager only
 */
exports.createRequest = async (req, res) => {
  try {
    const { employeeId, message, deadline } = req.body;
    const userId = req.user._id || req.user.id;

    // Check if user is manager
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can request objectives'
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

    // Check for existing pending request
    const existingRequest = await ObjectiveRequest.findOne({
      employeeId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Employee already has a pending objective request'
      });
    }

    const request = await ObjectiveRequest.create({
      employeeId,
      employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email,
      department: employee.department,
      requestedBy: userId,
      requestedByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
      message,
      deadline: new Date(deadline),
      status: 'pending'
    });

    // Create notification for employee (all staff are in EmployeesHub → recipientType:'employee')
    try {
      await Notification.create({
        recipientType: 'employee',
        employeeRef: employee._id,
        type: 'objective_request',
        title: 'New Objective Request',
        message: `Your manager has requested you to create your objectives. Deadline: ${new Date(deadline).toLocaleDateString()}`,
        priority: 'high',
        metadata: {
          relatedId: request._id,
          relatedType: 'ObjectiveRequest',
          requestedBy: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
        },
        actionUrl: '/performance',
        actionText: 'View Request'
      });
    } catch (notifErr) {
      console.error('Notification error in createRequest (non-fatal):', notifErr.message);
    }

    // Audit log
    await AuditLog.create({
      entityType: 'ObjectiveRequest',
      entityId: request._id,
      action: 'create',
      changedBy: userId,
      changedByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
      changes: { employeeId, message, deadline },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      message: 'Objective request sent successfully',
      data: request
    });
  } catch (error) {
    console.error('💥 Error creating objective request:', error);
    console.error('💥 Error stack:', error.stack);
    console.error('💥 Request body:', req.body);
    res.status(500).json({
      success: false,
      message: 'Failed to create objective request',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get all objective requests (Manager view)
 * @route GET /api/objective-requests
 * @access Manager only
 */
exports.getRequests = async (req, res) => {
  try {
    const { status, department } = req.query;

    // Check if user is manager
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can view all requests'
      });
    }

    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;

    const requests = await ObjectiveRequest.find(filter)
      .populate('employeeId', 'firstName lastName email department')
      .populate('requestedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('💥 Error fetching requests:', error);
    console.error('💥 Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get my objective requests (Employee view)
 * @route GET /api/objective-requests/my
 * @access Authenticated
 */
exports.getMyRequests = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // Find employee record
    const employee = await EmployeeHub.findOne({ userId });
    if (!employee) {
      return res.json({
        success: true,
        data: []
      });
    }

    const requests = await ObjectiveRequest.find({ employeeId: employee._id })
      .populate('requestedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching my requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: error.message
    });
  }
};

/**
 * Update request status
 * @route PUT /api/objective-requests/:id
 * @access Manager only
 */
exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user._id || req.user.id;

    // Check if user is manager
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can update requests'
      });
    }

    const request = await ObjectiveRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    const oldStatus = request.status;
    request.status = status;
    if (notes) request.notes = notes;
    if (status === 'completed') request.completedAt = new Date();

    await request.save();

    // Audit log
    await AuditLog.create({
      entityType: 'ObjectiveRequest',
      entityId: request._id,
      action: 'update',
      changedBy: userId,
      changedByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
      changes: { old: { status: oldStatus }, new: { status } },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Request updated successfully',
      data: request
    });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update request',
      error: error.message
    });
  }
};

/**
 * Check and mark overdue requests
 * @route GET /api/objective-requests/check-overdue
 * @access Manager only
 */
exports.checkOverdue = async (req, res) => {
  try {
    // Check if user is manager
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can check overdue requests'
      });
    }

    const now = new Date();
    const result = await ObjectiveRequest.updateMany(
      {
        status: 'pending',
        deadline: { $lt: now }
      },
      {
        $set: { status: 'overdue' }
      }
    );

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} request(s) as overdue`,
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('Error checking overdue requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check overdue requests',
      error: error.message
    });
  }
};

/**
 * Delete objective request
 * @route DELETE /api/objective-requests/:id
 * @access Manager only
 */
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    // Check if user is manager
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can delete requests'
      });
    }

    const request = await ObjectiveRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    await request.deleteOne();

    // Audit log
    await AuditLog.create({
      entityType: 'ObjectiveRequest',
      entityId: request._id,
      action: 'delete',
      changedBy: userId,
      changedByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
      changes: { employeeId: request.employeeId, status: request.status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete request',
      error: error.message
    });
  }
};
