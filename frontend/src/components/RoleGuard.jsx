import React from 'react';
import { useAuth } from '../context/AuthContext';
import { hasRole } from '../constants/roles';

const RoleGuard = ({ children, requiredRoles, fallback = null, user: providedUser }) => {
  const auth = useAuth();
  const user = providedUser || auth?.user;

  if (!user) {
    return fallback;
  }

  if (!hasRole(user.role, requiredRoles)) {
    return fallback;
  }

  return children;
};

export default RoleGuard;
