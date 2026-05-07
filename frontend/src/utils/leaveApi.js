import axios from 'axios';
import { buildApiUrl } from './apiConfig';

/**
 * Leave Management API Service
 * Handles all leave balance and leave record operations
 */

// ============================================
// LEAVE BALANCE ENDPOINTS
// ============================================

/**
 * Get leave balances with optional filters
 * @param {Object} params - Query parameters
 * @param {String} params.userId - Filter by user ID
 * @param {String} params.yearStart - Filter by leave year start date
 * @param {Boolean} params.current - Get current year balances only
 */
export const getLeaveBalances = async (params = {}) => {
  try {
    const response = await axios.get(
      buildApiUrl('/leave/balances'),
      { 
        params,
        withCredentials: true 
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch leave balances' };
  }
};

/**
 * Get current leave balance for a specific user
 * @param {String} userId - User ID
 */
export const getUserLeaveBalance = async (userId) => {
  try {
    const response = await axios.get(
      buildApiUrl(`/leave/balances/current/${userId}`),
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch user leave balance' };
  }
};

/**
 * Get current user's leave balance
 */
export const getCurrentUserLeaveBalance = async () => {
  try {
    const response = await axios.get(
      buildApiUrl('/leave/user/current'),
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch leave balance' };
  }
};

/**
 * Create or update leave balance
 * @param {Object} data - Leave balance data
 */
export const createLeaveBalance = async (data) => {
  try {
    const response = await axios.post(
      buildApiUrl('/leave/balances'),
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create leave balance' };
  }
};

/**
 * Bulk upload leave balances from CSV
 * @param {Array} balances - Array of balance objects
 */
export const uploadLeaveBalances = async (balances) => {
  try {
    const response = await axios.post(
      buildApiUrl('/leave/balances/upload'),
      { balances },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to upload leave balances' };
  }
};

/**
 * Update leave balance (add adjustments, change entitlement, etc.)
 * @param {String} balanceId - Balance ID
 * @param {Object} updates - Update data
 */
export const updateLeaveBalance = async (balanceId, updates) => {
  try {
    const response = await axios.put(
      buildApiUrl(`/leave/balances/${balanceId}`),
      updates,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update leave balance' };
  }
};

/**
 * Export leave balances to CSV
 */
export const exportLeaveBalances = async () => {
  try {
    const response = await axios.get(
      buildApiUrl('/leave/balances/export'),
      { 
        withCredentials: true,
        responseType: 'blob'
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to export leave balances' };
  }
};

// ============================================
// LEAVE RECORD ENDPOINTS
// ============================================

/**
 * Get leave records with optional filters
 * @param {Object} params - Query parameters
 */
export const getLeaveRecords = async (params = {}) => {
  try {
    const response = await axios.get(
      buildApiUrl('/leave/records'),
      { 
        params,
        withCredentials: true 
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch leave records' };
  }
};

/**
 * Create leave record
 * @param {Object} data - Leave record data
 */
export const createLeaveRecord = async (data) => {
  try {
    const response = await axios.post(
      buildApiUrl('/leave/records'),
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create leave record' };
  }
};

/**
 * Update leave record
 * @param {String} recordId - Record ID
 * @param {Object} updates - Update data
 */
export const updateLeaveRecord = async (recordId, updates) => {
  try {
    const response = await axios.put(
      buildApiUrl(`/leave/records/${recordId}`),
      updates,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update leave record' };
  }
};

/**
 * Delete leave record
 * @param {String} recordId - Record ID
 */
export const deleteLeaveRecord = async (recordId) => {
  try {
    const response = await axios.delete(
      buildApiUrl(`/leave/records/${recordId}`),
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete leave record' };
  }
};

// ============================================
// USER-SPECIFIC ENDPOINTS
// ============================================

/**
 * Get current user's next upcoming approved leave
 */
export const getNextUpcomingLeave = async () => {
  try {
    const response = await axios.get(
      buildApiUrl('/leave/user/next-leave'),
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch next leave' };
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate working days between two dates (excludes weekends)
 * @param {Date} startDate 
 * @param {Date} endDate 
 */
export const calculateWorkingDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  let current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

/**
 * Format leave type for display
 * @param {String} type 
 */
export const formatLeaveType = (type) => {
  const types = {
    annual: 'Annual Leave',
    sick: 'Sick Leave',
    unpaid: 'Unpaid Leave',
    absent: 'Absent'
  };
  return types[type] || type;
};

/**
 * Format leave status for display
 * @param {String} status 
 */
export const formatLeaveStatus = (status) => {
  const statuses = {
    approved: 'Approved',
    pending: 'Pending',
    rejected: 'Rejected'
  };
  return statuses[status] || status;
};

/**
 * Get status color class
 * @param {String} status 
 */
export const getLeaveStatusColor = (status) => {
  const colors = {
    approved: 'green',
    pending: 'amber',
    rejected: 'red'
  };
  return colors[status] || 'gray';
};

export default {
  // Balance operations
  getLeaveBalances,
  getUserLeaveBalance,
  getCurrentUserLeaveBalance,
  createLeaveBalance,
  uploadLeaveBalances,
  updateLeaveBalance,
  exportLeaveBalances,
  
  // Record operations
  getLeaveRecords,
  createLeaveRecord,
  updateLeaveRecord,
  deleteLeaveRecord,
  
  // User operations
  getNextUpcomingLeave,
  
  // Helpers
  calculateWorkingDays,
  formatLeaveType,
  formatLeaveStatus,
  getLeaveStatusColor
};
