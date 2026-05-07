const express = require('express');
const router = express.Router();
const unifiedLeaveController = require('../controllers/unifiedLeaveController');
const { resolveActorId } = require('../utils/identityHelper');

/**
 * UNIFIED LEAVE MANAGEMENT ROUTES
 * All leave-related endpoints in one place
 */

// ==================== EMPLOYEE LEAVE REQUESTS ====================

// Create leave request from employee dashboard
router.post('/request', unifiedLeaveController.createLeaveRequest);

// Get employee's own leave requests
router.get('/my-requests', unifiedLeaveController.getMyLeaveRequests);

// ==================== ADMIN APPROVAL WORKFLOW ====================

// Get all pending leave requests for admin dashboard
router.get('/pending-requests', unifiedLeaveController.getPendingLeaveRequests);

// Get leave requests approved by the logged-in admin
router.get('/approved-requests', unifiedLeaveController.getApprovedLeaveRequestsByApprover);

// Get leave requests rejected/denied by admins (for admin dashboard)
router.get('/denied-requests', unifiedLeaveController.getDeniedLeaveRequestsByApprover);

// Approve leave request
router.patch('/approve/:id', unifiedLeaveController.approveLeaveRequest);

// Reject leave request
router.patch('/reject/:id', unifiedLeaveController.rejectLeaveRequest);

// Cancel approved leave request (employee/manager/admin scope rules enforced in controller)
router.patch('/cancel/:id', unifiedLeaveController.cancelApprovedLeaveRequest);

// ==================== ADMIN TIME OFF CREATION ====================

// Admin creates time off for employee (from calendar "+ Time Off" button)
router.post('/admin/time-off', unifiedLeaveController.createTimeOff);

// ==================== EMPLOYEE HUB ABSENCE SECTION ====================

// Add annual leave for employee (from EmployeeHub Absence section)
router.post('/employee-hub/annual-leave', unifiedLeaveController.addAnnualLeave);

// Add sickness record
router.post('/employee-hub/sickness', unifiedLeaveController.addSickness);

// Add lateness record
router.post('/employee-hub/lateness', unifiedLeaveController.addLateness);

// Update carry over days
router.patch('/employee-hub/carry-over', unifiedLeaveController.updateCarryOver);

// Get recent absences for employee
router.get('/employee-hub/absences/:employeeId', unifiedLeaveController.getRecentAbsences);

// ==================== CALENDAR DATA ====================

// Get approved leaves for calendar display
router.get('/calendar', unifiedLeaveController.getCalendarLeaves);

// Detect overlapping leaves for team/department
router.get('/overlaps', unifiedLeaveController.detectLeaveOverlaps);

// ==================== LEAVE RECORDS (SICKNESS, LATENESS, ETC.) ====================

// Create leave record (sickness, lateness, etc.)
router.post('/records', async (req, res) => {
  try {
    const { userId, type, startDate, endDate, days, reason, notes, status } = req.body;
    const resolvedEndDate = endDate || startDate;
    
    if (!userId || !startDate || days === undefined) {
      return res.status(400).json({
        success: false,
        message: 'userId, startDate, and days are required'
      });
    }
    
    // Check if employee exists in EmployeesHub
    const employee = await EmployeesHub.findById(userId);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found. Leave records are only for EmployeesHub employees.'
      });
    }

    const hasOverlap = await unifiedLeaveController.hasOverlappingLeave(userId, startDate, resolvedEndDate);

    if (hasOverlap) {
      return res.status(409).json({
        success: false,
        message: 'An existing leave entry overlaps with the requested dates.',
        conflictType: 'overlap'
      });
    }
    
    const record = new LeaveRecord({
      user: userId,
      type: type || 'annual',
      status: status || 'approved',
      startDate: new Date(startDate),
      endDate: new Date(resolvedEndDate),
      days,
      reason,
      notes,
      createdBy: resolveActorId(req),
      approvedBy: status === 'approved' ? resolveActorId(req) : null,
      approvedAt: status === 'approved' ? new Date() : null
    });
    
    await record.save();
    
    const populatedRecord = await LeaveRecord.findById(record._id)
      .populate('user', 'firstName lastName email vtid')
      .populate('createdBy', 'firstName lastName');
    
    res.json({
      success: true,
      message: 'Leave record created successfully',
      data: populatedRecord
    });
    
  } catch (error) {
    console.error('Create leave record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating leave record',
      error: error.message
    });
  }
});

// Get leave records with filters
router.get('/records', async (req, res) => {
  try {
    const { userId, type, status, startDate, endDate } = req.query;
    
    let query = {};
    
    if (userId) query.user = userId;
    if (type) query.type = type;
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }
    
    const records = await LeaveRecord.find(query)
      .populate('user', 'firstName lastName email vtid')
      .populate('createdBy', 'firstName lastName')
      .sort({ startDate: -1 });
    
    res.json({
      success: true,
      data: records
    });
    
  } catch (error) {
    console.error('Get leave records error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching leave records',
      error: error.message
    });
  }
});

