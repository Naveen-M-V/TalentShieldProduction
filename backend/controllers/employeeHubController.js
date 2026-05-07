const mongoose = require('mongoose');
const EmployeeHub = require('../models/EmployeesHub');
const Team = require('../models/Team');
const User = require('../models/User');
const TimeEntry = require('../models/TimeEntry');
const ShiftAssignment = require('../models/ShiftAssignment');
const LeaveRecord = require('../models/LeaveRecord');
const crypto = require('crypto');
const { sendUserCredentialsEmail } = require('../utils/emailService');
const hierarchyHelper = require('../utils/hierarchyHelper');
const { ROLE_VALUES, PRIVILEGED_ROLES, MANAGER_ROLES, ADMIN_ROLES } = require('../utils/roles');
const { resolveActorId } = require('../utils/identityHelper');
const { ensureMyDocumentsFolder } = require('../utils/documentFolderHelpers');
const {
  normalizeEthnicity,
  normalizeEmergencyContactRelationship
} = require('../utils/employeeFieldOptions');

const resolveRequesterEmployee = async (req) => {
  const authId = resolveActorId(req);
  if (authId && mongoose.Types.ObjectId.isValid(String(authId))) {
    const employee = await EmployeeHub.findById(authId)
      .select('_id role email managerId managerIds department team')
      .lean();
    if (employee) return employee;
  }

  const email = req.user?.email || req.session?.user?.email;
  if (email) {
    const byEmail = await EmployeeHub.findOne({ email: String(email).trim().toLowerCase() })
      .select('_id role email managerId managerIds department team')
      .lean();
    if (byEmail) return byEmail;
  }

  return null;
};

const resolveRequesterRole = (req, requesterEmployee) => {
  return req.user?.role || req.session?.user?.role || requesterEmployee?.role || null;
};

const getCurrentLeaveYearWindow = (date = new Date()) => {
  const currentYear = date.getFullYear();
  const month = date.getMonth();
  const leaveYearStart = month >= 3 ? new Date(currentYear, 3, 1) : new Date(currentYear - 1, 3, 1);
  const leaveYearEnd = month >= 3 ? new Date(currentYear + 1, 2, 31) : new Date(currentYear, 2, 31);
  return { leaveYearStart, leaveYearEnd };
};

const ASSIGNABLE_EMPLOYEE_ROLES = [ROLE_VALUES.EMPLOYEE, ROLE_VALUES.MANAGER];

const normalizeManagerIdArray = (value) => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  const normalized = raw
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  return [...new Set(normalized)];
};

const getTeamManagerIds = async (teamName, excludeEmployeeId = null) => {
  const normalizedTeam = String(teamName || '').trim();
  if (!normalizedTeam) return [];

  const query = {
    team: normalizedTeam,
    role: ROLE_VALUES.MANAGER,
    isActive: true,
    status: { $ne: 'Terminated' }
  };

  if (excludeEmployeeId && mongoose.Types.ObjectId.isValid(String(excludeEmployeeId))) {
    query._id = { $ne: String(excludeEmployeeId) };
  }

  const managers = await EmployeeHub.find(query).select('_id').lean();
  return [...new Set(managers.map((m) => String(m._id)).filter(Boolean))];
};

/**
 * Get organizational hierarchy tree
 */
exports.getOrganizationalChart = async (req, res) => {
  try {
    // Find all employees who are active and populate their managers
    const employees = await EmployeeHub.find({
      isActive: true,
      status: { $ne: 'Terminated' }
    })
      .populate('managerId', 'firstName lastName jobTitle department')
      .sort({ firstName: 1, lastName: 1 });

    // Create a map for quick lookup
    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp._id.toString()] = {
        ...emp.toObject(),
        directReports: []
      };
    });

    // Build the hierarchy tree
    const roots = [];
    employees.forEach(emp => {
      const empId = emp._id.toString();
      if (emp.managerId) {
        const managerId = emp.managerId._id.toString();
        if (employeeMap[managerId]) {
          employeeMap[managerId].directReports.push(employeeMap[empId]);
        }
      } else {
        roots.push(employeeMap[empId]);
      }
    });

    // Function to recursively build tree structure
    const buildTreeNode = (employee) => {
      return {
        id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        fullName: `${employee.firstName} ${employee.lastName}`,
        jobTitle: employee.jobTitle,
        department: employee.department,
        team: employee.team,
        email: employee.email,
        avatar: employee.avatar,
        initials: employee.initials,
        color: employee.color,
        managerId: employee.managerId?._id,
        managerName: employee.managerId ?
          `${employee.managerId.firstName} ${employee.managerId.lastName}` : null,
        directReports: employee.directReports.map(buildTreeNode),
        directReportsCount: employee.directReports.length
      };
    };

    const orgChart = roots.map(buildTreeNode);

    res.status(200).json({
      success: true,
      data: orgChart,
      totalEmployees: employees.length,
      hierarchyLevels: calculateHierarchyLevels(roots)
    });
  } catch (error) {
    console.error('Error fetching organizational chart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organizational chart',
      error: error.message
    });
  }
};

/**
 * Get direct reports for a specific manager
 */
exports.getDirectReports = async (req, res) => {
  try {
    const { managerId } = req.params;
    const requesterEmployee = await resolveRequesterEmployee(req);
    const requesterRole = resolveRequesterRole(req, requesterEmployee);

    // Managers can view only their own direct reports
    if (MANAGER_ROLES.includes(requesterRole)) {
      if (!requesterEmployee?._id || requesterEmployee._id.toString() !== managerId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Can only view direct reports for your own account'
        });
      }
    }

    const directReports = await EmployeeHub.find({
      managerId: managerId,
      isActive: true,
      status: { $ne: 'Terminated' }
    })
      .populate('managerId', 'firstName lastName')
      .sort({ firstName: 1, lastName: 1 });

    res.status(200).json({
      success: true,
      data: directReports,
      count: directReports.length
    });
  } catch (error) {
    console.error('Error fetching direct reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch direct reports',
      error: error.message
    });
  }
};

/**
 * Update employee's manager
 */
exports.updateEmployeeManager = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { managerId } = req.body;

    // Validate employee exists
    const employee = await EmployeeHub.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Validate manager exists (if provided)
    if (managerId) {
      const manager = await EmployeeHub.findById(managerId);
      if (!manager) {
        return res.status(404).json({
          success: false,
          message: 'Manager not found'
        });
      }

      // Prevent circular reporting (employee cannot be their own manager)
      if (managerId === employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Employee cannot be their own manager'
        });
      }

      // Check for circular reporting in the chain
      const isCircular = await checkCircularReporting(managerId, employeeId);
      if (isCircular) {
        return res.status(400).json({
          success: false,
          message: 'This would create a circular reporting relationship'
        });
      }
    }

    // Update the employee's manager
    const updatedEmployee = await EmployeeHub.findByIdAndUpdate(
      employeeId,
      { managerId: managerId || null },
      { new: true, runValidators: true }
    ).populate('managerId', 'firstName lastName jobTitle');

    res.status(200).json({
      success: true,
      message: 'Employee manager updated successfully',
      data: updatedEmployee
    });
  } catch (error) {
    console.error('Error updating employee manager:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update employee manager',
      error: error.message
    });
  }
};

