import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useAlert } from "../components/AlertNotification";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { buildApiUrl } from '../utils/apiConfig';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .mt-root {
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
  .mt-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
    height: 600px;
  }
  .mt-shell {
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
    font-size: 1.65rem; color: #2f3e46; line-height: 1.15; letter-spacing: -0.02em;
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
    display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
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
  .btn-soft-success {
    background: rgba(82,121,111,0.10);
    color: #2f4a32;
    border: 1px solid rgba(82,121,111,0.22);
  }
  .btn-soft-success:hover:not(:disabled) {
    background: rgba(82,121,111,0.18); color: #1f3622;
  }
  .btn-soft-danger {
    background: rgba(192,117,106,0.10); color: #b85c50;
    border: 1px solid rgba(192,117,106,0.22);
  }
  .btn-soft-danger:hover:not(:disabled) {
    background: rgba(192,117,106,0.18); color: #7a3028;
  }
  .btn-dark {
    background: #2f3e46; color: #cad2c5;
  }
  .btn-dark:hover:not(:disabled) {
    background: #354f52;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(47,62,70,0.24);
  }
  .btn-dark:disabled {
    background: #d4ddd6; color: #8fa99a;
    cursor: not-allowed; transform: none;
  }
  .btn-xs {
    font-size: 0.65rem; padding: 0.3rem 0.6rem; min-height: 26px;
    border-radius: 6px;
    letter-spacing: 0.04em;
  }

  /* ══════════════════════════════════════
     SEARCH FIELD
  ══════════════════════════════════════ */
  .search-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 0.85rem 1rem;
    margin-bottom: 1.25rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    max-width: 480px;
  }
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
  .text-input.no-icon {
    padding-left: 0.85rem;
  }
  .text-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .text-input::placeholder { color: #b6c0b9; }

  /* ══════════════════════════════════════
     TEAM CARDS GRID
  ══════════════════════════════════════ */
  .teams-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.85rem;
  }
  @media (min-width: 768px) { .teams-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1280px) { .teams-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 1600px) { .teams-grid { grid-template-columns: repeat(4, 1fr); } }

  .team-card {
    background: #fff;
    border: 1.5px solid #eaefeb;
    border-radius: 12px;
    padding: 0.95rem 1rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.7rem;
  }
  .team-card:hover {
    transform: translateY(-2px);
    border-color: #84a98c;
    box-shadow: 0 6px 18px rgba(53,79,82,0.08);
  }
  .team-card-info {
    display: flex; align-items: center; gap: 0.85rem;
    min-width: 0; flex: 1;
  }
  .team-avatar {
    height: 48px; width: 48px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    color: #cad2c5;
    font-size: 1rem; font-weight: 600;
    background: linear-gradient(135deg, #354f52 0%, #52796f 60%, #84a98c 100%);
    border: 2px solid #fff;
    box-shadow: 0 2px 8px rgba(53,79,82,0.18);
    letter-spacing: 0.02em;
  }
  .team-name {
    font-size: 0.95rem; font-weight: 600;
    color: #2f3e46;
    margin: 0;
    line-height: 1.3;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .team-meta {
    font-size: 0.7rem; color: #7a8e84; font-weight: 400;
    margin: 0.18rem 0 0;
    display: flex; align-items: center; gap: 0.3rem;
  }
  .team-meta-dot {
    width: 4px; height: 4px;
    border-radius: 50%;
    background: #84a98c;
  }

  .team-actions {
    display: flex; gap: 0.2rem;
    flex-shrink: 0;
  }
  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    width: 32px; height: 32px;
    border-radius: 7px;
    display: inline-flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .icon-btn.is-edit {
    color: #52796f;
  }
  .icon-btn.is-edit:hover {
    background: rgba(82,121,111,0.10);
    color: #354f52;
  }
  .icon-btn.is-delete {
    color: #b85c50;
  }
  .icon-btn.is-delete:hover {
    background: rgba(192,117,106,0.10);
    color: #7a3028;
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

  /* ══════════════════════════════════════
     MODAL CHROME (shared by all modals)
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
    overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 32px 64px rgba(47,62,70,0.25);
    animation: scaleIn 0.25s cubic-bezier(0.22,1,0.36,1);
  }
  .modal-box.size-sm { max-width: 480px; }
  .modal-box.size-lg { max-width: 880px; max-height: 92vh; }
  .modal-box.size-xl { max-width: 980px; max-height: 92vh; }

  /* Hero header (for create/assign — colorful, prominent) */
  .modal-hero {
    position: relative;
    padding: 1.25rem 1.5rem 1rem;
    background: linear-gradient(135deg, #2f3e46 0%, #354f52 70%, #52796f 100%);
    color: #cad2c5;
    overflow: hidden;
    flex-shrink: 0;
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 1rem;
  }
  .modal-hero::after {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 160px; height: 160px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(132,169,140,0.18), transparent 70%);
    pointer-events: none;
  }
  .modal-hero-eyebrow {
    font-size: 0.6rem; font-weight: 500;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: rgba(132,169,140,0.85);
    margin: 0 0 0.3rem;
    position: relative; z-index: 1;
  }
  .modal-hero-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.4rem; font-weight: 400;
    color: #fff;
    letter-spacing: -0.01em;
    line-height: 1.15;
    margin: 0;
    position: relative; z-index: 1;
  }
  .modal-hero-close {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(202,210,197,0.18);
    color: #cad2c5;
    cursor: pointer;
    width: 32px; height: 32px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    position: relative; z-index: 1;
  }
  .modal-hero-close:hover {
    background: rgba(255,255,255,0.16);
    color: #fff;
  }

  /* Light header (for edit/add member — calmer) */
  .modal-light-header {
    padding: 1.15rem 1.4rem;
    border-bottom: 1px solid #eaefeb;
    flex-shrink: 0;
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 1rem;
  }
  .modal-light-header-content {
    display: flex; gap: 1rem; align-items: center;
    flex: 1; min-width: 0;
  }
  .modal-light-header-avatar {
    height: 52px; width: 52px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    color: #cad2c5;
    font-size: 1.15rem; font-weight: 600;
    background: linear-gradient(135deg, #354f52 0%, #52796f 60%, #84a98c 100%);
    border: 2.5px solid #fff;
    box-shadow: 0 3px 10px rgba(53,79,82,0.18);
    letter-spacing: 0.02em;
  }
  .modal-light-eyebrow {
    font-size: 0.6rem; font-weight: 500;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: #84a98c;
    margin: 0;
  }
  .modal-light-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.35rem; font-weight: 400;
    color: #2f3e46;
    letter-spacing: -0.01em;
    line-height: 1.2;
    margin: 0.15rem 0 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .modal-light-meta {
    font-size: 0.74rem; color: #52796f;
    margin: 0.2rem 0 0;
    display: flex; align-items: center; gap: 0.45rem;
    flex-wrap: wrap;
  }
  .modal-light-meta-dot {
    width: 4px; height: 4px;
    border-radius: 50%;
    background: #84a98c;
  }
  .modal-light-meta-fine {
    color: #8fa99a; font-size: 0.7rem;
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
    min-height: 0;
  }
  .modal-body-tight {
    padding: 1.15rem 1.4rem;
    flex-shrink: 0;
  }
  .modal-footer {
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.5rem;
    padding: 0.85rem 1.4rem;
    border-top: 1px solid #eaefeb;
    background: #fafbfa;
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  .modal-footer-group {
    display: flex; gap: 0.5rem;
    flex-wrap: wrap;
  }

  /* ══════════════════════════════════════
     ASSIGN GROUPS (Step 2 modal)
  ══════════════════════════════════════ */
  .group-block {
    margin-bottom: 1.25rem;
  }
  .group-block:last-child { margin-bottom: 0; }
  .group-header {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.6rem 0.7rem;
    background: linear-gradient(135deg, #fafbfa, #f0f5f2);
    border: 1px solid #eaefeb;
    border-left: 3px solid #52796f;
    border-radius: 9px;
    margin-bottom: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .group-header:hover {
    background: linear-gradient(135deg, #f0f5f2, #e8eee9);
    border-left-color: #354f52;
  }
  .group-chevron {
    width: 20px; height: 20px;
    border-radius: 5px;
    background: rgba(82,121,111,0.14);
    color: #354f52;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s;
    flex-shrink: 0;
  }
  .group-chevron.is-open { transform: rotate(180deg); }
  .group-name {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem; font-weight: 600;
    color: #2f3e46;
    flex: 1;
    line-height: 1.2;
  }
  .group-count-pill {
    display: inline-flex; align-items: center;
    padding: 0.2rem 0.55rem;
    background: linear-gradient(135deg, #354f52, #52796f);
    color: #cad2c5;
    border-radius: 999px;
    font-size: 0.66rem; font-weight: 600;
    min-width: 24px;
    justify-content: center;
    flex-shrink: 0;
  }
  .group-count-pill.is-zero {
    background: #fafbfa;
    color: #8fa99a;
    border: 1px solid #eaefeb;
  }

  .employee-cards-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.7rem;
  }
  @media (min-width: 640px) { .employee-cards-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .employee-cards-grid { grid-template-columns: repeat(3, 1fr); } }

  .employee-card {
    background: #fff;
    border: 1.5px solid #eaefeb;
    border-radius: 10px;
    padding: 0.75rem 0.85rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
    text-align: left;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    -webkit-tap-highlight-color: transparent;
    width: 100%;
  }
  .employee-card:hover:not(:disabled) {
    border-color: #84a98c;
    background: #fafbfa;
  }
  .employee-card.is-selected {
    border-color: #52796f;
    background: rgba(132,169,140,0.10);
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .employee-card:disabled,
  .employee-card.is-disabled {
    background: #fafbfa;
    border-color: #eaefeb;
    color: #b6c0b9;
    cursor: not-allowed;
    opacity: 0.7;
  }
  .employee-card.is-current {
    border-color: rgba(82,121,111,0.3);
    background: rgba(132,169,140,0.06);
    cursor: not-allowed;
  }

  .emp-name {
    font-size: 0.84rem; font-weight: 600;
    color: #2f3e46;
    margin: 0;
    line-height: 1.3;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .emp-name.is-disabled { color: #8fa99a; }
  .emp-detail {
    font-size: 0.72rem; color: #7a8e84;
    margin: 0.2rem 0 0;
    line-height: 1.35;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .emp-status-line {
    font-size: 0.62rem; font-weight: 600;
    margin: 0.4rem 0 0;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    display: inline-flex; align-items: center; gap: 0.3rem;
  }
  .emp-status-line.is-already {
    color: #8fa99a;
  }
  .emp-status-line.is-available {
    color: #52796f;
  }
  .emp-status-line.is-other {
    color: #b89758;
  }
  .emp-status-line.is-current {
    color: #354f52;
  }
  .emp-status-dot {
    width: 4px; height: 4px;
    border-radius: 50%;
    background: currentColor;
  }
  .emp-check {
    position: absolute;
    top: 8px; right: 8px;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: linear-gradient(135deg, #354f52, #52796f);
    color: #cad2c5;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 6px rgba(53,79,82,0.25);
  }

  /* ══════════════════════════════════════
     EDIT TEAM — Members table
  ══════════════════════════════════════ */
  .members-section {
    margin-top: 1.25rem;
  }
  .members-section-head {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 0.7rem;
    margin-bottom: 0.7rem;
  }
  .members-title {
    font-size: 0.85rem; font-weight: 600;
    color: #2f3e46;
    margin: 0;
  }
  .members-subtitle {
    font-size: 0.72rem; color: #7a8e84; font-weight: 400;
    margin: 0.2rem 0 0;
    line-height: 1.45;
  }

  .members-card {
    border: 1px solid #eaefeb;
    border-radius: 10px;
    overflow: hidden;
  }
  .members-scroll {
    max-height: 280px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .members-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'DM Sans', sans-serif;
    table-layout: auto;
  }
  .members-table thead {
    background: #fafbfa;
    border-bottom: 1px solid #eaefeb;
    position: sticky; top: 0; z-index: 1;
  }
  .members-table th {
    padding: 0.55rem 0.7rem;
    text-align: left;
    font-size: 0.55rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #84a98c;
    white-space: nowrap;
  }
  .members-table th.is-right { text-align: right; }
  .members-table tbody tr {
    border-bottom: 1px solid #eaefeb;
  }
  .members-table tbody tr:last-child { border-bottom: none; }
  .members-table tbody tr:hover { background: #fafbfa; }
  .members-table td {
    padding: 0.55rem 0.7rem;
    font-size: 0.76rem;
    color: #2f3e46;
    vertical-align: middle;
  }
  .members-table td.is-strong { font-weight: 500; color: #2f3e46; }
  .members-table td.is-muted { color: #7a8e84; }
  .members-table td.is-right { text-align: right; }
  .members-table .member-actions-cell {
    display: flex; gap: 0.35rem; justify-content: flex-end;
  }
  .members-empty-row {
    padding: 2rem 1rem;
    text-align: center;
    color: #7a8e84;
    font-size: 0.78rem;
  }

  /* Hide email column on tighter widths in edit modal */
  @media (max-width: 767px) {
    .members-table th.col-email,
    .members-table td.col-email { display: none; }
  }

  /* ══════════════════════════════════════
     ADD MEMBER MODAL — Section headings
  ══════════════════════════════════════ */
  .add-section + .add-section { margin-top: 1.25rem; }
  .add-section-head {
    display: flex; align-items: center; gap: 0.55rem;
    margin-bottom: 0.7rem;
    padding-bottom: 0.55rem;
    border-bottom: 1px solid #eaefeb;
  }
  .add-section-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.1rem; font-weight: 400;
    color: #2f3e46;
    letter-spacing: -0.01em;
    margin: 0;
    line-height: 1.2;
  }
  .add-section-count {
    margin-left: auto;
    font-size: 0.66rem; font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #84a98c;
  }
  .add-section-head.is-other .add-section-title::before,
  .add-section-head.is-current .add-section-title::before,
  .add-section-head.is-available .add-section-title::before {
    content: '';
    display: inline-block;
    width: 4px; height: 16px;
    border-radius: 2px;
    margin-right: 0.5rem;
    vertical-align: -3px;
  }
  .add-section-head.is-available .add-section-title::before {
    background: linear-gradient(180deg, #52796f, #84a98c);
  }
  .add-section-head.is-other .add-section-title::before {
    background: linear-gradient(180deg, #b89758, #d4b87a);
  }
  .add-section-head.is-current .add-section-title::before {
    background: linear-gradient(180deg, #6f8c98, #8aa6b3);
  }

  .add-empty-line {
    font-size: 0.76rem; color: #8fa99a;
    font-style: italic;
    text-align: center;
    padding: 0.9rem;
    background: #fafbfa;
    border: 1px dashed #d4ddd6;
    border-radius: 8px;
  }

  /* ══════════════════════════════════════
     LOADING / ERROR helpers
  ══════════════════════════════════════ */
  .inline-loading {
    display: flex; align-items: center; justify-content: center;
    padding: 2.25rem 1rem;
    gap: 0.55rem;
    color: #7a8e84;
    font-size: 0.78rem;
  }
  .spinner {
    width: 22px; height: 22px;
    border: 2.5px solid rgba(82,121,111,0.18);
    border-top-color: #52796f;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  .spinner-sm {
    width: 14px; height: 14px;
    border: 2px solid rgba(82,121,111,0.18);
    border-top-color: #52796f;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1023px) {
    .mt-root { padding: 1.25rem; }
    .header-title { font-size: 1.5rem; }
    .modal-hero, .modal-light-header { padding: 1.05rem 1.2rem; }
    .modal-body, .modal-body-tight { padding: 1rem 1.2rem; }
    .modal-footer { padding: 0.7rem 1.2rem; }
  }
  @media (max-width: 767px) {
    .mt-root { padding: 0.85rem; }
    .header-title { font-size: 1.3rem; }
    .header-icon-wrap { width: 34px; height: 34px; border-radius: 9px; }
    .modal-hero-title { font-size: 1.25rem; }
    .modal-light-title { font-size: 1.2rem; }
    .modal-light-header-avatar { height: 44px; width: 44px; font-size: 1rem; }
  }
  @media (max-width: 479px) {
    .mt-root { padding: 0.65rem; }
    .header-title { font-size: 1.2rem; }
    .modal-overlay { padding: 0; align-items: flex-end; }
    .modal-box { border-radius: 18px 18px 0 0; max-height: 92vh; }
    .text-input { font-size: 16px; }
    .modal-footer {
      flex-direction: column-reverse;
      align-items: stretch;
    }
    .modal-footer-group {
      width: 100%;
      flex-direction: column;
    }
    .modal-footer-group .btn { width: 100%; }
  }
`;

export default function ManageTeams() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTeamName, setEditTeamName] = useState("");
  const [editingTeam, setEditingTeam] = useState(null);
  const [editingTeamMembers, setEditingTeamMembers] = useState([]);
  const [editTeamLoading, setEditTeamLoading] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedTargetTeam, setSelectedTargetTeam] = useState('');

  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const { success: showSuccess, error: showError } = useAlert();

  const [teams, setTeams] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    confirmText: 'Continue',
    cancelText: 'Cancel',
    variant: 'default',
    onConfirm: null,
  });

  useEffect(() => {
    fetchEmployees();
    fetchTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(buildApiUrl('/employees'));
      if (response.data.success) {
        const transformedEmployees = response.data.data.map(emp => ({
          id: emp._id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          jobTitle: emp.jobTitle,
          department: emp.department,
          dateOfBirth: emp.dateOfBirth,
          currentTeam: emp.team || null
        }));
        setAllEmployees(transformedEmployees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await axios.get(buildApiUrl('/teams'));
      if (response.data.success) {
        const transformedTeams = response.data.data.map(team => ({
          id: team._id,
          name: team.name,
          initials: team.initials,
          memberCount: team.memberCount,
          color: team.color
        }));
        setTeams(transformedTeams);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleOpenAssignModal = () => {
    if (newTeamName.trim()) {
      setShowCreateModal(false);
      setShowAssignModal(true);
      const groups = {};
      teams.forEach(team => {
        groups[team.name] = true;
      });
      groups["No group"] = true;
      setExpandedGroups(groups);
    }
  };

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const renderEmployeeCard = (employee) => {
    const isSelectable = !employee.currentTeam;
    const isSelected = selectedEmployees.includes(employee.id);

    return (
      <button
        key={employee.id}
        onClick={() => {
          if (!isSelectable) return;
          toggleEmployeeSelection(employee.id);
        }}
        disabled={!isSelectable}
        className={`employee-card ${isSelected ? 'is-selected' : ''} ${!isSelectable ? 'is-disabled' : ''}`}
        type="button"
      >
        <p className={`emp-name ${!isSelectable ? 'is-disabled' : ''}`}>
          {employee.firstName} {employee.lastName}
        </p>
        <p className="emp-detail">{employee.department || "—"}</p>
        <p className="emp-detail">{employee.jobTitle || "—"}</p>
        <p className="emp-detail">{formatDateOfBirth(employee.dateOfBirth)}</p>
        {!isSelectable && (
          <p className="emp-status-line is-already">
            <span className="emp-status-dot"></span>
            Already in {employee.currentTeam}
          </p>
        )}
        {isSelectable && isSelected && (
          <span className="emp-check">
            <svg style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
      </button>
    );
  };

  const handleCreateTeam = async () => {
    const trimmedName = newTeamName.trim();
    if (trimmedName) {
      try {
        const words = trimmedName.split(" ");
        const initials = words.length > 1
          ? words.map(w => w[0]).join("").toUpperCase()
          : trimmedName.substring(0, 2).toUpperCase();

        const teamData = {
          name: trimmedName,
          initials,
          members: selectedEmployees,
          color: "#3B82F6",
        };

        const response = await axios.post(buildApiUrl('/teams'), teamData);

        if (response.data.success) {
          await fetchTeams();
          await fetchEmployees();

          setNewTeamName("");
          setSelectedEmployees([]);
          setShowAssignModal(false);
          showSuccess('Team created successfully.');
        }
      } catch (error) {
        console.error('Error creating team:', error);
        const message = error.response?.data?.message || 'Failed to create team. Please try again.';
        showError(message);
      }
    }
  };

  const handleCloseModals = () => {
    setShowCreateModal(false);
    setShowAssignModal(false);
    setNewTeamName("");
    setSelectedEmployees([]);
  };

  const deleteTeamById = async (teamId) => {
    try {
      const response = await axios.delete(buildApiUrl(`/teams/${teamId}`));
      if (response.data.success) {
        await fetchTeams();
        await fetchEmployees();
        showSuccess('Team deleted successfully.');
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      showError('Failed to delete team. Please try again.');
    }
  };

  const promptDeleteTeam = (teamId, teamName, onAfterDelete) => {
    setConfirmDialog({
      open: true,
      title: 'Delete team',
      description: `Delete ${teamName} and remove its member assignments? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      onConfirm: async () => {
        await deleteTeamById(teamId);
        onAfterDelete?.();
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      }
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
  };

  const loadEditingTeam = async (teamId) => {
    setEditTeamLoading(true);
    try {
      const response = await axios.get(buildApiUrl(`/teams/${teamId}`));
      if (response.data.success) {
        const teamData = response.data.data;
        setEditingTeam({
          id: teamData._id,
          name: teamData.name,
          initials: teamData.initials,
          color: teamData.color,
          memberCount: teamData.members?.length || 0,
          createdAt: teamData.createdAt,
        });
        setEditTeamName(teamData.name || "");
        setEditingTeamMembers(teamData.members || []);
      }
    } catch (error) {
      console.error('Error loading team details:', error);
      showError('Unable to load team details. Please try again.');
      setShowEditModal(false);
    } finally {
      setEditTeamLoading(false);
    }
  };

  const handleEditTeam = async (teamId) => {
    setShowEditModal(true);
    await loadEditingTeam(teamId);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingTeam(null);
    setEditingTeamMembers([]);
    setEditTeamName("");
  };

  const handleSaveEditedTeam = async () => {
    if (!editingTeam?.id) return;
    if (!editTeamName.trim()) {
      showError('Team name cannot be empty.');
      return;
    }

    try {
      await axios.put(buildApiUrl(`/teams/${editingTeam.id}`), {
        name: editTeamName.trim(),
      });
      await fetchTeams();
      await loadEditingTeam(editingTeam.id);
      showSuccess('Team updated successfully.');
    } catch (error) {
      console.error('Error saving team:', error);
      showError('Failed to save changes. Please try again.');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!editingTeam?.id) return;
    setConfirmDialog({
      open: true,
      title: 'Remove member',
      description: 'Remove this employee from the team? They can be added to another team later.',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await axios.post(buildApiUrl(`/teams/${editingTeam.id}/members/remove`), {
            employeeId: memberId,
          });
          await fetchEmployees();
          await fetchTeams();
          await loadEditingTeam(editingTeam.id);
        } catch (error) {
          console.error('Error removing member:', error);
          showError('Unable to remove member.');
        }
      }
    });
  };

  const handleSwitchMember = async (member) => {
    if (!editingTeam?.id) return;
    const otherTeams = teams.filter((team) => team.id !== editingTeam.id);
    if (otherTeams.length === 0) {
      showError('No other teams available to switch the member to.');
      return;
    }

    setSelectedMember(member);
    setSelectedTargetTeam(otherTeams[0].id);
    setSwitchDialogOpen(true);
  };

  const handleSwitchConfirm = async () => {
    if (!selectedMember || !selectedTargetTeam) return;

    const targetTeam = teams.find((team) => team.id === selectedTargetTeam);
    if (!targetTeam) {
      showError('Target team not found.');
      return;
    }

    try {
      await axios.post(buildApiUrl(`/teams/${editingTeam.id}/members/remove`), {
        employeeId: selectedMember._id,
      });
      await axios.post(buildApiUrl(`/teams/${targetTeam.id}/members/add`), {
        employeeId: selectedMember._id,
      });
      await fetchEmployees();
      await fetchTeams();
      await loadEditingTeam(editingTeam.id);
      showSuccess(`${selectedMember.firstName} ${selectedMember.lastName} moved to ${targetTeam.name}.`);
      setSwitchDialogOpen(false);
      setSelectedMember(null);
      setSelectedTargetTeam('');
    } catch (error) {
      console.error('Error switching member:', error);
      showError('Unable to switch member. Please try again.');
    }
  };

  const handleOpenAddMemberModal = async () => {
    try {
      const response = await axios.get(buildApiUrl('/employees'));
      if (response.data.success) {
        const employees = response.data.data;

        const categorizedEmployees = employees.map(emp => {
          const isInOtherTeam = emp.team && emp.team !== editingTeam.name;
          const isInCurrentTeam = emp.team === editingTeam.name;
          const isAvailable = !emp.team || emp.team === '';

          return {
            id: emp._id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            department: emp.department,
            jobTitle: emp.jobTitle,
            currentTeam: emp.team || null,
            isAvailable: isAvailable,
            isInCurrentTeam: isInCurrentTeam,
            isInOtherTeam: isInOtherTeam,
            status: isAvailable ? 'available' : (isInCurrentTeam ? 'current' : 'other-team')
          };
        });

        setAvailableEmployees(categorizedEmployees);
        setSelectedNewMembers([]);
        setShowAddMemberModal(true);
      }
    } catch (error) {
      console.error('Error fetching employees for add member:', error);
      showError('Unable to load employees. Please try again.');
    }
  };

  const toggleNewMemberSelection = (employeeId) => {
    setSelectedNewMembers(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedNewMembers.length === 0) {
      showError('Please select at least one employee to add.');
      return;
    }

    try {
      const addPromises = selectedNewMembers.map(employeeId =>
        axios.post(buildApiUrl(`/teams/${editingTeam.id}/members/add`), {
          employeeId: employeeId,
        })
      );

      await Promise.all(addPromises);

      await fetchEmployees();
      await fetchTeams();
      await loadEditingTeam(editingTeam.id);

      setShowAddMemberModal(false);
      setSelectedNewMembers([]);
      showSuccess(`Added ${selectedNewMembers.length} member(s) to the team.`);
    } catch (error) {
      console.error('Error adding members:', error);
      showError('Unable to add members. Please try again.');
    }
  };

  const formatDateOfBirth = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return "—";
    }
  };

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableCount = availableEmployees.filter(e => e.status === 'available').length;
  const otherTeamCount = availableEmployees.filter(e => e.status === 'other-team').length;
  const currentMemberCount = availableEmployees.filter(e => e.status === 'current').length;

  return (
    <>
      <style>{styles}</style>
      <div className="mt-root">
        <div className="mt-shell">

          {/* ── Page Header ── */}
          <div className="page-header anim-fade-up">
            <div className="header-block">
              <div className="header-icon-wrap">
                <svg style={{ width: 18, height: 18, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="header-eyebrow">Organization · Teams</p>
                <h1 className="header-title">Team Management</h1>
                <p className="header-subtitle">Create teams and manage their members.</p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-success"
              type="button"
            >
              <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
              </svg>
              Add a new team
            </button>
          </div>

          {/* ── Search ── */}
          <div className="search-card anim-fade-up delay-100">
            <label className="field-label">Find</label>
            <div className="search-wrap">
              <span className="search-icon">
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Team name…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-input"
              />
            </div>
          </div>

          {/* ── Teams grid ── */}
          {filteredTeams.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <svg style={{ width: 28, height: 28 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="empty-title">No teams found</h3>
              <p className="empty-text">
                {searchTerm
                  ? "Try adjusting your search."
                  : "Get started by creating your first team."}
              </p>
            </div>
          ) : (
            <div className="teams-grid anim-fade-up delay-200">
              {filteredTeams.map((team) => (
                <div key={team.id} className="team-card">
                  <div className="team-card-info">
                    <div className="team-avatar">
                      {team.initials}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 className="team-name">{team.name}</h3>
                      <p className="team-meta">
                        <span>{team.memberCount} member{team.memberCount !== 1 ? "s" : ""}</span>
                      </p>
                    </div>
                  </div>

                  <div className="team-actions">
                    <button
                      onClick={() => handleEditTeam(team.id)}
                      className="icon-btn is-edit"
                      title="Edit team"
                      type="button"
                    >
                      <PencilIcon style={{ width: 16, height: 16 }} />
                    </button>
                    <button
                      onClick={() => promptDeleteTeam(team.id, team.name)}
                      className="icon-btn is-delete"
                      title="Delete team"
                      type="button"
                    >
                      <TrashIcon style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          STEP 1 — Create Team Modal
      ══════════════════════════════════════ */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseModals(); }}
        >
          <div className="modal-box size-sm">
            <div className="modal-hero">
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="modal-hero-eyebrow">Step 1 of 2</p>
                <h2 className="modal-hero-title">Add a new team</h2>
              </div>
              <button onClick={handleCloseModals} className="modal-hero-close" aria-label="Close" type="button">
                <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body-tight">
              <label className="field-label">Team Name</label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. Marketing, Engineering, Operations…"
                className="text-input no-icon"
                autoFocus
              />
            </div>

            <div className="modal-footer">
              <button onClick={handleCloseModals} className="btn btn-secondary" type="button">
                Close
              </button>
              <button
                onClick={handleOpenAssignModal}
                disabled={!newTeamName.trim()}
                className="btn btn-success"
                type="button"
              >
                Select employees
                <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          STEP 2 — Assign Employees Modal
      ══════════════════════════════════════ */}
      {showAssignModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseModals(); }}
        >
          <div className="modal-box size-xl">
            <div className="modal-hero">
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="modal-hero-eyebrow">Step 2 of 2</p>
                <h2 className="modal-hero-title">Assign employees to "{newTeamName}"</h2>
              </div>
              <button onClick={handleCloseModals} className="modal-hero-close" aria-label="Close" type="button">
                <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              {loading ? (
                <div className="inline-loading">
                  <div className="spinner"></div>
                  <span>Loading employees…</span>
                </div>
              ) : allEmployees.length === 0 ? (
                <div className="add-empty-line">No employees found. Please check if employees are loaded.</div>
              ) : (
                <>
                  {/* Existing teams */}
                  {teams.map((team) => {
                    const teamEmployees = allEmployees.filter((emp) => emp.currentTeam === team.name);
                    if (teamEmployees.length === 0) return null;

                    const teamSelectedCount = teamEmployees.filter((emp) =>
                      selectedEmployees.includes(emp.id)
                    ).length;

                    return (
                      <div key={team.name} className="group-block">
                        <div className="group-header" onClick={() => toggleGroup(team.name)}>
                          <span className={`group-chevron ${expandedGroups[team.name] ? 'is-open' : ''}`}>
                            <svg style={{ width: 11, height: 11 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                          <span className="group-name">{team.name}</span>
                          <span className={`group-count-pill ${teamSelectedCount === 0 ? 'is-zero' : ''}`}>
                            {teamSelectedCount}
                          </span>
                        </div>

                        {expandedGroups[team.name] && (
                          <div className="employee-cards-grid">
                            {teamEmployees.map((employee) => renderEmployeeCard(employee))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* No group section */}
                  {(() => {
                    const noGroupEmployees = teams.length === 0
                      ? allEmployees
                      : allEmployees.filter((emp) => !emp.currentTeam);

                    if (noGroupEmployees.length === 0) return null;

                    const noGroupSelectedCount = noGroupEmployees.filter((emp) =>
                      selectedEmployees.includes(emp.id)
                    ).length;

                    return (
                      <div className="group-block">
                        <div className="group-header" onClick={() => toggleGroup("No group")}>
                          <span className={`group-chevron ${expandedGroups["No group"] ? 'is-open' : ''}`}>
                            <svg style={{ width: 11, height: 11 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                          <span className="group-name">No group</span>
                          <span className={`group-count-pill ${noGroupSelectedCount === 0 ? 'is-zero' : ''}`}>
                            {noGroupSelectedCount}
                          </span>
                        </div>

                        {expandedGroups["No group"] && (
                          <div className="employee-cards-grid">
                            {noGroupEmployees.map((employee) => renderEmployeeCard(employee))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setShowCreateModal(true);
                }}
                className="btn btn-secondary"
                type="button"
              >
                <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <button
                onClick={handleCreateTeam}
                className="btn btn-success"
                type="button"
              >
                Save ({selectedEmployees.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          EDIT TEAM Modal
      ══════════════════════════════════════ */}
      {showEditModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseEditModal(); }}
        >
          <div className="modal-box size-lg">
            <div className="modal-light-header">
              <div className="modal-light-header-content">
                <div className="modal-light-header-avatar">
                  {editingTeam?.initials || editingTeam?.name?.substring(0, 2)?.toUpperCase() || 'TM'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="modal-light-eyebrow">Editing Team</p>
                  <h2 className="modal-light-title">{editingTeam?.name || 'Team'}</h2>
                  <p className="modal-light-meta">
                    <span>{editingTeam?.memberCount || 0} member{(editingTeam?.memberCount || 0) === 1 ? '' : 's'}</span>
                    {editingTeam?.createdAt && (
                      <>
                        <span className="modal-light-meta-dot"></span>
                        <span className="modal-light-meta-fine">
                          Created {new Date(editingTeam.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={handleCloseEditModal} className="modal-close" aria-label="Close" type="button">
                <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div>
                <label className="field-label">Team Name</label>
                <input
                  type="text"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="text-input no-icon"
                  placeholder="Enter team name"
                />
              </div>

              <div className="members-section">
                <div className="members-section-head">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="members-title">Team Members</p>
                    <p className="members-subtitle">Manage existing members and move them between teams.</p>
                  </div>
                </div>

                <div className="members-card">
                  <div className="members-scroll">
                    <table className="members-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Department</th>
                          <th className="col-email">Email</th>
                          <th className="is-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editTeamLoading ? (
                          <tr>
                            <td colSpan="4">
                              <div className="members-empty-row">
                                <div className="inline-loading">
                                  <div className="spinner-sm"></div>
                                  <span>Loading team details…</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : editingTeamMembers.length === 0 ? (
                          <tr>
                            <td colSpan="4">
                              <div className="members-empty-row">No members in this team yet.</div>
                            </td>
                          </tr>
                        ) : (
                          editingTeamMembers.map((member) => (
                            <tr key={member._id}>
                              <td className="is-strong">
                                {member.firstName} {member.lastName}
                              </td>
                              <td className="is-muted">
                                {member.jobTitle || member.department || '—'}
                              </td>
                              <td className="is-muted col-email">
                                {member.email || '—'}
                              </td>
                              <td className="is-right">
                                <div className="member-actions-cell">
                                  <button
                                    onClick={() => handleSwitchMember(member)}
                                    className="btn btn-secondary btn-xs"
                                    type="button"
                                  >
                                    Switch
                                  </button>
                                  <button
                                    onClick={() => handleRemoveMember(member._id)}
                                    className="btn btn-soft-danger btn-xs"
                                    type="button"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <div className="modal-footer-group">
                <button
                  onClick={handleOpenAddMemberModal}
                  className="btn btn-soft-success"
                  type="button"
                >
                  <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add member
                </button>
                <button
                  onClick={() => {
                    if (editingTeam?.id) {
                      promptDeleteTeam(editingTeam.id, editingTeam.name || 'team', handleCloseEditModal);
                    }
                  }}
                  className="btn btn-soft-danger"
                  type="button"
                >
                  <TrashIcon style={{ width: 13, height: 13 }} />
                  Delete team
                </button>
              </div>
              <div className="modal-footer-group">
                <button
                  onClick={handleCloseEditModal}
                  className="btn btn-secondary"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditedTeam}
                  disabled={editTeamLoading || !editingTeam}
                  className="btn btn-primary"
                  type="button"
                >
                  {editTeamLoading ? (
                    <>
                      <div className="spinner-sm" style={{ borderColor: 'rgba(202,210,197,0.4)', borderTopColor: '#cad2c5' }}></div>
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>Save changes</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          ADD MEMBER Modal
      ══════════════════════════════════════ */}
      {showAddMemberModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddMemberModal(false); }}
        >
          <div className="modal-box size-xl">
            <div className="modal-light-header">
              <div className="modal-light-header-content">
                <div className="modal-light-header-avatar">
                  {editingTeam?.initials || editingTeam?.name?.substring(0, 2)?.toUpperCase() || 'TM'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="modal-light-eyebrow">Add Members</p>
                  <h2 className="modal-light-title">Add to {editingTeam?.name || 'Team'}</h2>
                  <p className="modal-light-meta">
                    <span>Select employees to add to this team. Employees already in teams are greyed out.</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAddMemberModal(false)} className="modal-close" aria-label="Close" type="button">
                <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              {availableEmployees.length === 0 ? (
                <div className="inline-loading">
                  <div className="spinner"></div>
                  <span>Loading employees…</span>
                </div>
              ) : (
                <>
                  {/* Available */}
                  <div className="add-section">
                    <div className="add-section-head is-available">
                      <h3 className="add-section-title">Available Employees</h3>
                      <span className="add-section-count">
                        {availableCount} available
                      </span>
                    </div>
                    {availableCount === 0 ? (
                      <div className="add-empty-line">No employees are currently available to add.</div>
                    ) : (
                      <div className="employee-cards-grid">
                        {availableEmployees
                          .filter(emp => emp.status === 'available')
                          .map(employee => {
                            const isSelected = selectedNewMembers.includes(employee.id);
                            return (
                              <button
                                key={employee.id}
                                onClick={() => toggleNewMemberSelection(employee.id)}
                                className={`employee-card ${isSelected ? 'is-selected' : ''}`}
                                type="button"
                              >
                                <p className="emp-name">{employee.firstName} {employee.lastName}</p>
                                <p className="emp-detail">{employee.department || '—'}</p>
                                <p className="emp-detail">{employee.jobTitle || '—'}</p>
                                <p className="emp-detail">{employee.email || '—'}</p>
                                <p className="emp-status-line is-available">
                                  <span className="emp-status-dot"></span>
                                  Available
                                </p>
                                {isSelected && (
                                  <span className="emp-check">
                                    <svg style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </span>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* In other teams */}
                  {otherTeamCount > 0 && (
                    <div className="add-section">
                      <div className="add-section-head is-other">
                        <h3 className="add-section-title">In Other Teams</h3>
                        <span className="add-section-count">{otherTeamCount} unavailable</span>
                      </div>
                      <div className="employee-cards-grid">
                        {availableEmployees
                          .filter(emp => emp.status === 'other-team')
                          .map(employee => (
                            <div key={employee.id} className="employee-card is-disabled">
                              <p className="emp-name is-disabled">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <p className="emp-detail">{employee.department || '—'}</p>
                              <p className="emp-detail">{employee.jobTitle || '—'}</p>
                              <p className="emp-detail">{employee.email || '—'}</p>
                              <p className="emp-status-line is-other">
                                <span className="emp-status-dot"></span>
                                In {employee.currentTeam}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Current team members */}
                  {currentMemberCount > 0 && (
                    <div className="add-section">
                      <div className="add-section-head is-current">
                        <h3 className="add-section-title">Current Team Members</h3>
                        <span className="add-section-count">{currentMemberCount} in team</span>
                      </div>
                      <div className="employee-cards-grid">
                        {availableEmployees
                          .filter(emp => emp.status === 'current')
                          .map(employee => (
                            <div key={employee.id} className="employee-card is-current">
                              <p className="emp-name">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <p className="emp-detail">{employee.department || '—'}</p>
                              <p className="emp-detail">{employee.jobTitle || '—'}</p>
                              <p className="emp-detail">{employee.email || '—'}</p>
                              <p className="emp-status-line is-current">
                                <span className="emp-status-dot"></span>
                                Already in team
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <div style={{ fontSize: '0.74rem', color: '#52796f', fontWeight: 500 }}>
                <span style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: '#2f3e46',
                  marginRight: 4
                }}>
                  {selectedNewMembers.length}
                </span>
                employee{selectedNewMembers.length === 1 ? '' : 's'} selected
              </div>
              <div className="modal-footer-group">
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="btn btn-secondary"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMembers}
                  disabled={selectedNewMembers.length === 0}
                  className="btn btn-primary"
                  type="button"
                >
                  Add {selectedNewMembers.length} member{selectedNewMembers.length === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog (passthrough) */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) closeConfirmDialog();
        }}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={async () => {
          await confirmDialog.onConfirm?.();
          closeConfirmDialog();
        }}
        onCancel={closeConfirmDialog}
      />

      {/* Switch Member Dialog (AlertDialog passthrough — inline-styled action) */}
      <AlertDialog open={switchDialogOpen} onOpenChange={setSwitchDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '1.35rem',
              fontWeight: 400,
              color: '#2f3e46',
              letterSpacing: '-0.01em'
            }}>
              Switch Team Member
            </AlertDialogTitle>
            <AlertDialogDescription style={{
              fontSize: '0.82rem',
              color: '#52796f',
              lineHeight: 1.55
            }}>
              Move {selectedMember?.firstName} {selectedMember?.lastName} from "{editingTeam?.name}" to another team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ padding: '0.5rem 0 1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.62rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#52796f',
              marginBottom: '0.4rem'
            }}>
              Select Target Team
            </label>
            <Select value={selectedTargetTeam} onValueChange={setSelectedTargetTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.filter(team => team.id !== editingTeam?.id).map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSwitchConfirm}
              style={{
                background: 'linear-gradient(135deg, #354f52 0%, #52796f 100%)',
                color: '#cad2c5',
                border: 'none',
                boxShadow: '0 3px 12px rgba(53,79,82,0.22)'
              }}
            >
              Switch Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}