import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import { buildApiUrl } from '../utils/apiConfig';
import { getClockStatus, getUserClockStatus, userClockIn, userClockOut } from '../utils/clockApi';
import ComplianceInsights from './ComplianceInsights';
import {
  UsersIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .cd-root {
    font-family: 'DM Sans', sans-serif;
    -webkit-text-size-adjust: 100%;
    background: #f7f8f6;
    min-height: 100vh;
    padding: 1.5rem;
    position: relative;
    overflow-x: hidden;
    width: 100%;
    max-width: 100%;
  }
  .cd-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
    height: 600px;
  }
  .cd-shell {
    position: relative; z-index: 1;
    max-width: 100%;
    margin: 0 auto;
    min-width: 0;
    display: flex; flex-direction: column;
    gap: 1.1rem;
  }

  /* ── Keyframes ── */
  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-skeleton {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.85; }
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
  .page-header {
    display: flex; flex-direction: column;
    gap: 0.85rem;
  }
  @media (min-width: 768px) {
    .page-header {
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1.5rem;
    }
  }
  .header-block {
    display: flex; gap: 0.7rem; align-items: flex-start;
    min-width: 0; flex: 1;
  }
  .header-icon-wrap {
    width: 38px; height: 38px; border-radius: 10px;
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(53,79,82,0.18); flex-shrink: 0;
  }
  .header-eyebrow {
    font-size: 0.6rem; font-weight: 500; letter-spacing: 0.18em;
    text-transform: uppercase; color: #84a98c;
    margin: 0 0 0.1rem;
  }
  .header-title {
    font-family: 'Cormorant Garamond', serif; font-weight: 400;
    font-size: 1.65rem; color: #2f3e46; line-height: 1.15; letter-spacing: -0.02em;
    margin: 0;
  }
  .header-subtitle {
    font-size: 0.78rem; color: #7a8e84; font-weight: 300;
    margin: 0.2rem 0 0;
  }

  /* ══════════════════════════════════════
     BUTTONS
  ══════════════════════════════════════ */
  .btn {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.74rem; font-weight: 500;
    letter-spacing: 0.04em;
    border: none; border-radius: 8px;
    cursor: pointer; padding: 0.5rem 0.85rem;
    display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
    transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
    -webkit-tap-highlight-color: transparent;
    white-space: nowrap;
    min-height: 36px;
  }
  .btn-primary {
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    color: #cad2c5;
    box-shadow: 0 3px 12px rgba(53,79,82,0.22);
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 6px 18px rgba(53,79,82,0.3);
  }
  .btn-primary:disabled {
    background: #d4ddd6; color: #8fa99a;
    box-shadow: none; cursor: not-allowed; transform: none;
  }
  .btn-success {
    background: linear-gradient(135deg, #52796f 0%, #6b8e7f 100%);
    color: #fff;
    box-shadow: 0 3px 10px rgba(82,121,111,0.22);
  }
  .btn-success:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 5px 14px rgba(82,121,111,0.3);
  }
  .btn-success:disabled {
    background: #d4ddd6; color: #8fa99a;
    box-shadow: none; cursor: not-allowed; transform: none;
  }
  .btn-danger {
    background: linear-gradient(135deg, #a35446 0%, #b85c50 100%);
    color: #fff;
    box-shadow: 0 3px 12px rgba(163,84,70,0.22);
  }
  .btn-danger:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 6px 18px rgba(163,84,70,0.3);
  }
  .btn-danger:disabled {
    background: #d4ddd6; color: #8fa99a;
    box-shadow: none; cursor: not-allowed; transform: none;
  }
  .btn-secondary {
    background: #fff; color: #354f52;
    border: 1px solid #d4ddd6;
  }
  .btn-secondary:hover:not(:disabled) {
    background: #f0f5f2; border-color: #84a98c; color: #2f3e46;
  }
  .btn-secondary:disabled {
    background: #fafbfa; color: #b6c0b9;
    cursor: not-allowed;
  }
  .btn-block { width: 100%; }

  /* ══════════════════════════════════════
     STAT CARDS GRID
  ══════════════════════════════════════ */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.65rem;
  }
  @media (min-width: 768px) {
    .stats-grid { grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
  }
  @media (min-width: 1280px) {
    .stats-grid { grid-template-columns: repeat(6, 1fr); gap: 0.85rem; }
  }

  .stat-card {
    background: #fff;
    border: 1.5px solid #eaefeb;
    border-radius: 12px;
    padding: 0.85rem 0.95rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    cursor: pointer;
    text-align: left;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    overflow: hidden;
    transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
    -webkit-tap-highlight-color: transparent;
    width: 100%;
  }
  .stat-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: var(--accent, #84a98c);
    opacity: 0.5;
    transition: opacity 0.25s;
  }
  .stat-card:hover {
    transform: translateY(-2px);
    border-color: var(--accent, #84a98c);
    box-shadow: 0 6px 18px rgba(53,79,82,0.08);
  }
  .stat-card:hover::before { opacity: 1; }
  .stat-card.is-active {
    border-color: var(--accent, #52796f);
    box-shadow: 0 0 0 3px var(--accent-ring, rgba(82,121,111,0.12)),
                0 6px 18px rgba(53,79,82,0.08);
  }
  .stat-card.is-active::before { opacity: 1; height: 3px; }

  .stat-card-row {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 0.55rem;
    margin-bottom: 0.5rem;
  }
  .stat-label {
    font-size: 0.58rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #84a98c;
    margin: 0;
    line-height: 1.4;
  }
  .stat-icon-tile {
    width: 30px; height: 30px;
    border-radius: 8px;
    background: var(--accent-bg, rgba(132,169,140,0.14));
    border: 1px solid var(--accent-border, rgba(132,169,140,0.22));
    color: var(--accent-text, #354f52);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .stat-value {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.95rem; font-weight: 400;
    color: #2f3e46;
    letter-spacing: -0.02em;
    line-height: 1.05;
    margin: 0;
  }

  /* Stat accent variants */
  .stat-card.is-employees {
    --accent: #52796f;
    --accent-bg: rgba(82,121,111,0.12);
    --accent-border: rgba(82,121,111,0.22);
    --accent-text: #354f52;
    --accent-ring: rgba(82,121,111,0.14);
  }
  .stat-card.is-clockins {
    --accent: #84a98c;
    --accent-bg: rgba(132,169,140,0.16);
    --accent-border: rgba(132,169,140,0.26);
    --accent-text: #2f4a32;
    --accent-ring: rgba(132,169,140,0.16);
  }
  .stat-card.is-absent {
    --accent: #c0756a;
    --accent-bg: rgba(192,117,106,0.12);
    --accent-border: rgba(192,117,106,0.22);
    --accent-text: #7a3028;
    --accent-ring: rgba(192,117,106,0.14);
  }
  .stat-card.is-leave {
    --accent: #b89758;
    --accent-bg: rgba(184,151,88,0.14);
    --accent-border: rgba(184,151,88,0.24);
    --accent-text: #6b5524;
    --accent-ring: rgba(184,151,88,0.14);
  }
  .stat-card.is-expense {
    --accent: #6f8c98;
    --accent-bg: rgba(111,140,152,0.14);
    --accent-border: rgba(111,140,152,0.24);
    --accent-text: #4d6975;
    --accent-ring: rgba(111,140,152,0.14);
  }
  .stat-card.is-active-stat {
    --accent: #7a668c;
    --accent-bg: rgba(122,102,140,0.12);
    --accent-border: rgba(122,102,140,0.22);
    --accent-text: #4a3d5a;
    --accent-ring: rgba(122,102,140,0.14);
  }

  /* ══════════════════════════════════════
     PANELS (Map + Clock In/Out)
  ══════════════════════════════════════ */
  .panel-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @media (min-width: 1280px) {
    .panel-grid { grid-template-columns: 2fr 1fr; }
  }
  .panel {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    overflow: hidden;
    width: 100%;
    max-width: 100%;
  }
  .panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid #eaefeb;
    gap: 0.7rem;
    flex-wrap: wrap;
  }
  .panel-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.18rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    line-height: 1.2;
    margin: 0;
    display: flex; align-items: center; gap: 0.5rem;
  }
  .panel-title::before {
    content: '';
    width: 4px; height: 18px;
    border-radius: 2px;
    background: linear-gradient(180deg, #52796f 0%, #84a98c 100%);
  }
  .panel-link {
    background: none; border: none; cursor: pointer;
    color: #52796f;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.7rem; font-weight: 500;
    letter-spacing: 0.04em;
    padding: 0.3rem 0.5rem;
    border-radius: 6px;
    display: inline-flex; align-items: center; gap: 0.3rem;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .panel-link:hover {
    color: #354f52;
    background: rgba(82,121,111,0.08);
  }
  .panel-body {
    padding: 1rem;
  }

  /* Map iframe wrapper */
  .map-frame-wrap {
    position: relative;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #eaefeb;
  }
  .map-frame {
    width: 100%;
    height: 320px;
    border: none;
    display: block;
  }
  .map-empty {
    height: 320px;
    border-radius: 10px;
    border: 1.5px dashed #d4ddd6;
    background: #fafbfa;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0.5rem;
    color: #84a98c;
    font-size: 0.78rem;
    font-weight: 400;
    text-align: center;
    padding: 1rem;
  }
  .map-empty-icon {
    width: 42px; height: 42px;
    border-radius: 50%;
    background: rgba(132,169,140,0.14);
    display: flex; align-items: center; justify-content: center;
    color: #84a98c;
    margin-bottom: 0.3rem;
  }

  /* Clock In/Out panel */
  .clock-status-block {
    background: linear-gradient(135deg, #fafbfa, #f0f5f2);
    border: 1px solid #eaefeb;
    border-radius: 10px;
    padding: 0.85rem 1rem;
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.6rem;
    margin-bottom: 0.95rem;
  }
  .clock-status-key {
    font-size: 0.55rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #84a98c;
    margin: 0 0 0.2rem;
  }
  .clock-status-pill {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.78rem; font-weight: 600;
    color: var(--status-color, #354f52);
    text-transform: capitalize;
  }
  .clock-status-pill.is-in { --status-color: #2f4a32; }
  .clock-status-pill.is-break { --status-color: #6b5524; }
  .clock-status-pill.is-out { --status-color: #7a8e84; }
  .clock-status-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--status-color, #84a98c);
    position: relative;
  }
  .clock-status-dot::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: var(--status-color, #84a98c);
    opacity: 0.4;
    animation: pulse-ring 2s ease-in-out infinite;
  }
  .clock-status-dot.is-out::before { animation: none; opacity: 0.2; }

  .clock-actions {
    display: flex; flex-direction: column;
    gap: 0.55rem;
  }
  .clock-message {
    margin-top: 0.85rem;
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
    border: 1px solid var(--msg-border, #eaefeb);
    background: var(--msg-bg, #fafbfa);
    color: var(--msg-text, #354f52);
    font-size: 0.74rem;
    font-weight: 400;
    line-height: 1.5;
    display: flex; align-items: flex-start;
    gap: 0.4rem;
  }
  .clock-message.is-error {
    --msg-bg: rgba(192,117,106,0.08);
    --msg-border: rgba(192,117,106,0.22);
    --msg-text: #7a3028;
  }
  .clock-message.is-success {
    --msg-bg: rgba(82,121,111,0.08);
    --msg-border: rgba(82,121,111,0.22);
    --msg-text: #2f4a32;
  }
  .clock-msg-dot {
    flex-shrink: 0;
    margin-top: 5px;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--msg-text, #354f52);
  }

  .upload-spinner {
    width: 13px; height: 13px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* ══════════════════════════════════════
     ERROR BANNER
  ══════════════════════════════════════ */
  .error-banner {
    border-left: 3px solid #c0756a;
    background: linear-gradient(135deg, #fdf3f2, #fdecea);
    border-radius: 9px;
    padding: 0.85rem 1rem;
    font-size: 0.82rem;
    color: #7a3028;
    display: flex; align-items: flex-start; gap: 0.5rem;
  }
  .error-banner-dot {
    flex-shrink: 0;
    margin-top: 6px;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #c0756a;
  }

  /* ══════════════════════════════════════
     LOADING / SKELETON
  ══════════════════════════════════════ */
  .skeleton-shell {
    display: flex; flex-direction: column;
    gap: 1.25rem;
  }
  .skeleton-line {
    height: 14px;
    border-radius: 6px;
    background: rgba(132,169,140,0.18);
    animation: pulse-skeleton 1.5s ease-in-out infinite;
  }
  .skeleton-stat {
    height: 96px;
    border-radius: 12px;
    background: rgba(132,169,140,0.14);
    border: 1.5px solid #eaefeb;
    animation: pulse-skeleton 1.5s ease-in-out infinite;
  }
  .skeleton-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.65rem;
  }
  @media (min-width: 768px) {
    .skeleton-row { grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
  }
  @media (min-width: 1280px) {
    .skeleton-row { grid-template-columns: repeat(6, 1fr); gap: 0.85rem; }
  }

  /* ══════════════════════════════════════
     COMPLIANCE INSIGHTS WRAPPER
     (Wraps the imported child component to give it the same surface treatment)
  ══════════════════════════════════════ */
  .insights-wrap {
    border-radius: 12px;
    overflow: hidden;
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1023px) {
    .cd-root { padding: 1.25rem; }
    .header-title { font-size: 1.5rem; }
    .stat-value { font-size: 1.75rem; }
  }
  @media (max-width: 767px) {
    .cd-root { padding: 0.85rem; }
    .header-title { font-size: 1.3rem; }
    .header-icon-wrap { width: 34px; height: 34px; border-radius: 9px; }
    .stat-card { padding: 0.7rem 0.8rem; }
    .stat-value { font-size: 1.5rem; }
    .map-frame { height: 260px; }
    .map-empty { height: 260px; }
  }
  @media (max-width: 479px) {
    .cd-root { padding: 0.65rem; }
    .header-title { font-size: 1.2rem; }
    .stats-grid { gap: 0.55rem; }
  }
`;

const StatCard = ({ title, value, icon: Icon, variant, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`stat-card ${variant} ${active ? 'is-active' : ''}`}
  >
    <div className="stat-card-row">
      <p className="stat-label">{title}</p>
      <span className="stat-icon-tile">
        <Icon style={{ width: 14, height: 14 }} />
      </span>
    </div>
    <p className="stat-value">{value}</p>
  </button>
);

export default function ComplianceDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);
  const [error, setError] = useState('');
  const [clockMessage, setClockMessage] = useState('');
  const [selectedInsight, setSelectedInsight] = useState('employees');

  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [pendingExpenseTotal, setPendingExpenseTotal] = useState(0);
  const [clockStatus, setClockStatus] = useState({ allEmployees: [], clockedIn: [] });
  const [attendanceData, setAttendanceData] = useState({ summary: { absent: 0 }, absentEmployees: [] });

  const [myClockStatus, setMyClockStatus] = useState('not-clocked-in');
  const [geoLocation, setGeoLocation] = useState(null);

  const captureLocation = useCallback(async () => {
    if (!navigator.geolocation) return null;

    try {
      const coords = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const locationData = {
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
        accuracy: coords.coords.accuracy
      };
      setGeoLocation(locationData);
      return locationData;
    } catch {
      return null;
    }
  }, []);

  const fetchAll = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [employeesRes, pendingLeavesRes, pendingExpensesRes, clockRes, attendanceRes, userClockRes] = await Promise.all([
        axios.get('/api/employees?includeAdmins=true'),
        axios.get('/api/leave/pending-requests'),
        axios.get('/api/expenses/approvals?status=pending&limit=500'),
        getClockStatus({ includeAdmins: true }),
        axios.get(buildApiUrl('/clock/attendance-status')),
        getUserClockStatus().catch(() => null)
      ]);

      const employees = Array.isArray(employeesRes?.data)
        ? employeesRes.data
        : Array.isArray(employeesRes?.data?.data)
          ? employeesRes.data.data
          : [];

      const leaves = Array.isArray(pendingLeavesRes?.data?.data)
        ? pendingLeavesRes.data.data
        : Array.isArray(pendingLeavesRes?.data)
          ? pendingLeavesRes.data
          : [];

      const expenses = Array.isArray(pendingExpensesRes?.data?.expenses)
        ? pendingExpensesRes.data.expenses
        : Array.isArray(pendingExpensesRes?.data?.data)
          ? pendingExpensesRes.data.data
          : [];

      setTeamMembers(employees);
      setPendingLeaves(leaves);
      setPendingExpenses(expenses);
      setPendingExpenseTotal(Number(pendingExpensesRes?.data?.pagination?.total || expenses.length || 0));
      setClockStatus({
        allEmployees: clockRes?.allEmployees || clockRes?.data || [],
        clockedIn: clockRes?.clockedIn || []
      });
      setAttendanceData(attendanceRes?.data?.data || { summary: { absent: 0 }, absentEmployees: [] });

      const status = String(userClockRes?.data?.status || 'not-clocked-in').replace('_', '-');
      setMyClockStatus(status);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    captureLocation();
  }, [fetchAll, captureLocation]);

  const stats = useMemo(() => {
    const activeMembers = teamMembers.filter(m => m.isActive !== false && m.status !== 'Terminated').length;

    return {
      employees: teamMembers.length,
      clockIns: clockStatus.clockedIn.length,
      absentees: attendanceData?.summary?.absent || 0,
      leaveApprovals: pendingLeaves.length,
      expenseApprovals: pendingExpenseTotal,
      active: activeMembers
    };
  }, [teamMembers, clockStatus, attendanceData, pendingLeaves, pendingExpenseTotal]);

  const mapSrc = useMemo(() => {
    if (!geoLocation?.latitude || !geoLocation?.longitude) return '';
    const lat = Number(geoLocation.latitude);
    const lng = Number(geoLocation.longitude);
    const minLng = lng - 0.01;
    const minLat = lat - 0.01;
    const maxLng = lng + 0.01;
    const maxLat = lat + 0.01;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lng}`;
  }, [geoLocation]);

  const handleQuickClockIn = useCallback(async () => {
    setClockMessage('');
    if (myClockStatus === 'clocked-in' || myClockStatus === 'on-break') {
      setClockMessage('You are already clocked in.');
      return;
    }

    setClockingIn(true);
    try {
      const locationData = (await captureLocation()) || geoLocation;
      await userClockIn({
        workType: 'Office',
        location: 'Dashboard Quick Clock In',
        latitude: locationData?.latitude,
        longitude: locationData?.longitude,
        accuracy: locationData?.accuracy
      });

      setClockMessage('Clock in successful.');
      await fetchAll({ silent: true });
    } catch (err) {
      setClockMessage(err?.message || 'Clock in failed.');
    } finally {
      setClockingIn(false);
    }
  }, [myClockStatus, captureLocation, geoLocation, fetchAll]);

  const handleQuickClockOut = useCallback(async () => {
    setClockMessage('');
    if (myClockStatus !== 'clocked-in' && myClockStatus !== 'on-break') {
      setClockMessage('You are not currently clocked in.');
      return;
    }

    setClockingIn(true);
    try {
      const locationData = (await captureLocation()) || geoLocation;
      await userClockOut({
        latitude: locationData?.latitude,
        longitude: locationData?.longitude,
        accuracy: locationData?.accuracy
      });

      setClockMessage('Clock out successful.');
      await fetchAll({ silent: true });
    } catch (err) {
      setClockMessage(err?.message || 'Clock out failed.');
    } finally {
      setClockingIn(false);
    }
  }, [myClockStatus, captureLocation, geoLocation, fetchAll]);

  const cards = [
    { key: 'employees', title: 'All Employees', value: stats.employees, icon: UsersIcon, variant: 'is-employees' },
    { key: 'clockins', title: 'Clock Ins', value: stats.clockIns, icon: ClockIcon, variant: 'is-clockins' },
    { key: 'absentees', title: 'Absentees', value: stats.absentees, icon: ExclamationTriangleIcon, variant: 'is-absent' },
    { key: 'leave-approvals', title: 'Leave Approvals', value: stats.leaveApprovals, icon: CalendarDaysIcon, variant: 'is-leave' },
    { key: 'expense-approvals', title: 'Expense Approvals', value: stats.expenseApprovals, icon: CurrencyDollarIcon, variant: 'is-expense' },
    { key: 'active', title: 'Active', value: stats.active, icon: CheckCircleIcon, variant: 'is-active-stat' }
  ];

  const formatClockStatus = (status) => {
    if (!status) return 'Not clocked in';
    return status.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getClockStatusVariant = (status) => {
    if (status === 'clocked-in') return 'is-in';
    if (status === 'on-break') return 'is-break';
    return 'is-out';
  };

  const isClockedIn = myClockStatus === 'clocked-in' || myClockStatus === 'on-break';

  // Determine clock message tone
  const clockMessageVariant = (() => {
    if (!clockMessage) return '';
    const lower = clockMessage.toLowerCase();
    if (lower.includes('successful')) return 'is-success';
    if (lower.includes('fail') || lower.includes('already') || lower.includes('not currently')) return 'is-error';
    return '';
  })();

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="cd-root">
          <div className="cd-shell">
            <div className="skeleton-shell">
              <div className="skeleton-line" style={{ width: '40%', height: 28 }} />
              <div className="skeleton-row">
                {[...Array(6)].map((_, i) => <div key={i} className="skeleton-stat" />)}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="cd-root">
        <div className="cd-shell">

          {/* ── Page Header ── */}
          <div className="page-header anim-fade-up">
            <div className="header-block">
              <div className="header-icon-wrap">
                <svg style={{ width: 18, height: 18, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="header-eyebrow">Overview · Compliance</p>
                <h1 className="header-title">Admin Dashboard</h1>
                <p className="header-subtitle">Click any card to view employees and approvals.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchAll({ silent: true })}
              disabled={refreshing}
              className="btn btn-secondary"
            >
              <ArrowPathIcon
                style={{ width: 14, height: 14 }}
                className={refreshing ? 'spin-icon' : ''}
              />
              <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
              <style>{`.spin-icon { animation: spin 0.8s linear infinite; }`}</style>
            </button>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div className="error-banner">
              <span className="error-banner-dot"></span>
              <span>{error}</span>
            </div>
          )}

          {/* ── Stat cards ── */}
          <div className="stats-grid anim-fade-up delay-100">
            {cards.map(card => (
              <StatCard
                key={card.key}
                title={card.title}
                value={card.value}
                icon={card.icon}
                variant={card.variant}
                active={selectedInsight === card.key}
                onClick={() => setSelectedInsight(card.key)}
              />
            ))}
          </div>

          {/* ── Compliance Insights (passthrough) ── */}
          <div className="insights-wrap anim-fade-up delay-200">
            <ComplianceInsights
              selectedInsight={selectedInsight}
              teamMembers={teamMembers}
              clockedInEmployees={clockStatus.clockedIn}
              absentEmployees={attendanceData.absentEmployees || []}
              pendingLeaves={pendingLeaves}
              pendingExpenses={pendingExpenses}
            />
          </div>

          {/* ── Map + Clock In/Out panels ── */}
          <div className="panel-grid anim-fade-up delay-300">
            {/* Map panel */}
            <section className="panel">
              <div className="panel-header">
                <h2 className="panel-title">Map</h2>
                <button
                  type="button"
                  onClick={captureLocation}
                  className="panel-link"
                >
                  <svg style={{ width: 11, height: 11 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Update location
                </button>
              </div>
              <div className="panel-body">
                {mapSrc ? (
                  <div className="map-frame-wrap">
                    <iframe
                      title="Current location map"
                      src={mapSrc}
                      className="map-frame"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="map-empty">
                    <span className="map-empty-icon">
                      <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </span>
                    <span>Location unavailable.</span>
                    <span style={{ fontSize: '0.7rem', color: '#a0aea4' }}>
                      Enable browser location to show map.
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Clock In/Out panel */}
            <section className="panel">
              <div className="panel-header">
                <h2 className="panel-title">Clock In / Out</h2>
              </div>
              <div className="panel-body">
                <div className="clock-status-block">
                  <div>
                    <p className="clock-status-key">Current Status</p>
                    <p className={`clock-status-pill ${getClockStatusVariant(myClockStatus)}`}>
                      <span className={`clock-status-dot ${myClockStatus === 'clocked-out' || myClockStatus === 'not-clocked-in' ? 'is-out' : ''}`}></span>
                      {formatClockStatus(myClockStatus)}
                    </p>
                  </div>
                </div>

                <div className="clock-actions">
                  <button
                    type="button"
                    onClick={handleQuickClockIn}
                    disabled={clockingIn || isClockedIn}
                    className="btn btn-success btn-block"
                  >
                    {clockingIn ? (
                      <>
                        <div className="upload-spinner"></div>
                        <span>Processing…</span>
                      </>
                    ) : (
                      <>
                        <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Clock In Now
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickClockOut}
                    disabled={clockingIn || !isClockedIn}
                    className="btn btn-danger btn-block"
                  >
                    {clockingIn ? (
                      <>
                        <div className="upload-spinner"></div>
                        <span>Processing…</span>
                      </>
                    ) : (
                      <>
                        <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Clock Out Now
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/clock-ins')}
                    className="btn btn-secondary btn-block"
                  >
                    Open Full Clock In Panel
                    <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>

                {clockMessage && (
                  <div className={`clock-message ${clockMessageVariant}`}>
                    <span className="clock-msg-dot"></span>
                    <span>{clockMessage}</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}