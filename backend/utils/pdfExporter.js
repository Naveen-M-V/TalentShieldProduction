const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF report with formatted tables and summaries
 * @param {Object} reportData - Full report data from controller
 * @param {String} outputPath - Path to save PDF (optional, if not provided returns stream)
 * @returns {PDFDocument} PDF document stream
 */
const generatePDFReport = (reportData) => {
  // Validate input
  if (!reportData) {
    throw new Error('reportData is required for PDF generation');
  }
  if (!reportData.reportType) {
    throw new Error('reportData.reportType is required');
  }
  if (!reportData.records || !Array.isArray(reportData.records)) {
    console.warn('[PDF Generator] No records array found, creating empty report');
    reportData.records = [];
  }

  console.log('[PDF Generator] Starting PDF generation for:', reportData.reportType);
  console.log('[PDF Generator] Total records:', reportData.records.length);

  const doc = new PDFDocument({ 
    size: 'A4',
    margin: 50,
    bufferPages: true
  });

  // Header - Company Name
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .text('TalentShield', { align: 'center' })
     .moveDown(0.5);

  // Report Title (Main Heading)
  const reportTitles = {
    'absence': 'Absence Report',
    'annual-leave': 'Annual Leave Report',
    'lateness': 'Lateness Report',
    'overtime': 'Overtime Report',
    'rota': 'Rota Schedule Report',
    'sickness': 'Sickness Report',
    'employee-details': 'Employee Details Report',
    'payroll-exceptions': 'Payroll Exceptions Report',
    'expenses': 'Expenses Report',
    'length-of-service': 'Length of Service Report',
    'turnover': 'Turnover & Retention Report',
    'working-status': 'Working Status Report',
    'sensitive-info': 'Sensitive Information Report',
    'furloughed': 'Furloughed Employees Report'
  };

  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text(reportTitles[reportData.reportType] || 'Report', { align: 'center' })
     .moveDown(0.5);

  // Date Range (if applicable)
  if (reportData.dateRange) {
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Period: ${formatDate(reportData.dateRange.startDate)} to ${formatDate(reportData.dateRange.endDate)}`, 
             { align: 'center' })
       .moveDown(0.5);
  }

  // Generated Date
  doc.fontSize(8)
     .fillColor('#666666')
     .text(`Generated on: ${new Date().toLocaleString('en-GB')}`, { align: 'center' })
     .fillColor('#000000')
     .moveDown(1);

  // Horizontal line
  doc.moveTo(50, doc.y)
     .lineTo(545, doc.y)
     .stroke()
     .moveDown(1);

  // Summary Section
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('Summary', { underline: true })
     .moveDown(0.5);

  // BLOCKING FIX #2: Always use actual records.length as source of truth
  const actualRecordCount = reportData.records?.length || 0;
  
  doc.fontSize(10)
     .font('Helvetica')
     .text(`Total Records: ${actualRecordCount}`)
     .moveDown(0.5);

  // Report-specific summaries
  addReportSummary(doc, reportData);

  doc.moveDown(1);

  // Records Table
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('Detailed Records', { underline: true })
     .moveDown(0.5);

  // Add table based on report type
  addReportTable(doc, reportData);

  // Footer on each page
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8)
       .fillColor('#666666')
       .text(
         `Page ${i + 1} of ${pageCount}`,
         50,
         doc.page.height - 50,
         { align: 'center' }
       )
       .fillColor('#000000');
  }

  return doc;
};

/**
 * Add report-specific summary information
 */
const addReportSummary = (doc, reportData) => {
  const { reportType } = reportData;

  switch (reportType) {
    case 'absence':
      const totalDays = reportData.records?.reduce((sum, r) => sum + (r.totalAbsenceDays || 0), 0);
      doc.text(`Total Absence Days: ${totalDays || 0}`);
      if (reportData.unrecordedAbsences) {
        doc.text(`Unrecorded Absences: ${reportData.unrecordedAbsences.length || 0}`);
      }
      break;

    case 'lateness':
      const totalLateIncidents = reportData.records?.reduce((sum, r) => sum + (r.totalIncidents || 0), 0);
      const totalMinutes = reportData.records?.reduce((sum, r) => sum + (r.totalMinutesLate || 0), 0);
      doc.text(`Total Late Incidents: ${totalLateIncidents || 0}`);
      doc.text(`Total Minutes Late: ${totalMinutes?.toFixed(0) || 0}`);
      break;

    case 'annual-leave':
      const totalUsed = reportData.records?.reduce((sum, r) => sum + (r.used || 0), 0);
      const totalRemaining = reportData.records?.reduce((sum, r) => sum + (r.remaining || 0), 0);
      doc.text(`Total Days Used: ${totalUsed?.toFixed(1) || 0}`);
      doc.text(`Total Days Remaining: ${totalRemaining?.toFixed(1) || 0}`);
      break;

    case 'sickness':
      const highRisk = reportData.records?.filter(r => r.riskLevel === 'high').length || 0;
      const mediumRisk = reportData.records?.filter(r => r.riskLevel === 'medium').length || 0;
      doc.text(`High Risk Employees: ${highRisk}`);
      doc.text(`Medium Risk Employees: ${mediumRisk}`);
      break;

    case 'expenses':
      if (reportData.totals) {
        doc.text(`Pending: £${reportData.totals.pending?.toFixed(2) || '0.00'}`);
        doc.text(`Approved: £${reportData.totals.approved?.toFixed(2) || '0.00'}`);
        doc.text(`Paid: £${reportData.totals.paid?.toFixed(2) || '0.00'}`);
        doc.text(`Rejected: £${reportData.totals.rejected?.toFixed(2) || '0.00'}`);
      }
      break;

    case 'turnover':
      if (reportData.summary) {
        doc.text(`Starting Headcount: ${reportData.summary.startingHeadcount}`);
        doc.text(`Ending Headcount: ${reportData.summary.endingHeadcount}`);
        doc.text(`New Hires: ${reportData.summary.newHires}`);
        doc.text(`Terminations: ${reportData.summary.terminations}`);
        doc.text(`Turnover Rate: ${reportData.summary.turnoverRate}`);
      }
      break;

    case 'overtime':
      const totalOT = reportData.records?.reduce((sum, r) => sum + parseFloat(r.totalOvertimeHours || 0), 0);
      const totalCost = reportData.records?.reduce((sum, r) => sum + parseFloat(r.totalOvertimePay || 0), 0);
      doc.text(`Total Overtime Hours: ${totalOT?.toFixed(2) || 0}`);
      doc.text(`Total Overtime Pay: £${totalCost?.toFixed(2) || 0}`);
      break;

    case 'rota':
      const uniqueDates = new Set(reportData.records?.map(r => new Date(r.date).toDateString())).size;
      doc.text(`Total Shifts: ${reportData.totalRecords || 0}`);
      doc.text(`Days Covered: ${uniqueDates || 0}`);
      break;

    case 'sensitive-info':
      const expired = reportData.records?.filter(r => r.status === 'expired').length || 0;
      const urgent = reportData.records?.filter(r => r.status === 'urgent').length || 0;
      doc.text(`Expired Certificates: ${expired}`);
      doc.text(`Urgent (< 7 days): ${urgent}`);
      break;

    case 'working-status':
      doc.text(`Total Employees: ${reportData.totalEmployees || 0}`);
      break;

    case 'length-of-service':
      const avgYears = reportData.records?.reduce((sum, r) => sum + (r.years || 0), 0) / (reportData.records?.length || 1);
      doc.text(`Average Service: ${avgYears?.toFixed(1) || 0} years`);
      break;
  }

  doc.moveDown(0.5);
};

/**
 * Add formatted table for report records
 */
const addReportTable = (doc, reportData) => {
  const records = reportData.records || [];
  
  // Add logging for diagnostics
  console.log(`[PDF Export] Report Type: ${reportData.reportType}`);
  console.log(`[PDF Export] Records Count: ${records.length}`);
  if (records.length > 0) {
    console.log(`[PDF Export] First Record Keys:`, Object.keys(records[0]));
    console.log(`[PDF Export] Sample Data:`, JSON.stringify(records[0], null, 2));
  }
  
  if (records.length === 0) {
    console.log(`[PDF Export] WARNING: No records found for report type: ${reportData.reportType}`);
    doc.fontSize(10)
       .fillColor('#999999')
       .text('No records found for this report period.', { align: 'center' })
       .fillColor('#000000');
    return;
  }

  // Table configuration by report type
  const tableConfigs = {
    'absence': {
      headers: ['Employee ID', 'Name', 'Department', 'Total Days', 'Instances'],
      widths: [80, 150, 120, 80, 80],
      fields: ['employeeId', 'fullName', 'department', 'totalAbsenceDays', 'totalInstances']
    },
    'lateness': {
      headers: ['Employee ID', 'Name', 'Total Incidents', 'Excused', 'Avg Minutes'],
      widths: [80, 150, 100, 80, 80],
      fields: ['employeeId', 'fullName', 'totalIncidents', 'excusedIncidents', 'averageMinutesLate']
    },
    'expenses': {
      headers: ['Date', 'Employee', 'Category', 'Amount', 'Status'],
      widths: [80, 150, 100, 80, 80],
      fields: ['date', 'employeeName', 'category', 'amount', 'status']
    },
    'sickness': {
      headers: ['Employee ID', 'Name', 'Days', 'Instances', 'Bradford', 'Risk'],
      widths: [70, 130, 60, 70, 70, 60],
      fields: ['employeeId', 'fullName', 'totalDays', 'instances', 'bradfordFactor', 'riskLevel']
    },
    'annual-leave': {
      headers: ['Employee ID', 'Name', 'Department', 'Entitled', 'Used', 'Remaining'],
      widths: [80, 130, 100, 70, 70, 70],
      fields: ['employeeId', 'fullName', 'department', 'entitled', 'used', 'remaining']
    },
    'employee-details': {
      headers: ['Employee ID', 'First Name', 'Last Name', 'Department', 'Job Title', 'Email'],
      widths: [80, 100, 100, 100, 100, 120],
      fields: ['employeeId', 'firstName', 'lastName', 'department', 'jobTitle', 'email']
    },
    'working-status': {
      headers: ['Status', 'Count', 'Percentage', 'Employees'],
      widths: [120, 100, 100, 220],
      fields: ['status', 'count', 'percentage', 'employees']
    },
    'rota': {
      headers: ['Date', 'Employee ID', 'Name', 'Shift', 'Start', 'End'],
      widths: [80, 80, 130, 100, 70, 70],
      fields: ['date', 'employeeId', 'fullName', 'shiftName', 'startTime', 'endTime']
    },
    'overtime': {
      headers: ['Employee ID', 'Name', 'Department', 'OT Hours', 'Rate', 'Total Pay'],
      widths: [70, 130, 100, 70, 70, 80],
      fields: ['employeeId', 'fullName', 'department', 'totalOvertimeHours', 'hourlyRate', 'totalOvertimePay']
    },
    'turnover': {
      headers: ['Type', 'Employee ID', 'Name', 'Department', 'Date'],
      widths: [80, 90, 130, 120, 100],
      fields: ['type', 'employeeId', 'fullName', 'department', 'date']
    },
    'sensitive-info': {
      headers: ['Employee ID', 'Name', 'Certificate', 'Expiry Date', 'Days Left', 'Status'],
      widths: [70, 110, 110, 90, 70, 70],
      fields: ['employeeId', 'employeeName', 'certificateName', 'expiryDate', 'daysUntilExpiry', 'status']
    },
    'furloughed': {
      headers: ['Employee ID', 'Name', 'Department', 'Start Date', 'End Date', 'Days'],
      widths: [70, 130, 100, 90, 90, 60],
      fields: ['employeeId', 'fullName', 'department', 'furloughStartDate', 'furloughEndDate', 'daysOnFurlough']
    },
    'length-of-service': {
      headers: ['Employee ID', 'Name', 'Department', 'Start Date', 'Years', 'Total Days'],
      widths: [70, 130, 110, 90, 60, 80],
      fields: ['employeeId', 'fullName', 'department', 'startDate', 'years', 'totalDays']
    },
    'payroll-exceptions': {
      headers: ['Employee ID', 'Name', 'Type', 'Severity', 'Description', 'Status'],
      widths: [70, 110, 80, 70, 130, 60],
      fields: ['employeeId', 'employeeName', 'type', 'severity', 'description', 'resolved']
    }
  };

  const config = tableConfigs[reportData.reportType] || {
    headers: Object.keys(records[0]).slice(0, 5),
    widths: [100, 100, 100, 100, 100],
    fields: Object.keys(records[0]).slice(0, 5)
  };

  // Draw table headers
  const startX = 50;
  let currentY = doc.y;

  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#333333');

  config.headers.forEach((header, i) => {
    const x = startX + config.widths.slice(0, i).reduce((a, b) => a + b, 0);
    doc.text(header, x, currentY, { width: config.widths[i], continued: false });
  });

  currentY += 20;
  doc.moveTo(startX, currentY)
     .lineTo(startX + config.widths.reduce((a, b) => a + b, 0), currentY)
     .stroke();
  currentY += 5;

  // Draw table rows
  doc.fontSize(8)
     .font('Helvetica')
     .fillColor('#000000');

  const maxRecords = 50; // Limit to prevent huge PDFs
  const recordsToShow = records.slice(0, maxRecords);

  recordsToShow.forEach((record, rowIndex) => {
    // Check if we need a new page
    if (currentY > 700) {
      doc.addPage();
      currentY = 50;
    }

    config.fields.forEach((field, colIndex) => {
      const x = startX + config.widths.slice(0, colIndex).reduce((a, b) => a + b, 0);
      let value = record[field];

      // Special handling for working-status employees array
      if (field === 'employees' && Array.isArray(value)) {
        value = value.length > 0 ? `${value.length} employees` : '-';
      }

      // Format values
      if (value === null || value === undefined) {
        value = '-';
      } else if (typeof value === 'number') {
        value = value.toFixed(2);
      } else if (value instanceof Date) {
        value = formatDate(value);
      } else if (typeof value === 'boolean') {
        value = value ? 'Yes' : 'No';
      } else if (Array.isArray(value)) {
        value = value.join(', ');
      } else {
        value = String(value);
      }

      doc.text(value, x, currentY, { 
        width: config.widths[colIndex], 
        continued: false,
        ellipsis: true 
      });
    });

    currentY += 15;

    // Draw light separator line every 5 rows
    if ((rowIndex + 1) % 5 === 0) {
      doc.strokeColor('#EEEEEE')
         .moveTo(startX, currentY)
         .lineTo(startX + config.widths.reduce((a, b) => a + b, 0), currentY)
         .stroke()
         .strokeColor('#000000');
      currentY += 3;
    }
  });

  if (records.length > maxRecords) {
    doc.moveDown(1)
       .fontSize(8)
       .fillColor('#999999')
       .text(`Note: Showing first ${maxRecords} of ${records.length} records. Export to CSV for complete data.`, 
             { align: 'center' })
       .fillColor('#000000');
  }
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
};

/**
 * Export report to PDF and return as buffer
 */
const exportReportToPDF = (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = generatePDFReport(reportData);
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generatePDFReport,
  exportReportToPDF
};
