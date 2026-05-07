import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, TrendingUp, Clock, AlertCircle, CheckCircle, XCircle, Edit, X } from 'lucide-react';
import { getLeaveBalances } from '../utils/leaveApi';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .alb-root {
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
  .alb-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
    height: 600px;
  }
  .alb-shell {
    position: relative; z-index: 1;
    max-width: 100%;
    margin: 0 auto;
    min-width: 0;
  }

  /* ── Keyframes ── */
  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  @keyframes spin { to { transform: rotate(360deg); } }

  .anim-fade-up { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
  .delay-100 { animation-delay: 0.10s; }
  .delay-200 { animation-delay: 0.20s; }
  .delay-300 { animation-delay: 0.30s; }
  .delay-400 { animation-delay: 0.40s; }

  /* ══════════════════════════════════════
     PAGE HEADER
  ══════════════════════════════════════ */
  .page-header {
    display: flex; gap: 0.7rem; align-items: flex-start;
    margin-bottom: 1.4rem;
    min-width: 0;
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
  .header-subtitle {
    font-size: 0.78rem; color: #7a8e84; font-weight: 300;
    margin: 0.2rem 0 0;
  }

  /* ══════════════════════════════════════
     STAT CARDS
  ══════════════════════════════════════ */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.7rem;
    margin-bottom: 1.1rem;
  }
  @media (min-width: 1024px) {
    .stats-grid { grid-template-columns: repeat(4, 1fr); gap: 0.85rem; }
  }
  .stat-card {
    background: #fff;
    border: 1.5px solid #eaefeb;
    border-radius: 12px;
    padding: 0.85rem 0.95rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    position: relative;
    overflow: hidden;
    transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
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
    font-size: 1.85rem; font-weight: 400;
    color: #2f3e46;
    letter-spacing: -0.02em;
    line-height: 1.05;
    margin: 0 0 0.15rem;
  }
  .stat-sub {
    font-size: 0.66rem; color: #7a8e84; font-weight: 400;
    margin: 0;
  }

  /* Accent variants */
  .stat-card.is-total {
    --accent: #52796f;
    --accent-bg: rgba(82,121,111,0.12);
    --accent-border: rgba(82,121,111,0.22);
    --accent-text: #354f52;
  }
  .stat-card.is-days {
    --accent: #84a98c;
    --accent-bg: rgba(132,169,140,0.16);
    --accent-border: rgba(132,169,140,0.26);
    --accent-text: #2f4a32;
  }
  .stat-card.is-taken {
    --accent: #b89758;
    --accent-bg: rgba(184,151,88,0.14);
    --accent-border: rgba(184,151,88,0.24);
    --accent-text: #6b5524;
  }
  .stat-card.is-pending {
    --accent: #6f8c98;
    --accent-bg: rgba(111,140,152,0.14);
    --accent-border: rgba(111,140,152,0.24);
    --accent-text: #4d6975;
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
    box-shadow: none; cursor: not-allowed; transform: none;
  }
  .btn-secondary {
    background: #fff; color: #354f52;
    border: 1px solid #d4ddd6;
  }
  .btn-secondary:hover:not(:disabled) {
    background: #f0f5f2; border-color: #84a98c; color: #2f3e46;
  }
  .btn-block { width: 100%; }

  /* ══════════════════════════════════════
     FILTER BAR
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
    display: flex; flex-direction: column;
    gap: 0.65rem;
  }
  @media (min-width: 640px) {
    .filter-row {
      flex-direction: row;
      align-items: center;
    }
  }
  .filter-search-wrap { flex: 1; position: relative; }
  .filter-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%);
    color: #84a98c;
    pointer-events: none;
    display: flex; align-items: center;
  }
  .text-input {
    width: 100%;
    padding: 0.55rem 0.85rem 0.55rem 2.2rem;
    border: 1.5px solid #d4ddd6;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem; color: #2f3e46;
    background: #fff;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    min-height: 38px;
  }
  .text-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .text-input::placeholder { color: #b6c0b9; }
  .native-select {
    width: 100%;
    padding: 0.55rem 2rem 0.55rem 0.85rem;
    border: 1.5px solid #d4ddd6;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem; color: #2f3e46;
    background: #fff
      url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2384a98c'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")
      no-repeat right 8px center / 16px;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
    min-height: 38px;
    appearance: none;
    -webkit-appearance: none;
  }
  .native-select:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  @media (min-width: 640px) {
    .filter-select-wrap { width: 220px; }
  }

  /* Field labels (modal) */
  .form-field { margin-bottom: 0.95rem; }
  .form-field:last-child { margin-bottom: 0; }
  .field-label {
    display: block;
    font-size: 0.62rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #52796f;
    margin-bottom: 0.4rem;
  }
  .field-required { color: #b85c50; margin-left: 0.15rem; }
  .field-hint {
    font-size: 0.66rem; color: #8fa99a; font-weight: 400;
    margin-top: 0.4rem;
  }
  .number-input, .textarea-input {
    width: 100%;
    padding: 0.55rem 0.85rem;
    border: 1.5px solid #d4ddd6;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem; color: #2f3e46;
    background: #fff;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    min-height: 38px;
  }
  .number-input:focus, .textarea-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .textarea-input { min-height: 76px; resize: vertical; }

  /* ══════════════════════════════════════
     TABLE (desktop)
  ══════════════════════════════════════ */
  .data-card {
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
  .data-table tbody tr {
    border-bottom: 1px solid #eaefeb;
    transition: background 0.15s;
  }
  .data-table tbody tr:last-child { border-bottom: none; }
  .data-table tbody tr:hover { background: #fafbfa; }
  .data-table td {
    padding: 0.7rem 0.7rem;
    font-size: 0.78rem;
    color: #2f3e46;
    vertical-align: middle;
  }
  .td-name { font-weight: 600; color: #2f3e46; }
  .td-muted { color: #7a8e84; }
  .td-num {
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    color: #354f52;
  }
  .td-num-warn {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: #6b5524;
  }

  /* Status pills */
  .status-pill {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.2rem 0.55rem;
    font-size: 0.65rem; font-weight: 600;
    border-radius: 999px;
    letter-spacing: 0.02em;
    border: 1px solid var(--pill-border, #eaefeb);
    background: var(--pill-bg, #fafbfa);
    color: var(--pill-text, #354f52);
    white-space: nowrap;
  }
  .status-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--pill-text, #84a98c);
    flex-shrink: 0;
  }
  .status-active {
    --pill-bg: rgba(82,121,111,0.12);
    --pill-border: rgba(82,121,111,0.25);
    --pill-text: #2f4a32;
  }
  .status-needs-setup {
    --pill-bg: rgba(184,151,88,0.14);
    --pill-border: rgba(184,151,88,0.26);
    --pill-text: #6b5524;
  }
  .status-inactive {
    --pill-bg: rgba(192,117,106,0.12);
    --pill-border: rgba(192,117,106,0.25);
    --pill-text: #7a3028;
  }
  .status-default {
    --pill-bg: #fafbfa;
    --pill-border: #eaefeb;
    --pill-text: #7a8e84;
  }

  .needs-init-icon {
    color: #b89758;
    margin-left: 0.4rem;
    display: inline-flex;
    vertical-align: middle;
    cursor: help;
  }

  /* Edit row icon button */
  .row-edit-btn {
    background: none;
    border: none;
    cursor: pointer;
    width: 30px; height: 30px;
    border-radius: 7px;
    display: inline-flex; align-items: center; justify-content: center;
    color: #52796f;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .row-edit-btn:hover {
    background: rgba(82,121,111,0.10);
    color: #354f52;
  }

  /* Hide low-priority columns at narrower widths */
  @media (max-width: 1199px) {
    .col-pending { display: none; }
  }
  @media (max-width: 879px) {
    .col-department { display: none; }
  }
  @media (max-width: 639px) {
    .desktop-table { display: none; }
  }
  @media (min-width: 640px) {
    .mobile-cards { display: none; }
  }

  /* ══════════════════════════════════════
     MOBILE CARDS
  ══════════════════════════════════════ */
  .mobile-cards {
    display: flex; flex-direction: column; gap: 0.7rem;
  }
  .mob-card {
    background: #fff;
    border: 1.5px solid #eaefeb;
    border-radius: 12px;
    padding: 0.85rem 0.95rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
  }
  .mob-card-head {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 0.65rem;
    margin-bottom: 0.7rem;
    padding-bottom: 0.55rem;
    border-bottom: 1px solid #eaefeb;
  }
  .mob-name {
    font-size: 0.88rem; font-weight: 600;
    color: #2f3e46;
    line-height: 1.3;
    margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .mob-dept {
    font-size: 0.7rem; color: #7a8e84; font-weight: 400;
    margin: 0.15rem 0 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .mob-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.55rem 0.85rem;
    margin-bottom: 0.7rem;
  }
  .mob-cell {
    text-align: left;
  }
  .mob-cell-key {
    font-size: 0.55rem; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #84a98c;
    margin: 0 0 0.18rem;
  }
  .mob-cell-val {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.15rem; font-weight: 500;
    color: #2f3e46;
    letter-spacing: -0.01em;
    margin: 0;
    line-height: 1;
  }
  .mob-cell-val-unit {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.62rem;
    font-weight: 500;
    color: #84a98c;
    margin-left: 0.2rem;
  }
  .mob-needs-init {
    font-size: 0.7rem;
    color: #6b5524;
    background: rgba(184,151,88,0.14);
    border: 1px solid rgba(184,151,88,0.24);
    border-radius: 7px;
    padding: 0.4rem 0.6rem;
    margin: 0 0 0.7rem;
    display: flex; align-items: center; gap: 0.45rem;
  }

  /* ══════════════════════════════════════
     LOADING / EMPTY / ERROR (full page)
  ══════════════════════════════════════ */
  .full-page-state {
    min-height: 100vh;
    background: #f7f8f6;
    display: flex; align-items: center; justify-content: center;
    padding: 1.5rem;
    position: relative;
    overflow: hidden;
    font-family: 'DM Sans', sans-serif;
  }
  .full-page-state::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 50% 30%, rgba(132,169,140,0.10) 0%, transparent 60%);
    pointer-events: none;
  }
  .state-card {
    position: relative; z-index: 1;
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 14px;
    padding: 2.25rem 1.5rem;
    text-align: center;
    box-shadow: 0 8px 24px rgba(47,62,70,0.06);
    max-width: 420px;
    width: 100%;
  }
  .state-icon-wrap {
    width: 60px; height: 60px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1rem;
  }
  .state-icon-wrap.is-empty {
    background: rgba(132,169,140,0.12);
    color: #84a98c;
  }
  .state-icon-wrap.is-error {
    background: rgba(192,117,106,0.12);
    color: #b85c50;
  }
  .state-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.4rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0 0 0.5rem;
  }
  .state-text {
    font-size: 0.82rem; color: #7a8e84; font-weight: 300;
    margin: 0 0 0.85rem;
    line-height: 1.55;
  }
  .state-text-fine {
    font-size: 0.72rem; color: #8fa99a;
    margin: 0 0 1rem;
  }

  .full-page-spinner {
    min-height: 100vh;
    background: #f7f8f6;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0.85rem;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    overflow: hidden;
  }
  .full-page-spinner::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 50% 30%, rgba(132,169,140,0.10) 0%, transparent 60%);
    pointer-events: none;
  }
  .spinner {
    width: 36px; height: 36px;
    border: 3px solid rgba(82,121,111,0.18);
    border-top-color: #52796f;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    position: relative;
    z-index: 1;
  }
  .spinner-text {
    font-size: 0.78rem; color: #7a8e84; font-weight: 400;
    margin: 0;
    position: relative; z-index: 1;
  }

  /* ══════════════════════════════════════
     EDIT BALANCE MODAL
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
    max-width: 480px;
    max-height: 92vh;
    overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 32px 64px rgba(47,62,70,0.25);
    animation: scaleIn 0.25s cubic-bezier(0.22,1,0.36,1);
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
    font-size: 1.3rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0.15rem 0 0;
    line-height: 1.25;
  }
  .modal-subtitle {
    font-size: 0.78rem; color: #52796f; font-weight: 500;
    margin: 0.25rem 0 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
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
  .modal-footer {
    display: flex; justify-content: flex-end; gap: 0.5rem;
    padding: 0.85rem 1.4rem;
    border-top: 1px solid #eaefeb;
    background: #fafbfa;
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  .modal-footer .btn { flex: 1; }

  .modal-error-banner {
    border-left: 3px solid #c0756a;
    background: linear-gradient(135deg, #fdf3f2, #fdecea);
    border-radius: 9px;
    padding: 0.65rem 0.85rem;
    font-size: 0.78rem;
    color: #7a3028;
    margin-bottom: 0.95rem;
  }

  .upload-spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(202,210,197,0.4);
    border-top-color: #cad2c5;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1023px) {
    .alb-root { padding: 1.25rem; }
    .header-title { font-size: 1.45rem; }
    .stat-value { font-size: 1.65rem; }
  }
  @media (max-width: 767px) {
    .alb-root { padding: 0.85rem; }
    .header-title { font-size: 1.3rem; }
    .header-icon-wrap { width: 34px; height: 34px; border-radius: 9px; }
    .stat-card { padding: 0.7rem 0.8rem; }
    .stat-value { font-size: 1.45rem; }
    .data-table th { padding: 0.55rem 0.5rem; font-size: 0.55rem; }
    .data-table td { padding: 0.55rem 0.5rem; font-size: 0.74rem; }
    .modal-header, .modal-body { padding-left: 1.1rem; padding-right: 1.1rem; }
    .modal-footer { padding-left: 1.1rem; padding-right: 1.1rem; }
  }
  @media (max-width: 479px) {
    .alb-root { padding: 0.65rem; }
    .header-title { font-size: 1.2rem; }
    .stats-grid { gap: 0.55rem; }
    .modal-overlay { padding: 0; align-items: flex-end; }
    .modal-box { border-radius: 18px 18px 0 0; max-height: 92vh; }
    .text-input, .number-input, .textarea-input, .native-select { font-size: 16px; }
  }
`;

const AnnualLeaveBalance = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [error, setError] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    if (user?.role) {
      setUserRole(user.role);
    }
  }, [user]);

  useEffect(() => {
    const fetchLeaveBalances = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getLeaveBalances({ current: true, includeAll: true });

        // Support two common shapes returned by API helpers:
        // 1) The helper returns axios-like object: { data: [...] }
        // 2) The helper returns the already-unwrapped data array: [ ... ]
        let payload = response;
        if (response && response.data) payload = response.data;

        if (!payload || !Array.isArray(payload)) {
          setError('No leave balance data available');
          setEmployees([]);
          return;
        }

        const transformedData = payload.map(balance => {
          const userName = balance.user
            ? `${balance.user.firstName || ''} ${balance.user.lastName || ''}`.trim()
            : 'Unknown Employee';
          const userDept = balance.user?.department || 'N/A';
          const entitlementDays = Number(balance.entitlementDays || 0);
          const carryOverDays = Number(balance.carryOverDays || 0);
          const leaveAllowance = Number(balance.user?.leaveAllowance || 0);
          const totalLeave = entitlementDays + carryOverDays + leaveAllowance;
          const remainingLeave = Number(balance.remainingDays || 0) + leaveAllowance;

          return {
            id: balance._id,
            name: userName,
            department: userDept,
            entitlementDays,
            carryOverDays,
            leaveAllowance,
            totalLeave,
            takenLeave: balance.usedDays || 0,
            pendingLeave: 0,
            remainingLeave,
            status: balance.hasBalance ? 'active' : 'needs-setup',
            userId: balance.user?._id,
            yearStart: balance.leaveYearStart,
            yearEnd: balance.leaveYearEnd,
            needsInitialization: balance.needsInitialization || false
          };
        });

        setEmployees(transformedData);
      } catch (err) {
        console.error('Failed to fetch leave balances:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load leave balances');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveBalances();
  }, []);

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || employee.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const departments = ['all', ...new Set(employees.map(emp => emp.department))];

  const isAdminUser = ['admin', 'super-admin'].includes(userRole);

  const getStatusPillClass = (status) => {
    switch (status) {
      case 'active': return 'status-pill status-active';
      case 'needs-setup': return 'status-pill status-needs-setup';
      case 'inactive': return 'status-pill status-inactive';
      default: return 'status-pill status-default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'needs-setup': return 'Needs Setup';
      case 'inactive': return 'Inactive';
      default: return 'Unknown';
    }
  };

  const totalEmployees = employees.length;
  const totalLeaveDays = employees.reduce((sum, emp) => sum + emp.totalLeave, 0);
  const totalTaken = employees.reduce((sum, emp) => sum + emp.takenLeave, 0);
  const totalPending = employees.reduce((sum, emp) => sum + emp.pendingLeave, 0);

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="full-page-spinner">
          <div className="spinner"></div>
          <p className="spinner-text">Loading leave balances…</p>
        </div>
      </>
    );
  }

  if (error && employees.length === 0) {
    return (
      <>
        <style>{styles}</style>
        <div className="full-page-state">
          <div className="state-card">
            <div className="state-icon-wrap is-error">
              <AlertCircle style={{ width: 28, height: 28 }} />
            </div>
            <h3 className="state-title">Failed to load leave balances</h3>
            <p className="state-text">{error}</p>
            <p className="state-text-fine">
              Check the browser console (F12) for more details.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!loading && employees.length === 0) {
    return (
      <>
        <style>{styles}</style>
        <div className="full-page-state">
          <div className="state-card">
            <div className="state-icon-wrap is-empty">
              <Users style={{ width: 28, height: 28 }} />
            </div>
            <h3 className="state-title">No leave balance data</h3>
            <p className="state-text">
              No leave balance records found. Leave balances need to be initialized for employees.
            </p>
            <p className="state-text-fine">
              Contact your administrator to set up leave balances.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="alb-root">
        <div className="alb-shell">

          {/* ── Page header ── */}
          <div className="page-header anim-fade-up">
            <div className="header-icon-wrap">
              <svg style={{ width: 18, height: 18, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="header-eyebrow">Time Off · Yearly</p>
              <h1 className="header-title">Annual Leave Balance</h1>
              <p className="header-subtitle">Track and manage employee leave balances.</p>
            </div>
          </div>

          {/* ── Stats grid ── */}
          <div className="stats-grid">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="stat-card is-total"
            >
              <div className="stat-card-row">
                <p className="stat-label">Total Employees</p>
                <span className="stat-icon-tile">
                  <Users style={{ width: 14, height: 14 }} />
                </span>
              </div>
              <p className="stat-value">{totalEmployees}</p>
              <p className="stat-sub">across all departments</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="stat-card is-days"
            >
              <div className="stat-card-row">
                <p className="stat-label">Total Leave Days</p>
                <span className="stat-icon-tile">
                  <Calendar style={{ width: 14, height: 14 }} />
                </span>
              </div>
              <p className="stat-value">{totalLeaveDays}</p>
              <p className="stat-sub">entitlement + carry-over + allowance</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="stat-card is-taken"
            >
              <div className="stat-card-row">
                <p className="stat-label">Taken Leave</p>
                <span className="stat-icon-tile">
                  <TrendingUp style={{ width: 14, height: 14 }} />
                </span>
              </div>
              <p className="stat-value">{totalTaken}</p>
              <p className="stat-sub">days used so far</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              className="stat-card is-pending"
            >
              <div className="stat-card-row">
                <p className="stat-label">Pending Leave</p>
                <span className="stat-icon-tile">
                  <Clock style={{ width: 14, height: 14 }} />
                </span>
              </div>
              <p className="stat-value">{totalPending}</p>
              <p className="stat-sub">awaiting approval</p>
            </motion.div>
          </div>

          {/* ── Filter bar ── */}
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
                  placeholder="Search employees…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-input"
                />
              </div>
              <div className="filter-select-wrap">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="native-select"
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept === 'all' ? 'All Departments' : dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Mobile cards ── */}
          <div className="mobile-cards anim-fade-up delay-300">
            {filteredEmployees.map((employee, index) => (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 8) * 0.04 }}
                className="mob-card"
              >
                <div className="mob-card-head">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="mob-name">{employee.name}</p>
                    <p className="mob-dept">{employee.department}</p>
                  </div>
                  <span className={getStatusPillClass(employee.status)}>
                    <span className="status-dot"></span>
                    {getStatusLabel(employee.status)}
                  </span>
                </div>

                <div className="mob-grid">
                  <div className="mob-cell">
                    <p className="mob-cell-key">Total</p>
                    <p className="mob-cell-val">
                      {employee.totalLeave}<span className="mob-cell-val-unit">d</span>
                    </p>
                  </div>
                  <div className="mob-cell">
                    <p className="mob-cell-key">Taken</p>
                    <p className="mob-cell-val">
                      {employee.takenLeave}<span className="mob-cell-val-unit">d</span>
                    </p>
                  </div>
                  <div className="mob-cell">
                    <p className="mob-cell-key">Pending</p>
                    <p className="mob-cell-val">
                      {employee.pendingLeave}<span className="mob-cell-val-unit">d</span>
                    </p>
                  </div>
                </div>

                {employee.needsInitialization && (
                  <p className="mob-needs-init">
                    <AlertCircle style={{ width: 13, height: 13, flexShrink: 0 }} />
                    Needs leave balance initialization
                  </p>
                )}

                {isAdminUser && (
                  <button
                    onClick={() => {
                      setEditingEmployee(employee);
                      setShowEditModal(true);
                    }}
                    className="btn btn-primary btn-block"
                    type="button"
                  >
                    <Edit style={{ width: 12, height: 12 }} />
                    Edit Leave Balance
                  </button>
                )}
              </motion.div>
            ))}
          </div>

          {/* ── Desktop table ── */}
          <div className="data-card desktop-table anim-fade-up delay-300">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th className="col-department">Department</th>
                    <th>Total</th>
                    <th>Taken</th>
                    <th className="col-pending">Pending</th>
                    <th>Status</th>
                    {isAdminUser && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee, index) => (
                    <motion.tr
                      key={employee.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index, 8) * 0.03 }}
                    >
                      <td className="td-name">{employee.name}</td>
                      <td className="td-muted col-department">{employee.department}</td>
                      <td className="td-num">{employee.totalLeave}</td>
                      <td className="td-num">{employee.takenLeave}</td>
                      <td className="td-num col-pending">{employee.pendingLeave}</td>
                      <td>
                        <span className={getStatusPillClass(employee.status)}>
                          <span className="status-dot"></span>
                          {getStatusLabel(employee.status)}
                        </span>
                        {employee.needsInitialization && (
                          <span className="needs-init-icon" title="This employee needs leave balance initialization">
                            <AlertCircle style={{ width: 13, height: 13 }} />
                          </span>
                        )}
                      </td>
                      {isAdminUser && (
                        <td>
                          <button
                            onClick={() => {
                              setEditingEmployee(employee);
                              setShowEditModal(true);
                            }}
                            className="row-edit-btn"
                            title="Edit leave balance"
                            type="button"
                          >
                            <Edit style={{ width: 14, height: 14 }} />
                          </button>
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ── Edit Modal ── */}
      {showEditModal && editingEmployee && (
        <EditLeaveBalanceModal
          employee={editingEmployee}
          onClose={() => {
            setShowEditModal(false);
            setEditingEmployee(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingEmployee(null);
            window.location.reload();
          }}
        />
      )}
    </>
  );
};

