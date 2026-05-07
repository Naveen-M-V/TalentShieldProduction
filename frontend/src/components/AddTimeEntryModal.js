import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { addTimeEntry } from '../utils/clockApi';
import { DatePicker } from './ui/date-picker';
import MUITimePicker from './MUITimePicker';
import dayjs from 'dayjs';

/**
 * Add Time Entry Modal
 * Modal for manually adding time entries with breaks
 */

const AddTimeEntryModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    employee: '',
    location: '',
    workType: '',
    clockIn: {
      date: new Date().toISOString().split('T')[0],
      time: '09:00'
    },
    clockOut: {
      date: new Date().toISOString().split('T')[0],
      time: '17:00'
    },
    breaks: []
  });
  const [loading, setLoading] = useState(false);

  // Sample data for dropdowns
  const employees = [
    { id: '1', name: 'John Smith' },
    { id: '2', name: 'David Levito' },
    { id: '3', name: 'Khan Saleem' },
    { id: '4', name: 'Arthur Williams' }
  ];

  const locations = [
    'Office - Main',
    'Office - Branch',
    'Remote',
    'Client Site'
  ];

  const workTypes = [
    'Regular Shift',
    'Overtime',
    'Night Shift',
    'Weekend'
  ];

  const breakDurations = [
    '0hrs 12mins',
    '0hrs 31mins',
    '1hrs 02mins',
    '0hrs 47mins'
  ];

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const addBreakToEntry = () => {
    const newBreak = {
      id: Date.now(),
      duration: '0hrs 12mins',
      startTime: '12:00',
      endTime: '12:12'
    };
    setFormData(prev => ({
      ...prev,
      breaks: [...prev.breaks, newBreak]
    }));
  };

  const removeBreak = (breakId) => {
    setFormData(prev => ({
      ...prev,
      breaks: prev.breaks.filter(b => b.id !== breakId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.employee || !formData.location || !formData.workType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const entryData = {
        employeeId: formData.employee,
        location: formData.location,
        workType: formData.workType,
        clockIn: `${formData.clockIn.date}T${formData.clockIn.time}`,
        clockOut: `${formData.clockOut.date}T${formData.clockOut.time}`,
        breaks: formData.breaks
      };

      const response = await addTimeEntry(entryData);
      if (response.success) {
        toast.success('Time entry added successfully');
        onSuccess();
      } else {
        toast.error(response.message || 'Failed to add time entry');
      }
    } catch (error) {
      console.error('Add time entry error:', error);
      toast.error(error.message || 'Failed to add time entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            Add Time Entry
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '24px'
          }}>
            {/* Left Column */}
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Select Employee
                </label>
                <select
                  value={formData.employee}
                  onChange={(e) => handleInputChange('employee', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Select Location
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  required
                >
                  <option value="">Select Location</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Select Work Type
                </label>
                <select
                  value={formData.workType}
                  onChange={(e) => handleInputChange('workType', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  required
                >
                  <option value="">Select Work Type</option>
                  {workTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Clock In */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Clock In
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <DatePicker
                      value={formData.clockIn.date || null}
                      onChange={(date) => handleInputChange('clockIn.date', date ? date.format('YYYY-MM-DD') : '')}
                    />
                  </div>
                  <div style={{ width: '140px' }}>
                    <MUITimePicker
                      value={formData.clockIn.time}
                      onChange={(time) => handleInputChange('clockIn.time', time ? time.format('HH:mm') : '')}
                    />
                  </div>
                </div>
              </div>

              {/* Clock Out */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Clock Out
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <DatePicker
                      value={formData.clockOut.date || null}
                      onChange={(date) => handleInputChange('clockOut.date', date ? date.format('YYYY-MM-DD') : '')}
                    />
                  </div>
                  <div style={{ width: '140px' }}>
                    <MUITimePicker
                      value={formData.clockOut.time}
                      onChange={(time) => handleInputChange('clockOut.time', time ? time.format('HH:mm') : '')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Date Range Display */}
            <div style={{
              background: '#f9fafb',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Date Range
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827'
              }}>
                {formData.clockIn.date} to {formData.clockOut.date}
              </div>
            </div>
          </div>

          {/* Breaks Section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Breaks
              </h3>
              <button
                type="button"
                onClick={addBreakToEntry}
                style={{
                  padding: '8px 16px',
                  background: '#06b6d4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Add a break
              </button>
            </div>

            {/* Breaks List */}
            <div style={{
              background: '#f9fafb',
              borderRadius: '8px',
              padding: '16px',
              minHeight: '120px'
            }}>
              {formData.breaks.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '14px',
                  padding: '20px'
                }}>
                  No breaks added
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {formData.breaks.map((breakItem) => (
                    <div key={breakItem.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <span style={{ fontSize: '14px', color: '#111827' }}>
                        {breakItem.duration}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBreak(breakItem.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sample break durations */}
              <div style={{
                marginTop: '16px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                {breakDurations.map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() => addBreakToEntry()}
                    style={{
                      padding: '4px 8px',
                      background: '#e5e7eb',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: '#374151'
                    }}
                  >
                    {duration}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            paddingTop: '20px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#374151'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                background: loading ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Adding...' : 'Add entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTimeEntryModal;
