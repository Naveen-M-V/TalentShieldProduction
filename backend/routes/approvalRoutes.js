const express = require('express');
const router = express.Router();
const hierarchyHelper = require('../utils/hierarchyHelper');
const EmployeeHub = require('../models/EmployeesHub');

/**
 * Approval Routes
 * Handles hierarchy-based approval queries for managers
 * 
 * These routes allow managers to:
 * - Get pending approvals (leaves & expenses) for their team
 * - View their subordinates
 * - Check approval permissions
 * - Get their approval authority level
 */

/**
 * GET /api/approvals/my-pending
 * Get all pending leave and expense approvals for the logged-in manager
 * Returns both direct and indirect reports based on authority level
 */
router.get('/my-pending', async (req, res) => {
  try {
    const managerId = req.session.user._id;

    if (!managerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get pending approvals using hierarchy helper
    const { leaves, expenses } = await hierarchyHelper.getPendingApprovalsForManager(managerId);

    res.json({
      success: true,
      data: {
        leaves,
        expenses,
        counts: {
          leaves: leaves.length,
          expenses: expenses.length,
          total: leaves.length + expenses.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending approvals',
      error: error.message
    });
  }
});

/**
 * GET /api/approvals/my-team
 * Get all subordinates (direct and indirect) for the logged-in manager
 */
router.get('/my-team', async (req, res) => {
  try {
    const managerId = req.session.user._id;
    const { includeIndirect } = req.query;

    if (!managerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get manager details
    const manager = await EmployeeHub.findById(managerId).select('firstName lastName role');
    
    if (!manager) {
      return res.status(404).json({
        success: false,
        message: 'Manager not found'
      });
    }

    // Get subordinates based on query parameter
    const shouldIncludeIndirect = includeIndirect === 'true' || 
                                  ['senior-manager', 'admin', 'super-admin'].includes(manager.role);
    
    const subordinates = await hierarchyHelper.getSubordinates(
      managerId, 
      shouldIncludeIndirect
    );

    res.json({
      success: true,
      data: {
        manager: {
          name: `${manager.firstName} ${manager.lastName}`,
          role: manager.role
        },
        subordinates,
        count: subordinates.length,
        includesIndirect: shouldIncludeIndirect
      }
    });

  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team members',
      error: error.message
    });
  }
});

/**
 * POST /api/approvals/can-approve
 * Check if the logged-in user can approve a specific request
 * Body: { type: 'leave' | 'expense', employeeId: 'xxx' }
 */
router.post('/can-approve', async (req, res) => {
  try {
    const approverId = req.session.user._id;
    const { type, employeeId } = req.body;

    if (!approverId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!type || !employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Type and employeeId are required'
      });
    }

    if (!['leave', 'expense'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either "leave" or "expense"'
      });
    }

    // Check permission based on type
    let canApprove = false;
    if (type === 'leave') {
      canApprove = await hierarchyHelper.canApproveLeave(approverId, employeeId);
    } else {
      canApprove = await hierarchyHelper.canApproveExpense(approverId, employeeId);
    }

    // Get approver details
    const approver = await EmployeeHub.findById(approverId).select('firstName lastName role employeeId');

    res.json({
      success: true,
      canApprove,
      approver: approver ? {
        name: `${approver.firstName} ${approver.lastName}`,
        employeeId: approver.employeeId,
        role: approver.role
      } : null
    });

  } catch (error) {
    console.error('Error checking approval permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check approval permission',
      error: error.message
    });
  }
});

/**
 * GET /api/approvals/my-authority
 * Get the approval authority level and permissions for the logged-in user
 */
router.get('/my-authority', async (req, res) => {
  try {
    const userId = req.session.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get approval authority using hierarchy helper
    const authority = await hierarchyHelper.getApprovalAuthority(userId);

    if (!authority.role) {
      return res.status(404).json({
        success: false,
        message: 'User not found in employee system'
      });
    }

    res.json({
      success: true,
      data: authority
    });

  } catch (error) {
    console.error('Error fetching approval authority:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval authority',
      error: error.message
    });
  }
});

/**
 * GET /api/approvals/team-hierarchy/:employeeId
 * Get the reporting hierarchy chain for a specific employee
 */
router.get('/team-hierarchy/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const requesterId = req.session.user._id;

    if (!requesterId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const employee = await EmployeeHub.findById(employeeId)
      .select('firstName lastName employeeId jobTitle managerId role')
      .populate('managerId', 'firstName lastName employeeId jobTitle role');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Build hierarchy chain
    const hierarchy = [];
    let current = employee;
    let depth = 0;
    const maxDepth = 10; // Prevent infinite loops

    while (current && depth < maxDepth) {
      hierarchy.push({
        id: current._id,
        name: `${current.firstName} ${current.lastName}`,
        employeeId: current.employeeId,
        jobTitle: current.jobTitle,
        role: current.role,
        level: depth
      });

      if (current.managerId) {
        current = await EmployeeHub.findById(current.managerId)
          .select('firstName lastName employeeId jobTitle managerId role');
      } else {
        current = null;
      }
      
      depth++;
    }

    res.json({
      success: true,
      data: {
        employee: {
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId
        },
        hierarchy,
        depth: hierarchy.length
      }
    });

  } catch (error) {
    console.error('Error fetching team hierarchy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team hierarchy',
      error: error.message
    });
  }
});

module.exports = router;
