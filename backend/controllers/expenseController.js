const Expense = require('../models/Expense');
const Employee = require('../models/EmployeesHub');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const hierarchyHelper = require('../utils/hierarchyHelper');
const { ADMIN_ROLES, ROLE_VALUES } = require('../utils/roles');

// Helper to resolve employee record from a user identifier which may be either
// the EmployeeHub.userId (reference to User) OR the EmployeeHub._id itself.
async function findEmployeeByUserIdentifier(id) {
  if (!id) return null;
  // Try lookup by userId field first (links to User model)
  let emp = await Employee.findOne({ userId: id });
  if (emp) return emp;
  // Fallback: id might already be an EmployeeHub._id
  if (mongoose.Types.ObjectId.isValid(id)) {
    emp = await Employee.findById(id);
    if (emp) return emp;
  }
  return null;
}

async function findEmployeeByEmail(email, userIdToLink) {
  if (!email) return null;

  const normalizedEmail = email.toString().trim().toLowerCase();
  if (!normalizedEmail) return null;

  const emp = await Employee.findOne({ email: normalizedEmail });
  if (!emp) return null;

  if (!emp.userId && userIdToLink && mongoose.Types.ObjectId.isValid(userIdToLink)) {
    try {
      emp.userId = userIdToLink;
      await emp.save();
    } catch (e) {
      // non-fatal
    }
  }

  return emp;
}

function extractActorId(actor) {
  if (!actor) return null;
  if (typeof actor === 'string') return actor;
  if (actor instanceof mongoose.Types.ObjectId) return actor.toString();
  if (typeof actor === 'object' && actor._id) return actor._id.toString();
  return null;
}

function resolveActorNameObject(actor, employeeById, userById) {
  if (!actor) return null;

  if (typeof actor === 'object') {
    const first = actor.firstName || actor.first_name || '';
    const last = actor.lastName || actor.last_name || '';
    if (first || last) {
      return { firstName: first, lastName: last };
    }

    if (actor.name) {
      const parts = actor.name.toString().trim().split(/\s+/);
      return {
        firstName: parts.shift() || '',
        lastName: parts.join(' ')
      };
    }
  }

  const actorId = extractActorId(actor);
  if (!actorId) return null;

  const emp = employeeById.get(actorId);
  if (emp) {
    return {
      firstName: emp.firstName || '',
      lastName: emp.lastName || ''
    };
  }

  const usr = userById.get(actorId);
  if (usr) {
    const first = usr.firstName || '';
    const last = usr.lastName || '';
    if (first || last) {
      return { firstName: first, lastName: last };
    }

    const name = (usr.name || '').toString().trim();
    if (name) {
      const parts = name.split(/\s+/);
      return {
        firstName: parts.shift() || '',
        lastName: parts.join(' ')
      };
    }
  }

  return null;
}

async function normalizeExpenseApproverRefs(expenses) {
  if (!Array.isArray(expenses) || expenses.length === 0) return expenses;

  const actorIds = new Set();
  for (const expense of expenses) {
    ['approvedBy', 'declinedBy', 'paidBy'].forEach((field) => {
      const id = extractActorId(expense?.[field]);
      if (id) actorIds.add(id);
    });
  }

  if (actorIds.size === 0) {
    return expenses.map((exp) => (exp?.toObject ? exp.toObject() : exp));
  }

  const ids = Array.from(actorIds)
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const [employees, users] = await Promise.all([
    Employee.find({ _id: { $in: ids } }).select('firstName lastName').lean(),
    User.find({ _id: { $in: ids } }).select('firstName lastName name').lean()
  ]);

  const employeeById = new Map(employees.map((e) => [e._id.toString(), e]));
  const userById = new Map(users.map((u) => [u._id.toString(), u]));

  return expenses.map((exp) => {
    const item = exp?.toObject ? exp.toObject() : { ...exp };
    item.approvedBy = resolveActorNameObject(item.approvedBy, employeeById, userById);
    item.declinedBy = resolveActorNameObject(item.declinedBy, employeeById, userById);
    item.paidBy = resolveActorNameObject(item.paidBy, employeeById, userById);
    return item;
  });
}

