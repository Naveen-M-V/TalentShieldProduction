const TimeEntry = require('../models/TimeEntry');
const ShiftAssignment = require('../models/ShiftAssignment');
const LeaveRecord = require('../models/LeaveRecord');
const EmployeeHub = require('../models/EmployeesHub');
const Notification = require('../models/Notification');

/**
 * ABSENCE DETECTION SERVICE
 * Automatically detects and records absences, lateness, and overtime
 */

/**
 * Check for absences and lateness for a specific date
 * Should be run as a cron job (e.g., 3 hours after typical shift start times)
 */
async function detectAbsencesForDate(date) {
  try {
    const dateStr = new Date(date).toISOString().split('T')[0];
    console.log(`🔍 Checking absences for ${dateStr}`);

    // Get all scheduled shifts for the date
    const shifts = await ShiftAssignment.find({
      date: new Date(date),
      status: { $in: ['Scheduled', 'Pending'] }
    }).populate('employeeId', 'firstName lastName email');

    console.log(`Found ${shifts.length} scheduled shifts`);

    for (const shift of shifts) {
      // Check if employee has approved leave
      const hasLeave = await LeaveRecord.findOne({
        user: shift.employeeId._id,
        status: 'approved',
        startDate: { $lte: new Date(date) },
        endDate: { $gte: new Date(date) }
      });

      if (hasLeave) {
        console.log(`✓ ${shift.employeeId.firstName} ${shift.employeeId.lastName} has approved leave`);
        continue;
      }

      // Check if employee clocked in
      const timeEntry = await TimeEntry.findOne({
        employee: shift.employeeId._id,
        date: dateStr
      });

      if (!timeEntry || !timeEntry.clockIn) {
        // Check if 3 hours have passed since shift start
        const shiftStartTime = parseTime(shift.startTime);
        const threeHoursLater = new Date(date);
        threeHoursLater.setHours(shiftStartTime.hours + 3, shiftStartTime.minutes, 0, 0);

        if (new Date() >= threeHoursLater) {
          // Mark as absent
          await markAsAbsent(shift, date);
          console.log(`❌ ${shift.employeeId.firstName} ${shift.employeeId.lastName} marked as absent`);
        }
      } else {
        // Check for lateness
        const shiftStartTime = parseTime(shift.startTime);
        const shiftStart = new Date(date);
        shiftStart.setHours(shiftStartTime.hours, shiftStartTime.minutes, 0, 0);

        const clockInTime = new Date(timeEntry.clockIn);
        const lateMinutes = Math.floor((clockInTime - shiftStart) / (1000 * 60));

        if (lateMinutes > 0 && lateMinutes <= 180) {
          // Clocked in within 3 hours but late
          await recordLateness(shift, lateMinutes, timeEntry);
          console.log(`⏰ ${shift.employeeId.firstName} ${shift.employeeId.lastName} was ${lateMinutes} minutes late`);
        }
      }
    }

    console.log(`✅ Absence detection completed for ${dateStr}`);
  } catch (error) {
    console.error('Absence detection error:', error);
  }
}

/**
 * Check for overtime (employees working beyond shift end time)
 */
async function detectOvertimeForDate(date) {
  try {
    const dateStr = new Date(date).toISOString().split('T')[0];
    console.log(`🔍 Checking overtime for ${dateStr}`);

    const timeEntries = await TimeEntry.find({
      date: dateStr,
      clockIn: { $ne: null },
      clockOut: { $ne: null }
    }).populate('employee', 'firstName lastName email');

    for (const entry of timeEntries) {
      // Find corresponding shift
      const shift = await ShiftAssignment.findOne({
        employeeId: entry.employee._id,
        date: new Date(date)
      });

      if (shift) {
        const shiftEndTime = parseTime(shift.endTime);
        const shiftEnd = new Date(date);
        shiftEnd.setHours(shiftEndTime.hours, shiftEndTime.minutes, 0, 0);

        const clockOutTime = new Date(entry.clockOut);
        const overtimeMinutes = Math.floor((clockOutTime - shiftEnd) / (1000 * 60));

        if (overtimeMinutes > 15) { // Grace period of 15 minutes
          await recordOvertime(shift, entry, overtimeMinutes);
          console.log(`⏱️ ${entry.employee.firstName} ${entry.employee.lastName} worked ${overtimeMinutes} minutes overtime`);
        }
      }
    }

    console.log(`✅ Overtime detection completed for ${dateStr}`);
  } catch (error) {
    console.error('Overtime detection error:', error);
  }
}

/**
 * Mark employee as absent for a shift
 */
