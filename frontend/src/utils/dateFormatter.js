/**
 * Centralized date formatting utilities
 * Ensures consistent date display format (DD/MM/YY) across the application
 */

/**
 * Format date as DD/MM/YY
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string in DD/MM/YY format
 */
export const formatDateDDMMYY = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  
  // Check if date is valid
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  
  return `${day}/${month}/${year}`;
};

/**
 * Format date as DD/MM/YYYY (full year)
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string in DD/MM/YYYY format
 */
export const formatDateDDMMYYYY = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  
  // Check if date is valid
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Format date with time as DD/MM/YY HH:MM
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string with time
 */
export const formatDateTimeDDMMYY = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  
  // Check if date is valid
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Get day name from date
 * @param {Date|string|number} date - Date to get day name from
 * @returns {string} Day name (e.g., "Monday")
 */
export const getDayName = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  
  // Check if date is valid
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('en-US', { weekday: 'long' });
};

/**
 * Get short day name from date
 * @param {Date|string|number} date - Date to get short day name from
 * @returns {string} Short day name (e.g., "Mon")
 */
export const getShortDayName = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  
  // Check if date is valid
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('en-US', { weekday: 'short' });
};

/**
 * Format date range as DD/MM/YY - DD/MM/YY
 * @param {Date|string|number} startDate - Start date
 * @param {Date|string|number} endDate - End date
 * @returns {string} Formatted date range
 */
export const formatDateRange = (startDate, endDate) => {
  const start = formatDateDDMMYY(startDate);
  const end = formatDateDDMMYY(endDate);
  
  if (!start || !end) return '';
  
  return `${start} - ${end}`;
};
