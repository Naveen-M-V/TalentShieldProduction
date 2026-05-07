export const ROLES = {
  PROFILE: 'profile',
  USER: 'user',
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  SENIOR_MANAGER: 'senior-manager',
  HR: 'hr',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin'
};

export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
export const MANAGER_ROLES = [ROLES.MANAGER, ROLES.SENIOR_MANAGER, ROLES.HR];
export const MANAGER_OR_ABOVE_ROLES = [...MANAGER_ROLES, ...ADMIN_ROLES];

export const ROLE_LABELS = {
  [ROLES.PROFILE]: 'Profile',
  [ROLES.USER]: 'User',
  [ROLES.EMPLOYEE]: 'Employee',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.SENIOR_MANAGER]: 'Senior Manager',
  [ROLES.HR]: 'HR',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.SUPER_ADMIN]: 'Super Admin'
};

export const hasRole = (userRole, requiredRoles) => {
  if (!requiredRoles) return true;

  const normalized = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return normalized.includes(userRole);
};

export const isAdmin = (userRole) => ADMIN_ROLES.includes(userRole);
export const isManager = (userRole) => MANAGER_ROLES.includes(userRole);
export const isManagerOrAbove = (userRole) => MANAGER_OR_ABOVE_ROLES.includes(userRole);

export const canAccessEmployeePortal = (userRole) =>
  [ROLES.EMPLOYEE, ...MANAGER_OR_ABOVE_ROLES].includes(userRole);

export const canApproveRequests = (userRole) => isManagerOrAbove(userRole);

export const getRoleLabel = (userRole) => ROLE_LABELS[userRole] || userRole || 'Unknown';

export default {
  ROLES,
  ADMIN_ROLES,
  MANAGER_ROLES,
  MANAGER_OR_ABOVE_ROLES,
  ROLE_LABELS,
  hasRole,
  isAdmin,
  isManager,
  isManagerOrAbove,
  canAccessEmployeePortal,
  canApproveRequests,
  getRoleLabel
};
