const Overtime = require('../models/Overtime');
const EmployeeHub = require('../models/EmployeesHub');
const mongoose = require('mongoose');
const { ADMIN_ROLES } = require('../utils/roles');
const { resolveActorId } = require('../utils/identityHelper');

// Helper to resolve employee ID from request
const resolveEmployeeIdForRequest = async (req) => {
  if (!req.user) {
    console.error('❌ No req.user found in request');
    return null;
  }
  
  console.log('🔍 Resolving employee ID for user:', { 
    id: req.user.id, 
    _id: req.user._id, 
    userId: req.user.userId, 
    email: req.user.email,
    employeeId: req.user.employeeId 
  });
  
  // If already cached on req.user, return it
  if (req.employeeHubId && mongoose.Types.ObjectId.isValid(String(req.employeeHubId))) {
    console.log('✅ Using cached employeeHubId:', req.employeeHubId);
    return req.employeeHubId;
  }

  const authId = resolveActorId(req);
  const authIdStr = authId ? String(authId).trim() : '';
  let employee = null;

  // Try finding by userId field in EmployeesHub
  if (authIdStr && mongoose.Types.ObjectId.isValid(authIdStr)) {
    console.log('🔍 Searching by userId field:', authIdStr);
    employee = await EmployeeHub.findOne({ userId: authIdStr }).select('_id');
    if (employee) {
      console.log('✅ Found employee by userId field:', employee._id);
    } else {
      console.log('⚠️  No employee found by userId field, trying direct _id match');
      employee = await EmployeeHub.findById(authIdStr).select('_id');
      if (employee) {
        console.log('✅ Found employee by _id:', employee._id);
      }
    }
  }

  // Fall back to email lookup
  if (!employee && req.user.email) {
    console.log('🔍 Searching by email:', req.user.email);
    employee = await EmployeeHub.findOne({ email: String(req.user.email).toLowerCase() }).select('_id');
    if (employee) {
      console.log('✅ Found employee by email:', employee._id);
    }
  }

  if (employee?._id) {
    req.user.employeeId = employee._id;
    return employee._id;
  }

  console.error('❌ Could not resolve employee ID for user:', req.user.email || req.user.id);
  return null;
};

// Create overtime entry
const createOvertimeEntry = async (req, res) => {
  try {
    const { employeeId: providedEmployeeId, date, scheduledHours, workedHours, notes } = req.body;

    // Validate required fields
    if (!date || scheduledHours === undefined || workedHours === undefined) {
      return res.status(400).json({ 
        message: 'Date, scheduledHours, and workedHours are required' 
      });
    }

    // Determine employee ID (admin can provide it, employee uses their own)
    const isAdmin = ADMIN_ROLES.includes(req.user?.role);
    let employeeId;

    if (isAdmin && providedEmployeeId) {
      // Admin creating for specific employee
      if (!mongoose.Types.ObjectId.isValid(providedEmployeeId)) {
        return res.status(400).json({ message: 'Invalid employee ID provided' });
      }
      employeeId = providedEmployeeId;
    } else {
      // Employee creating for themselves OR admin without employeeId
      employeeId = await resolveEmployeeIdForRequest(req);
      if (!employeeId) {
        console.error('❌ Failed to resolve employee ID for overtime submission');
        console.error('User data:', req.user);
        return res.status(403).json({ 
          message: 'Could not find your employee profile. Please contact HR support.',
          debug: {
            userId: resolveActorId(req),
            email: req.user?.email
          }
        });
      }
    }

    // Validate hours
    if (scheduledHours < 0 || workedHours < 0) {
      return res.status(400).json({ message: 'Hours cannot be negative' });
    }

    // Auto-calculate overtime
    const overtimeHours = Math.max(0, workedHours - scheduledHours);

    // Prevent creating entries with no overtime
    if (overtimeHours <= 0) {
      return res.status(400).json({ 
        message: 'No overtime detected. Worked hours must exceed scheduled hours.' 
      });
    }

    // Parse date and normalize to start of day
    const entryDate = new Date(date);
    entryDate.setHours(0, 0, 0, 0);

    // Check for duplicate entry on same date
    const existingEntry = await Overtime.findOne({
      employeeId,
      date: entryDate
    });

    if (existingEntry) {
      return res.status(409).json({ 
        message: 'Overtime entry already exists for this date. Please edit the existing entry.' 
      });
    }

    // Create overtime record
    const overtimeEntry = await Overtime.create({
      employeeId,
      date: entryDate,
      scheduledHours,
      workedHours,
      overtimeHours,
      notes: notes || '',
      approvalStatus: 'pending'
    });

    // Populate employee details
    await overtimeEntry.populate('employeeId', 'firstName lastName employeeId');

    res.status(201).json({
      success: true,
      message: 'Overtime entry created successfully',
      overtime: overtimeEntry
    });
  } catch (error) {
    console.error('Create overtime error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: 'Overtime entry already exists for this date' 
      });
    }

    res.status(500).json({ 
      message: error.message || 'Failed to create overtime entry' 
    });
  }
};