async function getManagerScopedEmployeeIds(req) {
  const role = (req.session?.user?.role || req.user?.role || '').toString();

  if (![ROLE_VALUES.MANAGER, ROLE_VALUES.SENIOR_MANAGER].includes(role)) {
    return null;
  }

  const actorId = req.session?.user?._id || req.user?._id || req.user?.employeeId || null;
  const actorEmployee = await findEmployeeByUserIdentifier(actorId);

  if (!actorEmployee?._id) {
    return [];
  }

  const includeIndirect = role === ROLE_VALUES.SENIOR_MANAGER;
  const teamMembers = await hierarchyHelper.getSubordinates(actorEmployee._id, includeIndirect);
  return teamMembers.map((member) => String(member._id));
}

async function notifyExpenseSubmitted(expense, employee) {
  try {
    if (!expense || !employee?._id) return;

    const [profileAdmins, employeeAdmins] = await Promise.all([
      User.find({ role: { $in: ADMIN_ROLES }, isActive: true }).select('_id').lean(),
      Employee.find({ role: { $in: ADMIN_ROLES }, isActive: true }).select('_id').lean()
    ]);

    const targetEmployeeIds = new Set(
      [
        employee.managerId ? String(employee.managerId) : null,
        ...employeeAdmins.map((a) => String(a._id))
      ].filter(Boolean)
    );

    targetEmployeeIds.delete(String(employee._id));

    const message = `${employee.firstName || 'Employee'} ${employee.lastName || ''}`.trim()
      + ` submitted a ${expense.claimType === 'mileage' ? 'mileage' : 'receipt'} expense claim for ${expense.currency || 'GBP'} ${Number(expense.totalAmount || 0).toFixed(2)}.`;

    const notifications = [
      ...profileAdmins.map((admin) => ({
        recipientType: 'profile',
        profileRef: admin._id,
        type: 'expense',
        title: 'New Expense Claim Submitted',
        message,
        priority: 'high',
        isRead: false,
        metadata: {
          relatedId: expense._id,
          claimType: expense.claimType,
          status: 'pending',
          totalAmount: expense.totalAmount,
          employeeId: employee._id
        }
      })),
      ...Array.from(targetEmployeeIds).map((id) => ({
        recipientType: 'employee',
        employeeRef: id,
        type: 'expense',
        title: 'New Expense Claim Submitted',
        message,
        priority: 'high',
        isRead: false,
        metadata: {
          relatedId: expense._id,
          claimType: expense.claimType,
          status: 'pending',
          totalAmount: expense.totalAmount,
          employeeId: employee._id
        }
      }))
    ];

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error('Failed to notify approvers about new expense:', error.message);
  }
}

async function notifyExpenseApproved(expense, employee, approverEmp) {
  try {
    if (!expense?.employee?._id) return;

    const approverName = approverEmp
      ? `${approverEmp.firstName || ''} ${approverEmp.lastName || ''}`.trim()
      : 'an approver';

    await Notification.create({
      recipientType: 'employee',
      employeeRef: expense.employee._id,
      type: 'expense',
      title: 'Expense Claim Approved',
      message: `Your ${expense.claimType === 'mileage' ? 'mileage' : 'receipt'} expense claim for ${expense.currency || 'GBP'} ${Number(expense.totalAmount || 0).toFixed(2)} was approved by ${approverName}.`,
      priority: 'medium',
      isRead: false,
      metadata: {
        relatedId: expense._id,
        status: 'approved',
        claimType: expense.claimType,
        totalAmount: expense.totalAmount,
        employeeId: employee?._id || expense.employee._id,
        approverId: approverEmp?._id || null
      }
    });
  } catch (error) {
    console.error('Failed to notify employee of expense approval:', error.message);
  }
}

async function notifyExpenseDeclined(expense, employee, approverEmp, reason) {
  try {
    if (!expense?.employee?._id) return;

    const approverName = approverEmp
      ? `${approverEmp.firstName || ''} ${approverEmp.lastName || ''}`.trim()
      : 'an approver';

    await Notification.create({
      recipientType: 'employee',
      employeeRef: expense.employee._id,
      type: 'expense',
      title: 'Expense Claim Rejected',
      message: `Your ${expense.claimType === 'mileage' ? 'mileage' : 'receipt'} expense claim for ${expense.currency || 'GBP'} ${Number(expense.totalAmount || 0).toFixed(2)} was rejected by ${approverName}.${reason ? ` Reason: ${reason}` : ''}`,
      priority: 'high',
      isRead: false,
      metadata: {
        relatedId: expense._id,
        status: 'declined',
        claimType: expense.claimType,
        totalAmount: expense.totalAmount,
        employeeId: employee?._id || expense.employee._id,
        approverId: approverEmp?._id || null,
        declineReason: reason || null
      }
    });
  } catch (error) {
    console.error('Failed to notify employee of expense rejection:', error.message);
  }
}

