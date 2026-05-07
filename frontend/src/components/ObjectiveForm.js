import React, { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';

const CATEGORIES = [
  'Business Contributor',
  'Value Creation',
  'Self / People Development',
  'Other'
];

const STATUS_OPTIONS = ['TO_DO', 'IN_PROGRESS', 'ACHIEVED'];

const emptyForm = () => ({
  title: '',
  description: '',
  category: 'Business Contributor',
  customCategory: '',
  status: 'TO_DO',
  startDate: '',
  endDate: '',
  progressPercent: 0,
  targetEmployeeId: ''
});

/**
 * Modal form for creating / editing an objective (goal).
 *
 * Props:
 *  initial         – existing goal object (edit mode) or null (create mode)
 *  employees       – array of {_id, firstName, lastName} for manager "assign to" select
 *  isManager       – bool
 *  onSave          – async fn(formData) → called on submit
 *  onClose         – fn()
 *  saving          – bool, disables submit while in-flight
 */
export default function ObjectiveForm({ initial, employees = [], isManager = false, onSave, onClose, saving = false }) {
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      const isCustom = initial.category && !CATEGORIES.includes(initial.category);
      setForm({
        title: initial.title || '',
        description: initial.description || '',
        category: isCustom ? 'Other' : (initial.category || 'Business Contributor'),
        customCategory: isCustom ? initial.category : '',
        status: initial.status || 'TO_DO',
        startDate: initial.startDate ? initial.startDate.slice(0, 10) : '',
        endDate: initial.endDate ? initial.endDate.slice(0, 10) : '',
        progressPercent: initial.progressPercent || 0,
        targetEmployeeId: initial.userId?._id || initial.userId || ''
      });
    } else {
      setForm(emptyForm());
    }
    setError('');
  }, [initial]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.category)     { setError('Category is required'); return; }
    
    // Date validation
    if (form.startDate && form.endDate) {
      if (new Date(form.endDate) < new Date(form.startDate)) {
        setError('Due date cannot be earlier than start date');
        return;
      }
    }

    if (isManager && !initial && !form.targetEmployeeId) {
      setError('Please select an employee'); return;
    }

    const resolvedCategory = form.category === 'Other' && form.customCategory.trim()
      ? form.customCategory.trim()
      : form.category;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: resolvedCategory,
      status: form.status,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      progressPercent: Number(form.progressPercent) || 0
    };

    if (isManager && !initial && form.targetEmployeeId) {
      payload.targetEmployeeId = form.targetEmployeeId;
    }

    try {
      await onSave(payload);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save objective');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial ? 'Edit Objective' : 'New Objective'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">X</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          {/* Assign to (manager only, create only) */}
          {isManager && !initial && employees.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Employee <span className="text-red-500">*</span></label>
              <select
                value={form.targetEmployeeId}
                onChange={(e) => set('targetEmployeeId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                required={isManager && !initial}
              >
                <option value="">Select employee…</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Increase quarterly sales by 10%"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Add more detail about this objective…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          {/* Quick-select category buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2 mb-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => set('category', cat)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors
                    ${form.category === cat
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {form.category === 'Other' && (
              <input
                type="text"
                value={form.customCategory}
                onChange={(e) => set('customCategory', e.target.value)}
                placeholder="Enter custom category…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            )}
          </div>

          {/* Status + Progress */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Progress ({form.progressPercent}%)</label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.progressPercent}
                onChange={(e) => set('progressPercent', e.target.value)}
                className="w-full accent-indigo-600 mt-2"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(e) => set('endDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : (initial ? 'Save Changes' : 'Create Objective')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
