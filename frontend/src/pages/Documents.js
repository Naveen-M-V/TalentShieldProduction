import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Folder,
  ChevronRight,
  Calendar,
  User,
  FileText,
  Download,
  Filter,
  MoreVertical,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Eye
} from 'lucide-react';
import axios from 'axios';
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
import { useAlert } from '../components/AlertNotification';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import CreateFolderModal from '../components/DocumentManagement/CreateFolderModal';
import DocumentViewer from '../components/DocumentManagement/DocumentViewer';
import { buildApiUrl } from '../utils/apiConfig';
import { useAuth } from '../context/AuthContext';
import { ADMIN_ROLES, MANAGER_ROLES } from '../constants/roles';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .doc-root {
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
  .doc-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
    height: 600px;
  }
  .doc-shell {
    position: relative; z-index: 1;
    max-width: 100%;
    margin: 0 auto;
    min-width: 0;
  }

  /* Embedded mode wraps in surface card directly */
  .doc-embed {
    font-family: 'DM Sans', sans-serif;
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    padding: 1.1rem 1.2rem;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
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

  /* Section heading inside the page (e.g. "All Folders") */
  .section-heading {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.15rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0 0 0.85rem;
    display: flex; align-items: center; gap: 0.5rem;
  }
  .section-heading::before {
    content: '';
    width: 4px; height: 16px;
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

  /* ══════════════════════════════════════
     SEARCH + ACTIONS BAR
  ══════════════════════════════════════ */
  .toolbar-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 0.95rem 1rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    display: flex; flex-direction: column;
    gap: 0.7rem;
  }
  .search-form { width: 100%; }
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
    padding: 0.55rem 3.2rem 0.55rem 2.2rem;
    border: 1.5px solid #d4ddd6;
    border-radius: 9px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8rem; color: #2f3e46;
    background: #fff;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    min-height: 38px;
  }
  .search-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .search-submit {
    position: absolute; right: 5px; top: 50%;
    transform: translateY(-50%);
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    color: #cad2c5;
    border: none; cursor: pointer;
    width: 28px; height: 28px;
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 2px 6px rgba(53,79,82,0.18);
    -webkit-tap-highlight-color: transparent;
  }
  .search-submit:hover {
    transform: translateY(-50%) scale(1.05);
    box-shadow: 0 3px 10px rgba(53,79,82,0.26);
  }

  .toolbar-actions {
    display: flex; flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }
  @media (min-width: 768px) {
    .toolbar-actions {
      flex-direction: row; align-items: center; flex-wrap: wrap;
    }
    .toolbar-actions > * { flex-shrink: 0; }
  }
  .toolbar-spacer { flex: 1 1 auto; }

  /* ══════════════════════════════════════
     TABLE / FOLDERS LIST
  ══════════════════════════════════════ */
  .folders-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    overflow: visible;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    width: 100%;
    max-width: 100%;
  }
  .folders-thead {
    background: #fafbfa;
    border-bottom: 1px solid #eaefeb;
    border-radius: 12px 12px 0 0;
  }
  .folders-thead-grid {
    display: grid;
    grid-template-columns: minmax(0, 5fr) 1.5fr 1.5fr 2fr;
    gap: 0.85rem;
    padding: 0.7rem 1rem;
    font-size: 0.58rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #84a98c;
  }

  /* Group label row (My Documents / Shared with me) */
  .group-label {
    display: flex; align-items: center; gap: 0.45rem;
    padding: 0.55rem 1rem;
    background: linear-gradient(135deg, #f0f5f2, #eaf2ec);
    border-bottom: 1px solid #eaefeb;
    border-top: 1px solid #eaefeb;
  }
  .group-label:first-child { border-top: none; }
  .group-label-text {
    font-size: 0.6rem; font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #354f52;
  }
  .group-label-count {
    font-size: 0.62rem;
    color: #7a8e84;
    font-weight: 500;
  }
  .group-label.is-shared {
    background: linear-gradient(135deg, rgba(111,140,152,0.10), rgba(111,140,152,0.05));
  }
  .group-label.is-shared .group-label-text { color: #4d6975; }

  /* Folder row (desktop) */
  .folder-row {
    display: grid;
    grid-template-columns: minmax(0, 5fr) 1.5fr 1.5fr 2fr;
    gap: 0.85rem;
    padding: 0.7rem 1rem;
    align-items: center;
    border-bottom: 1px solid #eaefeb;
    cursor: pointer;
    transition: background 0.15s;
    position: relative;
  }
  .folder-row:last-child { border-bottom: none; }
  .folder-row:hover { background: #fafbfa; }
  .folder-row:hover .folder-icon-tile { background: rgba(82,121,111,0.16); border-color: rgba(82,121,111,0.28); }
  .folder-row:hover .folder-row-chevron { opacity: 1; }

  .folder-name-cell {
    display: flex; align-items: center; gap: 0.7rem;
    min-width: 0;
  }
  .folder-icon-tile {
    width: 34px; height: 34px;
    border-radius: 8px;
    background: rgba(82,121,111,0.10);
    border: 1px solid rgba(82,121,111,0.18);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
    color: #52796f;
  }
  .folder-name-text {
    font-size: 0.82rem; font-weight: 500;
    color: #2f3e46;
    margin: 0 0 0.1rem;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .folder-name-meta {
    font-size: 0.66rem; color: #7a8e84; font-weight: 400;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .folder-meta-bullet { color: #b6c0b9; margin: 0 0.3rem; }
  .folder-owner-tag {
    display: inline-block;
    margin-left: 0.4rem;
    color: #52796f;
    font-weight: 500;
  }

  .folder-cell-text {
    font-size: 0.74rem; color: #52796f; font-weight: 400;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .folder-end-cell {
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.4rem;
    min-width: 0;
  }
  .folder-end-actions {
    display: flex; align-items: center; gap: 0.3rem;
    position: relative;
  }
  .icon-btn {
    background: none; border: none; cursor: pointer;
    width: 28px; height: 28px;
    border-radius: 6px;
    display: inline-flex; align-items: center; justify-content: center;
    color: #84a98c;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .icon-btn:hover { color: #2f3e46; background: #f0f5f2; }
  .folder-row-chevron {
    color: #b6c0b9;
    opacity: 0;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }

  /* Action menu popover */
  .action-menu {
    position: absolute;
    right: 0;
    width: 168px;
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 10px;
    box-shadow: 0 12px 28px rgba(47,62,70,0.14);
    overflow: hidden;
    z-index: 30;
  }
  .action-menu.is-up { bottom: 100%; margin-bottom: 0.4rem; }
  .action-menu.is-down { top: 100%; margin-top: 0.4rem; }
  .action-item {
    width: 100%;
    background: none;
    border: none;
    padding: 0.55rem 0.85rem;
    display: flex; align-items: center; gap: 0.55rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.76rem;
    color: #354f52;
    cursor: pointer;
    transition: background 0.15s;
    -webkit-tap-highlight-color: transparent;
    text-align: left;
  }
  .action-item:hover { background: #f0f5f2; }
  .action-item.is-danger { color: #b85c50; }
  .action-item.is-danger:hover { background: rgba(192,117,106,0.08); }
  .action-item + .action-item { border-top: 1px solid #f0f0ec; }

  /* Mobile cards */
  .mobile-cards-wrap { display: flex; flex-direction: column; }
  .mobile-card {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid #eaefeb;
    cursor: pointer;
    transition: background 0.15s;
    -webkit-tap-highlight-color: transparent;
    position: relative;
  }
  .mobile-card:hover { background: #fafbfa; }
  .mobile-card-row {
    display: flex; align-items: flex-start; gap: 0.7rem;
  }
  .mobile-card-meta {
    font-size: 0.68rem; color: #7a8e84;
    margin-top: 0.15rem;
  }
  .mobile-card-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.45rem 0.85rem;
    margin-top: 0.55rem;
    font-size: 0.68rem;
  }
  .mobile-card-grid-key {
    font-size: 0.55rem; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #84a98c;
    margin: 0 0 0.1rem;
  }
  .mobile-card-grid-val {
    font-size: 0.74rem; color: #354f52; font-weight: 500;
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
    color: #84a98c;
  }
  .empty-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.25rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0 0 0.4rem;
  }
  .empty-text {
    font-size: 0.8rem; color: #7a8e84; font-weight: 300;
    margin: 0;
    max-width: 420px;
    margin-left: auto; margin-right: auto;
  }

  /* ══════════════════════════════════════
     SPINNER
  ══════════════════════════════════════ */
  .spinner-wrap {
    display: flex; align-items: center; justify-content: center;
    flex-direction: column;
    padding: 3rem 1rem;
    gap: 0.6rem;
  }
  .spinner {
    width: 30px; height: 30px;
    border: 3px solid rgba(82,121,111,0.18);
    border-top-color: #52796f;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  .spinner-text {
    font-size: 0.74rem; color: #7a8e84; font-weight: 400;
  }

  /* ══════════════════════════════════════
     PAGINATION
  ══════════════════════════════════════ */
  .pagination-row {
    display: flex; flex-direction: column; align-items: center;
    justify-content: space-between;
    gap: 0.7rem;
    padding: 0.85rem 1rem;
    border-top: 1px solid #eaefeb;
  }
  @media (min-width: 640px) {
    .pagination-row { flex-direction: row; }
  }
  .pagination-info {
    font-size: 0.72rem; color: #7a8e84; font-weight: 400;
    text-align: center;
  }
  .pagination-controls {
    display: flex; align-items: center; gap: 0.4rem;
  }
  .page-btn {
    padding: 0.35rem 0.7rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem; font-weight: 500;
    background: #fff; color: #354f52;
    border: 1px solid #d4ddd6;
    border-radius: 7px;
    cursor: pointer;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
    min-height: 30px;
  }
  .page-btn:hover:not(:disabled) {
    background: #f0f5f2; border-color: #84a98c;
  }
  .page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .page-counter {
    padding: 0.35rem 0.7rem;
    font-size: 0.72rem; color: #354f52;
    font-weight: 500;
  }

  /* ══════════════════════════════════════
     EMBEDDED FOLDER VIEW
  ══════════════════════════════════════ */
  .embed-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 0.85rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .embed-header-left {
    display: flex; align-items: center; gap: 0.65rem;
    min-width: 0; flex: 1;
  }
  .embed-back-btn {
    padding: 0.4rem 0.8rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem; font-weight: 500;
    background: #fff;
    color: #354f52;
    border: 1px solid #d4ddd6;
    border-radius: 7px;
    cursor: pointer;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
    flex-shrink: 0;
  }
  .embed-back-btn:hover { background: #f0f5f2; border-color: #84a98c; }
  .embed-folder-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.15rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 100%;
  }
  .embed-folder-meta {
    font-size: 0.68rem; color: #7a8e84;
    margin: 0.15rem 0 0;
  }

  .doc-row {
    padding: 0.65rem 0;
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.6rem;
    border-bottom: 1px solid #eaefeb;
  }
  .doc-row:last-child { border-bottom: none; }
  .doc-row-left {
    display: flex; align-items: center; gap: 0.7rem;
    flex: 1; min-width: 0;
  }
  .doc-icon-tile {
    width: 32px; height: 32px;
    border-radius: 7px;
    background: rgba(132,169,140,0.14);
    border: 1px solid rgba(132,169,140,0.22);
    display: flex; align-items: center; justify-content: center;
    color: #52796f;
    flex-shrink: 0;
  }
  .doc-name {
    font-size: 0.8rem; font-weight: 500; color: #2f3e46;
    margin: 0 0 0.1rem;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .doc-meta {
    font-size: 0.68rem; color: #7a8e84;
  }
  .doc-row-actions {
    display: flex; align-items: center; gap: 0.25rem;
    flex-shrink: 0;
  }
  .doc-action-btn {
    width: 30px; height: 30px;
    border-radius: 7px;
    background: none; border: none;
    cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    color: #84a98c;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .doc-action-btn.is-view { color: #52796f; }
  .doc-action-btn.is-view:hover { background: rgba(82,121,111,0.12); color: #354f52; }
  .doc-action-btn.is-download { color: #6f8c98; }
  .doc-action-btn.is-download:hover { background: rgba(111,140,152,0.12); color: #4d6975; }
  .doc-action-btn.is-delete { color: #b85c50; }
  .doc-action-btn.is-delete:hover { background: rgba(192,117,106,0.12); color: #7a3028; }

  /* Embedded mode: simple folder list */
  .embed-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .embed-list-item {
    width: 100%;
    background: #fff;
    border: 1.5px solid #eaefeb;
    border-radius: 9px;
    padding: 0.6rem 0.75rem;
    display: flex; align-items: center; justify-content: space-between;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
  }
  .embed-list-item:hover {
    background: #fafbfa;
    border-color: #84a98c;
  }
  .embed-list-item-left {
    display: flex; align-items: center; gap: 0.6rem;
    min-width: 0; flex: 1;
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
    font-size: 1.3rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0.15rem 0 0;
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
  .form-field { margin-bottom: 0.95rem; }
  .form-field:last-child { margin-bottom: 0; }
  .field-label {
    display: block;
    font-size: 0.62rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #52796f;
    margin-bottom: 0.4rem;
  }
  .text-input, .file-input, .textarea-input, .native-select {
    width: 100%;
    padding: 0.55rem 0.85rem;
    border: 1.5px solid #d4ddd6;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8rem; color: #2f3e46;
    background: #fff;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    min-height: 38px;
  }
  .text-input:focus, .textarea-input:focus, .native-select:focus, .file-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .textarea-input { min-height: 70px; resize: vertical; }
  .file-input {
    padding: 0;
    cursor: pointer;
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
  .native-select {
    padding-right: 2rem;
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2384a98c'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 16px;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
  }

  .upload-spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(202,210,197,0.4);
    border-top-color: #cad2c5;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* ══════════════════════════════════════
     ALERT DIALOG (delete confirm)
  ══════════════════════════════════════ */
  .alert-confirm-btn {
    background: linear-gradient(135deg, #a35446 0%, #b85c50 100%) !important;
    color: #fff !important;
    border: none !important;
    box-shadow: 0 3px 10px rgba(163,84,70,0.22) !important;
    font-family: 'DM Sans', sans-serif !important;
    font-weight: 500 !important;
    letter-spacing: 0.04em !important;
  }
  .alert-confirm-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 5px 14px rgba(163,84,70,0.28) !important;
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1199px) {
    .col-size { display: none; }
    .folders-thead-grid { grid-template-columns: minmax(0, 5fr) 1.5fr 2fr; }
    .folder-row { grid-template-columns: minmax(0, 5fr) 1.5fr 2fr; }
  }
  @media (max-width: 939px) {
    .col-type { display: none; }
    .folders-thead-grid { grid-template-columns: minmax(0, 5fr) 2fr; }
    .folder-row { grid-template-columns: minmax(0, 5fr) 2fr; }
  }
  @media (max-width: 639px) {
    .desktop-table { display: none; }
  }
  @media (min-width: 640px) {
    .mobile-cards-wrap { display: none; }
  }

  @media (max-width: 1023px) {
    .doc-root { padding: 1.25rem; }
    .header-title { font-size: 1.45rem; }
  }
  @media (max-width: 767px) {
    .doc-root { padding: 0.85rem; }
    .header-title { font-size: 1.3rem; }
    .header-icon-wrap { width: 34px; height: 34px; border-radius: 9px; }
    .toolbar-card { padding: 0.85rem; }
    .modal-header, .modal-body { padding-left: 1.1rem; padding-right: 1.1rem; }
    .modal-footer { padding-left: 1.1rem; padding-right: 1.1rem; }
  }
  @media (max-width: 479px) {
    .doc-root { padding: 0.65rem; }
    .header-title { font-size: 1.2rem; }
    .modal-overlay { padding: 0; align-items: flex-end; }
    .modal-box { border-radius: 18px 18px 0 0; max-height: 92vh; }
    .text-input, .textarea-input, .native-select, .file-input, .search-input { font-size: 16px; }
  }
`;

const Documents = ({ embedded = false, employeeContextId = null, previewAsEmployee = false, isManagerContext = false }) => {
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useAlert();
  const { user } = useAuth();
  const currentRole = String(user?.role || '').toLowerCase();
  const isAdminLike = ADMIN_ROLES.includes(currentRole);
  const isManagerLike = MANAGER_ROLES.includes(currentRole);
  const canManageFolders = !embedded && (isAdminLike || isManagerLike);
  const currentEmployeeHubId = user?.employeeHubId || user?.employeeId || user?.id || null;
  const myDocumentsEmployeeId = embedded ? employeeContextId : currentEmployeeHubId;
  const [folders, setFolders] = useState([]);
  const [myDocumentsFolder, setMyDocumentsFolder] = useState(null);
  const [myDocumentsDocuments, setMyDocumentsDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [folderLoading, setFolderLoading] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedFolderPermissions, setSelectedFolderPermissions] = useState({ canEdit: false, canDelete: false });
  const [folderContents, setFolderContents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showFolderMenu, setShowFolderMenu] = useState(null);
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [deleteFolderOpen, setDeleteFolderOpen] = useState(false);
  const [activeFolder, setActiveFolder] = useState(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');

  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ file: null, category: 'other', description: '', folderId: null });

  const getFolderOwnerEmployeeId = (folder) => folder?.createdByEmployeeId || folder?.ownerInfo?._id || folder?.ownerInfo?.id || null;
  const isMyDocumentsFolder = (folder) => String(folder?.name || '').trim() === 'My Documents';
  const isOwnMyDocumentsFolder = (folder) => {
    if (!folder || !myDocumentsEmployeeId) return false;
    const ownerEmployeeId = getFolderOwnerEmployeeId(folder);
    return isMyDocumentsFolder(folder) && ownerEmployeeId && String(ownerEmployeeId) === String(myDocumentsEmployeeId);
  };

  const fetchMyDocumentsContext = async (targetEmployeeId) => {
    if (!targetEmployeeId) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(
        buildApiUrl(`/documentManagement/employees/${targetEmployeeId}/my-documents`),
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          withCredentials: true
        }
      );

      const folder = response.data?.folder || null;
      const documents = Array.isArray(response.data?.documents) ? response.data.documents : [];
      const normalizedFolder = folder
        ? {
            ...folder,
            documentCount: documents.length
          }
        : null;

      setMyDocumentsFolder(normalizedFolder);
      setMyDocumentsDocuments(documents);
    } catch (error) {
      console.error('Error loading My Documents context:', error);
    }
  };

  useEffect(() => {
    fetchFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, sortBy, sortOrder]);

  useEffect(() => {
    if (embedded && employeeContextId) {
      fetchMyDocumentsContext(employeeContextId);
      return;
    }

    if (!embedded && !isAdminLike && myDocumentsEmployeeId) {
      fetchMyDocumentsContext(myDocumentsEmployeeId);
      return;
    }

    setMyDocumentsFolder(null);
    setMyDocumentsDocuments([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, employeeContextId, isAdminLike, myDocumentsEmployeeId]);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      const requestParams = {
        page: pagination.page,
        limit: pagination.limit,
        sort: sortBy,
        order: sortOrder
      };

      if (previewAsEmployee && employeeContextId) {
        requestParams.asEmployeeId = employeeContextId;
      }

      const response = await axios.get(buildApiUrl('/documentManagement/folders'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: requestParams
      });

      const fetchedFolders = response.data.folders || [];
      setFolders(fetchedFolders);
      setPagination(prev => ({ ...prev, total: response.data.total || 0 }));
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folderId) => {
    if (!folderId) {
      console.error('No folder ID provided to handleFolderClick');
      showError('Cannot open folder: Invalid folder ID');
      return;
    }

    if (embedded) {
      setSelectedFolderId(folderId);
      return;
    }

    const targetPath = isManagerContext ? `/manager/documents/${folderId}` : `/documents/${folderId}`;
    navigate(targetPath);
  };

  const fetchFolderContents = async (folderId) => {
    try {
      setFolderLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(buildApiUrl(`/documentManagement/folders/${folderId}`), {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        params: previewAsEmployee && employeeContextId ? { asEmployeeId: employeeContextId } : undefined,
        withCredentials: true
      });

      setSelectedFolder(response.data.folder || null);
      setSelectedFolderPermissions(response.data.folderPermissions || { canEdit: false, canDelete: false });
      setFolderContents(Array.isArray(response.data.contents) ? response.data.contents : []);
    } catch (error) {
      console.error('Error fetching folder contents:', error);
      showError('Failed to open folder');
      setSelectedFolder(null);
      setSelectedFolderPermissions({ canEdit: false, canDelete: false });
      setFolderContents([]);
    } finally {
      setFolderLoading(false);
    }
  };

  useEffect(() => {
    if (!embedded) return;
    if (!selectedFolderId) return;
    fetchFolderContents(selectedFolderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, selectedFolderId]);

  const handleRenameFolder = async (folder) => {
    setShowFolderMenu(null);
    setActiveFolder(folder);
    setRenameFolderOpen(true);
  };

  const handleDeleteFolder = async (folder) => {
    setShowFolderMenu(null);
    setActiveFolder(folder);
    setDeleteFolderOpen(true);
  };

  const submitRenameFolder = async () => {
    return null;
  };

  const handleFolderUpdated = async (folderId, payload) => {
    if (!folderId) return null;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.put(
        buildApiUrl(`/documentManagement/folders/${folderId}`),
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setRenameFolderOpen(false);
      setActiveFolder(null);
      showSuccess('Folder updated successfully');
      fetchFolders();
      return response.data;
    } catch (error) {
      console.error('Error updating folder:', error);
      showError(error.response?.data?.message || 'Failed to update folder');
      throw error;
    }
  };

  const confirmDeleteFolder = async () => {
    if (!activeFolder?._id) return;
    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(buildApiUrl(`/documentManagement/folders/${activeFolder._id}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setDeleteFolderOpen(false);
      setActiveFolder(null);
      showSuccess('Folder deleted successfully');
      fetchFolders();
    } catch (error) {
      console.error('Error deleting folder:', error);
      showError('Failed to delete folder');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchFolders();
  };

  const handleBackFromFolder = () => {
    if (embedded && employeeContextId) {
      setSelectedFolderId(null);
      setSelectedFolder(null);
      setSelectedFolderPermissions({ canEdit: false, canDelete: false });
      setFolderContents([]);
      fetchMyDocumentsContext(employeeContextId);
      return;
    }
    setSelectedFolderId(null);
    setSelectedFolder(null);
    setSelectedFolderPermissions({ canEdit: false, canDelete: false });
    setFolderContents([]);
  };

  const handleDeleteDocument = async (documentId) => {
    if (!documentId) return;
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(buildApiUrl(`/documentManagement/documents/${documentId}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        withCredentials: true
      });

      showSuccess('Document deleted successfully');
      if (selectedFolderId) {
        fetchFolderContents(selectedFolderId);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      showError(error.response?.data?.message || 'Failed to delete document');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const myDocumentsSectionFolder = !isAdminLike
    ? (myDocumentsFolder || folders.find((folder) => isOwnMyDocumentsFolder(folder)))
    : null;

  const myDocumentsSectionFolders = myDocumentsSectionFolder ? [myDocumentsSectionFolder] : [];
  const myDocumentsSectionFolderId = myDocumentsSectionFolder?._id ? String(myDocumentsSectionFolder._id) : null;
  const myDocumentsDocumentCount = myDocumentsSectionFolder?.documentCount ?? myDocumentsDocuments.length;

  const categorizedFolders = {
    myDocuments: myDocumentsSectionFolders,
    sharedWithMe: []
  };

  folders.forEach((folder) => {
    if (!folder?._id) {
      return;
    }

    const folderId = String(folder._id);
    const folderName = String(folder?.name || '').trim();
    const ownMyDocuments = !isAdminLike && isOwnMyDocumentsFolder(folder);

    if (myDocumentsSectionFolderId && folderId === myDocumentsSectionFolderId) {
      return;
    }

    if (folderName === 'My Documents') {
      if (isAdminLike) {
        return;
      }

      if (!ownMyDocuments) {
        return;
      }

      return;
    }

    const query = String(searchQuery || '').toLowerCase();
    const name = String(folder?.name || folder?.fileName || '').toLowerCase();

    if (!name.includes(query)) {
      return;
    }

    if (ownMyDocuments || (folder?.isOwnFolder && !folder?.ownerInfo)) {
      categorizedFolders.myDocuments.push(folder);
    } else if (folder?.ownerInfo || (folder?.createdByEmployeeId && folder?.permissions?.viewEmployeeIds?.length > 0)) {
      categorizedFolders.sharedWithMe.push(folder);
    } else {
      categorizedFolders.myDocuments.push(folder);
    }
  });

  const filteredFolders = [...categorizedFolders.myDocuments, ...categorizedFolders.sharedWithMe];

  const canEditFolder = (folder) => Boolean(canManageFolders && (folder?.canEdit ?? true));
  const canDeleteFolder = (folder) => Boolean(canManageFolders && (folder?.canDelete ?? true));
  const hasFolderActions = (folder) => canEditFolder(folder) || canDeleteFolder(folder);

  const handleFolderCreated = () => {
    setShowCreateFolderModal(false);
    fetchFolders();
  };

  const handlePaginationChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: parseInt(newLimit), page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleUploadSubmit = async () => {
    if (!uploadForm.file) {
      showError('Please select a file');
      return;
    }

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.txt'];
    const fileName = uploadForm.file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!isValidExtension) {
      showError('Invalid file type. Only PDF, Word, Excel, PPT, Images and Text files are allowed.');
      return;
    }
    if (uploadForm.file.size > 10 * 1024 * 1024) {
      showError('File is too large. Max size is 10MB.');
      return;
    }

    if (!uploadForm.folderId) {
      showError('Please select a folder');
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('auth_token');

      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('category', uploadForm.category);
      formData.append('folderId', uploadForm.folderId);
      if (employeeContextId) {
        formData.append('ownerId', employeeContextId);
        formData.append('accessControl', JSON.stringify({ visibility: 'employee', allowedUserIds: [] }));
      }
      if (uploadForm.description) {
        formData.append('description', uploadForm.description);
      }

      await axios.post(
        buildApiUrl(`/documentManagement/folders/${uploadForm.folderId}/documents`),
        formData,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          withCredentials: true
        }
      );

      showSuccess('Document uploaded successfully!');
      setShowUploadModal(false);
      setUploadForm({ file: null, category: 'other', description: '', folderId: null });

      if (selectedFolderId) {
        fetchFolderContents(selectedFolderId);
      } else {
        fetchFolders();
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      showError(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = (doc) => {
    setSelectedDocument(doc);
    setShowDocumentViewer(true);
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(
        buildApiUrl(`/documentManagement/documents/${doc._id}/download`),
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` })
          },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.name || doc.fileName || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      showError('Failed to download document');
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const handleEmployeeUploadToFolder = async () => {
    if (!uploadForm.file) {
      showError('Please select a file');
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('auth_token');

      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('category', uploadForm.category);
      if (employeeContextId) {
        formData.append('ownerId', employeeContextId);
        formData.append('accessControl', JSON.stringify({ visibility: 'employee', allowedUserIds: [] }));
      }
      if (uploadForm.description) {
        formData.append('description', uploadForm.description);
      }

      const targetFolderId = selectedFolderId || uploadForm.folderId;

      if (!targetFolderId) {
        showError('Please select a folder first');
        setUploading(false);
        return;
      }

      const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.txt'];
      const fileName = uploadForm.file.name.toLowerCase();
      const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      if (!isValidExtension) {
        showError('Invalid file type. Only PDF, Word, Excel, PPT, Images and Text files are allowed.');
        setUploading(false);
        return;
      }
      if (uploadForm.file.size > 10 * 1024 * 1024) {
        showError('File is too large. Max size is 10MB.');
        setUploading(false);
        return;
      }

      await axios.post(
        buildApiUrl(`/documentManagement/folders/${targetFolderId}/documents`),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          withCredentials: true
        }
      );

      showSuccess('Document uploaded successfully!');
      setShowUploadModal(false);
      setUploadForm({ file: null, category: 'other', description: '', folderId: null });

      if (selectedFolderId) {
        fetchFolderContents(selectedFolderId);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      showError(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  // ── Render: Embedded folder contents view ───────────────────────────────────
  if (embedded && selectedFolderId) {
    return (
      <>
        <style>{styles}</style>
        <div className="doc-embed">
          <div className="embed-header">
            <div className="embed-header-left">
              {!previewAsEmployee && (
                <button
                  type="button"
                  onClick={handleBackFromFolder}
                  className="embed-back-btn"
                >
                  ← Back
                </button>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 className="embed-folder-title">{selectedFolder?.name || 'Folder'}</h2>
                <p className="embed-folder-meta">
                  {folderContents?.length || 0} item{folderContents?.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {(selectedFolderPermissions?.canEdit || isAdminLike) && (
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="btn btn-success"
              >
                <Upload style={{ width: 13, height: 13 }} />
                <span>Upload</span>
              </button>
            )}
          </div>

          {folderLoading ? (
            <div className="spinner-wrap">
              <div className="spinner"></div>
              <p className="spinner-text">Loading folder…</p>
            </div>
          ) : folderContents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <FileText style={{ width: 26, height: 26 }} />
              </div>
              <h3 className="empty-title">No documents yet</h3>
              <p className="empty-text">This folder is currently empty.</p>
            </div>
          ) : (
            <div>
              {folderContents.map((item) => (
                <div key={item._id || item.id} className="doc-row">
                  <div className="doc-row-left">
                    <div className="doc-icon-tile">
                      <FileText style={{ width: 16, height: 16 }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p className="doc-name">{item.name || item.fileName || 'Document'}</p>
                      <p className="doc-meta">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </div>

                  <div className="doc-row-actions">
                    <button
                      type="button"
                      onClick={() => handleViewDocument(item)}
                      className="doc-action-btn is-view"
                      title="View document"
                    >
                      <Eye style={{ width: 14, height: 14 }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadDocument(item)}
                      className="doc-action-btn is-download"
                      title="Download document"
                    >
                      <Download style={{ width: 14, height: 14 }} />
                    </button>
                    {(item?.type === 'document' && (item?.canDelete || isAdminLike)) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(item._id || item.id)}
                        className="doc-action-btn is-delete"
                        title="Delete document"
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload Modal (embedded) */}
          {showUploadModal && (
            <div
              className="modal-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowUploadModal(false);
                  setUploadForm({ file: null, category: 'other', description: '', folderId: null });
                }
              }}
            >
              <div className="modal-box">
                <div className="modal-header">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="modal-eyebrow">Add File</p>
                    <h3 className="modal-title">Upload Document</h3>
                    <p className="modal-subtitle">{selectedFolder?.name || 'Folder'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadForm({ file: null, category: 'other', description: '', folderId: null });
                    }}
                    className="modal-close"
                    aria-label="Close"
                  >
                    <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="modal-body">
                  <div className="form-field">
                    <label className="field-label">Select File *</label>
                    <input
                      type="file"
                      onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                      className="file-input"
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label">Category</label>
                    <select
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                      className="native-select"
                    >
                      <option value="other">Other</option>
                      <option value="contract">Contract</option>
                      <option value="certificate">Certificate</option>
                      <option value="id_proof">ID Proof</option>
                      <option value="visa">Visa</option>
                      <option value="passport">Passport</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="field-label">Description (optional)</label>
                    <textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      className="textarea-input"
                      rows="3"
                      placeholder="Add a description…"
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadForm({ file: null, category: 'other', description: '', folderId: null });
                    }}
                    className="btn btn-secondary"
                    disabled={uploading}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEmployeeUploadToFolder}
                    className="btn btn-primary"
                    disabled={uploading || !uploadForm.file}
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

          {showDocumentViewer && selectedDocument && (
            <DocumentViewer
              document={selectedDocument}
              onClose={() => {
                setShowDocumentViewer(false);
                setSelectedDocument(null);
              }}
              onDownload={handleDownloadDocument}
            />
          )}
        </div>
      </>
    );
  }

  // ── Render: Embedded folder list view ───────────────────────────────────────
  if (embedded && !selectedFolderId) {
    return (
      <>
        <style>{styles}</style>
        <div className="doc-embed">
          <div style={{ marginBottom: '0.85rem' }}>
            <h2 className="embed-folder-title">Documents</h2>
            <p className="embed-folder-meta">Select a folder to view documents</p>
          </div>

          {loading ? (
            <div className="spinner-wrap">
              <div className="spinner"></div>
            </div>
          ) : filteredFolders.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <div className="empty-icon-wrap">
                <Folder style={{ width: 22, height: 22 }} />
              </div>
              <p className="empty-text">No folders available.</p>
            </div>
          ) : (
            <div className="embed-list">
              {filteredFolders.map((folder) => (
                <button
                  key={folder._id}
                  type="button"
                  onClick={() => handleFolderClick(folder._id)}
                  className="embed-list-item"
                >
                  <div className="embed-list-item-left">
                    <div className="folder-icon-tile" style={{ width: 30, height: 30, borderRadius: 7 }}>
                      <Folder style={{ width: 14, height: 14 }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p className="folder-name-text" style={{ fontSize: '0.78rem', marginBottom: 0 }}>{folder.name}</p>
                      <p className="folder-name-meta">
                        {folder.documentCount || 0} document{folder.documentCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight style={{ width: 14, height: 14, color: '#84a98c', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  // ── Render: Standalone full-page view ───────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="doc-root">
        <div className="doc-shell">

          {/* Page Header */}
          <div className="page-header anim-fade-up">
            <div className="header-block">
              <div className="header-icon-wrap">
                <svg style={{ width: 18, height: 18, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="header-eyebrow">File Vault</p>
                <h1 className="header-title">Documents</h1>
                <p className="header-subtitle">Manage your personal documents and folders.</p>
              </div>
            </div>
          </div>

          {/* Section heading */}
          <h2 className="section-heading anim-fade-up delay-100">All Folders</h2>

          {/* Search + actions toolbar */}
          <div className="toolbar-card anim-fade-up delay-100">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-wrap">
                <span className="search-icon">
                  <Search style={{ width: 14, height: 14 }} />
                </span>
                <input
                  type="text"
                  placeholder="Search all folders…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button
                  type="submit"
                  className="search-submit"
                  aria-label="Search"
                >
                  <Search style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </form>

            <div className="toolbar-actions">
              <div style={{ minWidth: 150 }}>
                <Select
                  value={String(sortBy || 'name')}
                  onValueChange={(value) => {
                    setSortBy(value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                >
                  <SelectTrigger style={{ width: '100%' }}>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Sort: Name</SelectItem>
                    <SelectItem value="createdAt">Sort: Created date</SelectItem>
                    <SelectItem value="updatedAt">Sort: Updated date</SelectItem>
                    <SelectItem value="documentCount">Sort: Documents</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div style={{ minWidth: 130 }}>
                <Select
                  value={String(sortOrder || 'asc')}
                  onValueChange={(value) => {
                    setSortOrder(value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                >
                  <SelectTrigger style={{ width: '100%' }}>
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div style={{ minWidth: 140 }}>
                <Select
                  value={String(pagination.limit)}
                  onValueChange={(value) => handlePaginationChange(value)}
                >
                  <SelectTrigger style={{ width: '100%' }}>
                    <SelectValue placeholder="10 per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="toolbar-spacer"></div>

              {canManageFolders && (
                <button
                  onClick={() => setShowCreateFolderModal(true)}
                  className="btn btn-primary"
                  type="button"
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  Create Folder
                </button>
              )}
            </div>
          </div>

          {/* Folders list */}
          <div className="folders-card anim-fade-up delay-200">
            {loading ? (
              <div className="spinner-wrap">
                <div className="spinner"></div>
              </div>
            ) : filteredFolders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon-wrap">
                  <Folder style={{ width: 28, height: 28 }} />
                </div>
                <h3 className="empty-title">No folders found</h3>
                <p className="empty-text">Get started by creating your first folder.</p>
              </div>
            ) : (
              <>
                {/* Desktop table head */}
                <div className="folders-thead desktop-table">
                  <div className="folders-thead-grid">
                    <div>Name</div>
                    <div className="col-type">Type</div>
                    <div className="col-size">Size</div>
                    <div>Date created</div>
                  </div>
                </div>

                {/* Desktop rows (grouped) */}
                <div className="desktop-table">
                  {categorizedFolders.myDocuments.length > 0 && (
                    <>
                      <div className="group-label">
                        <span className="group-label-text">My Documents</span>
                        {myDocumentsDocumentCount > 0 && (
                          <span className="group-label-count">· {myDocumentsDocumentCount} doc{myDocumentsDocumentCount === 1 ? '' : 's'}</span>
                        )}
                      </div>
                      {categorizedFolders.myDocuments.map((folder, index) => (
                        <FolderDesktopRow
                          key={folder._id || `my-${index}`}
                          folder={folder}
                          index={index}
                          totalRows={filteredFolders.length}
                          isAdminLike={isAdminLike}
                          showFolderMenu={showFolderMenu}
                          setShowFolderMenu={setShowFolderMenu}
                          handleFolderClick={handleFolderClick}
                          handleRenameFolder={handleRenameFolder}
                          handleDeleteFolder={handleDeleteFolder}
                          canEditFolder={canEditFolder}
                          canDeleteFolder={canDeleteFolder}
                          hasFolderActions={hasFolderActions}
                          formatFileSize={formatFileSize}
                          formatDate={formatDate}
                        />
                      ))}
                    </>
                  )}
                  {categorizedFolders.sharedWithMe.length > 0 && (
                    <>
                      <div className="group-label is-shared">
                        <span className="group-label-text">Shared with me</span>
                        <span className="group-label-count">· {categorizedFolders.sharedWithMe.length} folder{categorizedFolders.sharedWithMe.length === 1 ? '' : 's'}</span>
                      </div>
                      {categorizedFolders.sharedWithMe.map((folder, index) => {
                        const totalIndex = categorizedFolders.myDocuments.length + index;
                        return (
                          <FolderDesktopRow
                            key={folder._id || `shared-${index}`}
                            folder={folder}
                            index={totalIndex}
                            totalRows={filteredFolders.length}
                            isAdminLike={isAdminLike}
                            showFolderMenu={showFolderMenu}
                            setShowFolderMenu={setShowFolderMenu}
                            handleFolderClick={handleFolderClick}
                            handleRenameFolder={handleRenameFolder}
                            handleDeleteFolder={handleDeleteFolder}
                            canEditFolder={canEditFolder}
                            canDeleteFolder={canDeleteFolder}
                            hasFolderActions={hasFolderActions}
                            formatFileSize={formatFileSize}
                            formatDate={formatDate}
                          />
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Mobile cards */}
                <div className="mobile-cards-wrap">
                  {categorizedFolders.myDocuments.length > 0 && (
                    <>
                      <div className="group-label">
                        <span className="group-label-text">My Documents</span>
                        {myDocumentsDocumentCount > 0 && (
                          <span className="group-label-count">· {myDocumentsDocumentCount}</span>
                        )}
                      </div>
                      {categorizedFolders.myDocuments.map((folder, index) => (
                        <FolderMobileCard
                          key={folder._id || `my-m-${index}`}
                          folder={folder}
                          showFolderMenu={showFolderMenu}
                          setShowFolderMenu={setShowFolderMenu}
                          handleFolderClick={handleFolderClick}
                          handleRenameFolder={handleRenameFolder}
                          handleDeleteFolder={handleDeleteFolder}
                          canEditFolder={canEditFolder}
                          canDeleteFolder={canDeleteFolder}
                          hasFolderActions={hasFolderActions}
                          formatFileSize={formatFileSize}
                          formatDate={formatDate}
                        />
                      ))}
                    </>
                  )}
                  {categorizedFolders.sharedWithMe.length > 0 && (
                    <>
                      <div className="group-label is-shared">
                        <span className="group-label-text">Shared with me</span>
                        <span className="group-label-count">· {categorizedFolders.sharedWithMe.length}</span>
                      </div>
                      {categorizedFolders.sharedWithMe.map((folder, index) => (
                        <FolderMobileCard
                          key={folder._id || `shared-m-${index}`}
                          folder={folder}
                          showFolderMenu={showFolderMenu}
                          setShowFolderMenu={setShowFolderMenu}
                          handleFolderClick={handleFolderClick}
                          handleRenameFolder={handleRenameFolder}
                          handleDeleteFolder={handleDeleteFolder}
                          canEditFolder={canEditFolder}
                          canDeleteFolder={canDeleteFolder}
                          hasFolderActions={hasFolderActions}
                          formatFileSize={formatFileSize}
                          formatDate={formatDate}
                        />
                      ))}
                    </>
                  )}
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-row">
                <div className="pagination-info">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} folders
                </div>
                <div className="pagination-controls">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="page-btn"
                    type="button"
                  >
                    Previous
                  </button>
                  <span className="page-counter">
                    Page {pagination.page} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === totalPages}
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

      {/* Modals (unchanged passthrough + custom upload) */}

      {canManageFolders && showCreateFolderModal && (
        <CreateFolderModal
          onClose={() => setShowCreateFolderModal(false)}
          onCreate={handleFolderCreated}
          parentFolderId={null}
        />
      )}

      {renameFolderOpen && activeFolder && (
        <CreateFolderModal
          onClose={() => {
            setRenameFolderOpen(false);
            setActiveFolder(null);
          }}
          onCreate={handleFolderCreated}
          onUpdate={handleFolderUpdated}
          folder={activeFolder}
          parentFolderId={null}
        />
      )}

      <AlertDialog open={deleteFolderOpen} onOpenChange={setDeleteFolderOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the folder and all files/subfolders inside it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setActiveFolder(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteFolder}
              className="alert-confirm-btn"
              style={{
                background: 'linear-gradient(135deg, #a35446 0%, #b85c50 100%)',
                color: '#fff',
                border: 'none',
                fontWeight: 500,
                letterSpacing: '0.04em'
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Standalone Upload Modal */}
      {showUploadModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUploadModal(false);
              setUploadForm({ file: null, category: 'other', description: '' });
            }
          }}
        >
          <div className="modal-box">
            <div className="modal-header">
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="modal-eyebrow">Add File</p>
                <h3 className="modal-title">Upload Document</h3>
                <p className="modal-subtitle">My Documents</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm({ file: null, category: 'other', description: '' });
                }}
                className="modal-close"
                aria-label="Close"
              >
                <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-field">
                <label className="field-label">Select File</label>
                <input
                  type="file"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                  className="file-input"
                />
              </div>

              <div className="form-field">
                <label className="field-label">Category</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="native-select"
                >
                  <option value="other">Other</option>
                  <option value="contract">Contract</option>
                  <option value="certificate">Certificate</option>
                  <option value="identification">Identification</option>
                  <option value="training">Training</option>
                </select>
              </div>

              <div className="form-field">
                <label className="field-label">Description (optional)</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="textarea-input"
                  rows="3"
                  placeholder="Add a description…"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm({ file: null, category: 'other', description: '' });
                }}
                className="btn btn-secondary"
                disabled={uploading}
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmit}
                className="btn btn-primary"
                disabled={uploading || !uploadForm.file}
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

      {showDocumentViewer && selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={() => {
            setShowDocumentViewer(false);
            setSelectedDocument(null);
          }}
          onDownload={handleDownloadDocument}
        />
      )}
    </>
  );
};

// ─── Folder row (desktop) ─────────────────────────────────────────────────────
function FolderDesktopRow({
  folder, index, totalRows,
  isAdminLike,
  showFolderMenu, setShowFolderMenu,
  handleFolderClick, handleRenameFolder, handleDeleteFolder,
  canEditFolder, canDeleteFolder, hasFolderActions,
  formatFileSize, formatDate
}) {
  const isMenuOpen = showFolderMenu === folder._id;
  const menuDirection = index > (totalRows - 3) && totalRows > 4 ? 'is-up' : 'is-down';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04 }}
      className="folder-row"
      onClick={() => handleFolderClick(folder._id)}
    >
      <div className="folder-name-cell">
        <div className="folder-icon-tile">
          <Folder style={{ width: 16, height: 16 }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="folder-name-text">
            {folder.name}
            {folder.ownerInfo && folder.name === 'My Documents' && !isAdminLike && (
              <span className="folder-owner-tag">
                ({folder.ownerInfo.firstName} {folder.ownerInfo.lastName})
              </span>
            )}
          </p>
          <p className="folder-name-meta">
            {folder.documentCount || 0} document{folder.documentCount !== 1 ? 's' : ''}
            {folder.ownerInfo && (
              <>
                <span className="folder-meta-bullet">·</span>
                {folder.ownerInfo.email}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="col-type folder-cell-text">Folder</div>

      <div className="col-size folder-cell-text">
        {formatFileSize(folder.totalSize || 0)}
      </div>

      <div className="folder-end-cell">
        <span className="folder-cell-text">{formatDate(folder.createdAt)}</span>
        <div className="folder-end-actions" onClick={(e) => e.stopPropagation()}>
          {hasFolderActions(folder) && (
            <button
              type="button"
              onClick={() => setShowFolderMenu(isMenuOpen ? null : folder._id)}
              className="icon-btn"
              aria-label="Folder actions"
            >
              <MoreVertical style={{ width: 14, height: 14 }} />
            </button>
          )}
          <ChevronRight className="folder-row-chevron" style={{ width: 14, height: 14 }} />

          <AnimatePresence>
            {hasFolderActions(folder) && isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{ duration: 0.15 }}
                className={`action-menu ${menuDirection}`}
              >
                {canEditFolder(folder) && (
                  <button
                    onClick={() => handleRenameFolder(folder)}
                    className="action-item"
                    type="button"
                  >
                    <Pencil style={{ width: 13, height: 13 }} />
                    <span>Edit ACL</span>
                  </button>
                )}
                {canDeleteFolder(folder) && (
                  <button
                    onClick={() => handleDeleteFolder(folder)}
                    className="action-item is-danger"
                    type="button"
                  >
                    <Trash2 style={{ width: 13, height: 13 }} />
                    <span>Delete</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Folder card (mobile) ─────────────────────────────────────────────────────
function FolderMobileCard({
  folder,
  showFolderMenu, setShowFolderMenu,
  handleFolderClick, handleRenameFolder, handleDeleteFolder,
  canEditFolder, canDeleteFolder, hasFolderActions,
  formatFileSize, formatDate
}) {
  const isMenuOpen = showFolderMenu === folder._id;

  return (
    <div className="mobile-card" onClick={() => handleFolderClick(folder._id)}>
      <div className="mobile-card-row">
        <div className="folder-icon-tile">
          <Folder style={{ width: 16, height: 16 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.4rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="folder-name-text" style={{ marginBottom: 0 }}>{folder.name}</p>
              <p className="mobile-card-meta">
                {folder.documentCount || 0} doc{folder.documentCount !== 1 ? 's' : ''}
                {folder.ownerInfo && (
                  <> · {folder.ownerInfo.firstName} {folder.ownerInfo.lastName}</>
                )}
              </p>
            </div>
            {hasFolderActions(folder) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFolderMenu(isMenuOpen ? null : folder._id);
                }}
                className="icon-btn"
                type="button"
                aria-label="Folder actions"
              >
                <MoreVertical style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
          <div className="mobile-card-grid">
            <div>
              <p className="mobile-card-grid-key">Size</p>
              <p className="mobile-card-grid-val">{formatFileSize(folder.totalSize || 0)}</p>
            </div>
            <div>
              <p className="mobile-card-grid-key">Created</p>
              <p className="mobile-card-grid-val">{formatDate(folder.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>
      {hasFolderActions(folder) && isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="action-menu is-down"
          style={{ position: 'static', marginTop: '0.6rem', width: '100%' }}
          onClick={(e) => e.stopPropagation()}
        >
          {canEditFolder(folder) && (
            <button
              onClick={() => handleRenameFolder(folder)}
              className="action-item"
              type="button"
            >
              <Pencil style={{ width: 13, height: 13 }} />
              <span>Edit ACL</span>
            </button>
          )}
          {canDeleteFolder(folder) && (
            <button
              onClick={() => handleDeleteFolder(folder)}
              className="action-item is-danger"
              type="button"
            >
              <Trash2 style={{ width: 13, height: 13 }} />
              <span>Delete</span>
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default Documents;