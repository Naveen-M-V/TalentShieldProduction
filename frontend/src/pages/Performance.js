import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { goalsApi } from '../utils/performanceApi';
import { reviewsApi } from '../utils/reviewsApi';
import ObjectiveCard from '../components/ObjectiveCard';
import ObjectiveForm from '../components/ObjectiveForm';
import ReviewForm from '../components/ReviewForm';
import PerformanceRatingBadge from '../components/PerformanceRatingBadge';
import ObjectiveApprovalBadge from '../components/ObjectiveApprovalBadge';

// ─── Auth helper ──────────────────────────────────────────────────────────────
const authConfig = () => {
  const token = localStorage.getItem('auth_token');
  return {
    withCredentials: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  };
};

const MANAGER_ROLES = ['manager', 'senior-manager', 'hr', 'admin', 'super-admin'];

const REVIEW_TYPE_LABELS = {
  QUARTERLY: 'Quarterly', MID_YEAR: 'Mid-Year', ANNUAL: 'Annual',
  PROBATION: 'Probation', PIP: 'PIP', MONTHLY: 'Monthly',
  WEEKLY: 'Weekly', HR_REVIEW: 'HR Review', LEAVE_MANAGEMENT: 'Leave Management'
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .pf-root {
    font-family: 'DM Sans', sans-serif;
    -webkit-text-size-adjust: 100%;
    background: #f7f8f6;
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
    width: 100%;
    max-width: 100%;
  }
  .pf-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
    height: 600px;
  }
  .pf-content { position: relative; z-index: 1; }

  /* ── Keyframes ── */
  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse-ring {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50%      { opacity: 1; transform: scale(1.25); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .anim-fade-up { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
  .delay-100 { animation-delay: 0.10s; }
  .delay-200 { animation-delay: 0.20s; }

  /* ══════════════════════════════════════
     PAGE HEADER
  ══════════════════════════════════════ */
  .page-header {
    background: #fff;
    border-bottom: 1px solid #eaefeb;
    padding: 1rem 1.5rem;
    position: relative;
  }
  .page-header-inner {
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  @media (min-width: 768px) {
    .page-header-inner {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
    }
  }
  .page-header-block {
    display: flex; gap: 0.7rem; align-items: flex-start;
    min-width: 0; flex: 1;
  }
  .page-icon-wrap {
    width: 38px; height: 38px; border-radius: 10px;
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(53,79,82,0.18); flex-shrink: 0;
  }
  .page-eyebrow {
    font-size: 0.6rem; font-weight: 500; letter-spacing: 0.18em;
    text-transform: uppercase; color: #84a98c;
    margin: 0 0 0.1rem;
  }
  .page-title {
    font-family: 'Cormorant Garamond', serif; font-weight: 400;
    font-size: 1.55rem; color: #2f3e46; line-height: 1.15; letter-spacing: -0.02em;
    margin: 0;
  }
  .page-subtitle {
    font-size: 0.78rem; color: #7a8e84; font-weight: 300;
    margin: 0.2rem 0 0;
  }

  /* ══════════════════════════════════════
     TAB BAR
  ══════════════════════════════════════ */
  .tab-bar-wrap {
    background: #fff;
    border-bottom: 1px solid #eaefeb;
    padding: 0 1.5rem;
  }
  .tab-bar-inner {
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    gap: 0.15rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .tab-bar-inner::-webkit-scrollbar { display: none; }
  .tab-btn {
    background: none;
    border: none;
    padding: 0.85rem 1rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8rem; font-weight: 500;
    color: #7a8e84;
    cursor: pointer;
    position: relative;
    display: inline-flex; align-items: center; gap: 0.45rem;
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
    min-width: 18px;
    padding: 0.1rem 0.45rem;
    font-size: 0.62rem; font-weight: 700;
    border-radius: 999px;
    letter-spacing: 0.02em;
    background: rgba(184,92,80,0.15);
    color: #7a3028;
    border: 1px solid rgba(184,92,80,0.25);
  }

  /* ══════════════════════════════════════
     MAIN CONTENT
  ══════════════════════════════════════ */
  .pf-main {
    max-width: 1280px;
    margin: 0 auto;
    padding: 1.5rem;
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
    text-decoration: none;
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
  .btn-warn {
    background: linear-gradient(135deg, #b89758 0%, #d1b076 100%);
    color: #fff;
    box-shadow: 0 3px 10px rgba(184,151,88,0.22);
  }
  .btn-warn:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 5px 14px rgba(184,151,88,0.3);
  }
  .btn-warn:disabled {
    background: #d4ddd6; color: #8fa99a;
    box-shadow: none; cursor: not-allowed; transform: none;
  }
  .btn-danger {
    background: linear-gradient(135deg, #a35446 0%, #b85c50 100%);
    color: #fff;
    box-shadow: 0 3px 10px rgba(163,84,70,0.2);
  }
  .btn-danger:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 5px 14px rgba(163,84,70,0.28);
  }
  .btn-secondary {
    background: #fff; color: #354f52;
    border: 1px solid #d4ddd6;
  }
  .btn-secondary:hover:not(:disabled) {
    background: #f0f5f2; border-color: #84a98c; color: #2f3e46;
  }
  .btn-purple {
    background: linear-gradient(135deg, #7a668c 0%, #9080a0 100%);
    color: #fff;
    box-shadow: 0 3px 10px rgba(122,102,140,0.22);
  }
  .btn-purple:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 5px 14px rgba(122,102,140,0.3);
  }
  .btn-purple:disabled {
    background: #d4ddd6; color: #8fa99a;
    box-shadow: none; cursor: not-allowed; transform: none;
  }
  .btn-xs {
    font-size: 0.66rem; padding: 0.3rem 0.6rem; min-height: 28px;
    border-radius: 6px; gap: 0.3rem;
  }
  .btn-soft-danger {
    background: rgba(192,117,106,0.1); color: #b85c50;
    border: 1px solid rgba(192,117,106,0.22);
  }
  .btn-soft-danger:hover:not(:disabled) {
    background: rgba(192,117,106,0.18); color: #7a3028;
  }

  /* ══════════════════════════════════════
     FILTER ROW
  ══════════════════════════════════════ */
  .filter-row {
    display: flex; flex-wrap: wrap; gap: 0.6rem;
    margin-bottom: 1.1rem;
  }
  .text-input {
    width: 100%;
    padding: 0.5rem 0.85rem;
    border: 1.5px solid #d4ddd6;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem; color: #2f3e46;
    background: #fff;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    min-height: 36px;
  }
  .text-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .text-input.with-icon { padding-left: 2.2rem; }
  .input-wrap { position: relative; flex: 1; min-width: 200px; }
  .input-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%);
    color: #84a98c;
    pointer-events: none;
    display: flex; align-items: center;
  }
  .select-input {
    padding: 0.5rem 2rem 0.5rem 0.85rem;
    border: 1.5px solid #d4ddd6;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem; color: #2f3e46;
    background: #fff
      url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2384a98c'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")
      no-repeat right 8px center / 16px;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
    min-height: 36px;
    appearance: none;
    -webkit-appearance: none;
    min-width: 170px;
  }
  .select-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }

  /* ══════════════════════════════════════
     CARD GRID (Objectives)
  ══════════════════════════════════════ */
  .card-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.85rem;
  }
  @media (min-width: 640px) { .card-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .card-grid { grid-template-columns: repeat(3, 1fr); } }

  /* ══════════════════════════════════════
     SECTION HEADER (inline)
  ══════════════════════════════════════ */
  .section-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap; gap: 0.75rem;
  }
  .section-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.3rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0;
  }

  /* ══════════════════════════════════════
     REVIEWS TABLE
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
  .data-table tbody tr {
    border-bottom: 1px solid #eaefeb;
    transition: background 0.15s;
  }
  .data-table tbody tr:last-child { border-bottom: none; }
  .data-table tbody tr:hover { background: #fafbfa; }
  .data-table td {
    padding: 0.7rem 0.7rem;
    font-size: 0.76rem;
    color: #2f3e46;
    vertical-align: middle;
  }
  .td-strong { font-weight: 600; color: #2f3e46; }
  .td-muted { color: #7a8e84; }
  .td-actions {
    display: flex; gap: 0.35rem; flex-wrap: wrap;
  }
  .td-comment-line {
    font-size: 0.72rem; color: #354f52;
    max-width: 240px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .td-comment-time {
    font-size: 0.65rem; color: #8fa99a;
    margin-top: 0.2rem;
  }
  .td-italic { font-size: 0.72rem; color: #8fa99a; font-style: italic; }

  /* ── Status pill ── */
  .status-pill {
    display: inline-flex; align-items: center;
    padding: 0.2rem 0.55rem;
    font-size: 0.65rem; font-weight: 600;
    border-radius: 999px;
    letter-spacing: 0.02em;
    text-transform: capitalize;
    border: 1px solid var(--pill-border, #eaefeb);
    background: var(--pill-bg, #fafbfa);
    color: var(--pill-text, #354f52);
    white-space: nowrap;
  }
  .status-draft     { --pill-bg: #fafbfa; --pill-border: #eaefeb; --pill-text: #7a8e84; }
  .status-submitted { --pill-bg: rgba(111,140,152,0.10); --pill-border: rgba(111,140,152,0.22); --pill-text: #354f52; }
  .status-published { --pill-bg: rgba(82,121,111,0.12); --pill-border: rgba(82,121,111,0.25); --pill-text: #2f3e46; }
  .status-closed    { --pill-bg: rgba(122,102,140,0.10); --pill-border: rgba(122,102,140,0.22); --pill-text: #4a3d5a; }

  /* Hide low-priority columns at narrower widths */
  @media (max-width: 1199px) {
    .col-period { display: none; }
  }
  @media (max-width: 1023px) {
    .col-comment { display: none; }
  }
  @media (max-width: 819px) {
    .col-rating { display: none; }
  }
  @media (max-width: 639px) {
    .col-type { display: none; }
  }

  /* ══════════════════════════════════════
     TEAM OVERVIEW CARDS
  ══════════════════════════════════════ */
  .team-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 1rem 1.1rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  }
  .team-card:hover {
    border-color: #84a98c;
    box-shadow: 0 6px 18px rgba(53,79,82,0.08);
    transform: translateY(-1px);
  }
  .team-card-head {
    display: flex; align-items: center; gap: 0.7rem;
    margin-bottom: 0.85rem;
    padding-bottom: 0.7rem;
    border-bottom: 1px solid #eaefeb;
  }
  .team-avatar {
    width: 38px; height: 38px;
    border-radius: 50%;
    background: linear-gradient(135deg, #354f52 0%, #52796f 60%, #84a98c 100%);
    display: flex; align-items: center; justify-content: center;
    color: #cad2c5;
    font-size: 0.85rem; font-weight: 600;
    flex-shrink: 0;
    border: 2px solid #fff;
    box-shadow: 0 2px 6px rgba(53,79,82,0.15);
  }
  .team-name {
    font-size: 0.88rem; font-weight: 600;
    color: #2f3e46; margin: 0;
    letter-spacing: -0.005em;
  }
  .team-role {
    font-size: 0.72rem; color: #7a8e84; font-weight: 400;
    margin: 0.1rem 0 0;
  }
  .team-stats {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
  .team-stat {
    text-align: center;
    padding: 0.55rem 0.4rem;
    border-radius: 8px;
    background: var(--stat-bg, #fafbfa);
    border: 1px solid var(--stat-border, #eaefeb);
  }
  .team-stat-num {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.35rem; font-weight: 500;
    color: var(--stat-text, #2f3e46);
    letter-spacing: -0.02em;
    line-height: 1;
    margin: 0 0 0.15rem;
  }
  .team-stat-label {
    font-size: 0.6rem; font-weight: 600;
    color: #84a98c;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .team-stat.is-total { --stat-bg: #fafbfa; --stat-border: #eaefeb; --stat-text: #354f52; }
  .team-stat.is-approved {
    --stat-bg: rgba(82,121,111,0.10);
    --stat-border: rgba(82,121,111,0.2);
    --stat-text: #354f52;
  }
  .team-stat.is-pending {
    --stat-bg: rgba(184,151,88,0.10);
    --stat-border: rgba(184,151,88,0.22);
    --stat-text: #6b5524;
  }

  /* ══════════════════════════════════════
     MY REVIEWS LIST
  ══════════════════════════════════════ */
  .review-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 14px;
    padding: 1.15rem 1.25rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    margin-bottom: 0.85rem;
  }
  .review-card-head {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 0.85rem;
    margin-bottom: 0.85rem;
    flex-wrap: wrap;
  }
  .review-type-line {
    display: flex; align-items: center; gap: 0.55rem;
    flex-wrap: wrap;
  }
  .review-type {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.15rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
  }
  .review-period {
    font-size: 0.74rem; color: #7a8e84; font-weight: 400;
    margin: 0 0 0.85rem;
  }
  .review-section { margin-bottom: 0.85rem; }
  .review-section:last-child { margin-bottom: 0; }
  .review-label {
    font-size: 0.6rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #84a98c;
    margin: 0 0 0.35rem;
  }
  .review-text {
    font-size: 0.82rem; color: #354f52; font-weight: 400;
    line-height: 1.6;
    margin: 0;
  }
  .review-chips {
    display: flex; flex-wrap: wrap; gap: 0.35rem;
  }
  .review-chip {
    display: inline-flex; align-items: center;
    padding: 0.2rem 0.6rem;
    background: rgba(132,169,140,0.14);
    color: #354f52;
    border: 1px solid rgba(132,169,140,0.22);
    border-radius: 999px;
    font-size: 0.7rem; font-weight: 500;
  }
  .review-comment-box {
    margin-top: 0.85rem;
    padding: 0.75rem 0.9rem;
    background: linear-gradient(135deg, #f0f5f2, #eaf2ec);
    border: 1px solid rgba(132,169,140,0.22);
    border-left: 3px solid #52796f;
    border-radius: 9px;
  }
  .review-comment-label {
    font-size: 0.6rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #354f52;
    margin: 0 0 0.3rem;
  }
  .review-comment-text {
    font-size: 0.82rem; color: #2f3e46; font-weight: 400;
    line-height: 1.5;
    margin: 0;
  }
  .add-comment-trigger {
    margin-top: 0.85rem;
  }
  .comment-form-wrap { margin-top: 0.85rem; }
  .textarea-field {
    width: 100%;
    padding: 0.65rem 0.9rem;
    border: 1.5px solid #d4ddd6;
    border-radius: 9px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem; color: #2f3e46;
    background: #fff;
    outline: none;
    resize: vertical;
    min-height: 78px;
    transition: border-color 0.2s, box-shadow 0.2s;
    margin-bottom: 0.55rem;
  }
  .textarea-field:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .comment-form-actions {
    display: flex; gap: 0.5rem; flex-wrap: wrap;
  }

  /* ══════════════════════════════════════
     SPINNER / EMPTY / ERROR
  ══════════════════════════════════════ */
  .spinner-page {
    display: flex; align-items: center; justify-content: center;
    padding: 4rem 1rem;
  }
  .spinner {
    width: 36px; height: 36px;
    border: 3px solid rgba(82,121,111,0.18);
    border-top-color: #52796f;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  .empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 3.25rem 1rem;
    text-align: center;
  }
  .empty-icon-wrap {
    width: 62px; height: 62px;
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
    max-width: 420px;
  }
  .error-banner {
    margin: 1.5rem;
    border-left: 3px solid #c0756a;
    background: linear-gradient(135deg, #fdf3f2, #fdecea);
    border-radius: 9px;
    padding: 0.85rem 1rem;
    font-size: 0.82rem;
    color: #7a3028;
  }
  .info-blurb {
    font-size: 0.82rem; color: #7a8e84; font-weight: 300;
    margin: 0 0 1rem;
    line-height: 1.6;
  }

  /* ══════════════════════════════════════
     MODAL
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
    max-height: 92vh;
    overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 32px 64px rgba(47,62,70,0.25);
    animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1);
  }
  .modal-sm { max-width: 440px; }
  .modal-md { max-width: 540px; }
  .modal-lg { max-width: 720px; }
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
    font-size: 1.3rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0.15rem 0 0;
  }
  .modal-subtitle {
    font-size: 0.78rem; color: #52796f; font-weight: 500;
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
  .modal-body {
    padding: 1.15rem 1.4rem;
    overflow-y: auto;
    flex: 1;
    -webkit-overflow-scrolling: touch;
  }
  .modal-body-text {
    font-size: 0.82rem; color: #52796f; font-weight: 400;
    line-height: 1.6;
    margin: 0 0 0.9rem;
  }
  .modal-footer {
    display: flex; justify-content: flex-end; gap: 0.5rem;
    padding: 0.85rem 1.4rem;
    border-top: 1px solid #eaefeb;
    background: #fafbfa;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  /* Previous entries inside Submit Input modal */
  .prev-entries-wrap {
    margin-bottom: 0.85rem;
  }
  .prev-entries-label {
    font-size: 0.6rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #84a98c;
    margin: 0 0 0.4rem;
  }
  .prev-entry {
    background: #fafbfa;
    border: 1px solid #eaefeb;
    border-radius: 8px;
    padding: 0.55rem 0.7rem;
    font-size: 0.74rem;
    color: #354f52;
    margin-bottom: 0.35rem;
    line-height: 1.5;
  }
  .prev-entry-date {
    color: #8fa99a;
    margin-right: 0.4rem;
    font-weight: 500;
  }

  /* Contributions list */
  .contrib-list {
    display: flex; flex-direction: column; gap: 0.85rem;
  }
  .contrib-card {
    border: 1px solid #eaefeb;
    background: #fafbfa;
    border-radius: 10px;
    padding: 0.85rem 0.95rem;
  }
  .contrib-head {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
    gap: 0.4rem;
    margin-bottom: 0.5rem;
  }
  .contrib-entry-num {
    font-size: 0.6rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #84a98c;
  }
  .contrib-entry-time {
    font-size: 0.7rem; color: #7a8e84; font-weight: 400;
  }
  .contrib-text {
    font-size: 0.82rem; color: #2f3e46; font-weight: 400;
    line-height: 1.55;
    white-space: pre-wrap;
    margin: 0;
  }
  .contrib-meta-grid {
    margin-top: 0.7rem;
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
    font-size: 0.74rem;
  }
  @media (min-width: 540px) {
    .contrib-meta-grid { grid-template-columns: 1fr 1fr; }
    .contrib-meta-grid > .span-2 { grid-column: 1 / -1; }
  }
  .contrib-meta-cell {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 8px;
    padding: 0.5rem 0.7rem;
  }
  .contrib-meta-key {
    font-size: 0.58rem; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #84a98c;
    margin: 0 0 0.15rem;
  }
  .contrib-meta-val {
    font-size: 0.78rem; color: #354f52; font-weight: 600;
    margin: 0;
    line-height: 1.4;
  }
  .contrib-meta-val-prose {
    font-weight: 400;
    color: #2f3e46;
    white-space: pre-wrap;
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 767px) {
    .page-header { padding: 0.85rem 1rem; }
    .page-icon-wrap { width: 34px; height: 34px; border-radius: 9px; }
    .page-title { font-size: 1.35rem; }
    .tab-bar-wrap { padding: 0 1rem; }
    .pf-main { padding: 1rem; }
    .data-table th, .data-table td { padding: 0.55rem 0.5rem; font-size: 0.72rem; }
    .data-table th { font-size: 0.55rem; }
  }
  @media (max-width: 479px) {
    .page-header { padding: 0.75rem 0.85rem; }
    .page-title { font-size: 1.2rem; }
    .pf-main { padding: 0.85rem; }
    .modal-overlay { padding: 0; align-items: flex-end; }
    .modal-box { border-radius: 18px 18px 0 0; max-height: 92vh; }
    .text-input, .textarea-field, .select-input { font-size: 16px; }
  }
`;

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="spinner-page">
      <div className="spinner"></div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function Empty({ message }) {
  return (
    <div className="empty-state">
      <div className="empty-icon-wrap">
        <svg style={{ width: 26, height: 26, color: '#84a98c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="empty-text">{message}</p>
    </div>
  );
}

// ─── Send-back modal ──────────────────────────────────────────────────────────
function SendBackModal({ onConfirm, onClose, saving }) {
  const [reason, setReason] = useState('');
  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-box modal-sm">
        <div className="modal-header">
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="modal-eyebrow">Manager Action</p>
            <h3 className="modal-title">Send Back Objective</h3>
          </div>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close">
            <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p className="modal-body-text">
            Provide a reason so the employee can revise their objective.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Reason for sending back…"
            className="textarea-field"
            style={{ marginBottom: 0 }}
          />
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary" type="button">Cancel</button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || saving}
            className="btn btn-warn"
            type="button"
          >
            {saving ? 'Sending…' : 'Send Back'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Submit input modal ───────────────────────────────────────────────────────
function SubmitInputModal({ objective, onConfirm, onClose, saving }) {
  const [text, setText] = useState('');
  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-box modal-md">
        <div className="modal-header">
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="modal-eyebrow">Submit Contribution</p>
            <h3 className="modal-title">Add Progress Update</h3>
            <p className="modal-subtitle">{objective?.title}</p>
          </div>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close">
            <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {objective?.employeeInput?.length > 0 && (
            <div className="prev-entries-wrap">
              <p className="prev-entries-label">Previous entries</p>
              {objective.employeeInput.map((entry, i) => (
                <div key={i} className="prev-entry">
                  <span className="prev-entry-date">
                    {new Date(entry.date || entry.submittedAt).toLocaleDateString()}:
                  </span>
                  {entry.contribution || entry.text}
                </div>
              ))}
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Describe what you've done towards this objective…"
            className="textarea-field"
            style={{ marginBottom: 0 }}
          />
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary" type="button">Cancel</button>
          <button
            onClick={() => onConfirm({ text })}
            disabled={!text.trim() || saving}
            className="btn btn-primary"
            type="button"
          >
            {saving ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Contributions modal ─────────────────────────────────────────────────
function ViewContributionsModal({ objective, onClose }) {
  const employeeName = objective?.userId
    ? `${objective.userId.firstName || ''} ${objective.userId.lastName || ''}`.trim()
    : 'Employee';
  const contributions = Array.isArray(objective?.employeeInput) ? objective.employeeInput : [];

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-box modal-lg">
        <div className="modal-header">
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="modal-eyebrow">Progress Trail</p>
            <h3 className="modal-title">Employee Contributions</h3>
            <p className="modal-subtitle">{employeeName} · {objective?.title || 'Objective'}</p>
          </div>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close">
            <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {contributions.length === 0 ? (
            <Empty message="No contributions have been submitted for this objective yet." />
          ) : (
            <div className="contrib-list">
              {contributions.map((entry, index) => (
                <div key={`${objective?._id || 'objective'}-${index}`} className="contrib-card">
                  <div className="contrib-head">
                    <span className="contrib-entry-num">Entry {index + 1}</span>
                    <span className="contrib-entry-time">
                      {new Date(entry.date || entry.submittedAt || entry.createdAt || Date.now()).toLocaleString()}
                    </span>
                  </div>

                  <p className="contrib-text">
                    {entry.contribution || entry.text || 'No contribution text provided.'}
                  </p>

                  {(entry.progress !== undefined || entry.progressPercent !== undefined || entry.status || entry.comments) && (
                    <div className="contrib-meta-grid">
                      {(entry.progress !== undefined || entry.progressPercent !== undefined) && (
                        <div className="contrib-meta-cell">
                          <p className="contrib-meta-key">Progress</p>
                          <p className="contrib-meta-val">{entry.progress ?? entry.progressPercent}%</p>
                        </div>
                      )}
                      {entry.status && (
                        <div className="contrib-meta-cell">
                          <p className="contrib-meta-key">Status</p>
                          <p className="contrib-meta-val">{String(entry.status).replace('_', ' ')}</p>
                        </div>
                      )}
                      {entry.comments && (
                        <div className="contrib-meta-cell span-2">
                          <p className="contrib-meta-key">Comments</p>
                          <p className="contrib-meta-val contrib-meta-val-prose">{entry.comments}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Performance() {
  const [currentUser, setCurrentUser]   = useState(null);
  const [isManager, setIsManager]       = useState(false);
  const [activeTab, setActiveTab]       = useState(null);

  const [objectives, setObjectives]     = useState([]);
  const [myObjectives, setMyObjectives] = useState([]);
  const [pendingApprovals, setPending]  = useState([]);
  const [reviews, setReviews]           = useState([]);
  const [myReviews, setMyReviews]       = useState([]);
  const [employees, setEmployees]       = useState([]);
  const [empObjectives, setEmpObjectives] = useState([]);

  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [actionSaving, setActionSaving] = useState(false);

  const [showObjForm, setShowObjForm]     = useState(false);
  const [editingObj, setEditingObj]       = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [sendBackTarget, setSendBackTarget] = useState(null);
  const [inputTarget, setInputTarget]     = useState(null);
  const [contributionTarget, setContributionTarget] = useState(null);

  const [commentingReview, setCommentingReview] = useState(null);
  const [commentText, setCommentText]           = useState('');

  const [objSearch, setObjSearch]       = useState('');
  const [objApprovalFilter, setObjApprovalFilter] = useState('all');
  const [reviewTypeFilter, setReviewTypeFilter]   = useState('all');

  // ── Load current user ────────────────────────────────────────────────────────
  const loadUser = useCallback(async () => {
    try {
      const res = await axios.get('/api/auth/me', authConfig());
      const user = res.data?.data?.user || res.data?.user || res.data;
      setCurrentUser(user);
      const mgr = MANAGER_ROLES.includes(user?.role);
      setIsManager(mgr);
      setActiveTab(mgr ? 'objectives' : 'my-objectives');
      return user;
    } catch {
      setError('Failed to load user. Please refresh the page.');
      return null;
    }
  }, []);

  const fetchEmployees = useCallback(async (role) => {
    try {
      const directTeamRole = ['manager', 'senior-manager'].includes(role);
      const url = directTeamRole
        ? '/api/manager/team/members?includeIndirect=false'
        : '/api/employees';
      const res = await axios.get(url, authConfig());
      const list = res.data?.data || res.data?.employees || res.data || [];
      setEmployees(Array.isArray(list) ? list : []);
    } catch {
      setEmployees([]);
    }
  }, []);

  const fetchEmpObjectives = useCallback(async (employeeId) => {
    if (!employeeId) { setEmpObjectives([]); return; }
    try {
      const res = await goalsApi.getEmployeeGoals(employeeId);
      const list = res?.data || res || [];
      setEmpObjectives(Array.isArray(list) ? list : []);
    } catch {
      setEmpObjectives([]);
    }
  }, []);

  const fetchAllObjectives = useCallback(async () => {
    try {
      const filters = {};
      if (objApprovalFilter !== 'all') filters.approvalStatus = objApprovalFilter;
      if (objSearch) filters.search = objSearch;
      const res = await goalsApi.getAllGoals(filters);
      setObjectives(res?.data || res?.goals || []);
    } catch {
      setObjectives([]);
    }
  }, [objApprovalFilter, objSearch]);

  const fetchPendingApprovals = useCallback(async () => {
    try {
      const res = await goalsApi.getPendingApprovals();
      setPending(res?.data || res?.goals || []);
    } catch {
      setPending([]);
    }
  }, []);

  const fetchMyObjectives = useCallback(async () => {
    try {
      const res = await goalsApi.getMyGoals();
      setMyObjectives(res?.data || res?.goals || []);
    } catch {
      setMyObjectives([]);
    }
  }, []);

  const fetchAllReviews = useCallback(async () => {
    try {
      const filters = {};
      if (reviewTypeFilter !== 'all') filters.reviewType = reviewTypeFilter;
      const res = await reviewsApi.getAllReviews(filters);
      setReviews(res?.data || res?.reviews || []);
    } catch {
      setReviews([]);
    }
  }, [reviewTypeFilter]);

  const fetchMyReviews = useCallback(async () => {
    try {
      const res = await reviewsApi.getMyReviews();
      setMyReviews(Array.isArray(res) ? res : (res?.data || []));
    } catch {
      setMyReviews([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const user = await loadUser();
      if (!user) { setLoading(false); return; }
      const mgr = MANAGER_ROLES.includes(user?.role);
      if (mgr) {
        await Promise.all([fetchEmployees(user?.role), fetchAllObjectives(), fetchPendingApprovals(), fetchAllReviews()]);
      } else {
        await Promise.all([fetchMyObjectives(), fetchMyReviews()]);
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeTab) return;
    switch (activeTab) {
      case 'objectives':    fetchAllObjectives(); break;
      case 'approvals':     fetchPendingApprovals(); break;
      case 'reviews':       fetchAllReviews(); break;
      case 'overview':      fetchEmployees(currentUser?.role); fetchAllObjectives(); break;
      case 'my-objectives': fetchMyObjectives(); break;
      case 'submit-input':  fetchMyObjectives(); break;
      case 'my-reviews':    fetchMyReviews(); break;
      default: break;
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (activeTab === 'objectives') fetchAllObjectives(); }, [objApprovalFilter, objSearch]); // eslint-disable-line
  useEffect(() => { if (activeTab === 'reviews')    fetchAllReviews(); }, [reviewTypeFilter]); // eslint-disable-line

  // ── Objective CRUD ────────────────────────────────────────────────────────────
  const handleSaveObjective = async (payload) => {
    setSaving(true);
    try {
      if (editingObj) {
        await goalsApi.updateGoal(editingObj._id, payload);
      } else {
        await goalsApi.createGoal(payload);
      }
      setShowObjForm(false);
      setEditingObj(null);
      fetchAllObjectives();
      fetchPendingApprovals();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteObjective = async (id) => {
    if (!window.confirm('Delete this objective?')) return;
    try {
      await goalsApi.deleteGoal(id);
      fetchAllObjectives();
      fetchPendingApprovals();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete objective');
    }
  };

  const handleApprove = async (id) => {
    setActionSaving(true);
    try {
      await goalsApi.approveObjective(id);
      fetchAllObjectives();
      fetchPendingApprovals();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to approve');
    } finally {
      setActionSaving(false);
    }
  };

  const handleSendBack = async (reason) => {
    if (!sendBackTarget) return;
    setActionSaving(true);
    try {
      await goalsApi.sendBackObjective(sendBackTarget, reason);
      setSendBackTarget(null);
      fetchAllObjectives();
      fetchPendingApprovals();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to send back');
    } finally {
      setActionSaving(false);
    }
  };

  const handleSaveMyObjective = async (payload) => {
    setSaving(true);
    try {
      if (editingObj) {
        await goalsApi.updateGoal(editingObj._id, payload);
      } else {
        await goalsApi.createGoal(payload);
      }
      setShowObjForm(false);
      setEditingObj(null);
      fetchMyObjectives();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitInput = async ({ text }) => {
    if (!inputTarget) return;
    setActionSaving(true);
    try {
      await goalsApi.submitInput(inputTarget._id, { text });
      setInputTarget(null);
      fetchMyObjectives();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to submit contribution');
    } finally {
      setActionSaving(false);
    }
  };

  const handleSaveReview = async (payload) => {
    setSaving(true);
    try {
      if (editingReview) {
        await reviewsApi.updateReview(editingReview._id, payload);
      } else {
        await reviewsApi.createReview(payload);
      }
      setShowReviewForm(false);
      setEditingReview(null);
      fetchAllReviews();
    } finally {
      setSaving(false);
    }
  };

  const handlePublishReview = async (id) => {
    if (!window.confirm('Publish this review? The employee will be notified and will be able to see their rating.')) return;
    setActionSaving(true);
    try {
      await reviewsApi.publishReview(id);
      fetchAllReviews();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to publish review');
    } finally {
      setActionSaving(false);
    }
  };

  const handleCloseReview = async (id) => {
    if (!window.confirm('Close this review? This action cannot be undone.')) return;
    setActionSaving(true);
    try {
      await reviewsApi.closeReview(id);
      fetchAllReviews();
      fetchMyReviews();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to close review');
    } finally {
      setActionSaving(false);
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await reviewsApi.deleteReview(id);
      fetchAllReviews();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete');
    }
  };

  const handleAddComment = async () => {
    if (!commentingReview || !commentText.trim()) return;
    setActionSaving(true);
    try {
      await reviewsApi.addEmployeeComment(commentingReview, commentText.trim());
      setCommentingReview(null);
      setCommentText('');
      fetchMyReviews();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to add comment');
    } finally {
      setActionSaving(false);
    }
  };

  // ── Tab config ────────────────────────────────────────────────────────────────
  const managerTabs = [
    { id: 'objectives', label: 'Objectives', badge: null },
    { id: 'approvals',  label: 'Approvals',  badge: pendingApprovals.length || null },
    { id: 'reviews',    label: 'Reviews',    badge: null },
    { id: 'overview',   label: 'Team Overview', badge: null }
  ];
  const employeeTabs = [
    { id: 'my-objectives', label: 'My Objectives', badge: null },
    { id: 'submit-input',  label: 'Submit Input',  badge: myObjectives.filter((o) => o.approvalStatus === 'approved').length || null },
    { id: 'my-reviews',    label: 'My Reviews',    badge: null }
  ];
  const tabs = isManager ? managerTabs : employeeTabs;

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="pf-root">
          <Spinner />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{styles}</style>
        <div className="pf-root">
          <div className="error-banner">{error}</div>
        </div>
      </>
    );
  }

  // Status pill class helper
  const reviewStatusClass = (status) => {
    if (status === 'DRAFT') return 'status-pill status-draft';
    if (status === 'SUBMITTED') return 'status-pill status-submitted';
    if (status === 'RATING_PUBLISHED') return 'status-pill status-published';
    if (status === 'REVIEW_CLOSED') return 'status-pill status-closed';
    return 'status-pill status-draft';
  };

  return (
    <>
      <style>{styles}</style>
      <div className="pf-root">

        {/* ── Page Header ── */}
        <div className="page-header anim-fade-up">
          <div className="page-header-inner">
            <div className="page-header-block">
              <div className="page-icon-wrap">
                <svg style={{ width: 18, height: 18, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="page-eyebrow">Growth & Goals</p>
                <h1 className="page-title">Performance</h1>
                <p className="page-subtitle">
                  {isManager
                    ? 'Manage objectives, approvals and performance reviews.'
                    : 'Track your objectives and review history.'}
                </p>
              </div>
            </div>

            {/* Primary action button (right side) */}
            {isManager && activeTab === 'objectives' && (
              <button
                onClick={() => { setEditingObj(null); setShowObjForm(true); }}
                className="btn btn-primary"
                type="button"
              >
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                </svg>
                New Objective
              </button>
            )}
            {isManager && activeTab === 'reviews' && (
              <button
                onClick={() => { setEditingReview(null); setShowReviewForm(true); }}
                className="btn btn-primary"
                type="button"
              >
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                </svg>
                New Review
              </button>
            )}
            {!isManager && activeTab === 'my-objectives' && (
              <button
                onClick={() => { setEditingObj(null); setShowObjForm(true); }}
                className="btn btn-primary"
                type="button"
              >
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                </svg>
                Add Objective
              </button>
            )}
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="tab-bar-wrap anim-fade-up delay-100">
          <div className="tab-bar-inner">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-btn ${activeTab === tab.id ? 'is-active' : ''}`}
                type="button"
              >
                {tab.label}
                {tab.badge > 0 && <span className="tab-pill">{tab.badge}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="pf-main pf-content anim-fade-up delay-200">

          {/* MANAGER: Objectives */}
          {isManager && activeTab === 'objectives' && (
            <div>
              <div className="filter-row">
                <div className="input-wrap">
                  <span className="input-icon">
                    <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={objSearch}
                    onChange={(e) => setObjSearch(e.target.value)}
                    placeholder="Search objectives…"
                    className="text-input with-icon"
                  />
                </div>
                <select
                  value={objApprovalFilter}
                  onChange={(e) => setObjApprovalFilter(e.target.value)}
                  className="select-input"
                >
                  <option value="all">All status</option>
                  <option value="pending">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="sent_back">Sent Back</option>
                </select>
              </div>

              {objectives.length === 0 ? (
                <Empty message="No objectives found." />
              ) : (
                <div className="card-grid">
                  {objectives.map((obj) => (
                    <ObjectiveCard
                      key={obj._id}
                      objective={obj}
                      isManager
                      showEmployee
                      onViewContributions={(o) => setContributionTarget(o)}
                      onEdit={(o) => { setEditingObj(o); setShowObjForm(true); }}
                      onDelete={handleDeleteObjective}
                      onApprove={handleApprove}
                      onSendBack={(id) => setSendBackTarget(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MANAGER: Approvals */}
          {isManager && activeTab === 'approvals' && (
            <div>
              <div className="section-header">
                <h2 className="section-title">Pending Approval ({pendingApprovals.length})</h2>
              </div>
              {pendingApprovals.length === 0 ? (
                <Empty message="No objectives pending approval." />
              ) : (
                <div className="card-grid">
                  {pendingApprovals.map((obj) => (
                    <ObjectiveCard
                      key={obj._id}
                      objective={obj}
                      isManager
                      showEmployee
                      onViewContributions={(o) => setContributionTarget(o)}
                      onApprove={handleApprove}
                      onSendBack={(id) => setSendBackTarget(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MANAGER: Reviews */}
          {isManager && activeTab === 'reviews' && (
            <div>
              <div className="filter-row">
                <select
                  value={reviewTypeFilter}
                  onChange={(e) => setReviewTypeFilter(e.target.value)}
                  className="select-input"
                >
                  <option value="all">All review types</option>
                  {Object.entries(REVIEW_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {reviews.length === 0 ? (
                <Empty message="No reviews found." />
              ) : (
                <div className="table-card">
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th className="col-type">Type</th>
                          <th className="col-period">Period</th>
                          <th className="col-rating">Rating</th>
                          <th>Status</th>
                          <th className="col-comment">Employee Comment</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviews.map((rev) => {
                          const empName = rev.employeeId
                            ? `${rev.employeeId.firstName || ''} ${rev.employeeId.lastName || ''}`.trim()
                            : '—';
                          return (
                            <tr key={rev._id}>
                              <td className="td-strong">{empName}</td>
                              <td className="td-muted col-type">
                                {REVIEW_TYPE_LABELS[rev.reviewType] || rev.reviewType}
                              </td>
                              <td className="td-muted col-period" style={{ whiteSpace: 'nowrap' }}>
                                {rev.reviewPeriodStart
                                  ? `${new Date(rev.reviewPeriodStart).toLocaleDateString()} – ${rev.reviewPeriodEnd ? new Date(rev.reviewPeriodEnd).toLocaleDateString() : '…'}`
                                  : '-'}
                              </td>
                              <td className="col-rating">
                                <PerformanceRatingBadge rating={rev.managerFeedback?.rating} />
                              </td>
                              <td>
                                <span className={reviewStatusClass(rev.status)}>
                                  {rev.status?.replace('_', ' ').toLowerCase()}
                                </span>
                              </td>
                              <td className="col-comment">
                                {rev.employeeComment?.comment ? (
                                  <div>
                                    <p className="td-comment-line" title={rev.employeeComment.comment}>
                                      {rev.employeeComment.comment}
                                    </p>
                                    {rev.employeeComment?.updatedAt && (
                                      <p className="td-comment-time">
                                        {new Date(rev.employeeComment.updatedAt).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="td-italic">No comment</span>
                                )}
                              </td>
                              <td>
                                <div className="td-actions">
                                  {rev.status === 'DRAFT' && (
                                    <>
                                      <button
                                        onClick={() => { setEditingReview(rev); setShowReviewForm(true); }}
                                        className="btn btn-xs btn-secondary"
                                        type="button"
                                      >Edit</button>
                                      <button
                                        onClick={() => handlePublishReview(rev._id)}
                                        disabled={actionSaving}
                                        className="btn btn-xs btn-success"
                                        type="button"
                                      >Publish</button>
                                      <button
                                        onClick={() => handleDeleteReview(rev._id)}
                                        className="btn btn-xs btn-soft-danger"
                                        type="button"
                                      >Delete</button>
                                    </>
                                  )}
                                  {rev.status === 'RATING_PUBLISHED' && (
                                    <button
                                      onClick={() => handleCloseReview(rev._id)}
                                      disabled={actionSaving}
                                      className="btn btn-xs btn-purple"
                                      type="button"
                                    >Close</button>
                                  )}
                                  {rev.status === 'REVIEW_CLOSED' && (
                                    <span className="td-italic">Closed</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MANAGER: Team Overview */}
          {isManager && activeTab === 'overview' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Total Objectives</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">{objectives.length}</p>
                  <p className="mt-1 text-sm text-gray-500">All objectives currently loaded for your team.</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Total Reviews</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">{reviews.length}</p>
                  <p className="mt-1 text-sm text-gray-500">All reviews currently loaded for your team.</p>
                </div>
              </div>
              <div className="section-header">
                <h2 className="section-title">Team Overview</h2>
              </div>
              {employees.length === 0 ? (
                <Empty message="No employees found." />
              ) : (
                <div className="card-grid">
                  {employees.map((emp) => {
                    const empGoals = objectives.filter(
                      (o) => (o.userId?._id || o.userId) === emp._id
                    );
                    const approved = empGoals.filter((o) => o.approvalStatus === 'approved').length;
                    const pending  = empGoals.filter((o) => o.approvalStatus === 'pending').length;
                    return (
                      <div key={emp._id} className="team-card">
                        <div className="team-card-head">
                          <div className="team-avatar">
                            {(emp.firstName?.[0] || '?').toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p className="team-name">{emp.firstName} {emp.lastName}</p>
                            <p className="team-role">{emp.jobTitle || emp.department || '—'}</p>
                          </div>
                        </div>
                        <div className="team-stats">
                          <div className="team-stat is-total">
                            <p className="team-stat-num">{empGoals.length}</p>
                            <p className="team-stat-label">Total</p>
                          </div>
                          <div className="team-stat is-approved">
                            <p className="team-stat-num">{approved}</p>
                            <p className="team-stat-label">Approved</p>
                          </div>
                          <div className="team-stat is-pending">
                            <p className="team-stat-num">{pending}</p>
                            <p className="team-stat-label">Pending</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* EMPLOYEE: My Objectives */}
          {!isManager && activeTab === 'my-objectives' && (
            <div>
              {myObjectives.length === 0 ? (
                <Empty message="You have no objectives yet. Click 'Add Objective' to get started." />
              ) : (
                <div className="card-grid">
                  {myObjectives.map((obj) => (
                    <ObjectiveCard
                      key={obj._id}
                      objective={obj}
                      isManager={false}
                      onEdit={(o) => { setEditingObj(o); setShowObjForm(true); }}
                      onDelete={async (id) => {
                        if (!window.confirm('Delete this objective?')) return;
                        try {
                          await goalsApi.deleteGoal(id);
                          fetchMyObjectives();
                        } catch (err) {
                          alert(err?.response?.data?.message || 'Failed to delete');
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EMPLOYEE: Submit Input */}
          {!isManager && activeTab === 'submit-input' && (
            <div>
              <p className="info-blurb">
                Submit your contributions for approved objectives. These will be visible to your manager when they create your performance review.
              </p>
              {myObjectives.filter((o) => o.approvalStatus === 'approved').length === 0 ? (
                <Empty message="No approved objectives to submit contributions for." />
              ) : (
                <div className="card-grid">
                  {myObjectives
                    .filter((o) => o.approvalStatus === 'approved')
                    .map((obj) => (
                      <ObjectiveCard
                        key={obj._id}
                        objective={obj}
                        isManager={false}
                        onSubmitInput={(o) => setInputTarget(o)}
                      />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* EMPLOYEE: My Reviews */}
          {!isManager && activeTab === 'my-reviews' && (
            <div>
              {myReviews.length === 0 ? (
                <Empty message="No published reviews yet. Your manager will share a review when it's ready." />
              ) : (
                <div>
                  {myReviews.map((rev) => (
                    <div key={rev._id} className="review-card">
                      <div className="review-card-head">
                        <div className="review-type-line">
                          <span className="review-type">
                            {REVIEW_TYPE_LABELS[rev.reviewType] || rev.reviewType}
                          </span>
                          <span className={reviewStatusClass(rev.status)}>
                            {rev.status?.replace('_', ' ').toLowerCase()}
                          </span>
                        </div>
                        <PerformanceRatingBadge rating={rev.managerFeedback?.rating} showFull />
                      </div>

                      {rev.reviewPeriodStart && (
                        <p className="review-period">
                          Period: {new Date(rev.reviewPeriodStart).toLocaleDateString()}
                          {rev.reviewPeriodEnd ? ` – ${new Date(rev.reviewPeriodEnd).toLocaleDateString()}` : ''}
                        </p>
                      )}

                      {rev.managerFeedback?.feedback && (
                        <div className="review-section">
                          <p className="review-label">Feedback</p>
                          <p className="review-text">{rev.managerFeedback.feedback}</p>
                        </div>
                      )}

                      {rev.managerFeedback?.areasForImprovement && (
                        <div className="review-section">
                          <p className="review-label">Areas for Improvement</p>
                          <p className="review-text">{rev.managerFeedback.areasForImprovement}</p>
                        </div>
                      )}

                      {rev.linkedObjectiveIds?.length > 0 && (
                        <div className="review-section">
                          <p className="review-label">Linked Objectives</p>
                          <div className="review-chips">
                            {rev.linkedObjectiveIds.map((obj) => (
                              <span key={obj._id || obj} className="review-chip">
                                {obj.title || obj}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {rev.employeeComment?.comment && (
                        <div className="review-comment-box">
                          <p className="review-comment-label">Your Comment</p>
                          <p className="review-comment-text">{rev.employeeComment.comment}</p>
                        </div>
                      )}

                      {rev.status === 'RATING_PUBLISHED' && !rev.employeeComment?.comment && (
                        commentingReview === rev._id ? (
                          <div className="comment-form-wrap">
                            <textarea
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              rows={3}
                              placeholder="Add your acknowledgement or comment…"
                              className="textarea-field"
                            />
                            <div className="comment-form-actions">
                              <button
                                onClick={handleAddComment}
                                disabled={!commentText.trim() || actionSaving}
                                className="btn btn-primary btn-xs"
                                type="button"
                              >
                                {actionSaving ? 'Submitting…' : 'Submit Comment'}
                              </button>
                              <button
                                onClick={() => { setCommentingReview(null); setCommentText(''); }}
                                className="btn btn-secondary btn-xs"
                                type="button"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="add-comment-trigger">
                            <button
                              onClick={() => setCommentingReview(rev._id)}
                              className="btn btn-secondary btn-xs"
                              type="button"
                            >
                              <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add Comment
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals (passed-through forms keep original logic) ── */}

      {showObjForm && (
        <ObjectiveForm
          initial={editingObj}
          employees={employees}
          isManager={isManager}
          onSave={isManager ? handleSaveObjective : handleSaveMyObjective}
          onClose={() => { setShowObjForm(false); setEditingObj(null); }}
          saving={saving}
        />
      )}

      {showReviewForm && (
        <ReviewForm
          initial={editingReview}
          employees={employees}
          objectives={empObjectives}
          onEmployeeChange={fetchEmpObjectives}
          onSave={handleSaveReview}
          onClose={() => { setShowReviewForm(false); setEditingReview(null); }}
          saving={saving}
        />
      )}

      {sendBackTarget && (
        <SendBackModal
          onConfirm={handleSendBack}
          onClose={() => setSendBackTarget(null)}
          saving={actionSaving}
        />
      )}

      {inputTarget && (
        <SubmitInputModal
          objective={inputTarget}
          onConfirm={handleSubmitInput}
          onClose={() => setInputTarget(null)}
          saving={actionSaving}
        />
      )}

      {contributionTarget && (
        <ViewContributionsModal
          objective={contributionTarget}
          onClose={() => setContributionTarget(null)}
        />
      )}
    </>
  );
}