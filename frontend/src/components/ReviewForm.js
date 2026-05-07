import React, { useState, useEffect } from 'react';
import PerformanceRatingBadge from './PerformanceRatingBadge';
import { getRatingOptions } from '../utils/ratingConstants';

const REVIEW_TYPES = [
  { value: 'QUARTERLY',        label: 'Quarterly Review' },
  { value: 'MID_YEAR',         label: 'Mid-Year Review' },
  { value: 'ANNUAL',           label: 'Annual Review' },
  { value: 'PROBATION',        label: 'Probation Review' },
  { value: 'PIP',              label: 'Performance Improvement Plan' },
  { value: 'MONTHLY',          label: 'Monthly 1:1' },
  { value: 'WEEKLY',           label: 'Weekly Check-in' },
  { value: 'HR_REVIEW',        label: 'HR Review' },
  { value: 'LEAVE_MANAGEMENT', label: 'Leave Management' }
];

// Use standardized rating options with full labels
const RATINGS = getRatingOptions();

const emptyForm = () => ({
  employeeId: '',
  reviewType: 'ANNUAL',
  reviewPeriodStart: '',
  reviewPeriodEnd: '',
  discussionDate: '',
  linkedObjectiveIds: [],
  rating: '',
  feedback: '',
  areasForImprovement: ''
});

/**
 * Modal form for creating / editing a performance review.
 *
 * Props:
 *  initial          - existing review object (edit mode) or null
 *  employees        - [{_id, firstName, lastName, employeeId}]
 *  objectives       - [{_id, title, category, approvalStatus, userId}] - approved objectives for selected employee
 *  onEmployeeChange - fn(employeeId) - triggered when employee is changed to load their objectives
 *  onSave           - async fn(payload)
 *  onClose          - fn()
 *  saving           - bool
 */
export default function ReviewForm({
  initial,
  employees = [],
  objectives = [],
  onEmployeeChange,
  onSave,
  onClose,
  saving = false
}) {
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({
        employeeId: initial.employeeId?._id || initial.employeeId || '',
        reviewType: initial.reviewType || 'ANNUAL',
        reviewPeriodStart: initial.reviewPeriodStart ? initial.reviewPeriodStart.slice(0, 10) : '',
        reviewPeriodEnd: initial.reviewPeriodEnd ? initial.reviewPeriodEnd.slice(0, 10) : '',
        discussionDate: initial.discussionDate ? initial.discussionDate.slice(0, 10) : '',
        linkedObjectiveIds: (initial.linkedObjectiveIds || []).map((o) => o?._id || o).filter(Boolean),
        rating: initial.managerFeedback?.rating || '',
        feedback: initial.managerFeedback?.feedback || '',
        areasForImprovement: initial.managerFeedback?.areasForImprovement || ''
      });
    } else {
      setForm(emptyForm());
    }
    setError('');
  }, [initial]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleObjective = (id) => {
    setForm((prev) => {
      const linked = prev.linkedObjectiveIds || [];
      const next = linked.includes(id)
        ? linked.filter((x) => x !== id)
        : [...linked, id];
      return { ...prev, linkedObjectiveIds: next };
    });
  };

  const handleEmployeeChange = (empId) => {
    set('employeeId', empId);
    set('linkedObjectiveIds', []);
    if (onEmployeeChange) onEmployeeChange(empId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.employeeId) { setError('Please select an employee'); return; }
    if (!form.reviewType)  { setError('Please select a review type'); return; }

    const payload = {
      employeeId: form.employeeId,
      reviewType: form.reviewType,
      reviewPeriodStart: form.reviewPeriodStart || undefined,
      reviewPeriodEnd: form.reviewPeriodEnd || undefined,
      discussionDate: form.discussionDate || undefined,
      linkedObjectiveIds: form.linkedObjectiveIds,
      managerFeedback: {
        rating: form.rating !== '' ? Number(form.rating) : null,
        feedback: form.feedback.trim() || null,
        areasForImprovement: form.areasForImprovement.trim() || null
      }
    };

    try {
      await onSave(payload);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save review');
    }
  };

  // Objectives for the selected employee from props
  const approvedObjectives = objectives.filter(
    (o) => (o.userId?._id || o.userId) === form.employeeId && o.approvalStatus === 'approved'
  );

  // Employee input snapshot (read-only) - when editing an existing review
  const inputSnapshot = initial?.employeeInputSnapshot;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial ? 'Edit Review' : 'New Performance Review'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">X</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          {/* Employee + Review Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee <span className="text-red-500">*</span></label>
              <select
                value={form.employeeId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                disabled={!!initial}
              >
                <option value="">Select employee…</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName}
                    {emp.employeeId ? ` (${emp.employeeId})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Type <span className="text-red-500">*</span></label>
              <select
                value={form.reviewType}
                onChange={(e) => set('reviewType', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {REVIEW_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
              <input type="date" value={form.reviewPeriodStart}
                onChange={(e) => set('reviewPeriodStart', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
              <input type="date" value={form.reviewPeriodEnd}
                onChange={(e) => set('reviewPeriodEnd', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discussion Date</label>
              <input type="date" value={form.discussionDate}
                onChange={(e) => set('discussionDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          {/* Link Objectives */}
          {form.employeeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Link Approved Objectives</label>
              {approvedObjectives.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No approved objectives found for this employee.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {approvedObjectives.map((obj) => {
                    const checked = form.linkedObjectiveIds.includes(obj._id);
                    return (
                      <label
                        key={obj._id}
                        className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors
                          ${checked ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200 hover:border-indigo-200'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleObjective(obj._id)}
                          className="mt-0.5 accent-indigo-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{obj.title}</p>
                          <p className="text-xs text-gray-500">{obj.category}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Employee Input Snapshot (read-only, shown in edit mode) */}
          {inputSnapshot && inputSnapshot.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee Contribution Inputs</label>
              <div className="space-y-3">
                {inputSnapshot.map((snap, i) => (
                  <div key={i} className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <p className="text-sm font-semibold text-gray-800 mb-1">{snap.title}</p>
                    <p className="text-xs text-indigo-600 mb-2">{snap.category}</p>
                    {snap.employeeInput?.length > 0 ? (
                      <ul className="space-y-1.5">
                        {snap.employeeInput.map((input, j) => (
                          <li key={j} className="text-xs text-gray-700 bg-white border border-gray-100 rounded px-2.5 py-1.5">
                            <span className="font-medium">{new Date(input.date || input.submittedAt).toLocaleDateString()}: </span>
                            {input.contribution || input.text}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No contributions submitted</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set('rating', form.rating === r.value ? '' : r.value)}
                  className={`p-3 rounded-lg border text-left transition-colors
                    ${form.rating === r.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200'}`}
                >
                  <div className="flex items-center gap-2">
                    <PerformanceRatingBadge rating={r.value} showFull={false} />
                    <span className="text-xs text-gray-600">{r.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Overall Feedback</label>
            <textarea
              value={form.feedback}
              onChange={(e) => set('feedback', e.target.value)}
              rows={4}
              placeholder="Provide overall performance feedback…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          {/* Areas for improvement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Areas for Improvement</label>
            <textarea
              value={form.areasForImprovement}
              onChange={(e) => set('areasForImprovement', e.target.value)}
              rows={3}
              placeholder="Note areas where the employee can improve…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : (initial ? 'Save Changes' : 'Create Review')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
