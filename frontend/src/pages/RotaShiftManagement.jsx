import React, { useState, useEffect } from 'react';
import {
  assignShift,
  assignShiftToTeam,
  getAllShiftAssignments,
  getGroupedShiftAssignments,
  getEmployeeShifts,
  getShiftsByLocation,
  getShiftStatistics,
  updateShiftAssignment,
  deleteShiftAssignment,
  deleteShiftAssignmentGroup,
  requestShiftSwap,
  approveShiftSwap,
  getAllRotasUnfiltered,
  getActiveRotas,
  getOldRotas
} from '../utils/rotaApi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { buildApiUrl } from '../utils/apiConfig';
import LoadingScreen from '../components/LoadingScreen';
import { DatePicker } from '../components/ui/date-picker';
import MUITimePicker from '../components/MUITimePicker';
import ConfirmDialog from '../components/ConfirmDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import LeaveCalendar from '../components/LeaveManagement/LeaveCalendar';
import { formatDateDDMMYY, getShortDayName } from '../utils/dateFormatter';
import { useAuth } from '../context/AuthContext';
import { ADMIN_ROLES } from '../constants/roles';
import dayjs from 'dayjs';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .rota-root {
    font-family: 'DM Sans', sans-serif;
    -webkit-text-size-adjust: 100%;
    background: #f7f8f6;
    min-height: 100vh;
    padding: 2rem;
    position: relative;
  }
  .rota-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
  }
  .rota-shell { position: relative; z-index: 1; max-width: 1600px; margin: 0 auto; }

  /* ── Keyframes ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes drawerSlide {
    from { transform: translateX(20px); opacity: 0; }
    to   { transform: translateX(0); opacity: 1; }
  }

  .anim-fade-up { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-fade-in { animation: fadeIn 0.3s ease both; }
  .delay-100 { animation-delay: 0.10s; }
  .delay-200 { animation-delay: 0.20s; }
  .delay-300 { animation-delay: 0.30s; }

  /* ══════════════════════════════════════
     PAGE HEADER
  ══════════════════════════════════════ */
  .page-header { margin-bottom: 1.5rem; }
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
    margin: 0.25rem 0 0;
  }

  /* ══════════════════════════════════════
     SHARED SURFACES
  ══════════════════════════════════════ */
  .surface {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
  }
  .surface-pad { padding: 1.4rem; }

  /* ══════════════════════════════════════
     STAT CARDS
  ══════════════════════════════════════ */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .stat-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 14px;
    padding: 1.15rem 1.25rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
    position: relative;
    overflow: hidden;
  }
  .stat-card:hover {
    border-color: #84a98c;
    box-shadow: 0 6px 18px rgba(53,79,82,0.08);
    transform: translateY(-1px);
  }
  .stat-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, #84a98c, transparent);
    opacity: 0.6;
  }
  .stat-label {
    font-size: 0.62rem; font-weight: 600;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #84a98c;
    margin: 0 0 0.4rem;
  }
  .stat-value {
    font-family: 'Cormorant Garamond', serif;
    font-size: 2.1rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.02em;
    line-height: 1.1;
    margin: 0;
  }
  .stat-value.is-accent { color: #354f52; }

  /* ══════════════════════════════════════
     ROTA TAB BAR
  ══════════════════════════════════════ */
  .rota-tabs {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 0.4rem;
    margin-bottom: 1.25rem;
    display: inline-flex;
    gap: 0.25rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
  }
  .rota-tab {
    background: transparent;
    border: none;
    padding: 0.55rem 1.1rem;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8rem; font-weight: 500;
    color: #7a8e84;
    cursor: pointer;
    transition: all 0.2s;
    -webkit-tap-highlight-color: transparent;
    white-space: nowrap;
  }
  .rota-tab:hover:not(.is-active) { color: #354f52; background: #f7f8f6; }
  .rota-tab.is-active {
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    color: #cad2c5;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(53,79,82,0.18);
  }

  /* ══════════════════════════════════════
     FILTER BAR
  ══════════════════════════════════════ */
  .filter-card {
    margin-bottom: 1.25rem;
    padding: 1.4rem;
  }
  .filter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .filter-grid > div { min-width: 0; }
  .field-label {
    display: block; font-size: 0.66rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #52796f; margin-bottom: 0.4rem;
  }
  .filter-actions {
    display: flex; gap: 0.6rem; flex-wrap: wrap;
    justify-content: flex-end;
    padding-top: 1rem;
    border-top: 1px solid #eaefeb;
  }

  /* ══════════════════════════════════════
     BUTTONS
  ══════════════════════════════════════ */
  .btn {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem; font-weight: 500;
    letter-spacing: 0.04em;
    border: none; border-radius: 9px;
    cursor: pointer; padding: 0.6rem 1rem;
    display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem;
    transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
    -webkit-tap-highlight-color: transparent;
    white-space: nowrap;
    min-height: 38px;
  }
  .btn-primary {
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    color: #cad2c5;
    box-shadow: 0 3px 12px rgba(53,79,82,0.22);
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(53,79,82,0.3);
  }
  .btn-primary:disabled {
    background: #d4ddd6; color: #8fa99a;
    box-shadow: none; cursor: not-allowed;
  }
  .btn-success {
    background: linear-gradient(135deg, #52796f 0%, #6b8e7f 100%);
    color: #fff;
    box-shadow: 0 3px 12px rgba(82,121,111,0.22);
  }
  .btn-success:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 6px 18px rgba(82,121,111,0.3);
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
  .btn-ghost {
    background: transparent; color: #b85c50;
    border: 1px solid rgba(192,117,106,0.3);
  }
  .btn-ghost:hover { background: rgba(192,117,106,0.08); border-color: #c0756a; }
  .btn-sm { font-size: 0.72rem; padding: 0.42rem 0.75rem; min-height: 32px; }

  /* ══════════════════════════════════════
     TABLE
  ══════════════════════════════════════ */
  .table-card {
    overflow: hidden;
  }
  .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'DM Sans', sans-serif;
  }
  .data-table thead {
    background: #fafbfa;
    border-bottom: 1px solid #eaefeb;
  }
  .data-table th {
    padding: 0.85rem 1rem;
    text-align: left;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #84a98c;
    white-space: nowrap;
  }
  .data-table tbody tr {
    border-bottom: 1px solid #eaefeb;
    cursor: pointer;
    transition: background 0.15s;
  }
  .data-table tbody tr:hover { background: #f7f8f6; }
  .data-table tbody tr:last-child { border-bottom: none; }
  .data-table td {
    padding: 0.95rem 1rem;
    font-size: 0.83rem;
    color: #2f3e46;
    vertical-align: middle;
  }
  .td-index { color: #7a8e84; font-weight: 500; width: 60px; }
  .td-shift-name {
    color: #354f52; font-weight: 600;
  }
  .td-shift-name-link {
    color: #354f52; font-weight: 600;
    border-bottom: 1px dashed transparent;
    transition: border-color 0.2s;
  }
  .data-table tbody tr:hover .td-shift-name-link {
    border-bottom-color: #84a98c;
  }
  .td-muted { color: #7a8e84; font-weight: 400; }

  /* ── Location pill ── */
  .location-pill {
    display: inline-block;
    padding: 0.22rem 0.65rem;
    font-size: 0.68rem; font-weight: 600;
    border-radius: 999px;
    letter-spacing: 0.04em;
  }
  .location-office {
    background: rgba(82,121,111,0.14);
    color: #354f52;
    border: 1px solid rgba(82,121,111,0.2);
  }
  .location-home {
    background: rgba(132,169,140,0.18);
    color: #354f52;
    border: 1px solid rgba(132,169,140,0.25);
  }
  .location-field {
    background: rgba(184,151,88,0.16);
    color: #6b5524;
    border: 1px solid rgba(184,151,88,0.25);
  }
  .location-client {
    background: rgba(122,102,140,0.14);
    color: #4a3d5a;
    border: 1px solid rgba(122,102,140,0.22);
  }
  .location-default {
    background: #eaefeb;
    color: #52796f;
    border: 1px solid #d4ddd6;
  }

  /* ── Action buttons inside table ── */
  .row-actions { display: flex; gap: 0.4rem; }
  .row-action-view {
    padding: 0.3rem 0.7rem;
    border-radius: 6px;
    border: 1px solid #d4ddd6;
    background: #fff;
    color: #354f52;
    font-size: 0.7rem; font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
    -webkit-tap-highlight-color: transparent;
  }
  .row-action-view:hover { background: #f0f5f2; border-color: #84a98c; }
  .row-action-delete {
    padding: 0.3rem 0.7rem;
    border-radius: 6px;
    border: 1px solid rgba(192,117,106,0.3);
    background: #fff;
    color: #b85c50;
    font-size: 0.7rem; font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
    -webkit-tap-highlight-color: transparent;
  }
  .row-action-delete:hover { background: rgba(192,117,106,0.08); border-color: #c0756a; }

  .empty-row td {
    padding: 3rem 1rem; text-align: center;
    color: #7a8e84; font-size: 0.85rem; font-weight: 300;
  }

  /* ══════════════════════════════════════
     PAGINATION
  ══════════════════════════════════════ */
  .pagination-bar {
    padding: 0.95rem 1.4rem;
    border-top: 1px solid #eaefeb;
    display: flex; justify-content: space-between; align-items: center;
    flex-wrap: wrap; gap: 1rem;
    background: #fafbfa;
  }
  .pagination-meta {
    font-size: 0.78rem; color: #7a8e84; font-weight: 400;
  }
  .pagination-controls {
    display: flex; gap: 0.35rem; align-items: center;
  }
  .page-btn {
    background: #fff;
    border: 1px solid #d4ddd6;
    border-radius: 7px;
    padding: 0.4rem 0.8rem;
    font-size: 0.78rem; font-weight: 500;
    color: #354f52;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.15s;
    min-height: 34px;
    -webkit-tap-highlight-color: transparent;
  }
  .page-btn:hover:not(:disabled) {
    background: #f0f5f2; border-color: #84a98c;
  }
  .page-btn:disabled { color: #b6c0b9; cursor: not-allowed; }
  .page-btn.is-active {
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    color: #cad2c5;
    border-color: transparent;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(53,79,82,0.15);
  }
  .page-num-group { display: flex; gap: 0.3rem; flex-wrap: wrap; }

  /* ══════════════════════════════════════
     MODAL — SHIFT DETAILS
  ══════════════════════════════════════ */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(47,62,70,0.65);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
    z-index: 50;
    animation: fadeIn 0.2s ease;
  }
  .modal-box {
    background: #fff;
    border-radius: 16px;
    width: 100%;
    max-width: 920px;
    max-height: 90vh;
    overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 32px 64px rgba(47,62,70,0.25);
    animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1);
  }
  .modal-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #eaefeb;
    flex-shrink: 0;
  }
  .modal-header-block { min-width: 0; flex: 1; }
  .modal-eyebrow {
    font-size: 0.62rem; font-weight: 500;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: #84a98c; margin: 0;
  }
  .modal-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.5rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0.15rem 0 0;
  }
  .modal-subtitle {
    font-size: 0.78rem; color: #7a8e84; font-weight: 400;
    margin: 0.3rem 0 0;
  }
  .modal-close {
    background: none; border: none; cursor: pointer;
    color: #84a98c;
    width: 36px; height: 36px;
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .modal-close:hover { color: #2f3e46; background: #f0f5f2; }

  .modal-body {
    flex: 1; overflow-y: auto;
    padding: 1.4rem 1.5rem;
    background: #f7f8f6;
    -webkit-overflow-scrolling: touch;
  }

  .detail-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 1rem; margin-bottom: 1rem;
  }
  @media (max-width: 767px) {
    .detail-grid { grid-template-columns: 1fr; }
  }
  .detail-panel {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 1.1rem 1.15rem;
  }
  .detail-panel-title {
    font-size: 0.78rem; font-weight: 600;
    color: #354f52; letter-spacing: -0.005em;
    margin: 0 0 0.85rem;
    padding-bottom: 0.55rem;
    border-bottom: 1px solid #eaefeb;
  }
  .detail-rows {
    display: grid;
    grid-template-columns: 130px 1fr;
    gap: 0.65rem 1rem;
    font-size: 0.78rem;
  }
  .detail-key {
    color: #84a98c; font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-size: 0.66rem;
    align-self: center;
  }
  .detail-val {
    color: #2f3e46; font-weight: 500;
  }

  /* ── Mini Calendar ── */
  .mini-cal-wrap {
    display: grid; gap: 0.85rem;
  }
  .mini-cal-month {
    border: 1px solid #eaefeb;
    border-radius: 10px;
    padding: 0.85rem 0.85rem 0.95rem;
    background: #fafbfa;
  }
  .mini-cal-title {
    font-size: 0.78rem; font-weight: 600;
    color: #354f52; letter-spacing: -0.005em;
    text-align: center;
    margin: 0 0 0.7rem;
  }
  .mini-cal-weekdays {
    display: grid; grid-template-columns: repeat(7, 1fr);
    gap: 4px; margin-bottom: 4px;
  }
  .mini-cal-weekday {
    font-size: 0.6rem; font-weight: 600;
    color: #84a98c; letter-spacing: 0.06em;
    text-align: center;
    text-transform: uppercase;
  }
  .mini-cal-grid {
    display: grid; grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }
  .mini-cal-day {
    height: 26px;
    border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.72rem;
    color: #354f52;
    position: relative;
    font-weight: 500;
  }
  .mini-cal-day.is-out { color: #b6c0b9; }
  .mini-cal-day.is-active {
    background: rgba(132,169,140,0.18);
    color: #2f3e46;
    font-weight: 700;
  }
  .mini-cal-day.is-active::after {
    content: '';
    position: absolute;
    bottom: 3px; left: 50%;
    transform: translateX(-50%);
    width: 4px; height: 4px;
    border-radius: 50%;
    background: #52796f;
  }

  /* ── Assigned employee list ── */
  .assigned-panel {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 1.1rem 1.15rem;
  }
  .assigned-head {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 0.85rem;
    padding-bottom: 0.55rem;
    border-bottom: 1px solid #eaefeb;
  }
  .assigned-count {
    font-size: 0.7rem; font-weight: 500;
    color: #84a98c; letter-spacing: 0.05em;
  }
  .assigned-list {
    max-height: 300px; overflow-y: auto;
    display: flex; flex-direction: column; gap: 0.5rem;
    padding-right: 0.25rem;
  }
  .assigned-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.65rem 0.85rem;
    border: 1px solid #eaefeb;
    border-radius: 9px;
    background: #fff;
    gap: 0.85rem;
    transition: border-color 0.2s, background 0.2s;
  }
  .assigned-row:hover {
    border-color: #84a98c;
    background: #fafbfa;
  }
  .assigned-left {
    display: flex; align-items: center; gap: 0.7rem;
    min-width: 0; flex: 1;
  }
  .assigned-avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #354f52 0%, #52796f 60%, #84a98c 100%);
    color: #cad2c5;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.72rem; font-weight: 600;
    flex-shrink: 0;
    border: 2px solid #fff;
    box-shadow: 0 2px 6px rgba(53,79,82,0.15);
  }
  .assigned-info { min-width: 0; }
  .assigned-name {
    font-size: 0.82rem; font-weight: 600;
    color: #2f3e46;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    line-height: 1.3;
  }
  .assigned-email {
    font-size: 0.7rem; color: #7a8e84; font-weight: 400;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    line-height: 1.4;
  }
  .assigned-time {
    font-size: 0.74rem; font-weight: 600;
    color: #354f52;
    flex-shrink: 0;
    letter-spacing: 0.01em;
  }
  .assigned-empty {
    padding: 1.5rem 1rem; text-align: center;
    color: #7a8e84; font-size: 0.8rem; font-weight: 300;
  }

  /* ══════════════════════════════════════
     ASSIGN-SHIFT MODAL (drawer-style)
  ══════════════════════════════════════ */
  .drawer-overlay {
    position: fixed; inset: 0;
    background: rgba(47,62,70,0.65);
    backdrop-filter: blur(4px);
    z-index: 50;
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }
  .assign-modal {
    background: #fff;
    border-radius: 16px;
    width: 100%;
    max-width: 760px;
    max-height: 90vh;
    overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 32px 64px rgba(47,62,70,0.25);
    animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1);
  }
  .assign-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 1rem;
    padding: 1.4rem 1.6rem 1.2rem;
    border-bottom: 1px solid #eaefeb;
    flex-shrink: 0;
  }
  .assign-header-block {
    display: flex; align-items: center; gap: 0.85rem;
    min-width: 0; flex: 1;
  }
  .assign-header-icon {
    width: 40px; height: 40px;
    border-radius: 11px;
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(53,79,82,0.18);
    flex-shrink: 0;
  }

  /* ── Sub-tabs (Employee / Teams) ── */
  .sub-tabs {
    display: inline-flex;
    background: #f7f8f6;
    border: 1px solid #eaefeb;
    border-radius: 10px;
    padding: 0.3rem;
    gap: 0.2rem;
    margin: 0 1.6rem 0.5rem;
  }
  .sub-tab {
    background: transparent;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 7px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem; font-weight: 500;
    color: #7a8e84;
    cursor: pointer;
    display: inline-flex; align-items: center; gap: 0.4rem;
    transition: all 0.2s;
    -webkit-tap-highlight-color: transparent;
  }
  .sub-tab:hover:not(.is-active) { color: #354f52; }
  .sub-tab.is-active {
    background: #fff;
    color: #354f52;
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(47,62,70,0.08);
  }

  .assign-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem 1.6rem 1.5rem;
    -webkit-overflow-scrolling: touch;
  }
  .form-field { margin-bottom: 1.1rem; }
  .field-required { color: #b85c50; margin-left: 0.15rem; }

  .text-input {
    width: 100%;
    padding: 0.7rem 0.95rem;
    border: 1.5px solid #d4ddd6;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem; color: #2f3e46;
    background: #fff;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .text-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .textarea-field {
    width: 100%;
    padding: 0.7rem 0.95rem;
    border: 1.5px solid #d4ddd6;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem; color: #2f3e46;
    background: #fff;
    outline: none;
    resize: vertical;
    min-height: 78px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .textarea-field:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }

  .form-grid-2 {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  @media (max-width: 639px) {
    .form-grid-2 { grid-template-columns: 1fr; }
  }

  .calendar-wrap {
    border: 1px solid #eaefeb;
    border-radius: 10px;
    padding: 0.95rem;
    background: #fafbfa;
  }

  .info-pill-success {
    margin-top: 0.7rem;
    padding: 0.65rem 0.85rem;
    background: linear-gradient(135deg, #f0f5f2, #eaf2ec);
    border: 1px solid rgba(132,169,140,0.25);
    border-left: 3px solid #52796f;
    border-radius: 8px;
    font-size: 0.78rem; color: #354f52; font-weight: 500;
  }
  .info-pill-warn {
    margin-top: 0.55rem;
    padding: 0.65rem 0.85rem;
    background: linear-gradient(135deg, #fdf8ed, #fbf2dd);
    border: 1px solid rgba(184,151,88,0.3);
    border-left: 3px solid #b89758;
    border-radius: 8px;
    font-size: 0.74rem; color: #6b5524; font-weight: 400;
    display: flex; align-items: flex-start; gap: 0.5rem;
    line-height: 1.5;
  }

  .team-members-box {
    margin-top: 0.85rem;
    padding: 0.95rem 1rem;
    background: #fafbfa;
    border: 1px solid #eaefeb;
    border-radius: 10px;
  }
  .team-members-title {
    font-size: 0.72rem; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #52796f;
    margin: 0 0 0.6rem;
  }
  .team-members-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.45rem;
  }
  .team-member-chip {
    padding: 0.45rem 0.75rem;
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 7px;
    font-size: 0.76rem;
    color: #354f52; font-weight: 500;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .assign-footer {
    border-top: 1px solid #eaefeb;
    padding: 0.95rem 1.6rem;
    background: #fafbfa;
    display: flex; justify-content: flex-end; gap: 0.6rem;
    flex-shrink: 0;
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1023px) {
    .rota-root { padding: 1.5rem; }
    .filter-card { padding: 1.1rem; }
  }
  @media (max-width: 767px) {
    .rota-root { padding: 1rem; }
    .page-title { font-size: 1.55rem; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
    .stat-card { padding: 0.95rem 1rem; }
    .stat-value { font-size: 1.7rem; }
    .filter-actions { justify-content: stretch; }
    .filter-actions .btn { flex: 1; min-width: 0; }
    .data-table th, .data-table td { padding: 0.7rem 0.75rem; font-size: 0.78rem; }
    .pagination-bar { flex-direction: column; align-items: stretch; padding: 0.85rem 1rem; }
    .pagination-controls { justify-content: center; }
    .modal-box { max-height: 92vh; }
    .assign-modal { max-height: 92vh; }
    .assign-header, .assign-body, .assign-footer { padding-left: 1.1rem; padding-right: 1.1rem; }
    .sub-tabs { margin: 0 1.1rem 0.5rem; }
    .form-grid-2 { grid-template-columns: 1fr; }
    .detail-rows { grid-template-columns: 100px 1fr; gap: 0.5rem 0.75rem; }
  }
  @media (max-width: 479px) {
    .rota-root { padding: 0.75rem; }
    .page-title { font-size: 1.35rem; }
    .surface, .surface-pad { border-radius: 14px; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .stat-value { font-size: 1.55rem; }
    .rota-tabs { width: 100%; overflow-x: auto; flex-wrap: nowrap; }
    .rota-tab { font-size: 0.74rem; padding: 0.5rem 0.85rem; }
    .text-input, .textarea-field { font-size: 16px; }
    .modal-overlay { padding: 0; align-items: flex-end; }
    .modal-box { border-radius: 20px 20px 0 0; max-height: 92vh; }
    .modal-header, .modal-body { padding-left: 1rem; padding-right: 1rem; }
    .detail-rows { grid-template-columns: 1fr; gap: 0.15rem 0; }
    .detail-key { margin-top: 0.35rem; }
    .drawer-overlay { padding: 0; align-items: flex-end; }
    .assign-modal { border-radius: 20px 20px 0 0; }
    .page-num-group { display: none; }
  }
`;

const RotaShiftManagement = () => {
  const { user } = useAuth();
  const currentRole = (user?.role || '').toString().trim().toLowerCase();
  const canAssignByTeam = ADMIN_ROLES.includes(currentRole);

  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState(null);
  const [showShiftDetails, setShowShiftDetails] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [rotaTab, setRotaTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [assignmentType, setAssignmentType] = useState('employee');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);

  const getInitialFilters = () => {
    try {
      const savedFilters = localStorage.getItem('rotaShiftFilters');
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading filters from localStorage:', error);
    }

    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const defaultFilters = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      employeeId: '',
      location: 'all',
      workType: 'all',
      status: ''
    };
    return defaultFilters;
  };

  const [filters, setFilters] = useState(getInitialFilters);
  const [teamFilter, setTeamFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [shiftNameFilter, setShiftNameFilter] = useState([]);
  const [formData, setFormData] = useState({
    employeeIds: [],
    teamIds: [],
    dateRange: [],
    shiftName: '',
    startTime: '09:00',
    endTime: '17:00',
    location: 'Office',
    workType: 'Regular',
    breakDuration: 60,
    notes: ''
  });

  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function getFriday(date) {
    const monday = getMonday(date);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return friday;
  }

  const getFilteredEmployeesForDropdown = () => {
    if (teamFilter === 'all') return employees;
    const selected = teams.find(t => (t._id || t.id) === teamFilter);
    if (!selected || !selected.members) return employees;

    return employees.filter(emp => {
      const empId = emp.id || emp._id;
      return selected.members.some(memberId => {
        const memberIdStr = typeof memberId === 'object' ? (memberId._id || memberId.id) : memberId;
        return memberIdStr?.toString() === empId?.toString();
      });
    });
  };

  const getFilteredShifts = () => {
    let filtered = [...shifts];

    if (dateRangeFilter !== 'all') {
      const now = new Date();
      let startDate = new Date();

      if (dateRangeFilter === 'last7') startDate.setDate(now.getDate() - 7);
      else if (dateRangeFilter === 'last30') startDate.setDate(now.getDate() - 30);

      filtered = filtered.filter(shift => {
        const shiftStartDate = shift.startDate ? new Date(shift.startDate) : null;
        const shiftEndDate = shift.endDate ? new Date(shift.endDate) : null;
        return (
          (shiftStartDate && shiftStartDate >= startDate && shiftStartDate <= now) ||
          (shiftEndDate && shiftEndDate >= startDate && shiftEndDate <= now)
        );
      });
    }

    if (teamFilter !== 'all') {
      const selected = teams.find(t => (t._id || t.id) === teamFilter);
      if (selected && selected.members) {
        filtered = filtered.filter(shift => {
          const assigned = Array.isArray(shift.assignedEmployees) ? shift.assignedEmployees : [];
          const assignedIds = new Set(assigned.map(a => (a.employeeId || '').toString()));
          return selected.members.some(memberId => {
            const memberIdStr = typeof memberId === 'object' ? (memberId._id || memberId.id) : memberId;
            return memberIdStr && assignedIds.has(memberIdStr.toString());
          });
        });
      }
    }

    if (employeeFilter !== 'all') {
      filtered = filtered.filter(shift => {
        const assigned = Array.isArray(shift.assignedEmployees) ? shift.assignedEmployees : [];
        return assigned.some(a => (a.employeeId || '').toString() === employeeFilter);
      });
    }

    if (Array.isArray(shiftNameFilter) && shiftNameFilter.length > 0) {
      const selected = new Set(shiftNameFilter.map(v => (v || '').toString()));
      filtered = filtered.filter(shift => {
        const name = (shift.shiftName || '').toString();
        return selected.has(name);
      });
    }

    return filtered;
  };

  const formatDateRangeDisplay = (startDate, endDate) => {
    if (!startDate && !endDate) return '-';
    const startStr = startDate ? formatDateDDMMYY(startDate) : '';
    const endStr = endDate ? formatDateDDMMYY(endDate) : '';
    if (startStr && endStr && startStr !== endStr) return `${startStr} → ${endStr}`;
    return startStr || endStr;
  };

  const getEmployeeDisplay = (employee) => {
    const id = (employee?.employeeId || '').toString();
    const fromDirectory = id ? employees.find(e => (e.id || e._id)?.toString() === id) : null;
    const employeeName = employee?.employeeName || (fromDirectory ? `${fromDirectory.firstName} ${fromDirectory.lastName}` : '') || 'Employee';
    const email = employee?.email || fromDirectory?.email || '';
    return { employeeName, email, employeeId: id };
  };

  const MiniCalendar = ({ startDate, endDate }) => {
    const start = startDate ? dayjs(startDate) : null;
    const end = endDate ? dayjs(endDate) : null;

    const months = [];
    if (start && end) {
      const startMonth = start.startOf('month');
      const endMonth = end.startOf('month');
      months.push(startMonth);
      if (!startMonth.isSame(endMonth, 'month')) months.push(endMonth);
    } else if (start) {
      months.push(start.startOf('month'));
    } else {
      months.push(dayjs().startOf('month'));
    }

    const isInRange = (d) => {
      if (!start || !end) return false;
      return (d.isAfter(start, 'day') || d.isSame(start, 'day')) && (d.isBefore(end, 'day') || d.isSame(end, 'day'));
    };

    const buildDays = (month) => {
      const gridStart = month.startOf('month').startOf('week');
      const gridEnd = month.endOf('month').endOf('week');
      const days = [];
      let cur = gridStart;
      while (cur.isBefore(gridEnd) || cur.isSame(gridEnd, 'day')) {
        days.push(cur);
        cur = cur.add(1, 'day');
      }
      return days;
    };

    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
      <div
        className="mini-cal-wrap"
        style={{ gridTemplateColumns: months.length === 2 ? '1fr 1fr' : '1fr' }}
      >
        {months.map((month, mi) => {
          const days = buildDays(month);
          return (
            <div key={mi} className="mini-cal-month">
              <div className="mini-cal-title">{month.format('MMMM YYYY')}</div>
              <div className="mini-cal-weekdays">
                {weekDays.map(wd => (
                  <div key={wd} className="mini-cal-weekday">{wd}</div>
                ))}
              </div>
              <div className="mini-cal-grid">
                {days.map((d, i) => {
                  const inMonth = d.isSame(month, 'month');
                  const active = isInRange(d);
                  const cls = [
                    'mini-cal-day',
                    !inMonth ? 'is-out' : '',
                    active ? 'is-active' : ''
                  ].filter(Boolean).join(' ');
                  return (
                    <div key={i} className={cls}>
                      {d.format('D')}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, filters.employeeId, filters.location, filters.workType, filters.status, rotaTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const employeesResponse = await axios.get(
        buildApiUrl('/employees/with-clock-status'),
        { withCredentials: true }
      );

      const teamsResponse = await axios.get(
        buildApiUrl('/teams'),
        { withCredentials: true }
      );

      const [shiftsRes, statsRes] = await Promise.all([
        getGroupedShiftAssignments({ ...filters, tab: rotaTab }),
        getShiftStatistics(filters.startDate, filters.endDate)
      ]);

      if (teamsResponse.data && teamsResponse.data.success) {
        setTeams(teamsResponse.data.data || []);
      }

      if (shiftsRes.success) {
        setShifts(shiftsRes.data || []);
        setCurrentPage(1);
      } else {
        setShifts([]);
      }
      if (statsRes.success) setStatistics(statsRes.data);

      const employeeList = [];
      const employeeIds = new Set();

      if (employeesResponse.data?.success && employeesResponse.data.data) {
        employeesResponse.data.data.forEach(employee => {
          const idString = employee._id || employee.id;
          if (!idString) return;
          if (employeeIds.has(idString)) return;
          employeeList.push({
            id: idString,
            _id: idString,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            role: employee.role || 'employee',
            vtid: employee.vtid,
            name: `${employee.firstName} ${employee.lastName}`
          });
          employeeIds.add(idString);
        });
      }

      setEmployees(employeeList);
    } catch (error) {
      console.error('Fetch data error:', error);
      toast.error(error.message || 'Failed to load data');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.employeeIds.length === 0 || formData.dateRange.length !== 2) {
      toast.warning('Please select employees and date range');
      return;
    }

    setLoading(true);
    try {
      const start = dayjs(formData.dateRange[0]);
      const end = dayjs(formData.dateRange[1]);
      const startDateStr = start.format('YYYY-MM-DD');
      const endDateStr = end.format('YYYY-MM-DD');
      const groupId = (typeof crypto !== 'undefined' && crypto?.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const dates = getWeekdaysInRange(start, end);

      if (dates.length === 0) {
        toast.warning('No weekdays in selected range. Weekends (Sat/Sun) are mandatory holidays.');
        setLoading(false);
        return;
      }

      const shiftPromises = [];
      for (const employeeId of formData.employeeIds) {
        for (const date of dates) {
          const shiftData = {
            employeeId,
            shiftName: formData.shiftName,
            date: date,
            groupId,
            startDate: startDateStr,
            endDate: endDateStr,
            startTime: formData.startTime,
            endTime: formData.endTime,
            location: formData.location,
            workType: formData.workType,
            breakDuration: formData.breakDuration,
            notes: formData.notes
          };
          shiftPromises.push(assignShift(shiftData));
        }
      }

      const results = await Promise.all(shiftPromises);
      const successCount = results.filter(r => r.success).length;

      if (successCount > 0) {
        toast.success(`Successfully assigned ${successCount} shifts to ${formData.employeeIds.length} employee(s)`);
        setShowModal(false);
        resetModalState();
        await fetchData();
      } else {
        toast.error('Failed to assign any shifts');
      }
    } catch (error) {
      console.error('Assign shift error:', error);
      toast.error(error.message || 'Failed to assign shifts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShift = async () => {
    setLoading(true);
    try {
      const shift = shiftToDelete;
      if (!shift) {
        toast.error('No shift selected');
        return;
      }

      let response;
      if (shift.groupId) {
        response = await deleteShiftAssignmentGroup(shift.groupId);
      } else if (Array.isArray(shift.assignmentIds) && shift.assignmentIds.length > 0) {
        const results = await Promise.all(shift.assignmentIds.map(id => deleteShiftAssignment(id)));
        response = { success: results.some(r => r?.success) };
      } else {
        response = await deleteShiftAssignment(shift._id);
      }

      if (response.success) {
        toast.success('Shift deleted successfully');
        setShowDeleteDialog(false);
        setShiftToDelete(null);
        fetchData();
      }
    } catch (error) {
      console.error('Delete shift error:', error);
      toast.error(error.message || 'Failed to delete shift');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSelect = (teamId) => {
    const team = teams.find(t => t._id === teamId);
    setSelectedTeam(team);

    if (team && team.members) {
      setTeamMembers(team.members || []);
    } else {
      setTeamMembers([]);
    }
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();

    if (!canAssignByTeam) {
      toast.error('Only admin users can assign shifts by team');
      setAssignmentType('employee');
      return;
    }

    if (formData.teamIds.length === 0 || formData.dateRange.length !== 2) {
      toast.warning('Please select teams and date range');
      return;
    }

    setLoading(true);
    try {
      const startDateStr = dayjs(formData.dateRange[0]).format('YYYY-MM-DD');
      const endDateStr = dayjs(formData.dateRange[1]).format('YYYY-MM-DD');

      const results = await Promise.all(
        formData.teamIds.map(teamId => {
          const teamGroupId = (typeof crypto !== 'undefined' && crypto?.randomUUID)
            ? crypto.randomUUID()
            : `${Date.now()}-${teamId}-${Math.random().toString(16).slice(2)}`;
          return assignShiftToTeam({
            teamId,
            shiftName: formData.shiftName,
            startDate: startDateStr,
            endDate: endDateStr,
            groupId: teamGroupId,
            startTime: formData.startTime,
            endTime: formData.endTime,
            location: formData.location,
            workType: formData.workType,
            breakDuration: formData.breakDuration,
            notes: formData.notes
          });
        })
      );

      const totalAssigned = results.reduce((sum, r) => sum + (r.data?.successful?.length || 0), 0);
      const totalSkipped = results.reduce((sum, r) => sum + (r.data?.failed?.length || 0), 0);

      if (totalAssigned > 0) {
        toast.success(
          `Assigned ${totalAssigned} shift(s) across ${formData.teamIds.length} team(s)` +
          (totalSkipped > 0 ? ` (${totalSkipped} skipped — conflicts or approved leave)` : '')
        );
        setShowModal(false);
        resetModalState();
        await fetchData();
      } else {
        toast.error('No shifts could be assigned — all were blocked by conflicts or approved leave');
      }
    } catch (error) {
      console.error('Team assign shift error:', error);
      toast.error(error.message || 'Failed to assign shifts to teams');
    } finally {
      setLoading(false);
    }
  };

  const resetModalState = () => {
    setAssignmentType('employee');
    setSelectedTeam(null);
    setTeamMembers([]);
    setFormData({
      employeeIds: [],
      teamIds: [],
      dateRange: [],
      shiftName: '',
      startTime: '09:00',
      endTime: '17:00',
      location: 'Office',
      workType: 'Regular',
      breakDuration: 60,
      notes: ''
    });
  };

  const getWeekdaysInRange = (startDate, endDate) => {
    const dates = [];
    let current = dayjs(startDate).startOf('day');
    const end = dayjs(endDate).startOf('day');

    while (current.isBefore(end) || current.isSame(end)) {
      const dayOfWeek = current.day();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push(current.format('YYYY-MM-DD'));
      }
      current = current.add(1, 'day');
    }

    return dates;
  };

  const getLocationClass = (location) => {
    if (location === 'Office') return 'location-pill location-office';
    if (location === 'Home') return 'location-pill location-home';
    if (location === 'Field') return 'location-pill location-field';
    if (location === 'Client Site') return 'location-pill location-client';
    return 'location-pill location-default';
  };

  const formatUKDate = (dateString) => {
    if (!dateString) return '';
    return `${getShortDayName(dateString)}, ${formatDateDDMMYY(dateString)}`;
  };

  const formatUKTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const getAssignmentTargetLabel = (shift) => {
    if ((shift?.assignmentTargetType || '').toLowerCase() === 'team') {
      return shift?.teamName ? `Team: ${shift.teamName}` : 'Team Assignment';
    }
    return 'Employee';
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      try {
        localStorage.setItem('rotaShiftFilters', JSON.stringify(newFilters));
      } catch (error) {
        console.error('Error saving filters to localStorage:', error);
      }
      return newFilters;
    });
  };

  const resetFilters = () => {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const defaultFilters = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      employeeId: '',
      location: 'all',
      workType: 'all',
      status: ''
    };
    setFilters(defaultFilters);

    try {
      localStorage.setItem('rotaShiftFilters', JSON.stringify(defaultFilters));
    } catch (error) {
      console.error('Error saving filters to localStorage:', error);
    }

    toast.info('Filters reset to show all shifts', { autoClose: 2000 });
  };

  const exportToCSV = () => {
    const visibleShifts = getFilteredShifts();

    if (visibleShifts.length === 0) {
      toast.warning('No rotas available to export.');
      return;
    }

    const csvData = visibleShifts.map((shift) => [
      shift.shiftName || '',
      formatDateRangeDisplay(shift.startDate, shift.endDate),
      shift.location || '',
      shift.workType || ''
    ]);

    const headers = ['Shift Name', 'Date Range', 'Location', 'Work Type'];
    const rows = [headers, ...csvData];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const tabName = rotaTab === 'all' ? 'All_Rotas' : (rotaTab === 'old' ? 'Old_Rotas' : 'Active_Rotas');
    link.setAttribute("download", `${tabName}_${dateStr}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const tabLabel = rotaTab === 'all' ? 'All' : (rotaTab === 'old' ? 'Old' : 'Active');
    toast.success(`${tabLabel} rotas exported successfully (${visibleShifts.length} rotas)`);
  };

  if (loading && shifts.length === 0) {
    return <LoadingScreen />;
  }

  const filteredShifts = getFilteredShifts();
  const totalPages = Math.ceil(filteredShifts.length / pageSize) || 1;

  return (
    <>
      <style>{styles}</style>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="rota-root">
        <div className="rota-shell">

          {/* ── Page Header ── */}
          <div className="page-header anim-fade-up">
            <div className="page-header-row">
              <div className="page-icon-wrap">
                <svg style={{ width: 22, height: 22, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="page-eyebrow">Workforce Scheduling</p>
                <h1 className="page-title">Rota &amp; Shift Management</h1>
                <p className="page-subtitle">Assign, manage, and track employee shift schedules.</p>
              </div>
            </div>
          </div>

          {/* ── Statistics ── */}
          {statistics && (
            <div className="stats-grid anim-fade-up delay-100">
              <div className="stat-card">
                <p className="stat-label">Total Shifts</p>
                <p className="stat-value">{statistics.totalShifts}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Total Hours</p>
                <p className="stat-value">{statistics.totalHours}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Employees</p>
                <p className="stat-value">{statistics.uniqueEmployees}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Office</p>
                <p className="stat-value is-accent">{statistics.byLocation.Office}</p>
              </div>
            </div>
          )}

          {/* ── Rota Tabs ── */}
          <div className="anim-fade-up delay-100">
            <div className="rota-tabs">
              <button
                type="button"
                onClick={() => { setRotaTab('all'); setCurrentPage(1); }}
                className={`rota-tab ${rotaTab === 'all' ? 'is-active' : ''}`}
              >
                All Rotas
              </button>
              <button
                type="button"
                onClick={() => { setRotaTab('active'); setCurrentPage(1); }}
                className={`rota-tab ${rotaTab === 'active' ? 'is-active' : ''}`}
              >
                Active Rotas
              </button>
              <button
                type="button"
                onClick={() => { setRotaTab('old'); setCurrentPage(1); }}
                className={`rota-tab ${rotaTab === 'old' ? 'is-active' : ''}`}
              >
                Old Rotas
              </button>
            </div>
          </div>

          {/* ── Filter Bar ── */}
          <div className="surface filter-card anim-fade-up delay-200">
            <div className="filter-grid">
              <div>
                <DatePicker
                  label="Start Date"
                  value={filters.startDate ? dayjs(filters.startDate) : null}
                  onChange={(date) => handleFilterChange('startDate', date ? date.format('YYYY-MM-DD') : '')}
                />
              </div>
              <div>
                <DatePicker
                  label="End Date"
                  value={filters.endDate ? dayjs(filters.endDate) : null}
                  onChange={(date) => handleFilterChange('endDate', date ? date.format('YYYY-MM-DD') : '')}
                  minDate={filters.startDate ? dayjs(filters.startDate) : undefined}
                />
              </div>
              <div>
                <label className="field-label">Location</label>
                <Select
                  value={filters.location}
                  onValueChange={(value) => handleFilterChange('location', value)}
                >
                  <SelectTrigger style={{ width: '100%' }}>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="Office">Office</SelectItem>
                    <SelectItem value="Home">Home</SelectItem>
                    <SelectItem value="Field">Field</SelectItem>
                    <SelectItem value="Client Site">Client Site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="field-label">Work Type</label>
                <Select
                  value={filters.workType}
                  onValueChange={(value) => handleFilterChange('workType', value)}
                >
                  <SelectTrigger style={{ width: '100%' }}>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Overtime">Overtime</SelectItem>
                    <SelectItem value="Weekend overtime">Weekend Overtime</SelectItem>
                    <SelectItem value="Client side overtime">Client Side Overtime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="field-label">Date Range</label>
                <Select
                  value={dateRangeFilter}
                  onValueChange={(value) => {
                    setDateRangeFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger style={{ width: '100%' }}>
                    <SelectValue placeholder="All Dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="last7">Last 7 days</SelectItem>
                    <SelectItem value="last30">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="field-label">Team</label>
                <Select
                  value={teamFilter}
                  onValueChange={(value) => {
                    setTeamFilter(value);
                    setEmployeeFilter('all');
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger style={{ width: '100%' }}>
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team._id || team.id} value={team._id || team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="field-label">Employee</label>
                <Select
                  value={employeeFilter}
                  onValueChange={(value) => {
                    setEmployeeFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger style={{ width: '100%' }}>
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {getFilteredEmployeesForDropdown().map(emp => (
                      <SelectItem key={emp.id || emp._id} value={emp.id || emp._id}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="field-label">Shift Name</label>
                <MultiSelectDropdown
                  options={Array.from(new Set((shifts || []).map(s => (s.shiftName || '').toString().trim()).filter(Boolean))).sort().map(name => ({
                    value: name,
                    label: name
                  }))}
                  selectedValues={shiftNameFilter}
                  onChange={(values) => {
                    setShiftNameFilter(values);
                    setCurrentPage(1);
                  }}
                  placeholder="Select shift name(s)…"
                />
              </div>
            </div>

            <div className="filter-actions">
              <button
                onClick={() => {
                  setTeamFilter('all');
                  setEmployeeFilter('all');
                  setDateRangeFilter('all');
                  setShiftNameFilter([]);
                  setCurrentPage(1);
                }}
                className="btn btn-secondary"
                type="button"
              >
                Clear Filters
              </button>
              <button
                onClick={exportToCSV}
                className="btn btn-secondary"
                type="button"
              >
                Export CSV
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
                type="button"
              >
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4v16m8-8H4" />
                </svg>
                Assign Shift
              </button>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="surface table-card anim-fade-up delay-300">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>SI No.</th>
                    <th>Shift Name</th>
                    <th>Date Range</th>
                    <th>Location</th>
                    <th>Work Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShifts.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan="6">
                        {teamFilter !== 'all' || employeeFilter !== 'all'
                          ? 'No shifts found for the selected filters.'
                          : (rotaTab === 'all' ? 'No rotas found.' : (rotaTab === 'active' ? 'No active rotas today.' : 'No old rotas found.'))}
                      </td>
                    </tr>
                  ) : (
                    filteredShifts.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((shift, index) => (
                      <tr
                        key={shift._id}
                        onClick={() => {
                          setSelectedShift(shift);
                          setShowShiftDetails(true);
                        }}
                      >
                        <td className="td-index">{(currentPage - 1) * pageSize + index + 1}</td>
                        <td>
                          <span
                            className="td-shift-name-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedShift(shift);
                              setShowShiftDetails(true);
                            }}
                          >
                            {shift.shiftName || '-'}
                          </span>
                          <div className="td-muted" style={{ fontSize: '0.7rem', marginTop: '0.2rem' }}>
                            {getAssignmentTargetLabel(shift)}
                          </div>
                        </td>
                        <td className="td-muted">
                          {formatDateRangeDisplay(shift.startDate, shift.endDate)}
                        </td>
                        <td>
                          <span className={getLocationClass(shift.location)}>
                            {shift.location}
                          </span>
                        </td>
                        <td className="td-muted">{shift.workType}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedShift(shift);
                                setShowShiftDetails(true);
                              }}
                              className="row-action-view"
                              type="button"
                            >
                              View
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShiftToDelete(shift);
                                setShowDeleteDialog(true);
                              }}
                              className="row-action-delete"
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredShifts.length > 0 && (
              <div className="pagination-bar">
                <div className="pagination-meta">
                  Showing <strong>{Math.min((currentPage - 1) * pageSize + 1, filteredShifts.length)}</strong> to{' '}
                  <strong>{Math.min(currentPage * pageSize, filteredShifts.length)}</strong> of{' '}
                  <strong>{filteredShifts.length}</strong> rotas
                </div>
                <div className="pagination-controls">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="page-btn"
                    type="button"
                  >
                    Previous
                  </button>
                  <div className="page-num-group">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`page-btn ${currentPage === page ? 'is-active' : ''}`}
                        type="button"
                        style={{ minWidth: 36 }}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className="page-btn"
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════
           SHIFT DETAILS MODAL
      ══════════════════════════════════════ */}
      {showShiftDetails && selectedShift && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowShiftDetails(false);
              setSelectedShift(null);
            }
          }}
        >
          <div className="modal-box">
            <div className="modal-header">
              <div className="modal-header-block">
                <p className="modal-eyebrow">Rota Details</p>
                <h2 className="modal-title">{selectedShift.shiftName || 'Shift Details'}</h2>
                <p className="modal-subtitle">
                  {(selectedShift.location || '-') + ' · ' + (selectedShift.workType || '-')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowShiftDetails(false);
                  setSelectedShift(null);
                }}
                className="modal-close"
                aria-label="Close"
              >
                <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-panel">
                  <h3 className="detail-panel-title">Shift Meta Information</h3>
                  <div className="detail-rows">
                    <div className="detail-key">Shift Name</div>
                    <div className="detail-val">{selectedShift.shiftName || '-'}</div>

                    <div className="detail-key">Assignment Target</div>
                    <div className="detail-val">{getAssignmentTargetLabel(selectedShift)}</div>

                    <div className="detail-key">Date Range</div>
                    <div className="detail-val">
                      {formatDateRangeDisplay(selectedShift.startDate, selectedShift.endDate)}
                    </div>

                    <div className="detail-key">Start – End</div>
                    <div className="detail-val">
                      {formatUKTime(selectedShift.startTime)} – {formatUKTime(selectedShift.endTime)}
                    </div>

                    <div className="detail-key">Location</div>
                    <div className="detail-val">{selectedShift.location || '-'}</div>

                    <div className="detail-key">Work Type</div>
                    <div className="detail-val">{selectedShift.workType || '-'}</div>

                    <div className="detail-key">Assigned By</div>
                    <div className="detail-val">
                      {selectedShift.assignedBy?.firstName
                        ? `${selectedShift.assignedBy.firstName} ${selectedShift.assignedBy.lastName || ''}`.trim()
                        : (selectedShift.assignedByName || selectedShift.assignedBy?.email || '-')}
                    </div>
                  </div>
                </div>

                <div className="detail-panel">
                  <h3 className="detail-panel-title">Date Coverage</h3>
                  <MiniCalendar startDate={selectedShift.startDate} endDate={selectedShift.endDate} />
                </div>
              </div>

              <div className="assigned-panel">
                <div className="assigned-head">
                  <h3 className="detail-panel-title" style={{ margin: 0, padding: 0, border: 'none' }}>
                    Assigned Employees
                  </h3>
                  <span className="assigned-count">
                    {(Array.isArray(selectedShift.assignedEmployees) ? selectedShift.assignedEmployees.length : 0)} employees
                  </span>
                </div>

                <div className="assigned-list">
                  {(Array.isArray(selectedShift.assignedEmployees) ? selectedShift.assignedEmployees : []).length === 0 ? (
                    <div className="assigned-empty">No employees assigned</div>
                  ) : (
                    (selectedShift.assignedEmployees || []).map((emp, idx) => {
                      const { employeeName, email, employeeId } = getEmployeeDisplay(emp);
                      const initials = employeeName.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || 'E';
                      return (
                        <div key={`${employeeId}-${idx}`} className="assigned-row">
                          <div className="assigned-left">
                            <div className="assigned-avatar">{initials}</div>
                            <div className="assigned-info">
                              <div className="assigned-name">{employeeName}</div>
                              <div className="assigned-email">{email || employeeId}</div>
                            </div>
                          </div>
                          <div className="assigned-time">
                            {formatUKTime(emp.startTime || selectedShift.startTime)} – {formatUKTime(emp.endTime || selectedShift.endTime)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
           ASSIGN SHIFT MODAL
      ══════════════════════════════════════ */}
      {showModal && (
        <div
          className="drawer-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              resetModalState();
            }
          }}
        >
          <div className="assign-modal">
            <div className="assign-header">
              <div className="assign-header-block">
                <div className="assign-header-icon">
                  <svg style={{ width: 18, height: 18, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="modal-eyebrow">New Assignment</p>
                  <h2 className="modal-title">Assign Shift</h2>
                  <p className="modal-subtitle">
                    Assign shifts to individual employees or entire teams.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetModalState();
                }}
                className="modal-close"
                aria-label="Close"
              >
                <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sub-tabs (Employee / Teams) */}
            <div className="sub-tabs">
              <button
                type="button"
                onClick={() => setAssignmentType('employee')}
                className={`sub-tab ${assignmentType === 'employee' ? 'is-active' : ''}`}
              >
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Employee
              </button>
              {canAssignByTeam && (
                <button
                  type="button"
                  onClick={() => setAssignmentType('team')}
                  className={`sub-tab ${assignmentType === 'team' ? 'is-active' : ''}`}
                >
                  <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-7a4 4 0 11-8 0 4 4 0 018 0zM21 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Teams
                </button>
              )}
            </div>

            <div className="assign-body">
              <form onSubmit={(e) => e.preventDefault()}>
                {/* Employee/Team Selection */}
                {assignmentType === 'employee' ? (
                  <div className="form-field">
                    <label className="field-label">
                      Employees <span className="field-required">*</span>
                    </label>
                    <MultiSelectDropdown
                      options={employees.map(emp => ({
                        value: emp.id || emp._id,
                        label: `${emp.firstName} ${emp.lastName}`,
                        subLabel: emp.email
                      }))}
                      selectedValues={formData.employeeIds}
                      onChange={(employeeIds) => setFormData({ ...formData, employeeIds })}
                      placeholder="Select employees…"
                      enableSelectAll
                      selectAllLabel="Select All"
                    />
                  </div>
                ) : (
                  <div className="form-field">
                    <label className="field-label">
                      Teams <span className="field-required">*</span>
                    </label>
                    <MultiSelectDropdown
                      options={teams.map(team => ({
                        value: team._id,
                        label: team.name,
                        subLabel: `${team.members?.length || 0} members`
                      }))}
                      selectedValues={formData.teamIds}
                      onChange={(teamIds) => {
                        setFormData({ ...formData, teamIds });
                        if (teamIds.length === 1) {
                          const team = teams.find(t => t._id === teamIds[0]);
                          setSelectedTeam(team);
                          setTeamMembers(team?.members || []);
                        } else {
                          setSelectedTeam(null);
                          setTeamMembers([]);
                        }
                      }}
                      placeholder="Select teams…"
                    />

                    {selectedTeam && teamMembers.length > 0 && (
                      <div className="team-members-box">
                        <p className="team-members-title">
                          Team Members ({teamMembers.length})
                        </p>
                        <div className="team-members-grid">
                          {teamMembers.map((member, index) => (
                            <div key={index} className="team-member-chip">
                              {member.firstName} {member.lastName}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="form-field">
                  <label className="field-label">Shift Name</label>
                  <input
                    type="text"
                    value={formData.shiftName}
                    onChange={(e) => setFormData({ ...formData, shiftName: e.target.value })}
                    placeholder="Enter shift name…"
                    className="text-input"
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">
                    Date Range <span className="field-required">*</span>
                  </label>
                  <div className="calendar-wrap">
                    <LeaveCalendar
                      startDate={formData.dateRange[0]}
                      endDate={formData.dateRange[1]}
                      onDateSelect={(start, end) => {
                        const dateRange = start ? (end ? [start, end] : [start]) : [];
                        setFormData({ ...formData, dateRange });
                      }}
                    />
                    {formData.dateRange && formData.dateRange.length === 2 && (
                      <>
                        <div className="info-pill-success">
                          {formData.dateRange[0].toLocaleDateString('en-GB')} — {formData.dateRange[1].toLocaleDateString('en-GB')}
                        </div>
                        <div className="info-pill-warn">
                          <svg style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>Weekends (Sat / Sun) are mandatory holidays and will be excluded from shift assignment.</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="form-field">
                  <div className="form-grid-2">
                    <div>
                      <MUITimePicker
                        label="Start Time"
                        value={formData.startTime}
                        onChange={(time) => {
                          if (time) {
                            setFormData({ ...formData, startTime: time.format('HH:mm') });
                          } else {
                            setFormData({ ...formData, startTime: '' });
                          }
                        }}
                      />
                    </div>
                    <div>
                      <MUITimePicker
                        label="End Time"
                        value={formData.endTime}
                        onChange={(time) => {
                          if (time) {
                            setFormData({ ...formData, endTime: time.format('HH:mm') });
                          } else {
                            setFormData({ ...formData, endTime: '' });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-field">
                  <div className="form-grid-2">
                    <div>
                      <label className="field-label">Location</label>
                      <Select
                        value={formData.location}
                        onValueChange={(value) => setFormData({ ...formData, location: value })}
                      >
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
                    <div>
                      <label className="field-label">Work Type</label>
                      <Select
                        value={formData.workType}
                        onValueChange={(value) => setFormData({ ...formData, workType: value })}
                      >
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
                </div>

                <div className="form-field">
                  <label className="field-label">Break Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.breakDuration}
                    onChange={(e) => setFormData({ ...formData, breakDuration: parseInt(e.target.value) })}
                    className="text-input"
                  />
                </div>

                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label className="field-label">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                    className="textarea-field"
                  />
                </div>
              </form>
            </div>

            <div className="assign-footer">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetModalState();
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={assignmentType === 'employee' ? handleSubmit : handleTeamSubmit}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading
                  ? (assignmentType === 'employee' ? 'Assigning…' : 'Assigning to Team…')
                  : (assignmentType === 'employee' ? 'Assign Shift' : `Assign to ${teamMembers.length} Member${teamMembers.length !== 1 ? 's' : ''}`)
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Shift"
        description="Are you sure you want to delete this shift? This action cannot be undone."
        onConfirm={handleDeleteShift}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  );
};

export default RotaShiftManagement;