import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getClockStatus, getDashboardStats } from '../utils/clockApi';
import { getCurrentUserLeaveBalance, getNextUpcomingLeave } from '../utils/leaveApi';
import { useAuth } from '../context/AuthContext';
import { useClockStatus } from '../context/ClockStatusContext';
import { formatUKDateTime } from '../utils/timeUtils';
import { buildApiUrl } from '../utils/apiConfig';
import LoadingScreen from '../components/LoadingScreen';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .clock-root {
    font-family: 'DM Sans', sans-serif;
    -webkit-text-size-adjust: 100%;
    background: #f7f8f6;
    min-height: 100vh;
    padding: 2rem;
    position: relative;
  }
  .clock-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
  }
  .clock-shell {
    position: relative; z-index: 1;
    max-width: 1200px; margin: 0 auto;
  }

  /* ── Keyframes ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-ring {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50%      { opacity: 1; transform: scale(1.25); }
  }

  .anim-fade-up { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
  .delay-100 { animation-delay: 0.10s; }
  .delay-200 { animation-delay: 0.20s; }
  .delay-300 { animation-delay: 0.30s; }

  /* ══════════════════════════════════════
     PAGE HEADER
  ══════════════════════════════════════ */
  .page-header { margin-bottom: 1.75rem; }
  .page-header-row {
    display: flex; align-items: flex-start; gap: 0.85rem; flex-wrap: wrap;
  }
  .page-icon-wrap {
    width: 44px; height: 44px; border-radius: 12px;
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(53,79,82,0.18); flex-shrink: 0;
  }
  .page-eyebrow {
    font-size: 0.65rem; font-weight: 500; letter-spacing: 0.2em;
    text-transform: uppercase; color: #84a98c;
    margin: 0 0 0.15rem;
  }
  .page-title {
    font-family: 'Cormorant Garamond', serif; font-weight: 400;
    font-size: 1.95rem; color: #2f3e46; line-height: 1.15; letter-spacing: -0.02em;
    margin: 0;
  }
  .page-subtitle {
    font-size: 0.82rem; color: #7a8e84; font-weight: 300;
    margin: 0.35rem 0 0;
    display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap;
  }
  .live-dot {
    display: inline-block;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #84a98c;
    animation: pulse-ring 2.5s ease-in-out infinite;
    flex-shrink: 0;
  }
  .clock-time-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.18rem 0.65rem;
    background: rgba(132,169,140,0.14);
    border: 1px solid rgba(132,169,140,0.25);
    border-radius: 999px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.74rem; font-weight: 600;
    color: #354f52;
    letter-spacing: 0.04em;
  }
  .subtle-meta {
    color: #8fa99a; font-weight: 300; font-size: 0.74rem;
  }

  /* ══════════════════════════════════════
     STAT CARDS
  ══════════════════════════════════════ */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .stat-card {
    background: #fff;
    border: 1.5px solid #eaefeb;
    border-radius: 14px;
    padding: 1.2rem 1.25rem;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
    position: relative;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
  }
  .stat-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2.5px;
    background: var(--accent, #84a98c);
    opacity: 0.55;
    transition: opacity 0.25s;
  }
  .stat-card:hover {
    transform: translateY(-2px);
    border-color: var(--accent, #84a98c);
    box-shadow: 0 8px 24px rgba(53,79,82,0.1);
  }
  .stat-card:hover::before { opacity: 1; }
  .stat-card.is-selected {
    border-color: var(--accent, #52796f);
    background: var(--accent-bg, rgba(132,169,140,0.06));
    box-shadow: 0 0 0 3px var(--accent-ring, rgba(132,169,140,0.15)), 0 6px 18px rgba(53,79,82,0.08);
  }
  .stat-card.is-selected::before { opacity: 1; height: 3px; }

  .stat-card-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  .stat-label {
    font-size: 0.62rem; font-weight: 600;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #84a98c;
  }
  .stat-status-dot {
    width: 9px; height: 9px;
    border-radius: 50%;
    background: var(--accent, #84a98c);
    box-shadow: 0 0 0 3px var(--accent-bg, rgba(132,169,140,0.18));
  }
  .stat-value {
    font-family: 'Cormorant Garamond', serif;
    font-size: 2.2rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.02em;
    line-height: 1.05;
    margin: 0;
  }
  .stat-card.is-selected .stat-value { color: var(--accent-text, #354f52); }

  /* Variant accent variables */
  .variant-all       { --accent: #84a98c; --accent-bg: rgba(132,169,140,0.10); --accent-ring: rgba(132,169,140,0.18); --accent-text: #354f52; }
  .variant-clockedin { --accent: #52796f; --accent-bg: rgba(82,121,111,0.10);  --accent-ring: rgba(82,121,111,0.18);  --accent-text: #2f3e46; }
  .variant-clockedout{ --accent: #6f8c98; --accent-bg: rgba(111,140,152,0.10); --accent-ring: rgba(111,140,152,0.18); --accent-text: #354f52; }
  .variant-onbreak   { --accent: #b89758; --accent-bg: rgba(184,151,88,0.10);  --accent-ring: rgba(184,151,88,0.20);  --accent-text: #6b5524; }
  .variant-absent    { --accent: #b85c50; --accent-bg: rgba(184,92,80,0.08);   --accent-ring: rgba(184,92,80,0.16);   --accent-text: #7a3028; }

  /* ══════════════════════════════════════
     EMPLOYEE LIST CARD
  ══════════════════════════════════════ */
  .list-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    overflow: hidden;
  }
  .list-head {
    padding: 1.15rem 1.5rem;
    border-bottom: 1px solid #eaefeb;
    display: flex; justify-content: space-between; align-items: center;
    gap: 1rem; flex-wrap: wrap;
  }
  .list-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.3rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0;
  }
  .list-count {
    margin-left: 0.65rem;
    display: inline-flex; align-items: center;
    padding: 0.12rem 0.55rem;
    background: rgba(132,169,140,0.15);
    border-radius: 999px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.65rem; font-weight: 600;
    color: #354f52;
    letter-spacing: 0.04em;
    vertical-align: middle;
  }

  .show-all-btn {
    background: #fff;
    border: 1px solid #d4ddd6;
    border-radius: 8px;
    padding: 0.42rem 0.85rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.74rem; font-weight: 500;
    color: #354f52;
    cursor: pointer;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
    min-height: 34px;
  }
  .show-all-btn:hover {
    background: #f0f5f2;
    border-color: #84a98c;
  }

  .list-body {
    max-height: 460px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .list-row {
    display: flex; align-items: center;
    padding: 0.95rem 1.5rem;
    border-bottom: 1px solid #eaefeb;
    transition: background 0.15s;
    gap: 0.95rem;
  }
  .list-row:last-child { border-bottom: none; }
  .list-row:hover { background: #fafbfa; }

  /* ── Avatar ── */
  .row-avatar {
    width: 42px; height: 42px;
    border-radius: 50%;
    background: linear-gradient(135deg, #354f52 0%, #52796f 60%, #84a98c 100%);
    display: flex; align-items: center; justify-content: center;
    color: #cad2c5;
    font-size: 0.85rem; font-weight: 600;
    border: 2px solid #fff;
    box-shadow: 0 2px 6px rgba(53,79,82,0.15);
    flex-shrink: 0;
  }

  /* ── Row info ── */
  .row-info { flex: 1; min-width: 0; }
  .row-name-line {
    display: flex; align-items: center; gap: 0.5rem;
    margin-bottom: 0.15rem;
  }
  .row-name {
    font-size: 0.88rem; font-weight: 600;
    color: #2f3e46; letter-spacing: -0.005em;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .me-badge {
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    color: #cad2c5;
    font-size: 0.58rem; font-weight: 700;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    letter-spacing: 0.12em;
    flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(53,79,82,0.18);
  }
  .row-meta-grid {
    display: flex; flex-wrap: wrap; gap: 0.3rem 1rem;
    font-size: 0.72rem; color: #7a8e84; font-weight: 400;
  }
  .row-meta-item {
    display: inline-flex; align-items: center; gap: 0.3rem;
    line-height: 1.4;
  }
  .row-meta-sep {
    color: #b6c0b9; font-size: 0.6rem;
  }

  /* ── Status pill on right ── */
  .row-status {
    display: inline-flex; align-items: center; gap: 0.45rem;
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    font-size: 0.74rem; font-weight: 600;
    letter-spacing: 0.02em;
    flex-shrink: 0;
    border: 1px solid var(--status-border, #eaefeb);
    background: var(--status-bg, #fafbfa);
    color: var(--status-text, #2f3e46);
  }
  .row-status-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--status-dot, #84a98c);
    flex-shrink: 0;
  }

  .status-clockedin {
    --status-bg: rgba(82,121,111,0.10);
    --status-border: rgba(82,121,111,0.22);
    --status-text: #354f52;
    --status-dot: #52796f;
  }
  .status-clockedout {
    --status-bg: rgba(111,140,152,0.08);
    --status-border: rgba(111,140,152,0.2);
    --status-text: #354f52;
    --status-dot: #6f8c98;
  }
  .status-onbreak {
    --status-bg: rgba(184,151,88,0.10);
    --status-border: rgba(184,151,88,0.25);
    --status-text: #6b5524;
    --status-dot: #b89758;
  }
  .status-absent {
    --status-bg: rgba(184,92,80,0.08);
    --status-border: rgba(184,92,80,0.2);
    --status-text: #7a3028;
    --status-dot: #b85c50;
  }
  .status-default {
    --status-bg: #fafbfa;
    --status-border: #eaefeb;
    --status-text: #7a8e84;
    --status-dot: #b6c0b9;
  }

  /* ── Empty list ── */
  .list-empty {
    padding: 3.5rem 1rem;
    text-align: center;
  }
  .empty-icon-wrap {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: rgba(132,169,140,0.12);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1rem;
  }
  .empty-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.3rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0 0 0.4rem;
  }
  .empty-subtitle {
    font-size: 0.82rem; color: #7a8e84; font-weight: 300;
    margin: 0;
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1023px) {
    .clock-root { padding: 1.5rem; }
  }
  @media (max-width: 767px) {
    .clock-root { padding: 1rem; }
    .page-title { font-size: 1.55rem; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
    .stat-card { padding: 0.95rem 1rem; }
    .stat-value { font-size: 1.75rem; }
    .list-head { padding: 0.95rem 1.1rem; }
    .list-row { padding: 0.85rem 1.1rem; gap: 0.8rem; }
    .row-meta-grid { gap: 0.25rem 0.75rem; font-size: 0.7rem; }
  }
  @media (max-width: 479px) {
    .clock-root { padding: 0.75rem; }
    .page-title { font-size: 1.35rem; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .stat-value { font-size: 1.55rem; }
    .list-card { border-radius: 14px; }
    .list-head {
      flex-direction: column; align-items: stretch;
      padding: 0.95rem 0.95rem;
    }
    .show-all-btn { align-self: flex-end; }
    .list-row { padding: 0.85rem 0.95rem; gap: 0.7rem; }
    .row-avatar { width: 38px; height: 38px; font-size: 0.78rem; }
    .row-name { font-size: 0.82rem; }
    .row-status {
      padding: 0.3rem 0.6rem;
      font-size: 0.68rem;
    }
    .me-badge { font-size: 0.54rem; padding: 0.12rem 0.4rem; }
  }
`;

const ClockInOut = () => {
  const { user } = useAuth();
  const { refreshTrigger } = useClockStatus();
  const [clockData, setClockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    clockedIn: 0,
    clockedOut: 0,
    onBreak: 0,
    absent: 0,
    late: 0
  });
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [nextLeave, setNextLeave] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchClockStatus = async () => {
    try {
      const [statusRes, statsRes, employeesRes] = await Promise.all([
        getClockStatus({ includeAdmins: true }),
        getDashboardStats(),
        fetch(buildApiUrl('/employees?includeAdmins=true'), {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Accept': 'application/json'
          }
        }).then(res => res.json())
      ]);

      let clockStatusData = [];
      if (statusRes.success && statusRes.data) {
        clockStatusData = Array.isArray(statusRes.data) ? statusRes.data : [];
      } else if (statusRes.allEmployees) {
        clockStatusData = statusRes.allEmployees;
      }

      if (employeesRes?.success && employeesRes.data) {
        const employeesWithClockStatus = employeesRes.data.map(emp => ({
          ...emp,
          name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
          status: 'clocked-out',
          clockStatus: 'clocked-out',
          clockIn: null,
          clockOut: null
        }));

        if (clockStatusData.length > 0) {
          const clockStatusMap = {};
          const employeeEmailSet = new Set(employeesWithClockStatus.map(e => e.email));

          clockStatusData.forEach(clockEmp => {
            const key = clockEmp.email || clockEmp.id || clockEmp._id;
            if (key) {
              clockStatusMap[key] = clockEmp;
            }
          });

          employeesWithClockStatus.forEach(emp => {
            const matchByEmail = clockStatusMap[emp.email];
            const matchById = clockStatusMap[emp.id] || clockStatusMap[emp._id];
            const clockData = matchByEmail || matchById;

            if (clockData) {
              emp.status = clockData.status?.replace('_', '-') || 'clocked-out';
              emp.clockStatus = clockData.status?.replace('_', '-') || 'clocked-out';
              emp.clockIn = clockData.clockIn;
              emp.clockOut = clockData.clockOut;
              emp.breakIn = clockData.breakIn;
              emp.breakOut = clockData.breakOut;
            }
          });

          clockStatusData.forEach(clockEmp => {
            const isInEmployeeHub = clockEmp.email && employeeEmailSet.has(clockEmp.email);
            const isAdminRole = clockEmp.role === 'admin' || clockEmp.role === 'super-admin';

            if (!isInEmployeeHub && isAdminRole && clockEmp.status && clockEmp.status !== 'clocked-out') {
              employeesWithClockStatus.push({
                ...clockEmp,
                name: clockEmp.name || `${clockEmp.firstName || ''} ${clockEmp.lastName || ''}`.trim(),
                status: clockEmp.status?.replace('_', '-'),
                clockStatus: clockEmp.status?.replace('_', '-'),
                clockIn: clockEmp.clockIn,
                clockOut: clockEmp.clockOut,
                breakIn: clockEmp.breakIn,
                breakOut: clockEmp.breakOut,
                role: clockEmp.role,
                isAdmin: true
              });
            }
          });
        }

        setClockData(employeesWithClockStatus);

        if (statsRes.success && statsRes.data) {
          calculateStats(employeesWithClockStatus);
        } else {
          calculateStats(employeesWithClockStatus);
        }

        try {
          const attendanceRes = await fetch(buildApiUrl('/clock/attendance-status'), {
            credentials: 'include'
          });
          if (attendanceRes.ok) {
            const attendanceData = await attendanceRes.json();
            if (attendanceData.success && attendanceData.data) {
              setStats(prevStats => ({
                ...prevStats,
                late: attendanceData.data.summary.late || 0,
                absent: attendanceData.data.summary.absent || 0
              }));
            }
          }
        } catch (error) {
          console.error('Error fetching attendance status:', error);
        }
      } else if (statusRes.success) {
        setClockData(clockStatusData);
        calculateStats(clockStatusData);
      } else {
        setClockData([]);
        calculateStats([]);
      }
    } catch (error) {
      console.error('Clock status error:', error);
      toast.error('Failed to fetch employee clock status');
      setClockData([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveData = async () => {
    try {
      const balanceResponse = await getCurrentUserLeaveBalance();
      if (balanceResponse.success && balanceResponse.data) {
        setLeaveBalance(balanceResponse.data);
      }
    } catch (error) {
      console.error('Error fetching leave balance:', error);
    }

    try {
      const nextLeaveResponse = await getNextUpcomingLeave();
      if (nextLeaveResponse.success && nextLeaveResponse.data) {
        setNextLeave(nextLeaveResponse.data);
      }
    } catch (error) {
      console.error('Error fetching next leave:', error);
    }
  };

  useEffect(() => {
    fetchClockStatus();
    fetchLeaveData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchClockStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const calculateStats = (data) => {
    const next = {
      total: data.length,
      clockedIn: 0,
      clockedOut: 0,
      onBreak: 0,
      absent: 0,
      late: 0
    };

    data.forEach(employee => {
      switch (employee.status) {
        case 'clocked-in': next.clockedIn++; break;
        case 'clocked-out': next.clockedOut++; break;
        case 'on-break': next.onBreak++; break;
        case 'absent': next.absent++; break;
        default: break;
      }
    });

    next.absent = Math.max(0, next.absent);
    setStats(next);
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'clocked-in': return 'Clocked In';
      case 'clocked-out': return 'Clocked Out';
      case 'on-break': return 'On a Break';
      case 'absent': return 'Absent';
      default: return 'Unknown';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'clocked-in': return 'row-status status-clockedin';
      case 'clocked-out': return 'row-status status-clockedout';
      case 'on-break': return 'row-status status-onbreak';
      case 'absent': return 'row-status status-absent';
      default: return 'row-status status-default';
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const filteredEmployees = clockData.filter(employee => {
    if (!selectedFilter) return true;
    return employee.status && employee.status === selectedFilter;
  });

  // Format time parts separately for cleaner display
  const timePart = currentTime.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const datePart = currentTime.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <>
      <style>{styles}</style>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="clock-root">
        <div className="clock-shell">

          {/* ── Page Header ── */}
          <div className="page-header anim-fade-up">
            <div className="page-header-row">
              <div className="page-icon-wrap">
                <svg style={{ width: 22, height: 22, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="page-eyebrow">Live Attendance</p>
                <h1 className="page-title">Clock In Overview</h1>
                <p className="page-subtitle">
                  <span className="live-dot"></span>
                  <span className="clock-time-badge">UK Time · {timePart}</span>
                  <span className="subtle-meta">{datePart}</span>
                  <span className="subtle-meta">· Updates immediately on clock actions</span>
                </p>
              </div>
            </div>
          </div>

          {/* ── Stat Cards ── */}
          <div className="stats-grid anim-fade-up delay-100">
            <div
              onClick={() => setSelectedFilter(null)}
              className={`stat-card variant-all ${selectedFilter === null ? 'is-selected' : ''}`}
            >
              <div className="stat-card-head">
                <span className="stat-label">All Employees</span>
                <span className="stat-status-dot"></span>
              </div>
              <p className="stat-value">{stats.total}</p>
            </div>

            <div
              onClick={() => setSelectedFilter(selectedFilter === 'clocked-in' ? null : 'clocked-in')}
              className={`stat-card variant-clockedin ${selectedFilter === 'clocked-in' ? 'is-selected' : ''}`}
            >
              <div className="stat-card-head">
                <span className="stat-label">Clocked In</span>
                <span className="stat-status-dot"></span>
              </div>
              <p className="stat-value">{stats.clockedIn}</p>
            </div>

            <div
              onClick={() => setSelectedFilter(selectedFilter === 'clocked-out' ? null : 'clocked-out')}
              className={`stat-card variant-clockedout ${selectedFilter === 'clocked-out' ? 'is-selected' : ''}`}
            >
              <div className="stat-card-head">
                <span className="stat-label">Clocked Out</span>
                <span className="stat-status-dot"></span>
              </div>
              <p className="stat-value">{stats.clockedOut}</p>
            </div>

            <div
              onClick={() => setSelectedFilter(selectedFilter === 'on-break' ? null : 'on-break')}
              className={`stat-card variant-onbreak ${selectedFilter === 'on-break' ? 'is-selected' : ''}`}
            >
              <div className="stat-card-head">
                <span className="stat-label">On a Break</span>
                <span className="stat-status-dot"></span>
              </div>
              <p className="stat-value">{stats.onBreak}</p>
            </div>

            <div
              onClick={() => setSelectedFilter(selectedFilter === 'absent' ? null : 'absent')}
              className={`stat-card variant-absent ${selectedFilter === 'absent' ? 'is-selected' : ''}`}
            >
              <div className="stat-card-head">
                <span className="stat-label">Absent</span>
                <span className="stat-status-dot"></span>
              </div>
              <p className="stat-value">{stats.absent || 0}</p>
            </div>
          </div>

          {/* ── Employee List ── */}
          {clockData.length > 0 && (
            <div className="list-card anim-fade-up delay-200">
              <div className="list-head">
                <h3 className="list-title">
                  {selectedFilter ? `${getStatusText(selectedFilter)} Employees` : 'Employee Status'}
                  <span className="list-count">{filteredEmployees.length}</span>
                </h3>
                {selectedFilter && (
                  <button
                    type="button"
                    onClick={() => setSelectedFilter(null)}
                    className="show-all-btn"
                  >
                    Show All
                  </button>
                )}
              </div>

              <div className="list-body">
                {filteredEmployees.length === 0 ? (
                  <div className="list-empty">
                    <div className="empty-icon-wrap">
                      <svg style={{ width: 28, height: 28, color: '#84a98c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h4 className="empty-title">No employees in this status</h4>
                    <p className="empty-subtitle">Try selecting a different category above.</p>
                  </div>
                ) : (
                  filteredEmployees.map((employee, index) => {
                    const isMe = user?.email && employee.email && user.email.toLowerCase() === employee.email.toLowerCase();
                    const initial = employee.name?.charAt(0)?.toUpperCase() || 'U';

                    // Build meta items, only showing the ones that exist
                    const metaItems = [];
                    if (employee.jobTitle) metaItems.push(employee.jobTitle);
                    if (employee.department) metaItems.push(employee.department);
                    if (employee.team) metaItems.push(employee.team);
                    if (employee.office) metaItems.push(employee.office);

                    return (
                      <div key={employee.id || employee._id || index} className="list-row">
                        <div className="row-avatar">{initial}</div>

                        <div className="row-info">
                          <div className="row-name-line">
                            <span className="row-name">{employee.name || 'Unknown User'}</span>
                            {isMe && <span className="me-badge">ME</span>}
                          </div>
                          {metaItems.length > 0 && (
                            <div className="row-meta-grid">
                              {metaItems.map((item, i) => (
                                <React.Fragment key={i}>
                                  <span className="row-meta-item">{item}</span>
                                  {i < metaItems.length - 1 && <span className="row-meta-sep">·</span>}
                                </React.Fragment>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className={getStatusClass(employee.status)}>
                          <span className="row-status-dot"></span>
                          <span>{getStatusText(employee.status)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default ClockInOut;