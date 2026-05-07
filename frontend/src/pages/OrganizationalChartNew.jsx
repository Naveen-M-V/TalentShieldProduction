import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Edit3, Save, X, Users, Search, ChevronDown, ChevronRight } from 'lucide-react';
import axios from '../utils/axiosConfig';
import { toast } from 'react-toastify';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .org-root {
    font-family: 'DM Sans', sans-serif;
    -webkit-text-size-adjust: 100%;
    background: #f7f8f6;
    min-height: 100vh;
    padding: 2rem;
    position: relative;
  }
  .org-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
  }
  .org-shell { position: relative; z-index: 1; max-width: 1600px; margin: 0 auto; }

  /* ── Keyframes ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes pulse-ring {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50%       { opacity: 0.8; transform: scale(1.08); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .anim-fade-up { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-fade-in { animation: fadeIn 0.4s ease both; }
  .delay-100 { animation-delay: 0.10s; }
  .delay-200 { animation-delay: 0.20s; }
  .delay-300 { animation-delay: 0.30s; }

  /* ══════════════════════════════════════
     HEADER CARD
  ══════════════════════════════════════ */
  .header-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 16px;
    padding: 1.5rem 1.75rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
  }
  .header-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1.5rem; flex-wrap: wrap;
  }
  .header-title-block { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
  .header-eyebrow-row { display: flex; align-items: center; gap: 0.65rem; }
  .header-icon-wrap {
    width: 42px; height: 42px; border-radius: 11px;
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(53,79,82,0.18); flex-shrink: 0;
  }
  .header-eyebrow {
    font-size: 0.65rem; font-weight: 500; letter-spacing: 0.2em;
    text-transform: uppercase; color: #84a98c;
  }
  .header-title {
    font-family: 'Cormorant Garamond', serif; font-weight: 400;
    font-size: 1.85rem; color: #2f3e46; line-height: 1.15; letter-spacing: -0.02em;
    margin: 0;
  }
  .header-subtitle {
    font-size: 0.82rem; color: #7a8e84; font-weight: 300; margin: 0;
  }

  .header-actions {
    display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
  }

  /* ── Buttons ── */
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
  .btn-secondary {
    background: #fff; color: #354f52;
    border: 1px solid #d4ddd6;
  }
  .btn-secondary:hover { background: #f0f5f2; border-color: #84a98c; color: #2f3e46; }
  .btn-success {
    background: linear-gradient(135deg, #52796f 0%, #6b8e7f 100%);
    color: #fff;
    box-shadow: 0 3px 12px rgba(82,121,111,0.25);
  }
  .btn-success:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(82,121,111,0.32); }
  .btn-ghost {
    background: transparent; color: #52796f;
    border: 1px solid #d4ddd6;
  }
  .btn-ghost:hover { background: #f0f5f2; border-color: #84a98c; }

  /* ── Zoom controls ── */
  .zoom-divider {
    width: 1px; height: 28px; background: #d4ddd6; margin: 0 0.25rem;
  }
  .zoom-cluster {
    display: flex; align-items: center; gap: 0.4rem;
    background: #f7f8f6;
    border: 1px solid #eaefeb;
    border-radius: 10px;
    padding: 0.3rem 0.5rem;
  }
  .zoom-icon-btn {
    background: transparent; border: none; cursor: pointer;
    width: 32px; height: 32px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    color: #52796f; transition: background 0.2s, color 0.2s;
    -webkit-tap-highlight-color: transparent;
  }
  .zoom-icon-btn:hover { background: #eaefeb; color: #2f3e46; }
  .zoom-readout {
    display: flex; flex-direction: column; align-items: center;
    min-width: 4rem; padding: 0 0.3rem;
  }
  .zoom-percent {
    font-size: 0.7rem; font-weight: 600; color: #354f52;
    letter-spacing: 0.04em;
  }
  .zoom-slider {
    -webkit-appearance: none; appearance: none;
    width: 60px; height: 3px;
    background: #d4ddd6;
    border-radius: 3px;
    outline: none;
    margin-top: 4px;
  }
  .zoom-slider::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 12px; height: 12px;
    border-radius: 50%;
    background: #52796f;
    cursor: pointer;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(47,62,70,0.2);
  }
  .zoom-slider::-moz-range-thumb {
    width: 12px; height: 12px;
    border-radius: 50%;
    background: #52796f; cursor: pointer;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(47,62,70,0.2);
  }

  /* ── Pending changes banner ── */
  .pending-banner {
    margin-top: 1.1rem;
    border-left: 3px solid #b89758;
    background: linear-gradient(135deg, #fdf8ed, #fbf2dd);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    display: flex; align-items: center; gap: 0.6rem;
  }
  .pending-icon {
    width: 22px; height: 22px; border-radius: 50%;
    background: rgba(184,151,88,0.18);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .pending-text {
    font-size: 0.8rem; color: #6b5524; font-weight: 400; line-height: 1.5; margin: 0;
  }

  /* ══════════════════════════════════════
     CANVAS
  ══════════════════════════════════════ */
  .canvas-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 16px;
    padding: 2.5rem 2rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    overflow: auto;
    min-height: 75vh;
    max-height: calc(100vh - 240px);
    position: relative;
  }
  .canvas-bg-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(132,169,140,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(132,169,140,0.05) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
    opacity: 0.6;
  }
  .canvas-inner {
    display: inline-flex;
    min-width: 100%;
    justify-content: center;
    padding: 2rem;
    transition: transform 0.25s cubic-bezier(0.22,1,0.36,1);
    position: relative;
  }

  /* ── Empty state ── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; text-align: center; padding: 4rem 1rem;
  }
  .empty-icon-wrap {
    width: 76px; height: 76px; border-radius: 50%;
    background: rgba(132,169,140,0.12);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1.25rem;
  }
  .empty-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.55rem; font-weight: 400; color: #2f3e46;
    letter-spacing: -0.01em; margin: 0 0 0.4rem;
  }
  .empty-subtitle {
    font-size: 0.85rem; color: #7a8e84; font-weight: 300;
    line-height: 1.6; margin: 0 0 1.5rem; max-width: 360px;
  }

  /* ══════════════════════════════════════
     EMPLOYEE CARD
  ══════════════════════════════════════ */
  .emp-card {
    background: #fff;
    border-radius: 13px;
    border: 1.5px solid #eaefeb;
    padding: 1.1rem 0.9rem 1rem;
    min-width: 220px; max-width: 240px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
    box-shadow: 0 2px 8px rgba(47,62,70,0.05);
    position: relative;
  }
  .emp-card:hover {
    border-color: #84a98c;
    box-shadow: 0 8px 24px rgba(53,79,82,0.12);
    transform: translateY(-2px);
  }
  .emp-card.is-selected {
    border-color: #52796f;
    box-shadow: 0 0 0 4px rgba(82,121,111,0.15), 0 8px 24px rgba(53,79,82,0.18);
  }
  .emp-card.is-dragging {
    opacity: 0.45;
    transform: scale(0.96);
  }
  .emp-card.is-draggable { cursor: move; }

  .emp-card-inner {
    display: flex; flex-direction: column; align-items: center;
  }
  .emp-name {
    font-size: 0.92rem; font-weight: 600; color: #2f3e46;
    line-height: 1.3; text-align: center; margin: 0.75rem 0 0;
    letter-spacing: -0.005em;
  }
  .emp-title {
    font-size: 0.74rem; color: #52796f; font-weight: 400;
    margin: 0.25rem 0 0; text-align: center; line-height: 1.4;
  }
  .emp-dept {
    font-size: 0.7rem; color: #8fa99a; font-weight: 400;
    margin: 0.15rem 0 0; text-align: center; letter-spacing: 0.02em;
  }
  .emp-reports-pill {
    margin-top: 0.75rem;
    padding: 0.25rem 0.7rem;
    background: rgba(132,169,140,0.14);
    border: 1px solid rgba(132,169,140,0.25);
    border-radius: 999px;
    font-size: 0.68rem; font-weight: 600;
    color: #354f52;
    letter-spacing: 0.04em;
  }

  /* ── Avatar ── */
  .avatar {
    border-radius: 50%;
    background: linear-gradient(135deg, #354f52 0%, #52796f 60%, #84a98c 100%);
    display: flex; align-items: center; justify-content: center;
    color: #cad2c5; font-weight: 600;
    border: 3px solid #fff;
    box-shadow: 0 4px 12px rgba(53,79,82,0.2);
    overflow: hidden; flex-shrink: 0;
  }
  .avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .avatar-sm { width: 36px; height: 36px; font-size: 0.7rem; border-width: 2px; }
  .avatar-md { width: 56px; height: 56px; font-size: 0.85rem; }
  .avatar-lg { width: 72px; height: 72px; font-size: 1.05rem; }

  /* ── Collapse toggle ── */
  .collapse-btn {
    position: absolute;
    bottom: -14px; left: 50%;
    transform: translateX(-50%);
    width: 28px; height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    color: #cad2c5;
    border: 2px solid #fff;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 3px 10px rgba(53,79,82,0.25);
    transition: all 0.2s;
    z-index: 10;
  }
  .collapse-btn:hover {
    background: linear-gradient(135deg, #2f3e46 0%, #354f52 100%);
    transform: translateX(-50%) scale(1.08);
  }

  /* ── Tree connectors ── */
  .tree-node-wrap {
    display: flex; flex-direction: column; align-items: center;
  }
  .tree-children-wrap {
    position: relative;
    margin-top: 3rem;
  }
  .tree-line {
    background: #d4ddd6;
    border-radius: 1px;
  }
  .tree-line-vertical-up {
    position: absolute;
    top: 0; left: 50%;
    width: 1.5px; height: 2rem;
    transform: translate(-50%, -2rem);
  }
  .tree-line-horizontal {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1.5px;
  }
  .tree-line-vertical-child {
    position: absolute;
    top: -2rem; left: 50%;
    width: 1.5px; height: 2rem;
    transform: translateX(-50%);
  }
  .tree-children-row {
    display: flex; gap: 3rem; position: relative;
  }

  /* ══════════════════════════════════════
     MODAL — EMPLOYEE SELECTOR
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
    width: 100%; max-width: 640px; max-height: 88vh;
    overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 32px 64px rgba(47,62,70,0.25);
    animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1);
  }
  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1.1rem 1.25rem;
    border-bottom: 1px solid #eaefeb;
    flex-shrink: 0;
  }
  .modal-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.3rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0;
  }
  .modal-close-btn {
    background: none; border: none; cursor: pointer;
    color: #84a98c;
    width: 36px; height: 36px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
    -webkit-tap-highlight-color: transparent;
  }
  .modal-close-btn:hover { color: #2f3e46; background: #f0f5f2; }

  .modal-search-wrap {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #eaefeb;
    background: #f7f8f6;
  }
  .modal-search-field { position: relative; }
  .modal-search-icon {
    position: absolute; left: 14px; top: 50%;
    transform: translateY(-50%);
    color: #84a98c;
    pointer-events: none;
    display: flex; align-items: center;
  }
  .modal-search-input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.6rem;
    border: 1.5px solid #d4ddd6; border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem; color: #2f3e46;
    background: #fff; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .modal-search-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.85rem 1.25rem 1.1rem;
    -webkit-overflow-scrolling: touch;
  }
  .emp-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .emp-list-item {
    display: flex; align-items: center; gap: 0.85rem;
    padding: 0.75rem 0.9rem;
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 10px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'DM Sans', sans-serif;
    width: 100%;
    -webkit-tap-highlight-color: transparent;
  }
  .emp-list-item:hover {
    background: #f0f5f2;
    border-color: #84a98c;
    transform: translateX(2px);
  }
  .emp-list-info { flex: 1; min-width: 0; }
  .emp-list-name {
    font-size: 0.86rem; font-weight: 600;
    color: #2f3e46; line-height: 1.3;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .emp-list-title {
    font-size: 0.75rem; color: #52796f; font-weight: 400;
    margin-top: 0.15rem;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .emp-list-dept {
    font-size: 0.7rem; color: #8fa99a;
    margin-top: 0.1rem;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .emp-list-empty {
    text-align: center; padding: 3rem 1rem;
    color: #8fa99a; font-size: 0.85rem; font-weight: 300;
  }

  /* ══════════════════════════════════════
     LOADING STATE
  ══════════════════════════════════════ */
  .loading-page {
    min-height: 100vh; background: #f7f8f6;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 1.1rem;
    font-family: 'DM Sans', sans-serif;
  }
  .loading-spinner {
    width: 38px; height: 38px;
    border: 2.5px solid rgba(82,121,111,0.18);
    border-top-color: #52796f;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  .loading-text {
    font-size: 0.82rem; color: #7a8e84; font-weight: 400;
    letter-spacing: 0.02em;
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1023px) {
    .org-root { padding: 1.5rem; }
    .header-card { padding: 1.25rem 1.4rem; }
    .header-title { font-size: 1.65rem; }
    .canvas-card { padding: 2rem 1.25rem; }
  }

  @media (max-width: 767px) {
    .org-root { padding: 1rem; }
    .header-card { padding: 1.1rem; }
    .header-row { flex-direction: column; align-items: stretch; gap: 1rem; }
    .header-title-block { width: 100%; }
    .header-title { font-size: 1.5rem; }
    .header-subtitle { font-size: 0.78rem; }
    .header-actions { width: 100%; justify-content: flex-start; }
    .canvas-card {
      padding: 1.5rem 0.75rem;
      min-height: 65vh;
      max-height: calc(100vh - 280px);
    }
    .canvas-inner { padding: 1rem; }
    .emp-card { min-width: 200px; max-width: 220px; padding: 1rem 0.75rem 0.9rem; }
    .tree-children-row { gap: 1.5rem; }
  }

  @media (max-width: 479px) {
    .org-root { padding: 0.75rem; }
    .header-card { padding: 1rem 0.9rem; border-radius: 14px; }
    .header-icon-wrap { width: 38px; height: 38px; }
    .header-title { font-size: 1.35rem; }
    .header-eyebrow { font-size: 0.6rem; }

    .btn { font-size: 0.74rem; padding: 0.55rem 0.85rem; min-height: 40px; }
    .zoom-cluster { padding: 0.25rem 0.4rem; }

    .canvas-card { padding: 1.25rem 0.5rem; border-radius: 14px; }
    .emp-card { min-width: 180px; max-width: 200px; }
    .emp-name { font-size: 0.85rem; }
    .emp-title { font-size: 0.7rem; }
    .emp-dept { font-size: 0.65rem; }
    .tree-children-row { gap: 1rem; }
    .tree-children-wrap { margin-top: 2.5rem; }

    .modal-search-input { font-size: 16px; }
    .modal-overlay { padding: 0; align-items: flex-end; }
    .modal-box { border-radius: 20px 20px 0 0; max-height: 92vh; }
  }
`;

// ── Avatar ─────────────────────────────────────────────────────────
const Avatar = ({ employee, size = 'md' }) => {
  const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();
  return (
    <div className={`avatar avatar-${size}`}>
      {employee.avatar ? (
        <img src={employee.avatar} alt={`${employee.firstName} ${employee.lastName}`} />
      ) : (
        initials
      )}
    </div>
  );
};

// ── Employee Card ──────────────────────────────────────────────────
const EmployeeCard = ({ employee, onClick, isSelected, isDragging, canDrag, onDragStart }) => {
  const directReportsCount = employee.directReports?.length || 0;

  const cardClasses = [
    'emp-card',
    isSelected ? 'is-selected' : '',
    isDragging ? 'is-dragging' : '',
    canDrag ? 'is-draggable' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      draggable={canDrag}
      onClick={onClick}
      onDragStart={onDragStart}
      className={cardClasses}
    >
      <div className="emp-card-inner">
        <Avatar employee={employee} size="md" />
        <h3 className="emp-name">
          {employee.firstName} {employee.lastName}
        </h3>
        <p className="emp-title">{employee.jobTitle || 'No Title'}</p>
        <p className="emp-dept">{employee.department || 'No Department'}</p>

        {directReportsCount > 0 && (
          <div className="emp-reports-pill">
            {directReportsCount} {directReportsCount === 1 ? 'report' : 'reports'}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Tree Node (Recursive) ──────────────────────────────────────────
const TreeNode = ({
  employee,
  level = 0,
  isEditable,
  onEmployeeClick,
  selectedEmployee,
  draggedEmployee,
  onDragStart,
  onDragOver,
  onDrop,
  collapsedNodes,
  onToggleCollapse
}) => {
  const hasReports = employee.directReports && employee.directReports.length > 0;
  const isCollapsed = collapsedNodes.includes(employee.id);
  const isDragging = draggedEmployee?.id === employee.id;

  return (
    <div className="tree-node-wrap">
      <div style={{ position: 'relative' }}>
        <EmployeeCard
          employee={employee}
          onClick={() => onEmployeeClick(employee)}
          isSelected={selectedEmployee?.id === employee.id}
          isDragging={isDragging}
          canDrag={isEditable}
          onDragStart={(e) => isEditable && onDragStart(e, employee)}
        />

        {hasReports && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(employee.id);
            }}
            className="collapse-btn"
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed
              ? <ChevronDown style={{ width: 14, height: 14 }} />
              : <ChevronRight style={{ width: 14, height: 14, transform: 'rotate(90deg)' }} />
            }
          </button>
        )}
      </div>

      {!isCollapsed && hasReports && (
        <div className="tree-children-wrap">
          {/* Vertical line from parent */}
          <div className="tree-line tree-line-vertical-up"></div>

          {/* Horizontal line connecting children when more than one */}
          {employee.directReports.length > 1 && (
            <div className="tree-line tree-line-horizontal"></div>
          )}

          <div className="tree-children-row">
            {employee.directReports.map((report) => (
              <div key={report.id} style={{ position: 'relative' }}>
                <div className="tree-line tree-line-vertical-child"></div>
                <div
                  onDragOver={(e) => isEditable && onDragOver(e, report)}
                  onDrop={(e) => isEditable && onDrop(e, report)}
                >
                  <TreeNode
                    employee={report}
                    level={level + 1}
                    isEditable={isEditable}
                    onEmployeeClick={onEmployeeClick}
                    selectedEmployee={selectedEmployee}
                    draggedEmployee={draggedEmployee}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    collapsedNodes={collapsedNodes}
                    onToggleCollapse={onToggleCollapse}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Employee Selection Modal ───────────────────────────────────────
const EmployeeSelectionPanel = ({ employees, onSelectEmployee, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = employees.filter(emp =>
    `${emp.firstName} ${emp.lastName} ${emp.jobTitle} ${emp.department}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-box">
        <div className="modal-header">
          <h3 className="modal-title">Select New Manager</h3>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="modal-search-wrap">
          <div className="modal-search-field">
            <span className="modal-search-icon">
              <Search style={{ width: 16, height: 16 }} />
            </span>
            <input
              type="text"
              placeholder="Search by name, title, or department"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="modal-search-input"
              autoFocus
            />
          </div>
        </div>

        <div className="modal-body">
          {filteredEmployees.length > 0 ? (
            <div className="emp-list">
              {filteredEmployees.map(employee => (
                <button
                  key={employee.id}
                  onClick={() => onSelectEmployee(employee)}
                  className="emp-list-item"
                  type="button"
                >
                  <Avatar employee={employee} size="sm" />
                  <div className="emp-list-info">
                    <div className="emp-list-name">
                      {employee.firstName} {employee.lastName}
                    </div>
                    <div className="emp-list-title">{employee.jobTitle || 'No Title'}</div>
                    <div className="emp-list-dept">{employee.department || 'No Department'}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="emp-list-empty">
              No employees found{searchTerm ? ` matching "${searchTerm}"` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────
const OrganizationalChartNew = () => {
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isEditable, setIsEditable] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [allEmployees, setAllEmployees] = useState([]);
  const [orgChartData, setOrgChartData] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [draggedEmployee, setDraggedEmployee] = useState(null);
  const [showEmployeeSelector, setShowEmployeeSelector] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState([]);
  const [pendingChanges, setPendingChanges] = useState(new Map());

  useEffect(() => {
    fetchOrganizationalChart();
  }, []);

  const fetchOrganizationalChart = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/employees/org-chart');

      if (response.data.success) {
        const normalizeEmployee = (emp) => ({
          ...emp,
          id: emp._id?.toString() || emp._id || emp.id,
          directReports: emp.directReports?.map(normalizeEmployee) || []
        });

        const normalizedData = (response.data.data || []).map(normalizeEmployee);
        setOrgChartData(normalizedData);
      }
    } catch (error) {
      console.error('Error fetching org chart:', error);
      toast.error('Failed to load organizational chart');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      const response = await axios.get('/api/employees/hub/all');
      if (response.data.success) {
        const normalized = (response.data.data || []).map(emp => ({
          ...emp,
          id: emp._id?.toString() || emp._id || emp.id
        }));
        setAllEmployees(normalized);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const handleEditToggle = async () => {
    if (!isEditable) {
      await fetchAllEmployees();
      setIsEditable(true);
    } else {
      if (hasChanges) {
        if (window.confirm('You have unsaved changes. Do you want to discard them?')) {
          setPendingChanges(new Map());
          setHasChanges(false);
          setIsEditable(false);
          await fetchOrganizationalChart();
        }
      } else {
        setIsEditable(false);
      }
    }
  };

  const handleDragStart = (e, employee) => {
    setDraggedEmployee(employee);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, newManager) => {
    e.preventDefault();

    if (!draggedEmployee || draggedEmployee.id === newManager.id) {
      setDraggedEmployee(null);
      return;
    }

    if (isSubordinate(draggedEmployee, newManager)) {
      toast.error('Cannot create circular reporting relationship!');
      setDraggedEmployee(null);
      return;
    }

    const newChanges = new Map(pendingChanges);
    newChanges.set(draggedEmployee.id, newManager.id);
    setPendingChanges(newChanges);
    setHasChanges(true);

    updateLocalOrgChart(draggedEmployee.id, newManager.id);

    toast.success(`${draggedEmployee.firstName} ${draggedEmployee.lastName} will now report to ${newManager.firstName} ${newManager.lastName}`);
    setDraggedEmployee(null);
  };

  const isSubordinate = (potentialManager, employee) => {
    if (!employee.directReports || employee.directReports.length === 0) {
      return false;
    }

    for (const report of employee.directReports) {
      if (report.id === potentialManager.id) {
        return true;
      }
      if (isSubordinate(potentialManager, report)) {
        return true;
      }
    }

    return false;
  };

  const updateLocalOrgChart = () => {
    fetchOrganizationalChart();
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const managerRelationships = Array.from(pendingChanges.entries()).map(([employeeId, managerId]) => ({
        employeeId,
        managerId
      }));

      const response = await axios.post('/api/employees/org-chart/save', {
        managerRelationships
      });

      if (response.data.success) {
        toast.success('Organizational chart saved successfully!');
        setPendingChanges(new Map());
        setHasChanges(false);
        setIsEditable(false);
        await fetchOrganizationalChart();
      }
    } catch (error) {
      console.error('Error saving org chart:', error);
      toast.error(error.response?.data?.message || 'Failed to save organizational chart');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCollapse = (employeeId) => {
    setCollapsedNodes(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleAssignToRoot = () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee first');
      return;
    }
    setShowEmployeeSelector(true);
  };

  const handleSelectNewManager = (newManager) => {
    if (!selectedEmployee) return;

    if (selectedEmployee.id === newManager.id) {
      toast.error('Employee cannot be their own manager!');
      return;
    }

    if (isSubordinate(selectedEmployee, newManager)) {
      toast.error('Cannot create circular reporting relationship!');
      return;
    }

    const newChanges = new Map(pendingChanges);
    newChanges.set(selectedEmployee.id, newManager.id);
    setPendingChanges(newChanges);
    setHasChanges(true);

    updateLocalOrgChart(selectedEmployee.id, newManager.id);

    toast.success(`${selectedEmployee.firstName} ${selectedEmployee.lastName} will now report to ${newManager.firstName} ${newManager.lastName}`);
    setShowEmployeeSelector(false);
    setSelectedEmployee(null);
  };

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="loading-page">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading organizational chart…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="org-root">
        <div className="org-shell">

          {/* ── Header ── */}
          <div className="header-card anim-fade-up">
            <div className="header-row">
              <div className="header-title-block">
                <div className="header-eyebrow-row">
                  <div className="header-icon-wrap">
                    <Users style={{ width: 22, height: 22, color: '#cad2c5' }} />
                  </div>
                  <span className="header-eyebrow">Workforce Structure</span>
                </div>
                <h1 className="header-title">Organisational Chart</h1>
                <p className="header-subtitle">
                  {isEditable
                    ? 'Drag and drop employees to reorganise the reporting structure.'
                    : "View your organisation's reporting hierarchy."}
                </p>
              </div>

              <div className="header-actions">
                {isEditable && (
                  <>
                    {selectedEmployee && (
                      <button
                        onClick={handleAssignToRoot}
                        className="btn btn-success"
                        type="button"
                      >
                        Change Manager
                      </button>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={!hasChanges}
                      className="btn btn-primary"
                      type="button"
                    >
                      <Save style={{ width: 14, height: 14 }} />
                      Save Changes
                    </button>
                  </>
                )}

                <button
                  onClick={handleEditToggle}
                  className={`btn ${isEditable ? 'btn-secondary' : 'btn-primary'}`}
                  type="button"
                >
                  {isEditable ? (
                    <>
                      <X style={{ width: 14, height: 14 }} />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Edit3 style={{ width: 14, height: 14 }} />
                      Edit
                    </>
                  )}
                </button>

                <div className="zoom-divider"></div>

                <div className="zoom-cluster">
                  <button
                    onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}
                    className="zoom-icon-btn"
                    title="Zoom out"
                    type="button"
                    aria-label="Zoom out"
                  >
                    <ZoomOut style={{ width: 16, height: 16 }} />
                  </button>
                  <div className="zoom-readout">
                    <span className="zoom-percent">{Math.round(zoom * 100)}%</span>
                    <input
                      type="range"
                      min="0.2"
                      max="2"
                      step="0.1"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="zoom-slider"
                      aria-label="Zoom level"
                    />
                  </div>
                  <button
                    onClick={() => setZoom(z => Math.min(2, z + 0.1))}
                    className="zoom-icon-btn"
                    title="Zoom in"
                    type="button"
                    aria-label="Zoom in"
                  >
                    <ZoomIn style={{ width: 16, height: 16 }} />
                  </button>
                  <div style={{ width: 1, height: 20, background: '#d4ddd6', margin: '0 0.1rem' }}></div>
                  <button
                    onClick={() => setZoom(1)}
                    className="zoom-icon-btn"
                    title="Reset zoom"
                    type="button"
                    style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', width: 'auto', padding: '0 0.55rem' }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {hasChanges && (
              <div className="pending-banner anim-fade-up">
                <div className="pending-icon">
                  <svg style={{ width: 12, height: 12, color: '#b89758' }} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="pending-text">
                  You have <strong>{pendingChanges.size}</strong> unsaved change{pendingChanges.size !== 1 ? 's' : ''}. Don't forget to save.
                </p>
              </div>
            )}
          </div>

          {/* ── Canvas ── */}
          <div className="canvas-card anim-fade-up delay-100">
            <div className="canvas-bg-grid"></div>

            {orgChartData.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon-wrap">
                  <Users style={{ width: 36, height: 36, color: '#84a98c' }} />
                </div>
                <h3 className="empty-title">No Organisational Structure</h3>
                <p className="empty-subtitle">
                  Start building your org chart by adding employees and assigning managers.
                </p>
                {isEditable && (
                  <button
                    onClick={() => setShowEmployeeSelector(true)}
                    className="btn btn-primary"
                    type="button"
                  >
                    Add Employee to Chart
                  </button>
                )}
              </div>
            ) : (
              <div
                className="canvas-inner"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  width: zoom < 1 ? `${100 / zoom}%` : 'auto'
                }}
              >
                <div style={{ display: 'flex', gap: '3rem' }}>
                  {orgChartData.map(rootEmployee => (
                    <TreeNode
                      key={rootEmployee.id}
                      employee={rootEmployee}
                      isEditable={isEditable}
                      onEmployeeClick={setSelectedEmployee}
                      selectedEmployee={selectedEmployee}
                      draggedEmployee={draggedEmployee}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      collapsedNodes={collapsedNodes}
                      onToggleCollapse={handleToggleCollapse}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Modal ── */}
      {showEmployeeSelector && (
        <EmployeeSelectionPanel
          employees={allEmployees}
          onSelectEmployee={handleSelectNewManager}
          onClose={() => setShowEmployeeSelector(false)}
        />
      )}
    </>
  );
};

export default OrganizationalChartNew;