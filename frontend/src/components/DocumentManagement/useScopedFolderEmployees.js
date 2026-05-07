import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { buildApiUrl } from '../../utils/apiConfig';
import { ADMIN_ROLES, MANAGER_ROLES } from '../../constants/roles';

const normalizeEmployeeList = (payload) => {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.employees)
        ? payload.employees
        : [];

  return list;
};

export const useScopedFolderEmployees = () => {
  const { user } = useAuth();
  const role = useMemo(() => String(user?.role || '').toLowerCase(), [user?.role]);
  const isAdminLike = ADMIN_ROLES.includes(role);
  const isManagerLike = MANAGER_ROLES.includes(role);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchEmployees = async () => {
      setLoading(true);
      try {
        let url = null;

        if (isAdminLike) {
          url = buildApiUrl('/employees');
        } else if (isManagerLike) {
          url = buildApiUrl('/manager/team/members?includeIndirect=true');
        } else {
          setEmployees([]);
          return;
        }

        const token = localStorage.getItem('auth_token');
        const response = await axios.get(url, {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });

        if (cancelled) return;
        setEmployees(normalizeEmployeeList(response.data));
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching scoped employees:', error);
          setEmployees([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchEmployees();

    return () => {
      cancelled = true;
    };
  }, [isAdminLike, isManagerLike, role]);

  return {
    employees,
    employeesLoading: loading,
    role,
    isAdminLike,
    isManagerLike
  };
};

export default useScopedFolderEmployees;