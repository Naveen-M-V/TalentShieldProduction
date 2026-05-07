const ShiftAssignment = require('../models/ShiftAssignment');
const User = require('../models/User');
const EmployeesHub = require('../models/EmployeesHub');
const LeaveRequest = require('../models/LeaveRequest');
const TimeEntry = require('../models/TimeEntry');
const mongoose = require('mongoose');
const { getUKStartOfDay, getUKEndOfDay } = require('../utils/timeFormatter');
const hierarchyHelper = require('../utils/hierarchyHelper');
const { MANAGER_ROLES, MANAGER_SCOPE_ROLES, ADMIN_SCOPE_ROLES, ADMIN_ROLES } = require('../utils/roles');
const { resolveActorId } = require('../utils/identityHelper');

const resolveActorEmployee = async (req) => {
  const actorId = resolveActorId(req);

  if (actorId && mongoose.Types.ObjectId.isValid(String(actorId))) {
    const byId = await EmployeesHub.findById(actorId).select('_id role email managerId');
    if (byId) return byId;

    const byUserId = await EmployeesHub.findOne({ userId: actorId }).select('_id role email managerId');
    if (byUserId) return byUserId;
  }

  if (req.user?.email) {
    return EmployeesHub.findOne({
      email: String(req.user.email).trim().toLowerCase()
    }).select('_id role email managerId');
  }

  return null;
};

const getManagerScopedEmployeeIds = async (req) => {
  const role = req.user?.role;
  if (!MANAGER_SCOPE_ROLES.includes(role)) return null;

  // Admin-level users should not be constrained to hierarchy subordinates
  // for rota visibility. They need full visibility across all employees.
  if (ADMIN_SCOPE_ROLES.includes(role)) {
    return null;
  }

  const actorEmployee = await resolveActorEmployee(req);
  if (!actorEmployee?._id) return [];

  const includeIndirect = role === 'senior-manager';
  const subordinates = await hierarchyHelper.getSubordinates(actorEmployee._id, includeIndirect);
  return subordinates.map((member) => String(member._id));
};

const applyManagerScopeToEmployeeQuery = (query, scopedEmployeeIds, requestedEmployeeId) => {
  if (scopedEmployeeIds === null) {
    if (requestedEmployeeId) query.employeeId = requestedEmployeeId;
    return;
  }

  if (!scopedEmployeeIds.length) {
    query.employeeId = { $in: [] };
    return;
  }

  if (requestedEmployeeId) {
    if (scopedEmployeeIds.includes(String(requestedEmployeeId))) {
      query.employeeId = requestedEmployeeId;
    } else {
      query.employeeId = { $in: [] };
    }
    return;
  }

  query.employeeId = { $in: scopedEmployeeIds };
};

const resolveActorRoleById = async (actorId) => {
  if (!actorId || !mongoose.Types.ObjectId.isValid(String(actorId))) return null;

  const user = await User.findById(actorId).select('role').lean();
  if (user?.role) return user.role;

  const employee = await EmployeesHub.findById(actorId).select('role').lean();
  if (employee?.role) return employee.role;

  return null;
};

const resolveAssignableUserId = async (req) => {
  const userIdCandidates = [req?.user?._id, req?.user?.id, req?.userId].filter(Boolean);
  for (const candidate of userIdCandidates) {
    const candidateStr = String(candidate);
    if (!mongoose.Types.ObjectId.isValid(candidateStr)) continue;
    const user = await User.findById(candidateStr).select('_id').lean();
    if (user?._id) return String(user._id);
  }

  if (req?.user?.email) {
    const byEmail = await User.findOne({ email: String(req.user.email).trim().toLowerCase() }).select('_id').lean();
    if (byEmail?._id) return String(byEmail._id);
  }

  const actorId = resolveActorId(req);
  if (actorId && mongoose.Types.ObjectId.isValid(String(actorId))) {
    const asUser = await User.findById(actorId).select('_id').lean();
    if (asUser?._id) return String(asUser._id);
  }

  return null;
};

const resolveActorDisplayName = async (req, resolvedUserId = null) => {
  const fullFromReq = `${req?.user?.firstName || ''} ${req?.user?.lastName || ''}`.trim();
  if (fullFromReq) return fullFromReq;
  if (req?.user?.name && String(req.user.name).trim()) return String(req.user.name).trim();

  if (resolvedUserId && mongoose.Types.ObjectId.isValid(String(resolvedUserId))) {
    const byUserId = await User.findById(resolvedUserId).select('firstName lastName email').lean();
    if (byUserId) {
      const full = `${byUserId.firstName || ''} ${byUserId.lastName || ''}`.trim();
      if (full) return full;
      if (byUserId.email) return byUserId.email;
    }
  }

  if (req?.user?.email) {
    const email = String(req.user.email).trim().toLowerCase();
    const [byUserEmail, byEmployeeEmail] = await Promise.all([
      User.findOne({ email }).select('firstName lastName email').lean(),
      EmployeesHub.findOne({ email }).select('firstName lastName email').lean()
    ]);

    const source = byUserEmail || byEmployeeEmail;
    if (source) {
      const full = `${source.firstName || ''} ${source.lastName || ''}`.trim();
      if (full) return full;
      if (source.email) return source.email;
    }

    return email;
  }

  return '';
};

