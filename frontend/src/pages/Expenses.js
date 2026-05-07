import React, { useState, useEffect, useRef } from 'react';
import axios from '../utils/axiosConfig';
import { motion } from 'framer-motion';
import {
  Plus,
  FileText,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  Tag,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AddExpense from './AddExpense';
import ExpenseDetailsModal from '../components/ExpenseDetailsModal';
import ModernDatePicker from '../components/ModernDatePicker';
import { Popover, PopoverTrigger, PopoverContent } from '../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .ex-root {
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
  .ex-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
    height: 600px;
  }
  .ex-shell {
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
  .delay-100 { animation-delay: 0.10s; }
  .delay-200 { animation-delay: 0.20s; }

  /* ══════════════════════════════════════
     PAGE HEADER
  ══════════════════════════════════════ */
  .page-header {
    display: flex; flex-direction: column;
    gap: 0.85rem;
    margin-bottom: 1.25rem;
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
    font-size: 1.6rem; color: #2f3e46; line-height: 1.15; letter-spacing: -0.02em;
    margin: 0;
  }
  .header-subtitle {
    font-size: 0.78rem; color: #7a8e84; font-weight: 300;
    margin: 0.2rem 0 0;
    display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
  }
  .role-badge {
    display: inline-flex; align-items: center;
    padding: 0.18rem 0.55rem;
    background: rgba(82,121,111,0.12);
    color: #354f52;
    border: 1px solid rgba(82,121,111,0.22);
    border-radius: 999px;
    font-size: 0.6rem; font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
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
  .btn-success {
    background: linear-gradient(135deg, #52796f 0%, #6b8e7f 100%);
    color: #fff;
    box-shadow: 0 3px 10px rgba(82,121,111,0.22);
  }
  .btn-success:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 5px 14px rgba(82,121,111,0.3);
  }
  .btn-secondary {
    background: #fff; color: #354f52;
    border: 1px solid #d4ddd6;
  }
  .btn-secondary:hover:not(:disabled) {
    background: #f0f5f2; border-color: #84a98c; color: #2f3e46;
  }
  .btn-soft-danger {
    background: rgba(192,117,106,0.1); color: #b85c50;
    border: 1px solid rgba(192,117,106,0.22);
  }
  .btn-soft-danger:hover:not(:disabled) {
    background: rgba(192,117,106,0.18); color: #7a3028;
  }
  .btn-xs {
    font-size: 0.66rem; padding: 0.3rem 0.6rem; min-height: 28px;
    border-radius: 6px; gap: 0.3rem;
  }

  /* ══════════════════════════════════════
     POPOVER (Add Claim menu)
  ══════════════════════════════════════ */
  .pop-menu-item {
    width: 100%;
    background: none;
    border: none;
    padding: 0.55rem 0.85rem;
    display: flex; align-items: center; gap: 0.5rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem; font-weight: 500;
    color: #354f52;
    cursor: pointer;
    transition: background 0.15s;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
  }
  .pop-menu-item:hover { background: #f0f5f2; }
  .pop-menu-item + .pop-menu-item { border-top: 1px solid #f0f0ec; }

  /* ══════════════════════════════════════
     FILTER CARD
  ══════════════════════════════════════ */
  .filter-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 1rem 1.1rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    margin-bottom: 0.7rem;
  }
  .filter-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.85rem;
  }
  @media (min-width: 640px) {
    .filter-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (min-width: 1024px) {
    .filter-grid { grid-template-columns: repeat(5, 1fr); }
  }
  .field-label {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.62rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #52796f;
    margin-bottom: 0.4rem;
  }
  .text-input {
    width: 100%;
    padding: 0.5rem 0.85rem;
    border: 1.5px solid #d4ddd6;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8rem; color: #2f3e46;
    background: #fff;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    min-height: 36px;
  }
  .text-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }

  /* ══════════════════════════════════════
     SUMMARY ROW (count + reset + view + export)
  ══════════════════════════════════════ */
  .summary-row {
    display: flex; flex-direction: column;
    gap: 0.6rem;
    margin-bottom: 1rem;
    padding: 0.4rem 0.1rem;
  }
  @media (min-width: 768px) {
    .summary-row {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
  }
  .summary-text {
    font-size: 0.76rem; color: #52796f; font-weight: 400;
    line-height: 1.5;
  }
  .summary-text .count {
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.95rem; font-weight: 500;
    color: #2f3e46;
    margin: 0 0.05rem;
  }
  .reset-link {
    background: none; border: none; cursor: pointer;
    color: #52796f;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem; font-weight: 500;
    text-decoration: underline;
    text-decoration-color: rgba(82,121,111,0.4);
    text-underline-offset: 3px;
    margin-left: 0.5rem;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
    transition: color 0.15s, text-decoration-color 0.15s;
  }
  .reset-link:hover {
    color: #354f52;
    text-decoration-color: #52796f;
  }

  .summary-actions {
    display: flex; align-items: center;
    gap: 0.7rem;
    flex-wrap: wrap;
  }
  .view-inline {
    display: none;
  }
  @media (min-width: 768px) {
    .view-inline {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  }
  .view-inline-label {
    font-size: 0.7rem; color: #7a8e84; font-weight: 500;
  }

  /* ══════════════════════════════════════
     TABLE / DATA SURFACE
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
  .data-table th.is-center { text-align: center; }
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
  .data-table td.is-center { text-align: center; }
  .td-strong { font-weight: 600; color: #2f3e46; }
  .td-muted { color: #7a8e84; }
  .td-index {
    color: #8fa99a;
    font-weight: 500;
    width: 44px;
  }
  .td-amount {
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    color: #2f3e46;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .td-currency {
    font-size: 0.62rem;
    color: #84a98c;
    font-weight: 500;
    margin-right: 0.2rem;
    letter-spacing: 0.05em;
  }
  .td-category-link {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: inherit;
    font-weight: 500;
    color: #354f52;
    text-align: left;
    transition: color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .td-category-link:hover {
    color: #2f3e46;
    text-decoration: underline;
    text-decoration-color: #84a98c;
    text-underline-offset: 3px;
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
  .status-pending  {
    --pill-bg: rgba(184,151,88,0.12);
    --pill-border: rgba(184,151,88,0.25);
    --pill-text: #6b5524;
  }
  .status-approved {
    --pill-bg: rgba(82,121,111,0.12);
    --pill-border: rgba(82,121,111,0.25);
    --pill-text: #2f4a32;
  }
  .status-declined {
    --pill-bg: rgba(192,117,106,0.12);
    --pill-border: rgba(192,117,106,0.25);
    --pill-text: #7a3028;
  }
  .status-paid {
    --pill-bg: rgba(111,140,152,0.12);
    --pill-border: rgba(111,140,152,0.25);
    --pill-text: #354f52;
  }

  /* Row action icon buttons */
  .td-actions {
    display: flex; align-items: center; gap: 0.2rem;
  }
  .icon-btn {
    background: none; border: none; cursor: pointer;
    width: 30px; height: 30px;
    border-radius: 7px;
    display: inline-flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
    color: #84a98c;
  }
  .icon-btn:hover:not(:disabled) {
    color: #2f3e46;
    background: #f0f5f2;
  }
  .icon-btn:disabled {
    color: #d4ddd6;
    cursor: not-allowed;
  }
  .icon-btn.is-view { color: #52796f; }
  .icon-btn.is-view:hover { background: rgba(82,121,111,0.10); color: #354f52; }
  .icon-btn.is-edit { color: #6f8c98; }
  .icon-btn.is-edit:hover { background: rgba(111,140,152,0.10); color: #4d6975; }
  .icon-btn.is-edit:disabled { color: #d4ddd6; }
  .icon-btn.is-delete { color: #b85c50; }
  .icon-btn.is-delete:hover { background: rgba(192,117,106,0.10); color: #7a3028; }

  /* Hide low-priority columns at narrower widths */
  @media (max-width: 1199px) {
    .col-type { display: none; }
  }
  @media (max-width: 1023px) {
    .col-approver { display: none; }
  }
  @media (max-width: 879px) {
    .col-submitted { display: none; }
  }
  @media (max-width: 639px) {
    .desktop-table { display: none; }
  }
  @media (min-width: 640px) {
    .mobile-cards { display: none; }
  }

  /* ══════════════════════════════════════
     MOBILE CARDS (< 640px)
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
    gap: 0.7rem;
    margin-bottom: 0.65rem;
    padding-bottom: 0.55rem;
    border-bottom: 1px solid #eaefeb;
  }
  .mob-card-title {
    font-size: 0.85rem; font-weight: 600;
    color: #2f3e46;
    margin: 0;
    line-height: 1.3;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .mob-card-meta {
    font-size: 0.66rem; color: #7a8e84;
    margin: 0.15rem 0 0;
  }
  .mob-card-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.55rem 0.85rem;
    margin-bottom: 0.7rem;
  }
  .mob-key {
    font-size: 0.55rem; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #84a98c;
    margin: 0 0 0.18rem;
  }
  .mob-val {
    font-size: 0.78rem; color: #2f3e46; font-weight: 500;
    line-height: 1.3;
  }
  .mob-val.is-amount {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .mob-approver {
    font-size: 0.7rem; color: #7a8e84;
    margin: 0 0 0.7rem;
    padding: 0.4rem 0.55rem;
    background: #fafbfa;
    border-radius: 6px;
  }
  .mob-approver strong {
    color: #354f52;
    font-weight: 500;
  }
  .mob-actions {
    display: flex; gap: 0.4rem;
    padding-top: 0.55rem;
    border-top: 1px solid #eaefeb;
  }
  .mob-actions .btn { flex: 1; min-height: 32px; font-size: 0.7rem; padding: 0.4rem 0.6rem; }
  .mob-actions .btn-icon-only {
    flex: 0 0 auto;
    width: 36px; padding: 0;
  }

  /* ══════════════════════════════════════
     EMPTY / LOADING / ERROR
  ══════════════════════════════════════ */
  .empty-state {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 14px;
    padding: 3.25rem 1.5rem;
    text-align: center;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
  }
  .empty-icon-wrap {
    width: 60px; height: 60px;
    border-radius: 50%;
    background: rgba(132,169,140,0.12);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1rem;
    color: #84a98c;
  }
  .empty-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.35rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0 0 0.4rem;
  }
  .empty-text {
    font-size: 0.82rem; color: #7a8e84; font-weight: 300;
    margin: 0;
    max-width: 420px;
    margin-left: auto; margin-right: auto;
  }
  .loading-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 14px;
    padding: 2.75rem 1.5rem;
    text-align: center;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
  }
  .spinner {
    width: 32px; height: 32px;
    border: 3px solid rgba(82,121,111,0.18);
    border-top-color: #52796f;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 0.85rem;
  }
  .loading-text {
    font-size: 0.78rem; color: #7a8e84; font-weight: 400;
    margin: 0;
  }
  .error-banner {
    border-left: 3px solid #c0756a;
    background: linear-gradient(135deg, #fdf3f2, #fdecea);
    border-radius: 9px;
    padding: 0.85rem 1rem;
    font-size: 0.82rem;
    color: #7a3028;
    margin-bottom: 1rem;
  }

  /* ══════════════════════════════════════
     PAGINATION
  ══════════════════════════════════════ */
  .pagination-row {
    padding: 0.85rem 1rem;
    background: #fafbfa;
    border-top: 1px solid #eaefeb;
    display: flex; flex-direction: column;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
  }
  @media (min-width: 640px) {
    .pagination-row { flex-direction: row; }
  }
  .pagination-info {
    font-size: 0.72rem; color: #7a8e84; font-weight: 400;
    text-align: center;
  }
  .pagination-info .count {
    color: #2f3e46;
    font-weight: 600;
  }
  .pagination-controls {
    display: flex; align-items: center; gap: 0.4rem;
  }
  .page-btn {
    width: 32px; height: 32px;
    border-radius: 7px;
    background: #fff;
    color: #354f52;
    border: 1px solid #d4ddd6;
    cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .page-btn:hover:not(:disabled) {
    background: #f0f5f2; border-color: #84a98c;
  }
  .page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .page-counter {
    padding: 0 0.55rem;
    font-size: 0.72rem; color: #354f52;
    font-weight: 500;
  }

  /* ══════════════════════════════════════
     ADD EXPENSE MODAL
  ══════════════════════════════════════ */
  .add-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(47,62,70,0.65);
    backdrop-filter: blur(4px);
    display: flex; align-items: flex-start; justify-content: center;
    padding: 1.5rem;
    padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
    z-index: 50;
    overflow-y: auto;
    animation: fadeIn 0.2s ease;
  }
  .add-modal-box {
    background: #fff;
    border-radius: 14px;
    width: 100%;
    max-width: 760px;
    max-height: 90vh;
    overflow: auto;
    box-shadow: 0 32px 64px rgba(47,62,70,0.25);
    animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1);
    -webkit-overflow-scrolling: touch;
  }
  @media (max-width: 479px) {
    .add-modal-overlay {
      padding: 0;
      align-items: flex-end;
    }
    .add-modal-box {
      border-radius: 18px 18px 0 0;
      max-height: 94vh;
    }
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1023px) {
    .ex-root { padding: 1.25rem; }
    .header-title { font-size: 1.45rem; }
  }
  @media (max-width: 767px) {
    .ex-root { padding: 0.85rem; }
    .header-title { font-size: 1.3rem; }
    .header-icon-wrap { width: 34px; height: 34px; border-radius: 9px; }
    .filter-card { padding: 0.85rem; }
    .data-table th { padding: 0.55rem 0.5rem; font-size: 0.55rem; }
    .data-table td { padding: 0.55rem 0.5rem; font-size: 0.72rem; }
  }
  @media (max-width: 479px) {
    .ex-root { padding: 0.65rem; }
    .header-title { font-size: 1.2rem; }
    .text-input { font-size: 16px; }
  }
`;

const Expenses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // PATCH: Set default tab based on role
  const [activeTab, setActiveTab] = useState(() => {
    if (user?.role === 'manager') return 'team-approval';
    if (['admin', 'super-admin'].includes(user?.role)) return 'approval';
    return 'my-expenses';
  });
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('employee');

  const [filters, setFilters] = useState({
    status: '',
    category: '',
    tags: '',
    fromDate: '',
    toDate: '',
    page: 1,
    limit: 25
  });

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState('receipt');
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 25
  });

  useEffect(() => {
    if (user?.role) setUserRole(user.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters]);

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '/api/expenses';
      if (['admin', 'super-admin'].includes(user?.role)) {
        endpoint = '/api/expenses/approvals';
      } else if (user?.role === 'manager') {
        endpoint = '/api/expenses/team-approval';
      }
      const params = { ...filters };
      const response = await axios.get(endpoint, { params });
      setExpenses(response.data.expenses || []);
      setPagination(response.data.pagination || { total: 0, page: 1, pages: 1, limit: 25 });
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError(err.response?.data?.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleApprove = async (expenseId) => {
    if (!window.confirm('Are you sure you want to approve this expense claim?')) return;

    try {
      await axios.post(`/api/expenses/${expenseId}/approve`);
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve expense');
    }
  };

  const handleDecline = async (expenseId) => {
    const reason = window.prompt('Please provide a reason for declining this expense claim:');
    if (!reason || reason.trim().length === 0) {
      alert('Decline reason is required');
      return;
    }

    try {
      await axios.post(`/api/expenses/${expenseId}/decline`, { reason });
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to decline expense');
    }
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense claim?')) return;

    try {
      await axios.delete(`/api/expenses/${expenseId}`);
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  const handleEdit = (expense) => {
    if (!expense || expense.status !== 'pending') return;
    setEditingExpenseId(expense._id);
    setAddType(expense.claimType || 'receipt');
    setShowAddForm(true);
  };

  const handleExportCSV = async () => {
    try {
      if (!expenses || expenses.length === 0) return;
      const visible = expenses;
      const headers = ['Type', 'Status', 'Submitted On', 'Total'];
      const rows = visible.map((r) => [
        r.category || r.type || 'Expense',
        (r.status || '').toString(),
        r.date ? format(new Date(r.date), 'dd/MM/yyyy') : '',
        r.totalAmount != null ? `${r.currency || ''} ${Number(r.totalAmount).toFixed(2)}` : ''
      ]);

      let csv = headers.join(',') + '\n';
      rows.forEach((row) => {
        csv += row.map((cell) => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed', err);
      alert('Failed to export expenses');
    }
  };

  const getStatusPill = (status) => {
    const map = {
      pending: { cls: 'status-pill status-pending', label: 'Pending' },
      approved: { cls: 'status-pill status-approved', label: 'Approved' },
      declined: { cls: 'status-pill status-declined', label: 'Rejected' },
      paid: { cls: 'status-pill status-paid', label: 'Paid' }
    };
    const cfg = map[status] || map.pending;
    return (
      <span className={cfg.cls}>
        <span className="status-dot"></span>
        {cfg.label}
      </span>
    );
  };

  const formatSubmittedDate = (expense) => {
    const v = expense?.submittedOn || expense?.createdAt || expense?.date;
    if (!v) return '';
    try {
      return format(new Date(v), 'EEE dd LLL yyyy');
    } catch {
      return '';
    }
  };

  const formatClaimType = (expense) => {
    const v = (expense?.claimType || expense?.type || '').toString();
    if (!v) return '';
    const normalized = v.trim().toLowerCase();
    if (normalized === 'receipt') return 'Receipts';
    if (normalized === 'mileage') return 'Mileage';
    return v.charAt(0).toUpperCase() + v.slice(1);
  };

  const getApprovedByName = (expense) => {
    if (!expense) return '';

    const candidateByStatus =
      expense.status === 'paid'
        ? (expense.paidBy || expense.approvedBy || expense.declinedBy)
        : expense.status === 'declined'
        ? (expense.declinedBy || expense.approvedBy || expense.paidBy)
        : (expense.approvedBy || expense.declinedBy || expense.paidBy);

    const candidates = [
      candidateByStatus,
      expense.approvedBy,
      expense.declinedBy,
      expense.paidBy,
      expense.approvedByName,
      expense.declinedByName,
      expense.paidByName,
      expense.approverName,
      expense.actionedByName
    ].filter(Boolean);

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }

      if (value && typeof value === 'object') {
        const first = value.firstName || value.first_name || '';
        const last = value.lastName || value.last_name || '';
        const full = `${first} ${last}`.trim();
        if (full) return full;

        if (typeof value.name === 'string' && value.name.trim()) return value.name.trim();
        if (typeof value.fullName === 'string' && value.fullName.trim()) return value.fullName.trim();
      }
    }

    return '';
  };

  const isAdminLike = ['admin', 'super-admin'].includes(user?.role);
  const isManager = user?.role === 'manager';

  const headerSubtitle = isAdminLike
    ? 'Review and approve company expense claims.'
    : isManager
    ? 'Review and approve expense claims from your team.'
    : 'Submit and track your expense claims.';

  return (
    <>
      <style>{styles}</style>
      <div className="ex-root">
        <div className="ex-shell">

          {/* ── Page Header ── */}
          <div className="page-header anim-fade-up">
            <div className="header-block">
              <div className="header-icon-wrap">
                <svg style={{ width: 18, height: 18, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="header-eyebrow">Claims & Approvals</p>
                <h1 className="header-title">Expenses</h1>
                <p className="header-subtitle">
                  <span>{headerSubtitle}</span>
                  {isManager && <span className="role-badge">Team Approval</span>}
                  {isAdminLike && <span className="role-badge">Admin Review</span>}
                </p>
              </div>
            </div>

            {/* Add new claim button (hidden for admin/super-admin) */}
            {user?.role !== 'admin' && user?.role !== 'super-admin' && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="btn btn-primary" type="button">
                    <Plus size={14} />
                    <span>Add new claim</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-44" align="end" style={{ padding: 0 }}>
                  <button
                    onClick={() => { setEditingExpenseId(null); setAddType('receipt'); setShowAddForm(true); }}
                    className="pop-menu-item"
                    type="button"
                  >
                    <FileText size={14} style={{ color: '#84a98c' }} />
                    Receipts
                  </button>
                  <button
                    onClick={() => { setEditingExpenseId(null); setAddType('mileage'); setShowAddForm(true); }}
                    className="pop-menu-item"
                    type="button"
                  >
                    <svg style={{ width: 14, height: 14, color: '#84a98c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM5 17h-1a1 1 0 01-1-1V8a1 1 0 011-1h10l4 5h2a1 1 0 011 1v3a1 1 0 01-1 1h-1" />
                    </svg>
                    Mileage
                  </button>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* ── Filters ── */}
          <div className="filter-card anim-fade-up delay-100">
            <div className="filter-grid">
              <div>
                <ModernDatePicker
                  name="fromDate"
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={12} />
                      From
                    </span>
                  }
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                />
              </div>

              <div>
                <ModernDatePicker
                  name="toDate"
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={12} />
                      To
                    </span>
                  }
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                />
              </div>

              <div>
                <label className="field-label">
                  <Search size={11} />
                  Category / Tags
                </label>
                <input
                  type="text"
                  placeholder="Search…"
                  value={filters.tags}
                  onChange={(e) => handleFilterChange('tags', e.target.value)}
                  className="text-input"
                />
              </div>

              <div>
                <label className="field-label">
                  <Filter size={11} />
                  Status
                </label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(v) => handleFilterChange('status', v === 'all' ? '' : v)}
                >
                  <SelectTrigger style={{ width: '100%' }}>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="declined">Rejected</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="field-label">View</label>
                <Select
                  value={String(filters.limit)}
                  onValueChange={(v) => handleFilterChange('limit', parseInt(v))}
                >
                  <SelectTrigger style={{ width: '100%' }}>
                    <SelectValue placeholder="25" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Summary row ── */}
          <div className="summary-row">
            <div className="summary-text">
              Showing
              <span className="count">{expenses.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0}</span>
              –
              <span className="count">{Math.min(pagination.page * pagination.limit, pagination.total || expenses.length)}</span>
              of
              <span className="count">{pagination.total || expenses.length}</span>
              expenses.
              <button
                onClick={() => {
                  setFilters({ status: '', category: '', tags: '', fromDate: '', toDate: '', page: 1, limit: filters.limit });
                  fetchExpenses();
                }}
                className="reset-link"
                type="button"
              >
                Reset filters
              </button>
            </div>

            <div className="summary-actions">
              <div className="view-inline">
                <span className="view-inline-label">View</span>
                <div style={{ width: 95 }}>
                  <Select
                    value={String(filters.limit)}
                    onValueChange={(v) => handleFilterChange('limit', parseInt(v))}
                  >
                    <SelectTrigger style={{ width: '100%', height: 32, padding: '0 0.55rem', fontSize: '0.74rem' }}>
                      <SelectValue placeholder="25" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <span className="view-inline-label">per page</span>
              </div>

              <button
                onClick={handleExportCSV}
                className="btn btn-secondary btn-xs"
                disabled={expenses.length === 0}
                type="button"
              >
                <Download size={11} />
                Export to CSV
              </button>
            </div>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="error-banner">{error}</div>
          )}

          {/* ── Loading / Empty / Data ── */}
          {loading ? (
            <div className="loading-card">
              <div className="spinner"></div>
              <p className="loading-text">Loading expenses…</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <FileText style={{ width: 28, height: 28 }} />
              </div>
              <h3 className="empty-title">Nothing to see here</h3>
              <p className="empty-text">There are no expenses to review.</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="mobile-cards anim-fade-up delay-200">
                {expenses.map((expense, idx) => (
                  <motion.div
                    key={expense._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx, 8) * 0.04 }}
                    className="mob-card"
                  >
                    <div className="mob-card-head">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="mob-card-title">
                          {expense.category || 'Expense'}
                        </p>
                        <p className="mob-card-meta">
                          #{idx + 1} · {formatSubmittedDate(expense)}
                        </p>
                      </div>
                      {getStatusPill(expense.status)}
                    </div>

                    <div className="mob-card-grid">
                      <div>
                        <p className="mob-key">Type</p>
                        <p className="mob-val">{formatClaimType(expense)}</p>
                      </div>
                      <div>
                        <p className="mob-key">Total</p>
                        <p className="mob-val is-amount">
                          {expense.currency && (
                            <span className="td-currency" style={{ fontSize: '0.6rem' }}>
                              {expense.currency}
                            </span>
                          )}
                          {expense.totalAmount != null ? Number(expense.totalAmount).toFixed(2) : ''}
                        </p>
                      </div>
                    </div>

                    {getApprovedByName(expense) && (
                      <p className="mob-approver">
                        <strong>Approved by:</strong> {getApprovedByName(expense)}
                      </p>
                    )}

                    <div className="mob-actions">
                      <button
                        type="button"
                        onClick={() => setViewingId(expense._id)}
                        className="btn btn-primary"
                      >
                        <Eye size={13} />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(expense)}
                        className="btn btn-secondary"
                        disabled={expense.status !== 'pending'}
                      >
                        <Edit size={13} />
                        Edit
                      </button>
                      {expense.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(expense._id)}
                          className="btn btn-soft-danger btn-icon-only"
                          aria-label="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="table-card desktop-table anim-fade-up delay-200">
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>SI No</th>
                        <th className="col-submitted">Submitted</th>
                        <th>Category</th>
                        <th className="col-type">Type</th>
                        <th>Total</th>
                        <th className="is-center">Status</th>
                        <th className="col-approver">Approved by</th>
                        <th className="is-center">Options</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense, idx) => (
                        <motion.tr
                          key={expense._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(idx, 8) * 0.03 }}
                        >
                          <td className="td-index">{idx + 1}</td>
                          <td className="td-muted col-submitted">
                            {formatSubmittedDate(expense)}
                          </td>
                          <td>
                            <button
                              onClick={() => setViewingId(expense._id)}
                              className="td-category-link"
                              type="button"
                            >
                              {expense.category || ''}
                            </button>
                          </td>
                          <td className="td-muted col-type">
                            {formatClaimType(expense)}
                          </td>
                          <td className="td-amount">
                            {expense.currency && (
                              <span className="td-currency">{expense.currency}</span>
                            )}
                            {expense.totalAmount != null ? Number(expense.totalAmount).toFixed(2) : ''}
                          </td>
                          <td className="is-center">
                            {getStatusPill(expense.status)}
                          </td>
                          <td className="td-muted col-approver">
                            {getApprovedByName(expense) || '—'}
                          </td>
                          <td>
                            <div className="td-actions" style={{ justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={() => setViewingId(expense._id)}
                                className="icon-btn is-view"
                                title="View"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEdit(expense)}
                                className="icon-btn is-edit"
                                disabled={expense.status !== 'pending'}
                                title={expense.status === 'pending' ? 'Edit' : 'Only pending expenses can be edited'}
                              >
                                <Edit size={14} />
                              </button>
                              {expense.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(expense._id)}
                                  className="icon-btn is-delete"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="pagination-row">
                    <div className="pagination-info">
                      Showing
                      <span className="count" style={{ margin: '0 0.2rem' }}>
                        {((pagination.page - 1) * pagination.limit) + 1}
                      </span>
                      to
                      <span className="count" style={{ margin: '0 0.2rem' }}>
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>
                      of
                      <span className="count" style={{ margin: '0 0.2rem' }}>
                        {pagination.total}
                      </span>
                      results
                    </div>
                    <div className="pagination-controls">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="page-btn"
                        aria-label="Previous page"
                        type="button"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="page-counter">
                        Page {pagination.page} of {pagination.pages}
                      </span>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                        className="page-btn"
                        aria-label="Next page"
                        type="button"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expense details modal (passthrough) */}
      {viewingId && (
        <ExpenseDetailsModal
          id={viewingId}
          onClose={() => setViewingId(null)}
          onUpdated={() => { setViewingId(null); fetchExpenses(); }}
        />
      )}

      {/* Embedded Add Expense modal */}
      {showAddForm && (
        <div
          className="add-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddForm(false);
              setEditingExpenseId(null);
            }
          }}
        >
          <div className="add-modal-box">
            <div style={{ padding: '1rem' }}>
              <AddExpense
                embed
                initialType={addType}
                expenseId={editingExpenseId}
                onClose={(opts) => {
                  setShowAddForm(false);
                  setEditingExpenseId(null);
                  if (opts && opts.saved) {
                    fetchExpenses();
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Expenses;