import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ClockIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import axios from '../utils/axiosConfig';
import { toast } from 'react-toastify';

dayjs.extend(isBetween);

const EmployeeCalendarView = ({ userProfile }) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('calendar');
  
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [shiftAssignments, setShiftAssignments] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    fetchMyCalendarData();
  }, [currentDate]);

  useEffect(() => {
    if (userProfile?._id) {
      fetchMyLeaveRequests();
    }
  }, [userProfile?._id]);

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchMyLeaveRequests();
    }
  }, [activeTab, userProfile?._id]);

  const fetchMyCalendarData = async () => {
    if (!userProfile?._id) return;
    
    try {
      const startOfMonth = currentDate.startOf('month').format('YYYY-MM-DD');
      const endOfMonth = currentDate.endOf('month').format('YYYY-MM-DD');
      
      // Fetch MY approved leaves only
      const leaveResponse = await axios.get('/api/leave/calendar', {
        params: {
          employeeId: userProfile._id,
          startDate: startOfMonth,
          endDate: endOfMonth
        }
      });
      
      // Fetch MY shift assignments only
      const shiftResponse = await axios.get(`/api/rota/shift-assignments/employee/${userProfile._id}`, {
        params: {
          startDate: startOfMonth,
          endDate: endOfMonth
        }
      });
      
      console.log('📅 Employee Calendar - Shifts API Response:', shiftResponse.data);
      console.log('📅 Employee Calendar - Leave Records:', leaveResponse.data.data || []);
      
      setLeaveRecords(leaveResponse.data.data || []);
      setShiftAssignments(shiftResponse.data.data || []);
      
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar data');
      setLeaveRecords([]);
      setShiftAssignments([]);
    }
  };

  const fetchMyLeaveRequests = async () => {
    if (!userProfile?._id) return;

    setLoadingRequests(true);

    try {
      const response = await axios.get('/api/leave/my-requests');
      setLeaveRequests(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to load leave requests');
      setLeaveRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleRequestTimeOff = () => {
    // Navigate to leave request (open in same page, different tab)
    navigate('/user-dashboard?tab=leave');
  };

  const getDaysInMonth = (date) => {
    const firstDay = date.startOf('month');
    const lastDay = date.endOf('month');

    let startDay = firstDay.day();
    const daysFromMonday = startDay === 0 ? 6 : startDay - 1;
    const start = firstDay.subtract(daysFromMonday, 'day');

    let endDay = lastDay.day();
    const daysToSunday = endDay === 0 ? 0 : 7 - endDay;
    const end = lastDay.add(daysToSunday, 'day');

    const days = [];
    let current = start;
    while (current.isBefore(end) || current.isSame(end)) {
      days.push(current);
      current = current.add(1, 'day');
    }

    return days;
  };

  const getEventsForDate = (date) => {
    const events = [];

    // Add leave events
    leaveRecords.forEach(leave => {
      const leaveStart = dayjs(leave.startDate);
      const leaveEnd = dayjs(leave.endDate);
      
      if (date.isBetween(leaveStart, leaveEnd, 'day', '[]')) {
        events.push({
          type: 'leave',
          title: leave.leaveType || 'Leave',
          color: 'bg-amber-100 border-amber-300 text-amber-800',
          data: leave
        });
      }
    });

    // Add shift events
    shiftAssignments.forEach(shift => {
      const shiftDate = dayjs(shift.date);
      
      if (date.isSame(shiftDate, 'day')) {
        events.push({
          type: 'shift',
          title: 'Shift',
          time: `${shift.startTime} - ${shift.endTime}`,
          location: shift.location,
          color: 'bg-blue-100 border-blue-300 text-blue-800',
          data: shift
        });
      }
    });

    return events;
  };

  const handleDayClick = (date) => {
    const events = getEventsForDate(date);
    setSelectedDate(date);
    setSelectedDayEvents(events);
    if (events.length > 0) {
      setShowDayDetailsModal(true);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate(direction === 'prev' 
      ? currentDate.subtract(1, 'month')
      : currentDate.add(1, 'month')
    );
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    const d = dayjs(dateValue);
    if (!d.isValid()) return '-';
    return d.format('DD/MM/YYYY');
  };

  const getWantedDates = (request) => {
    const start = request?.startDate ? dayjs(request.startDate) : null;
    const end = request?.endDate ? dayjs(request.endDate) : null;
    if (!start || !end || !start.isValid() || !end.isValid()) return '-';
    if (start.isSame(end, 'day')) return start.format('DD/MM/YYYY');
    return `${start.format('DD/MM/YYYY')} - ${end.format('DD/MM/YYYY')}`;
  };

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toString().toLowerCase();
    if (s === 'approved') return 'bg-green-100 text-green-800 border-green-200';
    if (s === 'rejected') return 'bg-red-100 text-red-800 border-red-200';
    if (s === 'pending') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (s === 'draft') return 'bg-gray-100 text-gray-800 border-gray-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusLabel = (status) => {
    const s = (status || '').toString().trim().toLowerCase();
    if (s === 'pending') return 'Applied';
    if (s === 'approved') return 'Approved';
    if (s === 'rejected') return 'Rejected';
    if (s === 'draft') return 'Draft';
    if (!s) return '-';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const getLeaveTypeLabel = (request) => {
    const leaveType = (request?.leaveType || request?.type || '').toString().trim();
    if (!leaveType) return '-';
    return leaveType;
  };

  const renderRequestsSection = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="text-lg font-semibold text-gray-900">Leave Requests</div>
      </div>

      <div className="p-4">
        {loadingRequests ? (
          <div className="text-sm text-gray-600">Loading...</div>
        ) : leaveRequests.length === 0 ? (
          <div className="text-sm text-gray-600">No leave requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">SI No</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Leave Requested Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Leave Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Leave Wanted Dates</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Total Days</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Reason</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((req, idx) => (
                  <tr key={req._id || idx} className="border-b last:border-b-0">
                    <td className="px-4 py-3 text-gray-900">{idx + 1}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(req.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-700">{getLeaveTypeLabel(req)}</td>
                    <td className="px-4 py-3 text-gray-700">{getWantedDates(req)}</td>
                    <td className="px-4 py-3 text-gray-700">{req.numberOfDays ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[420px]">
                      <div className="truncate" title={req.reason || ''}>
                        {req.reason || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${getStatusBadgeClass(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Leave Calendar</h2>
        <button
          onClick={handleRequestTimeOff}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          <span> Time off</span>
        </button>
      </div>

      <p className="text-sm text-gray-600">View your shifts and approved leave days</p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            activeTab === 'calendar'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Calendar
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            activeTab === 'requests'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Leave Requests
        </button>
      </div>

      {activeTab === 'calendar' && (
        <>
          {/* Calendar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Calendar Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              
              <div className="text-lg font-semibold text-gray-900">
                {currentDate.format('MMMM YYYY')}
              </div>
              
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 border-b">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div
                  key={day}
                  className={`p-2 text-center text-sm font-medium ${day === 'Sat' || day === 'Sun' ? 'text-gray-400 bg-gray-50' : 'text-gray-500 bg-gray-50'}`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {getDaysInMonth(currentDate).map((date, index) => {
                const isCurrentMonth = date.isSame(currentDate, 'month');
                const isToday = date.isSame(dayjs(), 'day');
                const isSelected = date.isSame(selectedDate, 'day');
                const events = getEventsForDate(date);
                const weekday = date.day(); // 0 = Sun, 6 = Sat
                const isWeekend = weekday === 0 || weekday === 6;
                
                  return (
                  <div
                    key={index}
                    className={`min-h-[80px] p-2 border-r border-b cursor-pointer transition-colors ${
                      !isCurrentMonth ? 'bg-gray-50' : isWeekend ? 'bg-gray-50/80' : 'bg-white'
                    } ${isToday ? 'bg-blue-50' : ''} ${isSelected ? 'ring-2 ring-blue-500' : ''} hover:bg-gray-50`}
                    onClick={() => handleDayClick(date)}
                  >
                    <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                      {date.format('D')}
                    </div>

                    {/* Events */}
                    <div className="mt-1 space-y-1">
                      {events.slice(0, 2).map((event, eventIndex) => (
                        <div
                          key={eventIndex}
                          className={`text-xs p-1 rounded border ${event.color}`}
                          title={`${event.title}${event.time ? ` (${event.time})` : ''}`}
                        >
                          <div className="font-semibold truncate">
                            {event.title}
                          </div>
                          {event.time && event.type === 'shift' && (
                            <div className="text-[10px] opacity-75 truncate">
                              {event.time}
                            </div>
                          )}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="text-xs text-gray-500">+{events.length - 2} more</div>
                      )}

                      {/* Show WOFF placeholder on weekends when there are no scheduled shifts */}
                      {isWeekend && events.length === 0 && (
                        <div className="text-xs text-gray-400 mt-1 font-medium">WOFF</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span className="text-gray-700">Shift</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-100 border border-amber-300 rounded"></div>
              <span className="text-gray-700">Leave</span>
            </div>
          </div>
        </>
      )}

      {activeTab === 'requests' && (
        renderRequestsSection()
      )}

      {/* Day Details Modal */}
      {activeTab === 'calendar' && showDayDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-xl">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedDate.format('dddd, MMMM D, YYYY')}
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setShowDayDetailsModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-all text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-3">
                {selectedDayEvents.map((event, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border-l-4 ${event.color}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900">{event.title}</h3>
                        {event.type === 'shift' && (
                          <>
                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                              <ClockIcon className="h-4 w-4" />
                              <span>{event.time}</span>
                            </div>
                            {event.location && (
                              <div className="text-sm text-gray-600 mt-1">📍 {event.location}</div>
                            )}
                          </>
                        )}
                        {event.type === 'leave' && event.data.reason && (
                          <div className="text-sm text-gray-600 mt-2">
                            Reason: {event.data.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t p-4">
              <button
                onClick={() => setShowDayDetailsModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeCalendarView;