const hydrateAssignedByForAssignments = async (assignments = []) => {
  const ids = Array.from(new Set(
    assignments
      .map((a) => {
        const raw = a?.assignedBy;
        if (!raw) return null;
        if (typeof raw === 'object') return raw._id || raw.id || raw || null;
        return raw;
      })
      .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)))
      .map((id) => String(id))
  ));

  if (!ids.length) return assignments;

  const [users, employees] = await Promise.all([
    User.find({ _id: { $in: ids } }).select('_id firstName lastName email').lean(),
    EmployeesHub.find({ _id: { $in: ids } }).select('_id firstName lastName email').lean()
  ]);

  const byId = new Map();
  for (const u of users || []) {
    byId.set(String(u._id), { _id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email || '' });
  }
  for (const e of employees || []) {
    if (!byId.has(String(e._id))) {
      byId.set(String(e._id), { _id: e._id, firstName: e.firstName, lastName: e.lastName, email: e.email || '' });
    }
  }

  for (const a of assignments) {
    const raw = a?.assignedBy;
    const id = raw && typeof raw === 'object' ? (raw._id || raw.id || raw) : raw;
    if (!id) {
      a.assignedBy = null;
      continue;
    }
    a.assignedBy = byId.get(String(id)) || null;
  }

  return assignments;
};

const nextDay = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
};

const buildGroupedShiftAssignments = (assignments) => {
  const groups = new Map();

  const getAssignedByName = (assignedBy) => {
    if (!assignedBy) return '';
    if (typeof assignedBy === 'string') return assignedBy;
    const first = (assignedBy.firstName || '').trim();
    const last = (assignedBy.lastName || '').trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
    return (assignedBy.email || '').trim();
  };

  const getLegacyGroupKey = (a) => {
    const createdAt = a.createdAt ? new Date(a.createdAt) : null;
    const createdBucket = createdAt && !Number.isNaN(createdAt.valueOf())
      ? createdAt.toISOString().slice(0, 16)
      : '';

    const assignedByRaw = a.assignedBy;
    const assignedById = assignedByRaw && typeof assignedByRaw === 'object'
      ? (assignedByRaw._id || assignedByRaw.id || assignedByRaw)
      : assignedByRaw;

    return `legacy:${a.shiftName || ''}|${a.startTime || ''}|${a.endTime || ''}|${a.location || ''}|${a.workType || ''}|${(assignedById || '').toString()}|${createdBucket}`;
  };

  for (const a of assignments) {
    const key = a.groupId ? `group:${a.groupId}` : getLegacyGroupKey(a);

    if (!groups.has(key)) {
      const derivedStart = a.startDate || a.date;
      const derivedEnd = a.endDate || a.date;
      groups.set(key, {
        _id: a.groupId || a._id,
        groupId: a.groupId || null,
        shiftName: a.shiftName || '',
        assignmentTargetType: a.assignmentTargetType || (a.teamName ? 'team' : 'employee'),
        teamId: a.teamId || null,
        teamName: a.teamName || '',
        startDate: derivedStart,
        endDate: derivedEnd,
        startTime: a.startTime,
        endTime: a.endTime,
        location: a.location,
        workType: a.workType,
        assignedBy: a.assignedBy, // Include who assigned the shift
        assignedByName: a.assignedByName || getAssignedByName(a.assignedBy),
        assignedEmployees: [],
        assignmentIds: []
      });
    }

    const g = groups.get(key);
    if (!g.assignedBy && a.assignedBy) {
      g.assignedBy = a.assignedBy;
    }
    if (!g.assignedByName) {
      const derivedName = a.assignedByName || getAssignedByName(a.assignedBy);
      if (derivedName) g.assignedByName = derivedName;
    }
    if (!g.teamName && a.teamName) {
      g.teamName = a.teamName;
      g.teamId = a.teamId || g.teamId || null;
      g.assignmentTargetType = 'team';
    }
    g.assignmentIds.push(a._id);

    const employeeId = a.employeeId && typeof a.employeeId === 'object'
      ? (a.employeeId._id || a.employeeId.id)
      : a.employeeId;

    if (employeeId) {
      const exists = g.assignedEmployees.some(e => (e.employeeId || '').toString() === employeeId.toString());
      if (!exists) {
        const employeeName = a.employeeId && typeof a.employeeId === 'object' && a.employeeId.firstName
          ? `${a.employeeId.firstName} ${a.employeeId.lastName}`
          : '';
        const email = a.employeeId && typeof a.employeeId === 'object'
          ? (a.employeeId.email || '')
          : '';

        g.assignedEmployees.push({
          employeeId,
          employeeName,
          email,
          startTime: a.startTime,
          endTime: a.endTime
        });
      }
    }

    // Expand derived date range based on actual per-day rows
    const d = a.date;
    if (d) {
      const ds = new Date(d);
      if (!g.startDate || ds < new Date(g.startDate)) g.startDate = ds;
      if (!g.endDate || ds > new Date(g.endDate)) g.endDate = ds;
    }
  }

  return Array.from(groups.values()).sort((x, y) => new Date(x.startDate) - new Date(y.startDate));
};