function haversineMeters(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000; // Earth radius meters
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDlat = Math.sin(dLat / 2);
  const sinDlon = Math.sin(dLon / 2);
  const aa = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

/**
 * Get all expenses for the logged-in employee
 */
exports.getMyExpenses = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const userEmail = req.session.user.email;

    // Find employee record (supports Employee.userId or Employee._id identifiers)
    let employee = await findEmployeeByUserIdentifier(userId);
    
    // If not found by ID, try by email (for admins without EmployeeHub records)
    if (!employee && userEmail) {
      employee = await findEmployeeByEmail(userEmail, userId);
    }
    
    if (!employee) {
      console.log('No employee record found for user:', { userId, userEmail });
      return res.status(404).json({ 
        message: 'Employee record not found. Please contact administrator to link your account.',
        expenses: [],
        pagination: { total: 0, page: 1, pages: 0, limit: 25 }
      });
    }

    console.log('Found employee record for expenses:', { employeeId: employee._id, email: employee.email });

    // Query parameters for filtering
    const { 
      status, 
      category, 
      tags, 
      fromDate, 
      toDate, 
      page = 1, 
      limit = 25 
    } = req.query;

    // Build filter
    const filter = { employee: employee._id };
    
    if (status) {
      filter.status = status;
    }
    if (category) {
      filter.category = category;
    }
    if (tags) {
      filter.tags = { $in: tags.split(',') };
    }
    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate) filter.date.$lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;
    const total = await Expense.countDocuments(filter);

    const expensesRaw = await Expense.find(filter)
      .populate('submittedBy', 'firstName lastName')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const expenses = await normalizeExpenseApproverRefs(expensesRaw);

    res.json({
      expenses,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Failed to fetch expenses', error: error.message });
  }
};

/**
 * Get expenses pending approval (for managers)
 */
exports.getPendingApprovals = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const sessionUser = req.session.user;
    console.log('Fetching pending approvals - sessionUser:', sessionUser ? { id: sessionUser._id, email: sessionUser.email, role: sessionUser.role } : null);

    let user = await User.findById(userId);
    if (!user) {
      // Fallback: maybe the approver exists in EmployeeHub (admins/super-admins sometimes stored there)
      const emp = await findEmployeeByUserIdentifier(userId);
        if (emp) {
          console.log('User not found in User model, using EmployeeHub record for role lookup:', { id: emp._id, role: emp.role });
          user = { _id: emp._id, role: emp.role, email: emp.email };
        }
    }

    // Check if user is manager/admin scope
    if (!user || !['manager', 'senior-manager', 'hr', 'admin', 'super-admin'].includes(user.role)) {
      console.warn('Access denied for pending approvals - user role:', user ? user.role : null);
      return res.status(403).json({ message: 'Access denied. Manager/Admin role required.' });
    }

    // Query parameters
    const {
      employeeId,
      status,
      category,
      tags,
      fromDate,
      toDate,
      page = 1,
      limit = 25
    } = req.query;

    // Build filter
    // - All roles default to all statuses.
    // - If `status` is provided, filter by that explicit status.
    const filter = {};
    if (status) {
      filter.status = status;
    }

    if (employeeId) {
      filter.employee = employeeId;
    }
    
    if (category) {
      filter.category = category;
    }
    if (tags) {
      filter.tags = { $in: tags.split(',') };
    }
    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate) filter.date.$lte = new Date(toDate);
    }

    // Manager/senior-manager/hr views are restricted to their team hierarchy.
    if (!ADMIN_ROLES.includes(user.role)) {
      const approverEmp = await findEmployeeByUserIdentifier(userId)
        || await findEmployeeByEmail(sessionUser?.email, userId);

      if (!approverEmp) {
        return res.status(400).json({
          message: 'Approver employee record not found. Please link your account to EmployeeHub.'
        });
      }

      const includeIndirect = ['senior-manager', 'hr'].includes(user.role);
      const teamMembers = await hierarchyHelper.getSubordinates(approverEmp._id, includeIndirect);
      const teamIds = teamMembers.map((m) => m._id);

      if (!teamIds.length) {
        return res.json({
          expenses: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            pages: 0,
            limit: parseInt(limit)
          }
        });
      }

      filter.employee = employeeId ? employeeId : { $in: teamIds };
    }

    const skip = (page - 1) * limit;
    const total = await Expense.countDocuments(filter);

    const expensesRaw = await Expense.find(filter)
      .populate('employee', 'firstName lastName employeeId department jobRole')
      .populate('submittedBy', 'firstName lastName')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const expenses = await normalizeExpenseApproverRefs(expensesRaw);

    res.json({
      expenses,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ message: 'Failed to fetch pending approvals', error: error.message });
  }
};