/**
 * Helper function to calculate hierarchy levels
 */
function calculateHierarchyLevels(roots, level = 1) {
  let maxLevel = level;
  roots.forEach(root => {
    if (root.directReports && root.directReports.length > 0) {
      const childLevel = calculateHierarchyLevels(root.directReports, level + 1);
      maxLevel = Math.max(maxLevel, childLevel);
    }
  });
  return maxLevel;
}

/**
 * Helper function to check for circular reporting
 */
async function checkCircularReporting(managerId, employeeId, visited = new Set()) {
  if (visited.has(managerId)) {
    return true; // Circular reference detected
  }

  visited.add(managerId);

  // Get the manager's current manager
  const manager = await EmployeeHub.findById(managerId).select('managerId');
  if (!manager || !manager.managerId) {
    return false; // Reached top of hierarchy
  }

  // If we reach the original employee, it's circular
  if (manager.managerId.toString() === employeeId) {
    return true;
  }

  // Recursively check up the chain
  return await checkCircularReporting(manager.managerId, employeeId, visited);
}

/**
 * Get employee by userId (for My Profile page)
 */
exports.getEmployeeByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const employee = await EmployeeHub.findOne({
      userId: userId,
      isActive: true,
      status: { $ne: 'Terminated' }
    }).populate('managerId', 'firstName lastName jobTitle');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Error fetching employee by userId:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee',
      error: error.message
    });
  }
};

/**
 * Get employee by email (fallback for My Profile page)
 */
exports.getEmployeeByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = email.toLowerCase().trim();

    const employee = await EmployeeHub.findOne({
      email: normalizedEmail,
      isActive: true,
      status: { $ne: 'Terminated' }
    }).populate('managerId', 'firstName lastName jobTitle');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Error fetching employee by email:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee',
      error: error.message
    });
  }
};

/**
 * Get all employees
 */
exports.getAllEmployees = async (req, res) => {
  try {
    const { team, department, status, search, approvers, role, includeAdmins } = req.query;
    const requesterEmployee = await resolveRequesterEmployee(req);
    const requesterRole = resolveRequesterRole(req, requesterEmployee);

    // Build query - default to active employees only
    let query = { isActive: true, status: { $ne: 'Terminated' } };

    // If requesting approvers, filter by specific roles
    if (approvers === 'true') {
      query.role = { $in: ['manager', 'senior-manager', 'hr', 'admin', 'super-admin'] };
    }
    
    // If specific roles are requested (comma-separated)
    if (role) {
      const roles = role.split(',').map(r => r.trim());
      query.role = { $in: roles };
    }

    if (team) query.team = team;
    if (department) query.department = department;
    // Include terminated employees in "All" view, but filter them out when specific status is selected
    if (status && status !== 'All') {
      query.status = status;
      // For specific status filters (except "Terminated"), only show active employees
      if (status !== 'Terminated') {
        query.isActive = true;
      }
    }

    // Search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { jobTitle: { $regex: search, $options: 'i' } }
      ];
    }

    // Manager scope: restrict to their team members only
    if (MANAGER_ROLES.includes(requesterRole)) {
      if (!requesterEmployee?._id) {
        return res.status(400).json({
          success: false,
          message: 'Requester employee record not found. Please link your account to EmployeeHub.'
        });
      }

      const includeIndirect = requesterRole === 'senior-manager';
      const teamMembers = await hierarchyHelper.getSubordinates(requesterEmployee._id, includeIndirect);
      const teamIds = teamMembers.map((member) => member._id);

      // Empty result fast path
      if (!teamIds.length) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }

      query._id = { $in: teamIds };
    }

    const employees = await EmployeeHub.find(query)
      .populate('managerId', 'firstName lastName')
      .sort({ firstName: 1, lastName: 1 });

    // Filter out profile users (those with User.role='profile')
    // Get all profile user emails from User collection
    const profileUsers = await User.find({ role: 'profile' }).select('email');
    const profileEmails = profileUsers.map(u => u.email.toLowerCase());
    
    // Filter out employees whose emails match profile users
    const filteredEmployees = employees.filter(emp => 
      !profileEmails.includes(emp.email.toLowerCase())
    );

    const shouldIncludeAdmins = includeAdmins === 'true' && PRIVILEGED_ROLES.includes(requesterRole);
    if (shouldIncludeAdmins) {
      const existingEmails = new Set(
        filteredEmployees
          .map(e => e.email)
          .filter(Boolean)
          .map(e => e.toLowerCase())
      );

      const adminUsers = await User.find({
        role: { $in: ADMIN_ROLES },
        isActive: { $ne: false },
        deleted: { $ne: true }
      })
        .select('firstName lastName email role department jobTitle')
        .lean();

      const mappedAdmins = adminUsers
        .filter(u => u.email && !existingEmails.has(u.email.toLowerCase()))
        .map(u => ({
          _id: u._id,
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          email: u.email,
          role: u.role,
          department: u.department || '-',
          jobTitle: u.jobTitle || '-',
          team: '-',
          office: '-',
          status: 'Active',
          isActive: true,
          isAdmin: true
        }));

      filteredEmployees.push(...mappedAdmins);
    }

    res.status(200).json({
      success: true,
      count: filteredEmployees.length,
      data: filteredEmployees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching employees',
      error: error.message
    });
  }
};

/**
 * Get EmployeeHub records merged with live clock status.
 */
exports.getEmployeesWithClockStatus = async (req, res) => {
  try {
    console.log('🔍 Fetching employees for Rota...');
    const requesterEmployee = await resolveRequesterEmployee(req);
    const requesterRole = resolveRequesterRole(req, requesterEmployee);

    // Simple query without populate first
    const employees = await EmployeeHub.find({}).lean();
    console.log(`🔍 Found ${employees.length} employees in EmployeeHub`);

    // Filter out profile users (those with User.role='profile')
    // Get all profile user emails from User collection
    const profileUsers = await User.find({ role: 'profile' }).select('email');
    const profileEmails = profileUsers.map(u => u.email.toLowerCase());
    
    // Filter out employees whose emails match profile users
    const filteredEmployees = employees.filter(emp => 
      !profileEmails.includes(emp.email.toLowerCase())
    );

    console.log(`🔍 After filtering profiles: ${filteredEmployees.length} employees (removed ${employees.length - filteredEmployees.length} profile users)`);

    let scopedEmployees = filteredEmployees;

    // Manager/senior-manager scope: only their own team members
    if (MANAGER_ROLES.includes(requesterRole)) {
      if (!requesterEmployee?._id) {
        return res.status(200).json({ success: true, data: [] });
      }

      const includeIndirect = requesterRole === 'senior-manager';
      const subordinates = await hierarchyHelper.getSubordinates(requesterEmployee._id, includeIndirect);
      const teamIds = new Set(subordinates.map(member => String(member._id)));
      scopedEmployees = filteredEmployees.filter(emp => teamIds.has(String(emp._id)));
    }

    // Map employees to expected format
    const result = scopedEmployees.map(emp => {
      return {
        id: emp._id,
        _id: emp._id,
        firstName: emp.firstName || 'Unknown',
        lastName: emp.lastName || 'Unknown',
        email: emp.email || '',
        role: emp.role || 'employee',
        name: `${emp.firstName || 'Unknown'} ${emp.lastName || 'Unknown'}`
      };
    });

    console.log(`✅ Returning ${result.length} employees for Rota system`);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error fetching employees:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching employees',
      error: error.message
    });
  }
};

