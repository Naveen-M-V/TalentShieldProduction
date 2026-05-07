import { useAuth } from '../context/AuthContext';
import { isAdmin, isManager, isManagerOrAbove, canAccessEmployeePortal, canApproveRequests } from '../constants/roles';

export const usePermissions = () => {
  const { user, isAuthenticated } = useAuth();
  const role = user?.role;

  return {
    isAuthenticated,
    role,
    isAdmin: isAdmin(role),
    isManager: isManager(role),
    isManagerOrAbove: isManagerOrAbove(role),
    canApproveLeave: canApproveRequests(role),
    canApproveExpense: canApproveRequests(role),
    canManageTeam: isManagerOrAbove(role),
    canModifyRoles: isAdmin(role),
    canAccessEmployeePortal: canAccessEmployeePortal(role),
    userId: user?._id || user?.id || null,
    user
  };
};

export default usePermissions;
