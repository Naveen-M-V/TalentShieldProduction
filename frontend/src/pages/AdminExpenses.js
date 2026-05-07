import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { format } from 'date-fns';
import ModernDatePicker from '../components/ModernDatePicker';
import ExpenseDetailsModal from '../components/ExpenseDetailsModal';
import AddExpense from './AddExpense';
import { useAuth } from '../context/AuthContext';
import { Popover, PopoverTrigger, PopoverContent } from '../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ChevronLeft, ChevronRight, Plus, Eye, Check, X, FileText, RotateCcw, Search } from 'lucide-react';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .ax-root {
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
  .ax-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
    height: 600px;
  }
  .ax-shell {
    position: relative; z-index: 1;
    max-width: 100%;
    margin: 0 auto;
    min-width: 0;
  }

  /* ── Keyframes ── */
  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
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
    display: flex; align-items: center; gap: 0.5rem;
    flex-wrap: wrap;
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
  .btn-success {
    background: linear-gradient(135deg, #52796f 0%, #6b8e7f 100%);
    color: #fff;
    box-shadow: 0 3px 10px rgba(82,121,111,0.22);
  }
  .btn-success:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 5px 14px rgba(82,121,111,0.3);
  }
  .btn-danger {
    background: linear-gradient(135deg, #a35446 0%, #b85c50 100%);
    color: #fff;
    box-shadow: 0 3px 12px rgba(163,84,70,0.22);
  }
  .btn-danger:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 6px 18px rgba(163,84,70,0.3);
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
  .btn-xs {
    font-size: 0.66rem; padding: 0.32rem 0.6rem; min-height: 28px;
    border-radius: 6px;
    letter-spacing: 0.04em;
  }
  .btn-block { width: 100%; }

  /* ══════════════════════════════════════
     POPOVER
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
     MANAGER TABS
  ══════════════════════════════════════ */
  .tab-row {
    display: flex; align-items: center;
    gap: 0.25rem;
    border-bottom: 1px solid #eaefeb;
    margin-bottom: 1rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 0 0.1rem;
  }
  .tab-row::-webkit-scrollbar { display: none; }
  .tab-btn {
    background: none;
    border: none;
    padding: 0.7rem 1rem;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem;
    font-weight: 500;
    color: #7a8e84;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    display: inline-flex; align-items: center; gap: 0.4rem;
    white-space: nowrap;
    flex-shrink: 0;
    margin-bottom: -1px;
    -webkit-tap-highlight-color: transparent;
  }
  .tab-btn:hover { color: #354f52; }
  .tab-btn.is-active {
    color: #354f52;
    font-weight: 600;
    border-bottom-color: #52796f;
    background: linear-gradient(180deg, transparent 0%, rgba(132,169,140,0.05) 100%);
  }

  /* ══════════════════════════════════════
     FILTER CARD
  ══════════════════════════════════════ */
  .filter-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 1rem 1.1rem;
    margin-bottom: 0.85rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
  }
  .filter-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.85rem;
  }
  @media (min-width: 640px) { .filter-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .filter-grid { grid-template-columns: repeat(6, 1fr); } }

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
    min-height: 38px;
  }
  .text-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .text-input::placeholder { color: #b6c0b9; }

  .reset-btn-wrap {
    display: flex; align-items: flex-end;
  }
  @media (min-width: 640px) and (max-width: 1023px) {
    .reset-btn-wrap { grid-column: span 2; }
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
  .td-strong { font-weight: 500; color: #2f3e46; }
  .td-muted { color: #7a8e84; }
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
  .status-pending {
    --pill-bg: rgba(184,151,88,0.12);
    --pill-border: rgba(184,151,88,0.25);
    --pill-text: #6b5524;
  }
  .status-approved {
    --pill-bg: rgba(82,121,111,0.12);
    --pill-border: rgba(82,121,111,0.25);
    --pill-text: #2f4a32;
  }
  .status-rejected {
    --pill-bg: rgba(192,117,106,0.12);
    --pill-border: rgba(192,117,106,0.25);
    --pill-text: #7a3028;
  }
  .status-paid {
    --pill-bg: rgba(111,140,152,0.12);
    --pill-border: rgba(111,140,152,0.25);
    --pill-text: #354f52;
  }
  .status-default {
    --pill-bg: #fafbfa;
    --pill-border: #eaefeb;
    --pill-text: #7a8e84;
  }

  .row-actions {
    display: flex; gap: 0.35rem;
    align-items: center;
  }
  .icon-btn {
    background: none; border: none; cursor: pointer;
    width: 30px; height: 30px;
    border-radius: 7px;
    display: inline-flex; align-items: center; justify-content: center;
    color: #84a98c;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .icon-btn.is-view { color: #52796f; }
  .icon-btn.is-view:hover { background: rgba(82,121,111,0.10); color: #354f52; }

  /* Hide low-priority columns at narrower widths */
  @media (max-width: 1199px) {
    .col-approver { display: none; }
  }
  @media (max-width: 1023px) {
    .col-submitted { display: none; }
  }
  @media (max-width: 879px) {
    .col-type { display: none; }
  }
  @media (max-width: 767px) {
    .desktop-table { display: none; }
  }
  @media (min-width: 768px) {
    .mobile-cards { display: none; }
  }

  /* ══════════════════════════════════════
     MOBILE CARDS
  ══════════════════════════════════════ */
  .mobile-cards {
    display: flex; flex-direction: column;
  }
  .mob-card {
    padding: 0.95rem 1rem;
    border-bottom: 1px solid #eaefeb;
    display: flex; flex-direction: column; gap: 0.7rem;
  }
  .mob-card:last-child { border-bottom: none; }
  .mob-card-head {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 0.7rem;
  }
  .mob-title {
    font-size: 0.88rem; font-weight: 600;
    color: #2f3e46;
    line-height: 1.3;
    margin: 0;
  }
  .mob-by {
    font-size: 0.72rem; color: #7a8e84;
    margin: 0.2rem 0 0;
  }
  .mob-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.55rem 0.85rem;
  }
  .mob-cell-key {
    font-size: 0.55rem; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #84a98c;
    margin: 0 0 0.18rem;
  }
  .mob-cell-val {
    font-size: 0.78rem; color: #2f3e46; font-weight: 500;
    line-height: 1.3;
  }
  .mob-cell-val.is-amount {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .mob-approver {
    grid-column: span 2;
    background: #fafbfa;
    border-radius: 6px;
    padding: 0.4rem 0.55rem;
  }
  .mob-actions {
    display: flex; gap: 0.45rem;
    padding-top: 0.55rem;
    border-top: 1px solid #eaefeb;
  }
  .mob-actions.is-stack { flex-direction: column; }
  .mob-actions .btn { flex: 1; }

  /* ══════════════════════════════════════
     EMPTY / LOADING
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
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.95rem; font-weight: 500;
    color: #2f3e46;
    margin: 0 0.1rem;
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
    animation: scaleIn 0.25s cubic-bezier(0.22,1,0.36,1);
    -webkit-overflow-scrolling: touch;
  }
  @media (max-width: 479px) {
    .add-modal-overlay { padding: 0; align-items: flex-end; }
    .add-modal-box {
      border-radius: 18px 18px 0 0;
      max-height: 94vh;
    }
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1023px) {
    .ax-root { padding: 1.25rem; }
    .header-title { font-size: 1.5rem; }
  }
  @media (max-width: 767px) {
    .ax-root { padding: 0.85rem; }
    .header-title { font-size: 1.3rem; }
    .header-icon-wrap { width: 34px; height: 34px; border-radius: 9px; }
    .filter-card { padding: 0.85rem; }
  }
  @media (max-width: 479px) {
    .ax-root { padding: 0.65rem; }
    .header-title { font-size: 1.2rem; }
    .text-input { font-size: 16px; }
  }
`;

const AdminExpenses = () => {
  const { user } = useAuth();
  const isManagerUser = ['manager', 'senior-manager', 'hr'].includes(String(user?.role || '').toLowerCase());
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState('receipt');
  const [managerTab, setManagerTab] = useState('team-approvals');
  const [filters, setFilters] = useState({
    employeeId: '',
    category: '',
    tags: '',
    status: '',
    fromDate: '',
    toDate: '',
    page: 1,
    limit: 25
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 25 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, user?.role, managerTab]);

  const fetchEmployees = async () => {
    try {
      const res = isManagerUser
        ? await axios.get('/api/manager/team/members', { params: { includeIndirect: 'true' } })
        : await axios.get('/api/employees');

      let data = res.data;
      if (data && data.data) data = data.data;
      if (!Array.isArray(data)) {
        data = [];
      }
      setEmployees(data);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      params.page = filters.page || 1;
      params.limit = filters.limit || 25;

      const endpoint = isManagerUser
        ? (managerTab === 'my-submitted' ? '/api/expenses' : '/api/manager/approvals/pending')
        : '/api/expenses/approvals';

      const res = await axios.get(endpoint, { params });
      let payload = res.data;

      if (payload && payload.data) payload = payload.data;

      const expenseList = Array.isArray(payload?.expenses)
        ? payload.expenses
        : Array.isArray(payload?.pendingApprovals?.expenses)
        ? payload.pendingApprovals.expenses
        : Array.isArray(payload)
        ? payload
        : [];

      setExpenses(expenseList);

      if (payload?.pagination) {
        setPagination(payload.pagination);
      } else {
        setPagination({
          total: expenseList.length,
          page: params.page,
          pages: 1,
          limit: params.limit
        });
      }
    } catch (err) {
      console.error('Failed to fetch expenses', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const handleCategoryTagChange = (value) => {
    setFilters(prev => ({ ...prev, tags: value, category: value, page: 1 }));
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this expense?')) return;
    try {
      await axios.post(`/api/expenses/${id}/approve`);
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve');
      fetchExpenses();
    }
  };

  const handleDecline = async (id) => {
    const reason = window.prompt('Reason for declining:');
    if (!reason) return;
    try {
      await axios.post(`/api/expenses/${id}/decline`, { reason });
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to decline');
      fetchExpenses();
    }
  };

  const [viewingId, setViewingId] = useState(null);

  const formatClaimTypeLabel = (claimTypeOrCategory) => {
    const raw = (claimTypeOrCategory || '').toString().trim();
    if (!raw) return '';
    const normalized = raw.toLowerCase();
    if (normalized === 'receipt') return 'Receipts';
    if (normalized === 'mileage') return 'Mileage';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  const formatStatusLabel = (status) => {
    const normalized = (status || '').toString().trim().toLowerCase();
    if (normalized === 'declined') return 'Rejected';
    if (!normalized) return '';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const getStatusPillClass = (status) => {
    const normalized = (status || '').toString().trim().toLowerCase();
    switch (normalized) {
      case 'pending': return 'status-pill status-pending';
      case 'approved': return 'status-pill status-approved';
      case 'declined': return 'status-pill status-rejected';
      case 'paid': return 'status-pill status-paid';
      default: return 'status-pill status-default';
    }
  };

  const resolvePersonName = (person) => {
    if (!person) return '';
    if (typeof person === 'string') return person.trim();

    const first = (person.firstName || person.first_name || '').toString().trim();
    const last = (person.lastName || person.last_name || '').toString().trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;

    return (person.name || person.fullName || '').toString().trim();
  };

  const getApprovedByDisplay = (expense) => {
    if (!expense) return '—';
    const status = (expense.status || '').toString().trim().toLowerCase();
    if (status !== 'approved' && status !== 'paid' && status !== 'declined') return '—';

    const primary = status === 'paid'
      ? expense.paidBy
      : status === 'declined'
      ? expense.declinedBy
      : expense.approvedBy;
    const secondary = status === 'paid'
      ? expense.approvedBy
      : status === 'declined'
      ? expense.approvedBy
      : expense.paidBy;

    return resolvePersonName(primary) || resolvePersonName(secondary) || '—';
  };

  const getSubmittedByDisplay = (expense) => {
    if (!expense) return '—';

    const submittedByName = resolvePersonName(expense.submittedBy);
    if (submittedByName) return submittedByName;

    const employeeName = resolvePersonName(expense.employee);
    if (employeeName) return employeeName;

    const currentUserName = resolvePersonName(user);
    return currentUserName || '—';
  };

  const formatSubmittedDate = (exp) => {
    if (exp.submittedOn) {
      try { return format(new Date(exp.submittedOn), 'dd/MM/yyyy'); } catch { /* noop */ }
    }
    if (exp.date) {
      try { return format(new Date(exp.date), 'dd/MM/yyyy'); } catch { /* noop */ }
    }
    return '—';
  };

  const canApproveRows = !isManagerUser || managerTab === 'team-approvals';

  return (
    <>
      <style>{styles}</style>
      <div className="ax-root">
        <div className="ax-shell">

          {/* ── Page Header ── */}
          <div className="page-header anim-fade-up">
            <div className="header-block">
              <div className="header-icon-wrap">
                <svg style={{ width: 18, height: 18, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="header-eyebrow">Approvals · Admin</p>
                <h1 className="header-title">Expenses</h1>
                <p className="header-subtitle">
                  <span>
                    {isManagerUser
                      ? 'Review your team\'s claims and submit your own.'
                      : 'Review and approve company expense claims.'}
                  </span>
                  {isManagerUser
                    ? <span className="role-badge">Team Approval</span>
                    : <span className="role-badge">Admin Review</span>}
                </p>
              </div>
            </div>

            {isManagerUser && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="btn btn-success" type="button">
                    <Plus size={14} />
                    Add new claim
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-44" align="end" style={{ padding: 0 }}>
                  <button
                    onClick={() => { setAddType('receipt'); setShowAddForm(true); }}
                    className="pop-menu-item"
                    type="button"
                  >
                    <FileText size={14} style={{ color: '#84a98c' }} />
                    Receipts
                  </button>
                  <button
                    onClick={() => { setAddType('mileage'); setShowAddForm(true); }}
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

          {/* ── Manager tabs ── */}
          {isManagerUser && (
            <div className="tab-row anim-fade-up delay-100">
              <button
                type="button"
                onClick={() => setManagerTab('team-approvals')}
                className={`tab-btn ${managerTab === 'team-approvals' ? 'is-active' : ''}`}
              >
                Team expense approvals
              </button>
              <button
                type="button"
                onClick={() => setManagerTab('my-submitted')}
                className={`tab-btn ${managerTab === 'my-submitted' ? 'is-active' : ''}`}
              >
                My submitted expenses
              </button>
            </div>
          )}

          {/* ── Filter card ── */}
          <div className="filter-card anim-fade-up delay-100">
            <div className="filter-grid">
              {/* Employee */}
              <div>
                <label className="field-label">
                  <Search size={11} />
                  Employee
                </label>
                <Select
                  value={filters.employeeId || 'all'}
                  onValueChange={(v) => handleFilterChange('employeeId', v === 'all' ? '' : v)}
                >
                  <SelectTrigger style={{ width: '100%', minHeight: 38 }}>
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp._id} value={String(emp._id)}>
                        {emp.firstName} {emp.lastName}{emp.employeeId ? ` (${emp.employeeId})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category / Tag */}
              <div>
                <label className="field-label">Category / Tag</label>
                <input
                  type="text"
                  value={filters.tags}
                  onChange={(e) => handleCategoryTagChange(e.target.value)}
                  placeholder="Search…"
                  className="text-input"
                />
              </div>

              {/* Status */}
              <div>
                <label className="field-label">Status</label>
                <Select
                  value={filters.status || 'any'}
                  onValueChange={(v) => handleFilterChange('status', v === 'any' ? '' : v)}
                >
                  <SelectTrigger style={{ width: '100%', minHeight: 38 }}>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="declined">Rejected</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* From */}
              <div>
                <ModernDatePicker
                  name="fromDate"
                  label={"From"}
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                />
              </div>

              {/* To */}
              <div>
                <ModernDatePicker
                  name="toDate"
                  label={"To"}
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                />
              </div>

              {/* Reset */}
              <div className="reset-btn-wrap">
                <button
                  onClick={() => {
                    setFilters({ employeeId: '', category: '', tags: '', status: '', fromDate: '', toDate: '', page: 1, limit: filters.limit });
                    fetchExpenses();
                  }}
                  className="btn btn-secondary btn-block"
                  type="button"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* ── Data card ── */}
          <div className="data-card anim-fade-up delay-200">
            {loading ? (
              <div className="state-pad">
                <div className="spinner"></div>
                <p className="spinner-text">Loading expenses…</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="state-pad">
                <div className="empty-icon-wrap">
                  <FileText style={{ width: 28, height: 28 }} />
                </div>
                <h3 className="empty-title">Nothing to see here</h3>
                <p className="empty-text">There are no expenses to review.</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="mobile-cards">
                  {expenses.map((exp) => (
                    <div key={exp._id} className="mob-card">
                      <div className="mob-card-head">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="mob-title">{formatClaimTypeLabel(exp.claimType || exp.category)}</p>
                          <p className="mob-by">{getSubmittedByDisplay(exp)}</p>
                        </div>
                        <span className={getStatusPillClass(exp.status)}>
                          <span className="status-dot"></span>
                          {formatStatusLabel(exp.status)}
                        </span>
                      </div>

                      <div className="mob-grid">
                        <div>
                          <p className="mob-cell-key">Submitted</p>
                          <p className="mob-cell-val">{formatSubmittedDate(exp)}</p>
                        </div>
                        <div>
                          <p className="mob-cell-key">Total</p>
                          <p className="mob-cell-val is-amount">
                            {exp.currency && (
                              <span className="td-currency" style={{ fontSize: '0.6rem' }}>{exp.currency}</span>
                            )}
                            {exp.totalAmount != null ? Number(exp.totalAmount).toFixed(2) : '—'}
                          </p>
                        </div>
                        {(exp.status === 'approved' || exp.status === 'paid' || exp.status === 'declined') && (
                          <div className="mob-approver">
                            <p className="mob-cell-key">
                              {exp.status === 'paid' ? 'Paid by' : exp.status === 'declined' ? 'Declined by' : 'Approved by'}
                            </p>
                            <p className="mob-cell-val" style={{ fontSize: '0.74rem' }}>
                              {getApprovedByDisplay(exp)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className={`mob-actions ${canApproveRows && exp.status === 'pending' ? 'is-stack' : ''}`}>
                        <button
                          onClick={() => setViewingId(exp._id)}
                          className="btn btn-secondary"
                          type="button"
                        >
                          <Eye size={13} />
                          View Details
                        </button>
                        {canApproveRows && exp.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '0.45rem' }}>
                            <button
                              onClick={() => handleApprove(exp._id)}
                              className="btn btn-success"
                              style={{ flex: 1 }}
                              type="button"
                            >
                              <Check size={13} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleDecline(exp._id)}
                              className="btn btn-danger"
                              style={{ flex: 1 }}
                              type="button"
                            >
                              <X size={13} />
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="desktop-table">
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="col-type">Type</th>
                          <th>Status</th>
                          <th>Submitted By</th>
                          <th className="col-submitted">Submitted On</th>
                          <th>Total</th>
                          <th className="col-approver">Approved By</th>
                          <th>Options</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((exp) => (
                          <tr key={exp._id}>
                            <td className="td-muted col-type">
                              {formatClaimTypeLabel(exp.claimType || exp.category)}
                            </td>
                            <td>
                              <span className={getStatusPillClass(exp.status)}>
                                <span className="status-dot"></span>
                                {formatStatusLabel(exp.status)}
                              </span>
                            </td>
                            <td className="td-strong">
                              {getSubmittedByDisplay(exp)}
                            </td>
                            <td className="td-muted col-submitted">
                              {formatSubmittedDate(exp)}
                            </td>
                            <td className="td-amount">
                              {exp.currency && (
                                <span className="td-currency">{exp.currency}</span>
                              )}
                              {exp.totalAmount != null ? Number(exp.totalAmount).toFixed(2) : '—'}
                            </td>
                            <td className="td-muted col-approver">
                              {(exp.status === 'approved' || exp.status === 'paid' || exp.status === 'declined')
                                ? getApprovedByDisplay(exp)
                                : '—'}
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  onClick={() => setViewingId(exp._id)}
                                  className="icon-btn is-view"
                                  title="View details"
                                  type="button"
                                >
                                  <Eye size={14} />
                                </button>
                                {canApproveRows && exp.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(exp._id)}
                                      className="btn btn-soft-success btn-xs"
                                      type="button"
                                    >
                                      <Check size={11} />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleDecline(exp._id)}
                                      className="btn btn-soft-danger btn-xs"
                                      type="button"
                                    >
                                      <X size={11} />
                                      Decline
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="pagination-row">
                    <div className="pagination-info">
                      Showing
                      <span className="count">{(pagination.page - 1) * pagination.limit + 1}</span>
                      to
                      <span className="count">{Math.min(pagination.page * pagination.limit, pagination.total)}</span>
                      of
                      <span className="count">{pagination.total}</span>
                      results
                    </div>
                    <div className="pagination-controls">
                      <button
                        onClick={() => handleFilterChange('page', Math.max(1, pagination.page - 1))}
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
                        onClick={() => handleFilterChange('page', Math.min(pagination.pages, pagination.page + 1))}
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
              </>
            )}
          </div>
        </div>
      </div>

      {viewingId && (
        <div style={{ position: 'relative', zIndex: 60 }}>
          <ExpenseDetailsModal
            id={viewingId}
            onClose={() => { setViewingId(null); fetchExpenses(); }}
            onUpdated={() => { setViewingId(null); fetchExpenses(); }}
          />
        </div>
      )}

      {/* Embedded Add Expense modal */}
      {showAddForm && (
        <div
          className="add-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddForm(false); }}
        >
          <div className="add-modal-box">
            <div style={{ padding: '1rem' }}>
              <AddExpense
                embed
                initialType={addType}
                onClose={(opts) => {
                  setShowAddForm(false);
                  if (opts && opts.created) {
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

export default AdminExpenses;