/**
 * Employee Service
 * 
 * Provides unified employee counting and management logic across the application.
 * This service ensures consistent employee counts between Home page and Employee Hub.
 * 
 * Definition of EMPLOYEE:
 * - Base source: EmployeesHub collection
 * - Conditions: isActive=true AND status≠'Terminated'
 * - EXCLUDES: Employees whose email matches a User with role='profile'
 * - INCLUDES: Admin/super-admin users from User collection (if not already in EmployeesHub)
 * - Deduplication: Strict lowercase email matching
 */

const EmployeeHub = require('../models/EmployeesHub');
const User = require('../models/User');

/**
 * Get the count of active employees
 * 
 * This function implements the unified employee counting logic that should be used
 * across all endpoints to ensure consistency.
 * 
 * Algorithm:
 * 1. Query EmployeesHub for active, non-terminated employees
 * 2. Query User collection for profile users (role='profile')
 * 3. Filter out EmployeesHub records whose email matches profile users
 * 4. Query User collection for active admin/super-admin users
 * 5. Add unique admins (not already in EmployeesHub) to the count
 * 6. Return final count
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.includeProfiles - If true, don't filter out profile users (default: false)
 * @param {boolean} options.includeAdmins - If true, include standalone admin users (default: true)
 * @returns {Promise<number>} - The total count of active employees
 */
exports.getActiveEmployeeCount = async (options = {}) => {
  try {
    const { includeProfiles = false, includeAdmins = true } = options;

    // Step 1: Get base EmployeesHub records
    // Query: isActive=true AND status≠'Terminated'
    const baseQuery = {
      isActive: true,
      status: { $ne: 'Terminated' }
    };

    const employees = await EmployeeHub.find(baseQuery)
      .select('email')
      .lean();

    let employeeCount = employees.length;

    // Step 2: Filter out profile users (unless includeProfiles=true)
    let filteredEmployeeEmails = new Set(
      employees.map(emp => emp.email ? emp.email.toLowerCase() : null).filter(Boolean)
    );

    if (!includeProfiles) {
      // Get all profile users from User collection
      const profileUsers = await User.find({ role: 'profile' })
        .select('email')
        .lean();

      const profileEmails = new Set(
        profileUsers.map(u => u.email ? u.email.toLowerCase() : null).filter(Boolean)
      );

      // Remove profile user emails from employee set
      const originalCount = filteredEmployeeEmails.size;
      filteredEmployeeEmails = new Set(
        Array.from(filteredEmployeeEmails).filter(email => !profileEmails.has(email))
      );

      // Update count after filtering
      employeeCount = filteredEmployeeEmails.size;
      
      const removedCount = originalCount - employeeCount;
      if (removedCount > 0) {
        console.log(`[EmployeeService] Filtered out ${removedCount} profile user(s) from employee count`);
      }
    }

    // Step 3: Add standalone admin users (if includeAdmins=true)
    if (includeAdmins) {
      // Get all active admin/super-admin users from User collection
      const adminUsers = await User.find({
        role: { $in: ['admin', 'super-admin'] },
        isActive: { $ne: false },
        deleted: { $ne: true }
      })
        .select('email')
        .lean();

      // Count unique admins not already in EmployeesHub
      let uniqueAdminCount = 0;
      for (const admin of adminUsers) {
        if (admin.email) {
          const emailLower = admin.email.toLowerCase();
          if (!filteredEmployeeEmails.has(emailLower)) {
            uniqueAdminCount++;
            // Add to set to prevent counting duplicates in admin list
            filteredEmployeeEmails.add(emailLower);
          }
        }
      }

      if (uniqueAdminCount > 0) {
        console.log(`[EmployeeService] Added ${uniqueAdminCount} standalone admin user(s) to employee count`);
      }

      employeeCount += uniqueAdminCount;
    }

    console.log(`[EmployeeService] Final employee count: ${employeeCount}`);
    return employeeCount;

  } catch (error) {
    console.error('[EmployeeService] Error calculating active employee count:', error);
    throw new Error(`Failed to get active employee count: ${error.message}`);
  }
};

/**
 * Get the list of active employees with full details
 * 
 * Similar to getActiveEmployeeCount but returns the full employee objects
 * instead of just the count. Useful for endpoints that need employee details.
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.includeProfiles - If true, don't filter out profile users (default: false)
 * @param {boolean} options.includeAdmins - If true, include standalone admin users (default: true)
 * @returns {Promise<Array>} - Array of employee objects
 */