/**
 * Get a single employee by ID
 */
exports.getEmployeeById = async (req, res) => {
  try {
    console.log('getEmployeeById called with ID:', req.params.id);
    console.log('ID type:', typeof req.params.id);
    console.log('ID length:', req.params.id?.length);

    // Validate ObjectId format
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error('Invalid ObjectId format:', req.params.id);
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format',
        receivedId: req.params.id
      });
    }

    const employee = await EmployeeHub.findById(req.params.id)
      .populate('managerId', 'firstName lastName email jobTitle department office workLocation avatar initials color');

    if (!employee) {
      console.log('Employee not found with ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const requesterEmployee = await resolveRequesterEmployee(req);
    const requesterRole = resolveRequesterRole(req, requesterEmployee);
    const isPrivileged = PRIVILEGED_ROLES.includes(requesterRole);

    if (!isPrivileged) {
      if (!requesterEmployee?._id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const canAccess = await hierarchyHelper.canAccessEmployee(
        requesterEmployee._id,
        employee._id,
        { _id: requesterEmployee._id, role: requesterRole }
      );

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    console.log('Employee found:', employee.firstName, employee.lastName);
    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    console.error('Error name:', error.name);
    console.error('Error stack:', error.stack);

    // Handle CastError specifically (invalid ObjectId format)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching employee',
      error: error.message
    });
  }
};

/**
 * Create a new employee with automatic credentials
 * Updated for new architecture: EmployeesHub only with built-in authentication
 */
