const LeaveRecord = require('../models/LeaveRecord');
const ShiftAssignment = require('../models/ShiftAssignment');
const TimeEntry = require('../models/TimeEntry');
const EmployeeHub = require('../models/EmployeesHub');
const mongoose = require('mongoose');

/**
 * Generate Leave Trends Report
 * @route GET /api/reports/leave-trends
 * @access Private (Manager/Admin)
 */
exports.getLeaveTrendsReport = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const matchStage = {
      status: 'approved',
      startDate: { $gte: new Date(startDate) },
      endDate: { $lte: new Date(endDate) }
    };
    
    // Department filter
    let employeeIds = [];
    if (department) {
      const employees = await EmployeeHub.find({ department, isActive: true }).select('_id');
      employeeIds = employees.map(emp => emp._id);
      matchStage.user = { $in: employeeIds };
    }
    
    // Aggregate leave data by type
    const leaveStats = await LeaveRecord.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$type',
          totalDays: { $sum: '$days' },
          count: { $sum: 1 },
          avgDays: { $avg: '$days' }
        }
      },
      { $sort: { totalDays: -1 } }
    ]);
    
    // Monthly breakdown
    const monthlyBreakdown = await LeaveRecord.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$startDate' },
            month: { $month: '$startDate' },
            type: '$type'
          },
          totalDays: { $sum: '$days' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Top leave takers
    const topLeaveTakers = await LeaveRecord.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$user',
          totalDays: { $sum: '$days' },
          leaveCount: { $sum: 1 }
        }
      },
      { $sort: { totalDays: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'employeehubs',
          localField: '_id',
          foreignField: '_id',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
      {
        $project: {
          employeeName: {
            $concat: ['$employee.firstName', ' ', '$employee.lastName']
          },
          department: '$employee.department',
          totalDays: 1,
          leaveCount: 1
        }
      }
    ]);
    
    // Department-wise breakdown
    const departmentBreakdown = await LeaveRecord.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'employeehubs',
          localField: 'user',
          foreignField: '_id',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
      {
        $group: {
          _id: '$employee.department',
          totalDays: { $sum: '$days' },
          leaveCount: { $sum: 1 },
          avgDaysPerLeave: { $avg: '$days' }
        }
      },
      { $sort: { totalDays: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        summary: leaveStats,
        monthlyBreakdown,
        topLeaveTakers,
        departmentBreakdown,
        totals: {
          totalLeaveRequests: leaveStats.reduce((sum, stat) => sum + stat.count, 0),
          totalLeaveDays: leaveStats.reduce((sum, stat) => sum + stat.totalDays, 0)
        }
      }
    });
    
  } catch (error) {
    console.error('Leave trends report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate leave trends report',
      error: error.message
    });
  }
};

/**
 * Generate Shift Coverage Report
 * @route GET /api/reports/shift-coverage
 * @access Private (Manager/Admin)
 */
