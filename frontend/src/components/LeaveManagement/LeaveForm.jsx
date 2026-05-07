import React, { useState, useEffect } from 'react';
import { User, Calendar, MessageSquare, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import axios from '../../utils/axiosConfig';
import { buildApiUrl } from '../../utils/apiConfig';
import { useAlert } from '../AlertNotification';

const LeaveForm = ({ selectedDates }) => {
  const { success, error: showError } = useAlert();
  const [formData, setFormData] = useState({
    leaveType: '',
    reason: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const leaveTypes = [
    'Annual Leave',
    'Bank Holiday',
    'Maternity Leave',
    'Paternity Leave',
    'Adoption Leave',
    'Shared Parental Leave',
    'Parental Leave',
    'Carer\'s Leave',
    'Parental Bereavement Leave',
    'Neonatal Care Leave',
    'Time Off for Dependants',
    'Sick Leave',
    'Jury Service',
    'Trade Union Duties',
    'Public Duty Leave',
    'Study / Training Leave',
    'Medical / Dental Appointment'
  ];

  // No need to fetch managers - unified system sends to all admins automatically

  // Removed fetchManagers - unified system automatically routes to all admins

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when field is changed
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.leaveType) newErrors.leaveType = 'Please select a leave type';
    if (!selectedDates.start) newErrors.dates = 'Please select start date from calendar';
    if (!selectedDates.end) newErrors.dates = 'Please select end date from calendar';
    if (!formData.reason || formData.reason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters';
    }

    if (selectedDates.start && selectedDates.end) {
      const start = new Date(selectedDates.start);
      const end = new Date(selectedDates.end);
      if (start > end) {
        newErrors.dates = 'Start date must be before end date';
      }
      if (start < new Date()) {
        newErrors.dates = 'Cannot request leave for past dates';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        leaveType: formData.leaveType,
        startDate: selectedDates.start,
        endDate: selectedDates.end,
        reason: formData.reason,
        status: 'Pending'
      };

      const response = await axios.post(buildApiUrl('/leave/request'), payload);

      if (response.data.success) {
        success('Leave request submitted successfully');
        setFormData({
          leaveType: '',
          reason: ''
        });
        setErrors({});
      } else {
        showError(response.data.message || 'Failed to submit leave request');
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      const isOverlapConflict = error.response?.status === 409 && error.response?.data?.conflictType === 'overlap';
      const errorMsg = isOverlapConflict
        ? error.response?.data?.message || 'An existing leave entry overlaps with the requested dates.'
        : error.response?.data?.message || 'Failed to submit leave request';
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
        <p className="text-sm text-blue-800 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Your request will be sent to all admins and super-admins for approval
        </p>
      </div>

      {/* Leave Type Dropdown */}
      <div>
        <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 mb-1">
          Leave Type *
        </label>
        <Select
          value={formData.leaveType}
          onValueChange={(value) => handleChange('leaveType', value)}
        >
          <SelectTrigger className={`w-full ${errors.leaveType ? "border-red-500 ring-red-500" : ""}`}>
            <SelectValue placeholder="Select leave type" />
          </SelectTrigger>
          <SelectContent>
            {leaveTypes.map((type, index) => (
              <SelectItem key={index} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.leaveType && (
          <p className="mt-1 text-sm text-red-600">{errors.leaveType}</p>
        )}
      </div>

      {/* Date Validation Error */}
      {errors.dates && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{errors.dates}</p>
        </div>
      )}

      {/* Reason Textarea */}
      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
          Reason for leave *
        </label>
        <div className="relative rounded-md shadow-sm">
          <div className="absolute top-3 left-3">
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </div>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            value={formData.reason}
            onChange={(e) => handleChange('reason', e.target.value)}
            placeholder="Please provide a detailed reason for your leave request (minimum 10 characters)"
            className={`block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.reason ? "border-red-500 ring-red-500" : ""}`}
          />
        </div>
        <div className="flex justify-between mt-1">
          <p className="text-xs text-gray-500">
            {formData.reason.length} / 500 characters
          </p>
          {errors.reason && (
            <p className="text-sm text-red-600">{errors.reason}</p>
          )}
        </div>
      </div>

      {/* Send Request Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !selectedDates.start || !selectedDates.end}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send Request'}
        </button>
      </div>
    </form>
  );
};

export default LeaveForm;
