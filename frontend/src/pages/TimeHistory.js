import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { buildApiUrl } from '../utils/apiConfig';
import { toast, ToastContainer } from 'react-toastify';
import { DatePicker } from '../components/ui/date-picker';
import MUITimePicker from '../components/MUITimePicker';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isBetween from 'dayjs/plugin/isBetween';
import 'react-toastify/dist/ReactToastify.css';
import { getTimeEntries, exportTimeEntries } from '../utils/clockApi';
import { assignShift } from '../utils/rotaApi';
import axios from 'axios';
import LoadingScreen from '../components/LoadingScreen';
import ConfirmDialog from '../components/ConfirmDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .th-root {
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
  .th-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
  }
  .th-shell {
    position: relative; z-index: 1;
    max-width: 100%;
    margin: 0 auto;
    min-width: 0;
  }

  /* ── Keyframes ── */
  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse-ring {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50%      { opacity: 1; transform: scale(1.25); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .anim-fade-up { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-fade-in { animation: fadeIn 0.3s ease both; }
  .delay-100 { animation-delay: 0.10s; }
  .delay-200 { animation-delay: 0.20s; }
  .delay-300 { animation-delay: 0.30s; }

  /* ══════════════════════════════════════
     PAGE HEADER
  ══════════════════════════════════════ */
  .header-row {
    display: flex; flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }
  @media (min-width: 768px) {
    .header-row {
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
    font-size: 1.6rem; color: #2f3e46; line-height: 1.15; letter-spacing: -0.02em;
    margin: 0;
  }
  .header-meta {
    font-size: 0.72rem; color: #7a8e84; font-weight: 300;
    margin: 0.3rem 0 0;
    display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
  }
  .live-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #84a98c;
    animation: pulse-ring 2.5s ease-in-out infinite;
    flex-shrink: 0;
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
    display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem;
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
    box-shadow: none; cursor: not-allowed;
    transform: none;
  }
  .btn-success {
    background: linear-gradient(135deg, #52796f 0%, #6b8e7f 100%);
    color: #fff;
    box-shadow: 0 3px 12px rgba(82,121,111,0.22);
  }
  .btn-success:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 6px 18px rgba(82,121,111,0.3);
  }
  .btn-success:disabled {
    background: #d4ddd6; color: #8fa99a;
    box-shadow: none; cursor: not-allowed;
    transform: none;
  }
  .btn-danger {
    background: linear-gradient(135deg, #a35446 0%, #b85c50 100%);
    color: #fff;
    box-shadow: 0 3px 12px rgba(163,84,70,0.22);
  }
  .btn-danger:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 6px 18px rgba(163,84,70,0.3);
  }
  .btn-secondary {
    background: #fff; color: #354f52;
    border: 1px solid #d4ddd6;
  }
  .btn-secondary:hover:not(:disabled) {
    background: #f0f5f2; border-color: #84a98c; color: #2f3e46;
  }

  /* ══════════════════════════════════════
     FILTER BAR
  ══════════════════════════════════════ */
  .filter-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 1rem 1.1rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
  }
  .filter-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.85rem;
  }
  @media (min-width: 640px) { .filter-grid { grid-template-columns: 1fr 1fr; } }
  @media (min-width: 1024px) { .filter-grid { grid-template-columns: repeat(4, 1fr); } }

  .field-label {
    display: block;
    font-size: 0.62rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #52796f;
    margin-bottom: 0.4rem;
  }
  .text-input {
    width: 100%;
    padding: 0.5rem 0.85rem 0.5rem 2.1rem;
    border: 1.5px solid #d4ddd6;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem; color: #2f3e46;
    background: #fff;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    min-height: 34px;
  }
  .text-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .text-input.no-icon { padding-left: 0.85rem; }
  .input-wrap { position: relative; }
  .input-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%);
    color: #84a98c;
    pointer-events: none;
    display: flex; align-items: center;
  }

  /* ══════════════════════════════════════
     SELECTION BANNER
  ══════════════════════════════════════ */
  .selection-banner {
    margin-bottom: 1rem;
    border-left: 3px solid #52796f;
    background: linear-gradient(135deg, #f0f5f2, #eaf2ec);
    border-radius: 8px;
    padding: 0.7rem 0.95rem;
    display: flex; flex-direction: column;
    gap: 0.6rem;
  }
  @media (min-width: 640px) {
    .selection-banner {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
  }
  .selection-text {
    font-size: 0.78rem; color: #354f52; font-weight: 500;
    margin: 0;
  }
  .selection-text strong {
    font-weight: 700; color: #2f3e46;
  }
  .selection-actions {
    display: flex; gap: 0.5rem; flex-wrap: wrap;
  }

  /* ══════════════════════════════════════
     TABLE (Desktop / Tablet)
  ══════════════════════════════════════ */
  .table-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    width: 100%;
    max-width: 100%;
  }
  .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    width: 100%;
    max-width: 100%;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'DM Sans', sans-serif;
    table-layout: auto;
  }
  .data-table thead {
    background: #fafbfa;
    border-bottom: 1px solid #eaefeb;
  }
  .data-table th {
    padding: 0.7rem 0.7rem;
    text-align: left;
    font-size: 0.58rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #84a98c;
    white-space: nowrap;
  }
  .data-table th.is-checkbox { width: 40px; }
  .data-table tbody tr {
    border-bottom: 1px solid #eaefeb;
    transition: background 0.15s;
  }
  .data-table tbody tr:last-child { border-bottom: none; }
  .data-table tbody tr:hover { background: #fafbfa; }
  .data-table tbody tr.is-selected {
    background: rgba(132,169,140,0.08);
  }
  .data-table tbody tr.is-selected:hover { background: rgba(132,169,140,0.12); }
  .data-table td {
    padding: 0.7rem 0.7rem;
    font-size: 0.76rem;
    color: #2f3e46;
    vertical-align: middle;
  }
  .td-time-stack {
    display: flex; flex-direction: column;
    gap: 0.15rem;
  }
  .td-time-primary { font-weight: 500; color: #2f3e46; }
  .td-time-secondary { font-size: 0.66rem; color: #8fa99a; font-weight: 400; }
  .td-strong { font-weight: 600; color: #2f3e46; }
  .td-muted { color: #7a8e84; }

  /* ── Custom checkbox ── */
  .checkbox {
    appearance: none;
    -webkit-appearance: none;
    width: 16px; height: 16px;
    border: 1.5px solid #d4ddd6;
    border-radius: 4px;
    cursor: pointer;
    position: relative;
    transition: all 0.15s;
    background: #fff;
    flex-shrink: 0;
    margin: 0;
  }
  .checkbox:hover { border-color: #84a98c; }
  .checkbox:checked {
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    border-color: #354f52;
  }
  .checkbox:checked::after {
    content: '';
    position: absolute;
    left: 4px; top: 1px;
    width: 5px; height: 9px;
    border: solid #cad2c5;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  .checkbox:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.18);
  }

  /* ── Overtime pill ── */
  .overtime-pill {
    display: inline-block;
    padding: 0.18rem 0.55rem;
    border-radius: 999px;
    background: rgba(184,151,88,0.15);
    color: #6b5524;
    font-size: 0.7rem;
    font-weight: 600;
    border: 1px solid rgba(184,151,88,0.25);
    letter-spacing: 0.02em;
  }

  /* ── Break stack ── */
  .break-stack {
    display: flex; flex-direction: column; gap: 0.15rem;
    font-size: 0.72rem;
    color: #354f52;
  }
  .break-line { white-space: nowrap; }

  /* Hide low-priority columns at narrower widths */
  @media (max-width: 1199px) {
    .col-overtime { display: none; }
  }
  @media (max-width: 1023px) {
    .col-shifthours { display: none; }
  }
  @media (max-width: 879px) {
    .col-clockout { display: none; }
  }
  @media (max-width: 759px) {
    .col-clockin { display: none; }
  }
  @media (max-width: 639px) {
    .table-card { display: none; }
  }
  @media (min-width: 640px) {
    .mobile-cards-wrap { display: none; }
  }

  /* ══════════════════════════════════════
     MOBILE CARDS (< 640px)
  ══════════════════════════════════════ */
  .mobile-cards-wrap { display: flex; flex-direction: column; gap: 0.7rem; }
  .mobile-card {
    background: #fff;
    border: 1.5px solid #eaefeb;
    border-radius: 12px;
    padding: 0.85rem 0.9rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    transition: border-color 0.2s, background 0.2s;
  }
  .mobile-card.is-selected {
    border-color: #52796f;
    background: rgba(132,169,140,0.06);
    box-shadow: 0 0 0 2px rgba(132,169,140,0.15);
  }
  .mobile-card-head {
    display: flex; align-items: flex-start; gap: 0.7rem;
    margin-bottom: 0.7rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid #eaefeb;
  }
  .mobile-card-name {
    font-size: 0.85rem; font-weight: 600;
    color: #2f3e46; line-height: 1.3;
    margin: 0;
  }
  .mobile-card-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.65rem 0.85rem;
  }
  .mobile-card-cell-full { grid-column: 1 / -1; }
  .mobile-card-key {
    font-size: 0.58rem; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #84a98c;
    margin: 0 0 0.18rem;
  }
  .mobile-card-val {
    font-size: 0.78rem; color: #2f3e46; font-weight: 500;
    line-height: 1.35;
  }
  .mobile-card-val-muted {
    font-size: 0.65rem; color: #8fa99a; font-weight: 400;
    margin-top: 0.1rem;
  }

  /* ══════════════════════════════════════
     EMPTY STATE
  ══════════════════════════════════════ */
  .empty-state {
    padding: 3.25rem 1rem;
    text-align: center;
  }
  .empty-icon-wrap {
    width: 60px; height: 60px;
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
  .empty-text {
    font-size: 0.8rem; color: #7a8e84; font-weight: 300;
    margin: 0;
  }

  /* ══════════════════════════════════════
     MODALS
  ══════════════════════════════════════ */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(47,62,70,0.65);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
    z-index: 9999;
    animation: fadeIn 0.2s ease;
  }
  .modal-box {
    background: #fff;
    border-radius: 16px;
    width: 100%; max-width: 600px;
    max-height: 90vh;
    overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 32px 64px rgba(47,62,70,0.25);
    animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1);
  }
  .modal-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 1rem;
    padding: 1.15rem 1.4rem;
    border-bottom: 1px solid #eaefeb;
    flex-shrink: 0;
  }
  .modal-eyebrow {
    font-size: 0.6rem; font-weight: 500;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: #84a98c; margin: 0;
  }
  .modal-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.35rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0.15rem 0 0;
  }
  .modal-subtitle {
    font-size: 0.75rem; color: #7a8e84; font-weight: 400;
    margin: 0.25rem 0 0;
  }
  .modal-close {
    background: none; border: none; cursor: pointer;
    color: #84a98c;
    width: 34px; height: 34px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .modal-close:hover { color: #2f3e46; background: #f0f5f2; }
  .modal-body { padding: 1.25rem 1.4rem; overflow-y: auto; flex: 1; -webkit-overflow-scrolling: touch; }
  .modal-footer {
    display: flex; justify-content: flex-end; gap: 0.5rem;
    padding: 0.85rem 1.4rem;
    border-top: 1px solid #eaefeb;
    background: #fafbfa;
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  .form-field { margin-bottom: 1rem; }
  .form-field:last-child { margin-bottom: 0; }
  .field-required { color: #b85c50; margin-left: 0.15rem; }
  .form-grid-2 {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
  }
  @media (max-width: 519px) {
    .form-grid-2 { grid-template-columns: 1fr; }
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1023px) {
    .th-root { padding: 1.25rem; }
    .header-title { font-size: 1.45rem; }
  }
  @media (max-width: 767px) {
    .th-root { padding: 0.85rem; }
    .header-title { font-size: 1.3rem; }
    .header-icon-wrap { width: 34px; height: 34px; border-radius: 9px; }
    .filter-card { padding: 0.85rem; }
    .data-table th { padding: 0.55rem 0.5rem; font-size: 0.55rem; }
    .data-table td { padding: 0.55rem 0.5rem; font-size: 0.72rem; }
    .modal-header, .modal-body { padding-left: 1.1rem; padding-right: 1.1rem; }
    .modal-footer { padding-left: 1.1rem; padding-right: 1.1rem; }
    .selection-actions { width: 100%; }
    .selection-actions .btn { flex: 1; }
  }
  @media (max-width: 479px) {
    .th-root { padding: 0.65rem; }
    .header-title { font-size: 1.2rem; }
    .filter-card { border-radius: 10px; }
    .modal-overlay { padding: 0; align-items: flex-end; }
    .modal-box { border-radius: 18px 18px 0 0; max-height: 92vh; }
    .text-input { font-size: 16px; }
  }
`;

const TimeHistory = () => {
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({
    clockIn: '',
    clockOut: '',
    location: '',
    workType: '',
    breaks: []
  });
  const [filters, setFilters] = useState({
    employeeSearch: '',
    locationSearch: '',
    dateRange: {
      start: getDefaultStartDate(),
      end: new Date().toISOString().split('T')[0]
    }
  });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    location: 'Office',
    workType: 'Regular',
    breakDuration: 60,
    notes: ''
  });

  function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  }

  useEffect(() => {
    fetchTimeEntries();
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateRange]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(
        buildApiUrl('/employees/with-clock-status'),
        { withCredentials: true }
      );

      if (response.data?.success) {
        const employeeList = (response.data.data || [])
          .map(emp => ({
            id: emp._id || emp.id,
            _id: emp._id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            vtid: emp.vtid,
            name: `${emp.firstName} ${emp.lastName}`
          }));

        setEmployees(employeeList);
      }
    } catch (error) {
      console.error('Fetch employees error:', error);
      toast.error('Failed to fetch employees');
    }
  };

  const fetchTimeEntries = async () => {
    setLoading(true);
    try {
      const response = await getTimeEntries(filters.dateRange.start, filters.dateRange.end);
      if (response.success) {
        setTimeEntries(response.data || []);
      } else {
        setTimeEntries([]);
      }
    } catch (error) {
      console.error('Fetch time entries error:', error);
      toast.error('Failed to fetch time entries');
      setTimeEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignShift = async (e) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.startDate || !formData.endDate) {
      toast.warning('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const start = dayjs(formData.startDate);
      const end = dayjs(formData.endDate);
      const dates = [];

      let currentDate = start.startOf('day');
      while (currentDate.isBefore(end) || currentDate.isSame(end)) {
        dates.push(currentDate.format('YYYY-MM-DD'));
        currentDate = currentDate.add(1, 'day');
      }

      const shiftPromises = dates.map(date => {
        const shiftData = {
          ...formData,
          date: date,
          startDate: undefined,
          endDate: undefined
        };
        return assignShift(shiftData);
      });

      const results = await Promise.allSettled(shiftPromises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

      if (successful > 0) {
        toast.success(`Successfully assigned ${successful} shift${successful > 1 ? 's' : ''}`);
      }

      if (failed > 0) {
        toast.warning(`${failed} shift${failed > 1 ? 's' : ''} could not be assigned due to conflicts or errors`);
      }

      setShowAssignModal(false);
      setFormData({
        employeeId: '',
        startDate: '',
        endDate: '',
        startTime: '09:00',
        endTime: '17:00',
        location: 'Office',
        workType: 'Regular',
        breakDuration: 60,
        notes: ''
      });
      fetchTimeEntries();
    } catch (error) {
      console.error('Assign shift error:', error);
      toast.error(error.message || 'Failed to assign shifts');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEntry = (entryId) => {
    setSelectedEntries(prev => {
      const newSelection = prev.includes(entryId)
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId];
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    if (selectedEntries.length === timeEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(timeEntries.map(entry => entry._id));
    }
  };

  const handleEditSelected = () => {
    if (selectedEntries.length !== 1) {
      toast.warning('Please select exactly one entry to edit');
      return;
    }

    const entryToEdit = timeEntries.find(entry => entry._id === selectedEntries[0]);

    if (!entryToEdit) {
      toast.error('Entry not found');
      return;
    }

    setEditingEntry(entryToEdit);
    setEditFormData({
      clockIn: entryToEdit.clockIn || '',
      clockOut: entryToEdit.clockOut || '',
      location: entryToEdit.location || 'Office',
      workType: entryToEdit.workType || 'Regular',
      breaks: entryToEdit.breaks || []
    });
    setShowEditModal(true);
  };

  const handleUpdateEntry = async (e) => {
    e.preventDefault();

    if (!editingEntry) {
      toast.error('No entry selected for editing');
      return;
    }

    try {
      const response = await axios.put(
        buildApiUrl(`/clock/entry/${editingEntry._id}`),
        editFormData,
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success('Time entry updated successfully');
        setShowEditModal(false);
        setEditingEntry(null);
        setSelectedEntries([]);
        fetchTimeEntries();
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update entry');
    }
  };

  const initiateDelete = () => {
    if (selectedEntries.length === 0) {
      toast.warning('Please select entries to delete');
      return;
    }
    setShowDeleteDialog(true);
  };

  const handleDeleteSelected = async () => {
    try {
      const deletePromises = selectedEntries.map(entryId =>
        axios.delete(buildApiUrl(`/clock/entry/${entryId}`), { withCredentials: true })
      );

      await Promise.all(deletePromises);
      toast.success(`Successfully deleted ${selectedEntries.length} ${selectedEntries.length === 1 ? 'entry' : 'entries'}`);
      setSelectedEntries([]);
      fetchTimeEntries();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete entries');
    }
  };

  const handleExportCSV = async () => {
    try {
      const csvData = await exportTimeEntries(filters.dateRange.start, filters.dateRange.end);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `time-entries-${filters.dateRange.start}-to-${filters.dateRange.end}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Time entries exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export');
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      timeZone: "Europe/London",
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const calculateShiftHours = (entry) => {
    if (entry.shiftHours) {
      return `${entry.shiftHours} hrs`;
    }
    if (entry.shiftId && entry.shiftId.startTime && entry.shiftId.endTime) {
      const start = new Date(`2000-01-01T${entry.shiftId.startTime}`);
      const end = new Date(`2000-01-01T${entry.shiftId.endTime}`);
      const hours = ((end - start) / (1000 * 60 * 60)).toFixed(2);
      return `${hours} hrs`;
    }
    return '—';
  };

  const calculateTotalHours = (clockIn, clockOut, breaks = []) => {
    if (!clockIn || !clockOut) return '0 hrs';

    const parseTime = (val) => {
      if (!val) return null;
      if (val instanceof Date) return val;
      if (typeof val === 'string' && val.includes('T')) return new Date(val);
      const [h, m] = val.split(':');
      const d = new Date(2000, 0, 1);
      d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      return d;
    };

    const start = parseTime(clockIn);
    const end = parseTime(clockOut);
    if (!start || !end) return '0 hrs';

    let totalMinutes = (end - start) / (1000 * 60);

    if (breaks && Array.isArray(breaks)) {
      breaks.forEach(b => {
        if (b.duration) {
          totalMinutes -= b.duration;
        } else if (b.breakIn && b.breakOut) {
          const bIn = new Date(b.breakIn);
          const bOut = new Date(b.breakOut);
          totalMinutes -= (bOut - bIn) / (1000 * 60);
        }
      });
    }

    const hours = (totalMinutes / 60).toFixed(2);
    return `${Math.max(0, hours)} hrs`;
  };

  const calculateOvertime = (entry) => {
    if (!entry.clockIn || !entry.clockOut) return '—';

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

    if (!hasShift) return '—';

    const start = new Date(`2000-01-01T${entry.clockIn}`);
    const end = new Date(`2000-01-01T${entry.clockOut}`);
    let totalMinutes = (end - start) / (1000 * 60);

    if (entry.breaks && entry.breaks.length > 0) {
      entry.breaks.forEach(b => { if (b.duration) totalMinutes -= b.duration; });
    }

    const hoursWorked = totalMinutes / 60;
    const overtime = hoursWorked - shiftHours;

    if (overtime > 0) {
      return <span className="overtime-pill">{overtime.toFixed(2)} hrs</span>;
    }

    return '—';
  };

  const filteredEntries = timeEntries.filter(entry => {
    const fullName = entry.employee ? `${entry.employee.firstName} ${entry.employee.lastName}`.toLowerCase() : '';
    const matchesEmployee = filters.employeeSearch === '' || fullName.includes(filters.employeeSearch.toLowerCase());
    const matchesLocation = filters.locationSearch === '' || entry.location?.toLowerCase().includes(filters.locationSearch.toLowerCase());
    return matchesEmployee && matchesLocation;
  });

  const lastUpdated = new Date().toLocaleString("en-GB", {
    timeZone: "Europe/London",
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  });

  if (loading) return <LoadingScreen />;

  return (
    <>
      <style>{styles}</style>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="th-root">
        <div className="th-shell">

          {/* ── Page Header ── */}
          <div className="header-row anim-fade-up">
            <div className="header-block">
              <div className="header-icon-wrap">
                <svg style={{ width: 18, height: 18, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="header-eyebrow">Time Records</p>
                <h1 className="header-title">Time Entry History</h1>
                <p className="header-meta">
                  <span className="live-dot"></span>
                  Last updated <strong style={{ color: '#354f52', fontWeight: 600 }}>{lastUpdated}</strong>
                  <span style={{ color: '#b6c0b9' }}>·</span>
                  <span>UK Time</span>
                </p>
              </div>
            </div>

            <button
              onClick={handleExportCSV}
              className="btn btn-primary"
              type="button"
            >
              <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export to CSV
            </button>
          </div>

          {/* ── Filter Bar ── */}
          <div className="filter-card anim-fade-up delay-100">
            <div className="filter-grid">
              <div>
                <label className="field-label">Filter by employees</label>
                <div className="input-wrap">
                  <span className="input-icon">
                    <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search employees…"
                    value={filters.employeeSearch}
                    onChange={(e) => setFilters(prev => ({ ...prev, employeeSearch: e.target.value }))}
                    className="text-input"
                  />
                </div>
              </div>
              <div>
                <label className="field-label">Filter by locations</label>
                <div className="input-wrap">
                  <span className="input-icon">
                    <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Select location…"
                    value={filters.locationSearch}
                    onChange={(e) => setFilters(prev => ({ ...prev, locationSearch: e.target.value }))}
                    className="text-input"
                  />
                </div>
              </div>
              <div>
                <DatePicker
                  label="Start Date"
                  value={filters.dateRange.start ? dayjs(filters.dateRange.start) : null}
                  onChange={(date) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, start: date ? date.format('YYYY-MM-DD') : '' } }))}
                />
              </div>
              <div>
                <DatePicker
                  label="End Date"
                  value={filters.dateRange.end ? dayjs(filters.dateRange.end) : null}
                  onChange={(date) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, end: date ? date.format('YYYY-MM-DD') : '' } }))}
                  minDate={filters.dateRange.start ? dayjs(filters.dateRange.start) : undefined}
                />
              </div>
            </div>
          </div>

          {/* ── Selection Banner ── */}
          {selectedEntries.length > 0 && (
            <div className="selection-banner anim-fade-up">
              <p className="selection-text">
                <strong>{selectedEntries.length}</strong> {selectedEntries.length === 1 ? 'entry' : 'entries'} selected
              </p>
              <div className="selection-actions">
                <button
                  onClick={handleEditSelected}
                  disabled={selectedEntries.length !== 1}
                  className="btn btn-success"
                  type="button"
                >
                  <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Entry
                </button>
                <button
                  onClick={initiateDelete}
                  className="btn btn-danger"
                  type="button"
                >
                  <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Selected
                </button>
              </div>
            </div>
          )}

          {/* ── Mobile Cards (visible <640px) ── */}
          <div className="mobile-cards-wrap anim-fade-up delay-200">
            {filteredEntries.length > 0 ? (
              filteredEntries.map((entry, index) => {
                const isSelected = selectedEntries.includes(entry._id);
                return (
                  <div
                    key={entry._id || index}
                    className={`mobile-card ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div className="mobile-card-head">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectEntry(entry._id);
                        }}
                        className="checkbox"
                        style={{ marginTop: 2 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="mobile-card-name">
                          {entry.employee ? `${entry.employee.firstName || ''} ${entry.employee.lastName || ''}`.trim() || 'Unknown' : 'Unknown'}
                        </p>
                        <p className="mobile-card-val-muted">{formatDate(entry.date)}</p>
                      </div>
                    </div>
                    <div className="mobile-card-grid">
                      <div>
                        <p className="mobile-card-key">Clock In</p>
                        <p className="mobile-card-val">{formatTime(entry.clockIn)}</p>
                      </div>
                      <div>
                        <p className="mobile-card-key">Clock Out</p>
                        <p className="mobile-card-val">{formatTime(entry.clockOut)}</p>
                      </div>
                      <div className="mobile-card-cell-full">
                        <p className="mobile-card-key">Breaks</p>
                        <div className="mobile-card-val">
                          {entry.breaks?.length > 0 ? (
                            <div className="break-stack">
                              {entry.breaks.map((b, i) => (
                                <div key={i} className="break-line">
                                  {formatTime(b.breakIn || b.startTime)} – {formatTime(b.breakOut || b.endTime)}
                                </div>
                              ))}
                            </div>
                          ) : 'No breaks'}
                        </div>
                      </div>
                      <div>
                        <p className="mobile-card-key">Shift Hours</p>
                        <p className="mobile-card-val">{calculateShiftHours(entry)}</p>
                      </div>
                      <div>
                        <p className="mobile-card-key">Total Hours</p>
                        <p className="mobile-card-val" style={{ fontWeight: 600 }}>
                          {calculateTotalHours(entry.clockIn, entry.clockOut, entry.breaks)}
                        </p>
                      </div>
                      <div className="mobile-card-cell-full">
                        <p className="mobile-card-key">Overtime</p>
                        <div className="mobile-card-val">{calculateOvertime(entry)}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="table-card">
                <div className="empty-state">
                  <div className="empty-icon-wrap">
                    <svg style={{ width: 28, height: 28, color: '#84a98c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="empty-title">No Time Entries Found</h3>
                  <p className="empty-text">Try adjusting your date range or filters.</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Desktop Table (visible ≥640px) ── */}
          <div className="table-card anim-fade-up delay-200">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="is-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedEntries.length === filteredEntries.length && filteredEntries.length > 0}
                        onChange={handleSelectAll}
                        className="checkbox"
                      />
                    </th>
                    <th>Employee Name</th>
                    <th className="col-clockin">Clock In</th>
                    <th className="col-clockout">Clock Out</th>
                    <th>Breaks</th>
                    <th className="col-shifthours">Shift Hours</th>
                    <th>Total Hours</th>
                    <th className="col-overtime">Overtime</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.length > 0 ? (
                    filteredEntries.map((entry, index) => {
                      const isSelected = selectedEntries.includes(entry._id);
                      return (
                        <tr
                          key={entry._id || index}
                          className={isSelected ? 'is-selected' : ''}
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectEntry(entry._id);
                              }}
                              className="checkbox"
                            />
                          </td>
                          <td>
                            {entry.employee ? `${entry.employee.firstName || ''} ${entry.employee.lastName || ''}`.trim() || 'Unknown' : 'Unknown'}
                          </td>
                          <td className="col-clockin">
                            <div className="td-time-stack">
                              <div className="td-time-primary">{formatTime(entry.clockIn)}</div>
                              <div className="td-time-secondary">{formatDate(entry.date)}</div>
                            </div>
                          </td>
                          <td className="col-clockout">
                            <div className="td-time-stack">
                              <div className="td-time-primary">{formatTime(entry.clockOut)}</div>
                              <div className="td-time-secondary">{formatDate(entry.date)}</div>
                            </div>
                          </td>
                          <td className="td-muted">
                            {entry.breaks?.length > 0 ? (
                              <div className="break-stack">
                                {entry.breaks.map((b, i) => (
                                  <div key={i} className="break-line">
                                    {formatTime(b.breakIn || b.startTime)} – {formatTime(b.breakOut || b.endTime)}
                                  </div>
                                ))}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="td-muted col-shifthours">
                            {calculateShiftHours(entry)}
                          </td>
                          <td className="td-strong">
                            {calculateTotalHours(entry.clockIn, entry.clockOut, entry.breaks)}
                          </td>
                          <td className="col-overtime">
                            {calculateOvertime(entry)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8">
                        <div className="empty-state">
                          <div className="empty-icon-wrap">
                            <svg style={{ width: 28, height: 28, color: '#84a98c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <h3 className="empty-title">No Time Entries Found</h3>
                          <p className="empty-text">Try adjusting your date range or filters.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════
           ASSIGN SHIFT MODAL
      ══════════════════════════════════════ */}
      {showAssignModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAssignModal(false); }}
        >
          <div className="modal-box">
            <div className="modal-header">
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="modal-eyebrow">New Assignment</p>
                <h2 className="modal-title">Assign Shift</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="modal-close"
                aria-label="Close"
              >
                <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAssignShift} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
              <div className="modal-body">
                <div className="form-field">
                  <label className="field-label">
                    Employee <span className="field-required">*</span>
                  </label>
                  <Select value={formData.employeeId} onValueChange={(value) => setFormData({ ...formData, employeeId: value })} required>
                    <SelectTrigger style={{ width: '100%' }}>
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} {emp.vtid ? `(${emp.vtid})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="form-field">
                  <label className="field-label">
                    Date Range <span className="field-required">*</span>
                  </label>
                  <div className="form-grid-2">
                    <div>
                      <DatePicker
                        label="Start Date"
                        required
                        value={formData.startDate ? dayjs(formData.startDate) : null}
                        onChange={(date) => setFormData({ ...formData, startDate: date ? date.format('YYYY-MM-DD') : '' })}
                      />
                    </div>
                    <div>
                      <DatePicker
                        label="End Date"
                        required
                        value={formData.endDate ? dayjs(formData.endDate) : null}
                        onChange={(date) => setFormData({ ...formData, endDate: date ? date.format('YYYY-MM-DD') : '' })}
                        minDate={formData.startDate ? dayjs(formData.startDate) : undefined}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-field">
                  <div className="form-grid-2">
                    <div>
                      <MUITimePicker
                        label="Start Time"
                        value={formData.startTime}
                        onChange={(time) => setFormData({ ...formData, startTime: time ? time.format('HH:mm') : '' })}
                      />
                    </div>
                    <div>
                      <MUITimePicker
                        label="End Time"
                        value={formData.endTime}
                        onChange={(time) => setFormData({ ...formData, endTime: time ? time.format('HH:mm') : '' })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-field">
                  <label className="field-label">Location</label>
                  <Select value={formData.location} onValueChange={(value) => setFormData({ ...formData, location: value })}>
                    <SelectTrigger style={{ width: '100%' }}>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="Office">Work From Office</SelectItem>
                      <SelectItem value="Home">Work From Home</SelectItem>
                      <SelectItem value="Field">Field</SelectItem>
                      <SelectItem value="Client Site">Client Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="form-field">
                  <label className="field-label">Work Type</label>
                  <Select value={formData.workType} onValueChange={(value) => setFormData({ ...formData, workType: value })}>
                    <SelectTrigger style={{ width: '100%' }}>
                      <SelectValue placeholder="Select work type" />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Overtime">Overtime</SelectItem>
                      <SelectItem value="Weekend overtime">Weekend Overtime</SelectItem>
                      <SelectItem value="Client side overtime">Client Side Overtime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Assign Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
           EDIT TIME ENTRY MODAL
      ══════════════════════════════════════ */}
      {showEditModal && editingEntry && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
              setEditingEntry(null);
            }
          }}
        >
          <div className="modal-box">
            <div className="modal-header">
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="modal-eyebrow">Adjust Entry</p>
                <h2 className="modal-title">Edit Time Entry</h2>
                <p className="modal-subtitle">
                  {editingEntry.employee ? `${editingEntry.employee.firstName} ${editingEntry.employee.lastName}` : 'Employee'} · {formatDate(editingEntry.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEntry(null);
                }}
                className="modal-close"
                aria-label="Close"
              >
                <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateEntry} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
              <div className="modal-body">
                <div className="form-field">
                  <div className="form-grid-2">
                    <div>
                      <MUITimePicker
                        label="Clock In"
                        value={editFormData.clockIn || null}
                        onChange={(time) => setEditFormData({ ...editFormData, clockIn: time ? time.format('HH:mm') : '' })}
                      />
                    </div>
                    <div>
                      <MUITimePicker
                        label="Clock Out"
                        value={editFormData.clockOut || null}
                        onChange={(time) => setEditFormData({ ...editFormData, clockOut: time ? time.format('HH:mm') : '' })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-field">
                  <label className="field-label">Location</label>
                  <Select
                    value={editFormData.location}
                    onValueChange={(value) => setEditFormData({ ...editFormData, location: value })}
                  >
                    <SelectTrigger style={{ width: '100%' }}>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="Office">Office</SelectItem>
                      <SelectItem value="Work From Home">Work From Home</SelectItem>
                      <SelectItem value="Client Site">Client Site</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="form-field">
                  <label className="field-label">Work Type</label>
                  <Select
                    value={editFormData.workType}
                    onValueChange={(value) => setEditFormData({ ...editFormData, workType: value })}
                  >
                    <SelectTrigger style={{ width: '100%' }}>
                      <SelectValue placeholder="Select work type" />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Overtime">Overtime</SelectItem>
                      <SelectItem value="Holiday">Holiday</SelectItem>
                      <SelectItem value="Weekend">Weekend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEntry(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Time Entries"
        description={`Are you sure you want to delete ${selectedEntries.length} time ${selectedEntries.length === 1 ? 'entry' : 'entries'}? This action cannot be undone.`}
        onConfirm={handleDeleteSelected}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  );
};

export default TimeHistory;