exports.getActiveEmployees = async (options = {}) => {
  try {
    const { includeProfiles = false, includeAdmins = true } = options;

    // Step 1: Get base EmployeesHub records
    const baseQuery = {
      isActive: true,
      status: { $ne: 'Terminated' }
    };

    let employees = await EmployeeHub.find(baseQuery)
      .select('firstName lastName email employeeId department jobTitle role status isActive')
      .lean();

    // Step 2: Filter out profile users (unless includeProfiles=true)
    if (!includeProfiles) {
      const profileUsers = await User.find({ role: 'profile' })
        .select('email')
        .lean();

      const profileEmails = new Set(
        profileUsers.map(u => u.email ? u.email.toLowerCase() : null).filter(Boolean)
      );

      employees = employees.filter(emp => 
        emp.email && !profileEmails.has(emp.email.toLowerCase())
      );
    }

    // Step 3: Add standalone admin users (if includeAdmins=true)
    if (includeAdmins) {
      const existingEmails = new Set(
        employees.map(e => e.email ? e.email.toLowerCase() : null).filter(Boolean)
      );

      const adminUsers = await User.find({
        role: { $in: ['admin', 'super-admin'] },
        isActive: { $ne: false },
        deleted: { $ne: true }
      })
        .select('firstName lastName email role department jobTitle')
        .lean();

      // Map admin users to employee format and filter out duplicates
      const uniqueAdmins = adminUsers
        .filter(u => u.email && !existingEmails.has(u.email.toLowerCase()))
        .map(u => ({
          _id: u._id,
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          email: u.email,
          role: u.role,
          department: u.department || '-',
          jobTitle: u.jobTitle || '-',
          employeeId: '-',
          status: 'Active',
          isActive: true,
          isAdmin: true // Flag to indicate this came from User collection
        }));

      employees.push(...uniqueAdmins);
    }

    return employees;

  } catch (error) {
    console.error('[EmployeeService] Error getting active employees:', error);
    throw new Error(`Failed to get active employees: ${error.message}`);
  }
};

/**
 * Validate employee count consistency
 * 
 * Diagnostic function to check if employee counts are consistent across collections
 * and identify potential data integrity issues.
 * 
 * @returns {Promise<Object>} - Diagnostic information about employee counts
 */
exports.validateEmployeeCountConsistency = async () => {
  try {
    // Raw counts
    const totalEmployeesHub = await EmployeeHub.countDocuments();
    const totalUsers = await User.countDocuments();
    
    // Active employee counts
    const activeEmployeesHub = await EmployeeHub.countDocuments({
      isActive: true,
      status: { $ne: 'Terminated' }
    });

    // Profile users
    const profileUserCount = await User.countDocuments({ role: 'profile' });

    // Admin users
    const adminUserCount = await User.countDocuments({
      role: { $in: ['admin', 'super-admin'] },
      isActive: { $ne: false },
      deleted: { $ne: true }
    });

    // Get unified count using service method
    const unifiedCount = await this.getActiveEmployeeCount({
      includeProfiles: false,
      includeAdmins: true
    });

    // Check for duplicate emails in EmployeesHub
    const employeeEmails = await EmployeeHub.find()
      .select('email')
      .lean();
    
    const emailCounts = {};
    employeeEmails.forEach(emp => {
      if (emp.email) {
        const emailLower = emp.email.toLowerCase();
        emailCounts[emailLower] = (emailCounts[emailLower] || 0) + 1;
      }
    });
    
    const duplicateEmails = Object.entries(emailCounts)
      .filter(([email, count]) => count > 1)
      .map(([email, count]) => ({ email, count }));

    return {
      rawCounts: {
        totalEmployeesHub,
        totalUsers,
        activeEmployeesHub,
        profileUserCount,
        adminUserCount
      },
      unifiedCount,
      dataIntegrityIssues: {
        duplicateEmailsInEmployeesHub: duplicateEmails.length,
        duplicateEmails: duplicateEmails.slice(0, 10) // Show first 10
      },
      formula: '(Active EmployeesHub - Profile Users) + Standalone Admins',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('[EmployeeService] Error validating consistency:', error);
    throw new Error(`Failed to validate employee count consistency: ${error.message}`);
  }
};
