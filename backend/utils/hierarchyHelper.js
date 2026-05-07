const EmployeeHub = require('../models/EmployeesHub');

/**
 * Hierarchy Helper Utilities
 * Handles role-based authorization and hierarchy checking for EmployeeHub
 * NOTE: User model (profiles) is separate and only handles certificate uploads
 */

/**
 * Check if an approver can approve a leave request for an employee
 * @param {String|ObjectId} approverId - The ID of the person trying to approve
 * @param {String|ObjectId} employeeId - The ID of the employee who requested leave
 * @returns {Boolean} - True if approver has permission
 */
exports.canApproveLeave = async (approverId, employeeId) => {
  try {
    const approver = await EmployeeHub.findById(approverId).select('role _id');
    const employee = await EmployeeHub.findById(employeeId).select('managerId role _id');
    
    if (!approver || !employee) {
      return false;
    }
    
    // Super-admin can approve anything
    if (approver.role === 'super-admin') {
      return true;
    }
    
    // Admin can approve anything
    if (approver.role === 'admin') {
      return true;
    }

    // HR can approve anything
    if (approver.role === 'hr') {
      return true;
    }

    // Manager / Senior Manager can approve their hierarchy
    if (approver.role === 'manager' || approver.role === 'senior-manager') {
      return await this.isInHierarchy(employee, approver);
    }
    
    // Regular employees cannot approve
    return false;
  } catch (error) {
    console.error('Error in canApproveLeave:', error);
    return false;
  }
};

/**
 * Check if an approver can approve an expense for an employee
 * @param {String|ObjectId} approverId - The ID of the person trying to approve
 * @param {String|ObjectId} employeeId - The ID of the employee who submitted expense
 * @returns {Boolean} - True if approver has permission
 */
exports.canApproveExpense = async (approverId, employeeId) => {
  try {
    const approver = await EmployeeHub.findById(approverId).select('role _id');
    const employee = await EmployeeHub.findById(employeeId).select('managerId role _id');
    
    if (!approver || !employee) {
      return false;
    }
    
    // Super-admin can approve anything
    if (approver.role === 'super-admin') {
      return true;
    }
    
    // Admin can approve anything
    if (approver.role === 'admin') {
      return true;
    }

    // HR can approve anything
    if (approver.role === 'hr') {
      return true;
    }

    // Manager / Senior Manager can approve their hierarchy
    if (approver.role === 'manager' || approver.role === 'senior-manager') {
      return await this.isInHierarchy(employee, approver);
    }
    
    // Regular employees cannot approve
    return false;
  } catch (error) {
    console.error('Error in canApproveExpense:', error);
    return false;
  }
};

/**
 * Check if an approver can mark an expense as paid
 * @param {String|ObjectId} approverId - The ID of the person trying to mark as paid
 * @returns {Boolean} - True if approver has permission
 */
exports.canMarkExpenseAsPaid = async (approverId) => {
  try {
    const approver = await EmployeeHub.findById(approverId).select('role');
    
    if (!approver) {
      return false;
    }
    
    // Only admin and super-admin can mark as paid (financial authority)
    return ['admin', 'super-admin'].includes(approver.role);
  } catch (error) {
    console.error('Error in canMarkExpenseAsPaid:', error);
    return false;
  }
};

/**
 * Check if employee is in manager's reporting hierarchy (recursive)
 * @param {Object} employee - Employee document with managerId
 * @param {Object} manager - Manager document to check against
 * @returns {Boolean} - True if employee reports to manager (directly or indirectly)
 */
exports.isInHierarchy = async (employee, manager, visited = new Set()) => {
  try {
    if (!employee || !employee.managerId) {
      return false;
    }

    // Direct report check
    if (employee.managerId.toString() === manager._id.toString()) {
      return true;
    }
    
    // For senior managers, check indirect reports
    if (manager.role === 'senior-manager' || manager.role === 'admin' || manager.role === 'super-admin') {
      const directManagerId = employee.managerId.toString();

      if (visited.has(directManagerId)) {
        return false;
      }

      visited.add(directManagerId);

      const directManager = await EmployeeHub.findById(directManagerId).select('managerId role _id');
      if (!directManager) {
        return false;
      }

      // Recursively check if employee's manager reports to this manager
      const nested = await this.isInHierarchy(directManager, manager, visited);
      if (nested) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error in isInHierarchy:', error);
    return false;
  }
};

/**
 * Get all subordinates for a manager
 * @param {String|ObjectId} managerId - The manager's ID
 * @param {Boolean} includeIndirect - Include indirect reports (for senior managers)
 * @returns {Array} - Array of employee documents
 */
exports.getSubordinates = async (managerId, includeIndirect = false, visitedManagerIds = new Set()) => {
  try {
    const managerKey = String(managerId || '');
    if (!managerKey) {
      return [];
    }

    if (visitedManagerIds.has(managerKey)) {
      return [];
    }
    visitedManagerIds.add(managerKey);

    const manager = await EmployeeHub.findById(managerId).select('role');
    
    if (!manager) {
      return [];
    }
    
    // Get direct reports
    const directReports = await EmployeeHub.find({ managerId })
      .select('firstName lastName email employeeId jobTitle department managerId role isActive status')
      .lean();
    
    if (!includeIndirect) {
      return directReports;
    }
    
    // For managerial roles, get indirect reports recursively
    if (['manager', 'senior-manager', 'admin', 'super-admin', 'hr'].includes(manager.role)) {
      let allSubordinates = [...directReports];
      
      for (const employee of directReports) {
        const subSubordinates = await this.getSubordinates(employee._id, true, visitedManagerIds);
        allSubordinates = [...allSubordinates, ...subSubordinates];
      }

      // Ensure unique members by _id in case hierarchy traversal yields duplicates.
      const uniqueById = new Map();
      allSubordinates.forEach((member) => {
        const memberId = String(member?._id || '');
        if (memberId && !uniqueById.has(memberId)) {
          uniqueById.set(memberId, member);
        }
      });
      
      return Array.from(uniqueById.values());
    }
    
    return directReports;
  } catch (error) {
    console.error('Error in getSubordinates:', error);
    return [];
  }
};

/**
 * Get pending approvals for a manager
 * @param {String|ObjectId} managerId - The manager's ID
 * @returns {Object} - Object with leaves and expenses arrays
 */
exports.getPendingApprovalsForManager = async (managerId) => {
  try {
    const LeaveRecord = require('../models/LeaveRecord');
    const Expense = require('../models/Expense');
    
    const manager = await EmployeeHub.findById(managerId).select('role');
    
    if (!manager) {
      return { leaves: [], expenses: [] };
    }
    
    // Get all subordinates based on role
    const includeIndirect = ['manager', 'senior-manager', 'admin', 'super-admin', 'hr'].includes(manager.role);
    const subordinates = await this.getSubordinates(managerId, includeIndirect);
    const subordinateIds = subordinates.map(e => e._id);
    
    // Build queries based on role
    let leaveQuery = { status: 'pending' };
    let expenseQuery = { status: 'pending' };
    
    if (manager.role === 'admin' || manager.role === 'super-admin') {
      // Admin sees all pending approvals
      leaveQuery = { status: 'pending' };
      expenseQuery = { status: 'pending' };
    } else {
      // Other roles see only their subordinates
      leaveQuery = { user: { $in: subordinateIds }, status: 'pending' };
      expenseQuery = { employee: { $in: subordinateIds }, status: 'pending' };
    }
    
    // Get pending leaves
    const leaves = await LeaveRecord.find(leaveQuery)
      .populate('user', 'firstName lastName employeeId email jobTitle')
      .sort({ createdAt: -1 })
      .lean();
    
    // Get pending expenses
    const expenses = await Expense.find(expenseQuery)
      .populate('employee', 'firstName lastName employeeId email jobTitle')
      .sort({ createdAt: -1 })
      .lean();
    
    return { leaves, expenses };
  } catch (error) {
    console.error('Error in getPendingApprovalsForManager:', error);
    return { leaves: [], expenses: [] };
  }
};

/**
 * Get approval authority level for a user
 * @param {String|ObjectId} userId - The user's ID
 * @returns {Object} - Object with role and permission flags
 */
exports.getApprovalAuthority = async (userId) => {
  try {
    const user = await EmployeeHub.findById(userId).select('role firstName lastName employeeId');
    
    if (!user) {
      return {
        role: null,
        canApproveLeave: false,
        canApproveExpense: false,
        canMarkAsPaid: false,
        isManager: false,
        isSeniorManager: false,
        isHR: false,
        isAdmin: false
      };
    }
    
    const roleHierarchy = {
      'employee': 1,
      'manager': 2,
      'senior-manager': 3,
      'hr': 3,
      'admin': 4,
      'super-admin': 5
    };
    
    const authorityLevel = roleHierarchy[user.role] || 1;
    
    return {
      role: user.role,
      authorityLevel,
      canApproveLeave: authorityLevel >= 2, // Manager and above
      canApproveExpense: authorityLevel >= 2,
      canMarkAsPaid: ['admin', 'super-admin'].includes(user.role),
      isManager: authorityLevel >= 2,
      isSeniorManager: user.role === 'senior-manager',
      isHR: user.role === 'hr',
      isAdmin: ['admin', 'super-admin'].includes(user.role),
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        employeeId: user.employeeId
      }
    };
  } catch (error) {
    console.error('Error in getApprovalAuthority:', error);
    return {
      role: null,
      canApproveLeave: false,
      canApproveExpense: false,
      canMarkAsPaid: false,
      isManager: false,
      isSeniorManager: false,
      isHR: false,
      isAdmin: false
    };
  }
};

