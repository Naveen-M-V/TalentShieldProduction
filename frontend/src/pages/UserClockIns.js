import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../context/AuthContext';
import { useClockStatus } from '../context/ClockStatusContext';
import { formatDateDDMMYY, getDayName } from '../utils/dateFormatter';
import { 
  getUserClockStatus, 
  userClockIn, 
  userClockOut, 
  userStartBreak,
  userResumeWork,
  getUserTimeEntries 
} from '../utils/clockApi';
import { getClockInLeaveBlockMessage } from '../utils/clockApi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import moment from 'moment-timezone';

/**
 * User Clock-ins Page
 * Employee view for clocking in/out with work type and location selection
 */

const UserClockIns = ({ userProfile }) => {
  const { user } = useAuth();
  const { triggerClockRefresh } = useClockStatus();
  const [currentStatus, setCurrentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingin] = useState(false);
  const [timeEntries, setTimeEntries] = useState([]);
  const [selectedWorkType, setSelectedWorkType] = useState('Regular');
  const [selectedLocation, setSelectedLocation] = useState('Work From Office');

  // Work types matching the image
  const workTypes = [
    'Regular',
    'Overtime', 
    'Weekend Overtime',
    'Client-side Overtime'
  ];

  // Location types matching the image
  const locationTypes = [
    'Work From Office',
    'Work From Home',
    'Field',
    'Client Side'
  ];

  useEffect(() => {
    fetchUserStatus();
    fetchUserEntries();
    
    // Poll for updates every 30 seconds for cross-device sync
    // Cross-tab updates are handled by ClockStatusContext (instant)
    const interval = setInterval(() => {
      fetchUserStatus();
      fetchUserEntries();
    }, 30000); // Reduced from 10s to 30s since we have instant cross-tab updates
    
    return () => clearInterval(interval);
  }, []);

  const fetchUserStatus = async () => {
    try {
      const response = await getUserClockStatus();
      if (response.success) {
        setCurrentStatus(response.data);
      }
    } catch (error) {
      console.error('Fetch status error:', error);
      toast.error('Failed to load clock status');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserEntries = async () => {
    try {
      const response = await getUserTimeEntries();
      if (response.success) {
        setTimeEntries(response.data);
      }
    } catch (error) {
      console.error('Fetch entries error:', error);
    }
  };

  const handleClockIn = async () => {
    setClockingin(true);
    try {
      const response = await userClockIn({
        workType: selectedWorkType,
        location: selectedLocation
      });
      
      if (response.success) {
        toast.success('Clocked in successfully!');
        // Immediately fetch updated status and entries
        await fetchUserStatus();
        await fetchUserEntries();
        // Trigger refresh across all tabs
        triggerClockRefresh({
          action: 'CLOCK_IN',
          userId: user?.id || user?.email,
          userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          location: selectedLocation,
          workType: selectedWorkType,
          timestamp: Date.now()
        });
      } else {
        toast.error(response.message || 'Failed to clock in');
      }
    } catch (error) {
      console.error('Clock in error:', error);
      if (error.status === 403 || error.response?.status === 403) {
        const leaveMessage = getClockInLeaveBlockMessage(error);
        toast.error(leaveMessage || error.message || 'Clock-in blocked');
        return;
      }

      toast.error(error.message || 'Failed to clock in');
    } finally {
      setClockingin(false);
    }
  };

  const handleClockOut = async () => {
    setClockingin(true);
    try {
      const response = await userClockOut();
      
      if (response.success) {
        toast.success('Clocked out successfully!');
        // Immediately fetch updated status and entries
        await fetchUserStatus();
        await fetchUserEntries();
        // Trigger refresh across all tabs
        triggerClockRefresh({
          action: 'CLOCK_OUT',
          userId: user?.id || user?.email,
          userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          timestamp: Date.now()
        });
      } else {
        toast.error(response.message || 'Failed to clock out');
      }
    } catch (error) {
      console.error('Clock out error:', error);
      toast.error(error.message || 'Failed to clock out');
    } finally {
      setClockingin(false);
    }
  };

  const handleStartBreak = async () => {
    try {
      const response = await userStartBreak();
      
      if (response.success) {
        toast.success('Break started successfully!');
        // Immediately fetch updated status and entries
        await fetchUserStatus();
        await fetchUserEntries();
      } else {
        toast.error(response.message || 'Failed to start break');
      }
    } catch (error) {
      console.error('Start break error:', error);
      toast.error(error.message || 'Failed to start break');
    }
  };

  const handleResumeWork = async () => {
    try {
      const response = await userResumeWork();
      
      if (response.success) {
        toast.success('Work resumed successfully!');
        // Immediately fetch updated status and entries
        await fetchUserStatus();
        await fetchUserEntries();
      } else {
        toast.error(response.message || 'Failed to resume work');
      }
    } catch (error) {
      console.error('Resume work error:', error);
      toast.error(error.message || 'Failed to resume work');
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    
    // If it's already in HH:mm format, return as is
    if (typeof timeString === 'string' && /^\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // If it's an ISO date string, convert to UK time
    try {
      // Convert UTC timestamp to UK timezone using moment-timezone
      const m = moment(timeString).tz('Europe/London');
      if (!m.isValid()) {
        return timeString; // Return original if invalid
      }
      return m.format('HH:mm');
    } catch (e) {
      console.error('Error formatting time:', e);
      return timeString;
    }
  };

  const formatDate = (dateString) => {
    return formatDateDDMMYY(dateString);
  };

  const calculateOvertime = (entry) => {
    // If no clock out, no overtime yet
    if (!entry.clockIn || !entry.clockOut) return '—';
    
    // Get shift hours - only calculate overtime if shift is assigned
    let shiftHours = 0;
    let hasShift = false;
    
    if (entry.shiftHours) {
      shiftHours = parseFloat(entry.shiftHours);
      hasShift = shiftHours > 0;
    } else if (entry.shiftId && entry.shiftId.startTime && entry.shiftId.endTime) {
      const shiftStart = new Date(`2000-01-01T${entry.shiftId.startTime}`);
      const shiftEnd = new Date(`2000-01-01T${entry.shiftId.endTime}`);
      shiftHours = (shiftEnd - shiftStart) / (1000 * 60 * 60);
      hasShift = shiftHours > 0;
    }
    
    // If no shift assigned, don't calculate overtime
    if (!hasShift) {
      return '—';
    }
    
    // Calculate total hours worked
    const start = new Date(`2000-01-01T${entry.clockIn}`);
    const end = new Date(`2000-01-01T${entry.clockOut}`);
    let totalMinutes = (end - start) / (1000 * 60);
    
    // Subtract breaks
    if (entry.breaks && entry.breaks.length > 0) {
      entry.breaks.forEach(b => { if (b.duration) totalMinutes -= b.duration; });
    }
    
    const hoursWorked = totalMinutes / 60;
    
    // Calculate overtime (hours worked beyond shift hours)
    const overtime = hoursWorked - shiftHours;
    
    if (overtime > 0) {
      return <span style={{ color: '#f97316', fontWeight: '600' }}>{overtime.toFixed(2)} hrs</span>;
    }
    
    return '—';
  };

  const getCurrentDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}\n${getDayName(today)}`;
  };

  const isCurrentlyClockedIn = currentStatus?.status === 'clocked-in' || currentStatus?.status === 'on-break';

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px'
      }}>
        <div style={{
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #10b981',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            Clock-ins
          </h1>
        </div>

        <>
            {/* Main Clock In/Out Panel */}
            <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 items-start">
            {/* Date Section */}
            <div className="text-center p-3 sm:p-4">
              <div className="text-base sm:text-lg font-semibold text-gray-900 mb-1 whitespace-pre-line">
                {getCurrentDate()}
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 mt-3 sm:mt-4">
                {!isCurrentlyClockedIn ? (
                  <button
                    onClick={handleClockIn}
                    disabled={clockingIn}
                    className={`px-4 sm:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-lg text-sm sm:text-base font-semibold min-w-[120px] transition-colors ${
                      clockingIn
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 cursor-pointer'
                    } text-white`}
                  >
                    {clockingIn ? 'Clocking In...' : 'Clock In'}
                  </button>
                ) : (
                  <button
                    onClick={handleClockOut}
                    disabled={clockingIn}
                    className={`px-4 sm:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-lg text-sm sm:text-base font-semibold min-w-[120px] transition-colors ${
                      clockingIn
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 cursor-pointer'
                    } text-white`}
                  >
                    {clockingIn ? 'Clocking Out...' : 'Clock Out'}
                  </button>
                )}
                
                {isCurrentlyClockedIn && (
                  currentStatus?.status === 'on-break' ? (
                    <button
                      onClick={handleResumeWork}
                      disabled={clockingIn}
                      className={`px-4 sm:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-lg text-sm sm:text-base font-semibold transition-colors ${
                        clockingIn
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 cursor-pointer'
                      } text-white`}
                    >
                      {clockingIn ? 'Resuming...' : 'Resume Work'}
                    </button>
                  ) : (
                    <button
                      onClick={handleStartBreak}
                      disabled={clockingIn}
                      className={`px-4 sm:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-lg text-sm sm:text-base font-semibold transition-colors ${
                        clockingIn
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-cyan-600 hover:bg-cyan-700 cursor-pointer'
                      } text-white`}
                    >
                      {clockingIn ? 'Starting Break...' : 'Start Break'}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Work Type Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Work Type
              </label>
              <Select
                value={selectedWorkType}
                onValueChange={setSelectedWorkType}
                disabled={isCurrentlyClockedIn}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select work type" />
                </SelectTrigger>
                <SelectContent>
                  {workTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Location
              </label>
              <Select
                value={selectedLocation}
                onValueChange={setSelectedLocation}
                disabled={isCurrentlyClockedIn}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locationTypes.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Current Status Display */}
          {currentStatus && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Current Status: 
                  </span>
                  <span style={{
                    marginLeft: '8px',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: currentStatus.status === 'clocked-in' ? '#10b981' : 
                               currentStatus.status === 'on-break' ? '#f59e0b' : '#3b82f6',
                    color: '#fff',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {currentStatus.status === 'clocked-in' ? 'Clocked In' :
                     currentStatus.status === 'on-break' ? 'On Break' :
                     currentStatus.status === 'clocked-out' ? 'Clocked Out' : 'Not Clocked In'}
                  </span>
                </div>
                {currentStatus.clockIn && (
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    Clocked in at: {formatTime(currentStatus.clockIn)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Time Entries Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            background: '#f9fafb'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Recent Time Entries
            </h3>
          </div>
          
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead style={{
              background: '#f3f4f6'
            }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>VTID</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Clock In</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Clock Out</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Shift Hours</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Breaks</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Overtime</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Work Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Location</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.length > 0 ? timeEntries.slice(0, 10).map((entry, index) => (
                <tr key={entry._id || index} style={{
                  borderBottom: '1px solid #f3f4f6'
                }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>
                    {userProfile?.vtid || user?.vtid || entry.employee?.vtid || userProfile?.employeeId || entry.employee?.employeeId || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>
                    {formatDate(entry.date)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>
                    <div>{formatTime(entry.clockIn)}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {formatDate(entry.date)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>
                    <div>{formatTime(entry.clockOut)}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {entry.clockOut ? formatDate(entry.date) : '-'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                    {entry.shiftHours ? `${entry.shiftHours} hrs` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>
                    {entry.breaks?.length > 0 ? 
                      `${Math.floor(entry.breaks.reduce((total, b) => total + (b.duration || 0), 0) / 60)}hrs ${entry.breaks.reduce((total, b) => total + (b.duration || 0), 0) % 60}mins` : 
                      '0hrs 0mins'
                    }
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>
                    {calculateOvertime(entry)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>
                    {entry.workType || 'Regular'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>
                    {entry.location || 'Work From Office'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="9" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    No time entries found. Clock in to start tracking your time.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          </>
      </div>
    </>
  );
};

export default UserClockIns;