// ─── Edit Leave Balance Modal ─────────────────────────────────────────────────
const EditLeaveBalanceModal = ({ employee, onClose, onSuccess }) => {
  const [entitlementDays, setEntitlementDays] = useState(employee.entitlementDays ?? 28);
  const [carryOverDays, setCarryOverDays] = useState(employee.carryOverDays ?? 0);
  const [leaveAllowance, setLeaveAllowance] = useState(employee.leaveAllowance ?? 0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason || reason.trim().length === 0) {
      setError('Please provide a reason for the adjustment');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.put(`/api/leave/admin/balance/${employee.userId}`, {
        entitlementDays: parseInt(entitlementDays),
        carryOverDays: parseInt(carryOverDays),
        leaveAllowance: parseInt(leaveAllowance),
        reason: reason.trim()
      });

      if (response.data.success) {
        alert('Leave balance updated successfully!');
        onSuccess();
      }
    } catch (err) {
      console.error('Error updating leave balance:', err);
      setError(err.response?.data?.message || 'Failed to update leave balance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-box">
        <div className="modal-header">
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="modal-eyebrow">Adjust Allocation</p>
            <h3 className="modal-title">Edit Leave Balance</h3>
            <p className="modal-subtitle">{employee.name}</p>
          </div>
          <button
            onClick={onClose}
            className="modal-close"
            aria-label="Close"
            type="button"
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <div className="modal-body">
            {error && (
              <div className="modal-error-banner">{error}</div>
            )}

            <div className="form-field">
              <label className="field-label">
                Annual Entitlement (days)<span className="field-required">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={entitlementDays}
                onChange={(e) => setEntitlementDays(e.target.value)}
                className="number-input"
                required
              />
              <p className="field-hint">
                Current: {employee.totalLeave} days · Standard UK: 28 days
              </p>
            </div>

            <div className="form-field">
              <label className="field-label">Carry Over Days</label>
              <input
                type="number"
                min="0"
                value={carryOverDays}
                onChange={(e) => setCarryOverDays(e.target.value)}
                className="number-input"
              />
            </div>

            <div className="form-field">
              <label className="field-label">Leave Allowance (days)</label>
              <input
                type="number"
                min="0"
                value={leaveAllowance}
                onChange={(e) => setLeaveAllowance(e.target.value)}
                className="number-input"
              />
              <p className="field-hint">
                Total available = entitlement + carry-over + allowance
              </p>
            </div>

            <div className="form-field">
              <label className="field-label">
                Reason for Adjustment<span className="field-required">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="textarea-input"
                rows={3}
                placeholder="e.g., Additional days granted, Contractual change…"
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="upload-spinner"></div>
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnnualLeaveBalance;