const EmployeeHub = require('../models/EmployeesHub');
const LeaveRequest = require('../models/LeaveRequest');
const Expense = require('../models/Expense');
const Review = require('../models/Review');
const TimeEntry = require('../models/TimeEntry');
const hierarchyHelper = require('../utils/hierarchyHelper');
const mongoose = require('mongoose');
const { MANAGER_SCOPE_ROLES, EXTENDED_MANAGER_SCOPE_ROLES, ADMIN_SCOPE_ROLES } = require('../utils/roles');
const { resolveActorId } = require('../utils/identityHelper');

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const normalizeDateRange = (startDate, endDate) => {
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

const resolveActorEmployee = async (req) => {
  const authId = resolveActorId(req);
  if (authId && isObjectId(authId)) {
    const employee = await EmployeeHub.findById(authId)
      .select('_id firstName lastName email role department managerId isActive status')
      .lean();
    if (employee) return employee;
  }

  const email = req.user?.email || req.session?.user?.email;
  if (email) {
    const byEmail = await EmployeeHub.findOne({
      email: String(email).trim().toLowerCase()
    })
      .select('_id firstName lastName email role department managerId isActive status')
      .lean();
    if (byEmail) return byEmail;
  }

  return null;
};

const getTeamIds = async (manager) => {
  if (!manager) return [];
  const includeIndirect = EXTENDED_MANAGER_SCOPE_ROLES.includes(manager.role);
  const teamMembers = await hierarchyHelper.getSubordinates(manager._id, includeIndirect);
  return teamMembers.map((member) => member._id);
};

const getOrgWideEmployeeIds = async () => {
  const employees = await EmployeeHub.find({
    isActive: true,
    status: { $ne: 'Terminated' }
  })
    .select('_id')
    .lean();

  return employees.map((employee) => employee._id);
};

const getScopedTeamIds = async (manager, actorRole) => {
  if (manager) {
    return getTeamIds(manager);
  }

  // Profile-type admin/super-admin/hr users may not have EmployeeHub records.
  if (ADMIN_SCOPE_ROLES.includes(actorRole)) {
    return getOrgWideEmployeeIds();
  }

  return [];
};

const formatReportDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB');
};

