import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .ar-root {
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
  .ar-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
    height: 600px;
  }
  .ar-shell {
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
    display: flex; align-items: center; gap: 0.5rem;
    flex-wrap: wrap;
  }
  .read-only-badge {
    display: inline-flex; align-items: center;
    padding: 0.18rem 0.55rem;
    background: rgba(111,140,152,0.12);
    color: #4d6975;
    border: 1px solid rgba(111,140,152,0.22);
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
  .btn-secondary {
    background: #fff; color: #354f52;
    border: 1px solid #d4ddd6;
  }
  .btn-secondary:hover:not(:disabled) {
    background: #f0f5f2; border-color: #84a98c; color: #2f3e46;
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
  .btn-dark {
    background: #2f3e46;
    color: #cad2c5;
  }
  .btn-dark:hover:not(:disabled) {
    background: #354f52;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(47,62,70,0.24);
  }

  .upload-spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* ══════════════════════════════════════
     STATS GRID
  ══════════════════════════════════════ */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.7rem;
    margin-bottom: 1.1rem;
  }
  @media (min-width: 1024px) {
    .stats-grid { grid-template-columns: repeat(3, 1fr); gap: 0.85rem; }
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
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .stat-label {
    font-size: 0.58rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #84a98c;
    margin: 0;
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

  .stat-card.is-archived {
    --accent: #7a668c;
    --accent-bg: rgba(122,102,140,0.12);
    --accent-border: rgba(122,102,140,0.22);
    --accent-text: #4a3d5a;
  }
  .stat-card.is-month {
    --accent: #6f8c98;
    --accent-bg: rgba(111,140,152,0.14);
    --accent-border: rgba(111,140,152,0.24);
    --accent-text: #4d6975;
  }

  /* ══════════════════════════════════════
     TABLE CARD HEADER
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
  .data-card-header {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid #eaefeb;
    display: flex; flex-direction: column;
    gap: 0.6rem;
    background: linear-gradient(135deg, #fafbfa, #f0f5f2);
  }
  @media (min-width: 640px) {
    .data-card-header {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }
  .data-card-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.12rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    line-height: 1.2;
    margin: 0;
    display: flex; align-items: center; gap: 0.5rem;
  }
  .data-card-title::before {
    content: '';
    width: 4px; height: 18px;
    border-radius: 2px;
    background: linear-gradient(180deg, #52796f 0%, #84a98c 100%);
  }
  .data-card-actions {
    display: flex; align-items: center;
    gap: 0.5rem;
  }

  /* ══════════════════════════════════════
     TABLE
  ══════════════════════════════════════ */
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
  .data-table th.is-checkbox { width: 38px; }
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
  .data-table tbody tr.is-selected:hover {
    background: rgba(132,169,140,0.12);
  }
  .data-table td {
    padding: 0.7rem 0.7rem;
    font-size: 0.78rem;
    color: #2f3e46;
    vertical-align: middle;
  }
  .td-strong { font-weight: 500; color: #2f3e46; }
  .td-muted { color: #7a8e84; }
  .td-index {
    color: #8fa99a; font-weight: 500;
    width: 50px;
  }

  /* Custom checkbox */
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

  .name-cell-stack {
    min-width: 0;
  }
  .name-primary {
    font-size: 0.8rem; font-weight: 500; color: #2f3e46;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin: 0;
  }
  .name-secondary {
    font-size: 0.66rem; color: #7a8e84;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin: 0.1rem 0 0;
  }
  .reason-cell {
    color: #354f52;
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Hide low-priority columns at narrower widths */
  @media (max-width: 1199px) {
    .col-reason { display: none; }
  }
  @media (max-width: 879px) {
    .col-start { display: none; }
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
    display: flex; flex-direction: column;
  }
  .mob-card {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid #eaefeb;
    display: flex; align-items: flex-start; gap: 0.7rem;
    cursor: pointer;
    transition: background 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .mob-card:last-child { border-bottom: none; }
  .mob-card:hover { background: #fafbfa; }
  .mob-card.is-selected { background: rgba(132,169,140,0.08); }
  .mob-card-body { flex: 1; min-width: 0; }
  .mob-card-head {
    margin-bottom: 0.55rem;
  }
  .mob-name {
    font-size: 0.85rem; font-weight: 600;
    color: #2f3e46;
    line-height: 1.3;
    margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .mob-name-index {
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.95rem; font-weight: 500;
    color: #84a98c;
    margin-right: 0.35rem;
    letter-spacing: -0.01em;
  }
  .mob-email {
    font-size: 0.7rem; color: #7a8e84; font-weight: 400;
    margin: 0.15rem 0 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .mob-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem 0.85rem;
    margin-bottom: 0.55rem;
  }
  .mob-cell-key {
    font-size: 0.55rem; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #84a98c;
    margin: 0 0 0.15rem;
  }
  .mob-cell-val {
    font-size: 0.74rem; color: #354f52; font-weight: 500;
    line-height: 1.3;
  }
  .mob-reason-key {
    font-size: 0.55rem; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #84a98c;
    margin: 0 0 0.15rem;
  }
  .mob-reason-val {
    font-size: 0.72rem; color: #354f52; font-weight: 400;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* ══════════════════════════════════════
     LOADING / EMPTY (inside table card)
  ══════════════════════════════════════ */
  .state-pad {
    padding: 3rem 1.25rem;
    text-align: center;
  }
  .empty-icon-wrap {
    width: 60px; height: 60px;
    border-radius: 50%;
    background: rgba(132,169,140,0.12);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 0.95rem;
    color: #84a98c;
  }
  .empty-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.25rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0 0 0.4rem;
  }
  .empty-text {
    font-size: 0.82rem; color: #7a8e84; font-weight: 300;
    margin: 0;
  }
  .spinner {
    width: 32px; height: 32px;
    border: 3px solid rgba(82,121,111,0.18);
    border-top-color: #52796f;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 0.75rem;
  }
  .spinner-text {
    font-size: 0.78rem; color: #7a8e84; font-weight: 400;
    margin: 0;
  }

  /* ══════════════════════════════════════
     EMPLOYEE DETAILS MODAL
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
    max-width: 580px;
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
    position: relative;
  }
  .details-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.95rem 1.1rem;
  }
  @media (min-width: 540px) {
    .details-grid { grid-template-columns: 1fr 1fr; }
    .details-cell.span-2 { grid-column: 1 / -1; }
  }
  .details-cell { min-width: 0; }
  .details-key {
    font-size: 0.6rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #84a98c;
    margin: 0 0 0.3rem;
  }
  .details-val {
    font-size: 0.85rem; font-weight: 500;
    color: #2f3e46;
    line-height: 1.5;
    word-break: break-word;
    margin: 0;
  }
  .details-val.is-empty {
    color: #b6c0b9; font-style: italic; font-weight: 400;
  }
  .details-divider {
    grid-column: 1 / -1;
    height: 1px;
    background: #eaefeb;
    margin: 0.25rem 0;
    border: none;
  }

  /* Export popover */
  .export-wrap { position: relative; }
  .export-menu {
    position: absolute;
    right: 0;
    bottom: 100%;
    margin-bottom: 0.5rem;
    width: 150px;
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 10px;
    box-shadow: 0 12px 28px rgba(47,62,70,0.18);
    overflow: hidden;
    z-index: 60;
    animation: scaleIn 0.18s cubic-bezier(0.22,1,0.36,1);
    transform-origin: bottom right;
  }
  .export-menu-item {
    width: 100%;
    background: none;
    border: none;
    padding: 0.6rem 0.85rem;
    display: flex; align-items: center; gap: 0.55rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem; font-weight: 500;
    color: #354f52;
    cursor: pointer;
    transition: background 0.15s;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
  }
  .export-menu-item:hover { background: #f0f5f2; }
  .export-menu-item + .export-menu-item { border-top: 1px solid #f0f0ec; }
  .export-menu-item-icon {
    width: 22px; height: 22px;
    border-radius: 5px;
    background: rgba(82,121,111,0.12);
    color: #354f52;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.55rem; font-weight: 700;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1023px) {
    .ar-root { padding: 1.25rem; }
    .header-title { font-size: 1.45rem; }
    .stat-value { font-size: 1.65rem; }
  }
  @media (max-width: 767px) {
    .ar-root { padding: 0.85rem; }
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
    .ar-root { padding: 0.65rem; }
    .header-title { font-size: 1.2rem; }
    .stats-grid { gap: 0.55rem; }
    .modal-overlay { padding: 0; align-items: flex-end; }
    .modal-box { border-radius: 18px 18px 0 0; max-height: 92vh; }
  }
`;

export default function ArchiveEmployees() {
  const [archivedEmployees, setArchivedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const fetchArchivedEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/employees/archived');
      if (response.data.success) {
        setArchivedEmployees(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching archived employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedEmployees();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return '-';
    }
  };

  const closeEmployeeModal = () => {
    setSelectedEmployee(null);
    setIsExportMenuOpen(false);
  };

  const getOrganisationName = (employee) => {
    if (!employee) return '-';
    return employee.organisationName || employee.OrganisationName || employee.office || '-';
  };

  const getArchivedDate = (employee) => {
    if (!employee) return null;
    return employee.deletedDate || employee.deletedAt || employee.exitDate || employee.terminatedDate || employee.updatedAt || employee.createdAt || null;
  };

  const getArchivedDateValue = (employee) => {
    const value = getArchivedDate(employee);
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const csvEscape = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const downloadBlob = (content, mimeType, filename) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportEmployeeCsv = (employee) => {
    if (!employee) return;

    const headers = [
      'Name', 'Date of Birth', 'Gender', 'Email', 'Mobile Number',
      'Team', 'Organisation Name', 'Job Title', 'Department',
      'Start Date', 'End Date', 'Termination Reason', 'Status'
    ];

    const values = [
      `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
      formatDate(employee.dateOfBirth),
      employee.gender || '-',
      employee.email || '-',
      employee.phone || '-',
      employee.team || '-',
      getOrganisationName(employee),
      employee.jobTitle || '-',
      employee.department || '-',
      formatDate(employee.startDate),
      formatDate(employee.exitDate || employee.terminatedDate),
      employee.terminationReason || employee.terminationNote || '-',
      employee.status || '-'
    ];

    const csv = [headers, values]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');

    const safeName = (`${employee.firstName || 'employee'}_${employee.lastName || ''}`)
      .trim()
      .replace(/\s+/g, '_');
    downloadBlob(csv, 'text/csv;charset=utf-8;', `archived_employee_${safeName}.csv`);
  };

  const exportEmployeePdf = (employee) => {
    if (!employee) return;

    const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee';
    const rows = [
      ['Name', name],
      ['Date of Birth', formatDate(employee.dateOfBirth)],
      ['Gender', employee.gender || '-'],
      ['Email', employee.email || '-'],
      ['Mobile Number', employee.phone || '-'],
      ['Team', employee.team || '-'],
      ['Organisation Name', getOrganisationName(employee)],
      ['Job Title', employee.jobTitle || '-'],
      ['Department', employee.department || '-'],
      ['Start Date', formatDate(employee.startDate)],
      ['End Date', formatDate(employee.exitDate || employee.terminatedDate)],
      ['Termination Reason', employee.terminationReason || employee.terminationNote || '-'],
      ['Status', employee.status || '-']
    ];

    const tableRowsHtml = rows
      .map(
        ([label, value]) => `
          <tr>
            <td class="label">${String(label)}</td>
            <td class="value">${String(value ?? '-')}</td>
          </tr>
        `
      )
      .join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${name} - Archived Employee</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #2f3e46; }
            h1 { font-size: 18px; margin: 0 0 16px 0; color: #2f3e46; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 10px 12px; border: 1px solid #eaefeb; font-size: 12px; vertical-align: top; }
            td.label { width: 240px; background: #fafbfa; color: #52796f; font-weight: 600; }
            td.value { color: #2f3e46; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Archived Employee Details</h1>
          <table>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      iframe.remove();
      toast.error('Unable to export PDF. Please try again.');
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        setTimeout(() => iframe.remove(), 1000);
      }
    }, 250);
  };

  const handleBulkDelete = async () => {
    if (selectedEmployees.length === 0) {
      toast.warning('Please select at least one employee to delete.');
      return;
    }

    const confirmMessage = `Are you sure you want to permanently delete ${selectedEmployees.length} archived employee record(s)?\n\nThis action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    try {
      const selectedRows = archivedEmployees.filter(emp => selectedEmployees.includes(emp._id));
      const archivedIds = selectedRows.filter(emp => emp.isDeleted).map(emp => emp._id);
      const activeEmployeeIds = selectedRows.filter(emp => !emp.isDeleted).map(emp => emp._id);

      let totalDeleted = 0;

      if (activeEmployeeIds.length > 0) {
        const employeeDeleteRes = await axios.delete('/api/employees/bulk', {
          data: { employeeIds: activeEmployeeIds, permanentDelete: true }
        });
        totalDeleted += Number(employeeDeleteRes?.data?.deletedCount || 0);
      }

      if (archivedIds.length > 0) {
        const archivedDeleteRes = await axios.delete('/api/employees/archived/bulk', {
          data: { ids: archivedIds }
        });
        totalDeleted += Number(archivedDeleteRes?.data?.deletedCount || 0);
      }

      toast.success(`Successfully deleted ${totalDeleted} archived employee record(s)`);

      await fetchArchivedEmployees();
      setSelectedEmployees([]);
    } catch (error) {
      console.error('Error deleting archived employees:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete archived employees';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleEmployeeId = (id, checked) => {
    if (checked) {
      setSelectedEmployees([...selectedEmployees, id]);
    } else {
      setSelectedEmployees(selectedEmployees.filter(x => x !== id));
    }
  };

  const totalArchived = archivedEmployees.length;
  const thisMonthCount = archivedEmployees.filter(emp => {
    const deletedDate = getArchivedDateValue(emp);
    if (!deletedDate) return false;
    const thisMonth = new Date();
    thisMonth.setDate(1);
    return deletedDate >= thisMonth;
  }).length;

  return (
    <>
      <style>{styles}</style>
      <div className="ar-root">
        <div className="ar-shell">

          {/* ── Page Header ── */}
          <div className="page-header anim-fade-up">
            <div className="header-icon-wrap">
              <svg style={{ width: 18, height: 18, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="header-eyebrow">Records · Archive</p>
              <h1 className="header-title">Archived Employees</h1>
              <p className="header-subtitle">
                <span>Permanently deleted employee records.</span>
                <span className="read-only-badge">Read Only</span>
              </p>
            </div>
          </div>

          {/* ── Stats grid ── */}
          <div className="stats-grid anim-fade-up delay-100">
            <div className="stat-card is-archived">
              <div className="stat-card-row">
                <p className="stat-label">Total Archived</p>
                <span className="stat-icon-tile">
                  <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </span>
              </div>
              <p className="stat-value">{totalArchived}</p>
              <p className="stat-sub">all-time records</p>
            </div>

            <div className="stat-card is-month">
              <div className="stat-card-row">
                <p className="stat-label">This Month</p>
                <span className="stat-icon-tile">
                  <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
              </div>
              <p className="stat-value">{thisMonthCount}</p>
              <p className="stat-sub">archived this month</p>
            </div>
          </div>

          {/* ── Table card ── */}
          <div className="data-card anim-fade-up delay-200">
            <div className="data-card-header">
              <h2 className="data-card-title">Archived Employees List</h2>

              <div className="data-card-actions">
                {selectedEmployees.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="btn btn-danger"
                    type="button"
                  >
                    {isDeleting ? (
                      <>
                        <div className="upload-spinner"></div>
                        <span>Deleting…</span>
                      </>
                    ) : (
                      <>
                        <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Selected ({selectedEmployees.length})
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="state-pad">
                <div className="spinner"></div>
                <p className="spinner-text">Loading archived employees…</p>
              </div>
            ) : archivedEmployees.length === 0 ? (
              <div className="state-pad">
                <div className="empty-icon-wrap">
                  <svg style={{ width: 28, height: 28 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="empty-title">No archived employees</h3>
                <p className="empty-text">No permanently deleted employees found.</p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="mobile-cards">
                  {archivedEmployees.map((employee, index) => {
                    const isSelected = selectedEmployees.includes(employee._id);
                    return (
                      <div
                        key={employee._id}
                        className={`mob-card ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setSelectedEmployee(employee)}
                      >
                        <input
                          type="checkbox"
                          className="checkbox"
                          style={{ marginTop: 3 }}
                          checked={isSelected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleEmployeeId(employee._id, e.target.checked);
                          }}
                        />
                        <div className="mob-card-body">
                          <div className="mob-card-head">
                            <p className="mob-name">
                              <span className="mob-name-index">{index + 1}.</span>
                              {employee.firstName} {employee.lastName}
                            </p>
                            <p className="mob-email">{employee.email || '—'}</p>
                          </div>

                          <div className="mob-grid">
                            <div>
                              <p className="mob-cell-key">Start</p>
                              <p className="mob-cell-val">{formatDate(employee.startDate)}</p>
                            </div>
                            <div>
                              <p className="mob-cell-key">End</p>
                              <p className="mob-cell-val">{formatDate(employee.exitDate || employee.terminatedDate)}</p>
                            </div>
                          </div>

                          <div>
                            <p className="mob-reason-key">Reason</p>
                            <p className="mob-reason-val">
                              {employee.terminationReason || employee.terminationNote || '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="desktop-table">
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="is-checkbox">
                            <input
                              type="checkbox"
                              className="checkbox"
                              checked={selectedEmployees.length === archivedEmployees.length && archivedEmployees.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEmployees(archivedEmployees.map(emp => emp._id));
                                } else {
                                  setSelectedEmployees([]);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </th>
                          <th>SI No.</th>
                          <th>Employee Name</th>
                          <th className="col-reason">Reason of Termination</th>
                          <th className="col-start">Start Date</th>
                          <th>End Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivedEmployees.map((employee, index) => {
                          const isSelected = selectedEmployees.includes(employee._id);
                          return (
                            <tr
                              key={employee._id}
                              className={isSelected ? 'is-selected' : ''}
                              onClick={() => setSelectedEmployee(employee)}
                            >
                              <td onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  className="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleEmployeeId(employee._id, e.target.checked);
                                  }}
                                />
                              </td>
                              <td className="td-index">{index + 1}</td>
                              <td>
                                <div className="name-cell-stack">
                                  <p className="name-primary">{employee.firstName} {employee.lastName}</p>
                                  <p className="name-secondary">{employee.email || '—'}</p>
                                </div>
                              </td>
                              <td className="reason-cell col-reason">
                                {employee.terminationReason || employee.terminationNote || '—'}
                              </td>
                              <td className="td-muted col-start">
                                {formatDate(employee.startDate)}
                              </td>
                              <td className="td-strong">
                                {formatDate(employee.exitDate || employee.terminatedDate)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Employee Details Modal ── */}
      {selectedEmployee && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closeEmployeeModal(); }}
        >
          <div className="modal-box">
            <div className="modal-header">
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="modal-eyebrow">Archive Record</p>
                <h2 className="modal-title">Employee Details</h2>
                <p className="modal-subtitle">
                  {`${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim() || 'Employee'}
                </p>
              </div>
              <button
                onClick={closeEmployeeModal}
                className="modal-close"
                aria-label="Close"
                type="button"
              >
                <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="details-grid">
                <div className="details-cell">
                  <p className="details-key">Name</p>
                  <p className="details-val">
                    {`${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim() || <span className="is-empty">—</span>}
                  </p>
                </div>

                <div className="details-cell">
                  <p className="details-key">Date of Birth</p>
                  <p className="details-val">{formatDate(selectedEmployee.dateOfBirth)}</p>
                </div>

                <div className="details-cell">
                  <p className="details-key">Gender</p>
                  <p className="details-val">
                    {selectedEmployee.gender || <span className="is-empty">—</span>}
                  </p>
                </div>

                <div className="details-cell">
                  <p className="details-key">Email</p>
                  <p className="details-val" style={{ wordBreak: 'break-all' }}>
                    {selectedEmployee.email || <span className="is-empty">—</span>}
                  </p>
                </div>

                <div className="details-cell">
                  <p className="details-key">Mobile Number</p>
                  <p className="details-val">
                    {selectedEmployee.phone || <span className="is-empty">—</span>}
                  </p>
                </div>

                <div className="details-cell">
                  <p className="details-key">Team</p>
                  <p className="details-val">
                    {selectedEmployee.team || <span className="is-empty">—</span>}
                  </p>
                </div>

                <div className="details-cell span-2">
                  <p className="details-key">Organisation Name</p>
                  <p className="details-val">{getOrganisationName(selectedEmployee)}</p>
                </div>

                <div className="details-cell">
                  <p className="details-key">Job Title</p>
                  <p className="details-val">
                    {selectedEmployee.jobTitle || <span className="is-empty">—</span>}
                  </p>
                </div>

                <div className="details-cell">
                  <p className="details-key">Department</p>
                  <p className="details-val">
                    {selectedEmployee.department || <span className="is-empty">—</span>}
                  </p>
                </div>

                <div className="details-divider"></div>

                <div className="details-cell">
                  <p className="details-key">Start Date</p>
                  <p className="details-val">{formatDate(selectedEmployee.startDate)}</p>
                </div>

                <div className="details-cell">
                  <p className="details-key">End Date</p>
                  <p className="details-val">
                    {formatDate(selectedEmployee.exitDate || selectedEmployee.terminatedDate)}
                  </p>
                </div>

                <div className="details-cell span-2">
                  <p className="details-key">Termination Reason</p>
                  <p className="details-val">
                    {selectedEmployee.terminationReason || selectedEmployee.terminationNote || <span className="is-empty">No reason provided</span>}
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <div className="export-wrap">
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen((prev) => !prev)}
                  className="btn btn-secondary"
                >
                  <svg style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                  <svg style={{ width: 11, height: 11, marginLeft: 2 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExportMenuOpen && (
                  <div className="export-menu">
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        exportEmployeePdf(selectedEmployee);
                      }}
                      className="export-menu-item"
                    >
                      <span className="export-menu-item-icon">PDF</span>
                      Export as PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        exportEmployeeCsv(selectedEmployee);
                      }}
                      className="export-menu-item"
                    >
                      <span className="export-menu-item-icon">CSV</span>
                      Export as CSV
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={closeEmployeeModal}
                className="btn btn-dark"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}