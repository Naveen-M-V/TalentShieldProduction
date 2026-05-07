import React, { useState } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { DatePicker } from './ui/date-picker';
import axios from '../utils/axiosConfig';
import dayjs from 'dayjs';
import { buildApiUrl } from '../utils/apiConfig';

// Sickness Modal
export const SicknessModal = ({ employee, onClose, onSuccess }) => {
  const [sicknessRecords, setSicknessRecords] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    startDate: null,
    endDate: null,
    sicknessType: 'illness',
    reason: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    fetchSicknessRecords();
  }, []);

  const fetchSicknessRecords = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(buildApiUrl(`/sickness/employee/${employee._id}`), {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
        withCredentials: true
      });
      setSicknessRecords(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch sickness records:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      
      // Format dates properly - ensure they are Date objects or ISO strings
      const startDateValue = formData.startDate instanceof Date 
        ? formData.startDate.toISOString() 
        : formData.startDate;
      const endDateValue = (formData.endDate instanceof Date 
        ? formData.endDate.toISOString() 
        : formData.endDate) || startDateValue;
      
      await axios.post(buildApiUrl('/sickness/create'), {
        employeeId: employee._id,
        startDate: startDateValue,
        endDate: endDateValue,
        reason: formData.reason,
        sicknessType: formData.sicknessType,
        symptoms: formData.notes
      }, {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
        withCredentials: true
      });

      setFormData({ startDate: null, endDate: null, sicknessType: 'illness', reason: '', notes: '' });
      setShowAddForm(false);
      fetchSicknessRecords();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to add sickness record:', err);
      alert('Failed to add sickness record: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this sickness record?')) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(buildApiUrl(`/sickness/${recordId}`), {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
        withCredentials: true
      });
      fetchSicknessRecords();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to delete sickness record:', err);
      alert('Failed to delete record');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-red-600 to-red-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Sickness Records</h2>
            <p className="text-red-100 text-sm mt-1">{employee.name || `${employee.firstName} ${employee.lastName}`}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors text-gray-600 hover:text-red-600"
            >
              <PlusIcon className="h-5 w-5" />
              Add Sickness Record
            </button>
          )}

          {/* Add Form */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="mb-6 bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">New Sickness Record</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                  required
                />
                <DatePicker
                  label="End Date"
                  value={formData.endDate}
                  onChange={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
                  minDate={formData.startDate}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Type of Sickness</label>
                <select
                  value={formData.sicknessType}
                  onChange={(e) => setFormData(prev => ({ ...prev, sicknessType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="illness">Illness</option>
                  <option value="injury">Injury</option>
                  <option value="medical-appointment">Medical Appointment</option>
                  <option value="mental-health">Mental Health</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g., Flu, Cold, Medical appointment"
                  className="w-full border border-gray-300 rounded-lg p-2"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional details..."
                  className="w-full border border-gray-300 rounded-lg p-2"
                  rows="3"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300"
                >
                  {loading ? 'Adding...' : 'Add Record'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ startDate: null, endDate: null, sicknessType: 'illness', reason: '', notes: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Records List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              All Records ({sicknessRecords.length})
            </h3>
            {sicknessRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No sickness records found</p>
              </div>
            ) : (
              sicknessRecords.map((record) => (
                <div key={record._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-red-600 font-semibold">{record.sicknessType || 'Sickness'}</span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                          {record.numberOfDays} day{record.numberOfDays !== 1 ? 's' : ''}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          record.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                          record.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {record.approvalStatus}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {dayjs(record.startDate).format('MMM D, YYYY')} 
                        {record.endDate && record.endDate !== record.startDate && 
                          ` - ${dayjs(record.endDate).format('MMM D, YYYY')}`}
                      </p>
                      {record.notes && (
                        <p className="text-sm text-gray-500 mt-2 italic">"{record.notes}"</p>
                      )}
                      {record.requiresNote && (
                        <p className="text-sm text-orange-600 mt-1">
                          Medical note {record.medicalNoteSubmitted ? '✓ submitted' : '⚠ required'}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(record._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Lateness Modal
export const LatenessModal = ({ employee, onClose, onSuccess }) => {
  const [latenessRecords, setLatenessRecords] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    date: null,
    minutes: '',
    reason: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    fetchLatenessRecords();
  }, []);

  const fetchLatenessRecords = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(buildApiUrl(`/lateness/employee/${employee._id}`), {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
        withCredentials: true
      });
      setLatenessRecords(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch lateness records:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      
      // Create scheduledStart and actualStart times
      const dateObj = new Date(formData.date);
      const scheduledStart = new Date(dateObj);
      scheduledStart.setHours(9, 0, 0, 0); // Default 9:00 AM
      
      const actualStart = new Date(dateObj);
      actualStart.setHours(9, parseInt(formData.minutes), 0, 0); // Add lateness minutes
      
      await axios.post(buildApiUrl('/lateness/create'), {
        employeeId: employee._id,
        date: formData.date,
        scheduledStart: scheduledStart.toISOString(),
        actualStart: actualStart.toISOString(),
        minutesLate: parseInt(formData.minutes),
        reason: formData.notes || formData.reason
      }, {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
        withCredentials: true
      });

      setFormData({ date: null, minutes: '', reason: '', notes: '' });
      setShowAddForm(false);
      fetchLatenessRecords();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to add lateness record:', err);
      alert('Failed to add lateness record: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this lateness record?')) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(buildApiUrl(`/lateness/${recordId}`), {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
        withCredentials: true
      });
      fetchLatenessRecords();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to delete lateness record:', err);
      alert('Failed to delete record');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-yellow-600 to-yellow-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Lateness Records</h2>
            <p className="text-yellow-100 text-sm mt-1">{employee.name || `${employee.firstName} ${employee.lastName}`}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition-colors text-gray-600 hover:text-yellow-600"
            >
              <PlusIcon className="h-5 w-5" />
              Add Lateness Record
            </button>
          )}

          {/* Add Form */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">New Lateness Record</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <DatePicker
                  label="Date"
                  value={formData.date}
                  onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minutes Late</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, minutes: e.target.value }))}
                    placeholder="e.g., 15"
                    className="w-full border border-gray-300 rounded-lg p-2"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g., Traffic, Public transport delay"
                  className="w-full border border-gray-300 rounded-lg p-2"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional details..."
                  className="w-full border border-gray-300 rounded-lg p-2"
                  rows="2"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:bg-gray-300"
                >
                  {loading ? 'Adding...' : 'Add Record'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ date: null, minutes: '', reason: '', notes: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Records List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              All Records ({latenessRecords.length})
            </h3>
            {latenessRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No lateness records found</p>
              </div>
            ) : (
              latenessRecords.map((record) => {
                return (
                  <div key={record._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-yellow-600 font-semibold">{record.reason || 'Late'}</span>
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                            {record.minutesLate} min
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            record.excused ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {record.excused ? 'Excused' : 'Unexcused'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {dayjs(record.date).format('MMM D, YYYY')} - {dayjs(record.scheduledStart).format('HH:mm')} → {dayjs(record.actualStart).format('HH:mm')}
                        </p>
                        {record.reason && (
                          <p className="text-sm text-gray-500 mt-2 italic">"{record.reason}"</p>
                        )}
                        {record.excused && record.excuseReason && (
                          <p className="text-sm text-green-600 mt-1">Excuse: {record.excuseReason}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(record._id)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Carryover Modal
export const CarryoverModal = ({ employee, onClose, onSuccess }) => {
  const [carryoverDays, setCarryoverDays] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(null);

  React.useEffect(() => {
    fetchCurrentBalance();
  }, []);

  const fetchCurrentBalance = async () => {
    try {
      const response = await axios.get(buildApiUrl(`/leave/balances/current/${employee._id}`));
      if (response.data.success && response.data.data) {
        setCurrentBalance(response.data.data);
        setCarryoverDays(response.data.data.carryOverDays || 0);
      } else {
        console.warn('No balance found for employee:', employee._id);
        setCurrentBalance(null);
      }
    } catch (err) {
      console.error('Failed to fetch leave balance:', err);
      setCurrentBalance(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentBalance || !currentBalance._id) {
      alert('No leave balance found for this employee. Please ensure leave balances are initialized.');
      return;
    }
    
    setLoading(true);
    
    try {
      await axios.put(buildApiUrl(`/leave/balances/${currentBalance._id}`), {
        carryOverDays: parseInt(carryoverDays) || 0,
        notes: notes
      });

      alert('Carryover updated successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to update carryover:', err);
      alert('Failed to update carryover: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-600 to-green-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Update Carryover</h2>
            <p className="text-green-100 text-sm mt-1">{employee.name || `${employee.firstName} ${employee.lastName}`}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {!currentBalance && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                No leave balance record found for this employee. Please ensure leave balances are initialized before updating carryover.
              </p>
            </div>
          )}
          
          {currentBalance && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Leave Balance</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Entitlement</p>
                  <p className="font-semibold text-gray-900">{currentBalance.entitlementDays} days</p>
                </div>
                <div>
                  <p className="text-gray-600">Used</p>
                  <p className="font-semibold text-gray-900">{currentBalance.usedDays || 0} days</p>
                </div>
                <div>
                  <p className="text-gray-600">Current Carryover</p>
                  <p className="font-semibold text-gray-900">{currentBalance.carryOverDays || 0} days</p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Carryover Days <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={carryoverDays}
              onChange={(e) => setCarryoverDays(e.target.value)}
              placeholder="e.g., 5"
              className="w-full border border-gray-300 rounded-lg p-2"
              disabled={!currentBalance}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Number of unused days to carry forward to next year (max 10)</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for carryover adjustment..."
              className="w-full border border-gray-300 rounded-lg p-2"
              rows="3"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !currentBalance}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300"
            >
              {loading ? 'Updating...' : 'Update Carryover'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