/**
 * Check whether actor can access target employee data
 * @param {String|ObjectId} actorId
 * @param {String|ObjectId} targetEmployeeId
 * @param {Object} actor Optional actor payload with role
 * @returns {Boolean}
 */
exports.canAccessEmployee = async (actorId, targetEmployeeId, actor = null) => {
  try {
    if (!actorId || !targetEmployeeId) return false;

    if (actorId.toString() === targetEmployeeId.toString()) {
      return true;
    }

    const actorEmployee = actor && actor.role
      ? actor
      : await EmployeeHub.findById(actorId).select('role _id');

    if (!actorEmployee) return false;

    if (['admin', 'super-admin', 'hr'].includes(actorEmployee.role)) {
      return true;
    }

    if (['manager', 'senior-manager'].includes(actorEmployee.role)) {
      const includeIndirect = actorEmployee.role === 'senior-manager';
      const subordinates = await this.getSubordinates(actorId, includeIndirect);
      return subordinates.some((member) => String(member?._id) === String(targetEmployeeId));
    }

    return false;
  } catch (error) {
    console.error('Error in canAccessEmployee:', error);
    return false;
  }
};

/**
 * Get team data for manager dashboard
 * @param {String|ObjectId} managerId
 * @param {String} role Optional role hint
 * @returns {Object|null}
 */
exports.getTeamData = async (managerId, role = null) => {
  try {
    const manager = await EmployeeHub.findById(managerId)
      .select('firstName lastName email role department managerId _id')
      .lean();
    if (!manager) return null;

    const managerRole = role || manager.role;
    const includeIndirect = ['senior-manager', 'admin', 'super-admin', 'hr'].includes(managerRole);
    const teamMembers = await this.getSubordinates(managerId, includeIndirect);

    return {
      manager,
      teamMembers,
      teamSize: teamMembers.length,
      roles: [...new Set(teamMembers.map((m) => m.role).filter(Boolean))],
      activeMembers: teamMembers.filter((m) => m.isActive !== false).length
    };
  } catch (error) {
    console.error('Error in getTeamData:', error);
    return null;
  }
};

module.exports = exports;
