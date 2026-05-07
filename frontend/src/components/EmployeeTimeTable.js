import React, { useState } from 'react';
import { Pencil, Trash2, MoreVertical } from 'lucide-react';
import { formatDateDDMMYY } from '../utils/dateFormatter';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';


export function EmployeeTimeTable({ records, onEdit, onDelete }) {
  const [openMenuId, setOpenMenuId] = useState(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('.relative')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  return (
    <div className="w-full">
      <div className="border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 border-b">
              <TableHead className="w-36">
                <div className="text-gray-700 font-semibold">Day</div>
              </TableHead>
              <TableHead className="w-64">
                <div className="text-gray-700 font-semibold">Clock-in & Out</div>
              </TableHead>
              <TableHead className="w-64">
                <div className="text-gray-700 font-semibold">Break</div>
              </TableHead>
              <TableHead className="w-28 text-center">
                <div className="text-gray-700 font-semibold">Late Arrival</div>
              </TableHead>
              <TableHead className="w-28 text-center">
                <div className="text-gray-700 font-semibold">Work Type</div>
              </TableHead>
              <TableHead className="w-32 text-center">
                <div className="text-gray-700 font-semibold">Location</div>
              </TableHead>
              <TableHead className="w-48">
                <div className="text-gray-700 font-semibold">Overtime</div>
              </TableHead>
              <TableHead className="w-48">
                <div className="text-gray-700 font-semibold">Geolocation</div>
              </TableHead>

            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id} className="hover:bg-gray-50/50">
                <TableCell>
                  <div className="flex items-start gap-2">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setOpenMenuId(openMenuId === record.id ? null : record.id)}
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </Button>
                      {openMenuId === record.id && (
                        <div className="absolute left-0 top-8 z-50 w-32 bg-white rounded-md shadow-lg border border-gray-200">
                          <div className="py-1">
                            <button
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              onClick={() => {
                                onEdit(record);
                                setOpenMenuId(null);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 text-blue-500" />
                              Edit
                            </button>
                            <button
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              onClick={() => {
                                onDelete(record);
                                setOpenMenuId(null);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-gray-900">{record.day}</div>
                      <div className="text-gray-500 text-sm">{formatDateDDMMYY(record.date)}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {record.sessions.map((session, index) => (
                      <div key={index} className="flex items-center font-mono text-sm">
                        <span className={record.overtime !== '-' ? 'text-orange-600 w-[50px] text-right' : 'text-gray-900 w-[50px] text-right'}>
                          {session.clockIn}
                        </span>
                        <div className="flex items-center mx-2">
                          <span className="text-gray-400 leading-none">•</span>
                          <div className="h-[2px] w-2 bg-gray-300"></div>
                          <span className="text-gray-400 text-xs px-1 min-w-[60px] text-center">{session.duration}</span>
                          <div className="h-[2px] w-2 bg-gray-300"></div>
                          <span className="text-gray-400 leading-none">•</span>
                        </div>
                        <span className={record.overtime !== '-' ? 'text-orange-600 w-[50px]' : 'text-gray-900 w-[50px]'}>
                          {session.clockOut}
                        </span>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {record.breaks && record.breaks.length > 0 ? (
                    <div className="space-y-1">
                      {record.breaks.map((breakItem, index) => (
                        <div key={index} className="flex items-center font-mono text-sm">
                          <span className="text-amber-600 w-[50px] text-right">
                            {breakItem.startTime}
                          </span>
                          <div className="flex items-center mx-2">
                            <span className="text-gray-400 leading-none">•</span>
                            <div className="h-[2px] w-2 bg-gray-300"></div>
                            <span className="text-gray-400 text-xs px-1 min-w-[60px] text-center">{breakItem.duration}</span>
                            <div className="h-[2px] w-2 bg-gray-300"></div>
                            <span className="text-gray-400 leading-none">•</span>
                          </div>
                          <span className="text-amber-600 w-[50px]">
                            {breakItem.endTime}
                          </span>
                        </div>
                      ))}
                      {record.breaks.length > 1 && (
                        <div className="text-xs text-gray-500 mt-1 text-center">
                          Total: {record.totalBreakTime}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 text-sm">--</div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span className={record.lateArrival !== '--' ? 'font-mono text-sm text-red-600 font-semibold' : 'font-mono text-sm text-gray-500'}>
                    {record.lateArrival}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm text-gray-900">{record.workType}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm text-gray-900">{record.location}</span>
                </TableCell>
                <TableCell>
                  {record.overtime !== '-' && record.overtimeHours !== '--' ? (
                    <div className="font-mono text-sm">
                      <div className="flex items-center justify-center">
                        <span className="text-orange-600 font-semibold">
                          {record.overtimeHours}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        {record.overtime}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 text-sm">--</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(record.geolocation) ? (
                      <a
                        href={`https://www.google.com/maps?q=${record.geolocation.replace(/\s/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Show map
                      </a>
                    ) : (
                      <span className="text-gray-500">{record.geolocation}</span>
                    )}
                  </div>
                </TableCell>

              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
