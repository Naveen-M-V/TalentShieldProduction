const Folder = require('../models/Folder');
const EmployeeHub = require('../models/EmployeesHub');

/**
 * Ensure a My Documents folder exists for the given employee.
 * Works for any EmployeeHub record (employee, manager, senior-manager, etc).
 * Returns the existing folder or creates it with default employee+manager access.
 */
async function ensureMyDocumentsFolder(employeeId) {
  if (!employeeId) {
    throw new Error('employeeId is required');
  }

  const employee = await EmployeeHub.findById(employeeId)
    .select('_id managerId')
    .lean();

  if (!employee) {
    throw new Error('Employee not found for ensureMyDocumentsFolder');
  }

  let folder = await Folder.findOne({
    name: 'My Documents',
    isActive: true,
    $or: [
      { createdBy: employeeId },
      { createdByEmployeeId: employeeId },
      { 'permissions.viewEmployeeIds': employeeId }
    ]
  });

  if (folder) {
    return folder;
  }

  const permissionEmployeeIds = [String(employee._id)];
  if (employee.managerId) {
    permissionEmployeeIds.push(String(employee.managerId));
  }

  const uniquePermissionEmployeeIds = [...new Set(permissionEmployeeIds)];

  folder = await Folder.create({
    name: 'My Documents',
    description: 'Personal documents folder',
    createdBy: String(employee._id),
    createdByEmployeeId: employee._id,
    permissions: {
      viewEmployeeIds: uniquePermissionEmployeeIds,
      editEmployeeIds: uniquePermissionEmployeeIds,
      deleteEmployeeIds: uniquePermissionEmployeeIds
    },
    isActive: true
  });

  return folder;
}

module.exports = { ensureMyDocumentsFolder };
