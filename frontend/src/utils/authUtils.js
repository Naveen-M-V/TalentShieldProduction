/**
 * Auth utility functions for role-based access control
 */

export const isAdmin = (user) => {
  return user && (user.role === 'admin' || user.role === 'super-admin');
};

export const isSelfOrAdmin = (user, targetId) => {
  if (isAdmin(user)) return true;
  return user?._id === targetId || user?.userId === targetId;
};
