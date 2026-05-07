import React, { useState, useEffect } from 'react';
import { userClockOut, getUserClockStatus } from '../utils/clockApi';
import { toast } from 'react-toastify';
import { useClockStatus } from '../context/ClockStatusContext';

/**
 * Admin Clock-Out Modal
 * Shows when admin clicks clock-out button
 */

const AdminClockOutModal = ({ user, onClose, onClockOut }) => {
  const { triggerClockRefresh } = useClockStatus();
  const [loading, setLoading] = useState(true);
  const [notClockedIn, setNotClockedIn] = useState(false);
  const [clockStatus, setClockStatus] = useState(null);

  useEffect(() => {
    checkClockStatus();
  }, []);

  const checkClockStatus = async () => {
    try {
      const response = await getUserClockStatus();
      console.log('Clock status response:', response);
      if (response.success && response.data) {
        const status = response.data.status;
        console.log('Current clock status:', status);
        console.log('Clock status data:', response.data);
        console.log('clockIn field:', response.data.clockIn);
        setClockStatus(response.data);
        
        // Check if not clocked in or already clocked out
        if (status === 'clocked-out' || status === 'not-clocked-in') {
          setNotClockedIn(true);
        }
      } else {
        setNotClockedIn(true);
      }
    } catch (error) {
      console.error('Error checking clock status:', error);
      setNotClockedIn(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      const response = await userClockOut();
      
      if (response.success) {
        toast.success('You have successfully clocked out!');
        
        // Trigger clock status refresh across all tabs
        triggerClockRefresh({
          action: 'admin_clock_out',
          userId: user?.id || user?._id,
          timestamp: Date.now()
        });
        
        if (onClockOut) onClockOut(response.data);
        setTimeout(() => onClose(), 1500);
      } else {
        toast.error(response.message || 'Failed to clock out');
      }
    } catch (error) {
      console.error('Admin clock out error:', error);
      const errorMessage = error.message || error.response?.data?.message || 'Failed to clock out';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
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
      zIndex: 10000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '560px',
        width: '90%',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.3)',
        animation: 'slideDown 0.3s ease-out',
        position: 'relative'
      }}>
        {/* Info Icon & Close Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(239, 68, 68, 0.3)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <button
            onClick={handleCancel}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#9CA3AF',
              padding: '4px',
              lineHeight: 1,
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.color = '#374151'}
            onMouseLeave={(e) => e.target.style.color = '#9CA3AF'}
          >
            ×
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #F3F4F6',
              borderTop: '4px solid #EF4444',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
            <p style={{ marginTop: '16px', color: '#6B7280' }}>Checking status...</p>
          </div>
        ) : notClockedIn ? (
          <>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '12px',
              lineHeight: 1.3
            }}>
              Not Clocked In
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#6B7280',
              marginBottom: '32px',
              lineHeight: 1.6
            }}>
              You are not currently clocked in. Please clock in first before attempting to clock out.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '12px 28px',
                  background: '#6366F1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#5558E3'}
                onMouseLeave={(e) => e.target.style.background = '#6366F1'}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '12px',
              lineHeight: 1.3
            }}>
              Clock Out
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#6B7280',
              marginBottom: '24px',
              lineHeight: 1.6
            }}>
              Are you ready to clock out? This will end your current work session.
            </p>

            {/* Current Status Info */}
            {clockStatus && (
              <div style={{
                background: '#FEF3C7',
                border: '1px solid #FCD34D',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span style={{ fontWeight: '600', color: '#92400E' }}>Current Session</span>
                </div>
                <div style={{ fontSize: '14px', color: '#78350F', lineHeight: 1.6 }}>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Clocked in at:</strong> {(() => {
                      const clockInTime = clockStatus.clockIn || clockStatus.clockInTime || clockStatus.clock_in;
                      if (!clockInTime) return 'N/A';
                      
                      // If it's already in HH:mm format, return as is
                      if (typeof clockInTime === 'string' && /^\d{2}:\d{2}$/.test(clockInTime)) {
                        return clockInTime;
                      }
                      
                      // Otherwise try to parse as date
                      try {
                        const date = new Date(clockInTime);
                        if (isNaN(date.getTime())) {
                          return clockInTime; // Return original if invalid date
                        }
                        return date.toLocaleTimeString('en-GB', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false,
                          timeZone: 'Europe/London'
                        });
                      } catch (e) {
                        console.error('Error formatting clock in time:', e);
                        return clockInTime;
                      }
                    })()}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Location:</strong> {clockStatus.location || 'N/A'}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Work Type:</strong> {clockStatus.workType || 'N/A'}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancel}
                disabled={loading}
                style={{
                  padding: '12px 28px',
                  background: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.target.style.background = '#E5E7EB';
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.target.style.background = '#F3F4F6';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClockOut}
                disabled={loading}
                style={{
                  padding: '12px 28px',
                  background: loading ? '#9ca3af' : '#EF4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 12px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.target.style.background = '#DC2626';
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.target.style.background = '#EF4444';
                }}
              >
                {loading ? 'Processing...' : 'Clock-out'}
              </button>
            </div>
          </>
        )}

        <style>{`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default AdminClockOutModal;
