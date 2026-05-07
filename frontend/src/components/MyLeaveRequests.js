// src/components/MyLeaveRequests.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import axios from '../utils/axiosConfig';

const MyLeaveRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'

  useEffect(() => {
    // Only fetch if user is loaded
    if (user?.id || user?._id) {
      fetchMyRequests();
    } else {
      setLoading(false);
      setError('User not loaded');
    }
  }, [user]);

  const fetchMyRequests = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get('/api/leave/my-requests');
      
      const allRequests = response.data.data || [];
      // Sort by creation date (newest first)
      allRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setRequests(allRequests);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
      setError('Failed to load your leave requests');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRequests = () => {
    const normalize = (value) => String(value || '').toLowerCase();
    switch (filter) {
      case 'pending':
        return requests.filter(req => normalize(req.status) === 'pending');
      case 'approved':
        return requests.filter(req => normalize(req.status) === 'approved');
      case 'rejected':
        return requests.filter(req => normalize(req.status) === 'rejected');
      default:
        return requests;
    }
  };

  const handleCancelApprovedLeave = async (request) => {
    const currentStatus = String(request?.status || '').toLowerCase();
    if (currentStatus !== 'approved') {
      return;
    }

    const confirmed = window.confirm('Cancel this approved leave request?');
    if (!confirmed) return;

    try {
      await axios.patch(`/api/leave/cancel/${request._id}`, {
        cancellationReason: 'Cancelled by employee'
      });
      await fetchMyRequests();
    } catch (err) {
      console.error('Error cancelling approved leave:', err);
      setError(err.response?.data?.message || 'Failed to cancel approved leave');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLeaveTypeColor = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('sick')) return 'bg-red-100 text-red-800';
    if (t.includes('maternity') || t.includes('paternity') || t.includes('adoption') || t.includes('parental')) return 'bg-purple-100 text-purple-800';
    if (t.includes('annual')) return 'bg-blue-100 text-blue-800';
    if (t.includes('bank holiday')) return 'bg-cyan-100 text-cyan-800';
    if (t.includes('unpaid')) return 'bg-gray-100 text-gray-800';
    if (t.includes('bereavement')) return 'bg-slate-100 text-slate-800';
    return 'bg-green-100 text-green-800';
  };

  const filteredRequests = getFilteredRequests();

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
              My Leave Requests
            </h1>
            <button
              onClick={fetchMyRequests}
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
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Requests ({requests.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Pending ({requests.filter(r => String(r.status || '').toLowerCase() === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'approved'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Approved ({requests.filter(r => String(r.status || '').toLowerCase() === 'approved').length})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'rejected'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Rejected ({requests.filter(r => String(r.status || '').toLowerCase() === 'rejected').length})
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <ArrowPathIcon className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Loading your requests...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-800 text-lg font-medium">{error}</p>
            <button
              onClick={fetchMyRequests}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredRequests.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <CalendarDaysIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-500 text-lg">
              {filter === 'pending' && 'You have no pending leave requests.'}
              {filter === 'approved' && 'You have no approved leave requests.'}
              {filter === 'rejected' && 'You have no rejected leave requests.'}
              {filter === 'all' && 'You have not submitted any leave requests yet.'}
            </p>
          </div>
        )}

        {/* Requests List */}
        {!loading && !error && filteredRequests.length > 0 && (
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const startDate = dayjs(request.startDate);
              const endDate = dayjs(request.endDate);
              
              return (
                <div
                  key={request._id}
                  className="bg-white rounded-xl shadow-sm border-2 border-gray-200 transition-all hover:shadow-md"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Left: Date & Type Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(request.status)}
                            <span className={`px-3 py-1 rounded-lg text-sm font-bold border-2 ${getStatusColor(request.status)}`}>
                              {request.status.toUpperCase()}
                            </span>
                          </div>
                          
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getLeaveTypeColor(request.type)}`}>
                            {request.type.charAt(0).toUpperCase() + request.type.slice(1)} Leave
                          </span>
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex items-center gap-2 text-gray-900">
                            <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                            <span className="font-bold text-lg">
                              {startDate.format('MMM D, YYYY')} - {endDate.format('MMM D, YYYY')}
                            </span>
                            <span className="text-sm text-gray-600">
                              ({request.days} day{request.days !== 1 ? 's' : ''})
                            </span>
                          </div>
                        </div>

                        {/* Reason */}
                        {request.reason && (
                          <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold">Reason:</span> {request.reason}
                            </p>
                          </div>
                        )}

                        {/* Approval Notes */}
                        {request.status === 'approved' && request.notes && (
                          <div className="mt-3 bg-green-50 rounded-lg p-3 border border-green-200">
                            <p className="text-sm text-green-800">
                              <span className="font-semibold">Approval Notes:</span> {request.notes}
                            </p>
                          </div>
                        )}

                        {/* Rejection Reason */}
                        {request.status === 'rejected' && request.rejectionReason && (
                          <div className="mt-3 bg-red-50 rounded-lg p-3 border border-red-200">
                            <p className="text-sm text-red-800">
                              <span className="font-semibold">Rejection Reason:</span> {request.rejectionReason}
                            </p>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                          <span>Submitted: {dayjs(request.createdAt).format('MMM D, YYYY h:mm A')}</span>
                          {request.approvedAt && (
                            <span>Approved: {dayjs(request.approvedAt).format('MMM D, YYYY h:mm A')}</span>
                          )}
                          {request.rejectedAt && (
                            <span>Rejected: {dayjs(request.rejectedAt).format('MMM D, YYYY h:mm A')}</span>
                          )}
                        </div>

                        {String(request.status || '').toLowerCase() === 'approved' && (
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={() => handleCancelApprovedLeave(request)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Cancel Leave
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Footer */}
        {!loading && !error && requests.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredRequests.length}</span> of{' '}
                <span className="font-semibold text-gray-900">{requests.length}</span> total requests
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

export default MyLeaveRequests;