exports.createEmployee = async (req, res) => {
  try {
    const employeeData = req.body;
    console.log('🔍 Incoming employee data:', JSON.stringify(employeeData, null, 2));
    console.log('🔍 CRITICAL - Address fields in req.body:', {
      address1: req.body.address1,
      address2: req.body.address2,
      address3: req.body.address3,
      townCity: req.body.townCity,
      county: req.body.county,
      postcode: req.body.postcode
    });
    console.log('🔍 CRITICAL - Emergency contact fields in req.body:', {
      emergencyContactName: req.body.emergencyContactName,
      emergencyContactRelation: req.body.emergencyContactRelation,
      emergencyContactPhone: req.body.emergencyContactPhone,
      emergencyContactEmail: req.body.emergencyContactEmail
    });

    const normalizedEmail = employeeData.email?.toString().trim().toLowerCase();
    if (!normalizedEmail) {
      console.log('❌ Email validation failed - missing email');
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    employeeData.email = normalizedEmail;
    employeeData.ethnicity = normalizeEthnicity(employeeData.ethnicity);
    employeeData.emergencyContactRelation = normalizeEmergencyContactRelationship(employeeData.emergencyContactRelation);

    // Driver & Identity Verification validation (employee creation)
    const isFutureDate = (value) => {
      if (!value) return false;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      return d > today;
    };

    const licenceTypes = [
      'NA',
      'Full UK Manual Licence',
      'Full UK Automatic Licence',
      'Provisional Licence'
    ];

    const selectedLicenceType = (employeeData.licenceType || '').toString().trim();
    const licenceNumber = (employeeData.licenceNumber || '').toString().trim().toUpperCase();
    const passportNumber = (employeeData.passportNumber || '').toString().trim();
    const niNumber = (employeeData.niNumber || '').toString().trim().toUpperCase();
    const isUKCitizen = employeeData.isUKCitizen !== undefined ? Boolean(employeeData.isUKCitizen) : true;
    const visaNumber = (employeeData.visaNumber || '').toString().trim();

    if (selectedLicenceType && !licenceTypes.includes(selectedLicenceType)) {
      return res.status(400).json({ success: false, message: 'Driving licence type must be valid when provided' });
    }

    const shouldValidateLicenceDetails = Boolean(selectedLicenceType && selectedLicenceType !== 'NA');

    if (shouldValidateLicenceDetails) {
      if (!licenceNumber || !/^[A-Z]{5}\d{6}[A-Z0-9]{5}$/.test(licenceNumber)) {
        return res.status(400).json({ success: false, message: 'Driving licence number format is invalid' });
      }

      if (!employeeData.licenceExpiryDate || !isFutureDate(employeeData.licenceExpiryDate)) {
        return res.status(400).json({ success: false, message: 'Driving licence expiry date must be a future date' });
      }
    }

    const penaltyPoints = Number(employeeData.penaltyPoints ?? 0);
    if (Number.isNaN(penaltyPoints) || penaltyPoints < 0 || penaltyPoints > 14) {
      return res.status(400).json({ success: false, message: 'Penalty points must be between 0 and 14' });
    }

    if (passportNumber && !/^[A-Za-z0-9]+$/.test(passportNumber)) {
      return res.status(400).json({ success: false, message: 'Passport number must be alphanumeric' });
    }

    if (employeeData.passportExpiryDate && !isFutureDate(employeeData.passportExpiryDate)) {
      return res.status(400).json({ success: false, message: 'Passport expiry date must be a future date' });
    }

    if (niNumber && !/^[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Z]$/i.test(niNumber)) {
      return res.status(400).json({ success: false, message: 'NI number must follow format AA 12 34 56 A' });
    }

    if (visaNumber && !/^[A-Za-z0-9]+$/.test(visaNumber)) {
      return res.status(400).json({ success: false, message: 'Visa number must be alphanumeric' });
    }

    if (employeeData.visaExpiryDate && !isFutureDate(employeeData.visaExpiryDate)) {
      return res.status(400).json({ success: false, message: 'Visa expiry date must be a future date' });
    }

    // Check if employee with same email already exists in EmployeeHub only
    const existingEmployee = await EmployeeHub.findOne({ email: normalizedEmail });
    if (existingEmployee) {
      console.log('❌ Employee already exists with email:', normalizedEmail);
      return res.status(400).json({
        success: false,
        message: 'Employee with this email already exists'
      });
    }

    // Generate sequential employee ID
    const generateSequentialEmployeeId = async () => {
      try {
        // Find the highest existing employee ID
        const lastEmployee = await EmployeeHub.findOne({
          employeeId: { $regex: /^EMP\d+$/ }
        }).sort({ employeeId: -1 }).limit(1);

        let nextNumber = 1001; // Start from EMP1001

        if (lastEmployee && lastEmployee.employeeId) {
          // Extract number from last employee ID (e.g., EMP1001 -> 1001)
          const lastNumber = parseInt(lastEmployee.employeeId.replace('EMP', ''));
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }

        return `EMP${nextNumber}`;
      } catch (error) {
        console.error('Error generating sequential employee ID:', error);
        // Fallback to random generation if there's an error
        const min = 1000;
        const max = 9999;
        return `EMP${Math.floor(Math.random() * (max - min + 1)) + min}`;
      }
    };

    // Generate unique sequential employee ID
    const employeeId = await generateSequentialEmployeeId();
    console.log('🔍 Generated employee ID:', employeeId);

    // Generate secure temporary password
    const temporaryPassword = crypto.randomBytes(8).toString('hex');

    // Add employee ID, password, and default values
    employeeData.employeeId = employeeId;
    employeeData.password = temporaryPassword; // Will be hashed by pre-save hook
    employeeData.role = employeeData.role || 'employee'; // Default to employee
    employeeData.isActive = true;
    employeeData.isEmailVerified = true;
    employeeData.mustChangePassword = true;

    if (!employeeData.startDate) {
      employeeData.startDate = new Date(); // Set current date as default
    }

    // ✅ KEEP flat fields for schema compatibility (address1, address2, etc.)
    // The schema has both flat fields AND nested objects, so we keep both
    // The flat fields remain unchanged from the incoming payload
    
    // Also create nested address object for backward compatibility (if needed)
    if (employeeData.address1 || employeeData.address2 || employeeData.townCity || employeeData.postcode || employeeData.county) {
      employeeData.address = {
        line1: employeeData.address1 || '',
        line2: employeeData.address2 || '',
        city: employeeData.townCity || '',
        postCode: employeeData.postcode || '',
        country: employeeData.county || 'United Kingdom'
      };
    }

    // Also create nested emergencyContact object for backward compatibility (if needed)
    if (employeeData.emergencyContactName || employeeData.emergencyContactPhone || employeeData.emergencyContactEmail) {
      employeeData.emergencyContact = {
        name: employeeData.emergencyContactName || '',
        relationship: employeeData.emergencyContactRelation || 'Emergency Contact',
        phone: employeeData.emergencyContactPhone || '',
        email: employeeData.emergencyContactEmail || ''
      };
    }

    // ✅ DO NOT delete flat fields - schema expects them
    // The flat fields (address1, address2, townCity, county, emergencyContactName, etc.)
    // are the PRIMARY storage in the schema

    console.log('🔍 Final employee data before save:', JSON.stringify(employeeData, null, 2));
    console.log('🔍 Address fields before save:', {
      address1: employeeData.address1,
      address2: employeeData.address2,
      address3: employeeData.address3,
      townCity: employeeData.townCity,
      county: employeeData.county,
      postcode: employeeData.postcode
    });
    console.log('🔍 Emergency contact fields before save:', {
      emergencyContactName: employeeData.emergencyContactName,
      emergencyContactRelation: employeeData.emergencyContactRelation,
      emergencyContactPhone: employeeData.emergencyContactPhone,
      emergencyContactEmail: employeeData.emergencyContactEmail
    });

    // Create new employee with built-in authentication
    const employee = await EmployeeHub.create(employeeData);
    console.log('✅ Employee created successfully:', employee.employeeId);

    // Ensure personal My Documents folder exists immediately on employee creation
    try {
      await ensureMyDocumentsFolder(employee._id);
      console.log('✅ My Documents folder ensured for employee:', employee.employeeId);
    } catch (folderErr) {
      console.error('❌ Failed to ensure My Documents folder on employee creation:', folderErr);
    }

    // Initialize annual leave balance for new employee using onboarding entitlement
    try {
      const AnnualLeaveBalance = require('../models/AnnualLeaveBalance');
      const actorId = resolveActorId(req);
      const { leaveYearStart, leaveYearEnd } = getCurrentLeaveYearWindow(new Date());
      const parsedEntitlement = Number(employee.leaveEntitlement);
      const entitlementDays = Number.isFinite(parsedEntitlement) && parsedEntitlement >= 0
        ? parsedEntitlement
        : 20;

      await AnnualLeaveBalance.findOneAndUpdate(
        { user: employee._id, leaveYearStart },
        {
          $set: {
            leaveYearEnd,
            entitlementDays,
            notes: actorId
              ? `Initial setup on onboarding (actor: ${actorId})`
              : 'Initial setup on onboarding'
          },
          $setOnInsert: {
            user: employee._id,
            carryOverDays: 0,
            usedDays: 0,
            adjustments: []
          }
        },
        { upsert: true, new: true }
      );
      console.log('✅ Annual leave balance initialized for employee:', employee.employeeId, 'entitlement:', entitlementDays);
    } catch (leaveErr) {
      console.error('❌ Failed to initialize annual leave balance:', leaveErr);
    }
    console.log('🔍 Saved address fields:', {
      address1: employee.address1,
      address2: employee.address2,
      address3: employee.address3,
      townCity: employee.townCity,
      county: employee.county,
      postcode: employee.postcode
    });
    console.log('🔍 Saved emergency contact fields:', {
      emergencyContactName: employee.emergencyContactName,
      emergencyContactRelation: employee.emergencyContactRelation,
      emergencyContactPhone: employee.emergencyContactPhone,
      emergencyContactEmail: employee.emergencyContactEmail
    });

    // Send credentials via email
    let credentialsEmailSent = false;
    try {
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
      const emailResult = await sendUserCredentialsEmail(
        employee.email,
        `${employee.firstName} ${employee.lastName}`,
        temporaryPassword,
        loginUrl
      );
      credentialsEmailSent = Boolean(emailResult?.success);
      if (credentialsEmailSent) {
        console.log('✅ Credentials email sent to:', employee.email);
      } else {
        console.warn('⚠️ Credentials email function returned unsuccessful status for:', employee.email);
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send credentials email:', emailError);
      // Continue with response even if email fails
    }

    // If team is specified, add employee to team
    if (employeeData.team) {
      const team = await Team.findOne({ name: employeeData.team });
      if (team) {
        await team.addMember(employee._id);
      }
    }

    // Return success response (no credentials in response for security)
    res.status(201).json({
      success: true,
      message: credentialsEmailSent
        ? 'Employee created successfully. Login credentials have been sent to their email.'
        : 'Employee created successfully, but credential email failed to send. Please share/reset credentials manually.',
      data: {
        id: employee._id,
        employeeId: employee.employeeId,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        department: employee.department,
        jobTitle: employee.jobTitle,
        isActive: employee.isActive,
        credentialsSent: credentialsEmailSent,
        temporaryPassword
      }
    });
  } catch (error) {
    console.error('❌ Employee creation error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Employee with this email already exists'
      });
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      console.error('❌ Validation errors:', errors);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating employee',
      error: error.message
    });
  }
};

/**
 * Update an employee
 */