// Get overtime entries for specific employee
const getEmployeeOvertime = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate, status } = req.query;

    // Validate employee ID
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }

    // Authorization check
    const requestingEmployeeId = await resolveEmployeeIdForRequest(req);
    const isAdmin = ADMIN_ROLES.includes(req.user?.role);

    if (!isAdmin && String(requestingEmployeeId) !== String(employeeId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Build query
    const query = { employeeId };

    // Add date filters
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Add status filter
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.approvalStatus = status;
    }

    // Fetch overtime entries
    const overtimeEntries = await Overtime.find(query)
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName')
      .sort({ date: -1 });

    // Calculate totals
    const totals = {
      totalEntries: overtimeEntries.length,
      totalOvertimeHours: overtimeEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0),
      pendingHours: overtimeEntries
        .filter(e => e.approvalStatus === 'pending')
        .reduce((sum, entry) => sum + entry.overtimeHours, 0),
      approvedHours: overtimeEntries
        .filter(e => e.approvalStatus === 'approved')
        .reduce((sum, entry) => sum + entry.overtimeHours, 0),
      rejectedHours: overtimeEntries
        .filter(e => e.approvalStatus === 'rejected')
        .reduce((sum, entry) => sum + entry.overtimeHours, 0)
    };

    res.json({
      success: true,
      overtime: overtimeEntries,
      totals
    });
  } catch (error) {
    console.error('Get employee overtime error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all pending overtime requests (admin only)
const getAllPendingOvertime = async (req, res) => {
  try {
    // Admin check
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const pendingOvertimes = await Overtime.find({ approvalStatus: 'pending' })
      .populate('employeeId', 'firstName lastName employeeId')
      .sort({ date: -1 });

    const totalPendingHours = pendingOvertimes.reduce((sum, entry) => sum + entry.overtimeHours, 0);

    res.json({
      success: true,
      overtime: pendingOvertimes,
      totalPendingHours,
      count: pendingOvertimes.length
    });
  } catch (error) {
    console.error('Get pending overtime error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Approve overtime entry (admin only)
const approveOvertime = async (req, res) => {
  try {
    const { overtimeId } = req.params;

    // Admin check
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Resolve admin employee ID - may be null for profile-type admins
    const adminEmployeeId = await resolveEmployeeIdForRequest(req);
    
    // Profile-type admins (super-admin) may not have EmployeeHub record
    // This is ALLOWED - we'll use approvedByUserId instead
    const isProfileAdmin = !adminEmployeeId && ADMIN_ROLES.includes(req.user?.role);

    // Find and update overtime entry
    const overtime = await Overtime.findById(overtimeId);
    if (!overtime) {
      return res.status(404).json({ message: 'Overtime entry not found' });
    }

    if (overtime.approvalStatus !== 'pending') {
      return res.status(400).json({ 
        message: `Overtime is already ${overtime.approvalStatus}` 
      });
    }

    overtime.approvalStatus = 'approved';
    
    // Set approvedBy only if admin has EmployeeHub record
    // Profile admins will only have approvedByUserId set
    if (adminEmployeeId) {
      overtime.approvedBy = adminEmployeeId;
    }
    
    overtime.approvedAt = new Date();
    overtime.rejectionReason = null;

    // Track admin User ID (ACTOR/SUBJECT pattern - always track User._id)
    const actorUserId = resolveActorId(req);
    const actorRole = req.user?.role || req.user?.userType;
    if (actorRole && ADMIN_ROLES.includes(actorRole)) {
      overtime.approvedByUserId = actorUserId;
      overtime.approverRole = actorRole;
      overtime.approverComments = 'Approved by ' + (req.user?.firstName || 'Admin');
    }

    await overtime.save();

    // Populate for response
    await overtime.populate('employeeId', 'firstName lastName employeeId');
    await overtime.populate('approvedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Overtime approved successfully',
      overtime
    });
  } catch (error) {
    console.error('Approve overtime error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Reject overtime entry (admin only)
const rejectOvertime = async (req, res) => {
  try {
    const { overtimeId } = req.params;
    const { reason } = req.body;

    // Admin check
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Resolve admin employee ID - may be null for profile-type admins
    const adminEmployeeId = await resolveEmployeeIdForRequest(req);
    
    // Profile-type admins (super-admin) may not have EmployeeHub record
    // This is ALLOWED - we'll use approvedByUserId instead
    const isProfileAdmin = !adminEmployeeId && ADMIN_ROLES.includes(req.user?.role);

    // Find and update overtime entry
    const overtime = await Overtime.findById(overtimeId);
    if (!overtime) {
      return res.status(404).json({ message: 'Overtime entry not found' });
    }

    if (overtime.approvalStatus !== 'pending') {
      return res.status(400).json({ 
        message: `Overtime is already ${overtime.approvalStatus}` 
      });
    }

    overtime.approvalStatus = 'rejected';
    
    // Set approvedBy only if admin has EmployeeHub record
    // Profile admins will only have approvedByUserId set
    if (adminEmployeeId) {
      overtime.approvedBy = adminEmployeeId;
    }
    
    overtime.approvedAt = new Date();
    overtime.rejectionReason = reason || 'No reason provided';

    // Track admin User ID (ACTOR/SUBJECT pattern - always track User._id)
    const actorUserId = resolveActorId(req);
    const actorRole = req.user?.role || req.user?.userType;
    if (actorRole && ADMIN_ROLES.includes(actorRole)) {
      overtime.approvedByUserId = actorUserId;
      overtime.approverRole = actorRole;
      overtime.approverComments = reason || 'Rejected by ' + (req.user?.firstName || 'Admin');
    }

    await overtime.save();

    // Populate for response
    await overtime.populate('employeeId', 'firstName lastName employeeId');
    await overtime.populate('approvedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Overtime rejected successfully',
      overtime
    });
  } catch (error) {
    console.error('Reject overtime error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOvertimeEntry,
  getEmployeeOvertime,
  getAllPendingOvertime,
  approveOvertime,
  rejectOvertime
};
