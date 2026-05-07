import React, { useMemo } from 'react';

/**
 * ShiftTimeline Component
 * Displays employee shift schedules using custom timeline grid
 * Beautiful visual representation of employee shifts
 */

const ShiftTimeline = ({ rotaData, view = 'week', onEventClick }) => {
  
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        minWidth: '800px'
      }}>
        <thead style={{
          position: 'sticky',
          top: 0,
          background: '#f9fafb',
          zIndex: 10
        }}>
          <tr>
            <th style={{
              padding: '16px',
              textAlign: 'left',
              borderBottom: '2px solid #e5e7eb',
              borderRight: '1px solid #e5e7eb',
              fontWeight: '600',
              color: '#111827',
              minWidth: '200px',
              position: 'sticky',
              left: 0,
              background: '#f9fafb',
              zIndex: 11
            }}>
              Employee
            </th>
            {dates.map((dateStr, idx) => {
              const d = new Date(dateStr);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <th key={idx} style={{
                  padding: '16px 12px',
                  textAlign: 'center',
                  borderBottom: '2px solid #e5e7eb',
                  fontWeight: '600',
                  color: isWeekend ? '#6b7280' : '#111827',
                  minWidth: '120px',
                  whiteSpace: 'pre-line',
                  lineHeight: '1.4',
                  background: isWeekend ? '#fafafa' : undefined
                }}>
                  {formatDate(dateStr)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee, empIdx) => (
            <tr key={employee.id} style={{
              background: empIdx % 2 === 0 ? '#ffffff' : '#f9fafb'
            }}>
              <td style={{
                padding: '16px',
                borderBottom: '1px solid #e5e7eb',
                borderRight: '1px solid #e5e7eb',
                position: 'sticky',
                left: 0,
                background: empIdx % 2 === 0 ? '#ffffff' : '#f9fafb',
                zIndex: 9
              }}>
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '4px'
                  }}>
                    {employee.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    {employee.department}
                  </div>
                </div>
              </td>
              {dates.map((dateStr, dateIdx) => {
                const shift = getShiftForEmployeeAndDate(employee.id, dateStr);
                const d = new Date(dateStr);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <td key={dateIdx} style={{
                    padding: '8px',
                    borderBottom: '1px solid #e5e7eb',
                    textAlign: 'center',
                    background: isWeekend ? '#fafafa' : undefined
                  }}>
                    {shift ? (
                      <div
                        onClick={() => handleShiftClick(shift)}
                        style={{
                          background: shift.shift.color || '#3b82f6',
                          color: '#ffffff',
                          padding: '12px 8px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                        }}
                      >
                        <div style={{ marginBottom: '4px' }}>
                          {shift.shift.name}
                        </div>
                        <div style={{ 
                          fontSize: '11px', 
                          opacity: 0.9,
                          whiteSpace: 'nowrap'
                        }}>
                          {shift.shift.startTime}-{shift.shift.endTime}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: '12px 8px',
                        color: isWeekend ? '#9ca3af' : '#d1d5db',
                        fontSize: '12px',
                        fontWeight: isWeekend ? 600 : 400
                      }}>
                        {isWeekend ? 'WOFF' : '-'}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
                padding: '16px 12px',
                textAlign: 'center',
                borderBottom: '2px solid #e5e7eb',
                fontWeight: '600',
                color: '#111827',
                minWidth: '120px',
                whiteSpace: 'pre-line',
                lineHeight: '1.4'
              }}>
                {formatDate(dateStr)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee, empIdx) => (
            <tr key={employee.id} style={{
              background: empIdx % 2 === 0 ? '#ffffff' : '#f9fafb'
            }}>
              <td style={{
                padding: '16px',
                borderBottom: '1px solid #e5e7eb',
                borderRight: '1px solid #e5e7eb',
                position: 'sticky',
                left: 0,
                background: empIdx % 2 === 0 ? '#ffffff' : '#f9fafb',
                zIndex: 9
              }}>
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '4px'
                  }}>
                    {employee.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    {employee.department}
                  </div>
                </div>
              </td>
              {dates.map((dateStr, dateIdx) => {
                const shift = getShiftForEmployeeAndDate(employee.id, dateStr);
                return (
                  <td key={dateIdx} style={{
                    padding: '8px',
                    borderBottom: '1px solid #e5e7eb',
                    textAlign: 'center'
                  }}>
                    {shift ? (
                      <div
                        onClick={() => handleShiftClick(shift)}
                        style={{
                          background: shift.shift.color || '#3b82f6',
                          color: '#ffffff',
                          padding: '12px 8px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          fontSize: '13px',
                        {isWeekend ? 'WOFF' : '-'}
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                        }}
                      >
                        <div style={{ marginBottom: '4px' }}>
                          {shift.shift.name}
                        </div>
                        <div style={{ 
                          fontSize: '11px', 
                          opacity: 0.9,
                          whiteSpace: 'nowrap'
                        }}>
                          {shift.shift.startTime}-{shift.shift.endTime}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: '12px 8px',
                        color: '#d1d5db',
                        fontSize: '12px'
                      }}>
                        -
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #e5e7eb',
        background: '#f9fafb',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            background: '#3b82f6',
            borderRadius: '4px'
          }}></div>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>Morning</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            background: '#f59e0b',
            borderRadius: '4px'
          }}></div>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>Evening</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            background: '#8b5cf6',
            borderRadius: '4px'
          }}></div>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>Night</span>
        </div>
      </div>
    </div>
  );
};

export default ShiftTimeline;
