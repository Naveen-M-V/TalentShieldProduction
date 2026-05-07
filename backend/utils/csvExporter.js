const { Parser } = require('json2csv');

const fieldMappings = {
  absence: [
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'Employee Name', value: 'fullName' },
    { label: 'Department', value: 'department' },
    { label: 'Job Title', value: 'jobTitle' },
    { label: 'Total Absence Days', value: 'totalAbsenceDays' },
    { label: 'Total Instances', value: 'totalInstances' }
  ],
  'annual-leave': [
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'Employee Name', value: 'fullName' },
    { label: 'Department', value: 'department' },
    { label: 'Entitled Days', value: 'entitled' },
    { label: 'Used Days', value: 'used' },
    { label: 'Remaining Days', value: 'remaining' },
    { label: 'Instances', value: 'instances' }
  ],
  lateness: [
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'Employee Name', value: 'fullName' },
    { label: 'Department', value: 'department' },
    { label: 'Job Title', value: 'jobTitle' },
    { label: 'Total Incidents', value: 'totalIncidents' },
    { label: 'Excused Incidents', value: 'excusedIncidents' },
    { label: 'Unexcused Incidents', value: 'unexcusedIncidents' },
    { label: 'Total Minutes Late', value: 'totalMinutesLate' },
    { label: 'Average Minutes Late', value: 'averageMinutesLate' }
  ],
  overtime: [
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'Employee Name', value: 'fullName' },
    { label: 'Department', value: 'department' },
    { label: 'Job Title', value: 'jobTitle' },
    { label: 'Hourly Rate', value: 'hourlyRate' },
    { label: 'Total Overtime Hours', value: 'totalOvertimeHours' },
    { label: 'Overtime Instances', value: 'overtimeInstances' },
    { label: 'Estimated Cost (£)', value: 'estimatedCost' }
  ],
  rota: [
    { label: 'Date', value: 'date' },
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'Employee Name', value: 'fullName' },
    { label: 'Department', value: 'department' },
    { label: 'Shift Name', value: 'shiftName' },
    { label: 'Start Time', value: 'startTime' },
    { label: 'End Time', value: 'endTime' },
    { label: 'Location', value: 'location' },
    { label: 'Status', value: 'status' }
  ],
  sickness: [
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'Employee Name', value: 'fullName' },
    { label: 'Department', value: 'department' },
    { label: 'Job Title', value: 'jobTitle' },
    { label: 'Total Days', value: 'totalDays' },
    { label: 'Instances', value: 'instances' },
    { label: 'Bradford Factor', value: 'bradfordFactor' },
    { label: 'Risk Level', value: 'riskLevel' }
  ],
  'employee-details': [
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'First Name', value: 'firstName' },
    { label: 'Last Name', value: 'lastName' },
    { label: 'Email', value: 'email' },
    { label: 'Department', value: 'department' },
    { label: 'Job Title', value: 'jobTitle' },
    { label: 'Status', value: 'status' }
  ],
  'payroll-exceptions': [
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'Employee Name', value: 'employeeName' },
    { label: 'Department', value: 'department' },
    { label: 'Exception Type', value: 'exceptionType' },
    { label: 'Description', value: 'description' },
    { label: 'Severity', value: 'severity' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Affected Amount (£)', value: 'affectedAmount' },
    { label: 'Pay Period Start', value: 'payPeriodStart' },
    { label: 'Pay Period End', value: 'payPeriodEnd' }
  ],
  expenses: [
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'Employee Name', value: 'employeeName' },
    { label: 'Department', value: 'department' },
    { label: 'Date', value: 'date' },
    { label: 'Category', value: 'category' },
    { label: 'Description', value: 'description' },
    { label: 'Amount', value: 'amount' },
    { label: 'Currency', value: 'currency' },
    { label: 'Status', value: 'status' },
    { label: 'Approved By', value: 'approvedByName' }
  ],
  'length-of-service': [
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'Employee Name', value: 'fullName' },
    { label: 'Department', value: 'department' },
    { label: 'Job Title', value: 'jobTitle' },
    { label: 'Start Date', value: 'startDate' },
    { label: 'Total Days', value: 'totalDays' },
    { label: 'Years', value: 'years' },
    { label: 'Months', value: 'months' },
    { label: 'Service Years', value: 'serviceYears' }
  ],
  turnover: [
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'Full Name', value: 'fullName' },
    { label: 'Department', value: 'department' },
    { label: 'Job Title', value: 'jobTitle' },
    { label: 'Terminated Date', value: 'terminatedDate' }
  ],
  'working-status': [
    { label: 'Status', value: 'status' },
    { label: 'Count', value: 'count' },
    { label: 'Percentage', value: 'percentage' }
  ],
  'sensitive-info': [
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'Employee Name', value: 'employeeName' },
    { label: 'Department', value: 'department' },
    { label: 'Certificate Type', value: 'certificateType' },
    { label: 'Expiry Date', value: 'expiryDate' },
    { label: 'Days Until Expiry', value: 'daysUntilExpiry' },
    { label: 'Status', value: 'status' }
  ],
  furloughed: [
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'Employee Name', value: 'fullName' },
    { label: 'Department', value: 'department' },
    { label: 'Job Title', value: 'jobTitle' },
    { label: 'Furlough Start Date', value: 'furloughStartDate' },
    { label: 'Furlough End Date', value: 'furloughEndDate' },
    { label: 'Days On Furlough', value: 'daysOnFurlough' }
  ]
};

const toCsvHeader = (fields = []) => fields.map((field) => field.label).join(',');

/**
 * Export report data to CSV format
 * @param {Array} data - Array of report records
 * @param {String} reportType - Type of report (for field mapping)
 * @returns {String} CSV formatted string
 */
const exportToCSV = (data, reportType) => {
  // Get fields for this report type, or use all fields from first record
  const fields = fieldMappings[reportType] || Object.keys(data[0] || {}).map(key => ({
    label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
    value: key
  }));

  if (!data || data.length === 0) {
    return toCsvHeader(fields);
  }

  try {
    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    return csv;
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw new Error('Failed to generate CSV export');
  }
};

/**
 * Export report with summary data to CSV
 * @param {Object} reportData - Full report data object from controller
 * @returns {String} CSV formatted string
 */
const exportReportToCSV = (reportData) => {
  if (!reportData || !Array.isArray(reportData.records)) {
    throw new Error('No report data to export');
  }

  const reportType = reportData.reportType;
  const records = reportData.records;

  // For turnover report, export terminated employees
  if (reportType === 'turnover' && reportData.terminatedEmployees) {
    return exportToCSV(reportData.terminatedEmployees, reportType);
  }

  return exportToCSV(records, reportType);
};

module.exports = {
  exportToCSV,
  exportReportToCSV
};