async function markAsAbsent(shift, date) {
  try {
    const dateObj = new Date(date);
    const days = 1; // One day absence

    // Create absence record
    await LeaveRecord.create({
      user: shift.employeeId._id,
      type: 'absent',
      status: 'approved',
      startDate: dateObj,
      endDate: dateObj,
      days,
      reason: 'Auto-detected: Did not clock in within 3 hours of shift start',
      notes: `Shift: ${shift.startTime} - ${shift.endTime}`,
      createdBy: shift.employeeId._id
    });

    // Update shift status
    shift.status = 'Missed';
    shift.notes = `${shift.notes || ''}\nMarked as absent - did not clock in`.trim();
    await shift.save();

    // Notify admin
    const User = require('../models/User');
    const admins = await User.find({
      role: { $in: ['admin', 'super-admin'] },
      isActive: true
    }).select('_id');

    const notifications = admins.map(admin => ({
      recipientType: 'profile',
      profileRef: admin._id,
      type: 'missed_shift',
      title: 'Missed Shift Detected',
      message: `${shift.employeeId.firstName} ${shift.employeeId.lastName} was absent on ${dateObj.toLocaleDateString()} (Shift: ${shift.startTime} - ${shift.endTime})`,
      priority: 'high',
      isRead: false
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error('Mark as absent error:', error);
  }
}

/**
 * Record lateness
 */
async function recordLateness(shift, lateMinutes, timeEntry) {
  try {
    // Add lateness note to time entry
    const latenessNote = `Late by ${lateMinutes} minutes (Shift start: ${shift.startTime})`;
    timeEntry.notes = `${timeEntry.notes || ''}\n${latenessNote}`.trim();
    await timeEntry.save();

    // Update shift assignment
    shift.notes = `${shift.notes || ''}\n${latenessNote}`.trim();
    await shift.save();

    // Notify admin for significant lateness (>30 minutes)
    if (lateMinutes > 30) {
      const User = require('../models/User');
      const admins = await User.find({
        role: { $in: ['admin', 'super-admin'] },
        isActive: true
      }).select('_id');

      const notifications = admins.map(admin => ({
        recipientType: 'profile',
        profileRef: admin._id,
        type: 'lateness',
        title: 'Significant Lateness Detected',
        message: `${shift.employeeId.firstName} ${shift.employeeId.lastName} was ${lateMinutes} minutes late on ${new Date(shift.date).toLocaleDateString()}`,
        priority: 'medium',
        isRead: false
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }
  } catch (error) {
    console.error('Record lateness error:', error);
  }
}

/**
 * Record overtime
 */
async function recordOvertime(shift, timeEntry, overtimeMinutes) {
  try {
    const overtimeNote = `Overtime: ${overtimeMinutes} minutes (Shift end: ${shift.endTime})`;
    
    // Add overtime note to time entry
    timeEntry.notes = `${timeEntry.notes || ''}\n${overtimeNote}`.trim();
    await timeEntry.save();

    // Update shift assignment
    shift.notes = `${shift.notes || ''}\n${overtimeNote}`.trim();
    await shift.save();

    console.log(`Recorded ${overtimeMinutes} minutes overtime for employee ${shift.employeeId}`);
  } catch (error) {
    console.error('Record overtime error:', error);
  }
}

/**
 * Parse time string (HH:MM) to hours and minutes
 */
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Run daily absence detection (should be called by cron job)
 */
async function runDailyAbsenceDetection() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  await detectAbsencesForDate(yesterday);
  await detectOvertimeForDate(yesterday);
}

/**
 * Check if employee can be scheduled for a shift on a given date
 * Returns { canSchedule: boolean, reason: string }
 */
async function canScheduleEmployeeForShift(employeeId, date) {
  try {
    // Check for approved leave
    const hasLeave = await LeaveRecord.findOne({
      user: employeeId,
      status: 'approved',
      startDate: { $lte: new Date(date) },
      endDate: { $gte: new Date(date) }
    });

    if (hasLeave) {
      return {
        canSchedule: false,
        reason: `Employee has approved ${hasLeave.type} leave on this date`
      };
    }

    // Check for existing shift
    const existingShift = await ShiftAssignment.findOne({
      employeeId,
      date: new Date(date),
      status: { $in: ['Scheduled', 'Pending', 'In Progress'] }
    });

    if (existingShift) {
      return {
        canSchedule: false,
        reason: 'Employee already has a shift scheduled on this date'
      };
    }

    return { canSchedule: true, reason: null };
  } catch (error) {
    console.error('Can schedule check error:', error);
    return { canSchedule: false, reason: 'Error checking availability' };
  }
}

module.exports = {
  detectAbsencesForDate,
  detectOvertimeForDate,
  runDailyAbsenceDetection,
  canScheduleEmployeeForShift,
  markAsAbsent,
  recordLateness,
  recordOvertime
};
