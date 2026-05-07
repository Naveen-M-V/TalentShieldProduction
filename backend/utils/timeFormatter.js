/**
 * UK Time Zone Utility
 * All timestamps use Europe/London timezone
 */

/**
 * Get current UK date/time
 * @returns {Date} Current date in UK timezone
 */
const getUKDateTime = () => {
  return new Date(new Date().toLocaleString("en-GB", { timeZone: "Europe/London" }));
};

/**
 * Format date to UK format: "Fri, 24 Oct 2025"
 * @param {Date} date - Date to format
 * @returns {String} Formatted date string
 */
const formatUKDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString("en-GB", { 
    timeZone: "Europe/London",
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Format time to UK format: "09:03 AM"
 * @param {Date} date - Date to format
 * @returns {String} Formatted time string
 */
const formatUKTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString("en-GB", { 
    timeZone: "Europe/London",
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format date and time together: "Fri, 24 Oct 2025 – 09:03 AM"
 * @param {Date} date - Date to format
 * @returns {String} Formatted date-time string
 */
const formatUKDateTime = (date) => {
  if (!date) return '';
  return `${formatUKDate(date)} – ${formatUKTime(date)}`;
};

/**
 * Get current UK time in HH:MM format (24-hour)
 * @returns {String} Time in HH:MM format
 */
const getCurrentUKTime = () => {
  const now = new Date();
  return now.toLocaleString("en-GB", { 
    timeZone: "Europe/London",
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Get start of day in UK timezone
 * @param {Date} date - Date to process
 * @returns {Date} Start of day in UK timezone
 */
const getUKStartOfDay = (date = new Date()) => {
  const ukDateStr = date.toLocaleString("en-GB", { 
    timeZone: "Europe/London",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [day, month, year] = ukDateStr.split('/');
  return new Date(`${year}-${month}-${day}T00:00:00`);
};

/**
 * Get end of day in UK timezone
 * @param {Date} date - Date to process
 * @returns {Date} End of day in UK timezone
 */
const getUKEndOfDay = (date = new Date()) => {
  const ukDateStr = date.toLocaleString("en-GB", { 
    timeZone: "Europe/London",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [day, month, year] = ukDateStr.split('/');
  return new Date(`${year}-${month}-${day}T23:59:59.999Z`);
};

module.exports = {
  getUKDateTime,
  formatUKDate,
  formatUKTime,
  formatUKDateTime,
  getCurrentUKTime,
  getUKStartOfDay,
  getUKEndOfDay
};
