/**
 * Time Utilities for UK Timezone
 * Provides consistent UK time formatting across the application
 */

import { formatInTimeZone } from 'date-fns-tz';

/**
 * Formats a date/time to UK timezone
 * @param {Date|string} date - Date object or ISO string
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date/time string in UK timezone
 */
export const formatUKTime = (date, options = {}) => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  // Use date-fns-tz for consistent UK timezone formatting
  return formatInTimeZone(dateObj, 'Europe/London', 'dd/MM/yyyy HH:mm');
};

/**
 * Formats time only (HH:mm) in UK timezone
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} - Time in HH:mm format
 */
export const formatUKTimeOnly = (date) => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  return formatInTimeZone(dateObj, 'Europe/London', 'HH:mm');
};

/**
 * Formats date only (DD/MM/YYYY) in UK timezone
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} - Date in DD/MM/YYYY format
 */
export const formatUKDateOnly = (date) => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  return formatInTimeZone(dateObj, 'Europe/London', 'dd/MM/yyyy');
};

/**
 * Formats date and time (DD/MM/YYYY HH:mm) in UK timezone
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} - Date and time in UK format
 */
export const formatUKDateTime = (date) => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  return formatInTimeZone(dateObj, 'Europe/London', 'dd/MM/yyyy HH:mm');
};

/**
 * Formats date with month name (DD MMM YYYY) in UK timezone
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} - Date with month name
 */
export const formatUKDateWithMonth = (date) => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  return formatInTimeZone(dateObj, 'Europe/London', 'dd MMM yyyy');
};

/**
 * Gets current UK time
 * @returns {Date} - Current date/time in UK timezone
 */
export const getCurrentUKTime = () => {
  return new Date(new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }));
};

/**
 * Converts any time to UK timezone Date object
 * @param {Date|string} date - Date object or ISO string
 * @returns {Date} - Date object adjusted to UK timezone
 */
export const toUKTimezone = (date) => {
  if (!date) return null;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(dateObj.toLocaleString('en-GB', { timeZone: 'Europe/London' }));
};