exports.updateEmployee = async (req, res) => {
  try {
    const requesterEmployee = await resolveRequesterEmployee(req);
    const requesterRole = resolveRequesterRole(req, requesterEmployee);
    const isPrivileged = PRIVILEGED_ROLES.includes(requesterRole);
    const callerRole = req.user?.role || req.session?.user?.role || requesterRole;
    const isEmployeeCaller = callerRole === ROLE_VALUES.EMPLOYEE;

    const employee = await EmployeeHub.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    if (!isPrivileged) {
      if (!requesterEmployee?._id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const canAccess = await hierarchyHelper.canAccessEmployee(
        requesterEmployee._id,
        employee._id,
        { _id: requesterEmployee._id, role: requesterRole }
      );

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Cannot edit employees outside your team'
        });
      }

      // Non-privileged non-employee users (e.g. managers) cannot modify structural/security fields
      if (!isEmployeeCaller) {
        const restrictedFields = ['role', 'managerId', 'isActive', 'status', 'userId', 'password'];
        const attemptedRestricted = restrictedFields.find((field) => Object.prototype.hasOwnProperty.call(req.body, field));
        if (attemptedRestricted) {
          return res.status(403).json({
            success: false,
            message: `Managers cannot modify ${attemptedRestricted}`
          });
        }
      }
    }

    let updatePayload = { ...req.body };

    // Ignore empty values for constrained fields on partial updates
    const emptyOmittableFields = [
      'gender',
      'workLocation',
      'employmentType',
      'status',
      'role',
      'licenceType',
      'managerId',
      'team',
      'dateOfBirth',
      'startDate',
      'probationEndDate',
      'effectiveFrom',
      'passportExpiryDate',
      'licenceExpiryDate',
      'visaExpiryDate'
    ];

    emptyOmittableFields.forEach((field) => {
      if (updatePayload[field] === '' || updatePayload[field] === null) {
        delete updatePayload[field];
      }
    });

    if (Object.prototype.hasOwnProperty.call(updatePayload, 'ethnicity')) {
      updatePayload.ethnicity = normalizeEthnicity(updatePayload.ethnicity);
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, 'emergencyContactRelation')) {
      updatePayload.emergencyContactRelation = normalizeEmergencyContactRelationship(updatePayload.emergencyContactRelation);
    }

    const isFutureDate = (value) => {
      if (!value) return false;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      return d > today;
    };

    const licenceTypes = [
      'NA',
      'Full UK Manual Licence',
      'Full UK Automatic Licence',
      'Provisional Licence'
    ];

    const effectiveLicenceTypeRaw = Object.prototype.hasOwnProperty.call(updatePayload, 'licenceType')
      ? updatePayload.licenceType
      : employee.licenceType;
    const effectiveLicenceType = (effectiveLicenceTypeRaw || '').toString().trim();

    if (effectiveLicenceType && !licenceTypes.includes(effectiveLicenceType)) {
      return res.status(400).json({ success: false, message: 'Driving licence type must be valid when provided' });
    }

    const shouldValidateLicenceDetails = Boolean(effectiveLicenceType && effectiveLicenceType !== 'NA');
    const effectiveLicenceNumberRaw = Object.prototype.hasOwnProperty.call(updatePayload, 'licenceNumber')
      ? updatePayload.licenceNumber
      : employee.licenceNumber;
    const effectiveLicenceNumber = (effectiveLicenceNumberRaw || '').toString().trim().toUpperCase();
    const effectiveLicenceExpiryDate = Object.prototype.hasOwnProperty.call(updatePayload, 'licenceExpiryDate')
      ? updatePayload.licenceExpiryDate
      : employee.licenceExpiryDate;

    if (shouldValidateLicenceDetails) {
      if (!effectiveLicenceNumber || !/^[A-Z]{5}\d{6}[A-Z0-9]{5}$/.test(effectiveLicenceNumber)) {
        return res.status(400).json({ success: false, message: 'Driving licence number format is invalid' });
      }

      if (!effectiveLicenceExpiryDate || !isFutureDate(effectiveLicenceExpiryDate)) {
        return res.status(400).json({ success: false, message: 'Driving licence expiry date must be a future date' });
      }
    }

    // Employee users can only edit personal contact/profile fields.
    // Any non-editable fields sent by employee users are silently ignored.
    if (isEmployeeCaller && !isPrivileged) {
      const employeeEditableFields = new Set([
        'title',
        'firstName',
        'middleName',
        'lastName',
        'email',
        'phone',
        'workPhone',
        'emergencyContactName',
        'emergencyContactRelation',
        'emergencyContactPhone',
        'emergencyContactEmail',
        'address1',
        'address2',
        'address3',
        'townCity',
        'county',
        'postcode'
      ]);

      updatePayload = Object.fromEntries(
        Object.entries(updatePayload).filter(([key]) => employeeEditableFields.has(key))
      );
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, 'managerId') && updatePayload.managerId) {
      const managerIdStr = String(updatePayload.managerId);

      if (!mongoose.Types.ObjectId.isValid(managerIdStr)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manager ID'
        });
      }

      if (managerIdStr === String(employee._id)) {
        return res.status(400).json({
          success: false,
          message: 'Employee cannot report to themselves'
        });
      }

      const managerRecord = await EmployeeHub.findById(managerIdStr).select('_id role');
      if (!managerRecord) {
        return res.status(404).json({
          success: false,
          message: 'Selected manager was not found'
        });
      }

      if (!MANAGER_ROLES.includes(managerRecord.role)) {
        return res.status(400).json({
          success: false,
          message: 'Reports To must be set to a manager account'
        });
      }

      const isCircular = await checkCircularReporting(managerRecord._id.toString(), employee._id.toString());
      if (isCircular) {
        return res.status(400).json({
          success: false,
          message: 'This would create a circular reporting relationship'
        });
      }
    }

    const oldTeam = employee.team;
    const hasTeamUpdate = Object.prototype.hasOwnProperty.call(updatePayload, 'team');
    const newTeam = hasTeamUpdate ? updatePayload.team : oldTeam;

    // Update employee
    Object.assign(employee, updatePayload);
    await employee.save();

    // Update team memberships if team changed
    if (hasTeamUpdate && oldTeam !== newTeam) {
      // Remove from old team
      if (oldTeam) {
        const oldTeamDoc = await Team.findOne({ name: oldTeam });
        if (oldTeamDoc) {
          await oldTeamDoc.removeMember(employee._id);
        }
      }

      // Add to new team
      if (newTeam) {
        const newTeamDoc = await Team.findOne({ name: newTeam });
        if (newTeamDoc) {
          await newTeamDoc.addMember(employee._id);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: employee
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating employee',
      error: error.message
    });
  }
};

/**
 * Rehire an employee (restore access)
 */
exports.rehireEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID'
      });
    }

    const employee = await EmployeeHub.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    console.log('🔍 Rehire request:', { id, employeeName: `${employee.firstName} ${employee.lastName}` });

    // Update employee status to active
    employee.status = 'Active';
    employee.isActive = true;
    employee.terminatedDate = null;
    employee.endDate = null;
    employee.terminationNote = null;

    console.log('🔍 Saving rehired employee...');
    await employee.save();
    console.log('🔍 Employee rehired successfully:', {
      id: employee._id,
      name: `${employee.firstName} ${employee.lastName}`
    });

    res.status(200).json({
      success: true,
      message: 'Employee rehired successfully',
      data: employee
    });
  } catch (error) {
    console.error('❌ Error rehiring employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error rehiring employee',
      error: error.message
    });
  }
};

/**
 * Hard delete an employee (permanent removal)
 */
exports.deleteEmployee = async (req, res) => {
  try {
    console.log('🔍 Starting delete employee process...');
    console.log('🔍 Request params:', req.params);
    console.log('🔍 Request body:', req.body);

    const { id } = req.params;

    // Validate ID
    if (!id) {
      console.log('❌ No ID provided in request');
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    console.log('🔍 Employee ID to delete:', id);

    // Check database connection
    const dbState = mongoose.connection.readyState;
    console.log('🔍 Database connection state:', dbState);

    if (dbState !== 1) {
      console.log('❌ Database not connected');
      return res.status(500).json({
        success: false,
        message: 'Database not connected'
      });
    }

    console.log('✅ Database connected, proceeding with deletion...');

    // Find the employee first
    const employee = await EmployeeHub.findById(id);
    console.log('🔍 Employee found:', employee ? 'YES' : 'NO');

    if (!employee) {
      console.log('❌ Employee not found with ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    console.log('✅ Employee found:', employee.firstName, employee.lastName);
    console.log('🔍 Employee status:', employee.status);
    console.log('🔍 Employee details:', {
      _id: employee._id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      status: employee.status,
      department: employee.department,
      jobTitle: employee.jobTitle
    });

    // Only allow deletion of terminated employees
    if (employee.status?.toLowerCase() !== 'terminated') {
      console.log('❌ Employee is not terminated, current status:', employee.status);
      return res.status(400).json({
        success: false,
        message: 'Only terminated employees can be permanently deleted'
      });
    }

    console.log('🔍 Hard delete request:', {
      id: employee._id,
      employeeName: `${employee.firstName} ${employee.lastName}`
    });

    // STEP 1: Create ArchiveEmployee record
    try {
      console.log('🔍 Creating archive record...');
      const ArchiveEmployee = require('../models/ArchiveEmployee');
      console.log('✅ ArchiveEmployee model loaded successfully');

      // Check if the model is properly formed
      console.log('🔍 ArchiveEmployee model check:', {
        modelName: ArchiveEmployee.modelName,
        collectionName: ArchiveEmployee.collection.name,
        hasFindMethod: typeof ArchiveEmployee.find === 'function'
      });

      const archiveData = {
        employeeId: employee._id.toString(),
        firstName: employee.firstName,
        lastName: employee.lastName,
        fullName: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        department: employee.department || null,
        jobTitle: employee.jobTitle || null,
        startDate: employee.startDate || null,
        terminationReason: employee.terminationNote || employee.snapshot?.termination?.reason || null,
        exitDate: employee.snapshot?.termination?.exitDate || employee.terminatedDate || null,
        status: employee.status,
        terminatedDate: employee.terminatedDate || null,
        deletedDate: new Date(),
        snapshot: {}
      };

      console.log('🔍 Archive data prepared:', {
        employeeId: archiveData.employeeId,
        fullName: archiveData.fullName,
        status: archiveData.status,
        deletedDate: archiveData.deletedDate
      });

      // Create snapshot without sensitive data
      const employeeObj = employee.toObject();
      delete employeeObj.password; // Remove password from snapshot
      archiveData.snapshot = employeeObj;

      console.log('🔍 Creating ArchiveEmployee instance...');
      const archivedEmployee = new ArchiveEmployee(archiveData);

      console.log('🔍 Saving archived employee...');
      const savedEmployee = await archivedEmployee.save();
      console.log('✅ Employee archived successfully:', savedEmployee.fullName);
      console.log('✅ Archived employee ID:', savedEmployee._id);
      console.log('✅ Archived employee saved to collection:', savedEmployee.constructor.modelName);
    } catch (archiveError) {
      console.error('❌ Archive creation failed:', archiveError);
      console.error('❌ Archive error details:', archiveError.message);
      console.error('❌ Archive error stack:', archiveError.stack);
      // Continue with deletion even if archiving fails
    }

    // STEP 2: Delete all associated data
    try {
      console.log('🔍 Testing Document model import...');
      const Document = require('../models/Document');
      console.log('✅ Document model imported successfully');

      console.log('🔍 Deleting documents...');
      await Document.deleteMany({ employee: employee._id });
      console.log('✅ Documents deleted successfully');
    } catch (docError) {
      console.error('❌ Error deleting documents:', docError);
      // Continue with other deletions
    }

    try {
      console.log('🔍 Testing Certificate model import...');
      const Certificate = require('../models/Certificate');
      console.log('✅ Certificate model imported successfully');

      console.log('🔍 Deleting certificates...');
      await Certificate.deleteMany({ employeeRef: employee._id });
      console.log('✅ Certificates deleted successfully');
    } catch (certError) {
      console.error('❌ Error deleting certificates:', certError);
      // Continue with other deletions
    }

    try {
      console.log('🔍 Testing TimeEntry model import...');
      const TimeEntry = require('../models/TimeEntry');
      console.log('✅ TimeEntry model imported successfully');

      // Check if TimeEntry has the deleteMany method (model might be empty)
      if (typeof TimeEntry.deleteMany === 'function') {
        console.log('🔍 Deleting time entries...');
        await TimeEntry.deleteMany({ employeeRef: employee._id });
        console.log('✅ Time entries deleted successfully');
      } else {
        console.log('⚠️ TimeEntry model is empty, skipping time entry deletion');
      }
    } catch (timeError) {
      console.error('❌ Error deleting time entries:', timeError);
      // Continue with other deletions
    }

    try {
      console.log('🔍 Testing ShiftAssignment model import...');
      const ShiftAssignment = require('../models/ShiftAssignment');
      console.log('✅ ShiftAssignment model imported successfully');

      console.log('🔍 Deleting shift assignments...');
      await ShiftAssignment.deleteMany({ employeeRef: employee._id });
      console.log('✅ Shift assignments deleted successfully');
    } catch (shiftError) {
      console.error('❌ Error deleting shift assignments:', shiftError);
      // Continue with other deletions
    }

    try {
      console.log('🔍 Testing Notification model import...');
      const Notification = require('../models/Notification');
      console.log('✅ Notification model imported successfully');

      console.log('🔍 Deleting notifications...');
      await Notification.deleteMany({ userEmployeeRef: employee._id });
      console.log('✅ Notifications deleted successfully');
    } catch (notifError) {
      console.error('❌ Error deleting notifications:', notifError);
      // Continue with other deletions
    }

    try {
      console.log('🔍 Testing Team model import...');
      const Team = require('../models/Team');
      console.log('✅ Team model imported successfully');

      console.log('🔍 Removing from teams...');
      await Team.updateMany({}, { $pull: { members: employee._id } });
      console.log('✅ Removed from teams successfully');
    } catch (teamError) {
      console.error('❌ Error removing from teams:', teamError);
      // Continue with employee deletion
    }

    // STEP 3: Delete the employee record
    console.log('🔍 Deleting employee record...');
    await EmployeeHub.findByIdAndDelete(employee._id);
    console.log('✅ Employee record deleted successfully');

    console.log('✅ Employee permanently deleted and archived:', {
      id: employee._id,
      name: `${employee.firstName} ${employee.lastName}`
    });

    res.status(200).json({
      success: true,
      message: 'Employee permanently deleted and archived successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting employee:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error deleting employee',
      error: error.message
    });
  }
};

/**
 * Get all archived employees
 */
exports.getArchivedEmployees = async (req, res) => {
  try {
    console.log('🔍 Fetching archived employees...');

    // 1. Fetch Terminated employees from EmployeeHub (Active DB but inactive status)
    const terminatedEmployeesIterator = await EmployeeHub.find({ status: 'Terminated' })
      .sort({ terminatedDate: -1 })
      .lean();

    console.log(`✅ Found ${terminatedEmployeesIterator.length} terminated employees in EmployeeHub`);

    // Map to common structure
    const terminatedMapped = terminatedEmployeesIterator.map(emp => ({
      _id: emp._id,
      employeeId: emp.employeeId,
      firstName: emp.firstName,
      lastName: emp.lastName,
      fullName: `${emp.firstName} ${emp.lastName}`,
      email: emp.email,
      dateOfBirth: emp.dateOfBirth || null,
      gender: emp.gender || null,
      phone: emp.phone || null,
      team: emp.team || null,
      organisationName: emp.OrganisationName || emp.office || null,
      department: emp.department,
      jobTitle: emp.jobTitle,
      startDate: emp.startDate,
      terminationReason: emp.terminationReason || emp.terminationNote || emp.reason || 'Terminated',
      // Prioritize exitDate, then terminatedDate, then endDate
      exitDate: emp.exitDate || emp.terminatedDate || emp.endDate,
      terminatedDate: emp.terminatedDate || emp.endDate,
      status: 'Terminated',
      isDeleted: false
    }));

    // 2. Fetch Permanently Deleted employees from ArchiveEmployee
    let deletedMapped = [];
    try {
      const ArchiveEmployee = require('../models/ArchiveEmployee');
      const deletedEmployees = await ArchiveEmployee.find({})
        .sort({ deletedDate: -1 })
        .lean();

      console.log(`✅ Found ${deletedEmployees.length} permanently deleted employees in ArchiveEmployee`);

      deletedMapped = deletedEmployees.map(emp => {
        const snapshot = emp.snapshot || {};
        return ({
          _id: emp._id,
          employeeId: emp.employeeId,
          firstName: emp.firstName,
          lastName: emp.lastName,
          fullName: emp.fullName || `${emp.firstName} ${emp.lastName}`,
          email: emp.email,
          dateOfBirth: snapshot.dateOfBirth || null,
          gender: snapshot.gender || null,
          phone: snapshot.phone || null,
          team: snapshot.team || null,
          organisationName: snapshot.OrganisationName || snapshot.office || null,
          department: emp.department,
          jobTitle: emp.jobTitle,
          startDate: emp.startDate,
          terminationReason: emp.terminationReason || 'Permanently Deleted',
          exitDate: emp.exitDate || emp.terminatedDate || emp.deletedDate,
          terminatedDate: emp.terminatedDate || emp.deletedDate,
          status: 'Deleted',
          isDeleted: true
        });
      });
    } catch (modelError) {
      console.log('⚠️ ArchiveEmployee model not available or error fetching deleted employees:', modelError.message);
    }

    // 3. Combine both lists
    const allArchived = [...terminatedMapped, ...deletedMapped];

    // Sort by exit date descending (newest first)
    allArchived.sort((a, b) => {
      const dateA = new Date(a.exitDate || 0);
      const dateB = new Date(b.exitDate || 0);
      return dateB - dateA;
    });

    console.log(`✅ Total archived/terminated employees: ${allArchived.length}`);

    res.status(200).json({
      success: true,
      count: allArchived.length,
      data: allArchived
    });
  } catch (error) {
    console.error('❌ Error fetching archived employees:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching archived employees',
      error: error.message
    });
  }
};

/**
 * Get employees by team
 */
exports.getEmployeesByTeam = async (req, res) => {
  try {
    const { teamName } = req.params;

    const employees = await EmployeeHub.find({
      team: teamName,
      isActive: true
    }).sort({ firstName: 1 });

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching employees by team',
      error: error.message
    });
  }
};