exports.getManagerDashboard = async (req, res) => {
  try {
    const manager = await resolveActorEmployee(req);
    const actorRole = req.user?.role || req.session?.user?.role;

    if (!MANAGER_SCOPE_ROLES.includes(actorRole)) {
      return res.status(403).json({
        success: false,
        message: 'Manager access required'
      });
    }

    // Non-admin manager roles must map to EmployeeHub.
    if (!manager && !ADMIN_SCOPE_ROLES.includes(actorRole)) {
      return res.status(403).json({ success: false, message: 'Manager access required' });
    }

    let teamMembers = [];
    let teamIds = [];

    if (manager) {
      const includeIndirect = EXTENDED_MANAGER_SCOPE_ROLES.includes(manager.role);
      teamMembers = await hierarchyHelper.getSubordinates(manager._id, includeIndirect);
      teamIds = teamMembers.map((member) => member._id);
    } else {
      teamMembers = await EmployeeHub.find({
        isActive: true,
        status: { $ne: 'Terminated' }
      })
        .select('firstName lastName email role department managerId isActive status')
        .lean();
      teamIds = teamMembers.map((member) => member._id);
    }

    const [pendingLeaveCount, pendingExpenseCount, recentLeaves, recentExpenses] = await Promise.all([
      teamIds.length
        ? LeaveRequest.countDocuments({ status: 'Pending', employeeId: { $in: teamIds } })
        : 0,
      teamIds.length
        ? Expense.countDocuments({ status: 'pending', employee: { $in: teamIds } })
        : 0,
      teamIds.length
        ? LeaveRequest.find({ status: 'Pending', employeeId: { $in: teamIds } })
            .select('employeeId leaveType startDate endDate numberOfDays status createdAt')
            .populate('employeeId', 'firstName lastName email department')
            .sort({ createdAt: -1 })
            .limit(8)
            .lean()
        : [],
      teamIds.length
        ? Expense.find({ status: 'pending', employee: { $in: teamIds } })
            .select('employee totalAmount category date status createdAt claimType')
            .populate('employee', 'firstName lastName email department')
            .sort({ createdAt: -1 })
            .limit(8)
            .lean()
        : [],
    ]);

    const departmentBreakdown = teamMembers.reduce((acc, member) => {
      const key = member.department || 'Unassigned';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const roleBreakdown = teamMembers.reduce((acc, member) => {
      const key = member.role || 'employee';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        manager: {
          id: manager?._id || req.user?._id || req.user?.id || null,
          firstName: manager?.firstName || req.user?.firstName || '',
          lastName: manager?.lastName || req.user?.lastName || '',
          role: manager?.role || actorRole,
          department: manager?.department || null
        },
        teamStats: {
          totalMembers: teamMembers.length,
          activeMembers: teamMembers.filter((m) => m.isActive !== false && m.status !== 'Terminated').length,
          departmentBreakdown,
          roleBreakdown
        },
        pendingApprovals: {
          counts: {
            leave: pendingLeaveCount,
            expense: pendingExpenseCount,
            total: pendingLeaveCount + pendingExpenseCount
          },
          leaveRequests: recentLeaves,
          expenses: recentExpenses
        }
      }
    });
  } catch (error) {
    console.error('Error in getManagerDashboard:', error);
    console.error('Manager dashboard error:', error?.message, error?.stack);
    return res.status(500).json({ success: false, message: 'Failed to load manager dashboard', error: error.message });
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const manager = await resolveActorEmployee(req);
    const actorRole = req.user?.role || req.session?.user?.role;

    if (!MANAGER_SCOPE_ROLES.includes(actorRole)) {
      return res.status(403).json({ success: false, message: 'Manager access required' });
    }

    if (!manager && !ADMIN_SCOPE_ROLES.includes(actorRole)) {
      return res.status(403).json({ success: false, message: 'Manager access required' });
    }

    const { includeIndirect = 'true', department, status, q } = req.query;
    let teamMembers = [];
    let allowIndirect = false;

    if (manager) {
      allowIndirect = includeIndirect === 'true' && EXTENDED_MANAGER_SCOPE_ROLES.includes(manager.role);
      teamMembers = await hierarchyHelper.getSubordinates(manager._id, allowIndirect);
    } else {
      // Profile admins get organization-wide employee visibility.
      teamMembers = await EmployeeHub.find({
        isActive: true,
        status: { $ne: 'Terminated' }
      })
        .select('firstName lastName email role department managerId isActive status')
        .lean();
      allowIndirect = true;
    }

    if (department) {
      teamMembers = teamMembers.filter((member) => String(member.department || '').toLowerCase() === String(department).toLowerCase());
    }

    if (status) {
      teamMembers = teamMembers.filter((member) => String(member.status || '').toLowerCase() === String(status).toLowerCase());
    }

    if (q) {
      const term = String(q).trim().toLowerCase();
      teamMembers = teamMembers.filter((member) => {
        const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
        return fullName.includes(term) || String(member.email || '').toLowerCase().includes(term);
      });
    }

    return res.json({
      success: true,
      data: teamMembers,
      count: teamMembers.length,
      includeIndirect: allowIndirect
    });
  } catch (error) {
    console.error('Error in getTeamMembers:', error);
    console.error('Manager team members error:', error?.message, error?.stack);
    return res.status(500).json({ success: false, message: 'Failed to fetch team members', error: error.message });
  }
};

exports.getTeamSummary = async (req, res) => {
  try {
    const manager = await resolveActorEmployee(req);
    const actorRole = req.user?.role || req.session?.user?.role;

    if (!MANAGER_SCOPE_ROLES.includes(actorRole)) {
      return res.status(403).json({ success: false, message: 'Manager access required' });
    }

    if (!manager && !ADMIN_SCOPE_ROLES.includes(actorRole)) {
      return res.status(403).json({ success: false, message: 'Manager access required' });
    }

    const teamIds = await getScopedTeamIds(manager, actorRole);

    const [pendingLeaves, pendingExpenses, approvedLeavesThisMonth] = await Promise.all([
      teamIds.length ? LeaveRequest.countDocuments({ status: 'Pending', employeeId: { $in: teamIds } }) : 0,
      teamIds.length ? Expense.countDocuments({ status: 'pending', employee: { $in: teamIds } }) : 0,
      teamIds.length
        ? LeaveRequest.countDocuments({
            status: 'Approved',
            employeeId: { $in: teamIds },
            approvedAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              $lte: new Date()
            }
          })
        : 0
    ]);

    const teamData = manager
      ? await hierarchyHelper.getTeamData(manager._id, manager.role)
      : {
          teamSize: teamIds.length,
          activeMembers: teamIds.length,
          roles: {}
        };

    return res.json({
      success: true,
      data: {
        manager,
        teamSize: teamData?.teamSize || 0,
        activeMembers: teamData?.activeMembers || 0,
        roles: teamData?.roles || [],
        pendingLeaves,
        pendingExpenses,
        approvedLeavesThisMonth
      }
    });
  } catch (error) {
    console.error('Error in getTeamSummary:', error);
    console.error('Manager team summary error:', error?.message, error?.stack);
    return res.status(500).json({ success: false, message: 'Failed to fetch team summary', error: error.message });
  }
};

exports.getPendingApprovals = async (req, res) => {
  try {
    const manager = await resolveActorEmployee(req);
    const actorRole = req.user?.role || req.session?.user?.role;

    if (!MANAGER_SCOPE_ROLES.includes(actorRole)) {
      return res.status(403).json({ success: false, message: 'Manager access required' });
    }

    if (!manager && !ADMIN_SCOPE_ROLES.includes(actorRole)) {
      return res.status(403).json({ success: false, message: 'Manager access required' });
    }

    const teamIds = await getScopedTeamIds(manager, actorRole);

    const {
      employeeId,
      status,
      category,
      tags,
      fromDate,
      toDate,
      page = 1,
      limit = 500
    } = req.query;

    const leaveQuery = teamIds.length
      ? { status: 'Pending', employeeId: { $in: teamIds } }
      : { _id: { $in: [] } };

    const expenseQuery = teamIds.length
      ? { employee: { $in: teamIds } }
      : { _id: { $in: [] } };

    if (employeeId) {
      if (!teamIds.some((id) => String(id) === String(employeeId))) {
        expenseQuery.employee = { $in: [] };
      } else {
        expenseQuery.employee = employeeId;
      }
    }

    if (status) {
      expenseQuery.status = status;
    } else {
      // Default: show only pending expenses for the Pending tab
      expenseQuery.status = 'pending';
    }

    if (category) {
      expenseQuery.category = category;
    }

    if (tags) {
      const tagList = String(tags)
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      if (tagList.length) {
        expenseQuery.tags = { $in: tagList };
      }
    }

    if (fromDate || toDate) {
      expenseQuery.date = {};
      if (fromDate) expenseQuery.date.$gte = new Date(fromDate);
      if (toDate) expenseQuery.date.$lte = new Date(toDate);
    }

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.max(1, parseInt(limit, 10) || 500);
    const skip = (safePage - 1) * safeLimit;

    const [leaveRequests, expenses, totalExpenses] = await Promise.all([
      LeaveRequest.find(leaveQuery)
        .populate('employeeId', 'firstName lastName email department')
        .sort({ createdAt: -1 })
        .lean(),
      Expense.find(expenseQuery)
        .populate('employee', 'firstName lastName email department')
        .populate('submittedBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .populate('declinedBy', 'firstName lastName')
        .populate('paidBy', 'firstName lastName')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Expense.countDocuments(expenseQuery)
    ]);

    return res.json({
      success: true,
      data: {
        leaveRequests,
        expenses,
        counts: {
          leave: leaveRequests.length,
          expense: expenses.length,
          total: leaveRequests.length + expenses.length
        },
        pagination: {
          total: totalExpenses,
          page: safePage,
          pages: Math.ceil(totalExpenses / safeLimit),
          limit: safeLimit
        }
      }
    });
  } catch (error) {
    console.error('Error in getPendingApprovals:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch pending approvals', error: error.message });
  }
};

exports.getPerformanceReports = async (req, res) => {
  try {
    const manager = await resolveActorEmployee(req);
    const actorRole = req.user?.role || req.session?.user?.role;

    if (!MANAGER_SCOPE_ROLES.includes(actorRole)) {
      return res.status(403).json({ success: false, message: 'Manager access required' });
    }

    if (!manager && !ADMIN_SCOPE_ROLES.includes(actorRole)) {
      return res.status(403).json({ success: false, message: 'Manager access required' });
    }

    const teamIds = await getScopedTeamIds(manager, actorRole);

    const [teamMembers, reviews] = await Promise.all([
      teamIds.length
        ? EmployeeHub.find({ _id: { $in: teamIds } })
            .select('firstName lastName email department role')
            .lean()
        : [],
      teamIds.length
        ? Review.find({ employeeId: { $in: teamIds } })
            .sort({ createdAt: -1 })
            .lean()
        : []
    ]);

    const latestReviewByEmployee = new Map();
    for (const review of reviews) {
      const key = String(review.employeeId);
      if (!latestReviewByEmployee.has(key)) {
        latestReviewByEmployee.set(key, review);
      }
    }

    const report = teamMembers.map((member) => {
      const latest = latestReviewByEmployee.get(String(member._id));
      return {
        employeeId: member._id,
        employeeName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        department: member.department,
        role: member.role,
        latestReviewStatus: latest?.status || null,
        latestReviewType: latest?.reviewType || null,
        latestManagerRating: latest?.managerFeedback?.rating ?? null,
        latestReviewDate: formatReportDate(latest?.createdAt),
        latestReviewDateRaw: latest?.createdAt || null
      };
    });

    return res.json({ success: true, data: report, count: report.length });
  } catch (error) {
    console.error('Error in getPerformanceReports:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch performance reports', error: error.message });
  }
};

exports.getAttendanceReports = async (req, res) => {
  try {
    const manager = await resolveActorEmployee(req);
    const actorRole = req.user?.role || req.session?.user?.role;

    if (!MANAGER_SCOPE_ROLES.includes(actorRole)) {
      return res.status(403).json({ success: false, message: 'Manager access required' });
    }

    if (!manager && !ADMIN_SCOPE_ROLES.includes(actorRole)) {
      return res.status(403).json({ success: false, message: 'Manager access required' });
    }

    const teamIds = await getScopedTeamIds(manager, actorRole);
    const { startDate, endDate } = req.query;
    const { start, end } = normalizeDateRange(startDate, endDate);

    const teamObjectIds = teamIds
      .filter((id) => isObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const [teamMembers, entries] = await Promise.all([
      teamObjectIds.length
        ? EmployeeHub.find({ _id: { $in: teamObjectIds } })
            .select('firstName lastName email department role')
            .lean()
        : [],
      teamObjectIds.length
        ? TimeEntry.find({
            employee: { $in: teamObjectIds },
            createdAt: { $gte: start, $lte: end }
          })
            .select('employee date totalHours status sessions createdAt')
            .lean()
        : []
    ]);

    const entriesByEmployee = entries.reduce((acc, entry) => {
      const key = String(entry.employee || '');
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(entry);
      return acc;
    }, {});

    const report = teamMembers.map((member) => {
      const list = entriesByEmployee[String(member._id)] || [];
      const totalHours = list.reduce((sum, item) => sum + (Number(item.totalHours) || 0), 0);
      const daysWithEntries = new Set(list.map((item) => item.date)).size;
      const daysClockedOut = list.filter((item) => item.status === 'clocked-out').length;
      return {
        employeeId: member._id,
        employeeName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        department: member.department,
        role: member.role,
        daysWithEntries,
        daysClockedOut,
        totalHours: Number(totalHours.toFixed(2))
      };
    });

    return res.json({
      success: true,
      data: report,
      count: report.length,
      range: {
        start,
        end
      }
    });
  } catch (error) {
    console.error('Error in getAttendanceReports:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance reports', error: error.message });
  }
};

module.exports = exports;
