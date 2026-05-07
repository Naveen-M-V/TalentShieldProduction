import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// â”€â”€â”€ Auth helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const authConfig = () => {
  const token = localStorage.getItem('auth_token');
  return {
    withCredentials: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  };
};

// --- API helpers ---
const api = {
  getMyGoals: () => axios.get('/api/goals/my', authConfig()),
  createGoal: (data) => axios.post('/api/goals', data, authConfig()),
  updateGoal: (id, data) => axios.put(`/api/goals/${id}`, data, authConfig()),
  deleteGoal: (id) => axios.delete(`/api/goals/${id}`, authConfig()),
  approveObjective: (id) => axios.post(`/api/goals/${id}/approve-objective`, {}, authConfig()),
  sendBackObjective: (id, reason) => axios.post(`/api/goals/${id}/send-back`, { reason }, authConfig()),
  submitInput: (id, text) => axios.post(`/api/goals/${id}/input`, { text }, authConfig()),
  getMyReviews: () => axios.get('/api/reviews/my', authConfig()),
  addComment: (id, comment) => axios.post(`/api/reviews/${id}/comment`, { comment }, authConfig()),
};

// --- Helpers ---
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const APPROVAL_CONFIG = {
  pending:   { label: 'Awaiting Approval', cls: 'bg-yellow-100 text-yellow-800' },
  approved:  { label: 'Approved',          cls: 'bg-green-100 text-green-800'  },
  sent_back: { label: 'Sent Back',         cls: 'bg-orange-100 text-orange-800' }
};
const STATUS_CONFIG = {
  TO_DO:       { label: 'To Do',       cls: 'bg-gray-100 text-gray-700'  },
  IN_PROGRESS: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700'  },
  ACHIEVED:    { label: 'Achieved',    cls: 'bg-green-100 text-green-700'},
  OVERDUE:     { label: 'Overdue',     cls: 'bg-red-100 text-red-700'    }
};
const RATING_CONFIG = {
  1: { label: '1 - DNM',                 cls: 'bg-red-100 text-red-800'    },
  2: { label: '2 - PME',                 cls: 'bg-orange-100 text-orange-800'},
  3: { label: '3 - ME',                  cls: 'bg-blue-100 text-blue-800'  },
  4: { label: '4 - EE',                  cls: 'bg-green-100 text-green-800'}
};
const REVIEW_STATUS_CONFIG = {
  DRAFT:            { label: 'Draft',           cls: 'bg-gray-100 text-gray-700'   },
  SUBMITTED:        { label: 'Published',       cls: 'bg-green-100 text-green-700' },
  RATING_PUBLISHED: { label: 'Rating Shared',   cls: 'bg-green-100 text-green-700' },
  REVIEW_CLOSED:    { label: 'Closed',          cls: 'bg-purple-100 text-purple-700'}
};