/**
 * Get single expense by ID
 */
exports.getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user._id;

    const expense = await Expense.findById(id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .populate('declinedBy', 'firstName lastName')
      .populate('paidBy', 'firstName lastName')
      .populate('submittedBy', 'firstName lastName');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const managerScopedEmployeeIds = await getManagerScopedEmployeeIds(req);
    if (Array.isArray(managerScopedEmployeeIds)) {
      const expenseEmployeeId = expense.employee?._id ? String(expense.employee._id) : String(expense.employee || '');
      if (!expenseEmployeeId || !managerScopedEmployeeIds.includes(expenseEmployeeId)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Check access: employee can see their own, manager can see team, admin can see all
    const employee = await findEmployeeByUserIdentifier(userId);
    const user = await User.findById(userId);
    
    const isOwnExpense = employee && expense.employee._id.toString() === employee._id.toString();
    const isAdmin = user && ADMIN_ROLES.includes(user.role);

    let canManagerAccess = false;
    if (!isOwnExpense && !isAdmin && employee) {
      canManagerAccess = await hierarchyHelper.canAccessEmployee(
        employee._id,
        expense.employee._id,
        { _id: employee._id, role: employee.role }
      );
    }

    if (!isOwnExpense && !isAdmin && !canManagerAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ message: 'Failed to fetch expense', error: error.message });
  }
};

/**
 * Create new expense claim
 */
exports.createExpense = async (req, res) => {
  try {
    const userId = req.session.user._id;

    // Find employee record
    const employee = await findEmployeeByUserIdentifier(userId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee record not found' });
    }

    const expenseData = {
      ...req.body,
      employee: employee._id,
      submittedBy: employee._id,
      status: 'pending'
    };

    // Validate claim type specific fields
    if (expenseData.claimType === 'receipt') {
      if (!expenseData.supplier) {
        return res.status(400).json({ message: 'Supplier is required for receipt claims' });
      }
    } else if (expenseData.claimType === 'mileage') {
      if (!expenseData.mileage || !expenseData.mileage.ratePerUnit) {
        return res.status(400).json({ message: 'Rate is required for mileage claims and destinations or manual distance must be provided' });
      }

      // Compute distance without Google: prefer client-supplied routePoints (lat/lng array)
      if (expenseData.mileage.routePoints && Array.isArray(expenseData.mileage.routePoints) && expenseData.mileage.routePoints.length >= 2) {
        // routePoints expected as [{latitude, longitude}, ...]
        const pts = expenseData.mileage.routePoints;
        let totalMeters = 0;
        for (let i = 1; i < pts.length; i++) {
          totalMeters += haversineMeters(pts[i - 1], pts[i]);
        }
        expenseData.mileage.calculatedDistance = totalMeters; // meters
        const miles = totalMeters / 1609.344;
        const mileageAmount = miles * expenseData.mileage.ratePerUnit;
        expenseData.totalAmount = Number((mileageAmount + (expenseData.tax || 0)).toFixed(2));
      } else if (expenseData.mileage.destinations && Array.isArray(expenseData.mileage.destinations) && expenseData.mileage.destinations.length >= 2 && expenseData.mileage.destinations.every(d => d.latitude && d.longitude)) {
        // If destinations include lat/lng, compute distance from those points
        const pts = expenseData.mileage.destinations.map(d => ({ latitude: d.latitude, longitude: d.longitude }));
        let totalMeters = 0;
        for (let i = 1; i < pts.length; i++) totalMeters += haversineMeters(pts[i - 1], pts[i]);
        expenseData.mileage.calculatedDistance = totalMeters;
        expenseData.mileage.routePoints = pts;
        const miles = totalMeters / 1609.344;
        const mileageAmount = miles * expenseData.mileage.ratePerUnit;
        expenseData.totalAmount = Number((mileageAmount + (expenseData.tax || 0)).toFixed(2));
      } else if (expenseData.mileage.distance) {
        // client provided distance (assumed in miles if unit==miles)
        const distance = expenseData.mileage.distance;
        const unit = expenseData.mileage.unit || 'miles';
        let miles = distance;
        if (unit === 'km') miles = distance * 0.621371;
        const mileageAmount = miles * expenseData.mileage.ratePerUnit;
        expenseData.totalAmount = Number((mileageAmount + (expenseData.tax || 0)).toFixed(2));
        expenseData.mileage.calculatedDistance = unit === 'km' ? distance * 1000 : miles * 1609.344;
      } else {
        return res.status(422).json({ message: 'Unable to calculate distance. Provide routePoints with lat/lng or manual distance.' });
      }
    }

    // If client provided an overviewPolyline but routePoints are missing, decode it server-side so frontend MapLibre can render route without Google
    try {
      if (expenseData.mileage && expenseData.mileage.overviewPolyline && (!expenseData.mileage.routePoints || expenseData.mileage.routePoints.length === 0)) {
        try {
          const decoded = polyline.decode(expenseData.mileage.overviewPolyline).map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
          expenseData.mileage.routePoints = decoded;
        } catch (decErr) {
          console.warn('Failed to decode overviewPolyline:', decErr.message);
        }
      }
    } catch (e) {
      // non-fatal
      console.warn('Polyline decode step failed', e && e.message);
    }

    const expense = new Expense(expenseData);
    await expense.save();

    await notifyExpenseSubmitted(expense, employee);

    const populatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('submittedBy', 'firstName lastName');

    res.status(201).json(populatedExpense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ message: 'Failed to create expense', error: error.message });
  }
};

