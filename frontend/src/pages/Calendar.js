import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ClockIcon,
  DocumentTextIcon,
  PlusIcon,
  CalendarIcon as CalendarOutlineIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isBetween from 'dayjs/plugin/isBetween';
import axios from '../utils/axiosConfig';
import { DatePicker } from '../components/ui/date-picker';
import { buildApiUrl } from '../utils/apiConfig';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAlert } from '../components/AlertNotification';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { toast } from 'react-toastify';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .cal-root {
    font-family: 'DM Sans', sans-serif;
    -webkit-text-size-adjust: 100%;
    background: #f7f8f6;
    min-height: 100vh;
    padding: 2rem;
    position: relative;
  }
  .cal-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
  }
  .cal-shell { position: relative; z-index: 1; max-width: 1600px; margin: 0 auto; }

  /* ── Keyframes ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-ring {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50%      { opacity: 0.8; transform: scale(1.08); }
  }

  .anim-fade-up { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-fade-in { animation: fadeIn 0.3s ease both; }
  .delay-100 { animation-delay: 0.10s; }
  .delay-200 { animation-delay: 0.20s; }

  /* ══════════════════════════════════════
     PAGE HEADER
  ══════════════════════════════════════ */
  .page-header {
    margin-bottom: 1.5rem;
  }
  .page-header-row {
    display: flex; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap;
  }
  .page-icon-wrap {
    width: 42px; height: 42px; border-radius: 11px;
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
    font-size: 1.85rem; color: #2f3e46; line-height: 1.15; letter-spacing: -0.02em;
    margin: 0;
  }
  .page-subtitle {
    font-size: 0.82rem; color: #7a8e84; font-weight: 300;
    margin: 0.25rem 0 0;
  }

  /* ── Inline alerts (loading / error) ── */
  .info-banner {
    margin-top: 0.9rem;
    border-left: 3px solid #84a98c;
    background: linear-gradient(135deg, #f0f5f2, #eaf2ec);
    border-radius: 8px;
    padding: 0.7rem 0.95rem;
    display: flex; align-items: center; gap: 0.55rem;
  }
  .info-banner-text {
    font-size: 0.78rem; color: #2f3e46; font-weight: 400; line-height: 1.5; margin: 0;
  }
  .warn-banner {
    margin-top: 0.9rem;
    border-left: 3px solid #b89758;
    background: linear-gradient(135deg, #fdf8ed, #fbf2dd);
    border-radius: 8px;
    padding: 0.7rem 0.95rem;
  }
  .warn-banner-text {
    font-size: 0.78rem; color: #6b5524; font-weight: 400; line-height: 1.5; margin: 0;
  }

  /* ══════════════════════════════════════
     TABS
  ══════════════════════════════════════ */
  .tabs-bar {
    display: flex; gap: 0.25rem;
    border-bottom: 1px solid #eaefeb;
    margin-bottom: 1.25rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .tabs-bar::-webkit-scrollbar { display: none; }
  .tab-btn {
    background: none; border: none;
    padding: 0.75rem 1.1rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem; font-weight: 500;
    color: #7a8e84;
    cursor: pointer;
    position: relative;
    display: inline-flex; align-items: center; gap: 0.5rem;
    transition: color 0.2s;
    white-space: nowrap;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    -webkit-tap-highlight-color: transparent;
  }
  .tab-btn:hover { color: #354f52; }
  .tab-btn.is-active {
    color: #354f52;
    border-bottom-color: #52796f;
    font-weight: 600;
  }
  .tab-pill {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.1rem 0.5rem;
    font-size: 0.65rem; font-weight: 600;
    border-radius: 999px;
    letter-spacing: 0.02em;
  }
  .tab-pill-sage { background: rgba(132,169,140,0.15); color: #354f52; }
  .tab-pill-success { background: rgba(82,121,111,0.18); color: #354f52; }
  .tab-pill-error { background: rgba(192,117,106,0.15); color: #7a3028; }

  /* ══════════════════════════════════════
     SHARED CARDS
  ══════════════════════════════════════ */
  .surface {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
  }
  .surface-pad { padding: 1.5rem; }

  .section-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.35rem; font-weight: 400; color: #2f3e46;
    letter-spacing: -0.01em; margin: 0 0 1rem;
  }

  /* ══════════════════════════════════════
     CALENDAR HEADER (inside calendar surface)
  ══════════════════════════════════════ */
  .cal-bar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
    padding: 1.1rem 1.5rem;
    border-bottom: 1px solid #eaefeb;
  }
  .cal-bar-left {
    display: flex; align-items: center; gap: 1.1rem; flex-wrap: wrap;
  }
  .cal-bar-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.3rem; font-weight: 400; color: #2f3e46;
    letter-spacing: -0.01em; margin: 0;
  }
  .month-nav {
    display: flex; align-items: center; gap: 0.4rem;
    background: #f7f8f6;
    border: 1px solid #eaefeb;
    border-radius: 10px;
    padding: 0.25rem 0.5rem;
  }
  .month-nav-btn {
    background: transparent; border: none; cursor: pointer;
    width: 30px; height: 30px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    color: #52796f;
    transition: background 0.2s, color 0.2s;
    -webkit-tap-highlight-color: transparent;
  }
  .month-nav-btn:hover { background: #eaefeb; color: #2f3e46; }
  .month-nav-label {
    font-size: 0.82rem; font-weight: 600; color: #354f52;
    letter-spacing: 0.01em;
    min-width: 8rem; text-align: center;
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
    box-shadow: 0 3px 12px rgba(82,121,111,0.25);
  }
  .btn-success:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(82,121,111,0.32);
  }
  .btn-success:disabled {
    background: #d4ddd6; color: #8fa99a;
    box-shadow: none; cursor: not-allowed;
  }
  .btn-danger {
    background: linear-gradient(135deg, #a35446 0%, #b85c50 100%);
    color: #fff;
    box-shadow: 0 3px 12px rgba(163,84,70,0.22);
  }
  .btn-danger:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(163,84,70,0.3);
  }
  .btn-secondary {
    background: #fff; color: #354f52;
    border: 1px solid #d4ddd6;
  }
  .btn-secondary:hover:not(:disabled) {
    background: #f0f5f2; border-color: #84a98c; color: #2f3e46;
  }
  .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ══════════════════════════════════════
     CALENDAR GRID
  ══════════════════════════════════════ */
  .cal-weekdays {
    display: grid; grid-template-columns: repeat(7, 1fr);
    border-bottom: 1px solid #eaefeb;
    background: #fafbfa;
  }
  .cal-weekday {
    padding: 0.7rem 0.5rem;
    text-align: center;
    font-size: 0.68rem; font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #84a98c;
  }
  .cal-weekday.weekend { color: #9ca3af; background: #fbfbfb; }
  .cal-grid {
    display: grid; grid-template-columns: repeat(7, 1fr);
  }
  .cal-cell {
    min-height: 95px;
    padding: 0.5rem;
    border-right: 1px solid #eaefeb;
    border-bottom: 1px solid #eaefeb;
    cursor: pointer;
    transition: background 0.15s;
    background: #fff;
    position: relative;
  }
  .cal-cell.weekend { background: #fbfbfb; opacity: 0.95; }
  .cal-cell:nth-child(7n) { border-right: none; }
  .cal-cell:hover { background: #f7f8f6; }
  .cal-cell.is-other-month { background: #fafbfa; }
  .cal-cell.is-other-month:hover { background: #f3f5f2; }
  .cal-cell.is-today { background: rgba(132,169,140,0.08); }
  .cal-cell.is-today:hover { background: rgba(132,169,140,0.14); }
  .cal-cell.is-selected {
    box-shadow: inset 0 0 0 2px #52796f;
    z-index: 1;
  }
  .cal-day-num {
    font-size: 0.82rem; font-weight: 500;
    color: #354f52;
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 22px; height: 22px;
    border-radius: 50%;
    padding: 0 0.25rem;
  }
  .cal-day-num.is-today {
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    color: #cad2c5;
    font-weight: 600;
  }
  .cal-day-num.is-other-month { color: #b6c0b9; }
  .cal-events {
    margin-top: 0.35rem;
    display: flex; flex-direction: column; gap: 0.2rem;
  }
  .cal-event {
    font-size: 0.66rem;
    padding: 0.2rem 0.4rem;
    border-radius: 5px;
    border-left: 2.5px solid;
    line-height: 1.3;
    overflow: hidden;
  }
  .cal-event-name {
    font-weight: 600;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .cal-event-time {
    font-size: 0.6rem; opacity: 0.85;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    margin-top: 0.05rem;
  }
  .cal-event-leave {
    background: rgba(132,169,140,0.15);
    border-left-color: #52796f;
    color: #2f3e46;
  }
  .cal-event-shift {
    background: rgba(82,121,111,0.12);
    border-left-color: #354f52;
    color: #2f3e46;
  }
  .cal-event-shift.is-completed {
    background: rgba(132,169,140,0.18);
    border-left-color: #6b8e7f;
  }
  .cal-event-shift.is-missed {
    background: rgba(192,117,106,0.12);
    border-left-color: #b85c50;
    color: #7a3028;
  }
  .cal-more-pill {
    font-size: 0.62rem; font-weight: 500;
    color: #84a98c;
    padding: 0.1rem 0.3rem;
    letter-spacing: 0.02em;
  }

  /* ══════════════════════════════════════
     MODAL — DAY DETAILS
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
    background: #fff; border-radius: 16px;
    width: 100%; max-width: 880px; max-height: 88vh;
    overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 32px 64px rgba(47,62,70,0.25);
    animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1);
  }
  .modal-header-dark {
    background: linear-gradient(135deg, #2f3e46 0%, #354f52 60%, #52796f 100%);
    padding: 1.4rem 1.5rem;
    position: relative; overflow: hidden;
    flex-shrink: 0;
  }
  .modal-header-dark::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 80% 20%, rgba(132,169,140,0.25) 0%, transparent 50%);
    pointer-events: none;
  }
  .modal-header-dark-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(202,210,197,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(202,210,197,0.04) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
  }
  .modal-header-dark-content {
    position: relative; z-index: 1;
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  }
  .modal-header-icon-wrap {
    width: 48px; height: 48px; border-radius: 12px;
    background: rgba(202,210,197,0.12);
    border: 1px solid rgba(202,210,197,0.2);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .modal-header-eyebrow {
    font-size: 0.6rem; font-weight: 500; letter-spacing: 0.18em;
    text-transform: uppercase; color: #84a98c;
    margin: 0;
  }
  .modal-header-title-light {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.45rem; font-weight: 400;
    color: #cad2c5; letter-spacing: -0.01em;
    margin: 0.1rem 0 0;
  }
  .modal-header-meta {
    margin-top: 0.4rem;
    display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;
    color: rgba(202,210,197,0.75);
    font-size: 0.75rem; font-weight: 300;
  }
  .modal-header-meta-item { display: inline-flex; align-items: center; gap: 0.3rem; }
  .modal-header-meta-sep { color: rgba(202,210,197,0.4); }
  .modal-close-light {
    background: rgba(202,210,197,0.1); border: 1px solid rgba(202,210,197,0.18);
    cursor: pointer; color: #cad2c5;
    width: 36px; height: 36px;
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .modal-close-light:hover {
    background: rgba(202,210,197,0.2);
  }

  .modal-body {
    flex: 1; overflow-y: auto;
    padding: 1.25rem 1.5rem;
    background: #f7f8f6;
    -webkit-overflow-scrolling: touch;
  }
  .modal-body-empty {
    display: flex; align-items: center; justify-content: center;
    min-height: 280px;
    text-align: center;
  }
  .empty-icon-circle {
    width: 80px; height: 80px;
    border-radius: 50%;
    background: rgba(132,169,140,0.12);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1.1rem;
  }
  .empty-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.45rem; font-weight: 400; color: #2f3e46;
    letter-spacing: -0.01em; margin: 0 0 0.4rem;
  }
  .empty-subtitle {
    font-size: 0.82rem; color: #7a8e84; font-weight: 300;
    margin: 0 0 1.25rem;
  }

  .day-grid {
    display: grid; grid-template-columns: 1fr; gap: 1rem;
  }
  @media (min-width: 880px) {
    .day-grid { grid-template-columns: 1fr 1fr; }
  }
  .day-section {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 1rem 1.1rem;
  }
  .day-section-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 0.85rem;
  }
  .day-section-title {
    display: flex; align-items: center; gap: 0.6rem;
    font-size: 0.95rem; font-weight: 600;
    color: #2f3e46; letter-spacing: -0.005em;
    margin: 0;
  }
  .day-section-icon-wrap {
    width: 30px; height: 30px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .day-section-icon-shift {
    background: rgba(82,121,111,0.14);
    color: #354f52;
  }
  .day-section-icon-leave {
    background: rgba(132,169,140,0.18);
    color: #354f52;
  }
  .day-section-count {
    padding: 0.15rem 0.55rem;
    font-size: 0.65rem; font-weight: 600;
    background: rgba(132,169,140,0.18);
    color: #354f52;
    border-radius: 999px;
    letter-spacing: 0.02em;
  }
  .day-section-list {
    display: flex; flex-direction: column; gap: 0.5rem;
    max-height: 360px; overflow-y: auto;
  }

  .event-card {
    background: #fafbfa;
    border: 1px solid #eaefeb;
    border-left: 3px solid #52796f;
    border-radius: 9px;
    padding: 0.8rem 0.9rem;
    transition: border-color 0.2s, background 0.2s;
  }
  .event-card:hover { background: #f0f5f2; border-left-color: #354f52; }
  .event-card.is-leave { border-left-color: #84a98c; }
  .event-card-row {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 0.6rem; margin-bottom: 0.5rem;
  }
  .event-card-name {
    font-size: 0.85rem; font-weight: 600; color: #2f3e46;
    margin: 0; line-height: 1.3;
  }
  .event-card-sub {
    font-size: 0.72rem; color: #7a8e84; font-weight: 400;
    margin: 0.15rem 0 0;
  }
  .event-card-status {
    padding: 0.2rem 0.55rem;
    font-size: 0.62rem; font-weight: 600;
    border-radius: 999px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .status-default { background: rgba(82,121,111,0.15); color: #354f52; }
  .status-completed { background: rgba(132,169,140,0.22); color: #2f3e46; }
  .status-missed { background: rgba(192,117,106,0.15); color: #7a3028; }
  .status-leave { background: rgba(132,169,140,0.2); color: #354f52; }

  .event-meta-row {
    display: flex; align-items: center; gap: 0.4rem;
    font-size: 0.72rem; color: #52796f; font-weight: 500;
    margin-top: 0.3rem;
  }
  .event-meta-strong { color: #2f3e46; font-weight: 600; }
  .event-quote {
    margin-top: 0.5rem;
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 7px;
    padding: 0.5rem 0.7rem;
    font-size: 0.72rem;
    color: #52796f;
    font-style: italic;
    line-height: 1.5;
  }

  .modal-footer {
    border-top: 1px solid #eaefeb;
    padding: 0.85rem 1.5rem;
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
    background: #fff; flex-shrink: 0;
  }
  .modal-footer-meta {
    font-size: 0.78rem; color: #7a8e84;
  }
  .modal-footer-meta strong { color: #354f52; font-weight: 600; }

  /* ══════════════════════════════════════
     MODAL — TIME OFF DRAWER (right side panel)
  ══════════════════════════════════════ */
  .drawer-overlay {
    position: fixed; inset: 0;
    z-index: 50;
    display: flex;
    animation: fadeIn 0.2s ease;
  }
  .drawer-backdrop {
    flex: 1;
    background: rgba(47,62,70,0.5);
    backdrop-filter: blur(3px);
    cursor: pointer;
  }
  .drawer-panel {
    width: 100%; max-width: 540px;
    background: #fff;
    box-shadow: -32px 0 64px rgba(47,62,70,0.2);
    overflow-y: auto;
    display: flex; flex-direction: column;
    -webkit-overflow-scrolling: touch;
    animation: drawerSlide 0.3s cubic-bezier(0.22,1,0.36,1);
  }
  @keyframes drawerSlide {
    from { transform: translateX(20px); opacity: 0; }
    to   { transform: translateX(0); opacity: 1; }
  }
  .drawer-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #eaefeb;
    flex-shrink: 0;
  }
  .drawer-title-block { display: flex; align-items: center; gap: 0.7rem; }
  .drawer-title-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 3px 10px rgba(53,79,82,0.18);
  }
  .drawer-eyebrow {
    font-size: 0.6rem; font-weight: 500; letter-spacing: 0.18em;
    text-transform: uppercase; color: #84a98c;
    margin: 0;
  }
  .drawer-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.3rem; font-weight: 400; color: #2f3e46;
    letter-spacing: -0.01em;
    margin: 0.1rem 0 0;
  }
  .drawer-close {
    background: none; border: none; cursor: pointer;
    color: #84a98c;
    width: 36px; height: 36px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
    -webkit-tap-highlight-color: transparent;
  }
  .drawer-close:hover { color: #2f3e46; background: #f0f5f2; }

  .drawer-body { padding: 1.4rem 1.5rem; flex: 1; }

  .field-group { margin-bottom: 1.25rem; }
  .field-label {
    display: block; font-size: 0.72rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #52796f; margin-bottom: 0.5rem;
  }
  .field-required { color: #b85c50; }
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
    min-height: 88px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .textarea-field:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }

  .field-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .field-grid-2 > div > * + * { margin-top: 0.5rem; }

  .summary-box {
    background: linear-gradient(135deg, #f0f5f2, #eaf2ec);
    border: 1px solid rgba(132,169,140,0.25);
    border-radius: 10px;
    padding: 0.85rem 1rem;
    margin-bottom: 1.25rem;
  }
  .summary-text {
    font-size: 0.8rem; color: #354f52; font-weight: 400;
    line-height: 1.6; margin: 0;
  }
  .summary-text strong { color: #2f3e46; font-weight: 600; }

  .drawer-actions {
    display: flex; justify-content: flex-end; gap: 0.6rem;
    padding-top: 0.5rem;
    border-top: 1px solid #eaefeb;
    margin-top: 0.5rem;
    padding-top: 1.25rem;
  }

  /* ══════════════════════════════════════
     REQUEST CARDS
  ══════════════════════════════════════ */
  .req-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @media (min-width: 1280px) { .req-grid { grid-template-columns: 1fr 1fr; } }
  @media (min-width: 1600px) { .req-grid { grid-template-columns: 1fr 1fr 1fr; } }

  .req-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 1.1rem 1.15rem;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
    height: 100%;
    display: flex; flex-direction: column;
  }
  .req-card:hover {
    border-color: #84a98c;
    box-shadow: 0 6px 18px rgba(53,79,82,0.08);
    transform: translateY(-1px);
  }
  .req-card-head {
    display: flex; align-items: center; gap: 0.75rem;
    margin-bottom: 0.85rem;
  }
  .req-avatar {
    width: 40px; height: 40px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.72rem; font-weight: 600;
    color: #cad2c5;
    flex-shrink: 0;
    border: 2px solid #fff;
    box-shadow: 0 2px 6px rgba(53,79,82,0.15);
  }
  .req-avatar-sage {
    background: linear-gradient(135deg, #52796f 0%, #84a98c 100%);
  }
  .req-avatar-success {
    background: linear-gradient(135deg, #354f52 0%, #6b8e7f 100%);
  }
  .req-avatar-danger {
    background: linear-gradient(135deg, #a35446 0%, #c0756a 100%);
  }
  .req-avatar-amber {
    background: linear-gradient(135deg, #b89758 0%, #d1b076 100%);
  }
  .req-name {
    font-size: 0.88rem; font-weight: 600; color: #2f3e46;
    margin: 0; line-height: 1.3;
  }
  .req-email {
    font-size: 0.72rem; color: #7a8e84; font-weight: 400;
    margin: 0.1rem 0 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .req-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem 1rem;
    margin-bottom: 0.85rem;
  }
  .req-meta-label {
    font-size: 0.62rem; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #84a98c;
    margin: 0 0 0.2rem;
  }
  .req-meta-value {
    font-size: 0.78rem; font-weight: 500; color: #354f52;
    margin: 0;
  }
  .leave-pill {
    display: inline-flex;
    padding: 0.18rem 0.55rem;
    font-size: 0.65rem; font-weight: 600;
    border-radius: 999px;
    letter-spacing: 0.04em;
  }
  .leave-pill-sage { background: rgba(132,169,140,0.18); color: #354f52; }
  .leave-pill-sick { background: rgba(192,117,106,0.15); color: #7a3028; }
  .leave-pill-casual { background: rgba(82,121,111,0.15); color: #354f52; }
  .leave-pill-success { background: rgba(132,169,140,0.22); color: #2f3e46; }
  .leave-pill-danger { background: rgba(192,117,106,0.15); color: #7a3028; }
  .leave-pill-amber { background: rgba(184,151,88,0.18); color: #6b5524; }
  .leave-pill-pending { background: rgba(184,151,88,0.18); color: #6b5524; }

  .req-reason {
    background: #f7f8f6;
    border: 1px solid #eaefeb;
    border-radius: 8px;
    padding: 0.65rem 0.8rem;
    margin-bottom: 0.85rem;
  }
  .req-reason-label {
    font-size: 0.6rem; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #84a98c;
    margin: 0 0 0.25rem;
  }
  .req-reason-text {
    font-size: 0.78rem; color: #354f52; font-weight: 400;
    margin: 0; line-height: 1.5;
  }
  .req-rejection {
    background: linear-gradient(135deg, #fdf3f2, #fdecea);
    border: 1px solid rgba(192,117,106,0.18);
    border-left: 3px solid #c0756a;
    border-radius: 8px;
    padding: 0.65rem 0.8rem;
    margin-bottom: 0.85rem;
  }
  .req-rejection-label {
    font-size: 0.6rem; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #b85c50;
    margin: 0 0 0.25rem;
  }
  .req-rejection-text {
    font-size: 0.78rem; color: #7a3028; font-weight: 400;
    margin: 0; line-height: 1.5;
  }
  .req-actions {
    display: flex; gap: 0.5rem;
    padding-top: 0.85rem;
    border-top: 1px solid #eaefeb;
    margin-top: auto;
  }
  .req-actions .btn { flex: 1; }

  /* ── Filter bar ── */
  .filter-bar {
    background: #fafbfa;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 1rem 1.15rem;
    margin-bottom: 1.25rem;
  }
  .filter-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.85rem;
    align-items: end;
  }
  @media (min-width: 640px) {
    .filter-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (min-width: 1024px) {
    .filter-grid { grid-template-columns: 1fr 1fr auto auto; }
  }

  /* ══════════════════════════════════════
     EMPTY / LOADING
  ══════════════════════════════════════ */
  .center-state {
    text-align: center; padding: 3rem 1rem;
  }
  .center-state-icon-wrap {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: rgba(132,169,140,0.1);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1rem;
  }
  .center-state-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.3rem; font-weight: 400; color: #2f3e46;
    letter-spacing: -0.01em; margin: 0 0 0.4rem;
  }
  .center-state-text {
    font-size: 0.82rem; color: #7a8e84; font-weight: 300;
    margin: 0;
  }
  .center-spinner {
    width: 32px; height: 32px;
    border: 2.5px solid rgba(82,121,111,0.18);
    border-top-color: #52796f;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto;
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1023px) {
    .cal-root { padding: 1.5rem; }
    .cal-bar { padding: 1rem 1.25rem; }
    .surface-pad { padding: 1.25rem; }
  }
  @media (max-width: 767px) {
    .cal-root { padding: 1rem; }
    .page-title { font-size: 1.55rem; }
    .cal-bar { padding: 0.9rem 1rem; flex-direction: column; align-items: stretch; gap: 0.85rem; }
    .cal-bar-left { width: 100%; justify-content: space-between; }
    .cal-cell { min-height: 70px; padding: 0.35rem; }
    .cal-day-num { font-size: 0.75rem; min-width: 20px; height: 20px; }
    .cal-event { font-size: 0.6rem; padding: 0.15rem 0.3rem; }
    .cal-event-time { display: none; }
    .surface-pad { padding: 1rem; }
    .field-grid-2 { grid-template-columns: 1fr; gap: 1rem; }
    .modal-header-dark { padding: 1.15rem 1.15rem; }
    .modal-header-title-light { font-size: 1.2rem; }
    .modal-header-icon-wrap { width: 40px; height: 40px; }
    .modal-body { padding: 1rem; }
    .drawer-panel { max-width: 100%; }
  }
  @media (max-width: 479px) {
    .cal-root { padding: 0.75rem; }
    .page-title { font-size: 1.35rem; }
    .surface { border-radius: 14px; }
    .cal-bar-title { font-size: 1.15rem; }
    .month-nav-label { min-width: 6.5rem; font-size: 0.78rem; }
    .cal-weekday { font-size: 0.6rem; padding: 0.55rem 0.25rem; letter-spacing: 0.08em; }
    .cal-cell { min-height: 60px; padding: 0.25rem; }
    .cal-day-num { font-size: 0.7rem; min-width: 18px; height: 18px; }
    .cal-event { font-size: 0.55rem; }
    .modal-overlay { padding: 0; align-items: flex-end; }
    .modal-box { border-radius: 20px 20px 0 0; max-height: 92vh; }
    .modal-header-dark { padding: 1rem; }
    .modal-header-title-light { font-size: 1.05rem; }
    .modal-header-meta { font-size: 0.7rem; gap: 0.5rem; }
    .modal-header-icon-wrap { width: 36px; height: 36px; }
    .drawer-overlay { padding: 0; }
    .drawer-panel { max-height: 92vh; border-radius: 20px 20px 0 0; }
    .drawer-overlay { align-items: flex-end; flex-direction: column; }
    .drawer-backdrop { width: 100%; flex: 1; }
    .drawer-header { padding: 1rem 1.15rem; }
    .drawer-body { padding: 1.15rem; }
    .textarea-field { font-size: 16px; }
    .req-meta-grid { grid-template-columns: 1fr; gap: 0.65rem; }
    .tab-btn { padding: 0.65rem 0.85rem; font-size: 0.78rem; }
  }
`;

const Calendar = () => {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useAlert();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [leaveType, setLeaveType] = useState('Annual Leave');
  const [leaveReason, setLeaveReason] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [startHalfDay, setStartHalfDay] = useState('full');
  const [endHalfDay, setEndHalfDay] = useState('full');
  const [weekendWarning, setWeekendWarning] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [leaveRecords, setLeaveRecords] = useState([]);
  const [shiftAssignments, setShiftAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [expandedDay, setExpandedDay] = useState(null);
  const [dayDetails, setDayDetails] = useState([]);
  const [activeTab, setActiveTab] = useState('calendar');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [myLeaveRequests, setMyLeaveRequests] = useState([]);
  const [loadingMyLeaveRequests, setLoadingMyLeaveRequests] = useState(false);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [loadingApprovedRequests, setLoadingApprovedRequests] = useState(false);
  const [approvedFromDate, setApprovedFromDate] = useState('');
  const [approvedToDate, setApprovedToDate] = useState('');

  const [deniedRequests, setDeniedRequests] = useState([]);
  const [loadingDeniedRequests, setLoadingDeniedRequests] = useState(false);
  const [deniedFromDate, setDeniedFromDate] = useState('');
  const [deniedToDate, setDeniedToDate] = useState('');

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [actionRequestId, setActionRequestId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const isAdminUser = user?.role === 'admin' || user?.role === 'super-admin';
  const isManagerUser = ['manager', 'senior-manager', 'hr'].includes(String(user?.role || '').toLowerCase());

  useEffect(() => {
    fetchCalendarEvents();
    if (isAdminUser) {
      fetchPendingRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, isAdminUser]);

  useEffect(() => {
    if (activeTab === 'approved-requests' && (isAdminUser || isManagerUser)) {
      fetchApprovedRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdminUser, isManagerUser]);

  useEffect(() => {
    if (activeTab === 'denied-requests' && isAdminUser) {
      fetchDeniedRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdminUser]);

  useEffect(() => {
    if (activeTab === 'my-requests' && isManagerUser) {
      fetchMyLeaveRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isManagerUser]);

  const fetchCalendarEvents = async () => {
    setLoading(true);
    setError('');

    try {
      const startOfMonth = currentDate.startOf('month').format('YYYY-MM-DD');
      const endOfMonth = currentDate.endOf('month').format('YYYY-MM-DD');

      const leaveResponse = await axios.get(
        buildApiUrl('/leave/records'),
        {
          params: {
            startDate: startOfMonth,
            endDate: endOfMonth,
            status: 'approved'
          }
        }
      );

      const shiftResponse = await axios.get(
        buildApiUrl('/rota/shift-assignments/all'),
        {
          params: {
            startDate: startOfMonth,
            endDate: endOfMonth
          }
        }
      );

      setLeaveRecords(leaveResponse.data.data || []);
      setShiftAssignments(shiftResponse.data.data || []);

    } catch (error) {
      console.error('Error fetching calendar events:', error);
      setError('Failed to load calendar events. Using sample data.');
      setLeaveRecords([]);
      setShiftAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeniedRequests = async () => {
    if (!['admin', 'super-admin'].includes(user?.role)) return;

    setLoadingDeniedRequests(true);
    try {
      const params = {};
      if (deniedFromDate) params.startDate = deniedFromDate;
      if (deniedToDate) params.endDate = deniedToDate;
      const response = await axios.get('/api/leave/denied-requests', { params });
      setDeniedRequests(response.data.data || []);
    } catch (error) {
      console.error('Error fetching denied requests:', error);
      toast.error('Failed to load denied requests');
    } finally {
      setLoadingDeniedRequests(false);
    }
  };

  const fetchApprovedRequests = async () => {
    if (!(isAdminUser || isManagerUser)) return;

    setLoadingApprovedRequests(true);
    try {
      const params = {};
      if (approvedFromDate) params.startDate = approvedFromDate;
      if (approvedToDate) params.endDate = approvedToDate;
      const response = await axios.get('/api/leave/approved-requests', { params });
      setApprovedRequests(response.data.data || []);
    } catch (error) {
      console.error('Error fetching approved requests:', error);
      toast.error('Failed to load approved requests');
    } finally {
      setLoadingApprovedRequests(false);
    }
  };

  const fetchPendingRequests = async () => {
    if (!isAdminUser) return;

    setLoadingRequests(true);
    try {
      const response = await axios.get('/api/leave/pending-requests');
      setPendingRequests(response.data.data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      toast.error('Failed to load pending requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchMyLeaveRequests = async () => {
    if (!isManagerUser) return;

    setLoadingMyLeaveRequests(true);
    try {
      const response = await axios.get('/api/leave/my-requests');
      setMyLeaveRequests(response.data?.data || []);
    } catch (requestError) {
      console.error('Error fetching manager leave requests:', requestError);
      toast.error('Failed to load your time-off requests');
    } finally {
      setLoadingMyLeaveRequests(false);
    }
  };

  const handleCancelApprovedLeave = async (requestId) => {
    const confirmed = window.confirm('Cancel this approved leave request? This will remove it from approved leave and calendar views.');
    if (!confirmed) return;

    try {
      await axios.patch(`/api/leave/cancel/${requestId}`, {
        cancellationReason: 'Cancelled from calendar leave management'
      });
      toast.success('Approved leave cancelled');
      await Promise.all([
        fetchApprovedRequests(),
        fetchCalendarEvents(),
        isManagerUser ? fetchMyLeaveRequests() : Promise.resolve()
      ]);
    } catch (err) {
      console.error('Error cancelling approved leave:', err);
      toast.error(err.response?.data?.message || 'Failed to cancel approved leave');
    }
  };

  const isTimeOffLeaveRecord = (leave) => {
    const lt = (leave?.type || leave?.leaveType || '').toString().trim().toLowerCase();
    return lt !== 'absent' && lt !== 'absence' && lt !== 'missed';
  };

  const resolveDisplayName = (person) => {
    if (!person) return '';
    if (typeof person === 'string') {
      const value = person.trim();
      if (/^[a-f0-9]{24}$/i.test(value)) return '';
      return value;
    }
    const first = (person.firstName || person.first_name || '').toString().trim();
    const last = (person.lastName || person.last_name || '').toString().trim();
    const fullName = `${first} ${last}`.trim();
    if (fullName) return fullName;
    const name = (person.name || person.fullName || '').toString().trim();
    return name;
  };

  const getApprovedByName = (request) => {
    if (!request) return '-';
    const employeeId = (request.employeeId?._id || request.employeeId || '').toString();
    const approvedByName = resolveDisplayName(request.approvedBy);
    const approvedById = (request.approvedBy?._id || request.approvedBy || '').toString();

    if (approvedByName && (!employeeId || approvedById !== employeeId)) {
      return approvedByName;
    }
    const approverName = resolveDisplayName(request.approverId);
    if (approverName && ((request.approverId?._id || request.approverId || '').toString() !== employeeId)) {
      return approverName;
    }
    const approverUserName = resolveDisplayName(request.approvedByUserId);
    if (approverUserName) return approverUserName;

    const isApprovedByEmployee = approvedById && employeeId && approvedById === employeeId;
    const approverIdValue = (request.approverId?._id || request.approverId || '').toString();
    const isApproverEmployee = approverIdValue && employeeId && approverIdValue === employeeId;

    if (isApprovedByEmployee && isApproverEmployee) return '-';
    return approvedByName || approverName || '-';
  };

  const getDaysInMonth = (date) => {
    const firstDay = date.startOf('month');
    const lastDay = date.endOf('month');

    let startDay = firstDay.day();
    const daysFromMonday = startDay === 0 ? 6 : startDay - 1;

    const start = firstDay.subtract(daysFromMonday, 'day');

    let endDay = lastDay.day();
    const daysToSunday = endDay === 0 ? 0 : 7 - endDay;
    const end = lastDay.add(daysToSunday, 'day');

    const days = [];
    let current = start;
    while (current.isBefore(end) || current.isSame(end)) {
      days.push(current);
      current = current.add(1, 'day');
    }

    return days;
  };

  const handlePrevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentDate(currentDate.add(1, 'month'));
  const formatMonthYear = (date) => date.format('MMMM YYYY');
  const formatCalendarDateLabel = (value) => {
    if (!value) return '';
    const d = dayjs(value);
    return d.isValid() ? d.format('ddd D MMM YYYY') : String(value);
  };

  const getEventsForDate = (date) => {
    const events = [];
    const dateString = date.format('YYYY-MM-DD');

    leaveRecords.forEach(leave => {
      if (!isTimeOffLeaveRecord(leave)) return;
      const leaveStart = dayjs(leave.startDate).format('YYYY-MM-DD');
      const leaveEnd = dayjs(leave.endDate).format('YYYY-MM-DD');

      if (dateString >= leaveStart && dateString <= leaveEnd) {
        const employeeName = leave.user
          ? `${leave.user.firstName || ''} ${leave.user.lastName || ''}`.trim()
          : 'Unknown';

        events.push({
          type: 'leave',
          title: `${employeeName} — ${leave.type || 'Leave'}`,
          time: 'All day',
          variant: 'leave',
          data: leave,
          employeeName
        });
      }
    });

    shiftAssignments.forEach(shift => {
      const shiftDate = dayjs(shift.date).format('YYYY-MM-DD');

      if (shiftDate === dateString) {
        const employeeName = shift.employeeId
          ? `${shift.employeeId.firstName || ''} ${shift.employeeId.lastName || ''}`.trim()
          : 'Unassigned';

        let variant = 'shift';
        if (shift.status === 'Completed') variant = 'shift-completed';
        else if (shift.status === 'Missed' || shift.status === 'Cancelled') variant = 'shift-missed';

        events.push({
          type: 'shift',
          title: employeeName,
          subtitle: shift.location || 'Shift',
          time: `${shift.startTime || ''} - ${shift.endTime || ''}`,
          variant,
          employeeName,
          data: shift
        });
      }
    });

    return events;
  };

  const eventClassFor = (variant) => {
    if (variant === 'leave') return 'cal-event cal-event-leave';
    if (variant === 'shift-completed') return 'cal-event cal-event-shift is-completed';
    if (variant === 'shift-missed') return 'cal-event cal-event-shift is-missed';
    return 'cal-event cal-event-shift';
  };

  const statusClassFor = (status) => {
    const s = (status || '').toString().toLowerCase();
    if (s === 'completed') return 'event-card-status status-completed';
    if (s === 'missed' || s === 'cancelled') return 'event-card-status status-missed';
    return 'event-card-status status-default';
  };

  const fetchDayDetails = async (date) => {
    const dateString = date.format('YYYY-MM-DD');
    const details = [];

    leaveRecords.forEach(leave => {
      if (!isTimeOffLeaveRecord(leave)) return;
      const leaveStart = dayjs(leave.startDate).format('YYYY-MM-DD');
      const leaveEnd = dayjs(leave.endDate).format('YYYY-MM-DD');

      if (dateString >= leaveStart && dateString <= leaveEnd) {
        const employeeName = leave.user
          ? `${leave.user.firstName || ''} ${leave.user.lastName || ''}`.trim()
          : 'Unknown';
        const duration = dayjs(leave.endDate).diff(dayjs(leave.startDate), 'day') + 1;
        const isLongTerm = duration > 7;

        details.push({
          id: leave._id,
          type: 'leave',
          employeeName,
          startDate: dayjs(leave.startDate).format('ddd D MMM YY'),
          endDate: dayjs(leave.endDate).format('ddd D MMM YY'),
          duration: `${duration} day${duration > 1 ? 's' : ''}`,
          leaveType: leave.type || 'Annual leave',
          category: isLongTerm ? 'long-term' : 'short-term',
          status: leave.status || 'approved'
        });
      }
    });

    shiftAssignments.forEach(shift => {
      const shiftDate = dayjs(shift.date).format('YYYY-MM-DD');
      if (shiftDate === dateString) {
        const employeeName = shift.employeeId
          ? `${shift.employeeId.firstName || ''} ${shift.employeeId.lastName || ''}`.trim()
          : 'Unassigned';

        details.push({
          id: shift._id,
          type: 'shift',
          employeeName,
          startDate: dayjs(shift.date).format('ddd D MMM YY'),
          endDate: dayjs(shift.date).format('ddd D MMM YY'),
          duration: '1 day',
          leaveType: `${shift.location || 'Shift'} - ${shift.startTime || ''} to ${shift.endTime || ''}`,
          category: 'shift',
          status: shift.status || 'Scheduled'
        });
      }
    });

    setDayDetails(details);
  };

  const loadEmployees = async () => {
    try {
      const response = await axios.get(buildApiUrl('/employees'));
      const employeeData = response.data.data || [];
      const formattedEmployees = employeeData.map(emp => ({
        id: emp._id,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
        department: emp.department
      }));
      setEmployees(formattedEmployees);
    } catch (error) {
      console.error('Error loading employees:', error);
      setError('Failed to load employees');
    }
  };

  const checkWeekendDays = (start, end) => {
    if (!start || !end) {
      setWeekendWarning('');
      return;
    }
    try {
      let startDt, endDt;
      if (dayjs.isDayjs(start)) startDt = start;
      else if (start instanceof Date) startDt = dayjs(start);
      else if (typeof start === 'object' && start.$d) startDt = dayjs(start.$d);
      else startDt = dayjs(start);

      if (dayjs.isDayjs(end)) endDt = end;
      else if (end instanceof Date) endDt = dayjs(end);
      else if (typeof end === 'object' && end.$d) endDt = dayjs(end.$d);
      else endDt = dayjs(end);

      if (!startDt.isValid() || !endDt.isValid()) {
        setWeekendWarning('');
        return;
      }
      let hasWeekend = false;
      let current = startDt;
      while (current.isSameOrBefore(endDt)) {
        if (current.day() === 0 || current.day() === 6) {
          hasWeekend = true;
          break;
        }
        current = current.add(1, 'day');
      }
      if (hasWeekend) {
        setWeekendWarning('Weekends are not working days — time off will be added only for working days (Monday–Friday).');
      } else {
        setWeekendWarning('');
      }
    } catch (err) {
      console.error('Weekend check error:', err);
      setWeekendWarning('');
    }
  };

  const calculateWorkingDays = (start, end) => {
    if (!start || !end) return 0;
    try {
      let startDt, endDt;
      if (dayjs.isDayjs(start)) startDt = start;
      else if (start instanceof Date) startDt = dayjs(start);
      else if (typeof start === 'object' && start.$d) startDt = dayjs(start.$d);
      else startDt = dayjs(start);

      if (dayjs.isDayjs(end)) endDt = end;
      else if (end instanceof Date) endDt = dayjs(end);
      else if (typeof end === 'object' && end.$d) endDt = dayjs(end.$d);
      else endDt = dayjs(end);

      if (!startDt.isValid() || !endDt.isValid()) return 0;

      let workingDays = 0;
      let current = startDt;
      while (current.isSameOrBefore(endDt)) {
        if (current.day() !== 0 && current.day() !== 6) workingDays++;
        current = current.add(1, 'day');
      }
      if (startHalfDay !== 'full') workingDays -= 0.5;
      if (endHalfDay !== 'full' && !startDt.isSame(endDt)) workingDays -= 0.5;
      return Math.max(0, workingDays);
    } catch (err) {
      console.error('Working days calculation error:', err);
      return 0;
    }
  };

  const handleStartDateChange = (date) => {
    let dayjsDate = null;
    if (date) {
      try {
        if (dayjs.isDayjs(date)) dayjsDate = date;
        else if (date instanceof Date) dayjsDate = dayjs(date);
        else if (typeof date === 'object' && date.$d) dayjsDate = dayjs(date.$d);
        else if (typeof date === 'string') dayjsDate = dayjs(date);
        else dayjsDate = dayjs(date);
      } catch (err) {
        console.error('Date conversion error:', err);
        dayjsDate = null;
      }
    }
    setStartDate(dayjsDate);
    checkWeekendDays(dayjsDate, endDate);
  };

  const handleEndDateChange = (date) => {
    let dayjsDate = null;
    if (date) {
      try {
        if (dayjs.isDayjs(date)) dayjsDate = date;
        else if (date instanceof Date) dayjsDate = dayjs(date);
        else if (typeof date === 'object' && date.$d) dayjsDate = dayjs(date.$d);
        else if (typeof date === 'string') dayjsDate = dayjs(date);
        else dayjsDate = dayjs(date);
      } catch (err) {
        console.error('Date conversion error:', err);
        dayjsDate = null;
      }
    }
    setEndDate(dayjsDate);
    checkWeekendDays(startDate, dayjsDate);
  };

  const openTimeOffModal = () => {
    setShowTimeOffModal(true);
    loadEmployees();
  };

  const closeTimeOffModal = () => {
    setShowTimeOffModal(false);
    setSelectedEmployee('');
    setLeaveType('Annual Leave');
    setLeaveReason('');
    setStartDate(null);
    setEndDate(null);
    setStartHalfDay('full');
    setEndHalfDay('full');
    setWeekendWarning('');
  };

  const filterWorkingDays = (start, end) => {
    if (!start || !end) return { startDate: start, endDate: end };
    try {
      let startDt = dayjs.isDayjs(start) ? start : dayjs(start);
      let endDt = dayjs.isDayjs(end) ? end : dayjs(end);
      if (!startDt.isValid() || !endDt.isValid()) {
        return { startDate: startDt, endDate: endDt };
      }
      while (startDt.isSameOrBefore(endDt)) {
        if (startDt.day() !== 0 && startDt.day() !== 6) break;
        startDt = startDt.add(1, 'day');
      }
      while (endDt.isSameOrBefore(startDt) === false) {
        if (endDt.day() !== 0 && endDt.day() !== 6) break;
        endDt = endDt.subtract(1, 'day');
      }
      if (startDt.isAfter(endDt)) {
        return { startDate: startDt, endDate: startDt };
      }
      return { startDate: startDt, endDate: endDt };
    } catch (err) {
      console.error('Filter working days error:', err);
      return { startDate: start, endDate: end };
    }
  };

  const handleSubmitTimeOff = async () => {
    if (!isFormValid()) return;
    setSubmitting(true);
    try {
      const employeeId = selectedEmployee || user?.id || user?._id;
      if (!employeeId) {
        toast.error('Unable to identify employee');
        return;
      }
      const { startDate: workingStart, endDate: workingEnd } = filterWorkingDays(startDate, endDate);

      if (workingStart.isAfter(workingEnd)) {
        toast.error('No working days found in the selected date range. Please select a range that includes weekdays.');
        return;
      }
      const workingDays = calculateWorkingDays(workingStart, workingEnd);

      const response = await axios.post(
        '/api/leave/admin/time-off',
        {
          employeeId,
          leaveType: leaveType,
          startDate: workingStart.format('YYYY-MM-DD'),
          endDate: workingEnd.format('YYYY-MM-DD'),
          days: workingDays,
          reason: leaveReason,
          startHalfDay,
          endHalfDay
        }
      );

      if (response.data.success) {
        showSuccess(
          (user?.role === 'admin' || user?.role === 'super-admin')
            ? 'Time off added successfully (working days only).'
            : 'Time off request submitted for approval.'
        );
        closeTimeOffModal();
        fetchCalendarEvents();
      }
    } catch (err) {
      console.error('Submit time off error:', err);
      const isOverlapConflict = err.response?.status === 409 && err.response?.data?.conflictType === 'overlap';
      const errorMsg = isOverlapConflict
        ? err.response?.data?.message || 'An existing leave entry overlaps with the requested dates.'
        : err.response?.data?.message || 'Failed to submit leave request';
      showError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = () => {
    const hasValidReason = leaveReason && leaveReason.trim().length >= 10;
    if (user?.role === 'admin' || user?.role === 'super-admin') {
      return selectedEmployee && startDate && endDate && hasValidReason;
    }
    return startDate && endDate && hasValidReason;
  };

  const handleApproveRequest = async (requestId) => {
    try {
      await axios.patch(`/api/leave/approve/${requestId}`);
      toast.success('Leave request approved');
      fetchPendingRequests();
      fetchCalendarEvents();
    } catch (err) {
      console.error('Error approving request:', err);
      toast.error(err.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId, reason) => {
    try {
      await axios.patch(`/api/leave/reject/${requestId}`, { rejectionReason: reason });
      toast.success('Leave request rejected');
      fetchPendingRequests();
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast.error(err.response?.data?.message || 'Failed to reject request');
    }
  };

  const leavePillClass = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'sick') return 'leave-pill leave-pill-sick';
    if (t === 'casual') return 'leave-pill leave-pill-casual';
    return 'leave-pill leave-pill-sage';
  };

  const renderInitials = (request) => {
    const f = request.employeeId?.firstName?.[0] || '';
    const l = request.employeeId?.lastName?.[0] || '';
    return `${f}${l}`.toUpperCase();
  };

  return (
    <>
      <style>{styles}</style>
      <div className="cal-root">
        <div className="cal-shell">

          {/* ── Page Header ── */}
          <div className="page-header anim-fade-up">
            <div className="page-header-row">
              <div className="page-icon-wrap">
                <CalendarDaysIcon style={{ width: 22, height: 22, color: '#cad2c5' }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="page-eyebrow">Workforce Schedule</p>
                <h1 className="page-title">Calendar</h1>
                <p className="page-subtitle">Manage your schedule and view upcoming events.</p>
              </div>
            </div>

            {error && (
              <div className="warn-banner">
                <p className="warn-banner-text">{error}</p>
              </div>
            )}
            {loading && (
              <div className="info-banner">
                <p className="info-banner-text">Loading calendar events…</p>
              </div>
            )}
          </div>

          {/* ── Tabs ── */}
          {(isAdminUser || isManagerUser) && (
            <div className="tabs-bar anim-fade-up delay-100">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`tab-btn ${activeTab === 'calendar' ? 'is-active' : ''}`}
                type="button"
              >
                Calendar
              </button>
              {isAdminUser && (
                <button
                  onClick={() => setActiveTab('pending-requests')}
                  className={`tab-btn ${activeTab === 'pending-requests' ? 'is-active' : ''}`}
                  type="button"
                >
                  Pending requests
                  {pendingRequests.length > 0 && (
                    <span className="tab-pill tab-pill-sage">{pendingRequests.length}</span>
                  )}
                </button>
              )}
              {(isAdminUser || isManagerUser) && (
                <button
                  onClick={() => setActiveTab('approved-requests')}
                  className={`tab-btn ${activeTab === 'approved-requests' ? 'is-active' : ''}`}
                  type="button"
                >
                  Approved requests
                  {approvedRequests.length > 0 && (
                    <span className="tab-pill tab-pill-success">{approvedRequests.length}</span>
                  )}
                </button>
              )}
              {isAdminUser && (
                <button
                  onClick={() => setActiveTab('denied-requests')}
                  className={`tab-btn ${activeTab === 'denied-requests' ? 'is-active' : ''}`}
                  type="button"
                >
                  Denied requests
                  {deniedRequests.length > 0 && (
                    <span className="tab-pill tab-pill-error">{deniedRequests.length}</span>
                  )}
                </button>
              )}
              {isManagerUser && (
                <button
                  onClick={() => setActiveTab('my-requests')}
                  className={`tab-btn ${activeTab === 'my-requests' ? 'is-active' : ''}`}
                  type="button"
                >
                  My request status
                  {myLeaveRequests.length > 0 && (
                    <span className="tab-pill tab-pill-sage">{myLeaveRequests.length}</span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* ── Calendar View ── */}
          {activeTab === 'calendar' && (
            <div className="surface anim-fade-up delay-200">
              {/* Calendar bar */}
              <div className="cal-bar">
                <div className="cal-bar-left">
                  <h2 className="cal-bar-title">Schedule</h2>
                  <div className="month-nav">
                    <button
                      onClick={handlePrevMonth}
                      className="month-nav-btn"
                      type="button"
                      aria-label="Previous month"
                    >
                      <ChevronLeftIcon style={{ width: 16, height: 16 }} />
                    </button>
                    <span className="month-nav-label">{formatMonthYear(currentDate)}</span>
                    <button
                      onClick={handleNextMonth}
                      className="month-nav-btn"
                      type="button"
                      aria-label="Next month"
                    >
                      <ChevronRightIcon style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={openTimeOffModal}
                  className="btn btn-primary"
                  type="button"
                >
                  <PlusIcon style={{ width: 14, height: 14 }} />
                  <span>Time Off</span>
                </button>
              </div>

              {/* Weekdays */}
              <div className="cal-weekdays">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className={`cal-weekday ${day === 'Sat' || day === 'Sun' ? 'weekend' : ''}`}>{day}</div>
                  ))}
              </div>

              {/* Days grid */}
              <div className="cal-grid">
                {getDaysInMonth(currentDate).map((date, index) => {
                  const isCurrentMonth = date.isSame(currentDate, 'month');
                  const isToday = date.isSame(dayjs(), 'day');
                  const isSelected = date.isSame(selectedDate, 'day') && showDayDetailsModal;
                  const events = getEventsForDate(date);

                  const isWeekend = date.day() === 0 || date.day() === 6;
                  const cellClass = [
                    'cal-cell',
                    isWeekend ? 'weekend' : '',
                    !isCurrentMonth ? 'is-other-month' : '',
                    isToday ? 'is-today' : '',
                    isSelected ? 'is-selected' : ''
                  ].filter(Boolean).join(' ');

                  const dayNumClass = [
                    'cal-day-num',
                    isToday ? 'is-today' : '',
                    !isCurrentMonth ? 'is-other-month' : ''
                  ].filter(Boolean).join(' ');

                  return (
                    <div
                      key={index}
                      className={cellClass}
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedDayEvents(events);
                        setShowDayDetailsModal(true);
                      }}
                    >
                      <div className={dayNumClass}>{date.format('D')}</div>

                      <div className="cal-events">
                        {events.slice(0, 2).map((event, eventIndex) => (
                          <div
                            key={eventIndex}
                            className={eventClassFor(event.variant)}
                            title={`${event.employeeName || event.title}${event.time ? ` (${event.time})` : ''}`}
                          >
                            <div className="cal-event-name">
                              {event.employeeName || event.title}
                            </div>
                            {event.time && event.type === 'shift' && (
                              <div className="cal-event-time">{event.time}</div>
                            )}
                          </div>
                        ))}
                        {events.length > 2 && (
                          <div className="cal-more-pill">+{events.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Pending Requests ── */}
          {activeTab === 'pending-requests' && isAdminUser && (
            <div className="surface surface-pad anim-fade-up">
              <h2 className="section-title">Pending Leave Requests</h2>

              {loadingRequests ? (
                <div className="center-state">
                  <div className="center-spinner" style={{ marginBottom: '0.85rem' }}></div>
                  <p className="center-state-text">Loading requests…</p>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="center-state">
                  <div className="center-state-icon-wrap">
                    <ClockIcon style={{ width: 30, height: 30, color: '#84a98c' }} />
                  </div>
                  <h3 className="center-state-title">No Pending Requests</h3>
                  <p className="center-state-text">All leave requests have been processed.</p>
                </div>
              ) : (
                <div className="req-grid">
                  {pendingRequests.map((request) => (
                    <div key={request._id} className="req-card">
                      <div className="req-card-head">
                        <div className="req-avatar req-avatar-sage">{renderInitials(request)}</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h3 className="req-name">
                            {request.employeeId?.firstName} {request.employeeId?.lastName}
                          </h3>
                          <p className="req-email">{request.employeeId?.email}</p>
                        </div>
                      </div>

                      <div className="req-meta-grid">
                        <div>
                          <p className="req-meta-label">Leave Type</p>
                          <span className={leavePillClass(request.leaveType)}>{request.leaveType}</span>
                        </div>
                        <div>
                          <p className="req-meta-label">Date Range</p>
                          <p className="req-meta-value">
                            {new Date(request.startDate).toLocaleDateString('en-GB')} – {new Date(request.endDate).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                        <div>
                          <p className="req-meta-label">Duration</p>
                          <p className="req-meta-value">{request.numberOfDays} day(s)</p>
                        </div>
                        <div>
                          <p className="req-meta-label">Requested</p>
                          <p className="req-meta-value">
                            {new Date(request.createdAt).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>

                      {request.reason && (
                        <div className="req-reason">
                          <p className="req-reason-label">Reason</p>
                          <p className="req-reason-text">{request.reason}</p>
                        </div>
                      )}

                      <div className="req-actions">
                        <button
                          onClick={() => {
                            setActionRequestId(request._id);
                            setApproveDialogOpen(true);
                          }}
                          className="btn btn-success"
                          type="button"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setActionRequestId(request._id);
                            setRejectionReason('');
                            setRejectDialogOpen(true);
                          }}
                          className="btn btn-danger"
                          type="button"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Approved Requests ── */}
          {activeTab === 'approved-requests' && (isAdminUser || isManagerUser) && (
            <div className="surface surface-pad anim-fade-up">
              <h2 className="section-title">Approved Leave Requests</h2>

              <div className="filter-bar">
                <div className="filter-grid">
                  <div>
                    <DatePicker
                      label="From date"
                      value={approvedFromDate}
                      onChange={(d) => setApprovedFromDate(d ? d.format('YYYY-MM-DD') : '')}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <DatePicker
                      label="To date"
                      value={approvedToDate}
                      onChange={(d) => setApprovedToDate(d ? d.format('YYYY-MM-DD') : '')}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <button
                      onClick={() => fetchApprovedRequests()}
                      className="btn btn-primary"
                      type="button"
                      style={{ width: '100%' }}
                    >
                      Apply filter
                    </button>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        setApprovedFromDate('');
                        setApprovedToDate('');
                        fetchApprovedRequests();
                      }}
                      className="btn btn-secondary"
                      type="button"
                      style={{ width: '100%' }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {loadingApprovedRequests ? (
                <div className="center-state">
                  <div className="center-spinner" style={{ marginBottom: '0.85rem' }}></div>
                  <p className="center-state-text">Loading requests…</p>
                </div>
              ) : approvedRequests.length === 0 ? (
                <div className="center-state">
                  <div className="center-state-icon-wrap">
                    <DocumentTextIcon style={{ width: 30, height: 30, color: '#84a98c' }} />
                  </div>
                  <h3 className="center-state-title">No Approved Requests</h3>
                  <p className="center-state-text">You haven't approved any leave requests yet.</p>
                </div>
              ) : (
                <div className="req-grid">
                  {approvedRequests.map((request) => (
                    <div key={request._id} className="req-card">
                      <div className="req-card-head">
                        <div className="req-avatar req-avatar-success">{renderInitials(request)}</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h3 className="req-name">
                            {request.employeeId?.firstName} {request.employeeId?.lastName}
                          </h3>
                          <p className="req-email">{request.employeeId?.email}</p>
                        </div>
                      </div>

                      <div className="req-meta-grid">
                        <div>
                          <p className="req-meta-label">Leave Type</p>
                          <span className="leave-pill leave-pill-success">{request.leaveType}</span>
                        </div>
                        <div>
                          <p className="req-meta-label">Date Range</p>
                          <p className="req-meta-value">
                            {new Date(request.startDate).toLocaleDateString('en-GB')} – {new Date(request.endDate).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                        <div>
                          <p className="req-meta-label">Duration</p>
                          <p className="req-meta-value">{request.numberOfDays} day(s)</p>
                        </div>
                        <div>
                          <p className="req-meta-label">Approved</p>
                          <p className="req-meta-value">
                            {request.approvedAt ? new Date(request.approvedAt).toLocaleDateString('en-GB') : '-'}
                          </p>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <p className="req-meta-label">Approved By</p>
                          <p className="req-meta-value">{getApprovedByName(request)}</p>
                        </div>
                      </div>

                      {request.reason && (
                        <div className="req-reason">
                          <p className="req-reason-label">Reason</p>
                          <p className="req-reason-text">{request.reason}</p>
                        </div>
                      )}

                      <div className="req-actions" style={{ marginTop: '0.85rem' }}>
                        <button
                          onClick={() => handleCancelApprovedLeave(request._id)}
                          className="btn btn-danger"
                          type="button"
                        >
                          Cancel Leave
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Denied Requests ── */}
          {activeTab === 'denied-requests' && isAdminUser && (
            <div className="surface surface-pad anim-fade-up">
              <h2 className="section-title">Denied Leave Requests</h2>

              <div className="filter-bar">
                <div className="filter-grid">
                  <div>
                    <DatePicker
                      label="From date"
                      value={deniedFromDate}
                      onChange={(d) => setDeniedFromDate(d ? d.format('YYYY-MM-DD') : '')}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <DatePicker
                      label="To date"
                      value={deniedToDate}
                      onChange={(d) => setDeniedToDate(d ? d.format('YYYY-MM-DD') : '')}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <button
                      onClick={() => fetchDeniedRequests()}
                      className="btn btn-primary"
                      type="button"
                      style={{ width: '100%' }}
                    >
                      Apply filter
                    </button>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        setDeniedFromDate('');
                        setDeniedToDate('');
                        fetchDeniedRequests();
                      }}
                      className="btn btn-secondary"
                      type="button"
                      style={{ width: '100%' }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {loadingDeniedRequests ? (
                <div className="center-state">
                  <div className="center-spinner" style={{ marginBottom: '0.85rem' }}></div>
                  <p className="center-state-text">Loading requests…</p>
                </div>
              ) : deniedRequests.length === 0 ? (
                <div className="center-state">
                  <div className="center-state-icon-wrap">
                    <DocumentTextIcon style={{ width: 30, height: 30, color: '#84a98c' }} />
                  </div>
                  <h3 className="center-state-title">No Denied Requests</h3>
                  <p className="center-state-text">You haven't denied any leave requests yet.</p>
                </div>
              ) : (
                <div className="req-grid">
                  {deniedRequests.map((request) => (
                    <div key={request._id} className="req-card">
                      <div className="req-card-head">
                        <div className="req-avatar req-avatar-danger">{renderInitials(request)}</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h3 className="req-name">
                            {request.employeeId?.firstName} {request.employeeId?.lastName}
                          </h3>
                          <p className="req-email">{request.employeeId?.email}</p>
                        </div>
                      </div>

                      <div className="req-meta-grid">
                        <div>
                          <p className="req-meta-label">Leave Type</p>
                          <span className="leave-pill leave-pill-danger">{request.leaveType}</span>
                        </div>
                        <div>
                          <p className="req-meta-label">Date Range</p>
                          <p className="req-meta-value">
                            {new Date(request.startDate).toLocaleDateString('en-GB')} – {new Date(request.endDate).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                        <div>
                          <p className="req-meta-label">Duration</p>
                          <p className="req-meta-value">{request.numberOfDays} day(s)</p>
                        </div>
                        <div>
                          <p className="req-meta-label">Denied</p>
                          <p className="req-meta-value">
                            {request.rejectedAt ? new Date(request.rejectedAt).toLocaleDateString('en-GB') : '-'}
                          </p>
                        </div>
                      </div>

                      {request.rejectionReason && (
                        <div className="req-rejection">
                          <p className="req-rejection-label">Rejection reason</p>
                          <p className="req-rejection-text">{request.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── My Requests (manager) ── */}
          {activeTab === 'my-requests' && isManagerUser && (
            <div className="surface surface-pad anim-fade-up">
              <h2 className="section-title">My Time-Off Request Status</h2>

              {loadingMyLeaveRequests ? (
                <div className="center-state">
                  <div className="center-spinner" style={{ marginBottom: '0.85rem' }}></div>
                  <p className="center-state-text">Loading your requests…</p>
                </div>
              ) : myLeaveRequests.length === 0 ? (
                <div className="center-state">
                  <div className="center-state-icon-wrap">
                    <DocumentTextIcon style={{ width: 30, height: 30, color: '#84a98c' }} />
                  </div>
                  <h3 className="center-state-title">No Requests Yet</h3>
                  <p className="center-state-text">You have not submitted any time-off requests.</p>
                </div>
              ) : (
                <div className="req-grid">
                  {myLeaveRequests.map((request) => {
                    const status = String(request.status || '').toLowerCase();
                    const pillClass = status === 'approved'
                      ? 'leave-pill leave-pill-success'
                      : status === 'rejected'
                      ? 'leave-pill leave-pill-danger'
                      : 'leave-pill leave-pill-pending';
                    const avatarClass = status === 'approved'
                      ? 'req-avatar req-avatar-success'
                      : status === 'rejected'
                      ? 'req-avatar req-avatar-danger'
                      : 'req-avatar req-avatar-amber';

                    return (
                      <div key={request._id} className="req-card">
                        <div className="req-card-head">
                          <div className={avatarClass} style={{ fontSize: '0.85rem' }}>
                            {(request.leaveType || 'L').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <h3 className="req-name">{request.leaveType || 'Leave'}</h3>
                            <p className="req-email">
                              {new Date(request.startDate).toLocaleDateString('en-GB')} – {new Date(request.endDate).toLocaleDateString('en-GB')}
                            </p>
                          </div>
                          <span className={pillClass}>
                            {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'}
                          </span>
                        </div>

                        <div className="req-meta-grid" style={{ gridTemplateColumns: '1fr', marginBottom: '0' }}>
                          <div>
                            <p className="req-meta-label">Duration</p>
                            <p className="req-meta-value">{request.numberOfDays || 0} day(s)</p>
                          </div>
                        </div>

                        {request.reason && (
                          <div className="req-reason" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
                            <p className="req-reason-label">Reason</p>
                            <p className="req-reason-text">{request.reason}</p>
                          </div>
                        )}

                        {request.rejectionReason && (
                          <div className="req-rejection" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
                            <p className="req-rejection-label">Rejection reason</p>
                            <p className="req-rejection-text">{request.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ══════════════════════════════════════
           DAY DETAILS MODAL
      ══════════════════════════════════════ */}
      {showDayDetailsModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDayDetailsModal(false); }}
        >
          <div className="modal-box">
            <div className="modal-header-dark">
              <div className="modal-header-dark-grid"></div>
              <div className="modal-header-dark-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                  <div className="modal-header-icon-wrap">
                    <CalendarDaysIcon style={{ width: 22, height: 22, color: '#cad2c5' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p className="modal-header-eyebrow">Day Overview</p>
                    <h2 className="modal-header-title-light">
                      {selectedDate.format('dddd, MMMM D, YYYY')}
                    </h2>
                    <div className="modal-header-meta">
                      <span className="modal-header-meta-item">
                        <UserGroupIcon style={{ width: 13, height: 13 }} />
                        {selectedDayEvents.filter(e => e.type === 'shift').length} shift{selectedDayEvents.filter(e => e.type === 'shift').length !== 1 ? 's' : ''}
                      </span>
                      <span className="modal-header-meta-sep">·</span>
                      <span className="modal-header-meta-item">
                        <CalendarOutlineIcon style={{ width: 13, height: 13 }} />
                        {selectedDayEvents.filter(e => e.type === 'leave').length} time off
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowDayDetailsModal(false)}
                  className="modal-close-light"
                  type="button"
                  aria-label="Close"
                >
                  <XMarkIcon style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>

            <div className="modal-body">
              {selectedDayEvents.length === 0 ? (
                <div className="modal-body-empty">
                  <div>
                    <div className="empty-icon-circle">
                      <CalendarDaysIcon style={{ width: 36, height: 36, color: '#84a98c' }} />
                    </div>
                    <h3 className="empty-title">No events scheduled</h3>
                    <p className="empty-subtitle">This day is currently free.</p>
                    <button
                      onClick={() => {
                        setShowDayDetailsModal(false);
                        openTimeOffModal();
                      }}
                      className="btn btn-primary"
                      type="button"
                    >
                      <PlusIcon style={{ width: 14, height: 14 }} />
                      Schedule Time Off
                    </button>
                  </div>
                </div>
              ) : (
                <div className="day-grid">
                  {selectedDayEvents.filter(e => e.type === 'shift').length > 0 && (
                    <div className="day-section">
                      <div className="day-section-head">
                        <h3 className="day-section-title">
                          <span className="day-section-icon-wrap day-section-icon-shift">
                            <UserGroupIcon style={{ width: 16, height: 16 }} />
                          </span>
                          Scheduled Shifts
                        </h3>
                        <span className="day-section-count">
                          {selectedDayEvents.filter(e => e.type === 'shift').length}
                        </span>
                      </div>
                      <div className="day-section-list">
                        {selectedDayEvents.filter(e => e.type === 'shift').map((event, idx) => (
                          <div key={idx} className="event-card">
                            <div className="event-card-row">
                              <div style={{ minWidth: 0 }}>
                                <h4 className="event-card-name">{event.employeeName || event.title}</h4>
                                {event.subtitle && (
                                  <p className="event-card-sub">{event.subtitle}</p>
                                )}
                              </div>
                              <span className={statusClassFor(event.data.status)}>
                                {event.data.status || 'Scheduled'}
                              </span>
                            </div>

                            <div className="event-meta-row">
                              <ClockIcon style={{ width: 13, height: 13, color: '#52796f' }} />
                              <span className="event-meta-strong">{event.time}</span>
                            </div>

                            {event.data.notes && (
                              <div className="event-quote">{event.data.notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDayEvents.filter(e => e.type === 'leave').length > 0 && (
                    <div className="day-section">
                      <div className="day-section-head">
                        <h3 className="day-section-title">
                          <span className="day-section-icon-wrap day-section-icon-leave">
                            <CalendarDaysIcon style={{ width: 16, height: 16 }} />
                          </span>
                          Time Off Requests
                        </h3>
                        <span className="day-section-count">
                          {selectedDayEvents.filter(e => e.type === 'leave').length}
                        </span>
                      </div>
                      <div className="day-section-list">
                        {selectedDayEvents.filter(e => e.type === 'leave').map((event, idx) => (
                          <div key={idx} className="event-card is-leave">
                            <div className="event-card-row">
                              <div style={{ minWidth: 0 }}>
                                <h4 className="event-card-name">{event.title}</h4>
                                <p className="event-card-sub">{event.time}</p>
                              </div>
                              <span className="event-card-status status-leave">
                                {(event.data.leaveType || event.data.status || '').charAt(0).toUpperCase() + (event.data.leaveType || event.data.status || '').slice(1)}
                              </span>
                            </div>

                            {event.data.days && (
                              <div className="event-meta-row">
                                <ClockIcon style={{ width: 13, height: 13, color: '#52796f' }} />
                                <span className="event-meta-strong">{event.data.days} day(s)</span>
                              </div>
                            )}

                            {event.data.startDate && event.data.endDate && (
                              <div className="event-meta-row">
                                <CalendarOutlineIcon style={{ width: 13, height: 13, color: '#52796f' }} />
                                <span>
                                  {formatCalendarDateLabel(event.data.startDate)} – {formatCalendarDateLabel(event.data.endDate)}
                                </span>
                              </div>
                            )}

                            {event.data.reason && (
                              <div className="event-quote">"{event.data.reason}"</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <p className="modal-footer-meta">
                <strong>{selectedDayEvents.length}</strong> total event(s) on this day
              </p>
              <button
                onClick={() => setShowDayDetailsModal(false)}
                className="btn btn-primary"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
           TIME OFF DRAWER
      ══════════════════════════════════════ */}
      {showTimeOffModal && (
        <div className="drawer-overlay">
          <div className="drawer-backdrop" onClick={closeTimeOffModal}></div>
          <div className="drawer-panel">
            <div className="drawer-header">
              <div className="drawer-title-block">
                <div className="drawer-title-icon">
                  <PlusIcon style={{ width: 18, height: 18, color: '#cad2c5' }} />
                </div>
                <div>
                  <p className="drawer-eyebrow">New Request</p>
                  <h2 className="drawer-title">Time Off</h2>
                </div>
              </div>
              <button
                onClick={closeTimeOffModal}
                className="drawer-close"
                type="button"
                aria-label="Close"
              >
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div className="drawer-body">
              {(user?.role === 'admin' || user?.role === 'super-admin') && (
                <div className="field-group">
                  <label className="field-label">
                    Employee <span className="field-required">*</span>
                  </label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an employee…" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="field-group">
                <label className="field-label">
                  Leave Type <span className="field-required">*</span>
                </label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                    <SelectItem value="Bank Holiday">Bank Holiday</SelectItem>
                    <SelectItem value="Maternity Leave">Maternity Leave</SelectItem>
                    <SelectItem value="Paternity Leave">Paternity Leave</SelectItem>
                    <SelectItem value="Adoption Leave">Adoption Leave</SelectItem>
                    <SelectItem value="Shared Parental Leave">Shared Parental Leave</SelectItem>
                    <SelectItem value="Parental Leave">Parental Leave</SelectItem>
                    <SelectItem value="Carer's Leave">Carer's Leave</SelectItem>
                    <SelectItem value="Parental Bereavement Leave">Parental Bereavement Leave</SelectItem>
                    <SelectItem value="Neonatal Care Leave">Neonatal Care Leave</SelectItem>
                    <SelectItem value="Time Off for Dependants">Time Off for Dependants</SelectItem>
                    <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                    <SelectItem value="Jury Service">Jury Service</SelectItem>
                    <SelectItem value="Trade Union Duties">Trade Union Duties</SelectItem>
                    <SelectItem value="Public Duty Leave">Public Duty Leave</SelectItem>
                    <SelectItem value="Study / Training Leave">Study / Training Leave</SelectItem>
                    <SelectItem value="Medical / Dental Appointment">Medical / Dental Appointment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="field-group">
                <label className="field-label">
                  Reason <span className="field-required">*</span>
                </label>
                <textarea
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Enter reason for leave request (minimum 10 characters)…"
                  rows={3}
                  className="textarea-field"
                />
              </div>

              <div className="field-group">
                <div className="field-grid-2">
                  <div>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={handleStartDateChange}
                      required
                      className="w-full"
                    />
                    <Select value={startHalfDay} onValueChange={setStartHalfDay}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Day</SelectItem>
                        <SelectItem value="first">First Half</SelectItem>
                        <SelectItem value="second">Second Half</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={handleEndDateChange}
                      required
                      minDate={startDate}
                      className="w-full"
                    />
                    <Select value={endHalfDay} onValueChange={setEndHalfDay}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Day</SelectItem>
                        <SelectItem value="first">First Half</SelectItem>
                        <SelectItem value="second">Second Half</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {weekendWarning && (
                <div className="warn-banner" style={{ marginTop: 0, marginBottom: '1.25rem' }}>
                  <p className="warn-banner-text">{weekendWarning}</p>
                </div>
              )}

              {startDate && endDate && (
                <div className="summary-box">
                  <p className="summary-text">
                    Time off from <strong>{startDate.format('dddd, D MMMM YYYY')}</strong> to{' '}
                    <strong>{endDate.format('dddd, D MMMM YYYY')}</strong>.{' '}
                    <strong>{calculateWorkingDays(startDate, endDate)} day(s)</strong> will be deducted from your entitlement.
                  </p>
                </div>
              )}

              <div className="drawer-actions">
                <button
                  onClick={closeTimeOffModal}
                  disabled={submitting}
                  className="btn btn-secondary"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitTimeOff}
                  disabled={!isFormValid() || submitting}
                  className="btn btn-success"
                  type="button"
                >
                  {submitting
                    ? 'Submitting…'
                    : (user?.role === 'admin' || user?.role === 'super-admin')
                      ? 'Add Absence'
                      : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
           ALERT DIALOGS — Approve / Reject
      ══════════════════════════════════════ */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve leave request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the request as approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setApproveDialogOpen(false);
                setActionRequestId(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!actionRequestId) return;
                await handleApproveRequest(actionRequestId);
                setApproveDialogOpen(false);
                setActionRequestId(null);
              }}
              style={{
                background: 'linear-gradient(135deg, #52796f 0%, #6b8e7f 100%)',
                color: '#fff'
              }}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline leave request?</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejection.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div style={{ margin: '1rem 0' }}>
            <label
              htmlFor="leave-rejection-reason"
              style={{
                display: 'block', fontSize: '0.72rem', fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: '#52796f', marginBottom: '0.5rem'
              }}
            >
              Rejection reason
            </label>
            <textarea
              id="leave-rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason…"
              className="textarea-field"
              maxLength={500}
              style={{ minHeight: '100px', resize: 'none' }}
            />
            <p style={{
              fontSize: '0.7rem', color: '#8fa99a', marginTop: '0.35rem',
              fontWeight: 400, fontFamily: "'DM Sans', sans-serif"
            }}>
              {(rejectionReason || '').length}/500 characters
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setRejectDialogOpen(false);
                setActionRequestId(null);
                setRejectionReason('');
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const r = (rejectionReason || '').trim();
                if (!actionRequestId || !r) return;
                await handleRejectRequest(actionRequestId, r);
                setRejectDialogOpen(false);
                setActionRequestId(null);
                setRejectionReason('');
              }}
              disabled={!actionRequestId || (rejectionReason || '').trim().length === 0}
              style={{
                background: 'linear-gradient(135deg, #a35446 0%, #b85c50 100%)',
                color: '#fff'
              }}
            >
              Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Calendar;