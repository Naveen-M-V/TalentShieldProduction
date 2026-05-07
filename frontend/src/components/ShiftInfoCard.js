import React from 'react';

/**
 * Shift Info Card Component
 * Displays shift information with attendance status
 */
const ShiftInfoCard = ({ shift, attendanceStatus, validation }) => {
  if (!shift) {
    return (
      <div style={{
        background: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#92400e' }}>
            No Scheduled Shift
          </span>
        </div>
        <p style={{ fontSize: '13px', color: '#78350f', margin: 0 }}>
          You don't have a scheduled shift today. This will be recorded as an unscheduled entry.
        </p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'On Time': return { bg: '#d1fae5', border: '#10b981', text: '#065f46' };
      case 'Late': return { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' };
      case 'Early': return { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' };
      case 'Unscheduled': return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' };
      default: return { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' };
    }
  };

  const statusColors = getStatusColor(attendanceStatus);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'On Time': return '✅';
      case 'Late': return '⚠️';
      case 'Early': return '⏰';
      case 'Unscheduled': return '❓';
      default: return '📋';
    }
  };

  return (
    <div style={{
      background: statusColors.bg,
      border: `2px solid ${statusColors.border}`,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      {/* Status Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px' }}>{getStatusIcon(attendanceStatus)}</span>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: statusColors.text }}>
            {attendanceStatus}
          </div>
          {validation && (
            <div style={{ fontSize: '13px', color: statusColors.text, marginTop: '4px' }}>
              {validation.message}
            </div>
          )}
        </div>
      </div>

      {/* Shift Details */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.7)',
        borderRadius: '8px',
        padding: '16px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Scheduled Time
          </div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
            {shift.startTime} - {shift.endTime}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Location
          </div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
            {shift.location}
          </div>
        </div>
        {shift.workType && (
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Work Type
            </div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
              {shift.workType}
            </div>
          </div>
        )}
        {validation && validation.minutesLate > 0 && (
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              {attendanceStatus === 'Late' ? 'Late By' : 'Early By'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: statusColors.text }}>
              {Math.round(validation.minutesLate)} minutes
            </div>
          </div>
        )}
      </div>

      {/* Warning for late arrival */}
      {validation && validation.requiresApproval && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: '#fef2f2',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#991b1b'
        }}>
          ⚠️ <strong>Late Arrival:</strong> Your manager has been notified. Please provide a reason if requested.
        </div>
      )}
    </div>
  );
};

export default ShiftInfoCard;