/**
 * Update expense
 */
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user._id;

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Only allow updating pending expenses
    if (expense.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot update expense that is not pending' });
    }

    // Check ownership
    const employee = await findEmployeeByUserIdentifier(userId);
    if (!employee || expense.employee.toString() !== employee._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'employee' && key !== 'status' && key !== 'approvedBy' && key !== 'declinedBy' && key !== 'paidBy') {
        expense[key] = req.body[key];
      }
    });

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('submittedBy', 'firstName lastName');

    res.json(updatedExpense);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ message: 'Failed to update expense', error: error.message });
  }
};

/**
 * Delete expense
 */
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user._id;

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Only allow deleting pending expenses
    if (expense.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot delete expense that is not pending' });
    }

    // Check ownership
    const employee = await findEmployeeByUserIdentifier(userId);
    if (!employee || expense.employee.toString() !== employee._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Expense.findByIdAndDelete(id);
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ message: 'Failed to delete expense', error: error.message });
  }
};

/**
 * Approve expense (manager/admin only)
 */
exports.approveExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionUser = req.session?.user;
    const userId = sessionUser?._id;

    const user = userId ? await User.findById(userId).select('role email') : null;
    const role = (user?.role || sessionUser?.role || '').toString();
    const email = (user?.email || sessionUser?.email || '').toString();

    // Resolve approver as EmployeeHub record (prefer by userId; fallback by email)
    let approverEmp = await findEmployeeByUserIdentifier(userId);
    if (!approverEmp) {
      approverEmp = await findEmployeeByEmail(email, userId);
    }
    const approverId = approverEmp ? approverEmp._id : null;

    const expense = await Expense.findById(id).populate('employee', '_id');
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending expenses can be approved' });
    }

    if (!ADMIN_ROLES.includes(role) && approverId && expense.employee && String(expense.employee._id) === String(approverId)) {
      return res.status(403).json({ message: 'Your own expense claims must be reviewed by admin' });
    }

    // Debug log: show resolved approver and target employee
    console.log('Approve request - approverEmp:', approverEmp ? { id: approverEmp._id, role: approverEmp.role } : null, 'expense.employee:', expense.employee ? expense.employee._id : null);

    // Admin / super-admin can approve regardless of hierarchy; others must pass hierarchy check
    const canApprove = ADMIN_ROLES.includes(role)
      ? true
      : await hierarchyHelper.canApproveExpense(approverId, expense.employee._id);
    if (!canApprove) {
      console.warn('Approve denied - approverId:', approverId, 'employeeId:', expense.employee._id);
      return res.status(403).json({ message: 'You do not have permission to approve this expense' });
    }

    await expense.approve(approverId);

    const employeeRecord = await Employee.findById(expense.employee._id).select('firstName lastName');
    await notifyExpenseApproved(expense, employeeRecord, approverEmp);

    const updatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName')
      .populate('submittedBy', 'firstName lastName');

    res.json(updatedExpense);
  } catch (error) {
    console.error('Error approving expense:', error);
    res.status(500).json({ message: 'Failed to approve expense', error: error.message });
  }
};

/**
 * Decline expense (manager/admin only)
 */
exports.declineExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const sessionUser = req.session?.user;
    const userId = sessionUser?._id;
    const user = userId ? await User.findById(userId).select('role email') : null;
    const role = (user?.role || sessionUser?.role || '').toString();
    const email = (user?.email || sessionUser?.email || '').toString();

    let approverEmp = await findEmployeeByUserIdentifier(userId);
    if (!approverEmp) {
      approverEmp = await findEmployeeByEmail(email, userId);
    }
    const approverId = approverEmp ? approverEmp._id : null;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: 'Decline reason is required' });
    }

    const expense = await Expense.findById(id).populate('employee', '_id');
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (!ADMIN_ROLES.includes(role) && approverId && expense.employee && String(expense.employee._id) === String(approverId)) {
      return res.status(403).json({ message: 'Your own expense claims must be reviewed by admin' });
    }

    // Admin / super-admin can decline regardless of hierarchy; others must pass hierarchy check
    const canApprove = ADMIN_ROLES.includes(role)
      ? true
      : await hierarchyHelper.canApproveExpense(approverId, expense.employee._id);
    if (!canApprove) {
      return res.status(403).json({ message: 'You do not have permission to decline this expense' });
    }

    if (expense.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending expenses can be declined' });
    }

    await expense.decline(approverId, reason);

    const employeeRecord = await Employee.findById(expense.employee._id).select('firstName lastName');
    await notifyExpenseDeclined(expense, employeeRecord, approverEmp, reason);

    const updatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('declinedBy', 'firstName lastName')
      .populate('submittedBy', 'firstName lastName');

    res.json(updatedExpense);
  } catch (error) {
    console.error('Error declining expense:', error);
    res.status(500).json({ message: 'Failed to decline expense', error: error.message });
  }
};

/**
 * Mark expense as paid (admin only)
 */
exports.markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionUser = req.session?.user;
    const userId = sessionUser?._id;
    const user = userId ? await User.findById(userId).select('role email') : null;
    const role = (user?.role || sessionUser?.role || '').toString();
    const email = (user?.email || sessionUser?.email || '').toString();

    // Resolve approver EmployeeHub id
    let approverEmp = await findEmployeeByUserIdentifier(userId);
    if (!approverEmp) {
      approverEmp = await findEmployeeByEmail(email, userId);
    }
    const approverId = approverEmp ? approverEmp._id : null;

    // Check if user has permission to mark as paid (admin/super-admin only)
    const canMarkPaid = ADMIN_ROLES.includes(role)
      ? true
      : await hierarchyHelper.canMarkExpenseAsPaid(approverId);
    if (!canMarkPaid) {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved expenses can be marked as paid' });
    }

    await expense.markAsPaid(approverId);

    const updatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName')
      .populate('paidBy', 'firstName lastName')
      .populate('submittedBy', 'firstName lastName');

    res.json(updatedExpense);
  } catch (error) {
    console.error('Error marking expense as paid:', error);
    res.status(500).json({ message: 'Failed to mark expense as paid', error: error.message });
  }
};

/**
 * Revert expense to pending status (admin only)
 */
exports.revertToPending = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user._id;

    // Allow admin/super-admin from either User (profile) or EmployeeHub (employee)
    const user = await User.findById(userId);
    let isAdmin = false;
    if (user && user.role === 'admin') isAdmin = true;
    if (!isAdmin) {
      const approverEmp = await findEmployeeByUserIdentifier(userId);
      if (approverEmp && (approverEmp.role === 'admin' || approverEmp.role === 'super-admin')) isAdmin = true;
    }

    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.status === 'pending') {
      return res.status(400).json({ message: 'Expense is already pending' });
    }

    expense.status = 'pending';
    expense.approvedBy = null;
    expense.approvedAt = null;
    expense.declinedBy = null;
    expense.declinedAt = null;
    expense.declineReason = null;
    expense.paidBy = null;
    expense.paidAt = null;

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('submittedBy', 'firstName lastName');

    res.json(updatedExpense);
  } catch (error) {
    console.error('Error reverting expense to pending:', error);
    res.status(500).json({ message: 'Failed to revert expense to pending', error: error.message });
  }
};

/**
 * Upload attachment to expense
 */
exports.uploadAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user._id;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check ownership
    const employee = await findEmployeeByUserIdentifier(userId);
    if (!employee || expense.employee.toString() !== employee._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check attachment limit
    if (expense.attachments.length >= 5) {
      return res.status(400).json({ message: 'Maximum 5 attachments allowed per expense' });
    }

    const attachment = {
      fileName: req.file.originalname,
      fileData: req.file.buffer,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedAt: new Date()
    };

    expense.attachments.push(attachment);
    await expense.save();

    res.json({
      message: 'Attachment uploaded successfully',
      attachmentId: expense.attachments[expense.attachments.length - 1]._id,
      attachmentCount: expense.attachments.length
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ message: 'Failed to upload attachment', error: error.message });
  }
};

/**
 * Delete attachment from expense
 */
exports.deleteAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const userId = req.session.user._id;

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check ownership
    const employee = await findEmployeeByUserIdentifier(userId);
    if (!employee || expense.employee.toString() !== employee._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Remove attachment
    expense.attachments = expense.attachments.filter(
      att => att._id.toString() !== attachmentId
    );

    await expense.save();

    res.json({
      message: 'Attachment deleted successfully',
      attachmentCount: expense.attachments.length
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ message: 'Failed to delete attachment', error: error.message });
  }
};

/**
 * Get attachment file
 */
exports.getAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const userId = req.session.user._id;

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check access
    const employee = await findEmployeeByUserIdentifier(userId);
    const user = await User.findById(userId);

    const isOwnExpense = employee && expense.employee.toString() === employee._id.toString();
    const isAdmin = user && ADMIN_ROLES.includes(user.role);

    // Allow if owner or admin
    if (!isOwnExpense && !isAdmin) {
      // If not owner/admin, allow managers/senior-managers/hr to view receipts for team members
      const managerScopedEmployeeIds = await getManagerScopedEmployeeIds(req);
      if (Array.isArray(managerScopedEmployeeIds)) {
        const expenseEmployeeId = expense.employee?._id ? String(expense.employee._id) : String(expense.employee || '');
        if (!expenseEmployeeId || !managerScopedEmployeeIds.includes(expenseEmployeeId)) {
          return res.status(403).json({ message: 'Access denied' });
        }
      } else {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Find attachment
    const attachment = expense.attachments.find(
      att => att._id.toString() === attachmentId
    );

    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Normalize Buffer/BSON Binary -> Node Buffer
    let fileBuffer;
    if (attachment.fileData && Buffer.isBuffer(attachment.fileData)) {
      fileBuffer = attachment.fileData;
    } else if (attachment.fileData && attachment.fileData.buffer) {
      // Mongoose/BSON Binary may expose a `.buffer` ArrayBuffer
      try {
        fileBuffer = Buffer.from(attachment.fileData.buffer);
      } catch (e) {
        fileBuffer = Buffer.from(attachment.fileData);
      }
    } else {
      fileBuffer = Buffer.from([]);
    }

    // Use attachment disposition to force download in browsers which may
    // otherwise attempt to render (PDF/image) and show blank on cross-origin
    // navigations; also set Content-Length for completeness.
    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName || 'attachment'}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error retrieving attachment:', error);
    res.status(500).json({ message: 'Failed to retrieve attachment', error: error.message });
  }
};

/**
 * Export expenses to CSV
 */
