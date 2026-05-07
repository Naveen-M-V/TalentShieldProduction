import axios from 'axios';
import { buildApiUrl } from './apiConfig';

const ROTA_BASE = '/rota';

export const getGroupedShiftAssignments = async (filters = {}) => {
  try {
    let url = buildApiUrl(`${ROTA_BASE}/shift-assignments/grouped`);

    const params = new URLSearchParams();
    if (filters.tab) params.append('tab', filters.tab);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.employeeId) params.append('employeeId', filters.employeeId);
    if (filters.location && filters.location !== 'all') params.append('location', filters.location);
    if (filters.workType && filters.workType !== 'all') params.append('workType', filters.workType);
    if (filters.status) params.append('status', filters.status);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await axios.get(url, { withCredentials: true });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch grouped shift assignments' };
  }
};

export const assignShift = async (data) => {
  try {
    // Use the new direct assign-shift endpoint
    const response = await axios.post(
      buildApiUrl(`${ROTA_BASE}/assign-shift`),
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Assign shift error:', error);
    
    // Handle specific error messages from backend
    const errorData = error.response?.data;
    if (errorData?.message === 'Employee is inactive or not found') {
      throw errorData; // Pass through the specific error message
    }
    
    throw errorData || { message: 'Failed to assign shift' };
  }
};

export const assignShiftToTeam = async (data) => {
  try {
    // Use the new team assignment endpoint
    const response = await axios.post(
      buildApiUrl(`${ROTA_BASE}/assign-shift/team`),
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Assign shift to team error:', error);
    throw error.response?.data || { message: 'Failed to assign shift to team' };
  }
};

export const getAllShiftAssignments = async (filters = {}) => {
  try {
    let url = buildApiUrl(`${ROTA_BASE}/shift-assignments/all`);
    
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.employeeId) params.append('employeeId', filters.employeeId);
    // Only add location and workType if they're not 'all'
    if (filters.location && filters.location !== 'all') params.append('location', filters.location);
    if (filters.workType && filters.workType !== 'all') params.append('workType', filters.workType);
    if (filters.status) params.append('status', filters.status);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await axios.get(url, { withCredentials: true });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch shift assignments' };
  }
};

export const getEmployeeShifts = async (employeeId, startDate = null, endDate = null) => {
  try {
    let url = buildApiUrl(`${ROTA_BASE}/shift-assignments/employee/${employeeId}`);
    
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await axios.get(url, { withCredentials: true });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch employee shifts' };
  }
};

export const getShiftsByLocation = async (location, startDate = null, endDate = null) => {
  try {
    let url = buildApiUrl(`${ROTA_BASE}/shift-assignments/location/${location}`);
    
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await axios.get(url, { withCredentials: true });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch shifts by location' };
  }
};

export const getShiftStatistics = async (startDate = null, endDate = null) => {
  try {
    let url = buildApiUrl(`${ROTA_BASE}/shift-assignments/statistics`);
    
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await axios.get(url, { withCredentials: true });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch shift statistics' };
  }
};

export const updateShiftAssignment = async (shiftId, updateData) => {
  try {
    const response = await axios.put(
      buildApiUrl(`${ROTA_BASE}/shift-assignments/${shiftId}`),
      updateData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update shift' };
  }
};

export const deleteShiftAssignment = async (shiftId) => {
  try {
    const response = await axios.delete(
      buildApiUrl(`${ROTA_BASE}/shift-assignments/${shiftId}`),
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete shift' };
  }
};

export const deleteShiftAssignmentGroup = async (groupId) => {
  try {
    const response = await axios.delete(
      buildApiUrl(`${ROTA_BASE}/shift-assignments/group/${groupId}`),
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete shift group' };
  }
};

export const requestShiftSwap = async (shiftId, swapWithEmployeeId, reason) => {
  try {
    const response = await axios.post(
      buildApiUrl(`${ROTA_BASE}/shift-assignments/${shiftId}/swap-request`),
      { shiftId, swapWithEmployeeId, reason },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to request shift swap' };
  }
};

export const approveShiftSwap = async (shiftId, status) => {
  try {
    const response = await axios.post(
      buildApiUrl(`${ROTA_BASE}/shift-assignments/${shiftId}/swap-approve`),
      { status },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to approve shift swap' };
  }
};

export const getAllRotasUnfiltered = async (filters = {}) => {
  try {
    const params = {};
    if (filters.employeeId) params.employeeId = filters.employeeId;
    if (filters.location && filters.location !== 'all') params.location = filters.location;
    if (filters.workType && filters.workType !== 'all') params.workType = filters.workType;
    if (filters.status) params.status = filters.status;

    const response = await axios.get(
      buildApiUrl(`${ROTA_BASE}/all`),
      { withCredentials: true, params }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch all rotas' };
  }
};

export const getActiveRotas = async (filters = {}) => {
  try {
    const params = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.employeeId) params.employeeId = filters.employeeId;
    if (filters.location && filters.location !== 'all') params.location = filters.location;
    if (filters.workType && filters.workType !== 'all') params.workType = filters.workType;
    if (filters.status) params.status = filters.status;

    const response = await axios.get(
      buildApiUrl(`${ROTA_BASE}/active`),
      { withCredentials: true, params }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch active rotas' };
  }
};

export const getOldRotas = async (filters = {}) => {
  try {
    const params = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.employeeId) params.employeeId = filters.employeeId;
    if (filters.location && filters.location !== 'all') params.location = filters.location;
    if (filters.workType && filters.workType !== 'all') params.workType = filters.workType;
    if (filters.status) params.status = filters.status;

    const response = await axios.get(
      buildApiUrl(`${ROTA_BASE}/old`),
      { withCredentials: true, params }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch old rotas' };
  }
};
