import React, { useMemo } from 'react';

const EmptyState = ({ message }) => (
  <div className="p-6 text-sm text-gray-500">{message}</div>
);

export default function ComplianceInsights({
  selectedInsight,
  teamMembers = [],
  clockedInEmployees = [],
  absentEmployees = [],
  pendingLeaves = [],
  pendingExpenses = []
}) {
  const activeEmployees = useMemo(
    () => teamMembers.filter(m => m.isActive !== false && m.status !== 'Terminated'),
    [teamMembers]
  );

  const view = useMemo(() => {
    switch (selectedInsight) {
      case 'clockins':
        return {
          title: 'Clocked In Employees',
          rows: clockedInEmployees,
          empty: 'No employees currently clocked in.',
          type: 'people'
        };
      case 'absentees':
        return {
          title: 'Absentees',
          rows: absentEmployees,
          empty: 'No absentees right now.',
          type: 'absent'
        };
      case 'leave-approvals':
        return {
          title: 'Pending Leave Approvals',
          rows: pendingLeaves,
          empty: 'No pending leave approvals.',
          type: 'leave'
        };
      case 'expense-approvals':
        return {
          title: 'Pending Expense Approvals',
          rows: pendingExpenses,
          empty: 'No pending expense approvals.',
          type: 'expense'
        };
      case 'active':
        return {
          title: 'Active Employees',
          rows: activeEmployees,
          empty: 'No active employees found.',
          type: 'people'
        };
      case 'employees':
      default:
        return {
          title: 'All Employees',
          rows: teamMembers,
          empty: 'No employees found.',
          type: 'people'
        };
    }
  }, [selectedInsight, teamMembers, clockedInEmployees, absentEmployees, pendingLeaves, pendingExpenses, activeEmployees]);

  return (
    <section className="bg-white rounded-lg shadow border border-gray-100">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{view.title}</h2>
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700">{view.rows.length}</span>
      </div>

      {view.rows.length === 0 ? (
        <EmptyState message={view.empty} />
      ) : (
        <div className="overflow-x-auto">
          {view.type === 'people' && (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.slice(0, 20).map((row, idx) => (
                  <tr key={row._id || row.id || idx} className="border-b border-gray-50 last:border-b-0">
                    <td className="px-4 py-3 text-sm text-gray-900">{`${row.firstName || ''} ${row.lastName || ''}`.trim() || row.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.department || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.role || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.status || 'Active'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {view.type === 'absent' && (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Shift</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Reason</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.slice(0, 20).map((row, idx) => (
                  <tr key={row.employeeId || idx} className="border-b border-gray-50 last:border-b-0">
                    <td className="px-4 py-3 text-sm text-gray-900">{row.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.shiftStartTime || '-'} - {row.shiftEndTime || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {view.type === 'leave' && (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Dates</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.slice(0, 20).map((row, idx) => (
                  <tr key={row._id || idx} className="border-b border-gray-50 last:border-b-0">
                    <td className="px-4 py-3 text-sm text-gray-900">{row.employeeId ? `${row.employeeId.firstName || ''} ${row.employeeId.lastName || ''}`.trim() : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.leaveType || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {row.startDate ? new Date(row.startDate).toLocaleDateString() : '-'} - {row.endDate ? new Date(row.endDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {view.type === 'expense' && (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.slice(0, 20).map((row, idx) => (
                  <tr key={row._id || idx} className="border-b border-gray-50 last:border-b-0">
                    <td className="px-4 py-3 text-sm text-gray-900">{row.employee ? `${row.employee.firstName || ''} ${row.employee.lastName || ''}`.trim() : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.category || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">£{Number(row.totalAmount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
