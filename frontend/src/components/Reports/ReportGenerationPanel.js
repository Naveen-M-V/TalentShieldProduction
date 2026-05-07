import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileSpreadsheet, FileText, Calendar, Users, Loader } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

const ReportGenerationPanel = ({ report, icon: Icon, onClose }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [exportFormat, setExportFormat] = useState('json');
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportReady, setReportReady] = useState(false);
  const [error, setError] = useState(null);
  const [additionalOptions, setAdditionalOptions] = useState({});

  useEffect(() => {
    // Set default date range (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(format(end, 'yyyy-MM-dd'));
    setStartDate(format(start, 'yyyy-MM-dd'));

    // Fetch employees for selection
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/api/employees');
      if (response.data.success) {
        setAllEmployees(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const getEndpointForReport = (reportId) => {
    const endpoints = {
      'absence': '/api/report-library/absence',
      'annual-leave': '/api/report-library/annual-leave',
      'lateness': '/api/report-library/lateness',
      'overtime': '/api/report-library/overtime',
      'rota': '/api/report-library/rota',
      'sickness': '/api/report-library/sickness',
      'employee-details': '/api/report-library/employee-details',
      'payroll-exceptions': '/api/report-library/payroll-exceptions',
      'expenses': '/api/report-library/expenses',
      'length-of-service': '/api/report-library/length-of-service',
      'turnover': '/api/report-library/turnover',
      'working-status': '/api/report-library/working-status',
      'sensitive-info': '/api/report-library/sensitive-info',
      'furloughed': '/api/report-library/furloughed'
    };
    return endpoints[reportId] || null;
  };

  const buildRequestPayload = () => {
    const payload = {
      startDate,
      endDate,
      employeeIds: selectedEmployees.length > 0 ? selectedEmployees : undefined,
      ...additionalOptions
    };

    // Report-specific adjustments
    if (report.id === 'annual-leave') {
      payload.year = new Date(startDate).getFullYear();
    }

    if (report.id === 'sensitive-info') {
      payload.expiryWithinDays = additionalOptions.expiryWithinDays || 30;
    }

    return payload;
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    setError(null);
    setReportData(null);
    setReportReady(false);

    console.log('[Report Generation] Starting report generation');
    console.log('[Report Generation] Report type:', report.id);
    console.log('[Report Generation] Date range:', startDate, 'to', endDate);
    console.log('[Report Generation] Selected employees:', selectedEmployees.length);

    try {
      const endpoint = getEndpointForReport(report.id);
      if (!endpoint) {
        throw new Error('Invalid report type');
      }

      const payload = buildRequestPayload();
      console.log('[Report Generation] Request payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(endpoint, payload);

      console.log('[Report Generation] Response received');
      console.log('[Report Generation] Response success:', response.data.success);
      console.log('[Report Generation] Response data keys:', Object.keys(response.data));

      if (response.data.success) {
        const data = response.data.data;
        
        // Validate the response data structure
        if (!data) {
          throw new Error('Server returned success but no data');
        }
        
        if (!data.reportType) {
          console.warn('[Report Generation] WARNING: Missing reportType in response');
          data.reportType = report.id; // Fallback to the requested report type
        }
        
        if (!data.records) {
          console.warn('[Report Generation] WARNING: Missing records array in response');
          data.records = [];
        }
        
        if (!Array.isArray(data.records)) {
          console.error('[Report Generation] ERROR: records is not an array:', typeof data.records);
          throw new Error('Invalid data structure: records must be an array');
        }
        
        console.log('[Report Generation] Valid data structure confirmed');
        console.log('[Report Generation] Report type:', data.reportType);
        console.log('[Report Generation] Total records:', data.records.length);
        
        if (data.records.length > 0) {
          console.log('[Report Generation] Sample record:', JSON.stringify(data.records[0], null, 2));
        }
        
        setReportData(data);
        
        // BLOCKING FIX #1: Only enable export after data is validated
        // Reports with 0 records are still "ready" - they'll show "No records" in PDF
        setReportReady(true);
        console.log('[Report Generation] Report ready for export');
      } else {
        setError(response.data.error || 'Failed to generate report');
      }
    } catch (err) {
      console.error('[Report Generation] Error:', err);
      console.error('[Report Generation] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.response?.data?.error || err.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    // BLOCKING FIX #1: Check reportReady state to prevent race condition
    if (!reportReady) {
      console.error('[Export] Report not ready - generation still in progress or failed');
      setError('Report is not ready. Please wait for generation to complete.');
      return;
    }

    if (!reportData) {
      console.error('[Export] No report data available');
      setError('No report data available. Please generate a report first.');
      return;
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `${report.id}_${timestamp}`;

    // Validate reportData structure
    console.log('[Export] Starting export process');
    console.log('[Export] Export format:', exportFormat);
    console.log('[Export] Report data keys:', Object.keys(reportData));
    console.log('[Export] Report type:', reportData.reportType);
    console.log('[Export] Records:', Array.isArray(reportData.records) ? `array with ${reportData.records.length} items` : typeof reportData.records);

    if (!reportData.reportType) {
      console.error('[Export] Missing reportType in reportData');
      setError('Invalid report data: missing report type');
      return;
    }

    if (!reportData.records || !Array.isArray(reportData.records)) {
      console.error('[Export] Invalid records structure:', reportData.records);
      setError('Invalid report data: records must be an array');
      return;
    }

    try {
      if (exportFormat === 'json') {
        const dataStr = JSON.stringify(reportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = `${filename}.json`;
        link.click();
        URL.revokeObjectURL(url);
        console.log('[Export] JSON export completed');
      } else if (exportFormat === 'csv') {
        console.log('[Export] Sending CSV export request...');
        const response = await axios.post('/api/report-library/export/csv', 
          { reportData },
          { responseType: 'blob' }
        );
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        console.log('[Export] CSV export completed');
      } else if (exportFormat === 'pdf') {
        console.log('[Export] Sending PDF export request...');
        console.log('[Export] Payload:', JSON.stringify({ reportData }, null, 2));
        
        const response = await axios.post('/api/report-library/export/pdf', 
          { reportData },
          { 
            responseType: 'blob',
            validateStatus: (status) => status < 500 // Don't reject on 4xx errors
          }
        );

        console.log('[Export] PDF response received');
        console.log('[Export] Response type:', response.headers['content-type']);
        console.log('[Export] Response size:', response.data.size, 'bytes');

        // Check if response is actually a PDF
        if (response.headers['content-type'] !== 'application/pdf') {
          // It might be an error JSON
          const text = await response.data.text();
          console.error('[Export] Expected PDF but got:', response.headers['content-type']);
          console.error('[Export] Response:', text);
          throw new Error('Server returned error instead of PDF: ' + text);
        }

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = `${filename}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        console.log('[Export] PDF export completed successfully');
      }
    } catch (error) {
      console.error('[Export] Export error:', error);
      console.error('[Export] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      let errorMessage = 'Failed to export report: ';
      if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error occurred';
      }
      
      setError(errorMessage);
    }
  };

  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === allEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(allEmployees.map(emp => emp._id));
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {Icon && <Icon size={32} />}
              <div>
                <h2 className="text-2xl font-bold">{report.name}</h2>
                <p className="text-blue-100 text-sm">{report.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Date Range */}
            {!['employee-details', 'working-status', 'furloughed', 'length-of-service'].includes(report.id) && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Calendar size={16} className="inline mr-2" />
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Employee Selection */}
            {!['working-status'].includes(report.id) && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Users size={16} className="inline mr-2" />
                  Employees
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="mb-2">
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      {selectedEmployees.length === allEmployees.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="text-sm text-gray-600 ml-2">
                      ({selectedEmployees.length} selected)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {allEmployees.map(emp => (
                      <label key={emp._id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp._id)}
                          onChange={() => handleEmployeeToggle(emp._id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {emp.firstName} {emp.lastName} ({emp.employeeId})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Report-Specific Options */}
            {report.id === 'sensitive-info' && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Expiry Threshold (days)
                </label>
                <input
                  type="number"
                  value={additionalOptions.expiryWithinDays || 30}
                  onChange={(e) => setAdditionalOptions({ ...additionalOptions, expiryWithinDays: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="365"
                />
              </div>
            )}

            {report.id === 'lateness' && (
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={additionalOptions.includeExcused || false}
                    onChange={(e) => setAdditionalOptions({ ...additionalOptions, includeExcused: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include excused lateness</span>
                </label>
              </div>
            )}

            {/* Export Format */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FileText size={16} className="inline mr-2" />
                Export Format
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="json"
                    checked={exportFormat === 'json'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">JSON</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">CSV</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="pdf"
                    checked={exportFormat === 'pdf'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">PDF</span>
                </label>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Report Results */}
            {reportData && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Report Generated Successfully
                </h3>
                <p className="text-green-700 text-sm mb-4">
                  Found {reportData.totalRecords || 0} records
                </p>
                <div className="bg-white p-4 rounded border border-green-300 max-h-60 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(reportData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 flex justify-between items-center bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <div className="flex gap-3">
              {reportData && (
                <button
                  onClick={handleExport}
                  disabled={!reportReady || generating}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Download size={18} />
                  Export {exportFormat.toUpperCase()}
                </button>
              )}
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={18} />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReportGenerationPanel;
