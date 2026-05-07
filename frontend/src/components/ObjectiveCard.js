import React, { useState } from 'react';
import ObjectiveApprovalBadge from './ObjectiveApprovalBadge';

const STATUS_COLOURS = {
  TO_DO:       'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  ACHIEVED:    'bg-green-100 text-green-700',
  OVERDUE:     'bg-red-100 text-red-700'
};

function ProgressBar({ value = 0 }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const colour = pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-yellow-400';
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`${colour} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Reusable card for a single objective / goal.
 *
 * Props:
 *  objective   – the goal document
 *  isManager   – bool, shows manager action buttons
 *  onEdit      – fn(objective)
 *  onDelete    – fn(id)
 *  onApprove   – fn(id)            (manager)
 *  onSendBack  – fn(id)            (manager)
 *  onViewContributions – fn(objective) (manager)
 *  onSubmitInput – fn(objective)   (employee)
 *  showEmployee – bool, show employee name chip (manager list view)
 */
export default function ObjectiveCard({
  objective,
  isManager = false,
  onEdit,
  onDelete,
  onApprove,
  onSendBack,
  onViewContributions,
  onSubmitInput,
  showEmployee = false
}) {
  const [expanded, setExpanded] = useState(false);
  const obj = objective || {};
  const progress = Number(obj.progressPercent) || 0;
  const empName = obj.userId
    ? `${obj.userId.firstName || ''} ${obj.userId.lastName || ''}`.trim()
    : null;

  const canEdit = isManager || (obj.approvalStatus !== 'approved');
  const canDelete = isManager || (obj.approvalStatus === 'pending' || obj.approvalStatus === 'sent_back');

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate" title={obj.title}>{obj.title || 'Untitled'}</h3>
          {showEmployee && empName && (
            <span className="text-xs text-gray-500">{empName}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ObjectiveApprovalBadge approvalStatus={obj.approvalStatus} />
          {obj.status && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOURS[obj.status] || 'bg-gray-100 text-gray-600'}`}>
              {obj.status.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </span>
          )}
        </div>
      </div>

      {/* Category */}
      {obj.category && (
        <p className="text-xs text-indigo-600 font-medium mb-2">{obj.category}</p>
      )}

      {/* Description (collapsible) */}
      {obj.description && (
        <div className="mb-3">
          <p className={`text-xs text-gray-600 ${expanded ? '' : 'line-clamp-2'}`}>{obj.description}</p>
          {obj.description.length > 100 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-indigo-500 hover:underline mt-0.5"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Sent-back reason callout */}
      {obj.approvalStatus === 'sent_back' && obj.sentBackReason && (
        <div className="mb-3 rounded-lg bg-orange-50 border border-orange-200 p-2.5">
          <p className="text-xs font-semibold text-orange-700 mb-0.5">Manager feedback</p>
          <p className="text-xs text-orange-800">{obj.sentBackReason}</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {/* Dates */}
      {(obj.startDate || obj.endDate) && (
        <div className="flex gap-4 text-xs text-gray-500 mb-3">
          {obj.startDate && <span>Start: {new Date(obj.startDate).toLocaleDateString()}</span>}
          {obj.endDate   && <span>Due: {new Date(obj.endDate).toLocaleDateString()}</span>}
        </div>
      )}

      {/* Employee input count */}
      {Array.isArray(obj.employeeInput) && obj.employeeInput.length > 0 && (
        <p className="text-xs text-gray-500 mb-3">
          {obj.employeeInput.length} contribution{obj.employeeInput.length !== 1 ? 's' : ''} submitted
        </p>
      )}

      {/* Action row */}
      <div className="flex flex-wrap gap-2 mt-1">
        {/* Manager: approve / send back */}
        {isManager && obj.approvalStatus === 'pending' && (
          <>
            {onApprove && (
              <button
                onClick={() => onApprove(obj._id)}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
            )}
            {onSendBack && (
              <button
                onClick={() => onSendBack(obj._id)}
                className="text-xs px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 font-medium hover:bg-orange-200 transition-colors"
              >
                Send Back
              </button>
            )}
          </>
        )}

        {isManager && Array.isArray(obj.employeeInput) && obj.employeeInput.length > 0 && onViewContributions && (
          <button
            onClick={() => onViewContributions(obj)}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 transition-colors"
          >
            View Contributions
          </button>
        )}

        {/* Employee: submit contribution */}
        {!isManager && obj.approvalStatus === 'approved' && onSubmitInput && (
          <button
            onClick={() => onSubmitInput(obj)}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            Submit Contribution
          </button>
        )}

        {/* Edit */}
        {onEdit && canEdit && (
          <button
            onClick={() => onEdit(obj)}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
          >
            Edit
          </button>
        )}

        {/* Delete */}
        {onDelete && canDelete && (
          <button
            onClick={() => onDelete(obj._id)}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
