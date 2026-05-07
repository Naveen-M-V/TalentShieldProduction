import axios from 'axios';
import { buildApiUrl } from './apiConfig';

const CLOCK_BASE = '/clock';

const normalizeApiError = (error, fallbackMessage) => {
  const responseData = error.response?.data;
  const normalizedError = new Error(responseData?.message || fallbackMessage);

  normalizedError.status = error.response?.status;
  normalizedError.response = error.response
    ? { ...error.response, data: responseData }
    : undefined;
  normalizedError.data = responseData;

  return normalizedError;
};

export const getClockInLeaveBlockMessage = (error) => {
  const responseData = error?.response?.data || error?.data || error;

  if (!responseData?.leaveType || !responseData?.startDate || !responseData?.endDate) {
    return null;
  }

  return `Clock-in blocked: ${responseData.leaveType} leave is approved from ${responseData.startDate} to ${responseData.endDate}.`;
};

/**
 * Clock in an employee (Admin)
 * NOW WITH SHIFT LINKING
 * @param {Object} clockData - { employeeId, location, workType }
 * @returns {Promise} API response with shift info
 */
export const clockIn = async (clockData) => {
  try {
    const response = await axios.post(
      buildApiUrl(`${CLOCK_BASE}/in`),
      clockData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'Failed to clock in');
  }
};

/**
 * Clock out an employee (Admin)
 * NOW WITH HOURS CALCULATION
 * @param {Object} clockData - { employeeId }
 * @returns {Promise} API response with hours worked
 */