exports.exportToCSV = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { expenses } = req.body;

    if (!expenses || !Array.isArray(expenses)) {
      return res.status(400).json({ message: 'Expenses array is required in request body' });
    }

    // Basic CSV generation (can be enhanced with csvExporter utility)
    const csvHeader = 'Date,Category,Claim Type,Description,Supplier,Amount,Currency,Tax,Status,Notes\n';
    const csvRows = expenses.map(exp => {
      return [
        exp.date ? new Date(exp.date).toLocaleDateString('en-GB') : '',
        exp.category || '',
        exp.claimType || '',
        exp.notes || '',
        exp.supplier || '',
        exp.totalAmount || 0,
        exp.currency || 'GBP',
        exp.tax || 0,
        exp.status || '',
        (exp.declineReason || '').replace(/,/g, ';')
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="expenses_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting expenses to CSV:', error);
    res.status(500).json({ message: 'Failed to export expenses', error: error.message });
  }
};

/**
 * Get approved expenses for manager/admin
 */
exports.getApprovedExpenses = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user._id;
    const sessionUser = req.session.user;

    let user = await User.findById(userId);
    if (!user) {
      const emp = await findEmployeeByUserIdentifier(userId);
      if (emp) {
        user = { _id: emp._id, role: emp.role, email: emp.email };
      }
    }

    // Check if user is manager/admin scope
    if (!user || !['manager', 'senior-manager', 'hr', 'admin', 'super-admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Access denied. Manager/Admin role required.' });
    }

    const filter = { status: 'approved' };

    // Manager/senior-manager/hr views are restricted to their team hierarchy.
    if (!ADMIN_ROLES.includes(user.role)) {
      const approverEmp = await findEmployeeByUserIdentifier(userId)
        || await findEmployeeByEmail(sessionUser?.email, userId);

      if (!approverEmp) {
        return res.status(400).json({
          message: 'Approver employee record not found. Please link your account to EmployeeHub.'
        });
      }

      const includeIndirect = ['senior-manager', 'hr'].includes(user.role);
      const teamMembers = await hierarchyHelper.getSubordinates(approverEmp._id, includeIndirect);
      const teamIds = teamMembers.map((m) => m._id);

      if (!teamIds.length) {
        return res.json({ data: [] });
      }

      filter.employee = { $in: teamIds };
    }

    const expenses = await Expense.find(filter)
      .populate('employee', 'firstName lastName employeeId department jobRole')
      .populate('submittedBy', 'firstName lastName')
      .sort({ date: -1, createdAt: -1 });

    const normalizedExpenses = await normalizeExpenseApproverRefs(expenses);

    res.json({ data: normalizedExpenses });
  } catch (error) {
    console.error('Error fetching approved expenses:', error);
    res.status(500).json({ message: 'Failed to fetch approved expenses', error: error.message });
  }
};

/**
 * Get rejected/declined expenses for manager/admin
 */
exports.getRejectedExpenses = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user._id;
    const sessionUser = req.session.user;

    let user = await User.findById(userId);
    if (!user) {
      const emp = await findEmployeeByUserIdentifier(userId);
      if (emp) {
        user = { _id: emp._id, role: emp.role, email: emp.email };
      }
    }

    // Check if user is manager/admin scope
    if (!user || !['manager', 'senior-manager', 'hr', 'admin', 'super-admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Access denied. Manager/Admin role required.' });
    }

    const filter = { status: 'declined' };

    // Manager/senior-manager/hr views are restricted to their team hierarchy.
    if (!ADMIN_ROLES.includes(user.role)) {
      const approverEmp = await findEmployeeByUserIdentifier(userId)
        || await findEmployeeByEmail(sessionUser?.email, userId);

      if (!approverEmp) {
        return res.status(400).json({
          message: 'Approver employee record not found. Please link your account to EmployeeHub.'
        });
      }

      const includeIndirect = ['senior-manager', 'hr'].includes(user.role);
      const teamMembers = await hierarchyHelper.getSubordinates(approverEmp._id, includeIndirect);
      const teamIds = teamMembers.map((m) => m._id);

      if (!teamIds.length) {
        return res.json({ data: [] });
      }

      filter.employee = { $in: teamIds };
    }

    const expenses = await Expense.find(filter)
      .populate('employee', 'firstName lastName employeeId department jobRole')
      .populate('submittedBy', 'firstName lastName')
      .sort({ date: -1, createdAt: -1 });

    const normalizedExpenses = await normalizeExpenseApproverRefs(expenses);

    res.json({ data: normalizedExpenses });
  } catch (error) {
    console.error('Error fetching rejected expenses:', error);
    res.status(500).json({ message: 'Failed to fetch rejected expenses', error: error.message });
  }
};