// Delete leave record
router.delete('/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const record = await LeaveRecord.findById(id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Leave record not found'
      });
    }
    
    await record.deleteOne();
    
    res.json({
      success: true,
      message: 'Leave record deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete leave record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting leave record',
      error: error.message
    });
  }
});

// ==================== LEAVE BALANCE ENDPOINTS ====================

// Import required models
const AnnualLeaveBalance = require('../models/AnnualLeaveBalance');
const EmployeesHub = require('../models/EmployeesHub');
const LeaveRecord = require('../models/LeaveRecord');

// Get leave balances with optional filters - ENHANCED TO SHOW ALL EMPLOYEES
router.get('/balances', async (req, res) => {
  try {
    const { userId, yearStart, current, includeAll } = req.query;
    
    // If includeAll=true, return ALL employees with their balance data (or zero if no balance)
    if (includeAll === 'true') {
      const now = new Date();
      
      // Get all active employees
      const allEmployees = await EmployeesHub.find({ 
        isActive: { $ne: false },
        deleted: { $ne: true }
      }).select('firstName lastName email vtid department employeeId leaveAllowance');
      
      // Get all leave balances for current year
      const balances = await AnnualLeaveBalance.find({
        leaveYearStart: { $lte: now },
        leaveYearEnd: { $gte: now }
      }).lean();
      
      // Create a map of employee ID to balance
      const balanceMap = {};
      balances.forEach(balance => {
        const userId = balance.user.toString();
        balanceMap[userId] = balance;
      });
      
      // Merge employees with their balances
      const result = allEmployees.map(emp => {
        const balance = balanceMap[emp._id.toString()];
        
        if (balance) {
          // Employee has a balance record
          return {
            _id: balance._id,
            user: {
              _id: emp._id,
              firstName: emp.firstName,
              lastName: emp.lastName,
              email: emp.email,
              vtid: emp.vtid,
              department: emp.department,
              leaveAllowance: emp.leaveAllowance || 0
            },
            entitlementDays: balance.entitlementDays || 0,
            carryOverDays: balance.carryOverDays || 0,
            usedDays: balance.usedDays || 0,
            remainingDays: balance.remainingDays || 0,
            leaveYearStart: balance.leaveYearStart,
            leaveYearEnd: balance.leaveYearEnd,
            hasBalance: true
          };
        } else {
          // Employee has NO balance record - return placeholder
          return {
            _id: null,
            user: {
              _id: emp._id,
              firstName: emp.firstName,
              lastName: emp.lastName,
              email: emp.email,
              vtid: emp.vtid,
              department: emp.department,
              leaveAllowance: emp.leaveAllowance || 0
            },
            entitlementDays: 0,
            carryOverDays: 0,
            usedDays: 0,
            remainingDays: 0,
            leaveYearStart: null,
            leaveYearEnd: null,
            hasBalance: false,
            needsInitialization: true
          };
        }
      });
      
      return res.json({
        success: true,
        data: result,
        message: `Showing ${result.length} employees (${result.filter(r => r.hasBalance).length} with balance, ${result.filter(r => !r.hasBalance).length} without balance)`
      });
    }
    
    // Standard query - only return employees with balance records
    let query = {};
    
    if (userId) {
      query.user = userId;
    }
    
    if (yearStart) {
      query.leaveYearStart = new Date(yearStart);
    }
    
    if (current === 'true') {
      const now = new Date();
      query.leaveYearStart = { $lte: now };
      query.leaveYearEnd = { $gte: now };
    }
    
    const balances = await AnnualLeaveBalance.find(query)
      .populate('user', 'firstName lastName email vtid department leaveAllowance')
      .sort({ leaveYearStart: -1 });
    
    res.json({
      success: true,
      data: balances
    });
    
  } catch (error) {
    console.error('Get leave balances error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching leave balances'
    });
  }
});

// Get current leave balance for a specific user
router.get('/balances/current/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const balance = await AnnualLeaveBalance.getCurrentBalance(userId);
    
    if (!balance) {
      return res.json({
        success: true,
        data: null,
        message: 'No leave balance found for current year'
      });
    }
    
    res.json({
      success: true,
      data: balance
    });
    
  } catch (error) {
    console.error('Get current balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching current balance'
    });
  }
});

// Get current user's leave balance
router.get('/user/current', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.session?.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const balance = await AnnualLeaveBalance.getCurrentBalance(userId);
    
    if (!balance) {
      return res.json({
        success: true,
        data: {
          entitlementDays: 0,
          carryOverDays: 0,
          usedDays: 0,
          remainingDays: 0,
          message: 'No leave balance configured'
        }
      });
    }
    
    res.json({
      success: true,
      data: balance
    });
    
  } catch (error) {
    console.error('Get user current balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching leave balance'
    });
  }
});

