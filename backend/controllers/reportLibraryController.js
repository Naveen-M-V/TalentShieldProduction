const LeaveRecord = require('../models/LeaveRecord');
const TimeEntry = require('../models/TimeEntry');
const EmployeesHub = require('../models/EmployeesHub');
const ShiftAssignment = require('../models/ShiftAssignment');
const Certificate = require('../models/Certificate');
const Expense = require('../models/Expense');
const PayrollException = require('../models/PayrollException');
const LatenessRecord = require('../models/LatenessRecord');
const ArchiveEmployee = require('../models/ArchiveEmployee');
const AnnualLeaveBalance = require('../models/AnnualLeaveBalance');
const { exportReportToCSV } = require('../utils/csvExporter');
const { exportReportToPDF } = require('../utils/pdfExporter');

/**
 * Get all available report types with metadata
 */
exports.getReportTypes = async (req, res) => {
  try {
    const reportTypes = [
      {
        id: 'absence',
        name: 'Absence Report',
        description: 'Comprehensive absence tracking including all leave types',
        icon: 'UserX',
        category: 'Leave'
      },
      {
        id: 'annual-leave',
        name: 'Annual Leave Report',
        description: 'Annual leave usage, balances, and trends',
        icon: 'Calendar',
        category: 'Leave'
      },
      {
        id: 'lateness',
        name: 'Lateness Report',
        description: 'Employee lateness incidents and patterns',
        icon: 'Clock',
        category: 'Time'
      },
      {
        id: 'overtime',
        name: 'Overtime Report',
        description: 'Overtime hours worked and costs',
        icon: 'TrendingUp',
        category: 'Time'
      },
      {
        id: 'rota',
        name: 'Rota Report',
        description: 'Shift schedules and coverage analysis',
        icon: 'CalendarDays',
        category: 'Time'
      },
      {
        id: 'sickness',
        name: 'Sickness Report',
        description: 'Sickness absence trends and Bradford Factor scores',
        icon: 'Activity',
        category: 'Leave'
      },
      {
        id: 'employee-details',
        name: 'Employee Details Report',
        description: 'Comprehensive employee information export',
        icon: 'Users',
        category: 'People'
      },
      {
        id: 'expenses',
        name: 'Expenses Report',
        description: 'Employee expense claims and reimbursements',
        icon: 'Receipt',
        category: 'Finance'
      },
      {
        id: 'length-of-service',
        name: 'Length of Service',
        description: 'Employee tenure and service anniversaries',
        icon: 'Award',
        category: 'People'
      },
      {
        id: 'working-status',
        name: 'Working Status',
        description: 'Current employment status breakdown',
        icon: 'BarChart',
        category: 'People'
      },
      {
        id: 'sensitive-info',
        name: 'Sensitive Information',
        description: 'Certificates and documents requiring renewal',
        icon: 'ShieldAlert',
        category: 'Compliance'
      }
    ];

    res.json({ success: true, data: reportTypes });
  } catch (error) {
    console.error('Error fetching report types:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate Absence Report
 * Includes approved leave records AND employees who didn't clock in when they had shifts
 */
exports.generateAbsenceReport = async (req, res) => {
  try {
    const { startDate, endDate, employeeIds, includeExcused } = req.body;

    const matchStage = {
      startDate: { $lte: new Date(endDate) },
      endDate: { $gte: new Date(startDate) },
      status: 'approved'
    };

    if (employeeIds && employeeIds.length > 0) {
      matchStage.user = { $in: employeeIds };
    }

    // Get approved leave records
    const absenceData = await LeaveRecord.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'employeeshubs',
          localField: 'user',
          foreignField: '_id',
          as: 'employeeDetails'
        }
      },
      { $unwind: '$employeeDetails' },
      {
        $group: {
          _id: {
            employeeId: '$user',
            type: '$type'
          },
          employee: { $first: '$employeeDetails' },
          totalDays: { $sum: '$days' },
          instances: { $sum: 1 },
          records: { 
            $push: { 
              startDate: '$startDate',
              endDate: '$endDate',
              type: '$type',
              reason: '$reason',
              days: '$days'
            } 
          }
        }
      },
      {
        $group: {
          _id: '$_id.employeeId',
          employee: { $first: '$employee' },
          leaveBreakdown: {
            $push: {
              leaveType: '$_id.type',
              totalDays: '$totalDays',
              instances: '$instances'
            }
          },
          totalAbsenceDays: { $sum: '$totalDays' },
          totalInstances: { $sum: '$instances' },
          allRecords: { $push: '$records' }
        }
      },
      {
        $project: {
          employeeId: '$employee.employeeId',
          fullName: { $concat: ['$employee.firstName', ' ', '$employee.lastName'] },
          department: '$employee.department',
          jobTitle: '$employee.jobTitle',
          leaveBreakdown: 1,
          totalAbsenceDays: 1,
          totalInstances: 1,
          records: { $reduce: { input: '$allRecords', initialValue: [], in: { $concatArrays: ['$$value', '$$this'] } } }
        }
      },
      { $sort: { totalAbsenceDays: -1 } }
    ]);

    // Also check for employees who didn't clock in when they had shifts
    const employeeIdsToCheck = employeeIds && employeeIds.length > 0 ? employeeIds : 
      (await EmployeesHub.find({ status: 'Active', isActive: true, deleted: { $ne: true } }).distinct('_id'));

    const shiftsInRange = await ShiftAssignment.find({
      employeeId: { $in: employeeIdsToCheck },
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('employeeId', 'employeeId firstName lastName department jobTitle').lean();

    // Check which shifts don't have corresponding time entries
    const absencesWithoutClockIn = [];
    for (const shift of shiftsInRange) {
      const dateStr = new Date(shift.date).toISOString().slice(0, 10);
      const timeEntry = await TimeEntry.findOne({
        employee: shift.employeeId._id,
        date: dateStr
      });

      // Check if there's also a leave record for this date
      const shiftDate = new Date(shift.date);
      const dayStart = new Date(shiftDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(shiftDate);
      dayEnd.setHours(23, 59, 59, 999);

      const leaveRecord = await LeaveRecord.findOne({
        user: shift.employeeId._id,
        status: 'approved',
        startDate: { $lte: dayEnd },
        endDate: { $gte: dayStart }
      });

      if (!timeEntry && !leaveRecord && shift.employeeId) {
        absencesWithoutClockIn.push({
          employeeId: shift.employeeId.employeeId,
          fullName: `${shift.employeeId.firstName} ${shift.employeeId.lastName}`,
          department: shift.employeeId.department,
          jobTitle: shift.employeeId.jobTitle,
          date: shift.date,
          shiftTime: `${shift.startTime} - ${shift.endTime}`,
          reason: 'No Clock-in / No Leave Recorded',
          type: 'Unrecorded Absence'
        });
      }
    }

    res.json({
      success: true,
      data: {
        reportType: 'absence',
        dateRange: { startDate, endDate },
        totalRecords: absenceData.length,
        records: absenceData,
        unrecordedAbsences: absencesWithoutClockIn
      }
    });
    
    console.log(`[Absence Report] Generated successfully: ${absenceData.length} records, ${absencesWithoutClockIn.length} unrecorded`);
  } catch (error) {
    console.error('[Absence Report] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate Annual Leave Report
 * Includes leave dates, reasons, and balance information
 */
exports.generateAnnualLeaveReport = async (req, res) => {
  try {

    const { year, employeeIds } = req.body;
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // PATCH: Restrict managers to only their team
    let scopedEmployeeIds = employeeIds;
    if (!scopedEmployeeIds || scopedEmployeeIds.length === 0) {
      // If no employeeIds provided, check role
      const userRole = req.user?.role || req.session?.user?.role;
      if (userRole === 'manager') {
        // Find manager's team
        const managerId = req.user?.employeeId || req.user?._id || req.session?.user?.employeeId || req.session?.user?._id;
        const EmployeeHub = require('../models/EmployeesHub');
        const hierarchyHelper = require('../utils/hierarchyHelper');
        const manager = await EmployeeHub.findById(managerId);
        if (manager) {
          const teamMembers = await hierarchyHelper.getSubordinates(manager._id, false);
          scopedEmployeeIds = teamMembers.map((member) => member._id);
        } else {
          scopedEmployeeIds = [];
        }
      }
    }

    const matchStage = {
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
      type: 'annual',
      status: 'approved'
    };
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      matchStage.user = { $in: scopedEmployeeIds };
    }

    const leaveData = await LeaveRecord.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'employeeshubs',
          localField: 'user',
          foreignField: '_id',
          as: 'employeeDetails'
        }
      },
      { $unwind: '$employeeDetails' },
      {
        $group: {
          _id: '$user',
          employee: { $first: '$employeeDetails' },
          totalUsed: { $sum: '$days' },
          instances: { $sum: 1 },
          leaveRecords: { 
            $push: { 
              startDate: '$startDate',
              endDate: '$endDate',
              days: '$days',
              reason: '$reason',
              startDate: '$startDate',
              endDate: '$endDate'
            } 
          }
        }
      }
    ]);

    // Get balances
    const balances = await AnnualLeaveBalance.find({
      user: { $in: leaveData.map(l => l._id) },
      leaveYearStart: { $lte: endDate },
      leaveYearEnd: { $gte: startDate }
    });

    const balanceMap = {};
    balances.forEach(b => {
      balanceMap[b.user.toString()] = b;
    });

    const reportData = leaveData.map(record => {
      const balance = balanceMap[record._id.toString()] || {};
      return {
        employeeId: record.employee.employeeId,
        fullName: `${record.employee.firstName} ${record.employee.lastName}`,
        department: record.employee.department,
        entitled: balance.totalEntitled || 0,
        used: record.totalUsed,
        remaining: (balance.totalEntitled || 0) - record.totalUsed,
        instances: record.instances,
        leaveDetails: record.leaveRecords
      };
    });

    res.json({
      success: true,
      data: {
        reportType: 'annual-leave',
        year: year,
        totalRecords: reportData.length,
        records: reportData
      }
    });
    
    console.log(`[Annual Leave Report] Generated successfully: ${reportData.length} records for year ${year}`);
  } catch (error) {
    console.error('[Annual Leave Report] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate Lateness Report
 * Calculates lateness when employees clock in after their scheduled shift start time
 */
exports.generateLatenessReport = async (req, res) => {
  try {
    const { startDate, endDate, employeeIds, includeExcused } = req.body;

    const matchStage = {
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (employeeIds && employeeIds.length > 0) {
      matchStage.employee = { $in: employeeIds };
    }

    if (!includeExcused) {
      matchStage.excused = false;
    }

    // Get lateness records from LatenessRecord model
    const latenessData = await LatenessRecord.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'employeeshubs',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeDetails'
        }
      },
      { $unwind: '$employeeDetails' },
      {
        $group: {
          _id: '$employee',
          employee: { $first: '$employeeDetails' },
          totalIncidents: { $sum: 1 },
          excusedIncidents: {
            $sum: { $cond: ['$excused', 1, 0] }
          },
          totalMinutesLate: { $sum: '$minutesLate' },
          records: { 
            $push: { 
              date: '$date',
              minutesLate: '$minutesLate',
              scheduledStart: '$scheduledStart',
              actualStart: '$actualStart',
              reason: '$reason',
              excused: '$excused'
            } 
          }
        }
      },
      {
        $project: {
          employeeId: '$employee.employeeId',
          fullName: { $concat: ['$employee.firstName', ' ', '$employee.lastName'] },
          department: '$employee.department',
          jobTitle: '$employee.jobTitle',
          totalIncidents: 1,
          excusedIncidents: 1,
          unexcusedIncidents: { $subtract: ['$totalIncidents', '$excusedIncidents'] },
          totalMinutesLate: 1,
          averageMinutesLate: { $divide: ['$totalMinutesLate', '$totalIncidents'] },
          latenessRecords: '$records'
        }
      },
      { $sort: { totalIncidents: -1 } }
    ]);

    // Also check TimeEntry records for lateness not yet in LatenessRecord
    const timeEntriesMatchStage = {
      date: { $gte: startDate, $lte: endDate },
      clockIn: { $exists: true, $ne: null }
    };

    if (employeeIds && employeeIds.length > 0) {
      timeEntriesMatchStage.employee = { $in: employeeIds };
    }

    const timeEntries = await TimeEntry.find(timeEntriesMatchStage)
      .populate('employee', 'employeeId firstName lastName department jobTitle')
      .lean();

    const additionalLateness = [];
    for (const entry of timeEntries) {
      if (!entry.employee) continue;

      const dateStr = entry.date;
      const entryDate = new Date(dateStr);
      const nextDay = new Date(entryDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Find shift for this entry
      const shift = await ShiftAssignment.findOne({
        employeeId: entry.employee._id,
        date: { $gte: entryDate, $lt: nextDay }
      }).lean();

      if (shift && shift.startTime) {
        const [shiftHour, shiftMin] = shift.startTime.split(':').map(Number);
        const shiftStartTime = new Date(entryDate);
        shiftStartTime.setHours(shiftHour, shiftMin, 0, 0);

        const clockInTime = new Date(entry.clockIn);
        const minutesLate = (clockInTime - shiftStartTime) / (1000 * 60);

        if (minutesLate > 5) { // Grace period of 5 minutes
          // Check if this lateness is already in LatenessRecord
          const existingRecord = await LatenessRecord.findOne({
            employee: entry.employee._id,
            date: entryDate
          });

          if (!existingRecord) {
            additionalLateness.push({
              employeeId: entry.employee.employeeId,
              fullName: `${entry.employee.firstName} ${entry.employee.lastName}`,
              department: entry.employee.department,
              date: entryDate,
              scheduledStart: shiftStartTime,
              actualStart: clockInTime,
              minutesLate: Math.round(minutesLate),
              excused: false
            });
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        reportType: 'lateness',
        dateRange: { startDate, endDate },
        totalRecords: latenessData.length,
        records: latenessData,
        additionalLatenessFound: additionalLateness
      }
    });
  } catch (error) {
    console.error('Error generating lateness report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate Overtime Report
 * Calculates overtime when employees clock out after their scheduled shift end time
 */
exports.generateOvertimeReport = async (req, res) => {
  try {
    const { startDate, endDate, employeeIds } = req.body;

    const matchStage = {
      date: { $gte: startDate, $lte: endDate },
      clockOut: { $exists: true, $ne: null }
    };

    if (employeeIds && employeeIds.length > 0) {
      matchStage.employee = { $in: employeeIds };
    }

    // Get time entries with their shift information
    const timeEntries = await TimeEntry.find(matchStage)
      .populate('employee', 'employeeId firstName lastName department jobTitle hourlyRate')
      .lean();

    const ShiftAssignment = require('../models/ShiftAssignment');
    const overtimeRecords = [];

    for (const entry of timeEntries) {
      if (!entry.employee) continue;

      // Find the shift assignment for this date
      const shiftDate = new Date(entry.date);
      const nextDay = new Date(shiftDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const shift = await ShiftAssignment.findOne({
        employeeId: entry.employee._id,
        date: { $gte: shiftDate, $lt: nextDay }
      }).lean();

      let overtimeHours = 0;

      if (shift && shift.startTime && shift.endTime && entry.clockIn && entry.clockOut) {
        // Parse shift times
        const [shiftStartHour, shiftStartMin] = shift.startTime.split(':').map(Number);
        const [shiftEndHour, shiftEndMin] = shift.endTime.split(':').map(Number);

        // Create date objects for shift times
        const shiftStart = new Date(shiftDate);
        shiftStart.setHours(shiftStartHour, shiftStartMin, 0, 0);

        const shiftEnd = new Date(shiftDate);
        shiftEnd.setHours(shiftEndHour, shiftEndMin, 0, 0);

        // Handle overnight shifts
        if (shiftEnd <= shiftStart) {
          shiftEnd.setDate(shiftEnd.getDate() + 1);
        }

        const scheduledHours = (shiftEnd - shiftStart) / (1000 * 60 * 60);
        
        // Calculate actual hours worked
        const actualStart = new Date(entry.clockIn);
        const actualEnd = new Date(entry.clockOut);
        let actualHours = (actualEnd - actualStart) / (1000 * 60 * 60);

        // Subtract break time if any
        if (entry.breakDuration) {
          actualHours -= (entry.breakDuration / 60);
        }

        // Overtime is hours worked beyond scheduled hours
        overtimeHours = Math.max(0, actualHours - scheduledHours);
      } else {
        // Fallback: if no shift, assume 8-hour standard day
        const actualStart = new Date(entry.clockIn);
        const actualEnd = new Date(entry.clockOut);
        let actualHours = (actualEnd - actualStart) / (1000 * 60 * 60);

        if (entry.breakDuration) {
          actualHours -= (entry.breakDuration / 60);
        }

        overtimeHours = Math.max(0, actualHours - 8);
      }

      if (overtimeHours > 0) {
        overtimeRecords.push({
          employeeId: entry.employee.employeeId,
          fullName: `${entry.employee.firstName} ${entry.employee.lastName}`,
          department: entry.employee.department,
          jobTitle: entry.employee.jobTitle,
          date: entry.date,
          clockIn: entry.clockIn,
          clockOut: entry.clockOut,
          scheduledHours: shift ? 
            ((new Date(entry.date).setHours(...shift.endTime.split(':').map(Number)) - 
              new Date(entry.date).setHours(...shift.startTime.split(':').map(Number))) / (1000 * 60 * 60)).toFixed(2) : 
            '8.00',
          actualHours: ((new Date(entry.clockOut) - new Date(entry.clockIn)) / (1000 * 60 * 60)).toFixed(2),
          overtimeHours: overtimeHours.toFixed(2),
          hourlyRate: entry.employee.hourlyRate || 0,
          overtimePay: ((entry.employee.hourlyRate || 0) * 1.5 * overtimeHours).toFixed(2)
        });
      }
    }

    // Group by employee
    const groupedData = {};
    overtimeRecords.forEach(record => {
      const key = record.employeeId;
      if (!groupedData[key]) {
        groupedData[key] = {
          employeeId: record.employeeId,
          fullName: record.fullName,
          department: record.department,
          jobTitle: record.jobTitle,
          hourlyRate: record.hourlyRate,
          totalOvertimeHours: 0,
          totalOvertimePay: 0,
          overtimeInstances: 0,
          records: []
        };
      }
      groupedData[key].totalOvertimeHours += parseFloat(record.overtimeHours);
      groupedData[key].totalOvertimePay += parseFloat(record.overtimePay);
      groupedData[key].overtimeInstances++;
      groupedData[key].records.push(record);
    });

    const finalRecords = Object.values(groupedData).map(emp => ({
      ...emp,
      totalOvertimeHours: emp.totalOvertimeHours.toFixed(2),
      totalOvertimePay: emp.totalOvertimePay.toFixed(2)
    }));

    res.json({
      success: true,
      data: {
        reportType: 'overtime',
        dateRange: { startDate, endDate },
        totalRecords: finalRecords.length,
        records: finalRecords.sort((a, b) => parseFloat(b.totalOvertimeHours) - parseFloat(a.totalOvertimeHours))
      }
    });
  } catch (error) {
    console.error('Error generating overtime report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate Rota Report
 * Returns shift schedules from ShiftAssignment (canonical shift model)
 */
exports.generateRotaReport = async (req, res) => {
  try {
    const { startDate, endDate, employeeIds } = req.body;

    const matchStage = {
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (employeeIds && employeeIds.length > 0) {
      matchStage.employeeId = { $in: employeeIds };
    }

    const shiftAssignments = await ShiftAssignment.find(matchStage)
      .populate('employeeId', 'employeeId firstName lastName department')
      .lean();

    const records = shiftAssignments.map(shift => ({
      date: shift.date,
      employeeId: shift.employeeId?.employeeId,
      fullName: shift.employeeId ? `${shift.employeeId.firstName} ${shift.employeeId.lastName}` : 'N/A',
      department: shift.employeeId?.department,
      shiftName: shift.shiftName || 'N/A',
      startTime: shift.startTime,
      endTime: shift.endTime,
      location: shift.location || 'Office',
      status: shift.status || 'Scheduled'
    }));

    res.json({
      success: true,
      data: {
        reportType: 'rota',
        dateRange: { startDate, endDate },
        totalRecords: records.length,
        records: records.sort((a, b) => new Date(a.date) - new Date(b.date))
      }
    });
  } catch (error) {
    console.error('Error generating rota report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate Sickness Report
 */
exports.generateSicknessReport = async (req, res) => {
  try {
    const { startDate, endDate, employeeIds } = req.body;

    const matchStage = {
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
      type: 'sick',
      status: 'approved'
    };

    if (employeeIds && employeeIds.length > 0) {
      matchStage.user = { $in: employeeIds };
    }

    const sicknessData = await LeaveRecord.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'employeeshubs',
          localField: 'user',
          foreignField: '_id',
          as: 'employeeDetails'
        }
      },
      { $unwind: '$employeeDetails' },
      {
        $group: {
          _id: '$user',
          employee: { $first: '$employeeDetails' },
          totalDays: { $sum: '$days' },
          instances: { $sum: 1 },
          records: { $push: '$$ROOT' }
        }
      },
      {
        $addFields: {
          // Bradford Factor = S² × D (where S = number of spells, D = total days)
          bradfordFactor: {
            $multiply: [
              { $multiply: ['$instances', '$instances'] },
              '$totalDays'
            ]
          }
        }
      },
      {
        $project: {
          employeeId: '$employee.employeeId',
          fullName: { $concat: ['$employee.firstName', ' ', '$employee.lastName'] },
          department: '$employee.department',
          jobTitle: '$employee.jobTitle',
          totalDays: 1,
          instances: 1,
          bradfordFactor: 1,
          riskLevel: {
            $cond: {
              if: { $gte: ['$bradfordFactor', 500] },
              then: 'high',
              else: {
                $cond: {
                  if: { $gte: ['$bradfordFactor', 200] },
                  then: 'medium',
                  else: 'low'
                }
              }
            }
          }
        }
      },
      { $sort: { bradfordFactor: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        reportType: 'sickness',
        dateRange: { startDate, endDate },
        totalRecords: sicknessData.length,
        records: sicknessData
      }
    });
  } catch (error) {
    console.error('Error generating sickness report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate Employee Details Report
 */
exports.generateEmployeeDetailsReport = async (req, res) => {
  try {
    const { employeeIds, includeFields } = req.body;

    const matchStage = {};
    if (employeeIds && employeeIds.length > 0) {
      matchStage._id = { $in: employeeIds };
    }

    const employees = await EmployeesHub.find(matchStage)
      .select(includeFields || '')
      .lean();

    res.json({
      success: true,
      data: {
        reportType: 'employee-details',
        totalRecords: employees.length,
        records: employees
      }
    });
    
    console.log(`[Employee Details Report] Generated successfully: ${employees.length} employee records`);
  } catch (error) {
    console.error('[Employee Details Report] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate Payroll Exceptions Report
 */
exports.generatePayrollExceptionsReport = async (req, res) => {
  try {
    const { payPeriodStart, payPeriodEnd, startDate, endDate, resolved, employeeIds } = req.body;

    const effectiveStart = payPeriodStart || startDate;
    const effectiveEnd = payPeriodEnd || endDate;

    if (!effectiveStart || !effectiveEnd) {
      return res.status(400).json({
        success: false,
        error: 'payPeriodStart/payPeriodEnd (or startDate/endDate) are required'
      });
    }

    const matchStage = {
      payPeriodStart: { $lte: new Date(effectiveEnd) },
      payPeriodEnd: { $gte: new Date(effectiveStart) }
    };

    if (employeeIds && employeeIds.length > 0) {
      matchStage.employee = { $in: employeeIds };
    }

    if (resolved !== undefined) {
      matchStage.resolved = resolved;
    }

    const exceptions = await PayrollException.find(matchStage)
      .populate('employee', 'employeeId firstName lastName department jobTitle')
      .populate('resolvedBy', 'firstName lastName')
      .sort({ severity: -1, createdAt: 1 })
      .lean();

    const formatted = exceptions.map(ex => ({
      ...ex,
      employeeName: ex.employee ? `${ex.employee.firstName} ${ex.employee.lastName}` : 'N/A',
      employeeId: ex.employee?.employeeId || 'N/A',
      department: ex.employee?.department || 'N/A',
      resolvedByName: ex.resolvedBy ? `${ex.resolvedBy.firstName} ${ex.resolvedBy.lastName}` : null
    }));

    res.json({
      success: true,
      data: {
        reportType: 'payroll-exceptions',
        payPeriod: { start: effectiveStart, end: effectiveEnd },
        totalRecords: formatted.length,
        records: formatted
      }
    });
  } catch (error) {
    console.error('Error generating payroll exceptions report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate Expenses Report
 */
exports.generateExpensesReport = async (req, res) => {
  try {
    const { startDate, endDate, employeeIds, status } = req.body;

    const matchStage = {
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (employeeIds && employeeIds.length > 0) {
      matchStage.employee = { $in: employeeIds };
    }

    if (status) {
      matchStage.status = status;
    }

    const expenses = await Expense.find(matchStage)
      .populate('employee', 'employeeId firstName lastName department')
      .populate('approvedBy', 'firstName lastName')
      .sort({ date: -1 })
      .lean();

    const formatted = expenses.map(exp => ({
      ...exp,
      employeeName: exp.employee ? `${exp.employee.firstName} ${exp.employee.lastName}` : 'N/A',
      employeeId: exp.employee?.employeeId || 'N/A',
      department: exp.employee?.department || 'N/A',
      approvedByName: exp.approvedBy ? `${exp.approvedBy.firstName} ${exp.approvedBy.lastName}` : null
    }));

    // Calculate totals by status
    const totals = {
      pending: 0,
      approved: 0,
      declined: 0,
      paid: 0
    };

    formatted.forEach(exp => {
      if (totals[exp.status] !== undefined) {
        totals[exp.status] += Number(exp.totalAmount || 0);
      }
    });

    res.json({
      success: true,
      data: {
        reportType: 'expenses',
        dateRange: { startDate, endDate },
        totalRecords: formatted.length,
        totals: totals,
        records: formatted
      }
    });
  } catch (error) {
    console.error('Error generating expenses report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate Length of Service Report
 */
exports.generateLengthOfServiceReport = async (req, res) => {
  try {
    const { employeeIds } = req.body;

    const matchStage = {};
    if (employeeIds && employeeIds.length > 0) {
      matchStage._id = { $in: employeeIds };
    }

    const employees = await EmployeesHub.find(matchStage)
      .select('employeeId firstName lastName department jobTitle startDate')
      .lean();

    const now = new Date();
    const serviceData = employees.map(emp => {
      const startDate = emp.startDate || emp.createdAt;
      const diffMs = now - new Date(startDate);
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const years = Math.floor(diffDays / 365);
      const months = Math.floor((diffDays % 365) / 30);

      return {
        employeeId: emp.employeeId,
        fullName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        jobTitle: emp.jobTitle,
        startDate: startDate,
        totalDays: diffDays,
        years: years,
        months: months,
        serviceYears: (diffDays / 365).toFixed(2)
      };
    });

    serviceData.sort((a, b) => b.totalDays - a.totalDays);

    res.json({
      success: true,
      data: {
        reportType: 'length-of-service',
        totalRecords: serviceData.length,
        records: serviceData
      }
    });
  } catch (error) {
    console.error('Error generating length of service report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate Turnover & Retention Report
 */
exports.generateTurnoverReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get active employees at start
    const startCount = await EmployeesHub.countDocuments({
      createdAt: { $lte: start }
    });

    // Get active employees at end
    const endCount = await EmployeesHub.countDocuments({
      createdAt: { $lte: end }
    });

    // Get terminated employees in period
    const terminated = await ArchiveEmployee.find({
      terminatedDate: { $gte: start, $lte: end }
    }).lean();

    // Get new hires in period
    const newHires = await EmployeesHub.find({
      createdAt: { $gte: start, $lte: end }
    })
    .select('employeeId firstName lastName department jobTitle createdAt')
    .lean();

    // Calculate turnover rate
    const avgHeadcount = (startCount + endCount) / 2;
    const turnoverRate = avgHeadcount > 0 ? ((terminated.length / avgHeadcount) * 100).toFixed(2) : 0;

    // Group by department
    const byDepartment = {};
    terminated.forEach(emp => {
      const dept = emp.department || 'Unknown';
      if (!byDepartment[dept]) {
        byDepartment[dept] = { terminated: 0, employees: [] };
      }
      byDepartment[dept].terminated++;
      byDepartment[dept].employees.push(emp);
    });

    // Create a flattened records array for PDF/CSV export
    const allEmployeeRecords = [
      ...newHires.map(emp => ({
        type: 'New Hire',
        employeeId: emp.employeeId,
        fullName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        jobTitle: emp.jobTitle,
        date: emp.createdAt
      })),
      ...terminated.map(emp => ({
        type: 'Terminated',
        employeeId: emp.employeeId,
        fullName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        jobTitle: emp.jobTitle,
        date: emp.terminatedDate
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: {
        reportType: 'turnover',
        dateRange: { startDate, endDate },
        totalRecords: allEmployeeRecords.length,
        summary: {
          startingHeadcount: startCount,
          endingHeadcount: endCount,
          newHires: newHires.length,
          terminations: terminated.length,
          turnoverRate: `${turnoverRate}%`
        },
        records: allEmployeeRecords, // Flattened for export
        terminatedEmployees: terminated,
        newHires: newHires,
        byDepartment: byDepartment
      }
    });
  } catch (error) {
    console.error('Error generating turnover report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate Working Status Report
 */
exports.generateWorkingStatusReport = async (req, res) => {
  try {
    const employees = await EmployeesHub.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          employees: {
            $push: {
              employeeId: '$employeeId',
              fullName: { $concat: ['$firstName', ' ', '$lastName'] },
              department: '$department',
              jobTitle: '$jobTitle'
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const total = await EmployeesHub.countDocuments();

    const statusData = employees.map(status => ({
      status: status._id || 'Unknown',
      count: status.count,
      percentage: ((status.count / total) * 100).toFixed(2),
      employees: status.employees
    }));

    res.json({
      success: true,
      data: {
        reportType: 'working-status',
        totalEmployees: total,
        totalRecords: statusData.length,
        records: statusData
      }
    });
    
    console.log(`[Working Status Report] Generated successfully: ${statusData.length} status groups, ${total} total employees`);
  } catch (error) {
    console.error('[Working Status Report] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate Sensitive Information Report
 */
exports.generateSensitiveInfoReport = async (req, res) => {
  try {
    const { expiryWithinDays } = req.body;
    const daysAhead = expiryWithinDays || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const expiringSoon = await Certificate.find({
      expiryDate: { $lte: futureDate },
      approvalStatus: 'approved'
    })
    .populate('employee', 'employeeId firstName lastName department')
    .sort({ expiryDate: 1 })
    .lean();

    const formatted = expiringSoon.map(cert => {
      const daysUntilExpiry = Math.ceil((new Date(cert.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
      return {
        ...cert,
        employeeName: cert.employee ? `${cert.employee.firstName} ${cert.employee.lastName}` : 'N/A',
        employeeId: cert.employee?.employeeId || 'N/A',
        department: cert.employee?.department || 'N/A',
        daysUntilExpiry: daysUntilExpiry,
        status: daysUntilExpiry < 0 ? 'expired' : daysUntilExpiry <= 7 ? 'urgent' : 'warning'
      };
    });

    res.json({
      success: true,
      data: {
        reportType: 'sensitive-info',
        expiryThreshold: `${daysAhead} days`,
        totalRecords: formatted.length,
        records: formatted
      }
    });
  } catch (error) {
    console.error('Error generating sensitive info report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate Furloughed Employees Report
 */
exports.generateFurloughedReport = async (req, res) => {
  try {
    const furloughed = await EmployeesHub.find({
      furloughStatus: 'furloughed'
    })
    .select('employeeId firstName lastName department jobTitle furloughStartDate furloughEndDate')
    .lean();

    const formatted = furloughed.map(emp => ({
      employeeId: emp.employeeId,
      fullName: `${emp.firstName} ${emp.lastName}`,
      department: emp.department,
      jobTitle: emp.jobTitle,
      furloughStartDate: emp.furloughStartDate,
      furloughEndDate: emp.furloughEndDate,
      daysOnFurlough: emp.furloughStartDate 
        ? Math.ceil((new Date() - new Date(emp.furloughStartDate)) / (1000 * 60 * 60 * 24))
        : null
    }));

    res.json({
      success: true,
      data: {
        reportType: 'furloughed',
        totalRecords: formatted.length,
        records: formatted
      }
    });
  } catch (error) {
    console.error('Error generating furloughed report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Export Report as CSV
 */
exports.exportReportCSV = async (req, res) => {
  try {
    const { reportData } = req.body;

    console.log('[CSV Export] Request received');
    console.log('[CSV Export] reportData exists:', !!reportData);
    
    if (!reportData) {
      console.error('[CSV Export] ERROR: No reportData in request body');
      return res.status(400).json({ 
        success: false, 
        error: 'Report data is missing from request' 
      });
    }

    if (!reportData.records || !Array.isArray(reportData.records)) {
      console.error('[CSV Export] ERROR: Records missing or not an array');
      return res.status(400).json({ 
        success: false, 
        error: 'Report data must contain a records array' 
      });
    }

    // BLOCKING FIX #2: Enforce records.length as single source of truth
    const actualRecordCount = reportData.records.length;
    const declaredRecordCount = reportData.totalRecords;
    
    if (declaredRecordCount !== undefined && declaredRecordCount !== actualRecordCount) {
      console.error('[CSV Export] ⚠️  CRITICAL: totalRecords MISMATCH DETECTED');
      console.error('[CSV Export] Declared totalRecords:', declaredRecordCount);
      console.error('[CSV Export] Actual records.length:', actualRecordCount);
      console.error('[CSV Export] Overriding totalRecords with actual count to prevent data integrity issue');
      
      // Override with actual count
      reportData.totalRecords = actualRecordCount;
    }
    
    console.log('[CSV Export] Generating CSV for', reportData.reportType, 'with', actualRecordCount, 'records');

    // Generate CSV
    const csv = exportReportToCSV(reportData);

    // Set headers for file download
    const filename = `${reportData.reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    console.log('[CSV Export] CSV generated successfully, sending to client');
    res.send(csv);
  } catch (error) {
    console.error('[CSV Export] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Export Report as PDF
 */
exports.exportReportPDF = async (req, res) => {
  try {
    const { reportData } = req.body;

    // Comprehensive validation with detailed logging
    console.log('[PDF Export] === REQUEST RECEIVED ===');
    console.log('[PDF Export] Request body keys:', Object.keys(req.body));
    console.log('[PDF Export] reportData exists:', !!reportData);
    
    if (!reportData) {
      console.error('[PDF Export] ERROR: No reportData in request body');
      return res.status(400).json({ 
        success: false, 
        error: 'Report data is missing from request' 
      });
    }

    console.log('[PDF Export] reportData.reportType:', reportData.reportType);
    console.log('[PDF Export] reportData.records type:', Array.isArray(reportData.records) ? 'array' : typeof reportData.records);
    console.log('[PDF Export] reportData.records length:', reportData.records?.length);
    
    // BLOCKING FIX #2: Enforce records.length as single source of truth
    const actualRecordCount = reportData.records.length;
    const declaredRecordCount = reportData.totalRecords;
    
    if (declaredRecordCount !== undefined && declaredRecordCount !== actualRecordCount) {
      console.error('[PDF Export] ⚠️  CRITICAL: totalRecords MISMATCH DETECTED');
      console.error('[PDF Export] Declared totalRecords:', declaredRecordCount);
      console.error('[PDF Export] Actual records.length:', actualRecordCount);
      console.error('[PDF Export] Overriding totalRecords with actual count to prevent data integrity issue');
      
      // Override with actual count
      reportData.totalRecords = actualRecordCount;
    } else {
      console.log('[PDF Export] totalRecords validated:', actualRecordCount);
    }
    
    if (!reportData.reportType) {
      console.error('[PDF Export] ERROR: Missing reportType');
      return res.status(400).json({ 
        success: false, 
        error: 'Report type is missing' 
      });
    }

    if (!reportData.records || !Array.isArray(reportData.records)) {
      console.error('[PDF Export] ERROR: Records missing or not an array');
      console.error('[PDF Export] reportData structure:', JSON.stringify(reportData, null, 2));
      return res.status(400).json({ 
        success: false, 
        error: 'Report data must contain a records array' 
      });
    }

    if (reportData.records.length === 0) {
      console.warn('[PDF Export] WARNING: Records array is empty');
      // Continue anyway - PDF will show "No records" message
    } else {
      console.log('[PDF Export] First record sample:', JSON.stringify(reportData.records[0], null, 2));
    }

    console.log('[PDF Export] Calling PDF generator...');

    // Generate PDF buffer
    const pdfBuffer = await exportReportToPDF(reportData);

    console.log('[PDF Export] PDF generated successfully, buffer size:', pdfBuffer.length, 'bytes');

    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF generation produced empty buffer');
    }

    // Set headers for file download
    const filename = `${reportData.reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    console.log('[PDF Export] Sending PDF to client...');
    res.send(pdfBuffer);
    console.log('[PDF Export] === EXPORT COMPLETE ===');
    
  } catch (error) {
    console.error('[PDF Export] === CRITICAL ERROR ===');
    console.error('[PDF Export] Error message:', error.message);
    console.error('[PDF Export] Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
};
