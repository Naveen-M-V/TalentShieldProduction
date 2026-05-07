import React, { useEffect, useState } from 'react';
import { Upload, Download, Trash2, FileText, X, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import { buildApiUrl, buildDirectUrl } from '../utils/apiConfig';
import { formatDateDDMMYY } from '../utils/dateFormatter';
import { isAdmin } from '../utils/authUtils';
import DocumentViewer from '../components/DocumentManagement/DocumentViewer';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .el-root {
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
  .el-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
    height: 600px;
  }
  .el-shell {
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
    font-size: 1.6rem; color: #2f3e46; line-height: 1.15; letter-spacing: -0.02em;
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
  .btn-success:disabled {
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
  .btn-soft-danger {
    background: rgba(192,117,106,0.1); color: #b85c50;
    border: 1px solid rgba(192,117,106,0.22);
  }
  .btn-soft-danger:hover:not(:disabled) {
    background: rgba(192,117,106,0.18); color: #7a3028;
  }
  .btn-xs {
    font-size: 0.66rem; padding: 0.32rem 0.55rem; min-height: 28px;
    border-radius: 6px; gap: 0.3rem;
  }
  .btn-icon {
    width: 32px; height: 32px;
    padding: 0;
    border-radius: 7px;
    flex-shrink: 0;
  }

  /* ══════════════════════════════════════
     CARD GRID
  ══════════════════════════════════════ */
  .materials-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.95rem;
  }
  @media (min-width: 640px) { .materials-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1100px) { .materials-grid { grid-template-columns: repeat(3, 1fr); } }

  /* ══════════════════════════════════════
     MATERIAL CARD
  ══════════════════════════════════════ */
  .material-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 14px;
    padding: 1.05rem 1.1rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
    display: flex; flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  .material-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, #84a98c, transparent);
    opacity: 0.5;
    transition: opacity 0.25s;
  }
  .material-card:hover {
    transform: translateY(-2px);
    border-color: #84a98c;
    box-shadow: 0 8px 24px rgba(53,79,82,0.08);
  }
  .material-card:hover::before { opacity: 1; }

  .material-card-head {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 0.7rem;
    margin-bottom: 0.85rem;
  }
  .material-icon-tile {
    width: 44px; height: 44px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(82,121,111,0.10), rgba(132,169,140,0.16));
    border: 1px solid rgba(82,121,111,0.18);
    display: flex; align-items: center; justify-content: center;
    color: #354f52;
    flex-shrink: 0;
  }
  .material-type-pill {
    display: inline-flex; align-items: center;
    padding: 0.18rem 0.5rem;
    background: rgba(82,121,111,0.12);
    color: #354f52;
    border: 1px solid rgba(82,121,111,0.22);
    border-radius: 999px;
    font-size: 0.6rem; font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .material-completed-tag {
    display: inline-flex; align-items: center;
    gap: 0.25rem;
    padding: 0.18rem 0.5rem;
    background: rgba(132,169,140,0.16);
    color: #2f4a32;
    border: 1px solid rgba(132,169,140,0.28);
    border-radius: 999px;
    font-size: 0.6rem; font-weight: 600;
    letter-spacing: 0.05em;
    margin-top: 0.3rem;
  }

  .material-title {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 400;
    font-size: 1.18rem;
    color: #2f3e46;
    letter-spacing: -0.01em;
    line-height: 1.3;
    margin: 0 0 0.35rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .material-desc {
    font-size: 0.78rem; color: #52796f; font-weight: 400;
    line-height: 1.55;
    margin: 0 0 0.7rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .material-meta-row {
    display: flex; align-items: center; gap: 0.45rem;
    font-size: 0.7rem; color: #7a8e84;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }
  .material-meta-bullet { color: #b6c0b9; }
  .material-uploader {
    font-size: 0.68rem; color: #8fa99a;
    margin: 0 0 0.85rem;
  }
  .material-uploader strong {
    color: #52796f; font-weight: 500;
  }

  /* ── Completion stats block (admin/manager) ── */
  .completion-block {
    margin-bottom: 0.85rem;
    padding: 0.7rem 0.85rem;
    background: linear-gradient(135deg, #fafbfa, #f0f5f2);
    border: 1px solid #eaefeb;
    border-radius: 10px;
  }
  .completion-stat-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.55rem;
    flex-wrap: wrap;
  }
  .completion-stat-text {
    font-size: 0.72rem; font-weight: 500; color: #354f52;
    line-height: 1.4;
  }
  .completion-percent {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.05rem; font-weight: 500;
    color: #2f3e46;
    letter-spacing: -0.01em;
    line-height: 1;
  }
  .completion-bar-track {
    height: 5px;
    background: rgba(132,169,140,0.18);
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: 0.7rem;
  }
  .completion-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #52796f, #84a98c);
    border-radius: 999px;
    transition: width 0.5s cubic-bezier(0.22,1,0.36,1);
  }

  /* ── Action row at the bottom of each card ── */
  .material-actions {
    display: flex; align-items: center; gap: 0.4rem;
    margin-top: auto;
  }
  .material-actions .btn-view {
    flex: 1;
  }
  .material-actions .btn-complete {
    flex-shrink: 0;
  }

  /* ══════════════════════════════════════
     EMPTY STATE
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
    width: 64px; height: 64px;
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

  /* ══════════════════════════════════════
     LOADING SCREEN
  ══════════════════════════════════════ */
  .loading-page {
    min-height: 100vh;
    background: #f7f8f6;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column;
    gap: 1rem;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    overflow: hidden;
  }
  .loading-page::before {
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
  .loading-text {
    font-size: 0.78rem; color: #7a8e84; font-weight: 400;
    position: relative; z-index: 1;
  }

  /* ══════════════════════════════════════
     MODAL (shared)
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
  .modal-sm { max-width: 480px; }
  .modal-lg { max-width: 880px; }

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
    font-size: 0.76rem; color: #52796f; font-weight: 500;
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
  .text-input, .file-input, .textarea-input {
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
  .text-input:focus, .textarea-input:focus, .file-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .textarea-input { min-height: 76px; resize: vertical; }
  .file-input {
    padding: 0;
    cursor: pointer;
    background: #fafbfa;
    overflow: hidden;
  }
  .file-input::file-selector-button {
    padding: 0.55rem 0.85rem;
    margin-right: 0.7rem;
    border: none;
    background: linear-gradient(135deg, #f0f5f2, #eaf2ec);
    color: #354f52;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.74rem; font-weight: 500;
    cursor: pointer;
    border-right: 1.5px solid #d4ddd6;
    transition: background 0.15s;
  }
  .file-input::file-selector-button:hover {
    background: linear-gradient(135deg, #eaf2ec, #d9e8db);
  }
  .file-input::-webkit-file-upload-button {
    padding: 0.55rem 0.85rem;
    margin-right: 0.7rem;
    border: none;
    background: linear-gradient(135deg, #f0f5f2, #eaf2ec);
    color: #354f52;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.74rem; font-weight: 500;
    cursor: pointer;
    border-right: 1.5px solid #d4ddd6;
  }
  .upload-spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(202,210,197,0.4);
    border-top-color: #cad2c5;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* Selected file note inside upload modal */
  .selected-file-note {
    margin-top: 0.55rem;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    background: rgba(132,169,140,0.10);
    border: 1px solid rgba(132,169,140,0.22);
    font-size: 0.72rem;
    color: #354f52;
    display: flex; align-items: center; gap: 0.45rem;
  }
  .selected-file-note strong {
    font-weight: 500; color: #2f3e46;
  }

  /* ══════════════════════════════════════
     COMPLETIONS MODAL
  ══════════════════════════════════════ */
  .completions-summary {
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.85rem;
    flex-wrap: wrap;
    margin-top: 0.85rem;
  }
  .completions-summary-text {
    font-size: 0.78rem; color: #52796f; font-weight: 500;
    line-height: 1.4;
  }
  .completions-summary-text strong {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.05rem; font-weight: 500;
    color: #2f3e46;
    margin-right: 0.2rem;
  }

  .search-wrap {
    position: relative;
    margin-bottom: 1rem;
  }
  .search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%);
    color: #84a98c;
    pointer-events: none;
    display: flex; align-items: center;
  }
  .search-input {
    width: 100%;
    padding: 0.5rem 0.85rem 0.5rem 2.2rem;
    border: 1.5px solid #d4ddd6;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8rem; color: #2f3e46;
    background: #fff;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    min-height: 36px;
  }
  .search-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }

  .completions-table-wrap {
    border: 1px solid #eaefeb;
    border-radius: 12px;
    overflow: hidden;
    width: 100%;
    max-width: 100%;
  }
  .completions-table-scroll {
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
    color: #354f52;
    vertical-align: middle;
  }
  .td-strong { font-weight: 600; color: #2f3e46; }
  .td-muted { color: #7a8e84; }

  .completion-pill {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.2rem 0.55rem;
    font-size: 0.65rem; font-weight: 600;
    border-radius: 999px;
    letter-spacing: 0.02em;
    border: 1px solid var(--pill-border, #eaefeb);
    background: var(--pill-bg, #fafbfa);
    color: var(--pill-text, #7a8e84);
    white-space: nowrap;
  }
  .completion-pill.is-done {
    --pill-bg: rgba(82,121,111,0.12);
    --pill-border: rgba(82,121,111,0.25);
    --pill-text: #2f4a32;
  }
  .completion-pill-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--pill-text, #7a8e84);
    flex-shrink: 0;
  }

  /* Hide low-priority columns at narrower widths */
  @media (max-width: 879px) {
    .col-empid { display: none; }
  }
  @media (max-width: 759px) {
    .col-dept { display: none; }
  }
  @media (max-width: 579px) {
    .col-completed { display: none; }
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1023px) {
    .el-root { padding: 1.25rem; }
    .header-title { font-size: 1.45rem; }
  }
  @media (max-width: 767px) {
    .el-root { padding: 0.85rem; }
    .header-title { font-size: 1.3rem; }
    .header-icon-wrap { width: 34px; height: 34px; border-radius: 9px; }
    .material-card { padding: 0.9rem 0.95rem; }
    .material-title { font-size: 1.08rem; }
    .modal-header, .modal-body { padding-left: 1.1rem; padding-right: 1.1rem; }
    .modal-footer { padding-left: 1.1rem; padding-right: 1.1rem; }
    .data-table th { padding: 0.55rem 0.5rem; font-size: 0.55rem; }
    .data-table td { padding: 0.55rem 0.5rem; font-size: 0.72rem; }
  }
  @media (max-width: 479px) {
    .el-root { padding: 0.65rem; }
    .header-title { font-size: 1.2rem; }
    .modal-overlay { padding: 0; align-items: flex-end; }
    .modal-box { border-radius: 18px 18px 0 0; max-height: 92vh; }
    .text-input, .textarea-input, .search-input, .file-input { font-size: 16px; }
  }
`;

const ELearning = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerMaterial, setViewerMaterial] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    file: null,
    title: '',
    description: ''
  });

  // Completion tracking state
  const [showCompletionsModal, setShowCompletionsModal] = useState(false);
  const [selectedMaterialForCompletions, setSelectedMaterialForCompletions] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [completionsLoading, setCompletionsLoading] = useState(false);
  const [completionsSearchTerm, setCompletionsSearchTerm] = useState('');
  const [completingId, setCompletingId] = useState(null);

  const adminUser = isAdmin(user);
  const managerUser = ['manager', 'senior-manager', 'hr'].includes(user?.role);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await axios.get(buildApiUrl('/elearning'), {
        withCredentials: true
      });
      setMaterials(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch E-Learning materials:', error);
      toast.error('Failed to load E-Learning materials');
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadForm.file || !uploadForm.title) {
      toast.error('Please provide a title and select a file');
      return;
    }

    const allowedExtensions = ['.pdf'];
    const fileName = uploadForm.file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!isValidExtension) {
      toast.error('Invalid file type. Only PDF files are allowed for E-Learning materials.');
      return;
    }
    if (uploadForm.file.size > 15 * 1024 * 1024) {
      toast.error('File is too large. Max size is 15MB.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('title', uploadForm.title);
      if (uploadForm.description) {
        formData.append('description', uploadForm.description);
      }

      const token = localStorage.getItem('auth_token');

      await axios.post(
        buildApiUrl('/elearning/upload'),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token && { Authorization: `Bearer ${token}` })
          },
          withCredentials: true
        }
      );

      toast.success('E-Learning material uploaded successfully');
      setShowUploadModal(false);
      setUploadForm({ file: null, title: '', description: '' });
      fetchMaterials();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload material');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this material?')) {
      return;
    }

    try {
      await axios.delete(buildApiUrl(`/elearning/${materialId}`), {
        withCredentials: true
      });
      toast.success('Material deleted successfully');
      fetchMaterials();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete material');
    }
  };

  const handleMarkComplete = async (materialId) => {
    if (!window.confirm('Mark this course as completed? This cannot be undone.')) return;
    try {
      setCompletingId(materialId);
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(
        buildApiUrl('/elearning/complete'),
        { materialId, employeeId: user?.employeeHubId || user?.id, completedDate: new Date().toISOString() },
        { withCredentials: true, headers: { ...(token && { Authorization: `Bearer ${token}` }) } }
      );
      if (response.data.success) {
        toast.success('Course marked as completed!');
        fetchMaterials();
      }
    } catch (error) {
      if (error.response?.status === 409) {
        toast.warning('You have already completed this course');
      } else {
        toast.error(error.response?.data?.message || 'Failed to mark course as complete');
      }
    } finally {
      setCompletingId(null);
    }
  };

  const handleDownload = (material) => {
    const download = async () => {
      try {
        setDownloadingId(material._id);
        const url = buildApiUrl(`/elearning/view/${material._id}`);
        const token = localStorage.getItem('auth_token');
        const res = await axios.get(url, {
          responseType: 'blob',
          withCredentials: true,
          headers: {
            ...(token && { Authorization: `Bearer ${token}` })
          }
        });

        const blob = new Blob([res.data], { type: material.mimeType || 'application/octet-stream' });
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;

        const rawName = material?.name || 'material';
        const fileName = material?.mimeType?.includes('pdf') && !rawName.toLowerCase().endsWith('.pdf')
          ? `${rawName}.pdf`
          : rawName;

        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('Download error:', error);
        toast.error('Failed to download material');
      } finally {
        setDownloadingId(null);
      }
    };

    download();
  };

  const openPdfViewer = (material) => {
    setViewerMaterial(material);
    setViewerOpen(true);
  };

  const closePdfViewer = () => {
    setViewerOpen(false);
    setViewerMaterial(null);
  };

  const handleViewCompletions = async (material) => {
    setSelectedMaterialForCompletions(material);
    setShowCompletionsModal(true);
    await fetchCompletions(material._id);
  };

  const fetchCompletions = async (materialId) => {
    try {
      setCompletionsLoading(true);
      const token = localStorage.getItem('auth_token');
      const completionsPath = managerUser
        ? `/elearning/team-completions/${materialId}`
        : `/elearning/completions/${materialId}`;
      const response = await axios.get(
        buildApiUrl(completionsPath),
        {
          withCredentials: true,
          headers: {
            ...(token && { Authorization: `Bearer ${token}` })
          }
        }
      );

      if (response.data.success) {
        const rows = response.data.data || [];
        setCompletions(
          managerUser
            ? rows
            : rows.map((row) => ({
                ...row,
                completed: true
              }))
        );
      }
    } catch (error) {
      console.error('Fetch completions error:', error);
      toast.error('Failed to load completion data');
      setCompletions([]);
    } finally {
      setCompletionsLoading(false);
    }
  };

  const exportCompletionsCSV = () => {
    if (!completions || completions.length === 0) {
      toast.warning('No completions to export');
      return;
    }

    const csvHeaders = ['Employee ID', 'Name', 'Department', 'Status', 'Completed Date'];
    const csvRows = completions.map(comp => [
      comp.employeeId || 'N/A',
      comp.employeeName || 'Unknown',
      comp.department || 'N/A',
      comp.completed ? 'Completed' : 'Not completed',
      comp.completedDate ? new Date(comp.completedDate).toLocaleDateString('en-GB') : '-'
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedMaterialForCompletions?.name || 'material'}-completions.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const filteredCompletions = completions.filter(comp =>
    comp.employeeName?.toLowerCase().includes(completionsSearchTerm.toLowerCase()) ||
    comp.employeeId?.toLowerCase().includes(completionsSearchTerm.toLowerCase())
  );

  const getFileType = (mimeType) => {
    if (mimeType?.includes('pdf')) return 'PDF';
    if (mimeType?.includes('presentation')) return 'PPTX';
    if (mimeType?.includes('powerpoint')) return 'PPT';
    if (mimeType?.includes('wordprocessingml')) return 'DOCX';
    if (mimeType?.includes('msword')) return 'DOC';
    return 'FILE';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="loading-page">
          <div className="spinner"></div>
          <p className="loading-text">Loading E-Learning materials…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="el-root">
        <div className="el-shell">

          {/* ── Page Header ── */}
          <div className="page-header anim-fade-up">
            <div className="header-block">
              <div className="header-icon-wrap">
                <svg style={{ width: 18, height: 18, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="header-eyebrow">Learn & Develop</p>
                <h1 className="header-title">E-Learning Materials</h1>
                <p className="header-subtitle">
                  {adminUser ? 'Upload and manage training materials.' : 'Access training and learning resources.'}
                </p>
              </div>
            </div>

            {adminUser && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn btn-primary"
                type="button"
              >
                <Upload style={{ width: 14, height: 14 }} />
                Upload Material
              </button>
            )}
          </div>

          {/* ── Materials grid / Empty state ── */}
          {materials.length === 0 ? (
            <div className="empty-state anim-fade-up delay-100">
              <div className="empty-icon-wrap">
                <FileText style={{ width: 28, height: 28 }} />
              </div>
              <h3 className="empty-title">No materials available</h3>
              <p className="empty-text">
                {adminUser ? 'Upload your first E-Learning material to get started.' : 'Check back later for new materials.'}
              </p>
            </div>
          ) : (
            <div className="materials-grid anim-fade-up delay-100">
              {materials.map((material) => {
                const total = material.totalEmployees || 0;
                const done = material.completedCount || 0;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const isCompleting = completingId === material._id;

                return (
                  <div key={material._id} className="material-card">
                    {/* Card head: icon + type pill */}
                    <div className="material-card-head">
                      <div className="material-icon-tile">
                        <FileText style={{ width: 22, height: 22 }} strokeWidth={1.6} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0 }}>
                        <span className="material-type-pill">{getFileType(material.mimeType)}</span>
                        {material.completed && !adminUser && !managerUser && (
                          <span className="material-completed-tag">
                            <svg style={{ width: 10, height: 10 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            DONE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="material-title">{material.name}</h3>

                    {/* Description */}
                    {material.description && (
                      <p className="material-desc">{material.description}</p>
                    )}

                    {/* Meta row */}
                    <div className="material-meta-row">
                      <span>{formatFileSize(material.fileSize)}</span>
                      <span className="material-meta-bullet">·</span>
                      <span>{formatDateDDMMYY(material.createdAt)}</span>
                    </div>

                    {/* Uploader */}
                    {material.uploadedBy && (
                      <p className="material-uploader">
                        Uploaded by <strong>{material.uploadedBy.firstName} {material.uploadedBy.lastName}</strong>
                      </p>
                    )}

                    {/* Completion stats (admin/manager) */}
                    {(adminUser || managerUser) && (
                      <div className="completion-block">
                        <div className="completion-stat-row">
                          <span className="completion-stat-text">
                            {adminUser
                              ? `${done} of ${total} employees completed`
                              : 'View completion status for your team'}
                          </span>
                          {adminUser && total > 0 && (
                            <span className="completion-percent">{pct}%</span>
                          )}
                        </div>
                        {adminUser && (
                          <div className="completion-bar-track">
                            <div
                              className="completion-bar-fill"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        )}
                        <button
                          onClick={() => handleViewCompletions(material)}
                          className="btn btn-secondary btn-xs"
                          style={{ width: '100%' }}
                          type="button"
                        >
                          {adminUser ? 'View Completions' : 'View Team Status'}
                        </button>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="material-actions">
                      <button
                        onClick={() => openPdfViewer(material)}
                        className="btn btn-primary btn-view"
                        type="button"
                        title="View material"
                      >
                        <Eye style={{ width: 14, height: 14 }} />
                        View
                      </button>

                      {!adminUser && !managerUser && (
                        material.completed ? (
                          <button
                            disabled
                            className="btn btn-secondary btn-complete"
                            type="button"
                            title="Already completed"
                          >
                            <svg style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Done
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkComplete(material._id)}
                            disabled={isCompleting}
                            className="btn btn-success btn-complete"
                            type="button"
                            title="Mark as complete"
                          >
                            {isCompleting ? (
                              <>
                                <div className="upload-spinner"></div>
                                <span>Saving…</span>
                              </>
                            ) : (
                              <>
                                <svg style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Complete
                              </>
                            )}
                          </button>
                        )
                      )}

                      {adminUser && (
                        <button
                          onClick={() => handleDelete(material._id)}
                          className="btn btn-soft-danger btn-icon"
                          type="button"
                          title="Delete material"
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
           UPLOAD MODAL
      ══════════════════════════════════════ */}
      {showUploadModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUploadModal(false);
              setUploadForm({ file: null, title: '', description: '' });
            }
          }}
        >
          <div className="modal-box modal-sm">
            <div className="modal-header">
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="modal-eyebrow">Add Resource</p>
                <h2 className="modal-title">Upload E-Learning Material</h2>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm({ file: null, title: '', description: '' });
                }}
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
              <div className="form-field">
                <label className="field-label">
                  Title <span className="field-required">*</span>
                </label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="text-input"
                  placeholder="Enter material title"
                />
              </div>

              <div className="form-field">
                <label className="field-label">Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  rows={3}
                  className="textarea-input"
                  placeholder="Optional description…"
                />
              </div>

              <div className="form-field">
                <label className="field-label">
                  File <span className="field-required">*</span>
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                  accept=".pdf"
                  className="file-input"
                />
                <p className="field-hint">PDF only · Max 15 MB</p>
                {uploadForm.file && (
                  <div className="selected-file-note">
                    <FileText style={{ width: 13, height: 13, flexShrink: 0 }} />
                    <span>
                      <strong>{uploadForm.file.name}</strong>
                      {' · '}
                      {formatFileSize(uploadForm.file.size)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm({ file: null, title: '', description: '' });
                }}
                className="btn btn-secondary"
                disabled={uploading}
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={uploading || !uploadForm.file || !uploadForm.title}
                className="btn btn-primary"
                type="button"
              >
                {uploading ? (
                  <>
                    <div className="upload-spinner"></div>
                    <span>Uploading…</span>
                  </>
                ) : (
                  <>
                    <Upload style={{ width: 13, height: 13 }} />
                    <span>Upload</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
           COMPLETIONS MODAL
      ══════════════════════════════════════ */}
      {showCompletionsModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCompletionsModal(false);
              setSelectedMaterialForCompletions(null);
              setCompletions([]);
              setCompletionsSearchTerm('');
            }
          }}
        >
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="modal-eyebrow">Completion Records</p>
                <h2 className="modal-title">Course Completions</h2>
                <p className="modal-subtitle">{selectedMaterialForCompletions?.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowCompletionsModal(false);
                  setSelectedMaterialForCompletions(null);
                  setCompletions([]);
                  setCompletionsSearchTerm('');
                }}
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
              <div className="completions-summary" style={{ marginTop: 0, marginBottom: '0.85rem' }}>
                <p className="completions-summary-text">
                  {managerUser ? (
                    <>
                      <strong>{completions.filter((c) => c.completed).length}</strong>
                      of <strong>{completions.length}</strong>
                      {' '}team members completed
                    </>
                  ) : (
                    <>
                      <strong>{completions.length}</strong>
                      completion{completions.length !== 1 ? 's' : ''} recorded
                    </>
                  )}
                </p>
                <button
                  onClick={exportCompletionsCSV}
                  disabled={completions.length === 0}
                  className="btn btn-success btn-xs"
                  type="button"
                >
                  <Download style={{ width: 12, height: 12 }} />
                  Export CSV
                </button>
              </div>

              <div className="search-wrap">
                <span className="search-icon">
                  <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search by employee name or ID…"
                  value={completionsSearchTerm}
                  onChange={(e) => setCompletionsSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              {completionsLoading ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto 0.85rem' }}></div>
                  <p className="loading-text">Loading completions…</p>
                </div>
              ) : filteredCompletions.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                  <div className="empty-icon-wrap">
                    <FileText style={{ width: 24, height: 24 }} />
                  </div>
                  <h3 className="empty-title" style={{ fontSize: '1.15rem' }}>
                    {completionsSearchTerm ? 'No matching records' : (managerUser ? 'No team completions yet' : 'No completions yet')}
                  </h3>
                  <p className="empty-text">
                    {completionsSearchTerm
                      ? 'Try a different search term.'
                      : (managerUser ? 'No team members have completed this material yet.' : 'No employees have completed this material yet.')}
                  </p>
                </div>
              ) : (
                <div className="completions-table-wrap">
                  <div className="completions-table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="col-empid">Employee ID</th>
                          <th>Name</th>
                          <th className="col-dept">Department</th>
                          <th>Status</th>
                          <th className="col-completed">Completed Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCompletions.map((completion, idx) => {
                          const done = Boolean(completion.completed);
                          return (
                            <tr key={idx}>
                              <td className="td-muted col-empid">
                                {completion.employeeId || 'N/A'}
                              </td>
                              <td className="td-strong">
                                {completion.employeeName || 'Unknown'}
                              </td>
                              <td className="td-muted col-dept">
                                {completion.department || 'N/A'}
                              </td>
                              <td>
                                <span className={`completion-pill ${done ? 'is-done' : ''}`}>
                                  <span className="completion-pill-dot"></span>
                                  {done ? 'Completed' : 'Not completed'}
                                </span>
                              </td>
                              <td className="td-muted col-completed">
                                {completion.completedDate ? new Date(completion.completedDate).toLocaleDateString('en-GB') : '-'}
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
          </div>
        </div>
      )}

      {/* Document Viewer (passthrough) */}
      {viewerOpen && viewerMaterial && (
        <DocumentViewer
          document={viewerMaterial}
          onClose={closePdfViewer}
          onDownload={() => handleDownload(viewerMaterial)}
        />
      )}
    </>
  );
};

export default ELearning;