/**
 * Get unregistered BrightHR employees
 */
exports.getUnregisteredBrightHR = async (req, res) => {
  try {
    const employees = await EmployeeHub.getUnregisteredBrightHR();

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching unregistered employees',
      error: error.message
    });
  }
};

/**
 * Get employees without team assignment
 */
exports.getEmployeesWithoutTeam = async (req, res) => {
  try {
    const employees = await EmployeeHub.find({
      $or: [
        { team: '' },
        { team: null },
        { team: { $exists: false } }
      ],
      isActive: true
    }).sort({ firstName: 1 });

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching employees without team',
      error: error.message
    });
  }
};

/**
 * Terminate an employee
 */
exports.terminateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      terminationType,
      noticePeriod,
      lastWorkingDay,
      exitDate,
      terminationReason,
      managerComments,
      terminationNote
    } = req.body;

    console.log('🔍 Termination request:', { id, terminationType, terminationReason });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID'
      });
    }

    const employee = await EmployeeHub.findById(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    console.log('🔍 Employee found:', employee.firstName, employee.lastName);

    // Update employee status to terminated
    employee.status = 'Terminated';
    employee.isActive = false;
    employee.terminatedDate = exitDate ? new Date(exitDate) : new Date();
    employee.endDate = lastWorkingDay ? new Date(lastWorkingDay) : new Date();

    // Store detailed termination information
    if (terminationType) employee.set('terminationType', terminationType);
    if (noticePeriod) employee.set('noticePeriod', parseInt(noticePeriod));
    if (terminationReason) employee.set('terminationReason', terminationReason);
    if (managerComments) employee.set('managerComments', managerComments);
    if (terminationNote) employee.set('terminationNote', terminationNote);

    console.log('🔍 Saving employee...');
    await employee.save();
    console.log('🔍 Employee saved successfully');

    console.log('✅ Employee terminated successfully:', {
      id: employee._id,
      name: `${employee.firstName} ${employee.lastName}`,
      terminationType,
      terminationReason
    });

    res.status(200).json({
      success: true,
      message: 'Employee terminated successfully',
      data: employee
    });
  } catch (error) {
    console.error('❌ Error terminating employee:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: 'Error terminating employee',
      error: error.message
    });
  }
};

/**
 * Bulk delete employees
 * DELETE /api/employees/bulk
 */
