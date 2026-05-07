import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  MagnifyingGlassIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { formatDateDDMMYY } from "../utils/dateFormatter";
import { useAlert } from "../components/AlertNotification";
import { buildApiUrl } from '../utils/apiConfig';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .eh-root {
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
  .eh-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
    height: 600px;
  }
  .eh-shell {
    position: relative; z-index: 1;
    max-width: 100%;
    margin: 0 auto;
    min-width: 0;
  }

  /* ── Keyframes ── */
  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
  @keyframes pulse-ring {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50%      { opacity: 1; transform: scale(1.25); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-skeleton {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.85; }
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
    gap: 1rem;
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
    font-size: 1.65rem; color: #2f3e46; line-height: 1.15; letter-spacing: -0.02em;
    margin: 0;
  }
  .header-subtitle {
    font-size: 0.78rem; color: #7a8e84; font-weight: 300;
    margin: 0.2rem 0 0;
  }

  .header-actions {
    display: flex; flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }
  @media (min-width: 640px) {
    .header-actions { flex-direction: row; align-items: center; width: auto; }
  }

  /* Section heading */
  .section-heading {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.3rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 1.25rem 0 0.85rem;
    display: flex; align-items: center; gap: 0.55rem;
  }
  .section-heading::before {
    content: '';
    width: 4px; height: 18px;
    border-radius: 2px;
    background: linear-gradient(180deg, #52796f 0%, #84a98c 100%);
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
  .btn-danger {
    background: linear-gradient(135deg, #a35446 0%, #b85c50 100%);
    color: #fff;
    box-shadow: 0 3px 12px rgba(163,84,70,0.22);
  }
  .btn-danger:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 6px 18px rgba(163,84,70,0.3);
  }
  .btn-soft-danger {
    background: rgba(192,117,106,0.10);
    color: #b85c50;
    border: 1px solid rgba(192,117,106,0.22);
  }
  .btn-soft-danger:hover:not(:disabled) {
    background: rgba(192,117,106,0.18);
    color: #7a3028;
  }
  .btn-xs {
    font-size: 0.66rem; padding: 0.32rem 0.6rem; min-height: 28px;
    border-radius: 6px;
  }
  .btn-block { width: 100%; }

  /* ══════════════════════════════════════
     FILTER CARD
  ══════════════════════════════════════ */
  .filter-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 1rem 1.1rem;
    margin-bottom: 1.25rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
  }
  .filter-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.85rem;
  }
  @media (min-width: 640px) { .filter-grid { grid-template-columns: 1fr 1fr; } }
  @media (min-width: 1024px) { .filter-grid { grid-template-columns: 2fr 1fr 1fr 1fr; } }

  .field-label {
    display: block;
    font-size: 0.62rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #52796f;
    margin-bottom: 0.4rem;
  }
  .search-wrap { position: relative; }
  .search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%);
    color: #84a98c;
    pointer-events: none;
    display: flex; align-items: center;
  }
  .search-input {
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
  .search-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .search-input::placeholder { color: #b6c0b9; }

  /* ══════════════════════════════════════
     SEARCH DROPDOWN
  ══════════════════════════════════════ */
  .search-dropdown {
    position: absolute;
    z-index: 50;
    width: 100%;
    margin-top: 0.45rem;
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 10px;
    box-shadow: 0 12px 28px rgba(47,62,70,0.14);
    max-height: 300px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .search-dropdown-empty {
    padding: 0.85rem;
    text-align: center;
    font-size: 0.78rem;
    color: #7a8e84;
  }
  .search-dropdown-item {
    padding: 0.6rem 0.85rem;
    cursor: pointer;
    border-bottom: 1px solid #f0f0ec;
    transition: background 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .search-dropdown-item:last-child { border-bottom: none; }
  .search-dropdown-item:hover { background: #fafbfa; }
  .search-dropdown-row {
    display: flex; align-items: center; gap: 0.7rem;
  }
  .dropdown-avatar {
    height: 30px; width: 30px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    color: #fff;
    font-size: 0.72rem; font-weight: 600;
    background: linear-gradient(135deg, #354f52 0%, #52796f 60%, #84a98c 100%);
    border: 1.5px solid #fff;
    box-shadow: 0 1px 3px rgba(53,79,82,0.18);
  }
  .dropdown-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .dropdown-name {
    font-size: 0.8rem; font-weight: 500; color: #2f3e46;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .dropdown-meta {
    font-size: 0.68rem; color: #7a8e84;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .dropdown-tag {
    display: inline-flex; align-items: center;
    padding: 0.15rem 0.5rem;
    font-size: 0.58rem; font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border-radius: 999px;
    flex-shrink: 0;
  }
  .dropdown-tag.is-employee {
    background: rgba(82,121,111,0.12);
    color: #354f52;
    border: 1px solid rgba(82,121,111,0.22);
  }
  .dropdown-tag.is-team {
    background: rgba(132,169,140,0.16);
    color: #2f4a32;
    border: 1px solid rgba(132,169,140,0.28);
  }

  /* ══════════════════════════════════════
     COLLAPSIBLE LIST HEADER
  ══════════════════════════════════════ */
  .list-header-btn {
    width: 100%;
    text-align: left;
    background: linear-gradient(135deg, #f0f5f2 0%, #fafbfa 100%);
    border: 1px solid #eaefeb;
    border-left: 3px solid #52796f;
    border-radius: 12px;
    padding: 0.85rem 1rem;
    cursor: pointer;
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.7rem;
    transition: all 0.2s;
    -webkit-tap-highlight-color: transparent;
    margin-bottom: 0.85rem;
  }
  .list-header-btn:hover {
    border-color: rgba(82,121,111,0.4);
    border-left-color: #354f52;
    box-shadow: 0 4px 14px rgba(53,79,82,0.06);
  }
  .list-header-left {
    display: flex; align-items: center; gap: 0.7rem;
    min-width: 0; flex: 1;
  }
  .list-header-icon {
    width: 36px; height: 36px;
    border-radius: 9px;
    background: rgba(82,121,111,0.14);
    border: 1px solid rgba(82,121,111,0.2);
    display: flex; align-items: center; justify-content: center;
    color: #354f52;
    flex-shrink: 0;
  }
  .list-header-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.18rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    line-height: 1.2;
    margin: 0;
  }
  .list-header-hint {
    font-size: 0.62rem; color: #84a98c; font-weight: 500;
    letter-spacing: 0.08em; text-transform: uppercase;
    margin: 0.1rem 0 0;
  }

  /* View toggle */
  .view-toggle-row {
    display: flex; justify-content: flex-end;
    margin-bottom: 0.85rem;
  }
  .view-toggle {
    display: inline-flex;
    background: #fff;
    border: 1px solid #d4ddd6;
    border-radius: 9px;
    padding: 3px;
    gap: 2px;
  }
  .view-toggle-btn {
    background: none;
    border: none;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem; font-weight: 500;
    color: #7a8e84;
    cursor: pointer;
    display: inline-flex; align-items: center; gap: 0.35rem;
    transition: all 0.2s;
    -webkit-tap-highlight-color: transparent;
  }
  .view-toggle-btn:hover { color: #354f52; }
  .view-toggle-btn.is-active {
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    color: #cad2c5;
    box-shadow: 0 2px 6px rgba(53,79,82,0.18);
  }

  /* ══════════════════════════════════════
     TABLE / DATA SURFACE
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
  .data-table tbody tr.is-terminated {
    background: rgba(192,117,106,0.04);
  }
  .data-table tbody tr.is-terminated:hover {
    background: rgba(192,117,106,0.08);
  }
  .data-table td {
    padding: 0.65rem 0.7rem;
    font-size: 0.76rem;
    color: #2f3e46;
    vertical-align: middle;
  }
  .td-index {
    color: #8fa99a; font-weight: 500;
    width: 44px;
  }
  .td-muted { color: #7a8e84; }
  .td-strong { font-weight: 500; color: #2f3e46; }

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

  /* Avatar (table) */
  .row-avatar {
    height: 30px; width: 30px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    color: #fff;
    font-size: 0.72rem; font-weight: 600;
    background: linear-gradient(135deg, #354f52 0%, #52796f 60%, #84a98c 100%);
    border: 1.5px solid #fff;
    box-shadow: 0 1px 3px rgba(53,79,82,0.18);
  }
  .row-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .row-avatar.is-terminated {
    background: linear-gradient(135deg, #a35446 0%, #b85c50 100%);
  }

  .name-cell {
    display: flex; align-items: center; gap: 0.65rem;
    min-width: 0;
  }
  .name-stack {
    min-width: 0; flex: 1;
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
  .name-cell.is-terminated .name-primary { color: #7a3028; }
  .name-cell.is-terminated .name-secondary { color: #a35446; }

  /* Terminated tag */
  .terminated-tag {
    display: inline-flex; align-items: center;
    padding: 0.1rem 0.4rem;
    font-size: 0.55rem; font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: rgba(184,92,80,0.16);
    color: #7a3028;
    border: 1px solid rgba(184,92,80,0.28);
    border-radius: 999px;
    margin-left: 0.45rem;
  }

  /* Team avatar (used in Teams table + grid + Your teams) */
  .team-avatar {
    height: 38px; width: 38px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    color: #cad2c5;
    font-size: 0.85rem; font-weight: 600;
    background: linear-gradient(135deg, #354f52 0%, #52796f 60%, #84a98c 100%);
    border: 2px solid #fff;
    box-shadow: 0 2px 6px rgba(53,79,82,0.15);
  }
  .team-avatar.is-sm {
    height: 28px; width: 28px;
    font-size: 0.7rem;
    border-width: 1.5px;
  }

  /* Hide low-priority columns at narrower widths */
  @media (max-width: 1199px) {
    .col-jobtitle { display: none; }
  }
  @media (max-width: 1023px) {
    .col-team { display: none; }
  }
  @media (max-width: 879px) {
    .col-department { display: none; }
  }
  /* Teams table column hiding */
  @media (max-width: 1023px) {
    .col-team-desc { display: none; }
  }
  @media (max-width: 819px) {
    .col-team-dept { display: none; }
  }

  /* Empty/loading states */
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
     EMPLOYEE GRID CARDS
  ══════════════════════════════════════ */
  .grid-wrap {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.85rem;
    padding: 1rem;
  }
  @media (min-width: 640px) { .grid-wrap { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .grid-wrap { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 1380px) { .grid-wrap { grid-template-columns: repeat(4, 1fr); } }

  .emp-card {
    background: #fff;
    border: 1.5px solid #eaefeb;
    border-radius: 12px;
    padding: 1.1rem 1rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
    text-align: center;
    -webkit-tap-highlight-color: transparent;
  }
  .emp-card:hover {
    transform: translateY(-2px);
    border-color: #84a98c;
    box-shadow: 0 8px 22px rgba(53,79,82,0.08);
  }
  .emp-card.is-terminated {
    background: rgba(192,117,106,0.04);
    border-color: rgba(192,117,106,0.22);
  }
  .emp-card-avatar {
    width: 64px; height: 64px;
    margin: 0 auto 0.85rem;
    border-radius: 50%;
    overflow: hidden;
    background: linear-gradient(135deg, #354f52 0%, #52796f 60%, #84a98c 100%);
    border: 2.5px solid #fff;
    box-shadow: 0 4px 12px rgba(53,79,82,0.18);
    display: flex; align-items: center; justify-content: center;
    color: #cad2c5;
    font-size: 1.15rem; font-weight: 600;
  }
  .emp-card-avatar.is-terminated {
    background: linear-gradient(135deg, #a35446 0%, #b85c50 100%);
  }
  .emp-card-avatar img { width: 100%; height: 100%; object-fit: cover; }

  .emp-card-name {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.92rem; font-weight: 600;
    color: #2f3e46;
    margin: 0 0 0.25rem;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .emp-card-name.is-terminated { color: #7a3028; }
  .emp-card-role {
    font-size: 0.74rem; color: #52796f; font-weight: 500;
    margin: 0 0 0.15rem;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .emp-card-role.is-terminated { color: #a35446; }
  .emp-card-meta {
    font-size: 0.7rem; color: #7a8e84;
    margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .emp-card-meta.is-terminated { color: #a35446; }
  .emp-card-action {
    margin-top: 0.85rem;
  }

  /* ══════════════════════════════════════
     TEAM CARDS (in "Your teams" section + Teams grid)
  ══════════════════════════════════════ */
  .team-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 1rem 1.1rem;
    transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
  }
  .team-card:hover {
    transform: translateY(-2px);
    border-color: #84a98c;
    box-shadow: 0 8px 22px rgba(53,79,82,0.08);
  }
  .team-card-head {
    display: flex; align-items: center; gap: 0.75rem;
    margin-bottom: 0.85rem;
    padding-bottom: 0.7rem;
    border-bottom: 1px solid #eaefeb;
  }
  .team-card-name {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.95rem; font-weight: 600;
    color: #2f3e46;
    margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .team-card-meta {
    font-size: 0.7rem; color: #7a8e84;
    margin: 0.15rem 0 0;
  }

  .team-card-actions {
    display: flex; gap: 0.45rem;
  }
  .team-card-actions .btn { flex: 1; }

  /* Members roster list */
  .team-roster {
    margin-top: 0.85rem;
    padding-top: 0.85rem;
    border-top: 1px solid #eaefeb;
    max-height: 220px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .team-roster-empty {
    font-size: 0.74rem; color: #7a8e84;
    text-align: center;
    padding: 0.55rem;
    margin: 0;
  }
  .team-roster-row {
    display: flex; align-items: center; gap: 0.55rem;
    padding: 0.4rem 0;
  }
  .team-roster-row + .team-roster-row {
    border-top: 1px solid #f0f0ec;
  }
  .roster-avatar {
    width: 28px; height: 28px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    background: linear-gradient(135deg, #354f52 0%, #52796f 60%, #84a98c 100%);
    border: 1.5px solid #fff;
    color: #cad2c5;
    font-size: 0.65rem; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 1px 3px rgba(53,79,82,0.15);
  }
  .roster-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .roster-name {
    font-size: 0.78rem; font-weight: 500; color: #2f3e46;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin: 0;
  }
  .roster-role {
    font-size: 0.66rem; color: #7a8e84;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin: 0.05rem 0 0;
  }

  /* Skeleton */
  .skeleton-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 1rem 1.1rem;
  }
  .skeleton-head {
    display: flex; align-items: center; gap: 0.7rem;
    animation: pulse-skeleton 1.5s ease-in-out infinite;
  }
  .skeleton-circle {
    width: 38px; height: 38px;
    border-radius: 50%;
    background: rgba(132,169,140,0.18);
    flex-shrink: 0;
  }
  .skeleton-line {
    height: 8px;
    border-radius: 4px;
    background: rgba(132,169,140,0.18);
    margin-bottom: 0.4rem;
  }
  .skeleton-line.lg { height: 12px; width: 65%; }
  .skeleton-line.sm { height: 8px; width: 40%; margin-bottom: 0; }

  /* ══════════════════════════════════════
     DELETE CONFIRMATION MODAL
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
    max-width: 440px;
    overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 32px 64px rgba(47,62,70,0.25);
    animation: scaleIn 0.25s cubic-bezier(0.22,1,0.36,1);
  }
  .modal-hero {
    position: relative;
    padding: 1.5rem 1.6rem 1.25rem;
    background: linear-gradient(135deg, #2f3e46 0%, #354f52 60%, #4a3d3a 100%);
    color: #cad2c5;
    overflow: hidden;
  }
  .modal-hero::after {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 160px; height: 160px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(184,92,80,0.18), transparent 70%);
    pointer-events: none;
  }
  .modal-hero-eyebrow {
    font-size: 0.6rem; font-weight: 500;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: rgba(192,117,106,0.85);
    margin: 0 0 0.3rem;
    position: relative; z-index: 1;
  }
  .modal-hero-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.55rem; font-weight: 400;
    color: #fff;
    letter-spacing: -0.01em;
    line-height: 1.15;
    margin: 0;
    display: flex; align-items: center; gap: 0.5rem;
    position: relative; z-index: 1;
  }
  .modal-hero-icon-wrap {
    width: 36px; height: 36px;
    border-radius: 9px;
    background: rgba(192,117,106,0.18);
    border: 1px solid rgba(192,117,106,0.28);
    display: flex; align-items: center; justify-content: center;
    color: #d49890;
    flex-shrink: 0;
  }
  .modal-body {
    padding: 1.25rem 1.6rem;
  }
  .modal-text-prim {
    font-size: 0.86rem; color: #354f52; font-weight: 400;
    line-height: 1.55;
    margin: 0 0 0.55rem;
  }
  .modal-text-prim strong {
    color: #b85c50; font-weight: 700;
  }
  .modal-text-sec {
    font-size: 0.78rem; color: #7a8e84; font-weight: 300;
    line-height: 1.5;
    margin: 0;
  }
  .modal-footer {
    display: flex; justify-content: flex-end; gap: 0.5rem;
    padding: 0.85rem 1.6rem 1.25rem;
    flex-wrap: wrap;
  }
  .modal-footer .btn { flex: 1; }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1023px) {
    .eh-root { padding: 1.25rem; }
    .header-title { font-size: 1.5rem; }
  }
  @media (max-width: 767px) {
    .eh-root { padding: 0.85rem; }
    .header-title { font-size: 1.35rem; }
    .header-icon-wrap { width: 34px; height: 34px; border-radius: 9px; }
    .filter-card { padding: 0.85rem; }
    .data-table th { padding: 0.55rem 0.5rem; font-size: 0.55rem; }
    .data-table td { padding: 0.55rem 0.5rem; font-size: 0.72rem; }
    .modal-hero { padding: 1.25rem 1.25rem 1rem; }
    .modal-hero-title { font-size: 1.4rem; }
    .modal-body { padding: 1rem 1.25rem; }
    .modal-footer { padding: 0.7rem 1.25rem 1rem; }
  }
  @media (max-width: 479px) {
    .eh-root { padding: 0.65rem; }
    .header-title { font-size: 1.25rem; }
    .modal-overlay { padding: 0; align-items: flex-end; }
    .modal-box { border-radius: 18px 18px 0 0; }
    .search-input { font-size: 16px; }
  }
`;

export default function EmployeeHub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success, error: showError } = useAlert();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("All");
  const [sortBy, setSortBy] = useState("First name (A - Z)");
  const [status, setStatus] = useState("All");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState({});
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [viewMode, setViewMode] = useState('table');

  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchAllEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(buildApiUrl('/employees?includeAdmins=true'));
      if (response.data.success) {
        const employees = response.data.data;
        setAllEmployees(employees);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllEmployees();
    fetchTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewProfile = (employeeId) => {
    navigate(`/employee/${employeeId}`);
  };

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const toggleAllEmployees = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map(e => e._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEmployees.size === 0) return;

    try {
      const employeeIds = Array.from(selectedEmployees);
      const response = await axios.delete(buildApiUrl('/employees/bulk'), {
        data: { employeeIds }
      });

      if (response.data.success) {
        await fetchAllEmployees();
        setSelectedEmployees(new Set());
        setShowDeleteConfirm(false);
        success(`Successfully deleted ${employeeIds.length} employee(s)`);
      }
    } catch (err) {
      console.error('Error deleting employees:', err);
      showError('Failed to delete employees. Please try again.');
    }
  };

  useEffect(() => {
    const refreshParam = searchParams.get('refresh');

    if (refreshParam) {
      fetchAllEmployees();
      navigate('/employee-hub', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, navigate]);

  const fetchTeams = async () => {
    setTeamsLoading(true);
    try {
      const response = await axios.get(buildApiUrl('/teams'));
      if (response.data.success) {
        setTeams(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setTeamsLoading(false);
    }
  };

  const toggleTeam = (teamName) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamName]: !prev[teamName],
    }));
  };

  const formatDate = (dateString) => {
    const formatted = formatDateDDMMYY(dateString);
    return formatted || "-";
  };

  const getFilteredAndSortedData = () => {
    let filteredData = [];

    if (filterBy === "Employees" || filterBy === "All") {
      let employeeData = allEmployees.filter((emp) => {
        const matchesSearch = searchTerm === "" ||
          emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.department?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = status === "All" || emp.status === status;

        return matchesSearch && matchesStatus;
      });

      filteredData = [...employeeData.map(emp => ({ ...emp, type: 'employee' }))];
    }

    if (filterBy === "Teams" || filterBy === "All") {
      let teamData = teams.filter((team) => {
        const matchesSearch = searchTerm === "" ||
          team.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          team.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          team.department?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
      });

      filteredData = [...filteredData, ...teamData.map(team => ({ ...team, type: 'team' }))];
    }

    filteredData.sort((a, b) => {
      switch (sortBy) {
        case "First name (A - Z)":
          const aFirstName = a.type === 'employee' ? a.firstName : a.name;
          const bFirstName = b.type === 'employee' ? b.firstName : b.name;
          return (aFirstName || '').localeCompare(bFirstName || '');
        case "First name (Z - A)":
          const aFirstNameDesc = a.type === 'employee' ? a.firstName : a.name;
          const bFirstNameDesc = b.type === 'employee' ? b.firstName : b.name;
          return (bFirstNameDesc || '').localeCompare(aFirstNameDesc || '');
        case "Last name (A - Z)":
          if (a.type === 'employee' && b.type === 'employee') {
            return (a.lastName || '').localeCompare(b.lastName || '');
          }
          return 0;
        case "Last name (Z - A)":
          if (a.type === 'employee' && b.type === 'employee') {
            return (b.lastName || '').localeCompare(a.lastName || '');
          }
          return 0;
        default:
          return 0;
      }
    });

    return filteredData;
  };

  const filteredAndSortedData = getFilteredAndSortedData();
  const filteredEmployees = filteredAndSortedData.filter(item => item.type === 'employee');
  const filteredTeams = filteredAndSortedData.filter(item => item.type === 'team');

  const getTeamEmployees = (teamName) => {
    return allEmployees.filter((emp) => emp.team === teamName);
  };

  const getInitials = (emp) => {
    return emp.initials || `${emp.firstName?.charAt(0) || ''}${emp.lastName?.charAt(0) || ''}`;
  };
  const getTeamInitials = (team) => {
    return team.initials || (team.name || '').substring(0, 2).toUpperCase();
  };

  const listHeaderText =
    filterBy === "Teams" ? `List of Teams (${filteredTeams.length})` :
    filterBy === "Employees" ? `List of Employees (${filteredEmployees.length})` :
    `List of Employees (${filteredEmployees.length})`;

  return (
    <>
      <style>{styles}</style>
      <div className="eh-root">
        <div className="eh-shell">

          {/* ── Page Header ── */}
          <div className="page-header anim-fade-up">
            <div className="header-block">
              <div className="header-icon-wrap">
                <svg style={{ width: 18, height: 18, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="header-eyebrow">People Directory</p>
                <h1 className="header-title">Employees</h1>
                <p className="header-subtitle">
                  Browse, manage, and update your organization's people and teams.
                </p>
              </div>
            </div>

            <div className="header-actions">
              <button
                onClick={() => navigate("/add-employee")}
                className="btn btn-success"
                type="button"
              >
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                </svg>
                Add employees
              </button>

              {selectedEmployees.size > 0 && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn btn-danger"
                  type="button"
                >
                  <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Selected ({selectedEmployees.size})
                </button>
              )}
            </div>
          </div>

          {/* ── Filter card ── */}
          <div className="filter-card anim-fade-up delay-100">
            <div className="filter-grid">
              {/* Search */}
              <div className="search-wrap" style={{ position: 'relative' }}>
                <label className="field-label">Find</label>
                <div style={{ position: 'relative' }}>
                  <span className="search-icon" style={{ top: 'calc(50% + 11px)' }}>
                    <MagnifyingGlassIcon style={{ width: 14, height: 14 }} />
                  </span>
                  <input
                    type="text"
                    placeholder={
                      filterBy === "Teams" ? "Search teams…" :
                      filterBy === "Employees" ? "Search employees…" :
                      "Search employees and teams…"
                    }
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSearchDropdown(e.target.value.length > 0);
                    }}
                    onFocus={() => setShowSearchDropdown(searchTerm.length > 0)}
                    onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                    className="search-input"
                  />

                  {showSearchDropdown && searchTerm && (
                    <div className="search-dropdown">
                      {filteredAndSortedData.length === 0 ? (
                        <div className="search-dropdown-empty">No results found</div>
                      ) : (
                        filteredAndSortedData.slice(0, 10).map((item) => (
                          <div
                            key={`${item.type}-${item._id}`}
                            className="search-dropdown-item"
                            onClick={() => {
                              if (item.type === 'employee') {
                                handleViewProfile(item._id);
                              } else {
                                toggleTeam(item.name);
                              }
                              setShowSearchDropdown(false);
                            }}
                          >
                            <div className="search-dropdown-row">
                              {item.type === 'employee' ? (
                                <>
                                  <div className="dropdown-avatar">
                                    {item.profilePhoto ? (
                                      <img src={item.profilePhoto} alt={`${item.firstName} ${item.lastName}`} />
                                    ) : (
                                      getInitials(item)
                                    )}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p className="dropdown-name">{item.firstName} {item.lastName}</p>
                                    <p className="dropdown-meta">
                                      {item.jobTitle || '—'} · {item.department || '—'}
                                    </p>
                                  </div>
                                  <span className="dropdown-tag is-employee">Employee</span>
                                </>
                              ) : (
                                <>
                                  <div className="dropdown-avatar">
                                    {getTeamInitials(item)}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p className="dropdown-name">{item.name}</p>
                                    <p className="dropdown-meta">
                                      {getTeamEmployees(item.name).length} member{getTeamEmployees(item.name).length === 1 ? '' : 's'}
                                    </p>
                                  </div>
                                  <span className="dropdown-tag is-team">Team</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Filter By */}
              <div>
                <label className="field-label">Filter by</label>
                <Select value={filterBy} onValueChange={setFilterBy}>
                  <SelectTrigger style={{ width: '100%', minHeight: 38 }}>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Employees">Employees</SelectItem>
                    <SelectItem value="Teams">Teams</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div>
                <label className="field-label">Sort by</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger style={{ width: '100%', minHeight: 38 }}>
                    <SelectValue placeholder="First name (A - Z)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First name (A - Z)">First name (A → Z)</SelectItem>
                    <SelectItem value="First name (Z - A)">First name (Z → A)</SelectItem>
                    <SelectItem value="Last name (A - Z)">Last name (A → Z)</SelectItem>
                    <SelectItem value="Last name (Z - A)">Last name (Z → A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <label className="field-label">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger style={{ width: '100%', minHeight: 38 }}>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Collapsible List Section ── */}
          <button
            onClick={() => setShowEmployeeList(!showEmployeeList)}
            className="list-header-btn anim-fade-up delay-200"
            type="button"
          >
            <div className="list-header-left">
              <div className="list-header-icon">
                <UserGroupIcon style={{ width: 18, height: 18 }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 className="list-header-title">{listHeaderText}</h2>
                <p className="list-header-hint">
                  {showEmployeeList ? 'Tap to collapse' : 'Tap to expand'}
                </p>
              </div>
            </div>
            {showEmployeeList ? (
              <ChevronUpIcon style={{ width: 18, height: 18, color: '#52796f', flexShrink: 0 }} />
            ) : (
              <ChevronDownIcon style={{ width: 18, height: 18, color: '#52796f', flexShrink: 0 }} />
            )}
          </button>

          {showEmployeeList && (
            <>
              {/* View toggle */}
              <div className="view-toggle-row">
                <div className="view-toggle">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`view-toggle-btn ${viewMode === 'table' ? 'is-active' : ''}`}
                    type="button"
                  >
                    <svg style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18m-9 8h9m-9 4h9m-9-8h9m-9 4h9" />
                    </svg>
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`view-toggle-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                    type="button"
                  >
                    <svg style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Grid
                  </button>
                </div>
              </div>

              {/* Table / grid surface */}
              <div className="data-card">
                {filterBy === "Teams" ? (
                  // ─── Teams branch ───
                  teamsLoading ? (
                    <div className="state-pad">
                      <div className="spinner"></div>
                      <p className="spinner-text">Loading teams…</p>
                    </div>
                  ) : teams.length === 0 ? (
                    <div className="state-pad">
                      <div className="empty-icon-wrap">
                        <UserGroupIcon style={{ width: 26, height: 26 }} />
                      </div>
                      <h3 className="empty-title">No teams found</h3>
                      <p className="empty-text">Teams will appear here once they are created.</p>
                    </div>
                  ) : viewMode === 'table' ? (
                    <div className="table-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: 44 }}>S.No</th>
                            <th>Team Name</th>
                            <th className="col-team-dept">Department</th>
                            <th>Members</th>
                            <th className="col-team-desc">Description</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTeams.map((team, index) => {
                            const teamMembers = getTeamEmployees(team.name);
                            return (
                              <tr key={team._id} onClick={(e) => e.stopPropagation()}>
                                <td className="td-index">{index + 1}</td>
                                <td>
                                  <div className="name-cell">
                                    <div className="team-avatar is-sm">
                                      {getTeamInitials(team)}
                                    </div>
                                    <p className="name-primary">{team.name}</p>
                                  </div>
                                </td>
                                <td className="td-muted col-team-dept">{team.department || '—'}</td>
                                <td className="td-muted">
                                  {teamMembers.length} member{(teamMembers.length || 0) !== 1 ? 's' : ''}
                                </td>
                                <td className="td-muted col-team-desc" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {team.description || '—'}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button
                                      onClick={() => toggleTeam(team.name)}
                                      className="btn btn-secondary btn-xs"
                                      type="button"
                                    >
                                      View
                                    </button>
                                    <button
                                      onClick={() => navigate(`/manage-teams?edit=${team._id}`)}
                                      className="btn btn-secondary btn-xs"
                                      type="button"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="grid-wrap">
                      {filteredTeams.map((team) => {
                        const teamMembers = getTeamEmployees(team.name);
                        return (
                          <div key={team._id} className="team-card">
                            <div className="team-card-head">
                              <div className="team-avatar">
                                {getTeamInitials(team)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 className="team-card-name">{team.name}</h3>
                                <p className="team-card-meta">
                                  {teamMembers.length} member{(teamMembers.length || 0) !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="team-card-actions">
                              <button
                                onClick={() => toggleTeam(team.name)}
                                className="btn btn-primary btn-xs"
                                type="button"
                              >
                                View Members
                              </button>
                              <button
                                onClick={() => navigate(`/manage-teams?edit=${team._id}`)}
                                className="btn btn-secondary btn-xs"
                                type="button"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  // ─── Employees branch ───
                  loading ? (
                    <div className="state-pad">
                      <div className="spinner"></div>
                      <p className="spinner-text">Loading employees…</p>
                    </div>
                  ) : allEmployees.length === 0 ? (
                    <div className="state-pad">
                      <div className="empty-icon-wrap">
                        <UserGroupIcon style={{ width: 26, height: 26 }} />
                      </div>
                      <h3 className="empty-title">No employees found</h3>
                      <p className="empty-text">Add your first employee to get started.</p>
                    </div>
                  ) : viewMode === 'table' ? (
                    <div className="table-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th className="is-checkbox">
                              <input
                                type="checkbox"
                                checked={selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
                                onChange={toggleAllEmployees}
                                className="checkbox"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </th>
                            <th>S.No</th>
                            <th>Name</th>
                            <th className="col-team">Team</th>
                            <th className="col-jobtitle">Job Role</th>
                            <th className="col-department">Department</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEmployees.map((employee, index) => {
                            const isTerminated = (employee.status || '').toLowerCase() === 'terminated';
                            const isSelected = selectedEmployees.has(employee._id);
                            return (
                              <tr
                                key={employee._id}
                                className={`${isSelected ? 'is-selected' : ''} ${isTerminated ? 'is-terminated' : ''}`}
                                onClick={() => handleViewProfile(employee._id)}
                              >
                                <td onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleEmployeeSelection(employee._id)}
                                    className="checkbox"
                                  />
                                </td>
                                <td className="td-index">{index + 1}</td>
                                <td>
                                  <div className={`name-cell ${isTerminated ? 'is-terminated' : ''}`}>
                                    <div className={`row-avatar ${isTerminated ? 'is-terminated' : ''}`}>
                                      {employee.profilePhoto ? (
                                        <img src={employee.profilePhoto} alt={`${employee.firstName} ${employee.lastName}`} />
                                      ) : (
                                        getInitials(employee)
                                      )}
                                    </div>
                                    <div className="name-stack">
                                      <p className="name-primary">
                                        {employee.firstName || '-'} {employee.lastName || '-'}
                                        {isTerminated && <span className="terminated-tag">Terminated</span>}
                                      </p>
                                      <p className="name-secondary">{employee.email || '-'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="td-muted col-team">{employee.team || '—'}</td>
                                <td className="td-muted col-jobtitle">{employee.jobTitle || '—'}</td>
                                <td className="td-muted col-department">{employee.department || '—'}</td>
                                <td>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewProfile(employee._id);
                                    }}
                                    className={`btn btn-xs ${isTerminated ? 'btn-soft-danger' : 'btn-secondary'}`}
                                    type="button"
                                  >
                                    <DocumentTextIcon style={{ width: 12, height: 12 }} />
                                    <span>View</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="grid-wrap">
                      {filteredEmployees.map((employee) => {
                        const isTerminated = (employee.status || '').toLowerCase() === 'terminated';
                        return (
                          <div
                            key={employee._id}
                            onClick={() => handleViewProfile(employee._id)}
                            className={`emp-card ${isTerminated ? 'is-terminated' : ''}`}
                          >
                            <div className={`emp-card-avatar ${isTerminated ? 'is-terminated' : ''}`}>
                              {employee.profilePhoto ? (
                                <img src={employee.profilePhoto} alt={`${employee.firstName} ${employee.lastName}`} />
                              ) : (
                                getInitials(employee)
                              )}
                            </div>
                            <h3 className={`emp-card-name ${isTerminated ? 'is-terminated' : ''}`}>
                              {employee.firstName || '-'} {employee.lastName || '-'}
                            </h3>
                            <p className={`emp-card-role ${isTerminated ? 'is-terminated' : ''}`}>
                              {employee.jobTitle || '—'}
                            </p>
                            <p className={`emp-card-meta ${isTerminated ? 'is-terminated' : ''}`}>
                              {employee.department || '—'}
                            </p>
                            <p className={`emp-card-meta ${isTerminated ? 'is-terminated' : ''}`}>
                              {employee.team || 'No team'}
                            </p>

                            <div className="emp-card-action">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewProfile(employee._id);
                                }}
                                className={`btn btn-block btn-xs ${isTerminated ? 'btn-soft-danger' : 'btn-primary'}`}
                                type="button"
                              >
                                <DocumentTextIcon style={{ width: 12, height: 12 }} />
                                View Profile
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </>
          )}

          {/* ── Your teams section ── */}
          <h2 className="section-heading">Your teams</h2>

          {teamsLoading ? (
            <div className="grid-wrap" style={{ padding: 0 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-head">
                    <div className="skeleton-circle"></div>
                    <div style={{ flex: 1 }}>
                      <div className="skeleton-line lg"></div>
                      <div className="skeleton-line sm"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (filterBy === "Employees" ? null : teams.length === 0 ? (
            <div className="data-card state-pad">
              <div className="empty-icon-wrap">
                <UserGroupIcon style={{ width: 26, height: 26 }} />
              </div>
              <h3 className="empty-title">No teams found</h3>
              <p className="empty-text">Teams will appear here once they are created.</p>
            </div>
          ) : (
            <div className="grid-wrap" style={{ padding: 0, alignItems: 'start' }}>
              {(filterBy === "Employees" ? [] : filteredTeams.length > 0 ? filteredTeams : teams).map((team) => {
                const teamMembers = getTeamEmployees(team.name);
                const isExpanded = expandedTeams[team.name];
                return (
                  <div key={team._id} className="team-card">
                    <div className="team-card-head">
                      <div className="team-avatar">
                        {getTeamInitials(team)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 className="team-card-name">{team.name}</h3>
                        <p className="team-card-meta">
                          {team.memberCount || 0} member{(team.memberCount || 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="team-card-actions">
                      <button
                        onClick={() => toggleTeam(team.name)}
                        className="btn btn-secondary btn-xs btn-block"
                        type="button"
                      >
                        {isExpanded ? 'Hide Members' : 'View Members'}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="team-roster">
                        {teamMembers.length === 0 ? (
                          <p className="team-roster-empty">No members assigned</p>
                        ) : (
                          teamMembers.map((employee) => (
                            <div key={employee._id || employee.id} className="team-roster-row">
                              <div className="roster-avatar">
                                {employee.profilePhoto ? (
                                  <img src={employee.profilePhoto} alt={`${employee.firstName} ${employee.lastName}`} />
                                ) : (
                                  getInitials(employee)
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p className="roster-name">
                                  {employee.firstName} {employee.lastName}
                                </p>
                                <p className="roster-role">{employee.jobTitle || '—'}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bulk Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
        >
          <div className="modal-box">
            <div className="modal-hero">
              <p className="modal-hero-eyebrow">Confirmation Required</p>
              <h3 className="modal-hero-title">
                <span className="modal-hero-icon-wrap">
                  <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
                Delete employees?
              </h3>
            </div>

            <div className="modal-body">
              <p className="modal-text-prim">
                You are about to delete <strong>{selectedEmployees.size}</strong> employee{selectedEmployees.size === 1 ? '' : 's'}.
              </p>
              <p className="modal-text-sec">
                This action cannot be undone. All employee data will be permanently removed.
              </p>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn btn-danger"
                type="button"
              >
                <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}