exports.getGroupedShiftAssignments = async (req, res) => {
  try {
    const { tab = 'all', startDate, endDate, employeeId, location, workType, status } = req.query;
    const scopedEmployeeIds = await getManagerScopedEmployeeIds(req);

    const query = {};
    applyManagerScopeToEmployeeQuery(query, scopedEmployeeIds, employeeId);
    if (location) query.location = location;
    if (workType) query.workType = workType;
    if (status) query.status = status;

    const todayStartUK = getUKStartOfDay(new Date());
    const todayEndUK = getUKEndOfDay(new Date());

    if (tab === 'active') {
      query.date = { $gte: todayStartUK, $lte: todayEndUK };
    } else if (tab === 'old') {
      const dateQuery = { $lt: todayStartUK };
      const rangeStart = startDate ? getUKStartOfDay(new Date(startDate)) : null;
      const rangeEnd = endDate ? getUKEndOfDay(new Date(endDate)) : null;

      if (rangeStart && !Number.isNaN(rangeStart.valueOf())) {
        dateQuery.$gte = rangeStart;
      }
      if (rangeEnd && !Number.isNaN(rangeEnd.valueOf())) {
        const maxEnd = rangeEnd < todayStartUK ? rangeEnd : new Date(todayStartUK.getTime() - 1);
        dateQuery.$lte = maxEnd;
      }

      query.date = dateQuery;
    } else {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (!isNaN(start.valueOf()) && !isNaN(end.valueOf())) {
          query.date = { $gte: start, $lte: end };
        }
      }
    }

    let assignments = await ShiftAssignment.find(query)
      .populate({
        path: 'employeeId',
        select: '_id firstName lastName email role',
        options: { strictPopulate: false }
      })
      .sort({ date: 1, startTime: 1 })
      .lean();

    assignments = await hydrateAssignedByForAssignments(assignments);

    const grouped = buildGroupedShiftAssignments(assignments);

    res.status(200).json({
      success: true,
      count: grouped.length,
      data: grouped
    });
  } catch (error) {
    console.error('Get grouped shift assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grouped shift assignments',
      error: error.message
    });
  }
};

exports.deleteShiftAssignmentGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const scopedEmployeeIds = await getManagerScopedEmployeeIds(req);
    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'groupId is required'
      });
    }

    if (scopedEmployeeIds !== null) {
      const shiftsInGroup = await ShiftAssignment.find({ groupId }).select('employeeId assignedBy').lean();
      if (!shiftsInGroup.length) {
        return res.status(404).json({
          success: false,
          message: 'Shift group not found'
        });
      }

      const outOfScopeShift = shiftsInGroup.find(
        (s) => !scopedEmployeeIds.includes(String(s.employeeId))
      );
      if (outOfScopeShift) {
        return res.status(403).json({
          success: false,
          message: 'Managers can only delete shifts for their own team members'
        });
      }

      const assignedByIds = Array.from(
        new Set(shiftsInGroup.map((s) => String(s.assignedBy || '')).filter(Boolean))
      );

      for (const assignedById of assignedByIds) {
        const assignedByRole = await resolveActorRoleById(assignedById);
        if (ADMIN_SCOPE_ROLES.includes(assignedByRole)) {
          return res.status(403).json({
            success: false,
            message: 'Managers cannot delete shifts assigned by admin'
          });
        }
      }
    }

    const result = await ShiftAssignment.deleteMany({ groupId });
    if (!result.deletedCount) {
      return res.status(404).json({
        success: false,
        message: 'Shift group not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Shift group deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Delete shift group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete shift group',
      error: error.message
    });
  }
};

const isWeekend = (date) => {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
};

// Convert HH:MM string to minutes since midnight
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Check if two HH:MM time ranges overlap — correctly handles overnight shifts
const timesOverlap = (s1, e1, s2, e2) => {
  let start1 = timeToMinutes(s1), end1 = timeToMinutes(e1);
  let start2 = timeToMinutes(s2), end2 = timeToMinutes(e2);
  // If end <= start, the shift crosses midnight — add 24h to end
  if (end1 <= start1) end1 += 1440;
  if (end2 <= start2) end2 += 1440;
  return start1 < end2 && start2 < end1;
};

// Return all weekdays (Mon-Fri) between two dates as YYYY-MM-DD strings
const getWeekdaysInRange = (startDate, endDate) => {
  const dates = [];
  const current = new Date(startDate);
  current.setHours(12, 0, 0, 0); // Use noon to avoid DST edge cases
  const end = new Date(endDate);
  end.setHours(12, 0, 0, 0);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

exports.detectShiftConflicts = async (employeeId, startTime, endTime, date, excludeShiftId = null) => {
  try {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const query = {
      employeeId,
      date: { $gte: dateStart, $lte: dateEnd },
      status: { $nin: ['Cancelled'] }
    };
    if (excludeShiftId) query._id = { $ne: excludeShiftId };

    const existingShifts = await ShiftAssignment.find(query);
    return existingShifts.filter(shift =>
      timesOverlap(startTime, endTime, shift.startTime, shift.endTime)
    );
  } catch (error) {
    console.error('Detect conflicts error:', error);
    throw error;
  }
};

exports.getAllRotas = async (req, res) => {
  try {
    const { employeeId, location, workType, status } = req.query;
    const scopedEmployeeIds = await getManagerScopedEmployeeIds(req);

    const query = {};
    applyManagerScopeToEmployeeQuery(query, scopedEmployeeIds, employeeId);
    if (location) query.location = location;
    if (workType) query.workType = workType;
    if (status) query.status = status;

    const shifts = await ShiftAssignment.find(query)
      .populate({
        path: 'employeeId',
        select: '_id firstName lastName email role',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'assignedBy',
        select: '_id firstName lastName',
        options: { strictPopulate: false }
      })
      .sort({ date: -1, startTime: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: shifts.length,
      data: shifts
    });
  } catch (error) {
    console.error('Get all rotas error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all rotas',
      error: error.message
    });
  }
};

