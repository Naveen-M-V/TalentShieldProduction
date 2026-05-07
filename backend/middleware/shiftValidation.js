/**
 * Shift Validation Middleware
 * Validates shift assignment requests to ensure employees aren't assigned when on leave
 */

const LeaveRequest = require('../models/LeaveRequest');

/**
 * Validate single shift assignment
 * Checks if employee has approved leave during the shift period
 */
const validateShiftAssignment = async (req, res, next) => {
  try {
    const { employeeId, date, startTime, endTime } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and date are required'
      });
    }

    // Check if employee has approved leave on this date
    const shiftDate = new Date(date);
    const startOfDay = new Date(shiftDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(shiftDate.setHours(23, 59, 59, 999));

    const conflictingLeave = await LeaveRequest.findOne({
      employeeId: employeeId,
      status: 'Approved',
      $or: [
        {
          // Leave period contains the shift date
          startDate: { $lte: endOfDay },
          endDate: { $gte: startOfDay }
        }
      ]
    });

    if (conflictingLeave) {
      return res.status(409).json({
        success: false,
        message: 'Cannot assign shift: Employee has approved leave during this period',
        conflict: {
          leaveStart: conflictingLeave.startDate,
          leaveEnd: conflictingLeave.endDate,
          leaveType: conflictingLeave.leaveType
        }
      });
    }

    // No conflicts, proceed
    next();
  } catch (error) {
    console.error('Shift validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating shift assignment',
      error: error.message
    });
  }
};

/**
 * Validate bulk shift assignments
 * Checks multiple shift assignments for leave conflicts
 */
const validateBulkShiftAssignments = async (req, res, next) => {
  try {
    const { assignments } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Assignments array is required'
      });
    }

    const conflicts = [];

    // Check each assignment for conflicts
    for (const assignment of assignments) {
      const { employeeId, date } = assignment;

      if (!employeeId || !date) {
        conflicts.push({
          employeeId,
          date,
          reason: 'Missing required fields'
        });
        continue;
      }

      const shiftDate = new Date(date);
      const startOfDay = new Date(shiftDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(shiftDate.setHours(23, 59, 59, 999));

      const conflictingLeave = await LeaveRequest.findOne({
        userId: employeeId,
        status: 'approved',
        $or: [
          {
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay }
          }
        ]
      });

      if (conflictingLeave) {
        conflicts.push({
          employeeId,
          date,
          reason: 'Employee has approved leave',
          leaveDetails: {
            startDate: conflictingLeave.startDate,
            endDate: conflictingLeave.endDate,
            leaveType: conflictingLeave.leaveType
          }
        });
      }
    }

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Some shift assignments conflict with approved leave',
        conflicts
      });
    }

    // No conflicts, proceed
    next();
  } catch (error) {
    console.error('Bulk shift validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating bulk shift assignments',
      error: error.message
    });
  }
};

module.exports = {
  validateShiftAssignment,
  validateBulkShiftAssignments
};
