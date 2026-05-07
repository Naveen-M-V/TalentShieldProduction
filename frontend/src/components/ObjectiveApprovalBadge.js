import React from 'react';

const STATUS_MAP = {
  pending: {
    label: 'Awaiting Approval',
    className: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    dot: 'bg-yellow-500'
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800 border border-green-200',
    dot: 'bg-green-500'
  },
  sent_back: {
    label: 'Sent Back',
    className: 'bg-orange-100 text-orange-800 border border-orange-200',
    dot: 'bg-orange-500'
  }
};

/**
 * Badge showing the approval status of an objective.
 * @param {string} approvalStatus - 'pending' | 'approved' | 'sent_back'
 * @param {boolean} showDot - whether to show the coloured dot (default true)
 */
export default function ObjectiveApprovalBadge({ approvalStatus, showDot = true }) {
  const config = STATUS_MAP[approvalStatus] || {
    label: approvalStatus || 'Unknown',
    className: 'bg-gray-100 text-gray-700 border border-gray-200',
    dot: 'bg-gray-400'
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>
      {showDot && <span className={`inline-block w-1.5 h-1.5 rounded-full ${config.dot}`} />}
      {config.label}
    </span>
  );
}