// Get current user's next upcoming approved leave
router.get('/user/next-leave', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.session?.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const now = new Date();
    const nextLeave = await LeaveRecord.findOne({
      user: userId,
      status: 'approved',
      startDate: { $gte: now }
    }).sort({ startDate: 1 });

    if (!nextLeave) {
      return res.json({
        success: true,
        data: null,
        message: 'No upcoming leave found'
      });
    }

    res.json({
      success: true,
      data: nextLeave
    });

  } catch (error) {
    console.error('Get next leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching next leave'
    });
  }
});

// Update leave balance by ID (for carryover, adjustments, etc.)
router.put('/balances/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { entitlementDays, carryOverDays, adjustment, notes } = req.body;
    
    const balance = await AnnualLeaveBalance.findById(id);
    
    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'Leave balance not found'
      });
    }
    
    // Update fields
    if (entitlementDays !== undefined) balance.entitlementDays = entitlementDays;
    if (carryOverDays !== undefined) balance.carryOverDays = carryOverDays;
    if (notes !== undefined) balance.notes = notes;
    
    // Add adjustment if provided
    if (adjustment && adjustment.days !== undefined && adjustment.reason) {
      const adminId = req.user?.id || req.user?._id;
      balance.adjustments.push({
        days: adjustment.days,
        reason: adjustment.reason,
        adjustedBy: adminId,
        at: new Date()
      });
    }
    
    await balance.save();
    
    // Recalculate used days if method exists
    if (AnnualLeaveBalance.recalculateUsedDays) {
      await AnnualLeaveBalance.recalculateUsedDays(
        balance.user,
        balance.leaveYearStart,
        balance.leaveYearEnd
      );
    }
    
    const updatedBalance = await AnnualLeaveBalance.findById(id)
      .populate('user', 'firstName lastName email vtid');
    
    res.json({
      success: true,
      message: 'Leave balance updated successfully',
      data: updatedBalance
    });
    
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating leave balance'
    });
  }
});

// Admin: Update employee annual leave balance
router.put('/admin/balance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { entitlementDays, carryOverDays, leaveAllowance, reason } = req.body;
    const adminId = resolveActorId(req);

    if (!adminId) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    if (leaveAllowance !== undefined) {
      const parsedAllowance = Number(leaveAllowance);
      if (!Number.isFinite(parsedAllowance) || parsedAllowance < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid leave allowance. Must be a number greater than or equal to 0.'
        });
      }

      await EmployeesHub.findByIdAndUpdate(userId, { leaveAllowance: parsedAllowance });
    }

    const now = new Date();
    let balance = await AnnualLeaveBalance.findOne({
      user: userId,
      leaveYearStart: { $lte: now },
      leaveYearEnd: { $gte: now }
    });

    if (!balance) {
      const currentYear = now.getFullYear();
      const month = now.getMonth();
      const leaveYearStart = month >= 3 ? new Date(currentYear, 3, 1) : new Date(currentYear - 1, 3, 1);
      const leaveYearEnd = month >= 3 ? new Date(currentYear + 1, 2, 31) : new Date(currentYear, 2, 31);

      balance = new AnnualLeaveBalance({
        user: userId,
        leaveYearStart,
        leaveYearEnd,
        entitlementDays: entitlementDays || 28,
        carryOverDays: carryOverDays || 0,
        usedDays: 0
      });
    } else {
      const oldEntitlement = balance.entitlementDays;
      
      if (entitlementDays !== undefined && entitlementDays !== oldEntitlement) {
        balance.entitlementDays = entitlementDays;
        
        if (reason) {
          balance.adjustments.push({
            days: entitlementDays - oldEntitlement,
            reason: reason,
            adjustedBy: adminId,
            at: new Date()
          });
        }
      }
      
      if (carryOverDays !== undefined) {
        balance.carryOverDays = carryOverDays;
      }
    }

    await balance.save();
    await balance.populate('user', 'firstName lastName email leaveAllowance');

    res.json({
      success: true,
      message: 'Leave balance updated successfully',
      data: balance
    });
  } catch (error) {
    console.error('Error updating leave balance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update leave balance', 
      error: error.message 
    });
  }
});

// ==================== PORTED FROM LEGACY LEAVEROUTES ====================

// Bulk upload leave balances from CSV array
router.post('/balances/upload', unifiedLeaveController.uploadLeaveBalances);

// Export all leave balances to CSV file
router.get('/balances/export', unifiedLeaveController.exportLeaveBalances);

// Update leave balance for a user with validation (0-60 days)
// Consolidated endpoint: replaces /balance/:userId and enhances /admin/balance/:userId
router.put('/balance/:userId', unifiedLeaveController.updateLeaveBalanceWithValidation);

// Update a leave record (status, dates, reason, rejection info)
router.put('/records/:id', unifiedLeaveController.updateLeaveRecord);

module.exports = router;
