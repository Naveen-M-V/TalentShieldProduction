import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getClockStatus, clockIn, clockOut, changeEmployeeStatus, getDashboardStats, setOnBreak, deleteTimeEntry, userClockIn, userClockOut, userStartBreak } from '../utils/clockApi';
import { getClockInLeaveBlockMessage } from '../utils/clockApi';
import LoadingScreen from '../components/LoadingScreen';
import EmployeeTimesheetModal from '../components/EmployeeTimesheetModal';
import { DatePicker } from '../components/ui/date-picker';
import MUITimePicker from '../components/MUITimePicker';
import dayjs from 'dayjs';
import moment from 'moment-timezone';
import { useAuth } from '../context/AuthContext';
import { useClockStatus } from '../context/ClockStatusContext';
import { formatUKTimeOnly } from '../utils/timeUtils';
import { buildApiUrl } from '../utils/apiConfig';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from '../components/ui/pagination';
import ConfirmDialog from '../components/ConfirmDialog';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .ci-root {
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
  .ci-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
  }
  .ci-shell {
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
     PAGE HEADER ROW
  ══════════════════════════════════════ */
  .header-row {
    display: flex; flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }
  @media (min-width: 1024px) {
    .header-row { flex-direction: row; justify-content: space-between; align-items: flex-end; gap: 1.5rem; }
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

  /* ── Action cluster ── */
  .action-cluster {
    display: flex; gap: 0.6rem; flex-wrap: wrap;
    align-items: stretch;
    width: 100%;
  }
  @media (min-width: 1024px) {
    .action-cluster { width: auto; flex-wrap: nowrap; }
  }

  /* ══════════════════════════════════════
     SEARCHABLE EMPLOYEE INPUT
  ══════════════════════════════════════ */
  .emp-search-wrap {
    position: relative;
    flex: 1; min-width: 220px;
  }
  @media (min-width: 1024px) {
    .emp-search-wrap { min-width: 320px; }
  }
  .emp-search-input {
    width: 100%;
    padding: 0.55rem 2rem 0.55rem 2.2rem;
    border: 1.5px solid #d4ddd6;
    border-radius: 9px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8rem; color: #2f3e46;
    background: #fff;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    min-height: 36px;
  }
  .emp-search-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .emp-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%);
    color: #84a98c;
    pointer-events: none;
    display: flex; align-items: center;
  }
  .emp-search-clear {
    position: absolute; right: 6px; top: 50%;
    transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: #84a98c;
    width: 24px; height: 24px;
    border-radius: 5px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .emp-search-clear:hover { color: #2f3e46; background: #f0f5f2; }

  .emp-dropdown {
    position: absolute; top: calc(100% + 6px); left: 0; right: 0;
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 11px;
    max-height: 320px;
    overflow-y: auto;
    box-shadow: 0 10px 32px rgba(47,62,70,0.12);
    z-index: 1000;
    -webkit-overflow-scrolling: touch;
    animation: fadeIn 0.18s ease;
  }
  .emp-option {
    padding: 0.7rem 1rem;
    cursor: pointer;
    border-bottom: 1px solid #eaefeb;
    transition: background 0.15s;
  }
  .emp-option:last-child { border-bottom: none; }
  .emp-option:hover { background: #f0f5f2; }
  .emp-option-name {
    font-size: 0.85rem; font-weight: 600; color: #2f3e46;
    line-height: 1.3;
  }
  .emp-option-meta {
    font-size: 0.72rem; color: #7a8e84; font-weight: 400;
    margin-top: 0.15rem;
  }
  .emp-dropdown-empty {
    padding: 1.25rem 1rem;
    text-align: center;
    color: #8fa99a;
    font-size: 0.82rem;
    font-weight: 300;
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
  .btn-warn {
    background: linear-gradient(135deg, #b89758 0%, #d1b076 100%);
    color: #fff;
    box-shadow: 0 3px 12px rgba(184,151,88,0.22);
  }
  .btn-warn:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 6px 18px rgba(184,151,88,0.3);
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
     STAT CARDS
  ══════════════════════════════════════ */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
    margin-bottom: 1.1rem;
  }
  @media (min-width: 640px) { .stats-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 1024px) { .stats-grid { grid-template-columns: repeat(5, 1fr); gap: 0.75rem; } }

  .stat-card {
    background: #fff;
    border: 1.5px solid #eaefeb;
    border-radius: 11px;
    padding: 0.75rem 0.85rem;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
    position: relative;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
    text-align: left;
    min-width: 0;
  }
  .stat-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: var(--accent, #84a98c);
    opacity: 0.55;
    transition: opacity 0.25s;
  }
  .stat-card:hover {
    transform: translateY(-2px);
    border-color: var(--accent, #84a98c);
    box-shadow: 0 6px 18px rgba(53,79,82,0.08);
  }
  .stat-card:hover::before { opacity: 1; }
  .stat-card.is-selected {
    border-color: var(--accent, #52796f);
    background: var(--accent-bg, rgba(132,169,140,0.06));
    box-shadow: 0 0 0 2px var(--accent-ring, rgba(132,169,140,0.15)), 0 6px 18px rgba(53,79,82,0.08);
  }
  .stat-card.is-selected::before { opacity: 1; height: 2.5px; }
  .stat-card-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 0.4rem;
    gap: 0.4rem;
  }
  .stat-label {
    font-size: 0.56rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #84a98c;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .stat-status-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--accent, #84a98c);
    box-shadow: 0 0 0 2.5px var(--accent-bg, rgba(132,169,140,0.18));
    flex-shrink: 0;
  }
  .stat-value {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.55rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.02em;
    line-height: 1.05;
    margin: 0;
  }
  .stat-card.is-selected .stat-value { color: var(--accent-text, #354f52); }
  .stat-loading { color: #b6c0b9 !important; }

  .variant-all       { --accent: #84a98c; --accent-bg: rgba(132,169,140,0.10); --accent-ring: rgba(132,169,140,0.18); --accent-text: #354f52; }
  .variant-clockedin { --accent: #52796f; --accent-bg: rgba(82,121,111,0.10);  --accent-ring: rgba(82,121,111,0.18);  --accent-text: #2f3e46; }
  .variant-clockedout{ --accent: #6f8c98; --accent-bg: rgba(111,140,152,0.10); --accent-ring: rgba(111,140,152,0.18); --accent-text: #354f52; }
  .variant-onbreak   { --accent: #b89758; --accent-bg: rgba(184,151,88,0.10);  --accent-ring: rgba(184,151,88,0.20);  --accent-text: #6b5524; }
  .variant-absent    { --accent: #b85c50; --accent-bg: rgba(184,92,80,0.08);   --accent-ring: rgba(184,92,80,0.16);   --accent-text: #7a3028; }

  /* ══════════════════════════════════════
     FILTER / SEARCH BAR
  ══════════════════════════════════════ */
  .filter-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 0.85rem 1rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
  }
  .filter-row {
    display: flex; gap: 0.7rem; align-items: center; flex-wrap: wrap;
  }
  .filter-search-wrap {
    position: relative;
    flex: 1; min-width: 200px;
  }
  .filter-search-input {
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
  .filter-search-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .filter-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%);
    color: #84a98c;
    pointer-events: none;
  }
  .filter-meta {
    font-size: 0.7rem; color: #84a98c; font-weight: 500;
    letter-spacing: 0.02em;
  }
  .filter-actions {
    display: flex; gap: 0.5rem; flex-wrap: wrap;
    margin-top: 0.7rem;
    padding-top: 0.7rem;
    border-top: 1px solid #eaefeb;
  }

  /* ══════════════════════════════════════
     TABLE
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
    padding: 0.7rem 0.65rem;
    text-align: left;
    font-size: 0.58rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #84a98c;
    white-space: nowrap;
  }
  .data-table th.is-center { text-align: center; }
  .data-table tbody tr {
    border-bottom: 1px solid #eaefeb;
    cursor: pointer;
    transition: background 0.15s;
  }
  .data-table tbody tr:last-child { border-bottom: none; }
  .data-table tbody tr:hover { background: #fafbfa; }
  .data-table tbody tr.is-selected {
    background: rgba(132,169,140,0.08);
  }
  .data-table tbody tr.is-selected:hover { background: rgba(132,169,140,0.12); }
  .data-table td {
    padding: 0.65rem 0.65rem;
    font-size: 0.76rem;
    color: #2f3e46;
    vertical-align: middle;
    white-space: nowrap;
  }
  .data-table td.is-center { text-align: center; }
  .td-index {
    color: #7a8e84; font-weight: 500;
    width: 44px;
  }
  .td-muted { color: #7a8e84; }

  /* Truncate long cell content */
  .cell-truncate {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name-line {
    display: inline-flex; align-items: center; gap: 0.45rem;
  }
  .me-badge {
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    color: #cad2c5;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    font-size: 0.52rem; font-weight: 700;
    letter-spacing: 0.1em;
    box-shadow: 0 1px 3px rgba(53,79,82,0.18);
  }

  /* Hide low-priority columns at narrower widths to avoid horizontal scroll */
  @media (max-width: 1279px) {
    .col-empid { display: none; }
  }
  @media (max-width: 1100px) {
    .col-email { display: none; }
  }
  @media (max-width: 940px) {
    .col-office { display: none; }
  }
  @media (max-width: 820px) {
    .col-jobtitle { display: none; }
  }
  @media (max-width: 700px) {
    .col-break { display: none; }
  }
  @media (max-width: 580px) {
    .col-clockout { display: none; }
  }
  @media (max-width: 480px) {
    .col-clockin { display: none; }
  }

  /* ── Status pill in table ── */
  .row-status {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.22rem 0.55rem;
    border-radius: 999px;
    font-size: 0.65rem; font-weight: 600;
    letter-spacing: 0.02em;
    border: 1px solid var(--status-border, #eaefeb);
    background: var(--status-bg, #fafbfa);
    color: var(--status-text, #2f3e46);
    white-space: nowrap;
  }
  .row-status-dot {
    width: 5px; height: 5px;
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
  .status-onleave {
    --status-bg: rgba(122,102,140,0.08);
    --status-border: rgba(122,102,140,0.2);
    --status-text: #4a3d5a;
    --status-dot: #7a668c;
  }
  .status-none {
    --status-bg: #fafbfa;
    --status-border: #eaefeb;
    --status-text: #8fa99a;
    --status-dot: #b6c0b9;
  }

  /* ── Row action buttons ── */
  .row-actions {
    display: flex; gap: 0.3rem; justify-content: center; flex-wrap: wrap;
  }
  .row-action-btn {
    padding: 0.28rem 0.55rem;
    border: none;
    border-radius: 6px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.65rem; font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    display: inline-flex; align-items: center; gap: 0.25rem;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
    white-space: nowrap;
  }
  .row-clockin {
    background: linear-gradient(135deg, #52796f 0%, #6b8e7f 100%);
    color: #fff;
    box-shadow: 0 1px 3px rgba(82,121,111,0.18);
  }
  .row-clockin:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(82,121,111,0.25); }
  .row-clockout {
    background: linear-gradient(135deg, #a35446 0%, #b85c50 100%);
    color: #fff;
    box-shadow: 0 1px 3px rgba(163,84,70,0.18);
  }
  .row-clockout:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(163,84,70,0.25); }
  .row-break {
    background: linear-gradient(135deg, #b89758 0%, #d1b076 100%);
    color: #fff;
    box-shadow: 0 1px 3px rgba(184,151,88,0.18);
  }
  .row-break:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(184,151,88,0.25); }
  .row-details {
    background: #fff;
    color: #354f52;
    border: 1px solid #d4ddd6;
  }
  .row-details:hover {
    background: #f0f5f2; border-color: #84a98c; color: #2f3e46;
  }

  /* ── Empty state inside table ── */
  .table-empty-row td {
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
  .empty-text {
    font-size: 0.82rem; color: #7a8e84; font-weight: 300;
    margin: 0;
  }

  /* ══════════════════════════════════════
     PAGINATION META
  ══════════════════════════════════════ */
  .pagination-wrap { margin-top: 1.5rem; }
  .pagination-meta {
    margin-top: 0.85rem;
    font-size: 0.78rem; color: #7a8e84;
    text-align: center;
  }
  .pagination-meta strong { color: #354f52; font-weight: 600; }

  /* ══════════════════════════════════════
     EDIT TIME ENTRY MODAL
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
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #eaefeb;
    flex-shrink: 0;
  }
  .modal-eyebrow {
    font-size: 0.62rem; font-weight: 500;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: #84a98c; margin: 0;
  }
  .modal-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.4rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0.15rem 0 0;
  }
  .modal-subtitle {
    font-size: 0.78rem; color: #7a8e84; font-weight: 400;
    margin: 0.25rem 0 0;
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
  .modal-body { padding: 1.4rem 1.5rem; overflow-y: auto; flex: 1; -webkit-overflow-scrolling: touch; }
  .modal-footer {
    display: flex; justify-content: flex-end; gap: 0.6rem;
    padding: 0.95rem 1.5rem;
    border-top: 1px solid #eaefeb;
    background: #fafbfa;
    flex-shrink: 0;
  }

  .field-grid-2 {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  @media (max-width: 639px) { .field-grid-2 { grid-template-columns: 1fr; } }

  /* ══════════════════════════════════════
     CLOCK-IN CONFIRMATION MODAL
  ══════════════════════════════════════ */
  .clockin-modal-box {
    background: #fff;
    border-radius: 18px;
    width: 100%; max-width: 480px;
    overflow: hidden;
    box-shadow: 0 32px 64px rgba(47,62,70,0.3);
    animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1);
  }
  .clockin-hero {
    padding: 2rem 1.75rem 1.75rem;
    background: linear-gradient(135deg, #2f3e46 0%, #354f52 60%, #52796f 100%);
    position: relative;
    overflow: hidden;
  }
  .clockin-hero::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 80% 20%, rgba(132,169,140,0.25) 0%, transparent 55%);
    pointer-events: none;
  }
  .clockin-hero-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(202,210,197,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(202,210,197,0.04) 1px, transparent 1px);
    background-size: 30px 30px;
    pointer-events: none;
  }
  .clockin-orb {
    position: absolute;
    width: 180px; height: 180px;
    border-radius: 50%;
    background: #84a98c;
    filter: blur(45px);
    opacity: 0.18;
    top: -50px; right: -30px;
    pointer-events: none;
    animation: pulse-ring 6s ease-in-out infinite;
  }
  .clockin-hero-content {
    position: relative; z-index: 1;
    display: flex; flex-direction: column; align-items: center;
    gap: 0.85rem;
  }
  .clockin-eyebrow {
    font-size: 0.62rem; font-weight: 500;
    letter-spacing: 0.2em; text-transform: uppercase;
    color: #84a98c; margin: 0;
  }
  .clockin-avatar {
    width: 86px; height: 86px;
    border-radius: 50%;
    background: rgba(202,210,197,0.12);
    border: 1.5px solid rgba(202,210,197,0.25);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.85rem; font-weight: 500;
    color: #cad2c5;
    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  }
  .clockin-emp-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.55rem; font-weight: 400;
    color: #cad2c5; letter-spacing: -0.01em;
    text-align: center; line-height: 1.2;
    margin: 0;
  }
  .clockin-emp-dept {
    font-size: 0.74rem; color: rgba(202,210,197,0.7); font-weight: 400;
    letter-spacing: 0.06em;
    text-align: center;
    margin: 0;
  }

  .clockin-content {
    padding: 1.5rem 1.75rem 1.75rem;
  }
  .clockin-headline {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.35rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    text-align: center;
    margin: 0 0 0.5rem;
  }
  .clockin-blurb {
    font-size: 0.82rem; color: #7a8e84; font-weight: 300;
    text-align: center;
    line-height: 1.6;
    margin: 0 0 1.5rem;
  }
  .clockin-blurb strong { color: #354f52; font-weight: 600; }
  .clockin-actions {
    display: flex; gap: 0.6rem;
  }
  .clockin-actions .btn { flex: 1; }

  .geo-pill {
    margin-top: 1.25rem;
    padding: 0.85rem 1rem;
    background: linear-gradient(135deg, #f0f5f2, #eaf2ec);
    border: 1px solid rgba(132,169,140,0.25);
    border-left: 3px solid #52796f;
    border-radius: 10px;
  }
  .geo-pill-title {
    font-size: 0.68rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #354f52;
    margin: 0 0 0.45rem;
    display: flex; align-items: center; gap: 0.4rem;
  }
  .geo-pill-rows {
    display: grid; gap: 0.2rem;
    font-size: 0.74rem; color: #354f52; font-weight: 400;
    line-height: 1.5;
  }
  .geo-pill-rows strong { color: #2f3e46; font-weight: 600; }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1023px) {
    .ci-root { padding: 1.25rem; }
    .header-title { font-size: 1.45rem; }
  }
  @media (max-width: 767px) {
    .ci-root { padding: 0.85rem; }
    .header-title { font-size: 1.3rem; }
    .header-icon-wrap { width: 34px; height: 34px; border-radius: 9px; }
    .stat-value { font-size: 1.35rem; }
    .stat-card { padding: 0.65rem 0.75rem; }
    .filter-card { padding: 0.75rem 0.85rem; }
    .filter-row { flex-direction: column; align-items: stretch; }
    .filter-meta { text-align: left; }
    .data-table th { padding: 0.55rem 0.5rem; font-size: 0.55rem; }
    .data-table td { padding: 0.55rem 0.5rem; font-size: 0.72rem; }
    .modal-header, .modal-body { padding-left: 1rem; padding-right: 1rem; }
    .modal-footer { padding-left: 1rem; padding-right: 1rem; }
    .field-grid-2 { grid-template-columns: 1fr; }
    .clockin-hero { padding: 1.4rem 1.15rem; }
    .clockin-content { padding: 1.15rem 1.15rem 1.4rem; }
    .clockin-emp-name { font-size: 1.25rem; }
    .clockin-actions { flex-direction: column-reverse; }
    .row-action-btn { font-size: 0.6rem; padding: 0.25rem 0.45rem; }
  }
  @media (max-width: 479px) {
    .ci-root { padding: 0.65rem; }
    .header-title { font-size: 1.2rem; }
    .stat-value { font-size: 1.25rem; }
    .stats-grid { gap: 0.5rem; }
    .filter-card { border-radius: 10px; }
    .table-card { border-radius: 10px; }
    .modal-overlay { padding: 0; align-items: flex-end; }
    .modal-box { border-radius: 18px 18px 0 0; max-height: 92vh; }
    .clockin-modal-box { border-radius: 18px 18px 0 0; }
    .emp-search-input { font-size: 16px; }
    .filter-search-input { font-size: 16px; }
  }
`;

const ClockIns = () => {
  const { user: currentUser } = useAuth();
  const { refreshTrigger, triggerClockRefresh } = useClockStatus();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    role: 'All Roles',
    staffType: 'All Staff Types',
    company: 'All Companies',
    manager: 'All Managers'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showEntries, setShowEntries] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState({ id: null, name: '' });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [myStatus, setMyStatus] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', clockIn: '', clockOut: '' });
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [clockInEmployee, setClockInEmployee] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [showTimesheetModal, setShowTimesheetModal] = useState(false);
  const [selectedFromSearch, setSelectedFromSearch] = useState(false);
  const [clockInGeoLocation, setClockInGeoLocation] = useState(null);

  useEffect(() => {
    fetchData();
    fetchMyStatus();
    const interval = setInterval(() => {
      fetchData();
      fetchMyStatus();
    }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchData();
      fetchMyStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmployeeDropdown && !event.target.closest('.emp-search-wrap')) {
        setShowEmployeeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmployeeDropdown]);

  const fetchMyStatus = async () => {
    try {
      const { getUserClockStatus } = require('../utils/clockApi');
      const response = await getUserClockStatus();
      if (response.success) {
        setMyStatus(response.data);
      } else {
        setMyStatus(null);
      }
    } catch (error) {
      console.error('Failed to fetch admin clock status:', error);
      setMyStatus(null);
    }
  };

  const fetchData = async () => {
    try {
      setStatsLoading(true);

      const [employeesRes, clockStatusRes, statsRes] = await Promise.all([
        fetch(buildApiUrl('/employees?includeAdmins=true'), {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Accept': 'application/json'
          }
        }).then(res => res.json()),
        getClockStatus({ includeAdmins: true }),
        getDashboardStats()
      ]);

      let clockStatusData = [];
      if (clockStatusRes.success && clockStatusRes.data) {
        clockStatusData = Array.isArray(clockStatusRes.data) ? clockStatusRes.data : [];
      } else if (clockStatusRes.allEmployees) {
        clockStatusData = clockStatusRes.allEmployees;
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
              emp.status = clockData.status || 'clocked-out';
              emp.clockStatus = clockData.status || 'clocked-out';
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
                status: clockEmp.status,
                clockStatus: clockEmp.status,
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

        setEmployees(employeesWithClockStatus);
        calculateStatsFromEmployees(employeesWithClockStatus);

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
      } else {
        setEmployees([]);
        setStats({ clockedIn: 0, onBreak: 0, clockedOut: 0, total: 0 });
        setStatsLoading(false);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
      toast.error('Failed to fetch data');
      setEmployees([]);
      setStats({ clockedIn: 0, onBreak: 0, clockedOut: 0, total: 0 });
      setStatsLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatsFromEmployees = (employeeList) => {
    const calculated = {
      clockedIn: employeeList.filter(e => e.status === 'clocked-in').length,
      onBreak: employeeList.filter(e => e.status === 'on-break').length,
      clockedOut: employeeList.filter(e => e.status === 'clocked-out').length,
      onLeave: employeeList.filter(e => e.status === 'on-leave').length,
      absent: employeeList.filter(e => e.status === 'absent').length,
      late: 0,
      total: employeeList.length
    };
    setStats(calculated);
    setStatsLoading(false);
  };

  const openClockInModal = (employee) => {
    setClockInEmployee(employee);
    setShowClockInModal(true);
  };

  const isSameEmployee = (emp, targetEmployeeId) => {
    if (!emp || !targetEmployeeId) return false;
    return String(emp.id || emp._id) === String(targetEmployeeId);
  };

  const confirmClockIn = async () => {
    if (!clockInEmployee) {
      toast.error('No employee selected');
      return;
    }

    const employeeId = clockInEmployee.id || clockInEmployee._id;
    const isCurrentUser = currentUser?.email === clockInEmployee.email;

    if (!employeeId) {
      console.error('Employee ID is undefined! Employee object:', clockInEmployee);
      toast.error('Invalid employee data. Please refresh and try again.');
      setShowClockInModal(false);
      return;
    }

    setShowClockInModal(false);

    try {
      let response;
      let gpsData = {};

      if (navigator.geolocation) {
        try {
          const locationToast = toast.info('Capturing location...', { autoClose: false });

          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
          });

          gpsData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          toast.dismiss(locationToast);
        } catch (gpsError) {
          console.warn('GPS capture failed:', gpsError);
        }
      }

      if (isCurrentUser) {
        response = await userClockIn({
          location: 'Work From Office',
          workType: 'Regular',
          ...gpsData
        });
      } else {
        const payload = { employeeId, ...gpsData };
        response = await clockIn(payload);
      }

      if (response.success) {
        toast.success(isCurrentUser ? 'You have clocked in successfully' : 'Employee clocked in successfully');

        if (gpsData.latitude && gpsData.longitude) {
          setClockInGeoLocation({
            latitude: gpsData.latitude,
            longitude: gpsData.longitude,
            accuracy: gpsData.accuracy,
            timestamp: moment().tz('Europe/London').format('HH:mm')
          });
        }

        const newEntry = response.data?.entry || response.entry;

        setEmployees(prevEmployees =>
          prevEmployees.map(emp =>
            isSameEmployee(emp, employeeId)
              ? {
                ...emp,
                status: 'clocked-in',
                clockStatus: 'clocked-in',
                clockIn: newEntry?.clockIn ? new Date(newEntry.clockIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : new Date().toTimeString().slice(0, 5),
                clockOut: null,
                timeEntryId: newEntry?._id || emp.timeEntryId
              }
              : emp
          )
        );

        setSelectedEmployee(prev =>
          prev && isSameEmployee(prev, employeeId)
            ? {
              ...prev,
              status: 'clocked-in',
              clockStatus: 'clocked-in',
              clockIn: newEntry?.clockIn ? new Date(newEntry.clockIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : new Date().toTimeString().slice(0, 5),
              clockOut: null
            }
            : prev
        );

        triggerClockRefresh({
          action: 'ADMIN_CLOCK_IN',
          employeeId: employeeId,
          employeeName: clockInEmployee?.firstName && clockInEmployee?.lastName
            ? `${clockInEmployee.firstName} ${clockInEmployee.lastName}`
            : 'Employee',
          adminName: currentUser?.firstName && currentUser?.lastName
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : 'Admin',
          timestamp: Date.now()
        });

        setTimeout(() => {
          fetchData();
          fetchMyStatus();
        }, 500);
      } else {
        toast.error(response.message || 'Failed to clock in');
      }
    } catch (error) {
      console.error('Clock in error:', error);

      if (error.status === 403 || error.response?.status === 403) {
        const leaveMessage = getClockInLeaveBlockMessage(error);
        toast.error(leaveMessage || error.message || 'Clock-in blocked');
        await fetchData();
        await fetchMyStatus();
        return;
      }

      if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.message || 'Failed to clock in';
        if (errorMsg.includes('currently clocked in') || errorMsg.includes('currently on-break')) {
          toast.error(errorMsg, { autoClose: 5000 });
          await fetchData();
          await fetchMyStatus();
          return;
        }
      }

      const errorMsg = error.message || error.response?.data?.message || 'Failed to clock in';
      toast.error(errorMsg);

      await fetchData();
      await fetchMyStatus();
    }
  };

  const handleClockOut = async (employeeId) => {
    if (!employeeId) {
      toast.error('Invalid employee ID');
      return;
    }

    const employee = employees.find(emp => isSameEmployee(emp, employeeId));
    const isCurrentUser = currentUser?.email === employee?.email;

    setEmployees(prevEmployees =>
      prevEmployees.map(emp =>
        isSameEmployee(emp, employeeId)
          ? { ...emp, status: 'clocked-out', clockStatus: 'clocked-out' }
          : emp
      )
    );

    setSelectedEmployee(prev =>
      prev && isSameEmployee(prev, employeeId)
        ? { ...prev, status: 'clocked-out', clockStatus: 'clocked-out' }
        : prev
    );

    try {
      let response;
      let gpsData = {};

      if (navigator.geolocation) {
        try {
          const locationToast = toast.info('Capturing location...', { autoClose: false });
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
          });

          gpsData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          toast.dismiss(locationToast);
        } catch (gpsError) {
          console.warn('GPS capture failed for clock-out:', gpsError);
        }
      }

      if (isCurrentUser) {
        response = await userClockOut(gpsData);
      } else {
        response = await clockOut({ employeeId, ...gpsData });
      }

      if (response.success) {
        toast.success(isCurrentUser ? 'You have clocked out successfully' : 'Employee clocked out successfully');

        const updatedEntry = response.data?.entry || response.data?.timeEntry || response.entry;

        setEmployees(prevEmployees =>
          prevEmployees.map(emp =>
            isSameEmployee(emp, employeeId)
              ? {
                ...emp,
                status: 'clocked-out',
                clockStatus: 'clocked-out',
                clockOut: updatedEntry?.clockOut ? new Date(updatedEntry.clockOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : new Date().toTimeString().slice(0, 5),
                hoursWorked: response.data?.hoursWorked || updatedEntry?.hoursWorked || emp.hoursWorked
              }
              : emp
          )
        );

        setSelectedEmployee(prev =>
          prev && isSameEmployee(prev, employeeId)
            ? {
              ...prev,
              status: 'clocked-out',
              clockStatus: 'clocked-out',
              clockOut: updatedEntry?.clockOut ? new Date(updatedEntry.clockOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : new Date().toTimeString().slice(0, 5)
            }
            : prev
        );

        triggerClockRefresh({
          action: 'ADMIN_CLOCK_OUT',
          employeeId: employeeId,
          employeeName: employee?.firstName && employee?.lastName
            ? `${employee.firstName} ${employee.lastName}`
            : 'Employee',
          adminName: currentUser?.firstName && currentUser?.lastName
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : 'Admin',
          hoursWorked: response.data?.hoursWorked || 0,
          timestamp: Date.now()
        });

        setTimeout(() => {
          fetchData();
          fetchMyStatus();
        }, 500);
      } else {
        toast.error(response.message || 'Failed to clock out');
        await fetchData();
        await fetchMyStatus();
      }
    } catch (error) {
      console.error('Clock out error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to clock out';
      toast.error(`Clock out failed: ${errorMessage}`);
      await fetchData();
      await fetchMyStatus();
    }
  };

  const handleOnBreak = async (employeeId) => {
    if (!employeeId) {
      toast.error('Invalid employee ID');
      return;
    }

    const employee = employees.find(emp => isSameEmployee(emp, employeeId));
    const isCurrentUser = currentUser?.email === employee?.email;

    setEmployees(prevEmployees =>
      prevEmployees.map(emp =>
        isSameEmployee(emp, employeeId)
          ? { ...emp, status: 'on-break', clockStatus: 'on-break' }
          : emp
      )
    );

    setSelectedEmployee(prev =>
      prev && isSameEmployee(prev, employeeId)
        ? { ...prev, status: 'on-break', clockStatus: 'on-break' }
        : prev
    );

    try {
      let response;

      if (isCurrentUser) {
        response = await userStartBreak();
      } else {
        response = await setOnBreak(employeeId);
      }

      if (response.success) {
        toast.success(isCurrentUser ? 'You are now on break' : 'Employee is now on break');

        setEmployees(prevEmployees =>
          prevEmployees.map(emp =>
            isSameEmployee(emp, employeeId)
              ? { ...emp, status: 'on-break', clockStatus: 'on-break' }
              : emp
          )
        );

        setSelectedEmployee(prev =>
          prev && isSameEmployee(prev, employeeId)
            ? { ...prev, status: 'on-break', clockStatus: 'on-break' }
            : prev
        );

        triggerClockRefresh({
          action: isCurrentUser ? 'START_BREAK' : 'ADMIN_START_BREAK',
          employeeId: employeeId,
          employeeName: employee?.firstName && employee?.lastName
            ? `${employee.firstName} ${employee.lastName}`
            : 'Employee',
          timestamp: Date.now()
        });

        setTimeout(async () => {
          await fetchData();
          await fetchMyStatus();
        }, 1000);
      } else {
        toast.error(response.message || 'Failed to set on break');
        await fetchData();
      }
    } catch (error) {
      console.error('Set on break error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to set on break');
      await fetchData();
    }
  };

  const handleStatusChange = async (employeeId, newStatus) => {
    if (!employeeId) {
      toast.error('Invalid employee ID');
      return;
    }

    const actualStatus = newStatus === 'resume_work' ? 'clocked-in' : newStatus;
    setEmployees(prevEmployees =>
      prevEmployees.map(emp =>
        isSameEmployee(emp, employeeId)
          ? { ...emp, status: actualStatus, clockStatus: actualStatus }
          : emp
      )
    );

    setSelectedEmployee(prev =>
      prev && isSameEmployee(prev, employeeId)
        ? { ...prev, status: actualStatus, clockStatus: actualStatus }
        : prev
    );

    try {
      const response = await changeEmployeeStatus(employeeId, actualStatus);
      if (response.success) {
        const displayStatus = newStatus === 'resume_work' ? 'resumed work' : actualStatus.replace('_', ' ');
        toast.success(`Status changed to ${displayStatus} successfully`);

        const employee = employees.find(emp => isSameEmployee(emp, employeeId));
        triggerClockRefresh({
          action: newStatus === 'resume_work' ? 'RESUME_WORK' : 'STATUS_CHANGE',
          employeeId: employeeId,
          employeeName: employee?.firstName && employee?.lastName
            ? `${employee.firstName} ${employee.lastName}`
            : 'Employee',
          newStatus: actualStatus,
          timestamp: Date.now()
        });

        await fetchData();
        await fetchMyStatus();
      } else {
        toast.error(response.message || 'Failed to change status');
        await fetchData();
      }
    } catch (error) {
      console.error('Status change error:', error);
      toast.error(error.message || 'Failed to change status');
      await fetchData();
    }
  };

  const handleDeleteTimeEntry = async () => {
    if (!entryToDelete.id) {
      toast.error('No time entry to delete');
      return;
    }

    try {
      const response = await deleteTimeEntry(entryToDelete.id);
      if (response.success) {
        toast.success('Time entry deleted successfully');
        await fetchData();
        setSelectedEmployee(null);
      } else {
        toast.error(response.message || 'Failed to delete time entry');
        await fetchData();
      }
    } catch (error) {
      console.error('Delete time entry error:', error);
      toast.error(error.message || 'Failed to delete time entry');
      await fetchData();
    }
  };

  const handleEditEntry = (employee) => {
    if (!employee.timeEntryId) {
      toast.error('No time entry to edit. Employee must be clocked in first.');
      return;
    }

    setEditingEntry(employee);
    setEditForm({
      date: new Date().toISOString().split('T')[0],
      clockIn: employee.clockIn || '09:00',
      clockOut: employee.clockOut || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateTimeEntry = async (e) => {
    e.preventDefault();

    if (!editingEntry?.timeEntryId) return;

    try {
      const { updateTimeEntry } = await import('../utils/clockApi');
      const response = await updateTimeEntry(editingEntry.timeEntryId, {
        clockIn: editForm.clockIn,
        clockOut: editForm.clockOut,
        date: editForm.date
      });

      if (response.success) {
        toast.success('Time entry updated successfully');
        setShowEditModal(false);
        fetchData();
      } else {
        toast.error(response.message || 'Failed to update');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update time entry');
    }
  };

  const getCurrentUKTime = () => {
    const now = new Date();
    return now.toLocaleString("en-GB", {
      timeZone: "Europe/London",
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  };

  const renderStatusPill = (status) => {
    let displayStatus = status;
    if (status === 'absent' || !status) {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      if (now < endOfDay) {
        displayStatus = 'none';
      } else {
        displayStatus = 'absent';
      }
    }

    const labels = {
      'clocked-in': 'Clocked In',
      'clocked-out': 'Clocked Out',
      'on-break': 'On Break',
      'absent': 'Absent',
      'on-leave': 'On Leave',
      'none': 'None'
    };
    const classMap = {
      'clocked-in': 'status-clockedin',
      'clocked-out': 'status-clockedout',
      'on-break': 'status-onbreak',
      'absent': 'status-absent',
      'on-leave': 'status-onleave',
      'none': 'status-none'
    };
    const cls = classMap[displayStatus] || 'status-none';
    return (
      <span className={`row-status ${cls}`}>
        <span className="row-status-dot"></span>
        {labels[displayStatus] || 'Unknown'}
      </span>
    );
  };

  const filteredEmployees = employees
    .filter(employee => {
      if (statusFilter) {
        if (!employee.status || employee.status !== statusFilter) return false;
      }
      return true;
    })
    .filter(employee => {
      const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
        employee.employeeId?.toString().includes(searchTerm) ||
        employee.email?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedEmployees = filteredEmployees.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, filters]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      if (start > 2) pages.push('ellipsis-start');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('ellipsis-end');
      pages.push(totalPages);
    }
    return pages;
  };

  if (loading) {
    return <LoadingScreen />;
  }

  // Filtered employees for the search dropdown
  const dropdownEmployees = employees.filter(emp => {
    if (!employeeSearchTerm) return true;
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const search = employeeSearchTerm.toLowerCase();
    return fullName.includes(search) ||
      emp.email?.toLowerCase().includes(search) ||
      emp.vtid?.toString().includes(search);
  }).slice(0, 15);

  // Determine which top-action button state we're in
  const onBreakable = selectedFromSearch && selectedEmployee?.status === 'clocked-in';
  const clockOutable = selectedFromSearch && (selectedEmployee?.status === 'clocked-in' || selectedEmployee?.status === 'on-break');

  return (
    <>
      <style>{styles}</style>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="ci-root">
        <div className="ci-shell">

          {/* ── Page Header ── */}
          <div className="header-row anim-fade-up">
            <div className="header-block">
              <div className="header-icon-wrap">
                <svg style={{ width: 18, height: 18, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="header-eyebrow">Attendance Console</p>
                <h1 className="header-title">Clock-ins</h1>
                <p className="header-meta">
                  <span className="live-dot"></span>
                  Last updated <strong style={{ color: '#354f52', fontWeight: 600 }}>{getCurrentUKTime()}</strong>
                  <span style={{ color: '#b6c0b9' }}>·</span>
                  <span>UK Time</span>
                </p>
              </div>
            </div>

            <div className="action-cluster">
              {/* Searchable employee input */}
              <div className="emp-search-wrap">
                <span className="emp-search-icon">
                  <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search employee to clock in…"
                  value={employeeSearchTerm}
                  onChange={(e) => {
                    setEmployeeSearchTerm(e.target.value);
                    setShowEmployeeDropdown(true);
                    if (!e.target.value) {
                      setSelectedEmployee(null);
                      setSelectedFromSearch(false);
                    }
                  }}
                  onFocus={() => setShowEmployeeDropdown(true)}
                  className="emp-search-input"
                />
                {employeeSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeSearchTerm('');
                      setSelectedEmployee(null);
                      setSelectedFromSearch(false);
                      setShowEmployeeDropdown(false);
                    }}
                    className="emp-search-clear"
                    aria-label="Clear"
                  >
                    <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                {showEmployeeDropdown && (
                  <div className="emp-dropdown">
                    {dropdownEmployees.length > 0 ? (
                      dropdownEmployees.map(emp => (
                        <div
                          key={emp.id || emp._id}
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setEmployeeSearchTerm(`${emp.firstName} ${emp.lastName}`);
                            setShowEmployeeDropdown(false);
                            setSelectedFromSearch(true);
                          }}
                          className="emp-option"
                        >
                          <div className="emp-option-name">
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="emp-option-meta">
                            {emp.email} · {emp.vtid || 'No VTID'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="emp-dropdown-empty">
                        {employeeSearchTerm
                          ? 'No employees found'
                          : (employees.length === 0 ? 'No employees available' : 'Start typing to search')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Add Break button */}
              {selectedEmployee && selectedEmployee.status === 'clocked-in' && (
                <button
                  onClick={() => handleOnBreak(selectedEmployee.id || selectedEmployee._id)}
                  className="btn btn-warn"
                  type="button"
                >
                  Add Break
                </button>
              )}

              {/* Clock Out / Clock In primary action */}
              {clockOutable ? (
                <button
                  onClick={() => handleClockOut(selectedEmployee.id || selectedEmployee._id)}
                  className="btn btn-danger"
                  type="button"
                >
                  Clock Out
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (!selectedFromSearch) {
                      toast.warning('Please use the search bar above to select an employee for clock-in');
                      return;
                    }
                    if (selectedEmployee) {
                      openClockInModal(selectedEmployee);
                    } else {
                      toast.warning('Please select an employee from the search bar');
                    }
                  }}
                  disabled={!selectedFromSearch || !selectedEmployee}
                  className="btn btn-success"
                  type="button"
                >
                  Clock In
                </button>
              )}
            </div>
          </div>

          {/* ── Stat Cards ── */}
          <div className="stats-grid anim-fade-up delay-100">
            <button
              type="button"
              onClick={() => { setStatusFilter(null); setSearchTerm(''); }}
              className={`stat-card variant-all ${statusFilter === null ? 'is-selected' : ''}`}
            >
              <div className="stat-card-row">
                <span className="stat-label">All Employees</span>
                <span className="stat-status-dot"></span>
              </div>
              <p className={`stat-value ${statsLoading ? 'stat-loading' : ''}`}>
                {statsLoading ? '…' : (stats?.total ?? employees.length)}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'clocked-in' ? null : 'clocked-in')}
              className={`stat-card variant-clockedin ${statusFilter === 'clocked-in' ? 'is-selected' : ''}`}
            >
              <div className="stat-card-row">
                <span className="stat-label">Clocked In</span>
                <span className="stat-status-dot"></span>
              </div>
              <p className={`stat-value ${statsLoading ? 'stat-loading' : ''}`}>
                {statsLoading ? '…' : (stats?.clockedIn ?? 0)}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'clocked-out' ? null : 'clocked-out')}
              className={`stat-card variant-clockedout ${statusFilter === 'clocked-out' ? 'is-selected' : ''}`}
            >
              <div className="stat-card-row">
                <span className="stat-label">Clocked Out</span>
                <span className="stat-status-dot"></span>
              </div>
              <p className={`stat-value ${statsLoading ? 'stat-loading' : ''}`}>
                {statsLoading ? '…' : (stats?.clockedOut ?? 0)}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'on-break' ? null : 'on-break')}
              className={`stat-card variant-onbreak ${statusFilter === 'on-break' ? 'is-selected' : ''}`}
            >
              <div className="stat-card-row">
                <span className="stat-label">On a Break</span>
                <span className="stat-status-dot"></span>
              </div>
              <p className={`stat-value ${statsLoading ? 'stat-loading' : ''}`}>
                {statsLoading ? '…' : (stats?.onBreak ?? 0)}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'absent' ? null : 'absent')}
              className={`stat-card variant-absent ${statusFilter === 'absent' ? 'is-selected' : ''}`}
            >
              <div className="stat-card-row">
                <span className="stat-label">Absent</span>
                <span className="stat-status-dot"></span>
              </div>
              <p className={`stat-value ${statsLoading ? 'stat-loading' : ''}`}>
                {statsLoading ? '…' : (stats?.absent ?? 0)}
              </p>
            </button>
          </div>

          {/* ── Filter Bar ── */}
          <div className="filter-card anim-fade-up delay-200">
            <div className="filter-row">
              <div className="filter-search-wrap">
                <span className="filter-search-icon">
                  <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search by name, VTID or email…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="filter-search-input"
                />
              </div>
              <span className="filter-meta">10 entries per page</span>
            </div>

            <div className="filter-actions">
              <button
                onClick={() => {
                  setFilters({
                    role: 'All Roles',
                    staffType: 'All Staff Types',
                    company: 'All Companies',
                    manager: 'All Managers'
                  });
                  setSearchTerm('');
                  setStatusFilter(null);
                }}
                className="btn btn-secondary"
                type="button"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="table-card anim-fade-up delay-300">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>SI No.</th>
                    <th className="col-empid">Employee ID</th>
                    <th>Name</th>
                    <th className="col-email">Email</th>
                    <th className="col-jobtitle">Job Title</th>
                    <th className="col-office">Office</th>
                    <th className="col-clockin">Clock In</th>
                    <th className="col-clockout">Clock Out</th>
                    <th className="col-break">Break</th>
                    <th className="is-center">Status</th>
                    <th className="is-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEmployees.length > 0 ? (
                    displayedEmployees.map((employee, index) => {
                      const isSelectedRow = selectedEmployee?.id === employee.id || selectedEmployee?._id === employee._id;
                      const isMe = currentUser?.email === employee.email;
                      return (
                        <tr
                          key={employee.id || employee._id || index}
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowTimesheetModal(true);
                          }}
                          className={isSelectedRow ? 'is-selected' : ''}
                        >
                          <td className="td-index">{startIndex + index + 1}</td>
                          <td className="col-empid">{employee.employeeId || '-'}</td>
                          <td>
                            <span className="name-line">
                              <span className="cell-truncate" style={{ maxWidth: 160 }}>{`${employee.firstName || ''} ${employee.lastName || ''}`.trim() || '-'}</span>
                              {isMe && <span className="me-badge">ME</span>}
                            </span>
                          </td>
                          <td className="td-muted col-email">
                            <span className="cell-truncate">{employee.email || '-'}</span>
                          </td>
                          <td className="col-jobtitle">
                            <span className="cell-truncate" style={{ maxWidth: 140 }}>{employee.jobTitle || '-'}</span>
                          </td>
                          <td className="td-muted col-office">
                            <span className="cell-truncate" style={{ maxWidth: 120 }}>{employee.office || '-'}</span>
                          </td>
                          <td className="col-clockin">{formatUKTimeOnly(employee.clockIn) || '-'}</td>
                          <td className="col-clockout">{formatUKTimeOnly(employee.clockOut) || '-'}</td>
                          <td className="td-muted col-break">
                            {employee.breakIn && employee.breakOut
                              ? `${formatUKTimeOnly(employee.breakIn)} – ${formatUKTimeOnly(employee.breakOut)}`
                              : employee.breakIn
                                ? `${formatUKTimeOnly(employee.breakIn)} (on break)`
                                : '-'}
                          </td>
                          <td className="is-center">
                            {renderStatusPill(employee.status || 'absent')}
                          </td>
                          <td className="is-center" onClick={(e) => e.stopPropagation()}>
                            <div className="row-actions">
                              {(employee.status === 'absent' || employee.status === 'clocked-out' || !employee.status) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openClockInModal(employee); }}
                                  className="row-action-btn row-clockin"
                                  type="button"
                                >
                                  Clock In
                                </button>
                              )}
                              {(employee.status === 'clocked-in' || employee.status === 'on-break') && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleClockOut(employee.id || employee._id); }}
                                  className="row-action-btn row-clockout"
                                  type="button"
                                >
                                  Clock Out
                                </button>
                              )}
                              {employee.status === 'clocked-in' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleOnBreak(employee.id || employee._id); }}
                                  className="row-action-btn row-break"
                                  type="button"
                                >
                                  Break
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEmployee(employee);
                                  setShowTimesheetModal(true);
                                }}
                                className="row-action-btn row-details"
                                type="button"
                                title="View timesheet details"
                              >
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="table-empty-row">
                      <td colSpan="11">
                        <div className="empty-icon-wrap">
                          <svg style={{ width: 28, height: 28, color: '#84a98c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <h3 className="empty-title">No Employees Found</h3>
                        <p className="empty-text">
                          {searchTerm ? 'Try adjusting your search criteria.' : 'No employees in the system.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination ── */}
          {filteredEmployees.length > 0 && totalPages > 1 && (
            <div className="pagination-wrap">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>
                  {getPageNumbers().map((pageNum) => {
                    if (typeof pageNum === 'string' && pageNum.startsWith('ellipsis')) {
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => handlePageChange(pageNum)}
                          isActive={pageNum === currentPage}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              <div className="pagination-meta">
                Showing <strong>{startIndex + 1}</strong> to <strong>{Math.min(endIndex, filteredEmployees.length)}</strong> of <strong>{filteredEmployees.length}</strong> entries
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ══════════════════════════════════════
           EDIT TIME ENTRY MODAL
      ══════════════════════════════════════ */}
      {showEditModal && editingEntry && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
        >
          <div className="modal-box">
            <div className="modal-header">
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="modal-eyebrow">Adjust Entry</p>
                <h2 className="modal-title">Edit Time Entry</h2>
                <p className="modal-subtitle">
                  {editingEntry.firstName} {editingEntry.lastName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="modal-close"
                aria-label="Close"
              >
                <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateTimeEntry} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
              <div className="modal-body">
                <div style={{ marginBottom: '1.25rem' }}>
                  <DatePicker
                    label="Date"
                    required
                    value={editForm.date || null}
                    onChange={(date) => setEditForm({ ...editForm, date: date ? date.format('YYYY-MM-DD') : '' })}
                  />
                </div>
                <div className="field-grid-2">
                  <div>
                    <MUITimePicker
                      label="Clock In Time"
                      value={editForm.clockIn}
                      onChange={(time) => setEditForm({ ...editForm, clockIn: time ? time.format('HH:mm') : '' })}
                      required
                    />
                  </div>
                  <div>
                    <MUITimePicker
                      label="Clock Out Time"
                      value={editForm.clockOut}
                      onChange={(time) => setEditForm({ ...editForm, clockOut: time ? time.format('HH:mm') : '' })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
           CLOCK-IN CONFIRMATION MODAL
      ══════════════════════════════════════ */}
      {showClockInModal && clockInEmployee && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowClockInModal(false); }}
        >
          <div className="clockin-modal-box">
            <div className="clockin-hero">
              <div className="clockin-hero-grid"></div>
              <div className="clockin-orb"></div>
              <div className="clockin-hero-content">
                <p className="clockin-eyebrow">Clock-in Confirmation</p>
                <div className="clockin-avatar">
                  {clockInEmployee.firstName?.[0]}{clockInEmployee.lastName?.[0]}
                </div>
                <h3 className="clockin-emp-name">
                  {clockInEmployee.firstName} {clockInEmployee.lastName}
                </h3>
                <p className="clockin-emp-dept">
                  {clockInEmployee.department || 'Employee'}
                </p>
              </div>
            </div>

            <div className="clockin-content">
              <h4 className="clockin-headline">Confirm clock in</h4>
              <p className="clockin-blurb">
                You are about to clock in <strong>{clockInEmployee.firstName} {clockInEmployee.lastName}</strong>.
                This action will be recorded with a timestamp and, if available, a location.
              </p>

              <div className="clockin-actions">
                <button
                  type="button"
                  onClick={() => setShowClockInModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmClockIn}
                  className="btn btn-primary"
                >
                  Confirm Clock In
                </button>
              </div>

              {clockInGeoLocation && (
                <div className="geo-pill">
                  <p className="geo-pill-title">
                    <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Location captured
                  </p>
                  <div className="geo-pill-rows">
                    <div><strong>Coordinates:</strong> {clockInGeoLocation.latitude.toFixed(6)}, {clockInGeoLocation.longitude.toFixed(6)}</div>
                    <div><strong>Accuracy:</strong> ±{Math.round(clockInGeoLocation.accuracy)}m</div>
                    <div><strong>Time:</strong> {clockInGeoLocation.timestamp}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee Timesheet Modal */}
      {selectedEmployee && showTimesheetModal && (
        <EmployeeTimesheetModal
          employee={selectedEmployee}
          onClose={() => {
            setSelectedEmployee(null);
            setShowTimesheetModal(false);
          }}
        />
      )}

      {/* Delete Time Entry Confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Time Entry"
        description={`Are you sure you want to delete the time entry for ${entryToDelete.name}?\n\nThis will:\n- Delete the clock-in/out record\n- Reset the shift status to "Scheduled"\n\nThis action cannot be undone.`}
        onConfirm={handleDeleteTimeEntry}
        confirmText="Delete Entry"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  );
};

export default ClockIns;