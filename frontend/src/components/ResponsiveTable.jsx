import React from 'react';

/**
 * ResponsiveTable - Mobile-first responsive table component
 * 
 * Converts to card layout on mobile (< 640px), table layout on tablet+
 * Eliminates overflow-x-auto and min-w-full anti-patterns
 * 
 * Props:
 * - columns: [{ key, label, render?, className? }]
 * - data: Array of row objects
 * - variant: 'compact' (mobile-optimized) | 'full' (desktop-optimized)
 * - loading: Boolean
 * - empty: React component to show when no data
 */
export const ResponsiveTable = ({
  columns,
  data = [],
  variant = 'compact',
  loading = false,
  empty = null,
  className = ''
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return empty || <div className="text-center py-8 text-gray-500">No data available</div>;
  }

  // Mobile card layout (default)
  if (variant === 'compact') {
    return (
      <div className="space-y-3 sm:space-y-4">
        {data.map((row, idx) => (
          <div
            key={row._id || row.id || idx}
            className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 space-y-2"
          >
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between items-start gap-2">
                <span className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-tight">
                  {col.label}
                </span>
                <span className="text-sm sm:text-base text-gray-900 text-right flex-1">
                  {col.render ? col.render(row[col.key], row) : row[col.key] || '-'}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Full table layout (tablet/desktop)
  return (
    <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full" style={{ tableLayout: 'auto' }}>
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`
                  text-left px-3 sm:px-4 md:px-6 py-2 sm:py-3
                  text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-tight
                  ${col.className || ''}
                `}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((row, idx) => (
            <tr
              key={row._id || row.id || idx}
              className="hover:bg-gray-50 transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`
                    px-3 sm:px-4 md:px-6 py-2 sm:py-3 sm:py-4
                    text-xs sm:text-sm text-gray-900
                    ${col.className || ''}
                  `}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key] || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * MobileFirstGrid - Responsive grid that adjusts columns by breakpoint
 * 
 * Props:
 * - children: React elements
 * - cols: { mobile, mobileLarge, tablet, desktop } - column counts
 * - gap: 'sm', 'md', 'lg' (default: 'md')
 */
export const MobileFirstGrid = ({
  children,
  cols = { mobile: 1, mobileLarge: 2, tablet: 3, desktop: 4 },
  gap = 'md'
}) => {
  const gapClass = {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-3 sm:gap-4 md:gap-6',
    lg: 'gap-4 sm:gap-6 md:gap-8'
  }[gap];

  const colsClass = `
    grid
    grid-cols-${cols.mobile}
    sm:grid-cols-${cols.mobileLarge}
    md:grid-cols-${cols.tablet}
    lg:grid-cols-${cols.desktop}
    ${gapClass}
  `;

  return <div className={colsClass}>{children}</div>;
};

export default ResponsiveTable;
