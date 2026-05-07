import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const UpcomingLeavesCard = () => {
  const [upcomingLeaves, setUpcomingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingLeaves();
  }, []);

  const fetchUpcomingLeaves = async () => {
    try {
      const response = await axios.get('/api/leave/my-requests?status=Approved');
      if (response.data.success) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = response.data.data.filter(leave => new Date(leave.startDate) >= today);
        setUpcomingLeaves(upcoming.slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching upcoming leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getLeaveColor = (leaveType) => {
    const colors = {
      'Annual Leave': '#10b981',
      'Bank Holiday': '#0ea5e9',
      'Maternity Leave': '#ec4899',
      'Paternity Leave': '#8b5cf6',
      'Adoption Leave': '#d946ef',
      'Shared Parental Leave': '#a855f7',
      'Parental Leave': '#06b6d4',
      'Carer\'s Leave': '#f97316',
      'Parental Bereavement Leave': '#6b7280',
      'Neonatal Care Leave': '#f43f5e',
      'Time Off for Dependants': '#eab308',
      'Sick Leave': '#ef4444',
      'Jury Service': '#14b8a6',
      'Trade Union Duties': '#8b5cf6',
      'Public Duty Leave': '#06b6d4',
      'Study / Training Leave': '#3b82f6',
      'Medical / Dental Appointment': '#ec4899'
    };
    return colors[leaveType] || '#6b7280';
  };

  if (loading) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        marginBottom: '32px',
        animation: 'pulse 2s infinite'
      }} />
    );
  }

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      marginBottom: '32px'
    }}>
      <h2 style={{
        fontSize: '18px',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <CalendarIcon style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
        Upcoming Leaves
      </h2>

      {upcomingLeaves.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '32px 16px',
          color: '#6b7280'
        }}>
          <CheckCircleIcon style={{
            width: '48px',
            height: '48px',
            color: '#10b981',
            margin: '0 auto 12px',
            opacity: 0.5
          }} />
          <p style={{ fontSize: '14px', margin: 0 }}>No upcoming approved leaves</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {upcomingLeaves.map((leave) => (
            <div
              key={leave._id}
              style={{
                background: '#f9fafb',
                borderRadius: '12px',
                padding: '16px',
                border: `2px solid ${getLeaveColor(leave.leaveType)}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f9fafb'}
            >
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    background: getLeaveColor(leave.leaveType),
                    color: '#ffffff',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {leave.leaveType}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    fontWeight: '500'
                  }}>
                    {leave.numberOfDays} day(s)
                  </span>
                </div>
                <p style={{
                  fontSize: '13px',
                  color: '#374151',
                  margin: 0,
                  fontWeight: '500'
                }}>
                  {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                </p>
              </div>
              <CheckCircleIcon style={{
                width: '20px',
                height: '20px',
                color: '#10b981',
                marginLeft: '12px'
              }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingLeavesCard;