exports.getActiveRotas = async (req, res) => {
  try {
    // Get TODAY's date boundaries in UK timezone
    const todayStartUK = getUKStartOfDay(new Date());
    const todayEndUK = getUKEndOfDay(new Date());

    const { employeeId, location, workType, status } = req.query;
    const scopedEmployeeIds = await getManagerScopedEmployeeIds(req);

    // Active rotas = shifts occurring TODAY only
    const dateQuery = { 
      $gte: todayStartUK,
      $lte: todayEndUK
    };

    const query = { date: dateQuery };
    applyManagerScopeToEmployeeQuery(query, scopedEmployeeIds, employeeId);
    if (location) query.location = location;
    if (workType) query.workType = workType;
    if (status) query.status = status;

    const shifts = await ShiftAssignment.find(query)
      .populate({
        path: 'employeeId',
        select: '_id firstName lastName email role',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'assignedBy',
        select: '_id firstName lastName',
        options: { strictPopulate: false }
      })
      .sort({ date: 1, startTime: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: shifts.length,
      data: shifts
    });
  } catch (error) {
    console.error('Get active rotas error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active rotas',
      error: error.message
    });
  }
};

exports.getOldRotas = async (req, res) => {
  try {
    const todayStartUK = getUKStartOfDay(new Date());

    const { startDate, endDate, employeeId, location, workType, status } = req.query;
    const scopedEmployeeIds = await getManagerScopedEmployeeIds(req);
    
    const rangeStart = startDate ? getUKStartOfDay(new Date(startDate)) : null;
    const rangeEnd = endDate ? getUKEndOfDay(new Date(endDate)) : null;

    const dateQuery = { $lt: todayStartUK };
    if (rangeStart && !Number.isNaN(rangeStart.valueOf())) {
      dateQuery.$gte = rangeStart;
    }
    if (rangeEnd && !Number.isNaN(rangeEnd.valueOf())) {
      const maxEnd = rangeEnd < todayStartUK ? rangeEnd : new Date(todayStartUK.getTime() - 1);
      dateQuery.$lte = maxEnd;
    }

    const query = { date: dateQuery };
    applyManagerScopeToEmployeeQuery(query, scopedEmployeeIds, employeeId);
    if (location) query.location = location;
    if (workType) query.workType = workType;
    if (status) query.status = status;

    const shifts = await ShiftAssignment.find(query)
      .populate({
        path: 'employeeId',
        select: '_id firstName lastName email role',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'assignedBy',
        select: '_id firstName lastName',
        options: { strictPopulate: false }
      })
      .sort({ date: -1, startTime: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: shifts.length,
      data: shifts
    });
  } catch (error) {
    console.error('Get old rotas error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch old rotas',
      error: error.message
    });
  }
};