exports.getShiftCoverageReport = async (req, res) => {
  try {
    const { startDate, endDate, location } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const matchStage = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (location) {
      matchStage.location = location;
    }
    
    // Total shifts by status
    const shiftsByStatus = await ShiftAssignment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Coverage by date and location
    const dailyCoverage = await ShiftAssignment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            location: '$location'
          },
          shiftsScheduled: { $sum: 1 },
          shiftsCompleted: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          shiftsMissed: {
            $sum: { $cond: [{ $eq: ['$status', 'Missed'] }, 1, 0] }
          },
          shiftsCancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
    
    // Overtime hours calculation
    const overtimeStats = await ShiftAssignment.aggregate([
      { 
        $match: { 
          ...matchStage, 
          workType: { $in: ['Overtime', 'Weekend overtime'] } 
        } 
      },
      {
        $group: {
          _id: '$employeeId',
          overtimeShifts: { $sum: 1 }
        }
      },
      { $sort: { overtimeShifts: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'employeehubs',
          localField: '_id',
          foreignField: '_id',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
      {
        $project: {
          employeeName: {
            $concat: ['$employee.firstName', ' ', '$employee.lastName']
          },
          department: '$employee.department',
          overtimeShifts: 1
        }
      }
    ]);
    
    // Location-wise breakdown
    const locationBreakdown = await ShiftAssignment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$location',
          totalShifts: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          missed: {
            $sum: { $cond: [{ $eq: ['$status', 'Missed'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          location: '$_id',
          totalShifts: 1,
          completed: 1,
          missed: 1,
          coverageRate: {
            $multiply: [
              { $divide: ['$completed', '$totalShifts'] },
              100
            ]
          }
        }
      },
      { $sort: { totalShifts: -1 } }
    ]);
    
    // Calculate overall coverage rate
    const coverageRate = calculateCoverageRate(dailyCoverage);
    
    res.status(200).json({
      success: true,
      data: {
        shiftsByStatus,
        dailyCoverage,
        overtimeStats,
        locationBreakdown,
        overallCoverageRate: coverageRate,
        totals: {
          totalShifts: dailyCoverage.reduce((sum, day) => sum + day.shiftsScheduled, 0),
          completedShifts: dailyCoverage.reduce((sum, day) => sum + day.shiftsCompleted, 0),
          missedShifts: dailyCoverage.reduce((sum, day) => sum + day.shiftsMissed, 0)
        }
      }
    });
    
  } catch (error) {
    console.error('Shift coverage report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate shift coverage report',
      error: error.message
    });
  }
};

/**
 * Generate Attendance Summary Report
 * @route GET /api/reports/attendance-summary
 * @access Private (Manager/Admin)
 */
exports.getAttendanceSummaryReport = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const matchStage = {
      clockInTime: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    // Department filter
    if (department) {
      const employees = await EmployeeHub.find({ department, isActive: true }).select('_id');
      const employeeIds = employees.map(emp => emp._id);
      matchStage.employeeId = { $in: employeeIds };
    }
    
    // Attendance by employee
    const attendanceByEmployee = await TimeEntry.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$employeeId',
          totalDays: { $sum: 1 },
          lateArrivals: {
            $sum: {
              $cond: [
                { $eq: ['$isLate', true] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'employeehubs',
          localField: '_id',
          foreignField: '_id',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
      {
        $project: {
          employeeName: {
            $concat: ['$employee.firstName', ' ', '$employee.lastName']
          },
          department: '$employee.department',
          totalDays: 1,
          lateArrivals: 1,
          punctualityRate: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$totalDays', '$lateArrivals'] },
                  '$totalDays'
                ]
              },
              100
            ]
          }
        }
      },
      { $sort: { totalDays: -1 } }
    ]);
    
    // Department-wise attendance
    const departmentAttendance = await TimeEntry.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'employeehubs',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
      {
        $group: {
          _id: '$employee.department',
          totalEntries: { $sum: 1 },
          lateArrivals: {
            $sum: { $cond: [{ $eq: ['$isLate', true] }, 1, 0] }
          },
          uniqueEmployees: { $addToSet: '$employeeId' }
        }
      },
      {
        $project: {
          department: '$_id',
          totalEntries: 1,
          lateArrivals: 1,
          employeeCount: { $size: '$uniqueEmployees' },
          punctualityRate: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$totalEntries', '$lateArrivals'] },
                  '$totalEntries'
                ]
              },
              100
            ]
          }
        }
      },
      { $sort: { totalEntries: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        attendanceByEmployee,
        departmentAttendance,
        totals: {
          totalEntries: attendanceByEmployee.reduce((sum, emp) => sum + emp.totalDays, 0),
          totalLateArrivals: attendanceByEmployee.reduce((sum, emp) => sum + emp.lateArrivals, 0)
        }
      }
    });
    
  } catch (error) {
    console.error('Attendance summary report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate attendance summary report',
      error: error.message
    });
  }
};

/**
 * Get Employee Productivity Metrics
 * @route GET /api/reports/employee-productivity
 * @access Private (Manager/Admin)
 */
exports.getEmployeeProductivity = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const matchStage = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (employeeId) {
      matchStage.employeeId = mongoose.Types.ObjectId(employeeId);
    }
    
    // Calculate productivity metrics
    const productivityMetrics = await ShiftAssignment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$employeeId',
          totalShifts: { $sum: 1 },
          completedShifts: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          missedShifts: {
            $sum: { $cond: [{ $eq: ['$status', 'Missed'] }, 1, 0] }
          },
          overtimeShifts: {
            $sum: { 
              $cond: [
                { $in: ['$workType', ['Overtime', 'Weekend overtime']] }, 
                1, 
                0
              ] 
            }
          }
        }
      },
      {
        $lookup: {
          from: 'employeehubs',
          localField: '_id',
          foreignField: '_id',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
      {
        $project: {
          employeeName: {
            $concat: ['$employee.firstName', ' ', '$employee.lastName']
          },
          department: '$employee.department',
          totalShifts: 1,
          completedShifts: 1,
          missedShifts: 1,
          overtimeShifts: 1,
          completionRate: {
            $multiply: [
              { $divide: ['$completedShifts', '$totalShifts'] },
              100
            ]
          },
          reliabilityScore: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$totalShifts', '$missedShifts'] },
                  '$totalShifts'
                ]
              },
              100
            ]
          }
        }
      },
      { $sort: { completionRate: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: productivityMetrics
    });
    
  } catch (error) {
    console.error('Employee productivity report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate employee productivity report',
      error: error.message
    });
  }
};

/**
 * Helper: Calculate overall coverage rate
 */
function calculateCoverageRate(dailyCoverage) {
  if (!dailyCoverage.length) return 0;
  
  const totalScheduled = dailyCoverage.reduce((sum, day) => sum + day.shiftsScheduled, 0);
  const totalCompleted = dailyCoverage.reduce((sum, day) => sum + day.shiftsCompleted, 0);
  
  return totalScheduled > 0 ? ((totalCompleted / totalScheduled) * 100).toFixed(2) : 0;
}

module.exports = exports;
