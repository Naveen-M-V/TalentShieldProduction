import React, { useState, useEffect } from 'react';
import { userClockIn, getUserClockStatus, getClockInLeaveBlockMessage } from '../utils/clockApi';
import { toast } from 'react-toastify';
import MUITimePicker from './MUITimePicker';
import { useClockStatus } from '../context/ClockStatusContext';

/**
 * Admin Clock-In Floating Modal
 * Shows on login, prompts admin to clock in
 */

const AdminClockInModal = ({ user, onClose, onClockIn }) => {
  const { triggerClockRefresh } = useClockStatus();
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('Work From Office');
  const [workType, setWorkType] = useState('Regular');
  const [clockInTime, setClockInTime] = useState(new Date());
  const [alreadyClockedIn, setAlreadyClockedIn] = useState(false);
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
        // Check if already clocked in or on break
        if (status === 'clocked-in' || status === 'on-break') {
          setAlreadyClockedIn(true);
          setClockStatus(response.data);
        }
        // If clocked out or not clocked in, user can clock in (don't set alreadyClockedIn)
        // This allows multiple clock-ins per day for split shifts
      }
    } catch (error) {
      console.error('Error checking clock status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    setLoading(true);
    try {
      // ========== GPS LOCATION CAPTURE ==========
      let gpsData = {};
      
      if (navigator.geolocation) {
        try {
          console.log('📍 Capturing GPS location for admin clock-in...');
          const locationToast = toast.info('Capturing location...', { autoClose: false });
          
          // Get accurate position with high accuracy enabled
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
              }
            );
          });
          
          gpsData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          
          toast.dismiss(locationToast);
          console.log('✅ GPS captured for admin clock-in:', gpsData);
          toast.success(`Location captured (±${Math.round(position.coords.accuracy)}m)`, { autoClose: 2000 });
        } catch (gpsError) {
          console.warn('⚠️ GPS capture failed for admin clock-in:', gpsError);
          toast.warning('Location unavailable, continuing without GPS', { autoClose: 3000 });
          // Continue without GPS - don't block clock-in
        }
      }
      // ==========================================
      
      const response = await userClockIn({ 
        location, 
        workType,
        ...gpsData // Include GPS coordinates
      });
      
      if (response.success) {
        toast.success('You have successfully clocked in!');

        await checkClockStatus();
        
        // Trigger global clock refresh to update all components
        triggerClockRefresh({ 
          action: 'admin_clock_in', 
          userId: user?.id || user?._id,
          timestamp: Date.now()
        });
        
        // Call onClockIn callback to update parent component
        if (onClockIn) {
          await onClockIn(response.data);
        }
        // Close modal after a short delay to show success message
        setTimeout(() => onClose(), 1500);
      } else {
        toast.error(response.message || 'Failed to clock in');
      }
    } catch (error) {
      console.error('Admin clock in error:', error);
      if (error.status === 403 || error.response?.status === 403) {
        const leaveMessage = getClockInLeaveBlockMessage(error);
        toast.error(leaveMessage || error.message || 'Clock-in blocked');
        return;
      }

      const errorMessage = error.message || error.response?.data?.message || 'Failed to clock in';
      toast.error(errorMessage);
      
      // If already clocked in, update state and notify parent
      if (errorMessage.includes('already clocked in')) {
        setAlreadyClockedIn(true);
        await checkClockStatus();
        
        // Notify parent component to refresh UI
        if (onClockIn && error.currentStatus) {
          await onClockIn(error.currentStatus);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    toast.info('You can clock in later from the Clock-ins page');
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
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4"></path>
              <path d="M12 8h.01"></path>
            </svg>
          </div>
          <button onClick={onClose} style={{
            width: '32px',
            height: '32px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
            borderRadius: '8px'
          }}
          onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{
            fontSize: '26px',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '12px'
          }}>
            Welcome Back, {user?.firstName || 'Admin'}!
          </h2>
          <p style={{
            fontSize: '15px',
            color: '#6b7280',
            lineHeight: '1.6'
          }}>
            {new Date().toLocaleString('en-GB', {
              timeZone: 'Europe/London',
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })} (UK Time)
          </p>
        </div>

        {/* Clock In Form */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #6366F1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              <p style={{ color: '#6b7280' }}>Checking clock status...</p>
            </div>
          ) : alreadyClockedIn ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <span style={{ fontSize: '32px' }}>✓</span>
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '12px'
              }}>
                You're Already Clocked In!
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '20px'
              }}>
                Clocked in at: {clockStatus?.clockIn || 'N/A'}<br />
                Status: {clockStatus?.status === 'on-break' ? 'On Break' : 'Working'}
              </p>
              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  background: '#6366F1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#5558E3'}
                onMouseLeave={(e) => e.target.style.background = '#6366F1'}
              >
                Continue to Dashboard
              </button>
            </div>
          ) : (
            <>
              {/* Work Location Field */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Location
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '400',
                      background: '#ffffff',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                      appearance: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366F1'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option value="Work From Office">Work From Office</option>
                    <option value="Work From Home">Work From Home</option>
                    <option value="Field">Field</option>
                    <option value="Client Side">Client Side</option>
                  </select>
                </div>
              </div>

              {/* Work Type Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Shift
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: '2px solid #6366F1',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '400',
                      background: '#ffffff',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                      appearance: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366F1'}
                    onBlur={(e) => e.target.style.borderColor = '#6366F1'}
                  >
                    <option value="Regular">Regular</option>
                    <option value="Overtime">Overtime</option>
                    <option value="Weekend Overtime">Weekend Overtime</option>
                    <option value="Client-side Overtime">Client-side Overtime</option>
                  </select>
                </div>
              </div>

              {/* Clock-In Time Display (Read-only) */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Clock-In Time
                </label>
                <div style={{
                  padding: '14px 16px',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#111827',
                  textAlign: 'center'
                }}>
                  {clockInTime.toLocaleTimeString('en-GB', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false,
                    timeZone: 'Europe/London'
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSkip}
                  disabled={loading}
                  style={{
                    padding: '12px 28px',
                    background: '#ffffff',
                    color: '#6b7280',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.color = '#374151';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.color = '#6b7280';
                    }
                  }}
                >
                  Not now
                </button>

                <button
                  onClick={handleClockIn}
                  disabled={loading}
                  style={{
                    padding: '12px 28px',
                    background: loading ? '#9ca3af' : '#6366F1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.target.style.background = '#5558E3';
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.target.style.background = '#6366F1';
                  }}
                >
                  {loading ? 'Processing...' : 'Clock-in'}
                </button>
              </div>
            </>
          )}
        </div>

      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminClockInModal;