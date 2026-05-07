const LeaveRecord = require('../models/LeaveRecord');
const AnnualLeaveBalance = require('../models/AnnualLeaveBalance');
const EmployeeHub = require('../models/EmployeesHub');
const Notification = require('../models/Notification');
const ShiftAssignment = require('../models/ShiftAssignment');
const { sendLeaveRequestEmail, sendLeaveApprovalEmail, sendLeaveRejectionEmail } = require('../utils/emailService');
const hierarchyHelper = require('../utils/hierarchyHelper');

/**
 * Leave Approval Controller
 * Handles leave request approval workflow, manager notifications, and balance updates
 */

/**
 * Submit leave request (pending approval)
 */
exports.submitLeaveRequest = async (req, res) => {
  try {
    const { employeeId, type, startDate, endDate, days, reason } = req.body;

    if (!employeeId || !startDate || !endDate || !days) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: employeeId, startDate, endDate, days'
      });
    }

    // Find employee and manager
    const employee = await EmployeeHub.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const manager = employee.managerId ? await EmployeeHub.findById(employee.managerId) : null;

    // Check for overlapping leave requests
    const overlappingLeaves = await LeaveRecord.findLeaveInRange(employeeId, startDate, endDate);
    if (overlappingLeaves.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have leave scheduled during this period',
        overlapping: overlappingLeaves
      });
    }

    // Check leave balance if annual leave
    if (type === 'annual') {
      const balance = await AnnualLeaveBalance.getCurrentBalance(employeeId);
      if (!balance) {
        return res.status(400).json({
          success: false,
          message: 'No leave balance found for current year'
        });
      }

      if (balance.remainingDays < days) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance. You have ${balance.remainingDays} days remaining, but requested ${days} days.`
        });
      }
    }

    // Create leave request with pending status
    const leaveRequest = new LeaveRecord({
      user: employeeId,
      type: type || 'annual',
      status: 'pending',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      days,
      reason: reason || '',
      createdBy: req.user._id
    });

    await leaveRequest.save();

    // Send notification to manager
    if (manager) {
      try {
        await Notification.create({
          recipientType: 'employee',
          employeeRef: manager._id,
          type: 'leave',
          title: 'Leave Request Pending Approval',
          message: `${employee.firstName} ${employee.lastName} has requested ${days} days of ${type} leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
          priority: 'high',
          metadata: {
            leaveRequestId: leaveRequest._id,
            employeeId: employee._id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            type,
            startDate,
            endDate,
            days,
            reason
          }
        });

        // Send email to manager
        if (manager.email) {
          await sendLeaveRequestEmail(
            manager.email,
            `${manager.firstName} ${manager.lastName}`,
            `${employee.firstName} ${employee.lastName}`,
            type,
            startDate,
            endDate,
            days,
            reason
          );
        }
      } catch (notifError) {
        console.error('Failed to notify manager:', notifError);
      }
    }

    const populatedRequest = await LeaveRecord.findById(leaveRequest._id)
      .populate('user', 'firstName lastName email employeeId');

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully and is pending approval',
      data: populatedRequest
    });

  } catch (error) {
    console.error('Submit leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit leave request',
      error: error.message
    });
  }
};

/**
 * Approve leave request
 */
