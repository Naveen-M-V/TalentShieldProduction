import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { buildApiUrl } from '../utils/apiConfig';

const ShiftSwapModal = ({ shift, onClose, onSuccess }) => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch available employees for swap
    const fetchEmployees = async () => {
      try {
        const response = await axios.get(buildApiUrl('/employees'));
        // Filter out current employee
        const availableEmployees = response.data.data.filter(
          emp => emp._id !== shift.employeeId._id
        );
        setEmployees(availableEmployees);
      } catch (error) {
        console.error('Error fetching employees:', error);
        setError('Failed to load available employees');
      }
    };
    fetchEmployees();
  }, [shift]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        buildApiUrl('/rota/shifts/request-swap'),
        {
          shiftId: shift._id,
          swapWithEmployeeId: selectedEmployee,
          reason
        }
      );

      if (response.data.success) {
        alert('Shift swap request submitted successfully! The other employee will be notified.');
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error requesting shift swap:', error);
      setError(error.response?.data?.message || 'Failed to request shift swap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Request Shift Swap</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            &times;
          </button>
        </div>
        
        <div className="mb-4 bg-blue-50 p-4 rounded border border-blue-200">
          <h3 className="font-semibold mb-2 text-blue-900">Current Shift Details</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <p><strong>Date:</strong> {new Date(shift.date).toLocaleDateString('en-GB')}</p>
            <p><strong>Time:</strong> {shift.startTime} - {shift.endTime}</p>
            <p><strong>Location:</strong> {shift.location}</p>
            <p><strong>Work Type:</strong> {shift.workType}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee to Swap With <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} - {emp.department || 'N/A'}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Swap <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="4"
              placeholder="Please provide a reason for the swap request..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              The other employee will receive this reason with the swap request.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <p><strong>Note:</strong> The selected employee must accept your swap request before it takes effect. You'll be notified when they respond.</p>
        </div>
      </div>
    </div>
  );
};

export default ShiftSwapModal;