exports.bulkDeleteEmployees = async (req, res) => {
  try {
    console.log('🔍 Starting bulk delete process...');
    console.log('🔍 Request body:', req.body);

    const { employeeIds, permanentDelete = false } = req.body;

    // Validate input
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      console.log('❌ Invalid employee IDs provided');
      return res.status(400).json({
        success: false,
        message: 'Employee IDs array is required'
      });
    }

    console.log(`🔍 Attempting to delete ${employeeIds.length} employee(s)`);

    // Check database connection
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      console.log('❌ Database not connected');
      return res.status(500).json({
        success: false,
        message: 'Database not connected'
      });
    }

    // Find all employees to be deleted
    const employees = await EmployeeHub.find({ _id: { $in: employeeIds } });

    if (employees.length === 0) {
      console.log('❌ No employees found with provided IDs');
      return res.status(404).json({
        success: false,
        message: 'No employees found with the provided IDs'
      });
    }

    console.log(`✅ Found ${employees.length} employee(s) to delete`);

    // Check if all employees are terminated (optional - remove this check if you want to allow deletion of active employees)
    const nonTerminatedEmployees = employees.filter(emp => emp.status?.toLowerCase() !== 'terminated');
    if (nonTerminatedEmployees.length > 0) {
      console.log(`⚠️ Found ${nonTerminatedEmployees.length} non-terminated employee(s)`);
      // Uncomment the following to enforce termination before deletion:
      // return res.status(400).json({
      //   success: false,
      //   message: 'Only terminated employees can be permanently deleted',
      //   nonTerminatedCount: nonTerminatedEmployees.length
      // });
    }

    const ArchiveEmployee = require('../models/ArchiveEmployee');

    if (!permanentDelete) {
      // Archive employees before deletion
      const archivePromises = employees.map(employee => {
        const archiveData = {
          employeeId: employee._id.toString(),
          firstName: employee.firstName,
          lastName: employee.lastName,
          fullName: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          department: employee.department || null,
          jobTitle: employee.jobTitle || null,
          startDate: employee.startDate || null,
          terminationReason: employee.terminationNote || employee.snapshot?.termination?.reason || null,
          exitDate: employee.snapshot?.termination?.exitDate || employee.terminatedDate || null,
          status: employee.status,
          terminatedDate: employee.terminatedDate || null,
          deletedDate: new Date(),
          snapshot: employee.toObject()
        };
        return ArchiveEmployee.create(archiveData);
      });

      await Promise.all(archivePromises);
      console.log('✅ All employees archived successfully');
    } else {
      console.log('✅ Permanent delete requested - skipping archive creation');
      await ArchiveEmployee.deleteMany({
        $or: [
          { employeeId: { $in: employeeIds.map(String) } },
          { originalEmployeeId: { $in: employeeIds } }
        ]
      });
    }

    // Delete related records
    const deletePromises = [
      TimeEntry.deleteMany({ employeeId: { $in: employeeIds } }),
      ShiftAssignment.deleteMany({ employeeId: { $in: employeeIds } }),
      LeaveRecord.deleteMany({ employeeId: { $in: employeeIds } }),
    ];

    if (permanentDelete) {
      deletePromises.push(
        ArchiveEmployee.deleteMany({
          $or: [
            { employeeId: { $in: employeeIds.map(String) } },
            { originalEmployeeId: { $in: employeeIds } }
          ]
        })
      );
    }

    await Promise.all(deletePromises);
    console.log('✅ Related records deleted successfully');

    // Finally, delete the employees
    const deleteResult = await EmployeeHub.deleteMany({ _id: { $in: employeeIds } });
    console.log(`✅ Deleted ${deleteResult.deletedCount} employee(s)`);

    res.status(200).json({
      success: true,
      message: permanentDelete
        ? `Successfully permanently deleted ${deleteResult.deletedCount} employee(s)`
        : `Successfully deleted ${deleteResult.deletedCount} employee(s)`,
      deletedCount: deleteResult.deletedCount
    });

  } catch (error) {
    console.error('❌ Error in bulk delete:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting employees',
      error: error.message
    });
  }
};

/**
 * Bulk delete archived employee records (permanent deletion from ArchiveEmployee collection)
 */
exports.bulkDeleteArchivedEmployees = async (req, res) => {
  try {
    console.log('🔍 Starting bulk delete archived employees process...');
    console.log('🔍 Request body:', req.body);

    const { ids } = req.body;

    // Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      console.log('❌ Invalid archived employee IDs provided');
      return res.status(400).json({
        success: false,
        message: 'Archived employee IDs array is required'
      });
    }

    console.log(`🔍 Attempting to delete ${ids.length} archived employee record(s)`);

    // Check database connection
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      console.log('❌ Database not connected');
      return res.status(500).json({
        success: false,
        message: 'Database not connected'
      });
    }

    const ArchiveEmployee = require('../models/ArchiveEmployee');

    // Find archived employees to be deleted
    const archivedEmployees = await ArchiveEmployee.find({ _id: { $in: ids } });

    if (archivedEmployees.length === 0) {
      console.log('❌ No archived employees found with provided IDs');
      return res.status(400).json({
        success: false,
        message: 'No ArchiveEmployee records matched the provided IDs. If these are terminated EmployeeHub records, use DELETE /api/employees/bulk with employeeIds.'
      });
    }

    console.log(`✅ Found ${archivedEmployees.length} archived employee(s) to delete`);

    // Permanently delete archived employee records
    const deleteResult = await ArchiveEmployee.deleteMany({ _id: { $in: ids } });
    console.log(`✅ Permanently deleted ${deleteResult.deletedCount} archived employee record(s)`);

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} archived employee record(s)`,
      deletedCount: deleteResult.deletedCount
    });

  } catch (error) {
    console.error('❌ Error in bulk delete archived employees:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting archived employees',
      error: error.message
    });
  }
};

/**
 * Save organizational chart manager relationships
 */
exports.saveOrganizationalChart = async (req, res) => {
  try {
    const { managerRelationships } = req.body;

    if (!managerRelationships || !Array.isArray(managerRelationships)) {
      return res.status(400).json({
        success: false,
        message: 'Manager relationships array is required'
      });
    }

    // Update each employee's manager
    const updates = [];
    for (const relationship of managerRelationships) {
      const { employeeId, managerId } = relationship;

      if (employeeId && managerId) {
        updates.push(
          EmployeeHub.findByIdAndUpdate(
            employeeId,
            { managerId: managerId },
            { new: true }
          )
        );
      }
    }

    // Clear manager for employees not in the relationships array
    const employeeIds = managerRelationships.map(r => r.employeeId);
    await EmployeeHub.updateMany(
      {
        _id: { $nin: employeeIds },
        managerId: { $ne: null }
      },
      { managerId: null }
    );

    await Promise.all(updates);

    res.status(200).json({
      success: true,
      message: 'Organizational chart saved successfully',
      updatedCount: updates.length
    });
  } catch (error) {
    console.error('Error saving organizational chart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save organizational chart',
      error: error.message
    });
  }
};
