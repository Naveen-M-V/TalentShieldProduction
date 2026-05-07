import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { buildApiUrl, buildDirectUrl } from '../utils/apiConfig';
import { DatePicker } from './ui/date-picker';
import MUITimePicker from './MUITimePicker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import dayjs from 'dayjs';
import moment from 'moment-timezone';
import { updateTimeEntry, deleteTimeEntry, addTimeEntry, getClockInLeaveBlockMessage } from '../utils/clockApi';
import { toast } from 'react-toastify';
import { useClockStatus } from '../context/ClockStatusContext';
import { EmployeeTimeTable } from './EmployeeTimeTable';
import { formatDateDDMMYY, getShortDayName, getDayName } from '../utils/dateFormatter';

const EmployeeTimesheetModal = ({ employee, onClose }) => {
  const { triggerClockRefresh } = useClockStatus(); // For global refresh
  const [activeEmployee, setActiveEmployee] = useState(employee || null);
  const [employeeList, setEmployeeList] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekData, setWeekData] = useState([]);
  const [statistics, setStatistics] = useState({
    hoursWorked: 0,
    overtime: 0,
    negativeHours: 0
  });
  const [loading, setLoading] = useState(false);
  const [weeklyTotalHours, setWeeklyTotalHours] = useState(0);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    date: null,
    clockIn: null,
    clockOut: null,
    location: 'Work From Office',
    workType: 'Regular',
    breaks: [],
    sessionIndex: 0,
    entryId: null
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [currentEmployeeIndex, setCurrentEmployeeIndex] = useState(1);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [timelineRefresh, setTimelineRefresh] = useState(0);
  const [currentClockStatus, setCurrentClockStatus] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All Status');

  const getEmployeeKey = (emp) => {
    if (!emp) return null;
    return emp._id || emp.id || emp.profileId || emp.email || null;
  };

  const getEmployeeDisplayName = (emp) => {
    if (!emp) return '';
    const first = emp.firstName || '';
    const last = emp.lastName || '';
    return `${first} ${last}`.trim();
  };

  const getEmployeeIndexInList = (emp, list) => {
    const key = getEmployeeKey(emp);
    if (!key) return -1;
    return (list || []).findIndex(e => getEmployeeKey(e) === key);
  };

  const fetchEmployeesForNavigation = async () => {
    try {
      let response;
      try {
        response = await axios.get(
          buildApiUrl('/employees'),
          {
            withCredentials: true,
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          }
        );
      } catch (primaryError) {
        response = await axios.get(
          buildDirectUrl('/employees'),
          {
            withCredentials: true,
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          }
        );
      }

      const raw = response.data;
      const list = Array.isArray(raw)
        ? raw
        : (raw?.data || raw?.employees || []);

      const normalized = Array.isArray(list) ? [...list] : [];

      // Ensure the currently active employee is included even if the endpoint response differs.
      if (activeEmployee) {
        const existingIdx = getEmployeeIndexInList(activeEmployee, normalized);
        if (existingIdx === -1) {
          normalized.unshift(activeEmployee);
        }
      }

      normalized.sort((a, b) => {
        const aName = getEmployeeDisplayName(a).toLowerCase();
        const bName = getEmployeeDisplayName(b).toLowerCase();
        return aName.localeCompare(bName);
      });

      setEmployeeList(normalized);
      setTotalEmployees(normalized.length);

      if (activeEmployee) {
        const idx = getEmployeeIndexInList(activeEmployee, normalized);
        if (idx >= 0) setCurrentEmployeeIndex(idx + 1);
      }
    } catch (error) {
      console.error('❌ Error fetching employees for navigation:', error);
      setEmployeeList([]);
    }
  };

  const navigateEmployee = (direction) => {
    if (!employeeList || employeeList.length === 0) return;
    const currentIdx = getEmployeeIndexInList(activeEmployee, employeeList);
    if (currentIdx === -1) return;
    const nextIdx = currentIdx + direction;
    if (nextIdx < 0 || nextIdx >= employeeList.length) return;

    const nextEmployee = employeeList[nextIdx];
    setActiveEmployee(nextEmployee);
    setCurrentEmployeeIndex(nextIdx + 1);
    setSelectedEntries(new Set());
    setSelectAll(false);
    setOpenMenuIndex(null);
    setEditingEntry(null);
    setShowEditModal(false);
    setEmployeeProfile(null);
  };

  const canNavigatePrev = employeeList.length > 0 && getEmployeeIndexInList(activeEmployee, employeeList) > 0;
  const canNavigateNext = employeeList.length > 0 && getEmployeeIndexInList(activeEmployee, employeeList) >= 0 && getEmployeeIndexInList(activeEmployee, employeeList) < employeeList.length - 1;

  useEffect(() => {
    if (employee) {
      setActiveEmployee(employee);
    }
  }, [employee]);

  useEffect(() => {
    if (activeEmployee) {
      console.log('Employee data in modal:', activeEmployee);
      fetchEmployeeProfile();
      fetchWeeklyTimesheet();
      fetchCurrentClockStatus();
      fetchEmployeesForNavigation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEmployee, currentDate]);

  // Update timeline every minute for progressive animation
  useEffect(() => {
    const interval = setInterval(() => {
      setTimelineRefresh(prev => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Auto-refresh clock status every 10 seconds for real-time updates
  useEffect(() => {
    const statusInterval = setInterval(() => {
      if (activeEmployee) {
        fetchCurrentClockStatus();
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(statusInterval);
  }, [activeEmployee]);

  // Fetch employee profile data (includes mobile number)
  const fetchEmployeeProfile = async () => {
    try {
      // Use profileId if available, otherwise fall back to _id or id
      const profileId = activeEmployee?.profileId || activeEmployee?._id || activeEmployee?.id;
      console.log('📱 Fetching profile for profile ID:', profileId);
      
      const response = await axios.get(
        buildApiUrl(`/profiles/${profileId}`),
        { 
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      
      if (response.data) {
        console.log('✅ Employee profile fetched:', response.data);
        setEmployeeProfile(response.data);
      }
    } catch (error) {
      console.error('❌ Error fetching employee profile:', error);
      // Don't show error toast, just log it - profile is optional
    }
  };

  // Fetch total employee count
  const fetchTotalEmployees = async () => {
    try {
      const response = await axios.get(
        buildApiUrl('/clock/employees/count'),
        { 
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      if (response.data.success) {
        setTotalEmployees(response.data.total || 0);
        console.log('✅ Total employees fetched:', response.data.total);
      }
    } catch (error) {
      console.error('❌ Error fetching employee count:', error);
      setTotalEmployees(0);
    }
  };

  // Fetch current clock status
  const fetchCurrentClockStatus = async () => {
    try {
      const employeeId = activeEmployee?._id || activeEmployee?.id;
      const { getClockStatus } = await import('../utils/clockApi');
      const response = await getClockStatus({ includeAdmins: true });
      
      if (response.success && response.data) {
        const empStatus = response.data.find(e => (e.id || e._id) === employeeId);
        setCurrentClockStatus(empStatus || null);
        console.log('✅ Current clock status:', empStatus);
      }
    } catch (error) {
      console.error('❌ Error fetching clock status:', error);
    }
  };

  // Clock In handler
  const handleClockIn = async () => {
    try {
      const employeeId = activeEmployee?._id || activeEmployee?.id;
      console.log('🔵 Clock In initiated for employee:', employeeId);
      
      let gpsData = {};
      
      // Capture GPS location
      if (navigator.geolocation) {
        try {
          console.log('📍 Capturing GPS location...');
          const locationToast = toast.info('Capturing location...', { autoClose: false });
          
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
          console.log('✅ GPS captured:', gpsData);
        } catch (gpsError) {
          console.warn('⚠️ GPS capture failed:', gpsError);
          // Continue without GPS - don't block clock-in
        }
      }
      
      const { clockIn } = await import('../utils/clockApi');
      const response = await clockIn({ employeeId, ...gpsData });
      
      if (response.success) {
        toast.success('Clocked in successfully');
        await fetchCurrentClockStatus();
        await fetchWeeklyTimesheet();
        // Trigger global refresh for all pages
        triggerClockRefresh({ action: 'clock_in', employeeId });
      } else {
        toast.error(response.message || 'Failed to clock in');
      }
    } catch (error) {
      console.error('❌ Clock in error:', error);
      if (error.status === 403 || error.response?.status === 403) {
        const leaveMessage = getClockInLeaveBlockMessage(error);
        toast.error(leaveMessage || error.response?.data?.message || error.message || 'Clock-in blocked');
        return;
      }

      toast.error(error.response?.data?.message || error.message || 'Failed to clock in');
    }
  };

  // Clock Out handler
  const handleClockOut = async () => {
    try {
      const employeeId = activeEmployee?._id || activeEmployee?.id;
      console.log('🔴 Clock Out initiated for employee:', employeeId);
      
      const { clockOut } = await import('../utils/clockApi');
      const response = await clockOut({ employeeId });
      
      if (response.success) {
        toast.success('Clocked out successfully');
        await fetchCurrentClockStatus();
        await fetchWeeklyTimesheet();
        // Trigger global refresh for all pages
        triggerClockRefresh({ action: 'clock_out', employeeId });
      } else {
        toast.error(response.message || 'Failed to clock out');
      }
    } catch (error) {
      console.error('❌ Clock out error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to clock out');
    }
  };

  // Start Break handler
  const handleStartBreak = async () => {
    try {
      const employeeId = activeEmployee?._id || activeEmployee?.id;
      console.log('🟡 Start Break initiated for employee:', employeeId);
      
      const { setOnBreak } = await import('../utils/clockApi');
      const response = await setOnBreak(employeeId);
      
      if (response.success) {
        toast.success('Break started');
        await fetchCurrentClockStatus();
        await fetchWeeklyTimesheet();
        // Trigger global refresh for all pages
        triggerClockRefresh({ action: 'start_break', employeeId });
      } else {
        toast.error(response.message || 'Failed to start break');
      }
    } catch (error) {
      console.error('❌ Start break error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to start break');
    }
  };

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuIndex !== null) {
        setOpenMenuIndex(null);
      }
    };
    
    if (openMenuIndex !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuIndex]);

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const fetchWeeklyTimesheet = async () => {
    setLoading(true);
    try {
      const monday = getMonday(currentDate);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const employeeId = activeEmployee?._id || activeEmployee?.id;
      console.log('📋 Fetching timesheet for employee:', {
        employeeId,
        firstName: activeEmployee?.firstName,
        lastName: activeEmployee?.lastName,
        email: activeEmployee?.email,
        role: activeEmployee?.role,
        fullEmployee: activeEmployee
      });

      const response = await axios.get(
        buildApiUrl(`/clock/timesheet/${employeeId}?startDate=${monday.toISOString().split('T')[0]}&endDate=${sunday.toISOString().split('T')[0]}`),
        { 
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );

      console.log('📥 Timesheet API response:', response.data);
      console.log('📥 Response entries count:', response.data?.entries?.length || 0);
      console.log('📥 Response entries:', response.data?.entries);

      if (response.data && response.data.success) {
        console.log('✅ Timesheet data received:', response.data);
        if (response.data.entries && response.data.entries.length > 0) {
          console.log('✅ Processing', response.data.entries.length, 'time entries');
          processTimesheetData(response.data);
        } else {
          console.warn('⚠️ No time entries in response, generating empty week');
          generateEmptyWeek();
        }
      } else {
        console.warn('⚠️ No timesheet data or unsuccessful response, generating empty week');
        console.warn('Response success:', response.data?.success);
        console.warn('Response message:', response.data?.message);
        generateEmptyWeek();
      }
    } catch (error) {
      console.error('❌ Error fetching timesheet:', error);
      console.error('Error response:', error.response?.data);
      if (error.response?.status === 401) {
        console.error('Unauthorized - user may need to log in again');
      } else if (error.response?.status === 404) {
        console.error('Timesheet endpoint not found or employee not found');
      }
      generateEmptyWeek();
    } finally {
      setLoading(false);
    }
  };

  const generateEmptyWeek = () => {
    const monday = getMonday(currentDate);
    const emptyWeek = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      emptyWeek.push({
        date: date,
        dayName: getShortDayName(date),
        dayNumber: date.getDate().toString().padStart(2, '0'),
        clockedHours: null,
        location: '--',
        overtime: '--',
        totalHours: '00:00',
        isWeekend: isWeekend
      });
    }
    setWeekData(emptyWeek);
    setStatistics({ hoursWorked: 0, overtime: 0, negativeHours: 0 });
    setWeeklyTotalHours(0);
  };

  const parseHHMM = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return { h, m };
  };

  const minutesToHHMM = (mins) => {
    if (mins == null || Number.isNaN(mins)) return '--';
    const safe = Math.max(0, Math.round(mins));
    const h = Math.floor(safe / 60);
    const m = safe % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const getUKMomentFromTimeValue = (dayMoment, timeValue) => {
    if (!timeValue) return null;
    if (typeof timeValue === 'string' && /^\d{1,2}:\d{2}$/.test(timeValue)) {
      const hm = parseHHMM(timeValue);
      if (!hm) return null;
      return dayMoment.clone().hour(hm.h).minute(hm.m).second(0).millisecond(0);
    }

    const m = moment(timeValue);
    if (!m.isValid()) return null;
    return m.tz('Europe/London');
  };

  const calculateWorkedMinutesForDayEntries = (dayEntries, dayDateStr) => {
    const baseDay = moment.tz(dayDateStr, 'YYYY-MM-DD', 'Europe/London').startOf('day');
    let totalMinutes = 0;

    for (const entry of (dayEntries || [])) {
      const inMoment = getUKMomentFromTimeValue(baseDay, entry?.clockIn);
      if (!inMoment) continue;

      // No clock-out: show "--" for worked hours
      if (!entry?.clockOut) {
        return null;
      }

      const outMomentRaw = getUKMomentFromTimeValue(baseDay, entry?.clockOut);
      if (!outMomentRaw) {
        return null;
      }

      const outMoment = outMomentRaw.clone();
      if (outMoment.isBefore(inMoment)) {
        // Overnight shift (e.g., 22:00 -> 06:00)
        outMoment.add(1, 'day');
      }

      let sessionMinutes = outMoment.diff(inMoment, 'minutes');

      // Breaks (missing breaks => 0)
      let breakMinutes = 0;
      const breaks = entry?.breaks || [];
      for (const b of breaks) {
        if (typeof b?.duration === 'number' && !Number.isNaN(b.duration)) {
          breakMinutes += b.duration;
          continue;
        }

        const bStart = getUKMomentFromTimeValue(baseDay, b?.startTime ?? b?.breakStart ?? b?.start ?? b?.breakIn ?? null);
        const bEndRaw = getUKMomentFromTimeValue(baseDay, b?.endTime ?? b?.breakEnd ?? b?.end ?? b?.breakOut ?? b?.resume ?? null);
        if (!bStart || !bEndRaw) continue;

        const bEnd = bEndRaw.clone();
        if (bEnd.isBefore(bStart)) bEnd.add(1, 'day');

        const diff = bEnd.diff(bStart, 'minutes');
        if (diff > 0) breakMinutes += diff;
      }

      sessionMinutes = sessionMinutes - breakMinutes;
      if (sessionMinutes < 0) sessionMinutes = 0;
      totalMinutes += sessionMinutes;
    }

    return totalMinutes;
  };

  const processTimesheetData = (data) => {
    const monday = getMonday(currentDate);
    const weekEntries = [];
    let weeklyTotalHoursSum = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Check if this is today
      const dayDate = new Date(date);
      dayDate.setHours(0, 0, 0, 0);
      const isToday = dayDate.getTime() === today.getTime();
      const isFuture = dayDate > today;
      
      // Find ALL entries for this day (support multiple clock-ins)
      const dayEntries = data.entries?.filter(e => {
        const entryDate = moment.utc(e.date).tz('Europe/London').format('YYYY-MM-DD');
        return entryDate === dateStr;
      }) || [];
      
      // Use the first entry as the primary entry for display
      const dayEntry = dayEntries[0];

      if (dayEntry && dayEntry.clockIn) {
        const clockIn = dayEntry.clockIn;
        const clockOut = dayEntry.clockOut;

        // Calculate worked time from clock-in/out and breaks (shift-agnostic, supports overnight)
        const workedMinutes = calculateWorkedMinutesForDayEntries(dayEntries, dateStr);
        const hasClockOutForAll = workedMinutes != null;
        const workedHoursDecimal = hasClockOutForAll ? (workedMinutes / 60) : null;

        // Preserve existing overtime aggregation if backend provides it, but keep it safe
        let overtime = 0;
        dayEntries.forEach(entry => {
          const n = typeof entry?.overtime === 'number' ? entry.overtime : parseFloat(entry?.overtime);
          overtime += Number.isFinite(n) ? n : 0;
        });

        // Add to weekly total only when we have full clock-out data
        if (workedHoursDecimal != null) {
          weeklyTotalHoursSum += workedHoursDecimal;
        }

        // Format clock in/out times - handle both HH:mm string and ISO date formats
        // ALWAYS convert UTC timestamps to UK timezone for display
        const formatTime = (timeValue) => {
          if (!timeValue) return 'N/A';
          
          // If it's already in HH:mm format, return as is
          if (typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue)) {
            return timeValue;
          }
          
          // Convert UTC timestamp to UK timezone using moment-timezone
          try {
            const m = moment(timeValue).tz('Europe/London');
            if (!m.isValid()) {
              return timeValue; // Return original if invalid
            }
            return m.format('HH:mm');
          } catch (e) {
            console.error('Error formatting time:', e);
            return timeValue;
          }
        };

        const clockInTime = formatTime(clockIn);
        const clockOutTime = clockOut ? formatTime(clockOut) : 'Present';

        const normalizeBreak = (breakItem) => {
          if (!breakItem) return breakItem;
          const startRaw = breakItem.startTime ?? breakItem.breakStart ?? breakItem.start ?? breakItem.breakIn ?? null;
          const endRaw = breakItem.endTime ?? breakItem.breakEnd ?? breakItem.end ?? breakItem.breakOut ?? breakItem.resume ?? null;
          return {
            ...breakItem,
            startTime: breakItem.startTime || formatTime(startRaw),
            endTime: breakItem.endTime || formatTime(endRaw)
          };
        };

        // Calculate break time display
        let breakInfo = '';
        const normalizedPrimaryBreaks = (dayEntry.breaks || []).map(normalizeBreak);
        if (normalizedPrimaryBreaks.length > 0) {
          const totalBreakMinutes = normalizedPrimaryBreaks.reduce((sum, b) => sum + (b.duration || 0), 0);
          if (totalBreakMinutes > 0) {
            const breakHours = Math.floor(totalBreakMinutes / 60);
            const breakMins = totalBreakMinutes % 60;
            breakInfo = ` (Break: ${breakHours}h ${breakMins}m)`;
          }
        }

        // Create sessions array from all entries for this day
        const sessions = dayEntries.map(entry => ({
          entryId: entry._id || entry.id, // Add the MongoDB _id for each session
          clockInTime: formatTime(entry.clockIn),
          clockOutTime: entry.clockOut ? formatTime(entry.clockOut) : 'Present',
          breaks: (entry.breaks || []).map(normalizeBreak),
          location: entry.location || 'Work From Office',
          workType: entry.workType || 'Regular'
        }));

        // Log multiple sessions for debugging
        if (sessions.length > 1) {
          console.log(`📅 Multiple sessions found for ${dateStr}:`, sessions);
        }

        // Format clockedHours to show all sessions
        let clockedHoursDisplay;
        if (sessions.length > 1) {
          clockedHoursDisplay = sessions.map((s, idx) => 
            `${idx + 1}. ${s.clockInTime} - ${s.clockOutTime}`
          ).join(' | ');
        } else {
          clockedHoursDisplay = `${clockInTime} - ${clockOutTime}${breakInfo}`;
        }

        const shiftObj = dayEntry.shift || dayEntry.shiftId || dayEntry.assignedShift || null;
        const shiftStartTime = dayEntry.shiftStartTime || shiftObj?.startTime || shiftObj?.shiftStartTime || null;
        const shiftEndTime = dayEntry.shiftEndTime || shiftObj?.endTime || shiftObj?.shiftEndTime || null;
        const shiftBreakDuration =
          dayEntry.breakDuration ??
          shiftObj?.breakDuration ??
          shiftObj?.break ??
          null;

        weekEntries.push({
          entryId: dayEntry._id || dayEntry.id,
          date: date,
          dayName: getShortDayName(date),
          dayNumber: date.getDate().toString().padStart(2, '0'),
          clockedHours: clockedHoursDisplay,
          clockIn: clockIn,
          clockInTime: clockInTime,
          clockOut: clockOut,
          clockOutTime: clockOutTime,
          breaks: normalizedPrimaryBreaks, // Add breaks data for timeline visualization
          location: dayEntry.location || 'N/A',
          overtime: overtime > 0 ? formatHours(overtime) : '--',
          totalHours: workedHoursDecimal == null ? '--' : minutesToHHMM(workedMinutes),
          hoursDecimal: workedHoursDecimal == null ? 0 : workedHoursDecimal,
          workType: dayEntry.workType || 'Regular',
          isWeekend: isWeekend,
          isToday: isToday,
          isFuture: isFuture,
          // GPS location data for admin view - prioritize clock-in location, fallback to clock-out
          gpsLocation: dayEntry.gpsLocationIn || dayEntry.gpsLocationOut || null,
          // Shift data for timeline coloring
          shift: shiftObj,
          shiftStartTime: shiftStartTime,
          shiftEndTime: shiftEndTime,
          shiftBreakDuration: shiftBreakDuration,
          attendanceStatus: dayEntry.attendanceStatus || null,
          // Multiple sessions support
          sessions: sessions.length > 1 ? sessions : null // Only add if multiple sessions exist
        });
      } else {
        weekEntries.push({
          entryId: `absent-${dateStr}`, // Unique ID for absent days
          date: date,
          dayName: getShortDayName(date),
          dayNumber: date.getDate().toString().padStart(2, '0'),
          clockedHours: null,
          location: '--',
          overtime: '--',
          totalHours: '00:00',
          hoursDecimal: 0,
          workType: null,
          isWeekend: isWeekend,
          isToday: isToday,
          isFuture: isFuture,
          isAbsent: true // Flag to identify absent entries
        });
      }
    }

    // Filter out future dates and sort: Today first, then past days in descending order
    const filteredAndSorted = weekEntries
      .filter(entry => !entry.isFuture) // Remove future dates
      .sort((a, b) => {
        if (a.isToday) return -1; // Today always first
        if (b.isToday) return 1;
        return b.date - a.date; // Past days in descending order
      });

    setWeekData(filteredAndSorted);
    setWeeklyTotalHours(weeklyTotalHoursSum);
    
    // Use statistics from backend if available
    if (data.statistics) {
      setStatistics({
        hoursWorked: parseFloat(data.statistics.totalHoursWorked || 0).toFixed(2),
        overtime: parseFloat(data.statistics.totalOvertime || 0).toFixed(2),
        negativeHours: parseFloat(data.statistics.totalNegativeHours || 0).toFixed(2)
      });
    } else {
      setStatistics({
        hoursWorked: weeklyTotalHoursSum.toFixed(2),
        overtime: 0,
        negativeHours: 0
      });
    }
  };

  const formatHours = (hours) => {
    if (hours == null || Number.isNaN(hours) || !Number.isFinite(hours)) return '--';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || timeStr === 'Present' || timeStr === 'N/A' || timeStr === '--') return null;
    if (typeof timeStr !== 'string') return null;
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const formatMinutesAsHHMM = (mins) => {
    if (mins == null || Number.isNaN(mins) || mins <= 0) return '--';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const formatMinutesAsHuman = (mins) => {
    if (mins == null || Number.isNaN(mins) || mins <= 0) return '--';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  };

  const getNowUKMinutes = () => {
    const now = moment.tz('Europe/London');
    return now.hours() * 60 + now.minutes();
  };

  const getAllSessions = (day) => {
    if (day.sessions && Array.isArray(day.sessions) && day.sessions.length > 0) return day.sessions;
    if (day.clockInTime) {
      return [{
        clockInTime: day.clockInTime,
        clockOutTime: day.clockOutTime,
        breaks: day.breaks || []
      }];
    }
    return [];
  };

  const getAllBreaks = (day) => {
    const sessions = getAllSessions(day);
    const breaks = [];
    sessions.forEach((s) => {
      if (s.breaks && Array.isArray(s.breaks)) {
        s.breaks.forEach((b) => breaks.push(b));
      }
    });
    if (breaks.length > 0) return breaks;
    return day.breaks || [];
  };

  const calculateBreakMinutes = (day) => {
    const breaks = getAllBreaks(day);
    if (!breaks || breaks.length === 0) return 0;
    return breaks.reduce((sum, b) => {
      const duration = typeof b?.duration === 'number' ? b.duration : null;
      if (duration != null && !Number.isNaN(duration)) return sum + duration;
      const start = parseTimeToMinutes(b?.startTime);
      const end = parseTimeToMinutes(b?.endTime);
      if (start == null || end == null) return sum;
      const diff = end - start;
      return diff > 0 ? sum + diff : sum;
    }, 0);
  };

  const calculateLateMinutes = (day) => {
    const shiftStart = parseTimeToMinutes(day.shiftStartTime);
    if (shiftStart == null) return null;
    const sessions = getAllSessions(day);
    const firstClockInMins = sessions
      .map(s => parseTimeToMinutes(s.clockInTime))
      .filter(v => v != null)
      .sort((a, b) => a - b)[0];
    if (firstClockInMins == null) return null;
    const late = firstClockInMins - shiftStart;
    return late > 0 ? late : 0;
  };

  const calculateOvertimeMinutes = (day) => {
    const shiftEnd = parseTimeToMinutes(day.shiftEndTime);
    if (shiftEnd == null) return null;
    const sessions = getAllSessions(day);
    const lastClockOutMins = sessions
      .map(s => {
        if (!s.clockOutTime || s.clockOutTime === 'Present') return getNowUKMinutes();
        return parseTimeToMinutes(s.clockOutTime);
      })
      .filter(v => v != null)
      .sort((a, b) => b - a)[0];
    if (lastClockOutMins == null) return null;
    const ot = lastClockOutMins - shiftEnd;
    return ot > 0 ? ot : 0;
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const formatDateRange = () => {
    const monday = getMonday(currentDate);
    return `${getDayName(monday)}, ${formatDateDDMMYY(monday)}`;
  };

  // Timeline helper function to calculate position and width percentages
  // Blue = Working hours, Red = Late arrival, Orange = Overtime
  const calculateTimelineSegments = (day) => {
    if (!day.clockIn) return null;

    const workDayStart = 5 * 60; // 05:00 in minutes (5 AM)
    const workDayEnd = 23 * 60; // 23:00 in minutes (11 PM)
    const totalMinutes = workDayEnd - workDayStart; // 18 hours

    const parseTime = (timeStr) => {
      if (!timeStr || timeStr === 'Present' || timeStr === 'N/A') return null;
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const segments = [];
    
    // Get shift times if available
    const shiftStartMinutes = day.shiftStartTime ? parseTime(day.shiftStartTime) : null;
    const shiftEndMinutes = day.shiftEndTime ? parseTime(day.shiftEndTime) : null;

    // Debug logging
    if (day.sessions) {
      console.log('🎯 Timeline calculation for day:', day.dayName, 'Sessions:', day.sessions);
    }

    // Check if there are multiple sessions (multiple clock-in/out pairs)
    if (day.sessions && Array.isArray(day.sessions) && day.sessions.length > 0) {
      console.log('✅ Processing multiple sessions:', day.sessions.length);
      // Handle multiple sessions
      day.sessions.forEach((session, sessionIndex) => {
        const sessionClockInMinutes = parseTime(session.clockInTime);
        const sessionClockOutMinutes = session.clockOutTime && session.clockOutTime !== 'Present' ? parseTime(session.clockOutTime) : null;

        if (!sessionClockInMinutes) return;

        // For first session, check for late arrival
        if (sessionIndex === 0 && shiftStartMinutes && sessionClockInMinutes > shiftStartMinutes) {
          const lateStartPos = ((shiftStartMinutes - workDayStart) / totalMinutes) * 100;
          const lateEndPos = ((sessionClockInMinutes - workDayStart) / totalMinutes) * 100;
          segments.push({
            type: 'late',
            left: Math.max(0, lateStartPos),
            width: Math.max(0, lateEndPos - lateStartPos),
            color: '#ff6b35', // Orange-red for late arrival
            label: 'Late'
          });
        }

        let currentTime = sessionClockInMinutes;

        // Process breaks for this session
        if (session.breaks && session.breaks.length > 0) {
          const sortedBreaks = [...session.breaks].sort((a, b) => {
            const aStart = parseTime(a.startTime);
            const bStart = parseTime(b.startTime);
            return aStart - bStart;
          });

          sortedBreaks.forEach((breakItem) => {
            const breakStart = parseTime(breakItem.startTime);
            const breakEnd = parseTime(breakItem.endTime);

            if (breakStart && breakEnd) {
              // Working time before break
              if (currentTime < breakStart) {
                const workStart = ((currentTime - workDayStart) / totalMinutes) * 100;
                const workEnd = ((breakStart - workDayStart) / totalMinutes) * 100;
                segments.push({
                  type: 'working',
                  left: Math.max(0, workStart),
                  width: Math.max(0, workEnd - workStart),
                  color: '#007bff', // Blue
                  label: 'Working time'
                });
              }

              // Break time
              const breakStartPos = ((breakStart - workDayStart) / totalMinutes) * 100;
              const breakEndPos = ((breakEnd - workDayStart) / totalMinutes) * 100;
              segments.push({
                type: 'break',
                left: Math.max(0, breakStartPos),
                width: Math.max(0, breakEndPos - breakStartPos),
                color: '#4ade80', // Green for breaks
                label: 'Break'
              });

              currentTime = breakEnd;
            }
          });
        }

        // Final working time for this session
        const sessionEndTime = sessionClockOutMinutes || (sessionIndex === day.sessions.length - 1 ? (new Date().getHours() * 60 + new Date().getMinutes()) : sessionClockOutMinutes);
        
        if (sessionEndTime && currentTime < sessionEndTime) {
          // For last session, check for overtime
          const isLastSession = sessionIndex === day.sessions.length - 1;
          const hasOvertime = isLastSession && shiftEndMinutes && sessionEndTime > shiftEndMinutes;
          
          if (hasOvertime) {
            // Regular working time (up to shift end)
            if (currentTime < shiftEndMinutes) {
              const workStart = ((currentTime - workDayStart) / totalMinutes) * 100;
              const workEnd = ((shiftEndMinutes - workDayStart) / totalMinutes) * 100;
              segments.push({
                type: 'working',
                left: Math.max(0, workStart),
                width: Math.max(0, workEnd - workStart),
                color: '#007bff', // Blue for regular working hours
                label: 'Working time'
              });
            }
            
            // Overtime segment (after shift end)
            const overtimeStart = ((shiftEndMinutes - workDayStart) / totalMinutes) * 100;
            const overtimeEnd = ((sessionEndTime - workDayStart) / totalMinutes) * 100;
            segments.push({
              type: 'overtime',
              left: Math.max(0, overtimeStart),
              width: Math.max(0, Math.min(100, overtimeEnd) - overtimeStart),
              color: '#f97316', // Orange for overtime
              label: 'Overtime'
            });
          } else {
            // No overtime, just regular working time
            const workStart = ((currentTime - workDayStart) / totalMinutes) * 100;
            const workEnd = ((sessionEndTime - workDayStart) / totalMinutes) * 100;
            segments.push({
              type: 'working',
              left: Math.max(0, workStart),
              width: Math.max(0, Math.min(100, workEnd) - workStart),
              color: '#007bff', // Blue
              label: 'Working time'
            });
          }
        }
      });
    } else {
      // Handle single session with late arrival and overtime detection
      const clockInMinutes = parseTime(day.clockInTime);
      const clockOutMinutes = day.clockOutTime && day.clockOutTime !== 'Present' ? parseTime(day.clockOutTime) : null;

      if (!clockInMinutes) return null;

      let currentTime = clockInMinutes;
      
      // Check for late arrival (if shift start time is available and clock-in is after it)
      const isLate = shiftStartMinutes && clockInMinutes > shiftStartMinutes;
      
      // Add red segment for late arrival
      if (isLate) {
        const lateStartPos = ((shiftStartMinutes - workDayStart) / totalMinutes) * 100;
        const lateEndPos = ((clockInMinutes - workDayStart) / totalMinutes) * 100;
        segments.push({
          type: 'late',
          left: Math.max(0, lateStartPos),
          width: Math.max(0, lateEndPos - lateStartPos),
          color: '#ff6b35', // Orange-red for late arrival
          label: 'Late'
        });
      }

      // Process breaks and working time
      if (day.breaks && day.breaks.length > 0) {
      const sortedBreaks = [...day.breaks].sort((a, b) => {
        const aStart = parseTime(a.startTime);
        const bStart = parseTime(b.startTime);
        return aStart - bStart;
      });

        sortedBreaks.forEach((breakItem) => {
          const breakStart = parseTime(breakItem.startTime);
          const breakEnd = parseTime(breakItem.endTime);

          if (breakStart && breakEnd) {
            // Working time before break
            if (currentTime < breakStart) {
              const workStart = ((currentTime - workDayStart) / totalMinutes) * 100;
              const workEnd = ((breakStart - workDayStart) / totalMinutes) * 100;
              segments.push({
                type: 'working',
                left: Math.max(0, workStart),
                width: Math.max(0, workEnd - workStart),
                color: '#007bff', // Blue
                label: 'Working time'
              });
            }

            // Break time
            const breakStartPos = ((breakStart - workDayStart) / totalMinutes) * 100;
            const breakEndPos = ((breakEnd - workDayStart) / totalMinutes) * 100;
            segments.push({
              type: 'break',
              left: Math.max(0, breakStartPos),
              width: Math.max(0, breakEndPos - breakStartPos),
              color: '#4ade80', // Green for breaks
              label: 'Break'
            });

            currentTime = breakEnd;
          }
        });
      }

      // Final working time segment - split into regular and overtime
      const endTime = clockOutMinutes || (new Date().getHours() * 60 + new Date().getMinutes());
      
      if (currentTime < endTime) {
        // Check if there's overtime (clock-out after shift end)
        const hasOvertime = shiftEndMinutes && endTime > shiftEndMinutes;
        
        if (hasOvertime) {
          // Regular working time (up to shift end)
          if (currentTime < shiftEndMinutes) {
            const workStart = ((currentTime - workDayStart) / totalMinutes) * 100;
            const workEnd = ((shiftEndMinutes - workDayStart) / totalMinutes) * 100;
            segments.push({
              type: 'working',
              left: Math.max(0, workStart),
              width: Math.max(0, workEnd - workStart),
              color: '#007bff', // Blue for regular working hours
              label: 'Working time'
            });
          }
          
          // Overtime segment (after shift end)
          const overtimeStart = ((shiftEndMinutes - workDayStart) / totalMinutes) * 100;
          const overtimeEnd = ((endTime - workDayStart) / totalMinutes) * 100;
          segments.push({
            type: 'overtime',
            left: Math.max(0, overtimeStart),
            width: Math.max(0, Math.min(100, overtimeEnd) - overtimeStart),
            color: '#f97316', // Orange for overtime
            label: 'Overtime'
          });
        } else {
          // No overtime, just regular working time
          const workStart = ((currentTime - workDayStart) / totalMinutes) * 100;
          const workEnd = ((endTime - workDayStart) / totalMinutes) * 100;
          segments.push({
            type: 'working',
            left: Math.max(0, workStart),
            width: Math.max(0, Math.min(100, workEnd) - workStart),
            color: '#007bff', // Blue for working hours
            label: 'Working time'
          });
        }
      }
    }

    return segments;
  };

  // Convert old segment format to new TimelineBar format
  const convertToTimelineBarSegments = (oldSegments, isToday, clockOutTime) => {
    if (!oldSegments || oldSegments.length === 0) return [];
    
    const workDayStart = 5 * 60; // 05:00 in minutes
    const totalMinutes = 18 * 60; // 18 hours
    
    return oldSegments.map((segment, index) => {
      // Calculate start and end times from left and width percentages
      const startMinutes = workDayStart + (segment.left / 100) * totalMinutes;
      const endMinutes = startMinutes + (segment.width / 100) * totalMinutes;
      
      // Convert minutes to HH:MM format
      const formatTime = (mins) => {
        const hours = Math.floor(mins / 60);
        const minutes = Math.floor(mins % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      };
      
      // Check if this is an ongoing segment (last segment, today, no clock out)
      const isLastSegment = index === oldSegments.length - 1;
      const isOngoing = isToday && isLastSegment && (!clockOutTime || clockOutTime === 'Present');
      
      return {
        type: segment.type,
        startTime: formatTime(startMinutes),
        endTime: isOngoing ? 'Present' : formatTime(endMinutes),
        label: segment.label
      };
    });
  };

  const navigateDay = (direction) => {
    const newIndex = currentDayIndex + direction;
    if (newIndex >= 0 && newIndex < weekData.length) {
      setCurrentDayIndex(newIndex);
    }
  };

  const getTotalEmployees = () => {
    if (employeeList && employeeList.length > 0) return employeeList.length;
    if (activeEmployee) return 1; // Avoid showing "out of 0" while list is loading
    return 0;
  };

  const getCurrentEmployeeIndex = () => {
    if (employeeList && employeeList.length > 0) {
      const idx = getEmployeeIndexInList(activeEmployee, employeeList);
      if (idx >= 0) return idx + 1;
    }
    if (activeEmployee) return currentEmployeeIndex || 1;
    return 0;
  };

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allEntryIds = weekData
        .filter(day => day.entryId)
        .map(day => day.entryId);
      setSelectedEntries(new Set(allEntryIds));
    } else {
      setSelectedEntries(new Set());
    }
  };

  const handleSelectEntry = (entryId) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  // Edit handler
  const handleEditEntry = (day) => {
    // Allow editing even for absent entries (to create new time entries)
    setEditingEntry(day);
    setEditForm({
      date: dayjs(day.date),
      clockIn: day.clockIn ? dayjs(day.clockIn, 'HH:mm') : dayjs().hour(9).minute(0),
      clockOut: day.clockOut ? dayjs(day.clockOut, 'HH:mm') : dayjs().hour(17).minute(0),
      location: day.location || 'Work From Office',
      workType: day.workType || 'Regular',
      breaks: day.breaks || []
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry || !editForm.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!editForm.clockIn) {
      toast.error('Clock in time is required');
      return;
    }

    try {
      const timeData = {
        date: editForm.date.format('YYYY-MM-DD'),
        clockIn: editForm.clockIn.format('HH:mm'),
        clockOut: editForm.clockOut ? editForm.clockOut.format('HH:mm') : null,
        location: editForm.location,
        workType: editForm.workType,
        breaks: editForm.breaks
      };

      let response;
      const entryIdToUpdate = editForm.entryId || editingEntry.entryId;
      
      // Check if this is an absent entry (no existing time entry)
      if (editingEntry.isAbsent || !entryIdToUpdate || entryIdToUpdate.startsWith('absent-')) {
        // Create new time entry
        const newEntryData = {
          ...timeData,
          employeeId: activeEmployee?._id || activeEmployee?.id
        };
        console.log('Creating new time entry:', newEntryData);
        response = await addTimeEntry(newEntryData);
        
        if (response.success) {
          toast.success('Time entry created successfully');
        }
      } else {
        // Update existing time entry - use the specific session's entryId
        console.log('Updating time entry:', entryIdToUpdate, timeData);
        response = await updateTimeEntry(entryIdToUpdate, timeData);
        
        if (response.success) {
          toast.success(`Session ${editForm.sessionIndex + 1} updated successfully`);
        }
      }
      
      if (response.success) {
        setShowEditModal(false);
        setEditingEntry(null);
        fetchWeeklyTimesheet(); // Refresh data
        // Trigger global refresh for all pages
        triggerClockRefresh({ action: 'edit_entry', employeeId: activeEmployee?._id || activeEmployee?.id });
      } else {
        toast.error(response.message || 'Failed to save entry');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to save entry');
    }
  };

  // Delete handlers
  const handleDeleteEntry = async (entryId) => {
    // Don't delete absent entries
    if (entryId.startsWith('absent-')) {
      toast.warning('Cannot delete absent entries');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this time entry?')) {
      return;
    }

    try {
      const response = await deleteTimeEntry(entryId);
      
      if (response.success) {
        toast.success('Time entry deleted successfully');
        fetchWeeklyTimesheet(); // Refresh data
        setSelectedEntries(new Set()); // Clear selection
      } else {
        toast.error(response.message || 'Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error(error.message || 'Failed to delete entry');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEntries.size === 0) {
      toast.warning('Please select entries to delete');
      return;
    }

    // Filter out absent entries (those starting with 'absent-')
    const validEntries = Array.from(selectedEntries).filter(id => !id.startsWith('absent-'));
    
    if (validEntries.length === 0) {
      toast.warning('Cannot delete absent entries. Please select actual time entries.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${validEntries.length} selected entries?`)) {
      return;
    }

    try {
      const deletePromises = validEntries.map(entryId => 
        deleteTimeEntry(entryId)
      );
      
      await Promise.all(deletePromises);
      
      toast.success(`${validEntries.length} entries deleted successfully`);
      fetchWeeklyTimesheet(); // Refresh data
      setSelectedEntries(new Set()); // Clear selection
    } catch (error) {
      console.error('Error deleting entries:', error);
      toast.error('Failed to delete some entries');
    }
  };

  const exportToExcel = () => {
    // Check if there's any data to export
    if (!weekData || weekData.length === 0) {
      toast.warning('No timesheet data available to export for this week');
      return;
    }

    // Check if all days have no data
    const hasAnyData = weekData.some(day => 
      day.clockInTime || day.clockOutTime || day.sessions?.length > 0
    );

    if (!hasAnyData) {
      toast.warning('No clock-in data available for this week');
      return;
    }

    // Create CSV content
    const monday = getMonday(currentDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    let csvContent = `Timesheet Report\n`;
    csvContent += `Employee: ${activeEmployee?.firstName || ''} ${activeEmployee?.lastName || ''}\n`;
    csvContent += `Period: ${formatDateDDMMYY(monday)} - ${formatDateDDMMYY(sunday)}\n`;
    csvContent += `Week ${getWeekNumber(currentDate)}\n\n`;
    
    // Headers
    csvContent += `Date,Clocked Hours,Location,Overtime,Total Hours\n`;
    
    // Data rows - only include days with actual data
    weekData.forEach(day => {
      // Skip days with no clock-in data
      if (!day.clockInTime && !day.sessions?.length) {
        return;
      }

      const date = `${day.dayName} ${day.dayNumber}`;
      const clockedHours = day.clockedHours || 'N/A';
      const location = day.location || '--';
      const overtime = day.overtime || '--';
      const totalHours = day.totalHours || '00:00';
      
      csvContent += `"${date}","${clockedHours}","${location}","${overtime}","${totalHours}"\n`;
    });
    
    // Summary
    csvContent += `\nWeekly Total Hours,${formatHours(weeklyTotalHours)}\n`;
    csvContent += `Hours Worked to Date,${statistics.hoursWorked}\n`;
    csvContent += `Overtime to Date,${statistics.overtime}\n`;
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timesheet_${activeEmployee?.firstName || 'employee'}_${activeEmployee?.lastName || ''}_week${getWeekNumber(currentDate)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Timesheet exported successfully');
  };

  // Transform weekData to table format
  const transformToTableData = () => {
    return weekData.map((day, index) => {
      // Calculate total duration for all sessions
      const calculateTotalDuration = () => {
        if (!day.sessions || day.sessions.length === 0) {
          // Single session
          if (!day.clockInTime || !day.clockOutTime || day.clockOutTime === 'Present') {
            return '--';
          }
          return day.totalHours || '--';
        }
        // Multiple sessions - use totalHours
        return day.totalHours || '--';
      };

      // Format sessions for display
      const formatSessions = () => {
        if (!day.sessions || day.sessions.length === 0) {
          // Single session
          return [{
            clockIn: day.clockInTime || '--',
            clockOut: day.clockOutTime || '--',
            duration: day.totalHours || '--'
          }];
        }
        // Multiple sessions
        return day.sessions.map(session => ({
          clockIn: session.clockInTime || '--',
          clockOut: session.clockOutTime || '--',
          duration: calculateSessionDuration(session)
        }));
      };

      const calculateSessionDuration = (session) => {
        if (!session.clockInTime || !session.clockOutTime || session.clockOutTime === 'Present') {
          return '--';
        }
        // Parse times and calculate duration
        const parseTime = (timeStr) => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };
        try {
          const startMins = parseTime(session.clockInTime);
          const endMins = parseTime(session.clockOutTime);
          const durationMins = endMins - startMins;
          const hours = Math.floor(durationMins / 60);
          const mins = durationMins % 60;
          return `${hours}h ${mins}m`;
        } catch (e) {
          return '--';
        }
      };

      // Format day label
      const getDayLabel = () => {
        if (day.isToday) return 'Today';
        const date = new Date(day.date);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        
        return formatDateDDMMYY(date);
      };

      const getDateLabel = () => {
        const date = new Date(day.date);
        return getDayName(date);
      };

      // Format breaks for display
      const formatBreaks = () => {
        const breaks = getAllBreaks(day);
        if (!breaks || breaks.length === 0) return [];
        return breaks.map(breakItem => {
          const durationMins =
            typeof breakItem?.duration === 'number'
              ? breakItem.duration
              : (() => {
                  const start = parseTimeToMinutes(breakItem?.startTime);
                  const end = parseTimeToMinutes(breakItem?.endTime);
                  if (start == null || end == null) return null;
                  const diff = end - start;
                  return diff > 0 ? diff : null;
                })();

          return {
            startTime: breakItem?.startTime || '--',
            endTime: breakItem?.endTime || '--',
            duration: durationMins != null ? formatMinutesAsHuman(durationMins) : '--'
          };
        });
      };

      // Calculate total break time
      const calculateTotalBreakTime = () => {
        const totalBreakMinutes = calculateBreakMinutes(day);
        return totalBreakMinutes > 0 ? formatMinutesAsHuman(totalBreakMinutes) : '--';
      };

      // Calculate late arrival
      const calculateLateArrival = () => {
        const lateMins = calculateLateMinutes(day);
        return lateMins && lateMins > 0 ? formatMinutesAsHHMM(lateMins) : '--';
      };

      const overtimeMins = calculateOvertimeMinutes(day);
      const overtimeHours = overtimeMins && overtimeMins > 0 ? formatMinutesAsHHMM(overtimeMins) : '--';
      const overtimeLabel = overtimeMins && overtimeMins > 0
        ? (day.shiftEndTime ? `After ${day.shiftEndTime}` : 'Overtime')
        : '-';

      return {
        id: day.entryId || `day-${index}`,
        day: getDayLabel(),
        date: day.date,
        sessions: formatSessions(),
        breaks: formatBreaks(),
        totalBreakTime: calculateTotalBreakTime(),
        lateArrival: calculateLateArrival(),
        workType: day.workType || 'Regular',
        location: day.location || 'N/A',
        overtime: overtimeLabel,
        overtimeHours: overtimeHours,
        geolocation: (() => {
          // `processTimesheetData` normalizes backend fields into `day.gpsLocation`
          // (from `gpsLocationIn`/`gpsLocationOut`). Keep additional fallbacks
          // to avoid breaking if backend field names differ.
          const gps =
            day.gpsLocation ||
            day.gpsLocationIn ||
            day.gpsLocationOut ||
            day.geoLocation ||
            day.geolocation ||
            null;

          if (!gps) return '—';

          // Already formatted
          if (typeof gps === 'string') return gps.trim() || '—';

          const lat = gps.latitude ?? gps.lat ?? (Array.isArray(gps.coordinates) ? gps.coordinates[1] : null);
          const lng = gps.longitude ?? gps.lng ?? (Array.isArray(gps.coordinates) ? gps.coordinates[0] : null);

          if (lat == null || lng == null) return '—';

          const latNum = Number(lat);
          const lngNum = Number(lng);
          if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return '—';

          return `${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`;
        })(),
        rawData: day // Keep original data for edit/delete operations
      };
    });
  };

  // Handle edit from table
  const handleEditFromTable = (record) => {
    const day = record.rawData;
    setEditingEntry(day);
    
    // For entries with multiple sessions, default to first session
    const firstSession = day.sessions && day.sessions.length > 0 ? day.sessions[0] : null;
    setEditForm({
      date: day.date ? dayjs(day.date) : dayjs(),
      clockIn: firstSession 
        ? dayjs(`2000-01-01 ${firstSession.clockInTime}`) 
        : (day.clockInTime ? dayjs(`2000-01-01 ${day.clockInTime}`) : dayjs().hour(9).minute(0)),
      clockOut: firstSession 
        ? (firstSession.clockOutTime && firstSession.clockOutTime !== 'Present' ? dayjs(`2000-01-01 ${firstSession.clockOutTime}`) : null)
        : (day.clockOutTime && day.clockOutTime !== 'Present' ? dayjs(`2000-01-01 ${day.clockOutTime}`) : null),
      location: firstSession ? (firstSession.location || 'Work From Office') : (day.location || 'Work From Office'),
      workType: firstSession ? (firstSession.workType || 'Regular') : (day.workType || 'Regular'),
      breaks: firstSession ? (firstSession.breaks || []) : (day.breaks || []),
      sessionIndex: 0,
      entryId: firstSession ? firstSession.entryId : day.entryId
    });
    setShowEditModal(true);
  };

  // Handle delete from table
  const handleDeleteFromTable = (record) => {
    const day = record.rawData;
    handleDeleteEntry(day.entryId);
  };

  if (!activeEmployee) return null;

  return (
    <>
      <div 
        style={{
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
          padding: '20px'
        }}
        onClick={onClose}
      >
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '1100px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e5e7eb'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          position: 'relative',
          background: '#ffffff'
        }}>
          {/* Navigation and Close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => navigateEmployee(-1)}
                disabled={!canNavigatePrev}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: canNavigatePrev ? 'pointer' : 'not-allowed',
                  opacity: canNavigatePrev ? 1 : 0.4,
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronLeftIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />
              </button>
              <button
                onClick={() => navigateEmployee(1)}
                disabled={!canNavigateNext}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: canNavigateNext ? 'pointer' : 'not-allowed',
                  opacity: canNavigateNext ? 1 : 0.4,
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronRightIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />
              </button>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                {getCurrentEmployeeIndex()} out of {getTotalEmployees()}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
            </button>
          </div>

          {/* Employee Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: '600',
              color: '#374151',
              overflow: 'hidden'
            }}>
              {(employeeProfile?.profilePicture || activeEmployee?.profilePicture) ? (
                <img 
                  src={buildApiUrl((employeeProfile?.profilePicture || activeEmployee?.profilePicture).startsWith('/') ? (employeeProfile?.profilePicture || activeEmployee?.profilePicture) : `/uploads/${employeeProfile?.profilePicture || activeEmployee?.profilePicture}`)} 
                  alt="" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.textContent = `${activeEmployee?.firstName?.[0] || ''}${activeEmployee?.lastName?.[0] || ''}`;
                  }}
                />
              ) : (
                `${activeEmployee?.firstName?.[0] || ''}${activeEmployee?.lastName?.[0] || ''}`
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                {activeEmployee?.firstName} {activeEmployee?.lastName}
              </h2>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
                <div><span style={{ fontWeight: '500' }}>Role:</span> {activeEmployee?.jobTitle || activeEmployee?.jobRole || 'Employee'}</div>
                <div><span style={{ fontWeight: '500' }}>EMP_ID:</span> {activeEmployee?.empId || activeEmployee?.empID || activeEmployee?.emp_id || activeEmployee?.employeeId || activeEmployee?.employeeID || activeEmployee?.employeeCode || activeEmployee?.employeeNumber || activeEmployee?.staffId || activeEmployee?.staffID || activeEmployee?.payrollNumber || 'N/A'}</div>
                <div>
                  <span style={{ fontWeight: '500' }}>Mobile:</span> {employeeProfile?.mobile || activeEmployee?.mobile || employeeProfile?.phone || activeEmployee?.phone || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clock In/Out/Break Buttons */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb',
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          {currentClockStatus?.status === 'clocked-in' ? (
            <>
              <button
                onClick={handleStartBreak}
                style={{
                  padding: '10px 20px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                }}
              >
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Break
              </button>
              <button
                onClick={handleClockOut}
                style={{
                  padding: '10px 20px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                }}
              >
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Clock Out
              </button>
              <div style={{
                padding: '8px 16px',
                background: '#d1fae5',
                color: '#065f46',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
                Clocked In
              </div>
            </>
          ) : currentClockStatus?.status === 'on-break' ? (
            <>
              <button
                onClick={async () => {
                  try {
                    const employeeId = activeEmployee?._id || activeEmployee?.id;
                    console.log('🟢 Resume Work initiated for employee:', employeeId);
                    
                    const { endBreak } = await import('../utils/clockApi');
                    const response = await endBreak(employeeId);
                    
                    if (response.success) {
                      toast.success('Break ended, work resumed');
                      await fetchCurrentClockStatus();
                      await fetchWeeklyTimesheet();
                      // Trigger global refresh for all pages
                      triggerClockRefresh({ action: 'end_break', employeeId });
                    } else {
                      toast.error(response.message || 'Failed to end break');
                    }
                  } catch (error) {
                    console.error('❌ End break error:', error);
                    toast.error(error.response?.data?.message || error.message || 'Failed to end break');
                  }
                }}
                style={{
                  padding: '10px 20px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                }}
              >
                Resume Work
              </button>
              <button
                onClick={handleClockOut}
                style={{
                  padding: '10px 20px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                }}
              >
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Clock Out
              </button>
              <div style={{
                padding: '8px 16px',
                background: '#fef3c7',
                color: '#92400e',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%', display: 'inline-block' }}></span>
                On Break
              </div>
            </>
          ) : (
            <>
              <button
                onClick={handleClockIn}
                style={{
                  padding: '10px 20px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                }}
              >
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Clock In
              </button>
              <div style={{
                padding: '8px 16px',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', display: 'inline-block' }}></span>
                Clocked Out
              </div>
            </>
          )}
        </div>

        {/* Week Navigation */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
              {(() => {
                const monday = getMonday(currentDate);
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                return `${formatDateDDMMYY(monday)} - ${formatDateDDMMYY(sunday)}`;
              })()}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setDate(newDate.getDate() - 7);
                  setCurrentDate(newDate);
                  setSelectedMonth(newDate);
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronLeftIcon style={{ width: '16px', height: '16px', color: '#6b7280' }} />
              </button>
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setDate(newDate.getDate() + 7);
                  setCurrentDate(newDate);
                  setSelectedMonth(newDate);
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronRightIcon style={{ width: '16px', height: '16px', color: '#6b7280' }} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '13px',
                background: 'white',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option>All Status</option>
              <option>Present</option>
              <option>Absent</option>
              <option>Late</option>
            </select>
          </div>
        </div>

        {/* Timesheet Table View */}
        <div style={{ 
          padding: '24px',
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: 1,
          background: '#f9fafb'
        }}
        className="hide-scrollbar">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              Loading timesheet...
            </div>
          ) : (
            <EmployeeTimeTable 
              records={transformToTableData().filter(record => {
                const day = record.rawData;
                if (statusFilter === 'All Status') return true;
                if (statusFilter === 'Present') return day.clockIn && day.clockOut;
                if (statusFilter === 'Absent') return !day.clockIn || day.isAbsent;
                if (statusFilter === 'Late') {
                  // Check if employee was late based on shift start time
                  if (!day.clockInTime || !day.shiftStartTime) return false;
                  const parseTime = (timeStr) => {
                    if (!timeStr || timeStr === 'Present' || timeStr === 'N/A') return null;
                    const [hours, minutes] = timeStr.split(':').map(Number);
                    return hours * 60 + minutes;
                  };
                  const clockInMinutes = parseTime(day.clockInTime);
                  const shiftStartMinutes = parseTime(day.shiftStartTime);
                  return clockInMinutes > shiftStartMinutes;
                }
                return true;
              })}
              onEdit={handleEditFromTable}
              onDelete={handleDeleteFromTable}
            />
          )}
        </div>
      </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingEntry && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#111827' }}>
              {editingEntry.isAbsent || !editingEntry.entryId || editingEntry.entryId.startsWith('absent-') 
                ? 'Add Time Entry' 
                : 'Edit Time Entry'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
              {/* Session Selector - Only show if there are multiple sessions */}
              {editingEntry.sessions && editingEntry.sessions.length > 1 && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                    Select Session to Edit
                  </label>
                  <select
                    value={editForm.sessionIndex}
                    onChange={(e) => {
                      const selectedIndex = parseInt(e.target.value);
                      const selectedSession = editingEntry.sessions[selectedIndex];
                      setEditForm({
                        ...editForm,
                        sessionIndex: selectedIndex,
                        clockIn: dayjs(`2000-01-01 ${selectedSession.clockInTime}`),
                        clockOut: selectedSession.clockOutTime && selectedSession.clockOutTime !== 'Present' ? dayjs(`2000-01-01 ${selectedSession.clockOutTime}`) : null,
                        location: selectedSession.location || 'Work From Office',
                        workType: selectedSession.workType || 'Regular',
                        breaks: selectedSession.breaks || [],
                        entryId: selectedSession.entryId
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #3b82f6',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#111827',
                      background: '#eff6ff',
                      cursor: 'pointer',
                      outline: 'none',
                      fontWeight: '500'
                    }}
                  >
                    {editingEntry.sessions.map((session, idx) => (
                      <option key={idx} value={idx}>
                        Session {idx + 1}: {session.clockInTime} - {session.clockOutTime || 'Present'}
                      </option>
                    ))}
                  </select>
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '8px 12px', 
                    background: '#fef3c7', 
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>You are editing Session {editForm.sessionIndex + 1} of {editingEntry.sessions.length}</span>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Date
                </label>
                <DatePicker
                  value={editForm.date}
                  onChange={(date) => setEditForm({ ...editForm, date })}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Clock In Time
                </label>
                <MUITimePicker
                  value={editForm.clockIn}
                  onChange={(time) => setEditForm({ ...editForm, clockIn: time })}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Clock Out Time
                </label>
                <MUITimePicker
                  value={editForm.clockOut}
                  onChange={(time) => setEditForm({ ...editForm, clockOut: time })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Location
                </label>
                <select
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="Work From Office">Work From Office</option>
                  <option value="Work From Home">Work From Home</option>
                  <option value="Client Site">Client Site</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Work Type
                </label>
                <select
                  value={editForm.workType}
                  onChange={(e) => setEditForm({ ...editForm, workType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="Regular">Regular</option>
                  <option value="Overtime">Overtime</option>
                  <option value="Holiday">Holiday</option>
                </select>
              </div>

              {/* Breaks Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    Breaks
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm({
                        ...editForm,
                        breaks: [...editForm.breaks, { startTime: '', endTime: '', duration: 0 }]
                      });
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    + Add Break
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {editForm.breaks && editForm.breaks.length > 0 ? (
                    editForm.breaks.map((breakItem, idx) => (
                      <div 
                        key={idx}
                        style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                          padding: '12px',
                          background: '#f9fafb',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Start</label>
                          <input
                            type="time"
                            value={breakItem.startTime}
                            onChange={(e) => {
                              const newBreaks = [...editForm.breaks];
                              newBreaks[idx].startTime = e.target.value;
                              setEditForm({ ...editForm, breaks: newBreaks });
                            }}
                            style={{
                              width: '100%',
                              padding: '6px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>End</label>
                          <input
                            type="time"
                            value={breakItem.endTime}
                            onChange={(e) => {
                              const newBreaks = [...editForm.breaks];
                              newBreaks[idx].endTime = e.target.value;
                              setEditForm({ ...editForm, breaks: newBreaks });
                            }}
                            style={{
                              width: '100%',
                              padding: '6px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newBreaks = editForm.breaks.filter((_, i) => i !== idx);
                            setEditForm({ ...editForm, breaks: newBreaks });
                          }}
                          style={{
                            marginTop: '16px',
                            padding: '6px',
                            background: '#fee2e2',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: '#dc2626'
                          }}
                        >
                          <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      padding: '12px', 
                      background: '#f9fafb', 
                      borderRadius: '6px',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '13px'
                    }}>
                      No breaks recorded
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        /* Hide scrollbar for IE, Edge and Firefox */
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
};

export default EmployeeTimesheetModal;