exports.approveLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { approvalNotes } = req.body;

    const leaveRequest = await LeaveRecord.findById(leaveId)
      .populate('user', 'firstName lastName email employeeId');

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Leave request has already been ${leaveRequest.status}`
      });
    }

    // Verify approver has permission using hierarchy helper
    const canApprove = await hierarchyHelper.canApproveLeave(req.user._id, leaveRequest.user._id);
    if (!canApprove) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to approve this leave request'
      });
    }

    // Update leave request status
    leaveRequest.status = 'approved';
    leaveRequest.approvedBy = req.user._id;
    leaveRequest.approvedAt = new Date();
    leaveRequest.notes = approvalNotes || '';

    await leaveRequest.save();

    // Update leave balance if annual leave
    if (leaveRequest.type === 'annual') {
      const balance = await AnnualLeaveBalance.getCurrentBalance(leaveRequest.user._id);
      if (balance) {
        await AnnualLeaveBalance.recalculateUsedDays(
          leaveRequest.user._id,
          balance.leaveYearStart,
          balance.leaveYearEnd
        );
      }
    }

    // Send notification to employee
    try {
      const approver = await EmployeeHub.findById(req.user._id);
      
      await Notification.create({
        recipientType: 'employee',
        employeeRef: leaveRequest.user._id,
        type: 'leave',
        title: 'Leave Request Approved',
        message: `Your ${leaveRequest.type} leave request for ${leaveRequest.days} days from ${new Date(leaveRequest.startDate).toLocaleDateString()} to ${new Date(leaveRequest.endDate).toLocaleDateString()} has been approved`,
        priority: 'high',
        metadata: {
          leaveRequestId: leaveRequest._id,
          approvedBy: approver ? `${approver.firstName} ${approver.lastName}` : 'Manager',
          type: leaveRequest.type,
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          days: leaveRequest.days
        }
      });

      // Send email to employee
      if (leaveRequest.user.email && approver) {
        await sendLeaveApprovalEmail(
          leaveRequest.user.email,
          `${leaveRequest.user.firstName} ${leaveRequest.user.lastName}`,
          leaveRequest.type,
          leaveRequest.startDate,
          leaveRequest.endDate,
          leaveRequest.days,
          `${approver.firstName} ${approver.lastName}`
        );
      }
    } catch (notifError) {
      console.error('Failed to notify employee:', notifError);
    }

    const updatedRequest = await LeaveRecord.findById(leaveRequest._id)
      .populate('user', 'firstName lastName email employeeId')
      .populate('approvedBy', 'firstName lastName email employeeId');

    res.status(200).json({
      success: true,
      message: 'Leave request approved successfully',
      data: updatedRequest
    });

  } catch (error) {
    console.error('Approve leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve leave request',
      error: error.message
    });
  }
};

/**
 * Reject leave request
 */
exports.rejectLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const leaveRequest = await LeaveRecord.findById(leaveId)
      .populate('user', 'firstName lastName email employeeId');

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Leave request has already been ${leaveRequest.status}`
      });
    }

    // Verify approver has permission using hierarchy helper
    const canApprove = await hierarchyHelper.canApproveLeave(req.user._id, leaveRequest.user._id);
    if (!canApprove) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reject this leave request'
      });
    }

    // Update leave request status
    leaveRequest.status = 'rejected';
    leaveRequest.rejectedBy = req.user._id;
    leaveRequest.rejectedAt = new Date();
    leaveRequest.rejectionReason = rejectionReason;

    await leaveRequest.save();

    // Send notification to employee
    try {
      const approver = await EmployeeHub.findById(req.user._id);
      
      await Notification.create({
        recipientType: 'employee',
        employeeRef: leaveRequest.user._id,
        type: 'leave',
        title: 'Leave Request Rejected',
        message: `Your ${leaveRequest.type} leave request for ${leaveRequest.days} days from ${new Date(leaveRequest.startDate).toLocaleDateString()} to ${new Date(leaveRequest.endDate).toLocaleDateString()} has been rejected. Reason: ${rejectionReason}`,
        priority: 'high',
        metadata: {
          leaveRequestId: leaveRequest._id,
          rejectedBy: approver ? `${approver.firstName} ${approver.lastName}` : 'Manager',
          type: leaveRequest.type,
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          days: leaveRequest.days,
          rejectionReason
        }
      });

      // Send email to employee
      if (leaveRequest.user.email && approver) {
        await sendLeaveRejectionEmail(
          leaveRequest.user.email,
          `${leaveRequest.user.firstName} ${leaveRequest.user.lastName}`,
          leaveRequest.type,
          leaveRequest.startDate,
          leaveRequest.endDate,
          leaveRequest.days,
          `${approver.firstName} ${approver.lastName}`,
          rejectionReason
        );
      }
    } catch (notifError) {
      console.error('Failed to notify employee:', notifError);
    }

    const updatedRequest = await LeaveRecord.findById(leaveRequest._id)
      .populate('user', 'firstName lastName email employeeId')
      .populate('rejectedBy', 'firstName lastName email employeeId');

    res.status(200).json({
      success: true,
      message: 'Leave request rejected',
      data: updatedRequest
    });

  } catch (error) {
    console.error('Reject leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject leave request',
      error: error.message
    });
  }
};

/**
 * Get pending leave requests for manager
 */
exports.getPendingLeaveRequests = async (req, res) => {
  try {
    const managerId = req.user._id;

    // Find all employees reporting to this manager
    const directReports = await EmployeeHub.find({ 
      managerId: managerId,
      isActive: true 
    }).select('_id');

    const reportIds = directReports.map(emp => emp._id);

    // Get all pending leave requests from direct reports
    const pendingRequests = await LeaveRecord.find({
      user: { $in: reportIds },
      status: 'pending'
    })
      .populate('user', 'firstName lastName email employeeId department jobTitle')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingRequests.length,
      data: pendingRequests
    });

  } catch (error) {
    console.error('Get pending leave requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending leave requests',
      error: error.message
    });
  }
};

/**
 * Get leave requests by employee
 */
exports.getEmployeeLeaveRequests = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status, startDate, endDate } = req.query;

    const query = { user: employeeId };

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.$or = [
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } }
      ];
    }

    const leaveRequests = await LeaveRecord.find(query)
      .populate('approvedBy', 'firstName lastName email')
      .populate('rejectedBy', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .sort({ startDate: -1 });

    res.status(200).json({
      success: true,
      count: leaveRequests.length,
      data: leaveRequests
    });

  } catch (error) {
    console.error('Get employee leave requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee leave requests',
      error: error.message
    });
  }
};

/**
 * Detect overlapping leave requests for team/department
 */
exports.detectLeaveOverlaps = async (req, res) => {
  try {
    const { startDate, endDate, department, team } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // Find employees in the specified department/team
    let employeeQuery = { isActive: true };
    if (department) employeeQuery.department = department;
    if (team) employeeQuery.team = team;

    const employees = await EmployeeHub.find(employeeQuery).select('_id firstName lastName department team');

    // Find all approved leaves in date range for these employees
    const employeeIds = employees.map(emp => emp._id);
    const leaves = await LeaveRecord.find({
      user: { $in: employeeIds },
      status: 'approved',
      $or: [
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { startDate: { $lte: new Date(startDate) }, endDate: { $gte: new Date(endDate) } }
      ]
    }).populate('user', 'firstName lastName email department team');

    // Group by date to find overlaps
    const dateMap = {};
    leaves.forEach(leave => {
      let current = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      
      while (current <= end) {
        const dateKey = current.toISOString().split('T')[0];
        if (!dateMap[dateKey]) {
          dateMap[dateKey] = [];
        }
        dateMap[dateKey].push({
          employee: leave.user,
          leaveType: leave.type
        });
        current.setDate(current.getDate() + 1);
      }
    });

    // Find dates with multiple employees on leave (potential understaffing)
    const overlaps = Object.entries(dateMap)
      .filter(([date, empList]) => empList.length > 1)
      .map(([date, empList]) => ({
        date,
        employeesOnLeave: empList.length,
        employees: empList
      }))
      .sort((a, b) => b.employeesOnLeave - a.employeesOnLeave);

    res.status(200).json({
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

/**
 * NEW: Trigger cross-module actions when leave is approved
 * - Cancel shift assignments on leave dates
 * - Notify only the employee's manager about absence
 */
async function triggerLeaveApprovedActions(leaveRequest) {
  try {
    console.log(`🔄 Triggering cross-module actions for leave approval: ${leaveRequest._id}`);
    
    // 1. Cancel shift assignments on leave dates
    const cancelledShifts = await ShiftAssignment.updateMany(
      {
        employeeId: leaveRequest.user._id || leaveRequest.user,
        date: {
          $gte: leaveRequest.startDate,
          $lte: leaveRequest.endDate
        },
        status: { $in: ['Scheduled', 'Pending'] }
      },
      {
        status: 'Cancelled',
        notes: `Auto-cancelled due to approved ${leaveRequest.type} leave`
      }
    );
    
    console.log(`✅ Cancelled ${cancelledShifts.modifiedCount} shift assignments`);
    
    // 2. Notify only the employee's manager
    const employee = await EmployeeHub.findById(leaveRequest.user._id || leaveRequest.user)
      .select('_id firstName lastName managerId');

    if (employee?.managerId) {
      await Notification.create({
        recipientType: 'employee',
        employeeRef: employee.managerId,
        type: 'leave',
        title: 'Employee on Leave',
        message: `${employee.firstName} ${employee.lastName} is on ${leaveRequest.type} leave from ${new Date(leaveRequest.startDate).toLocaleDateString()} to ${new Date(leaveRequest.endDate).toLocaleDateString()}`,
        priority: 'low',
        metadata: {
          employeeId: employee._id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          leaveType: leaveRequest.type,
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          days: leaveRequest.days,
          relatedId: leaveRequest._id
        }
      });

      console.log('✅ Manager notification sent');
    }
    
    console.log(`✅ Cross-module actions completed for leave: ${leaveRequest._id}`);
    
  } catch (error) {
    console.error('❌ Failed to trigger leave approval actions:', error);
    // Don't throw - leave approval already succeeded
  }
}

module.exports = exports;