function ApprovalBadge({ status }) {
  const cfg = APPROVAL_CONFIG[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>;
}
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>;
}
function RatingBadge({ rating }) {
  if (!rating) return <span className="text-xs text-gray-400">Not rated</span>;
  const cfg = RATING_CONFIG[Number(rating)] || { label: rating, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>;
}

function ProgressBar({ value = 0 }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const col = pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-yellow-400';
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5">
      <div className={`${col} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}
function Empty({ msg }) {
  return (
    <div className="text-center py-12 text-gray-500 text-sm">{msg}</div>
  );
}

// --- Objective Form Modal ---
const CATS = ['Business Contributor', 'Value Creation', 'Self / People Development', 'Other'];

function ObjectiveModal({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    category: initial?.category || 'Business Contributor',
    customCat: '',
    startDate: initial?.startDate?.slice(0, 10) || '',
    endDate: initial?.endDate?.slice(0, 10) || initial?.deadline?.slice(0, 10) || '',
    progressPercent: initial?.progressPercent ?? initial?.progress ?? 0
  });
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.title.trim()) { setErr('Title is required'); return; }
    
    // Date validation: Due date cannot be before start date
    if (form.startDate && form.endDate) {
      if (new Date(form.endDate) < new Date(form.startDate)) {
        setErr('Due date cannot be earlier than start date');
        return;
      }
    }

    const category = form.category === 'Other' && form.customCat.trim()
      ? form.customCat.trim() : form.category;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      progressPercent: Number(form.progressPercent) || 0
    };
    try {
      await onSave(payload);
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || 'Failed to save');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">{initial ? 'Edit Objective' : 'New Objective'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">X</button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-4">
          {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{err}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="e.g. Complete Q1 sales targets" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
              placeholder="Add detail..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Category *</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CATS.map(c => (
                <button key={c} type="button" onClick={() => set('category', c)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium
                    ${form.category === c ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-300'}`}>
                  {c}
                </button>
              ))}
            </div>
            {form.category === 'Other' && (
              <input value={form.customCat} onChange={e => set('customCat', e.target.value)}
                placeholder="Custom categoryâ€¦"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Progress ({form.progressPercent}%)</label>
            <input type="range" min={0} max={100} step={5} value={form.progressPercent}
              onChange={e => set('progressPercent', e.target.value)}
              className="w-full accent-green-600" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60">
              {saving ? 'Savingâ€¦' : (initial ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Submit Input Modal ---
function InputModal({ objective, onSave, onClose, saving }) {
  const [text, setText] = useState('');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Submit Contribution</h3>
        <p className="text-xs text-green-700 font-medium mb-3">{objective?.title}</p>
        {(objective?.employeeInput || []).length > 0 && (
          <div className="mb-3 space-y-1">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Previous</p>
            {objective.employeeInput.map((e, i) => (
              <div key={i} className="bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs text-gray-700">
                <span className="text-gray-400 mr-1">{fmt(e.date || e.submittedAt)}:</span>{e.contribution || e.text}
              </div>
            ))}
          </div>
        )}
        <textarea value={text} onChange={e => setText(e.target.value)} rows={4}
          placeholder="Describe what you've done towards this objectiveâ€¦"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none mb-3" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700">Cancel</button>
          <button onClick={() => onSave(text)} disabled={!text.trim() || saving}
            className="px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white disabled:opacity-50">
            {saving ? 'Submittingâ€¦' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main PerformanceTab component ---
const PerformanceTab = ({ user }) => {
  const [tab, setTab] = useState('objectives');
  const [goals, setGoals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [editObj, setEditObj] = useState(null);      // null = create mode
  const [showObjModal, setShowObjModal] = useState(false);
  const [inputObj, setInputObj] = useState(null);
  const [commentReview, setCommentReview] = useState(null);
  const [commentText, setCommentText] = useState('');

  // â”€â”€ Load data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadGoals = useCallback(async () => {
    try {
      const res = await api.getMyGoals();
      setGoals(res.data?.data || res.data?.goals || []);
    } catch (err) {
      console.error('Failed to load goals', err);
      setGoals([]);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    try {
      const res = await api.getMyReviews();
      const data = res.data?.data || res.data;
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.response?.status !== 404) console.error('Failed to load reviews', err);
      setReviews([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadGoals(), loadReviews()]);
      setLoading(false);
    })();
  }, [loadGoals, loadReviews]);

  // â”€â”€ Objective actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSaveObjective = async (payload) => {
    setSaving(true);
    try {
      if (editObj?._id) {
        await api.updateGoal(editObj._id, payload);
        toast.success('Objective updated');
      } else {
        await api.createGoal(payload);
        toast.success('Objective submitted for approval');
      }
      setShowObjModal(false);
      setEditObj(null);
      await loadGoals();
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this objective?')) return;
    try {
      await api.deleteGoal(id);
      toast.success('Objective deleted');
      await loadGoals();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    }
  };

  const handleSubmitInput = async (text) => {
    if (!inputObj) return;
    setSaving(true);
    try {
      await api.submitInput(inputObj._id, text);
      toast.success('Contribution submitted');
      setInputObj(null);
      await loadGoals();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentReview || !commentText.trim()) return;
    setSaving(true);
    try {
      await api.addComment(commentReview, commentText.trim());
      toast.success('Comment added');
      setCommentReview(null);
      setCommentText('');
      await loadReviews();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add comment');
    } finally {
      setSaving(false);
    }
  };

  // â”€â”€ Derived data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const approvedGoals = goals.filter(g => g.approvalStatus === 'approved');
  const sentBackGoals = goals.filter(g => g.approvalStatus === 'sent_back');
  const pendingGoals  = goals.filter(g => g.approvalStatus === 'pending');
  const publishedReviews = reviews.filter(r => ['RATING_PUBLISHED', 'REVIEW_CLOSED'].includes(r.status));

  const TABS = [
    { id: 'objectives', label: 'My Objectives', count: goals.length },
    { id: 'input',      label: 'Submit Input',  count: approvedGoals.length },
    { id: 'reviews',    label: 'My Reviews',    count: publishedReviews.length }
  ];

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors
              ${tab === t.id ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-[11px] rounded-full px-1.5 py-0.5 font-bold leading-none
                ${tab === t.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* â”€â”€ Tab: My Objectives â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {tab === 'objectives' && (
        <div>
          {/* Sent-back callout */}
          {sentBackGoals.length > 0 && (
            <div className="mb-4 rounded-xl bg-orange-50 border border-orange-200 p-4">
              <p className="text-sm font-semibold text-orange-800 mb-1">
                {sentBackGoals.length} objective{sentBackGoals.length !== 1 ? 's' : ''} sent back for revision
              </p>
              <p className="text-xs text-orange-700">Review manager feedback below and re-submit after editing.</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-500">
              {approvedGoals.length} approved • {pendingGoals.length} pending • {sentBackGoals.length} sent back
            </div>
            <button onClick={() => { setEditObj(null); setShowObjModal(true); }}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium">
              <span className="text-lg leading-none">+</span> Add Objective
            </button>
          </div>

          {goals.length === 0 ? (
            <Empty msg="No objectives yet. Click '+ Add Objective' to set one - it will be sent to your manager for approval." />
          ) : (
            <div className="space-y-3">
              {goals.map(obj => (
                <div key={obj._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{obj.title}</p>
                      {obj.category && <p className="text-xs text-green-700 mt-0.5">{obj.category}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <ApprovalBadge status={obj.approvalStatus} />
                      <StatusBadge status={obj.status} />
                    </div>
                  </div>

                  {obj.description && <p className="text-xs text-gray-600 mb-2 line-clamp-2">{obj.description}</p>}

                  {/* Sent back reason */}
                  {obj.approvalStatus === 'sent_back' && obj.sentBackReason && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 mb-2">
                      <p className="text-xs font-semibold text-orange-700 mb-0.5">Manager feedback</p>
                      <p className="text-xs text-orange-800">{obj.sentBackReason}</p>
                    </div>
                  )}

                  {/* Progress */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Progress</span><span>{obj.progressPercent || 0}%</span>
                    </div>
                    <ProgressBar value={obj.progressPercent || obj.progress || 0} />
                  </div>

                  {(obj.startDate || obj.endDate || obj.deadline) && (
                    <p className="text-xs text-gray-400 mb-2">
                      {obj.startDate && <>Start: {fmt(obj.startDate)} • </>}
                      Due: {fmt(obj.endDate || obj.deadline)}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap mt-2">
                    {obj.approvalStatus !== 'approved' && (
                      <button onClick={() => { setEditObj(obj); setShowObjModal(true); }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Edit</button>
                    )}
                    {obj.approvalStatus !== 'approved' && (
                      <button onClick={() => handleDelete(obj._id)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">Delete</button>
                    )}
                    {obj.approvalStatus === 'approved' && (
                      <button onClick={() => setInputObj(obj)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100">
                        + Add Contribution
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ Tab: Submit Input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {tab === 'input' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Submit your contributions for approved objectives. Your manager will see these when creating your performance review.
          </p>
          {approvedGoals.length === 0 ? (
            <Empty msg="No approved objectives yet. Once your manager approves an objective it will appear here." />
          ) : (
            <div className="space-y-3">
              {approvedGoals.map(obj => (
                <div key={obj._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{obj.title}</p>
                      {obj.category && <p className="text-xs text-green-700 mt-0.5">{obj.category}</p>}
                    </div>
                    <StatusBadge status={obj.status} />
                  </div>

                  <ProgressBar value={obj.progressPercent || obj.progress || 0} />
                  <p className="text-xs text-gray-400 mt-1 mb-3">{obj.progressPercent || 0}% complete</p>

                  {/* Previous contributions */}
                  {(obj.employeeInput || []).length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Previous contributions ({obj.employeeInput.length})
                      </p>
                      <div className="space-y-1.5">
                        {obj.employeeInput.map((entry, i) => (
                          <div key={i} className="bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs text-gray-700">
                            <span className="text-gray-400 mr-1.5">{fmt(entry.date || entry.submittedAt)}:</span>{entry.contribution || entry.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => setInputObj(obj)}
                    className="text-sm px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium">
                    + Add Contribution
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ Tab: My Reviews â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {tab === 'reviews' && (
        <div>
          {publishedReviews.length === 0 ? (
            <Empty msg="No published reviews yet. Your manager will share a review once it's ready." />
          ) : (
            <div className="space-y-4">
              {publishedReviews.map(rev => {
                const statusCfg = REVIEW_STATUS_CONFIG[rev.status] || { label: rev.status, cls: 'bg-gray-100 text-gray-600' };
                return (
                  <div key={rev._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{rev.reviewType?.replace('_', ' ')}</p>
                        {rev.reviewPeriodStart && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {fmt(rev.reviewPeriodStart)}{rev.reviewPeriodEnd ? ` - ${fmt(rev.reviewPeriodEnd)}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.cls}`}>{statusCfg.label}</span>
                        <RatingBadge rating={rev.managerFeedback?.rating} />
                      </div>
                    </div>

                    {rev.managerFeedback?.feedback && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Feedback</p>
                        <p className="text-sm text-gray-700">{rev.managerFeedback.feedback}</p>
                      </div>
                    )}
                    {rev.managerFeedback?.areasForImprovement && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Areas for Improvement</p>
                        <p className="text-sm text-gray-700">{rev.managerFeedback.areasForImprovement}</p>
                      </div>
                    )}

                    {/* Employee comment section */}
                    {rev.employeeComment?.comment ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-3">
                        <p className="text-xs font-semibold text-gray-600 mb-0.5">Your Comment</p>
                        <p className="text-sm text-gray-700">{rev.employeeComment.comment}</p>
                      </div>
                    ) : rev.status === 'RATING_PUBLISHED' ? (
                      commentReview === rev._id ? (
                        <div className="mt-3">
                          <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                            rows={3} placeholder="Add your acknowledgement or commentâ€¦"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none mb-2" />
                          <div className="flex gap-2">
                            <button onClick={handleAddComment} disabled={!commentText.trim() || saving}
                              className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                              {saving ? 'Submittingâ€¦' : 'Submit Comment'}
                            </button>
                            <button onClick={() => { setCommentReview(null); setCommentText(''); }}
                              className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-700">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setCommentReview(rev._id)}
                          className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200">
                          + Add Comment / Acknowledgement
                        </button>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ Modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showObjModal && (
        <ObjectiveModal
          initial={editObj}
          onSave={handleSaveObjective}
          onClose={() => { setShowObjModal(false); setEditObj(null); }}
          saving={saving}
        />
      )}
      {inputObj && (
        <InputModal
          objective={inputObj}
          onSave={handleSubmitInput}
          onClose={() => setInputObj(null)}
          saving={saving}
        />
      )}
    </div>
  );
};

export default PerformanceTab;