exports.assignShiftToEmployee = async (req, res) => {
  try {
    console.log('=== Assign Shift Request ===');
    console.log('User from session:', req.user);
    console.log('Session ID:', req.session?.id);
    
    const { employeeId, shiftName, date, startTime, endTime, location, workType, breakDuration, notes, groupId, startDate, endDate } = req.body;

    if (!employeeId || !date || !startTime || !endTime || !location || !workType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: employeeId, date, startTime, endTime, location, workType'
      });
    }

    const assignedByUserId = await resolveAssignableUserId(req);
    const assignedByName = await resolveActorDisplayName(req, assignedByUserId);
    
    if (!req.user || !assignedByUserId) {
      console.error('Authentication failed - req.user:', req.user);
      console.error('Available user fields:', Object.keys(req.user || {}));
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User not found in session.',
        debug: {
          hasUser: !!req.user,
          hasSession: !!req.session,
          sessionUser: req.session?.user,
          userKeys: Object.keys(req.user || {})
        }
      });
    }


    // Check if employee exists in EmployeesHub collection
    console.log('Looking up employee with ID:', employeeId);
    const employee = await EmployeesHub.findById(employeeId);
    if (!employee) {
      console.error('Employee not found in EmployeesHub:', employeeId);
      return res.status(404).json({
        success: false,
        message: 'Employee is inactive or not found',
        debug: {
          searchedId: employeeId,
          checkedEmployeesHub: true
        }
      });
    }
    // Validate employee status
    if (employee.status !== 'Active' || employee.isActive !== true || employee.deleted === true) {
      console.error('Employee is inactive or deleted:', {
        employeeId,
        status: employee.status,
        isActive: employee.isActive,
        deleted: employee.deleted
      });
      return res.status(400).json({
        success: false,
        message: 'Employee is inactive or not found',
        debug: {
          employeeId,
          status: employee.status,
          isActive: employee.isActive,
          deleted: employee.deleted
        }
      });
    }
    // PATCH: Restrict manager to only assign shifts to their own employees
    if (req.user && req.user.role === 'manager') {
      const managerId = resolveActorId(req);
      if (!employee.managerId || employee.managerId.toString() !== managerId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Managers can only assign shifts to their own employees.'
        });
      }
    }
    console.log('✅ Employee validated:', {
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      status: employee.status,
      isActive: employee.isActive
    });
    // Use the EmployeesHub _id for shift assignment
    const actualEmployeeId = employee._id;
    console.log('Using employee ID for shift assignment:', actualEmployeeId);

    const conflicts = await exports.detectShiftConflicts(actualEmployeeId, startTime, endTime, date);
    if (conflicts.length > 0) {
      console.log('⚠️ Shift conflicts detected:', conflicts.length);
      conflicts.forEach((c, i) => {
        console.log(`Conflict ${i + 1}:`, {
          id: c._id,
          date: c.date,
          time: `${c.startTime} - ${c.endTime}`,
          location: c.location,
          status: c.status
        });
      });
      
      return res.status(400).json({
        success: false,
        message: `Shift conflict detected. Employee already has ${conflicts.length} shift(s) on ${new Date(date).toLocaleDateString()} that overlap with ${startTime} - ${endTime}.`,
        conflicts: conflicts.map(c => ({
          id: c._id,
          date: c.date,
          startTime: c.startTime,
          endTime: c.endTime,
          location: c.location,
          status: c.status
        }))
      });
    }

    const shiftAssignment = new ShiftAssignment({
      employeeId: actualEmployeeId,
      groupId: groupId || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      shiftName: shiftName || '',
      assignmentTargetType: 'employee',
      teamId: null,
      teamName: '',
      date: new Date(date),
      startTime,
      endTime,
      location,
      workType,
      breakDuration: breakDuration || 0,
      assignedBy: assignedByUserId,
      assignedByName: assignedByName || '',
      notes: notes || '',
      status: 'Scheduled'
    });

    await shiftAssignment.save();
    console.log('✅ Shift saved with employeeId:', shiftAssignment.employeeId);

    // Populate with EmployeesHub data instead of User data
    const populatedShift = await ShiftAssignment.findById(shiftAssignment._id)
      .populate('employeeId', 'firstName lastName email role')
      .populate('assignedBy', 'firstName lastName role');
    
    console.log('📤 Populated shift data:', {
      shiftId: populatedShift._id,
      employeeId: populatedShift.employeeId,
      employeeIdType: typeof populatedShift.employeeId,
      hasFirstName: populatedShift.employeeId?.firstName,
      employeeName: populatedShift.employeeId?.firstName ? `${populatedShift.employeeId.firstName} ${populatedShift.employeeId.lastName}` : 'NOT POPULATED'
    });

    // Create notification for shift assignment
    try {
      const Notification = require('../models/Notification');
      const assignedByName = populatedShift.assignedBy 
        ? `${populatedShift.assignedBy.firstName} ${populatedShift.assignedBy.lastName}`
        : 'Admin';
      
      // Determine recipient type and reference
      const notificationData = {
        recipientType: 'employee',
        employeeRef: actualEmployeeId,
        type: 'shift_assigned',
        title: 'Shift Assigned',
        message: `New shift assigned by ${assignedByName} on ${new Date(date).toLocaleDateString()} from ${startTime} to ${endTime} at ${location}`,
        priority: 'medium',
        metadata: {
          shiftId: shiftAssignment._id,
          date: date,
          startTime: startTime,
          endTime: endTime,
          location: location,
          assignedBy: assignedByName,
          assignedAt: new Date().toISOString()
        }
      };
      
      await Notification.create(notificationData);
      console.log('Shift assignment notification created for employee:', actualEmployeeId);
    } catch (notifError) {
      console.error('Failed to create shift assignment notification:', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Shift assigned successfully',
      data: populatedShift
    });

  } catch (error) {
    console.error('======= Assign Shift Error =======');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('User info:', req.user);
    console.error('===================================');
    
    res.status(500).json({
      success: false,
      message: 'Failed to assign shift',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.assignShiftToTeam = async (req, res) => {
  try {
    const { teamId, shiftName, startDate, endDate, startTime, endTime,
            location, workType, breakDuration, notes, groupId } = req.body;

    const actorRole = (req.user?.role || '').toString().trim().toLowerCase();
    if (!ADMIN_ROLES.includes(actorRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin users can assign shifts by team'
      });
    }

    if (!teamId || !startDate || !endDate || !startTime || !endTime || !location || !workType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: teamId, startDate, endDate, startTime, endTime, location, workType'
      });
    }

    const assignedByUserId = await resolveAssignableUserId(req);
    const assignedByName = await resolveActorDisplayName(req, assignedByUserId);
    if (!req.user || !assignedByUserId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const Team = require('../models/Team');
    const team = await Team.findById(teamId).populate({
      path: 'members',
      select: 'firstName lastName email status isActive deleted',
      match: { status: 'Active', isActive: true, deleted: { $ne: true } }
    });

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const validMembers = (team.members || []).filter(m => m != null);
    if (validMembers.length === 0) {
      return res.status(400).json({ success: false, message: 'No active members found in this team' });
    }

    const dates = getWeekdaysInRange(new Date(startDate), new Date(endDate));
    if (dates.length === 0) {
      return res.status(400).json({ success: false, message: 'No weekdays in the selected date range' });
    }

    const batchGroupId = groupId || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const results = { successful: [], failed: [] };

    for (const member of validMembers) {
      for (const date of dates) {
        try {
          // Conflict check
          const conflicts = await exports.detectShiftConflicts(member._id, startTime, endTime, date);
          if (conflicts.length > 0) {
            results.failed.push({ employeeId: member._id, date, reason: 'Shift conflict' });
            continue;
          }

          // Leave check
          const shiftDate = new Date(date);
          const startOfDay = new Date(shiftDate); startOfDay.setHours(0, 0, 0, 0);
          const endOfDay   = new Date(shiftDate); endOfDay.setHours(23, 59, 59, 999);
          const conflictingLeave = await LeaveRequest.findOne({
            employeeId: member._id,
            status: 'Approved',
            startDate: { $lte: endOfDay },
            endDate:   { $gte: startOfDay }
          });
          if (conflictingLeave) {
            results.failed.push({ employeeId: member._id, date, reason: 'Employee has approved leave' });
            continue;
          }

          const assignment = new ShiftAssignment({
            employeeId:    member._id,
            groupId:       batchGroupId,
            startDate:     new Date(startDate),
            endDate:       new Date(endDate),
            shiftName:     shiftName || '',
            assignmentTargetType: 'team',
            teamId:        team._id,
            teamName:      team.name || '',
            date:          new Date(date),
            startTime,
            endTime,
            location,
            workType,
            breakDuration: breakDuration || 0,
            assignedBy:    assignedByUserId,
            assignedByName: assignedByName || '',
            notes:         notes || '',
            status:        'Scheduled'
          });
          await assignment.save();
          results.successful.push({ employeeId: member._id, shiftId: assignment._id });
        } catch (err) {
          results.failed.push({ employeeId: member._id, date, reason: err.message });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Team shift assignment complete. ${results.successful.length} assigned, ${results.failed.length} skipped`,
      data: results
    });
  } catch (error) {
    console.error('Assign shift to team error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign team shifts', error: error.message });
  }
};

exports.requestShiftSwap = async (req, res) => {
  try {
    const { shiftId, swapWithEmployeeId, reason } = req.body;

    if (!shiftId || !swapWithEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Shift ID and swap target employee ID are required'
      });
    }

    const shift = await ShiftAssignment.findById(shiftId);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    // Bridge User account → EmployeeHub record via email to get the correct employeeId
    const requestingEmployee = await EmployeesHub.findOne({ email: req.user.email });
    if (!requestingEmployee) {
      return res.status(403).json({
        success: false,
        message: 'Employee record not found for your account'
      });
    }

    if (shift.employeeId.toString() !== requestingEmployee._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only request a swap for your own shifts'
      });
    }

    if (shift.swapRequest.status === 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'A swap request is already pending for this shift'
      });
    }

    // Check if target employee exists in EmployeesHub (excludes profile users)
    const targetEmployee = await EmployeesHub.findById(swapWithEmployeeId);
    if (!targetEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Target employee not found or is not eligible for shift swaps'
      });
    }

    shift.swapRequest = {
      requestedBy: requestingEmployee._id,
      requestedWith: swapWithEmployeeId,
      status: 'Pending',
      reason: reason || '',
      requestedAt: new Date()
    };

    await shift.save();

    const populatedShift = await ShiftAssignment.findById(shift._id)
      .populate('employeeId', 'firstName lastName email role')
      .populate('swapRequest.requestedWith', 'firstName lastName email role');

    res.status(200).json({
      success: true,
      message: 'Shift swap request submitted',
      data: populatedShift
    });

  } catch (error) {
    console.error('Request shift swap error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request shift swap',
      error: error.message
    });
  }
};

exports.approveShiftSwap = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Approved or Rejected'
      });
    }

    const shift = await ShiftAssignment.findById(shiftId);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    if (shift.swapRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'No pending swap request for this shift'
      });
    }

    shift.swapRequest.reviewedBy = req.user._id;
    shift.swapRequest.reviewedAt = new Date();
    shift.swapRequest.status = status;

    if (status === 'Approved') {
      const originalEmployeeId = shift.employeeId;
      const swapEmployeeId = shift.swapRequest.requestedWith;

      // Reassign this shift to the swap partner
      shift.employeeId = swapEmployeeId;
      shift.status = 'Scheduled';

      // If the swap partner has a shift on the same date, reassign it to the original employee
      const partnerShift = await ShiftAssignment.findOne({
        employeeId: swapEmployeeId,
        date: shift.date,
        status: { $nin: ['Cancelled'] },
        _id: { $ne: shift._id }
      });
      if (partnerShift) {
        partnerShift.employeeId = originalEmployeeId;
        await partnerShift.save();
      }
    }

    await shift.save();

    const populatedShift = await ShiftAssignment.findById(shift._id)
      .populate('employeeId', 'firstName lastName email role')
      .populate('swapRequest.requestedBy', 'firstName lastName role')
      .populate('swapRequest.requestedWith', 'firstName lastName role')
      .populate('swapRequest.reviewedBy', 'firstName lastName role');

    res.status(200).json({
      success: true,
      message: `Shift swap ${status.toLowerCase()}`,
      data: populatedShift
    });

  } catch (error) {
    console.error('Approve shift swap error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process shift swap',
      error: error.message
    });
  }
};

exports.getShiftsByLocation = async (req, res) => {
  try {
    const { location } = req.params;
    const { startDate, endDate, employeeId } = req.query;
    const scopedEmployeeIds = await getManagerScopedEmployeeIds(req);

    const query = { location };
    applyManagerScopeToEmployeeQuery(query, scopedEmployeeIds, employeeId);

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const shifts = await ShiftAssignment.find(query)
      .populate('employeeId', 'firstName lastName email role')
      .populate('assignedBy', 'firstName lastName role')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      count: shifts.length,
      data: shifts
    });

  } catch (error) {
    console.error('Get shifts by location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shifts by location',
      error: error.message
    });
  }
};

exports.getShiftStatistics = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    const scopedEmployeeIds = await getManagerScopedEmployeeIds(req);

    const query = {};
    applyManagerScopeToEmployeeQuery(query, scopedEmployeeIds, employeeId);
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end   = new Date(endDate);
      if (!isNaN(start) && !isNaN(end)) query.date = { $gte: start, $lte: end };
    }

    // Aggregation for counts avoids loading all documents into memory
    const [aggResult, shifts] = await Promise.all([
      ShiftAssignment.aggregate([
        { $match: query },
        { $group: {
          _id: null,
          total:       { $sum: 1 },
          locOffice:   { $sum: { $cond: [{ $eq: ['$location', 'Office'] },           1, 0] } },
          locHome:     { $sum: { $cond: [{ $eq: ['$location', 'Home'] },             1, 0] } },
          locField:    { $sum: { $cond: [{ $eq: ['$location', 'Field'] },            1, 0] } },
          locClient:   { $sum: { $cond: [{ $eq: ['$location', 'Client Site'] },      1, 0] } },
          stScheduled: { $sum: { $cond: [{ $eq: ['$status', 'Scheduled'] },          1, 0] } },
          stCompleted: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] },          1, 0] } },
          stMissed:    { $sum: { $cond: [{ $eq: ['$status', 'Missed'] },             1, 0] } },
          stSwapped:   { $sum: { $cond: [{ $eq: ['$status', 'Swapped'] },            1, 0] } },
          stCancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] },          1, 0] } },
          wtRegular:   { $sum: { $cond: [{ $eq: ['$workType', 'Regular'] },          1, 0] } },
          wtOvertime:  { $sum: { $cond: [{ $eq: ['$workType', 'Overtime'] },         1, 0] } },
          wtWeekend:   { $sum: { $cond: [{ $eq: ['$workType', 'Weekend overtime'] }, 1, 0] } },
          wtClient:    { $sum: { $cond: [{ $eq: ['$workType', 'Client side overtime'] }, 1, 0] } },
          uniqueEmployees: { $addToSet: '$employeeId' }
        }}
      ]),
      // Only fetch the 3 fields needed for hours calculation
      ShiftAssignment.find(query).select('startTime endTime breakDuration').lean()
    ]);

    const agg = aggResult[0] || {};

    // Calculate total hours with correct overnight-shift support
    const totalHours = shifts.reduce((acc, shift) => {
      if (!shift.startTime || !shift.endTime) return acc;
      let mins = timeToMinutes(shift.endTime) - timeToMinutes(shift.startTime);
      if (mins <= 0) mins += 1440; // shift crosses midnight
      return acc + Math.max(0, mins - (shift.breakDuration || 0)) / 60;
    }, 0);

    const stats = {
      totalShifts: agg.total || 0,
      byLocation: {
        Office:        agg.locOffice  || 0,
        Home:          agg.locHome    || 0,
        Field:         agg.locField   || 0,
        'Client Site': agg.locClient  || 0
      },
      byWorkType: {
        Regular:               agg.wtRegular  || 0,
        Overtime:              agg.wtOvertime || 0,
        'Weekend overtime':    agg.wtWeekend  || 0,
        'Client side overtime':agg.wtClient   || 0
      },
      byStatus: {
        Scheduled: agg.stScheduled || 0,
        Completed: agg.stCompleted || 0,
        Missed:    agg.stMissed    || 0,
        Swapped:   agg.stSwapped   || 0,
        Cancelled: agg.stCancelled || 0
      },
      totalHours:       totalHours.toFixed(2),
      uniqueEmployees:  (agg.uniqueEmployees || []).length
    };

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error('Get shift statistics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shift statistics', error: error.message });
  }
};

exports.getAllShiftAssignments = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, location, workType, status } = req.query;
    const scopedEmployeeIds = await getManagerScopedEmployeeIds(req);

    const query = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Validate dates before querying
      if (!isNaN(start.valueOf()) && !isNaN(end.valueOf())) {
        query.date = {
          $gte: start,
          $lte: end
        };
      } else {
        console.error('Invalid date range:', { startDate, endDate });
      }
    }

    applyManagerScopeToEmployeeQuery(query, scopedEmployeeIds, employeeId);
    if (location) query.location = location;
    if (workType) query.workType = workType;
    if (status) query.status = status;

    let shifts = await ShiftAssignment.find(query)
      .populate({
        path: 'employeeId',
        select: '_id firstName lastName email role', // Include _id explicitly
        options: { strictPopulate: false }
      })
      .populate({
        path: 'assignedBy',
        select: '_id firstName lastName', // Include _id explicitly
        options: { strictPopulate: false }
      })
      .sort({ date: 1, startTime: 1 })
      .lean();

    // Handle cases where populate failed (employeeId is still an ObjectId)
    for (let shift of shifts) {
      if (shift.employeeId && typeof shift.employeeId === 'object') {
        // Check if it's a populated employee object (has firstName) or just an ObjectId
        if (!shift.employeeId.firstName) {
          // Populate failed or incomplete, try to find the employee manually from EmployeesHub
          console.log(`⚠️ Populate failed for shift ${shift._id}, manually looking up employeeId:`, shift.employeeId);
          const employee = await EmployeesHub.findById(shift.employeeId).select('_id firstName lastName email').lean();
          if (employee) {
            console.log(`✅ Found employee:`, employee.firstName, employee.lastName, `(_id: ${employee._id})`);
            shift.employeeId = employee;
          } else {
            // Employee not found, set to null to indicate missing reference
            console.warn(`❌ Employee not found for shift ${shift._id}, employeeId: ${shift.employeeId}`);
            shift.employeeId = null;
          }
        } else {
          // Successfully populated
          console.log(`✅ Shift ${shift._id} has populated employeeId:`, shift.employeeId.firstName, shift.employeeId.lastName, `(_id: ${shift.employeeId._id})`);
        }
      } else if (!shift.employeeId) {
        console.warn(`⚠️ Shift ${shift._id} has no employeeId`);
      }
      
      // For assignedBy, check both User and EmployeesHub (admins can be in either collection)
      if (shift.assignedBy && typeof shift.assignedBy === 'object' && !shift.assignedBy.firstName) {
        let assignedByUser = await EmployeesHub.findById(shift.assignedBy).select('firstName lastName').lean();
        if (!assignedByUser) {
          // If not in EmployeesHub, check User collection (for admin/super-admin)
          assignedByUser = await User.findById(shift.assignedBy).select('firstName lastName').lean();
        }
        if (assignedByUser) {
          shift.assignedBy = assignedByUser;
        } else {
          shift.assignedBy = null;
        }
      }
    }

    res.status(200).json({
      success: true,
      count: shifts.length,
      data: shifts
    });

  } catch (error) {
    console.error('Get all shift assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shift assignments',
      error: error.message
    });
  }
};

exports.getEmployeeShifts = async (req, res) => {
  try {
    const requestedEmployeeId = req.params.employeeId;
    const { startDate, endDate } = req.query;
    const userRole = req.user?.role;
    const scopedEmployeeIds = await getManagerScopedEmployeeIds(req);

    // For employee users, always resolve and enforce their own EmployeeHub ID
    // regardless of any path parameter.
    let effectiveEmployeeId = requestedEmployeeId;
    if (userRole === 'employee') {
      const actorId = req.user?._id || req.user?.id || req.user?.userId;
      let actorEmployee = null;

      if (actorId && mongoose.Types.ObjectId.isValid(String(actorId))) {
        actorEmployee = await EmployeesHub.findById(actorId).select('_id');
        if (!actorEmployee) {
          actorEmployee = await EmployeesHub.findOne({ userId: actorId }).select('_id');
        }
      }

      if (!actorEmployee && req.user?.email) {
        actorEmployee = await EmployeesHub.findOne({
          email: String(req.user.email).toLowerCase().trim()
        }).select('_id');
      }

      if (!actorEmployee?._id) {
        return res.status(403).json({
          success: false,
          message: 'Employee profile not found for current user'
        });
      }

      effectiveEmployeeId = String(actorEmployee._id);
    }

    if (scopedEmployeeIds !== null && !scopedEmployeeIds.includes(String(effectiveEmployeeId))) {
      return res.status(403).json({
        success: false,
        message: 'Managers can only view shifts for their own team members'
      });
    }

    const query = { employeeId: effectiveEmployeeId };

    if (startDate && endDate) {
      const rangeStart = getUKStartOfDay(new Date(startDate));
      const rangeEnd = getUKEndOfDay(new Date(endDate));

      query.date = {
        $gte: rangeStart,
        $lte: rangeEnd
      };
    }

    const shifts = await ShiftAssignment.find(query)
      .populate('assignedBy', 'firstName lastName')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      count: shifts.length,
      data: shifts
    });

  } catch (error) {
    console.error('Get employee shifts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee shifts',
      error: error.message
    });
  }
};

exports.updateShiftAssignment = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { shiftName, date, startTime, endTime, location, workType, breakDuration, status, notes } = req.body;

    const shift = await ShiftAssignment.findById(shiftId);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    if (startTime && endTime && date) {
      const conflicts = await exports.detectShiftConflicts(
        shift.employeeId,
        startTime,
        endTime,
        date,
        shiftId
      );
      if (conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Shift conflict detected',
          conflicts
        });
      }
    }

    if (date) shift.date = new Date(date);
    if (shiftName !== undefined) shift.shiftName = shiftName || '';
    if (startTime) shift.startTime = startTime;
    if (endTime) shift.endTime = endTime;
    if (location) shift.location = location;
    if (workType) shift.workType = workType;
    if (breakDuration !== undefined) shift.breakDuration = breakDuration;
    if (status) shift.status = status;
    if (notes !== undefined) shift.notes = notes;

    await shift.save();

    const populatedShift = await ShiftAssignment.findById(shift._id)
      .populate('employeeId', 'firstName lastName email role')
      .populate('assignedBy', 'firstName lastName role');

    res.status(200).json({
      success: true,
      message: 'Shift updated successfully',
      data: populatedShift
    });

  } catch (error) {
    console.error('Update shift assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shift',
      error: error.message
    });
  }
};

exports.deleteShiftAssignment = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const scopedEmployeeIds = await getManagerScopedEmployeeIds(req);

    const shift = await ShiftAssignment.findById(shiftId).select('employeeId assignedBy');
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    if (scopedEmployeeIds !== null) {
      if (!scopedEmployeeIds.includes(String(shift.employeeId))) {
        return res.status(403).json({
          success: false,
          message: 'Managers can only delete shifts for their own team members'
        });
      }

      const assignedByRole = await resolveActorRoleById(shift.assignedBy);
      if (ADMIN_SCOPE_ROLES.includes(assignedByRole)) {
        return res.status(403).json({
          success: false,
          message: 'Managers cannot delete shifts assigned by admin'
        });
      }
    }

    await ShiftAssignment.findByIdAndDelete(shiftId);

    res.status(200).json({
      success: true,
      message: 'Shift deleted successfully'
    });

  } catch (error) {
    console.error('Delete shift assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete shift',
      error: error.message
    });
  }
};