export const clockOut = async (clockData) => {
  try {
    const response = await axios.post(
      buildApiUrl(`${CLOCK_BASE}/out`),
      clockData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to clock out' };
  }
};

/**
 * Get current clock status for all employees
 * @param {Object} options - { includeAdmins: boolean }
 * @returns {Promise} API response with clock status
 */
export const getClockStatus = async (options = {}) => {
  try {
    let url = buildApiUrl(`${CLOCK_BASE}/status`);
    
    // Add query parameters if provided
    const params = new URLSearchParams();
    if (options.includeAdmins) {
      params.append('includeAdmins', 'true');
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await axios.get(url, { withCredentials: true });
    
    // Handle the new response structure
    if (response.data && response.data.data) {
      const apiData = response.data.data;
      
      // Return the data in the expected format for backward compatibility
      // but also provide the new structure
      const normalizeStatus = (s) => (s || '').replace('_', '-');
      const normalizedEmployees = (apiData.employees || apiData.allEmployees || []).map(emp => ({
        ...emp,
        status: normalizeStatus(emp.status)
      }));

      return {
        success: response.data.success,
        data: normalizedEmployees, 
        allEmployees: normalizedEmployees,
        clockedIn: (apiData.clockedIn || []).map(emp => ({ ...emp, status: normalizeStatus(emp.status) })),
        clockedOut: (apiData.clockedOut || []).map(emp => ({ ...emp, status: normalizeStatus(emp.status) })),
        break: (apiData.break || []).map(emp => ({ ...emp, status: normalizeStatus(emp.status) })),
        employees: normalizedEmployees
      };
    }
    
    return response.data;
  } catch (error) {
    console.error('getClockStatus error:', error);
    throw error.response?.data || { message: 'Failed to fetch clock status' };
  }
};

/**
 * Get time entries (history)
 * @param {String} startDate - Optional start date filter
 * @param {String} endDate - Optional end date filter
 * @param {String} employeeId - Optional employee filter
 * @returns {Promise} API response with time entries
 */
export const getTimeEntries = async (startDate = null, endDate = null, employeeId = null) => {
  try {
    let url = buildApiUrl(`${CLOCK_BASE}/entries`);
    
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (employeeId) params.append('employeeId', employeeId);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await axios.get(url, { withCredentials: true });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch time entries' };
  }
};

/**
 * Add manual time entry
 * @param {Object} entryData - Time entry data
 * @returns {Promise} API response
 */
export const addTimeEntry = async (entryData) => {
  try {
    const response = await axios.post(
      buildApiUrl(`${CLOCK_BASE}/entry`),
      entryData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to add time entry' };
  }
};

/**
 * Update time entry
 * @param {String} entryId - Time entry ID
 * @param {Object} updateData - Data to update
 * @returns {Promise} API response
 */
export const updateTimeEntry = async (entryId, updateData) => {
  try {
    const response = await axios.put(
      buildApiUrl(`${CLOCK_BASE}/entry/${entryId}`),
      updateData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update time entry' };
  }
};

/**
 * Delete time entry
 * @param {String} entryId - Time entry ID
 * @returns {Promise} API response
 */
export const deleteTimeEntry = async (entryId) => {
  try {
    const response = await axios.delete(
      buildApiUrl(`${CLOCK_BASE}/entry/${entryId}`),
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete time entry' };
  }
};

/**
 * Add break to time entry
 * @param {String} entryId - Time entry ID
 * @param {Object} breakData - Break data
 * @returns {Promise} API response
 */
export const addBreak = async (entryId, breakData) => {
  try {
    const response = await axios.post(
      buildApiUrl(`${CLOCK_BASE}/entry/${entryId}/break`),
      breakData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to add break' };
  }
};

/**
 * Export time entries to CSV
 * @param {String} startDate - Start date filter
 * @param {String} endDate - End date filter
 * @returns {Promise} CSV data
 */
export const exportTimeEntries = async (startDate, endDate) => {
  try {
    const response = await axios.get(
      buildApiUrl(`${CLOCK_BASE}/export?startDate=${startDate}&endDate=${endDate}`),
      { 
        withCredentials: true,
        responseType: 'blob'
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to export time entries' };
  }
};

// ========== USER-SPECIFIC FUNCTIONS (EMPLOYEES) ==========

/**
 * Get user's own clock status
 * @returns {Promise} API response
 */
export const getUserClockStatus = async () => {
  try {
    const response = await axios.get(
      buildApiUrl('/clock/user/status'),
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to get user clock status' };
  }
};

/**
 * Clock in current user (with shift linking)
 * @param {Object} clockData - { location, workType }
 * @returns {Promise} API response with shift info and validation
 */
export const userClockIn = async (clockData) => {
  try {
    const response = await axios.post(
      buildApiUrl('/clock/user/in'),
      clockData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'Failed to clock in');
  }
};

/**
 * Clock out current user (with hours calculation and GPS)
 * @param {Object} clockOutData - Optional { latitude, longitude, accuracy }
 * @returns {Promise} API response with hours worked
 */
export const userClockOut = async (clockOutData = {}) => {
  try {
    const url = buildApiUrl('/clock/user/out');
    
    const response = await axios.post(
      url,
      clockOutData,
      { withCredentials: true }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ userClockOut - Error:', error);
    throw error.response?.data || { message: 'Failed to clock out' };
  }
};

/**
 * Add break for current user
 * @param {Object} breakData - Break information
 * @returns {Promise} API response
 */
export const addUserBreak = async (breakData = {}) => {
  return userStartBreak(breakData);
};

/**
 * Start break for current user
 * @returns {Promise} API response
 */
export const userStartBreak = async () => {
  try {
    const response = await axios.post(
      buildApiUrl('/clock/user/start-break'),
      {},
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to start break' };
  }
};

/**
 * Resume work from break for current user
 * @returns {Promise} API response
 */
export const userResumeWork = async () => {
  try {
    const response = await axios.post(
      buildApiUrl('/clock/user/resume-work'),
      {},
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to resume work' };
  }
};

/**
 * Get user's own time entries
 * @param {String} startDate - Start date
 * @param {String} endDate - End date
 * @returns {Promise} API response
 */
export const getUserTimeEntries = async (startDate, endDate) => {
  try {
    let url = buildApiUrl('/clock/user/entries');
    
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await axios.get(url, { withCredentials: true });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch user time entries' };
  }
};

/**
 * Admin change employee status
 * @param {String} employeeId - Employee user ID
 * @param {String} status - New status
 * @param {Object} options - Additional options
 * @returns {Promise} API response
 */
export const changeEmployeeStatus = async (employeeId, status, options = {}) => {
  try {
    const response = await axios.post(
      buildApiUrl('/clock/admin/status'),
      {
        employeeId,
        status,
        location: options.location,
        workType: options.workType,
        reason: options.reason
      },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to change employee status' };
  }
};

/**
 * Get attendance summary for employee
 * @param {String} employeeId - Employee ID
 * @param {String} startDate - Start date
 * @param {String} endDate - End date
 * @returns {Promise} Attendance statistics shape:
 * { totalDays, totalHoursWorked, totalOvertime, totalNegativeHours, entries[] }
 *
 * Note: Backend route /api/clock/attendance-summary/:employeeId does not exist.
 * This function is intentionally disabled until a matching endpoint is added.
 */
export const getAttendanceSummary = async (employeeId, startDate, endDate) => {
  throw {
    success: false,
    message: 'Attendance summary endpoint is not implemented in backend yet',
    expectedRequest: {
      employeeId,
      startDate,
      endDate
    },
    expectedResponseShape: {
      totalDays: 0,
      totalHoursWorked: '0.00',
      totalOvertime: '0.00',
      totalNegativeHours: '0.00',
      entries: []
    }
  };
};

/**
 * Set employee to "On Break" status
 * @param {String} employeeId - Employee ID
 * @returns {Promise} API response
 */
export const setOnBreak = async (employeeId) => {
  try {
    const response = await axios.post(
      buildApiUrl(`${CLOCK_BASE}/onbreak`),
      { employeeId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to set on break' };
  }
};

/**
 * End employee break
 * @param {String} employeeId - Employee ID
 * @returns {Promise} API response
 */
export const endBreak = async (employeeId) => {
  try {
    const response = await axios.post(
      buildApiUrl(`${CLOCK_BASE}/endbreak`),
      { employeeId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to end break' };
  }
};

/**
 * Get dashboard statistics
 * @returns {Promise} Dashboard stats
 */
export const getDashboardStats = async () => {
  try {
    const response = await axios.get(
      buildApiUrl(`${CLOCK_BASE}/dashboard`),
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch dashboard stats' };
  }
};
