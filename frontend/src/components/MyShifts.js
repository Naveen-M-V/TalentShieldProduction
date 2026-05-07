// src/components/MyShifts.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  MapPinIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import axios from '../utils/axiosConfig';
import { buildApiUrl } from '../utils/apiConfig';

const MyShifts = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('upcoming'); // 'all', 'upcoming', 'past'

  useEffect(() => {
    // Only fetch if user is loaded
    if (user?.id || user?._id) {
      fetchMyShifts();
    } else {
      setLoading(false);
      setError('User not loaded');
    }
  }, [user]);

  const fetchMyShifts = async () => {
    setLoading(true);
    setError('');

    const employeeId = user?.id || user?._id;
    if (!employeeId) {
      setError('User ID not found');
      setLoading(false);
      return;
    }

    try {
      const startDate = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
      const endDate   = dayjs().add(2, 'month').endOf('month').format('YYYY-MM-DD');

      // Use per-employee endpoint — returns only this employee's shifts
      const response = await axios.get(
        buildApiUrl(`/rota/shift-assignments/employee/${employeeId}`),
        { params: { startDate, endDate }, withCredentials: true }
      );

      const myShifts = (response.data.data || []).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setShifts(myShifts);
    } catch (err) {
      console.error('Error fetching shifts:', err);
      setError('Failed to load your shifts');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredShifts = () => {
    const today = dayjs().startOf('day');
    
    switch (filter) {
      case 'upcoming':
        return shifts.filter(shift => dayjs(shift.date).isSameOrAfter(today));
      case 'past':
        return shifts.filter(shift => dayjs(shift.date).isBefore(today));
      default:
        return shifts;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'Cancelled':
      case 'Missed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'Scheduled':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Cancelled':
      case 'Missed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const filteredShifts = getFilteredShifts();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-xl">
                <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
              </div>
              My Shifts
            </h1>
            <button
              onClick={fetchMyShifts}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ArrowPathIcon className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 bg-white rounded-lg p-2 shadow-sm border border-gray-200">
            <button
              onClick={() => setFilter('upcoming')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'upcoming'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Upcoming Shifts ({shifts.filter(s => dayjs(s.date).isSameOrAfter(dayjs().startOf('day'))).length})
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'past'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Past Shifts ({shifts.filter(s => dayjs(s.date).isBefore(dayjs().startOf('day'))).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Shifts ({shifts.length})
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <ArrowPathIcon className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Loading your shifts...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-800 text-lg font-medium">{error}</p>
            <button
              onClick={fetchMyShifts}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredShifts.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <CalendarDaysIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No shifts found</h3>
            <p className="text-gray-500 text-lg">
              {filter === 'upcoming' && 'You have no upcoming shifts scheduled.'}
              {filter === 'past' && 'You have no past shifts recorded.'}
              {filter === 'all' && 'You have no shifts in the system.'}
            </p>
          </div>
        )}

        {/* Shifts List */}
        {!loading && !error && filteredShifts.length > 0 && (
          <div className="space-y-4">
            {filteredShifts.map((shift) => {
              const shiftDate = dayjs(shift.date);
              const isToday = shiftDate.isSame(dayjs(), 'day');
              const isPast = shiftDate.isBefore(dayjs().startOf('day'));
              
              return (
                <div
                  key={shift._id}
                  className={`bg-white rounded-xl shadow-sm border-2 transition-all hover:shadow-md ${
                    isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Left: Date & Time Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`rounded-lg p-3 ${isToday ? 'bg-blue-600' : isPast ? 'bg-gray-200' : 'bg-blue-100'}`}>
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${isToday ? 'text-white' : isPast ? 'text-gray-600' : 'text-blue-600'}`}>
                                {shiftDate.format('DD')}
                              </div>
                              <div className={`text-xs font-medium ${isToday ? 'text-blue-100' : isPast ? 'text-gray-500' : 'text-blue-600'}`}>
                                {shiftDate.format('MMM')}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-xl font-bold text-gray-900">
                                {shiftDate.format('dddd, MMMM D, YYYY')}
                              </h3>
                              {isToday && (
                                <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                                  TODAY
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-gray-600">
                              <div className="flex items-center gap-2">
                                <ClockIcon className="h-5 w-5 text-blue-600" />
                                <span className="font-semibold">
                                  {shift.startTime} - {shift.endTime}
                                </span>
                              </div>
                              
                              {shift.location && (
                                <div className="flex items-center gap-2">
                                  <MapPinIcon className="h-5 w-5 text-green-600" />
                                  <span className="font-medium">{shift.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Additional Details */}
                        {shift.notes && (
                          <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold">Notes:</span> {shift.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right: Status */}
                      <div className="ml-4">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${getStatusColor(shift.status)}`}>
                          {getStatusIcon(shift.status)}
                          <span className="font-bold text-sm whitespace-nowrap">
                            {shift.status || 'Scheduled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Footer */}
        {!loading && !error && shifts.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredShifts.length}</span> of{' '}
                <span className="font-semibold text-gray-900">{shifts.length}</span> total shifts
              </span>
              <span className="text-gray-500">
                Last updated: {dayjs().format('MMM D, YYYY h:mm A')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyShifts;
