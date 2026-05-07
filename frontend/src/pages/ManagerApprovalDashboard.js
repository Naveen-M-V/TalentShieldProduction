import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import ExpenseDetailsModal from '../components/ExpenseDetailsModal';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CalendarDaysIcon,
  UserIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const ManagerApprovalDashboard = () => {
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [deniedLeaves, setDeniedLeaves] = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [approvedExpenses, setApprovedExpenses] = useState([]);
  const [rejectedExpenses, setRejectedExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState('leave');
  const [leaveStatusTab, setLeaveStatusTab] = useState('pending'); // 'pending', 'approved', 'denied'
  const [expenseStatusTab, setExpenseStatusTab] = useState('pending'); // 'pending', 'approved', 'rejected'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, Sick, Casual, etc.
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedRequest, setSelectedRequest] = useState(null); // leave OR expense object
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [viewingExpenseId, setViewingExpenseId] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  useEffect(() => {
    if (activeTab === 'leave') {
      if (leaveStatusTab === 'approved') {
        fetchApprovedLeaves();
      } else if (leaveStatusTab === 'denied') {
        fetchDeniedLeaves();
      }
    } else if (activeTab === 'expense') {
      if (expenseStatusTab === 'approved') {
        fetchApprovedExpenses();
      } else if (expenseStatusTab === 'rejected') {
        fetchRejectedExpenses();
      }
    }
  }, [activeTab, leaveStatusTab, expenseStatusTab]);

  const fetchPendingRequests = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const managerResponse = await axios.get('/api/manager/approvals/pending');

      const managerPayload = managerResponse?.data?.data || {};

      setPendingLeaves(Array.isArray(managerPayload.leaveRequests) ? managerPayload.leaveRequests : []);
      // Manager endpoint may return expenses across statuses; keep only truly pending here
      const allExpenses = Array.isArray(managerPayload.expenses) ? managerPayload.expenses : [];
      const onlyPending = allExpenses.filter((e) => {
        const s = (e?.status || '').toString().trim().toLowerCase();
        return s === 'pending' || s === '' || s === 'null' || s === 'undefined';
      });
      setPendingExpenses(onlyPending);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      setError(error.response?.data?.message || 'Failed to load pending requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
      // Prefetch counts for approved/denied tabs so counts display without needing a click
      try {
        fetchApprovedLeaves();
        fetchDeniedLeaves();
        fetchApprovedExpenses();
        fetchRejectedExpenses();
      } catch (e) {
        // non-fatal prefetch errors
      }
    }
  };

  const fetchApprovedLeaves = async () => {
    try {
      const response = await axios.get('/api/leave/approved-requests');
      setApprovedLeaves(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      console.error('Error fetching approved leaves:', error);
      setError(error.response?.data?.message || 'Failed to load approved leaves');
    }
  };

  const fetchDeniedLeaves = async () => {
    try {
      const response = await axios.get('/api/leave/denied-requests');
      setDeniedLeaves(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      console.error('Error fetching denied leaves:', error);
      setError(error.response?.data?.message || 'Failed to load denied leaves');
    }
  };

  const fetchApprovedExpenses = async () => {
    try {
      const response = await axios.get('/api/expenses/approved');
      setApprovedExpenses(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      console.error('Error fetching approved expenses:', error);
      setError(error.response?.data?.message || 'Failed to load approved expenses');
    }
  };

  const fetchRejectedExpenses = async () => {
    try {
      const response = await axios.get('/api/expenses/rejected');
      setRejectedExpenses(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      console.error('Error fetching rejected expenses:', error);
      setError(error.response?.data?.message || 'Failed to load rejected expenses');
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      let response;
      if (activeTab === 'leave') {
        response = await axios.patch(`/api/leave/approve/${selectedRequest._id}`, {
          adminComment: approvalComment
        });
      } else {
        response = await axios.post(`/api/expenses/${selectedRequest._id}/approve`, {
          approvalNotes: approvalComment
        });
      }

      if (response?.data?.success !== false) {
        setShowApprovalModal(false);
        setSelectedRequest(null);
        setApprovalComment('');
        // Refresh both pending and approved lists
        if (activeTab === 'leave') {
          fetchPendingRequests();
          if (leaveStatusTab === 'approved') {
            fetchApprovedLeaves();
          }
        } else {
          fetchPendingRequests();
        }
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert(error.response?.data?.message || `Failed to approve ${activeTab}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);
    try {
      let response;
      if (activeTab === 'leave') {
        response = await axios.patch(`/api/leave/reject/${selectedRequest._id}`, {
          rejectionReason
        });
      } else {
        response = await axios.post(`/api/expenses/${selectedRequest._id}/decline`, {
          reason: rejectionReason
        });
      }

      if (response?.data?.success !== false) {
        setShowRejectionModal(false);
        setSelectedRequest(null);
        setRejectionReason('');
        // Refresh both pending and denied lists
        if (activeTab === 'leave') {
          fetchPendingRequests();
          if (leaveStatusTab === 'denied') {
            fetchDeniedLeaves();
          }
        } else {
          fetchPendingRequests();
        }
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert(error.response?.data?.message || `Failed to reject ${activeTab}`);
    } finally {
      setActionLoading(false);
    }
  };

  const openApprovalModal = (request) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
    setApprovalComment('');
  };

  const openRejectionModal = (request) => {
    setSelectedRequest(request);
    setShowRejectionModal(true);
    setRejectionReason('');
  };

  const openExpenseView = (request) => {
    setViewingExpenseId(request._id);
  };

  // Get the correct array based on activeTab and status tab
  let activeItems = [];
  if (activeTab === 'leave') {
    if (leaveStatusTab === 'pending') {
      activeItems = pendingLeaves;
    } else if (leaveStatusTab === 'approved') {
      activeItems = approvedLeaves;
    } else if (leaveStatusTab === 'denied') {
      activeItems = deniedLeaves;
    }
  } else {
    if (expenseStatusTab === 'pending') {
      activeItems = pendingExpenses;
    } else if (expenseStatusTab === 'approved') {
      activeItems = approvedExpenses;
    } else if (expenseStatusTab === 'rejected') {
      activeItems = rejectedExpenses;
    }
  }

  const filteredRequests = activeItems.filter(request => {
    if (activeTab === 'expense') {
      if (searchTerm) {
        const employeeName = `${request.employee?.firstName || ''} ${request.employee?.lastName || ''}`.toLowerCase();
        const category = (request.category || '').toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return employeeName.includes(searchLower) || category.includes(searchLower);
      }
      return true;
    }

    // Filter by type
    if (filter !== 'all' && request.leaveType !== filter) return false;

    // Filter by search term
    if (searchTerm) {
      const employeeName = `${request.employeeId?.firstName || ''} ${request.employeeId?.lastName || ''}`.toLowerCase();
      const employeeIdCode = request.employeeId?.vtid || '';
      const searchLower = searchTerm.toLowerCase();

      return employeeName.includes(searchLower) || employeeIdCode.toLowerCase().includes(searchLower);
    }

    return true;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    let left;
    let right;

    if (sortBy === 'employee') {
      left = activeTab === 'leave'
        ? `${a.employeeId?.firstName || ''} ${a.employeeId?.lastName || ''}`.toLowerCase()
        : `${a.employee?.firstName || ''} ${a.employee?.lastName || ''}`.toLowerCase();
      right = activeTab === 'leave'
        ? `${b.employeeId?.firstName || ''} ${b.employeeId?.lastName || ''}`.toLowerCase()
        : `${b.employee?.firstName || ''} ${b.employee?.lastName || ''}`.toLowerCase();
    } else if (sortBy === 'amount' && activeTab === 'expense') {
      left = Number(a.totalAmount || 0);
      right = Number(b.totalAmount || 0);
    } else {
      left = new Date(activeTab === 'leave' ? (a.startDate || a.createdAt || 0) : (a.date || a.createdAt || 0)).getTime();
      right = new Date(activeTab === 'leave' ? (b.startDate || b.createdAt || 0) : (b.date || b.createdAt || 0)).getTime();
    }

    if (left < right) return sortOrder === 'asc' ? -1 : 1;
    if (left > right) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const getLeaveTypeColor = (type) => {
    switch (type) {
      case 'Casual':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Sick':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Unpaid':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Maternity':
      case 'Paternity':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const normalizeExpenseStatus = (status) => String(status || '').trim().toLowerCase();

  const getExpenseStatusBadgeClass = (status) => {
    const normalized = normalizeExpenseStatus(status);
    if (normalized === 'approved') return 'bg-green-100 text-green-800 border-green-200';
    if (normalized === 'declined') return 'bg-red-100 text-red-800 border-red-200';
    if (normalized === 'paid') return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  const formatExpenseStatus = (status) => {
    const normalized = normalizeExpenseStatus(status);
    if (normalized === 'declined') return 'Rejected';
    if (!normalized) return 'Pending';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const getLeaveStatusBadgeClass = (status) => {
    if (status === 'Pending') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (status === 'Approved') return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'Rejected') return 'bg-red-100 text-red-800 border-red-200';
    if (status === 'Draft') return 'bg-gray-100 text-gray-800 border-gray-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="px-3 py-4 sm:px-4 sm:py-5 md:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-5 md:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Manager Approvals</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">Review and approve your team's leave and expense requests</p>
        </div>
        <button
          onClick={() => fetchPendingRequests(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center px-4 py-2 text-sm sm:text-base bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 sm:h-5 sm:w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Top KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
        <button
          onClick={() => setActiveTab('leave')}
          className={`text-left bg-white rounded-lg shadow border p-4 transition-all ${activeTab === 'leave' ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-100 hover:border-gray-200'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Pending Leave</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{pendingLeaves.length}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-2">
              <CalendarDaysIcon className="h-5 w-5 text-blue-700" />
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('expense')}
          className={`text-left bg-white rounded-lg shadow border p-4 transition-all ${activeTab === 'expense' ? 'border-violet-300 ring-2 ring-violet-100' : 'border-gray-100 hover:border-gray-200'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Expense Requests</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{pendingExpenses.length}</p>
            </div>
            <div className="rounded-lg border border-violet-100 bg-violet-50 p-2">
              <CurrencyDollarIcon className="h-5 w-5 text-violet-700" />
            </div>
          </div>
        </button>

      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-5 md:mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === 'leave' ? 'Search by employee name or VTID...' : 'Search by employee or category...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filter by type */}
          <div className={`flex items-center gap-2 ${activeTab !== 'leave' ? 'opacity-50' : ''}`}>
            <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              disabled={activeTab !== 'leave'}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="Casual">Casual</option>
              <option value="Sick">Sick</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Maternity">Maternity</option>
              <option value="Paternity">Paternity</option>
              <option value="Bereavement">Bereavement</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Sort by Date</option>
              <option value="employee">Sort by Employee</option>
              {activeTab === 'expense' && <option value="amount">Sort by Amount</option>}
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchPendingRequests(true)}
            className="px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Leave Status Tabs - Only show when viewing leave requests */}
      {activeTab === 'leave' && (
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-5 md:mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setLeaveStatusTab('pending')}
              className={`px-4 py-2 text-sm sm:text-base font-medium rounded-lg transition-colors ${
                leaveStatusTab === 'pending'
                  ? 'bg-amber-100 text-amber-900 border-2 border-amber-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
              }`}
            >
              Pending ({pendingLeaves.length})
            </button>
            <button
              onClick={() => setLeaveStatusTab('approved')}
              className={`px-4 py-2 text-sm sm:text-base font-medium rounded-lg transition-colors ${
                leaveStatusTab === 'approved'
                  ? 'bg-green-100 text-green-900 border-2 border-green-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
              }`}
            >
              Approved ({approvedLeaves.length})
            </button>
            <button
              onClick={() => setLeaveStatusTab('denied')}
              className={`px-4 py-2 text-sm sm:text-base font-medium rounded-lg transition-colors ${
                leaveStatusTab === 'denied'
                  ? 'bg-red-100 text-red-900 border-2 border-red-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
              }`}
            >
              Denied ({deniedLeaves.length})
            </button>
          </div>
        </div>
      )}

      {/* Expense Status Tabs - Only show when viewing expense requests */}
      {activeTab === 'expense' && (
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-5 md:mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setExpenseStatusTab('pending')}
              className={`px-4 py-2 text-sm sm:text-base font-medium rounded-lg transition-colors ${
                expenseStatusTab === 'pending'
                  ? 'bg-amber-100 text-amber-900 border-2 border-amber-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
              }`}
            >
              Pending ({pendingExpenses.length})
            </button>
            <button
              onClick={() => setExpenseStatusTab('approved')}
              className={`px-4 py-2 text-sm sm:text-base font-medium rounded-lg transition-colors ${
                expenseStatusTab === 'approved'
                  ? 'bg-green-100 text-green-900 border-2 border-green-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
              }`}
            >
              Approved ({approvedExpenses.length})
            </button>
            <button
              onClick={() => setExpenseStatusTab('rejected')}
              className={`px-4 py-2 text-sm sm:text-base font-medium rounded-lg transition-colors ${
                expenseStatusTab === 'rejected'
                  ? 'bg-red-100 text-red-900 border-2 border-red-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
              }`}
            >
              Rejected ({rejectedExpenses.length})
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading pending requests...</p>
        </div>
      ) : sortedRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Requests Found</h3>
          <p className="text-gray-600">
            {searchTerm || filter !== 'all'
              ? 'No requests match your current filters'
              : `No ${activeTab} requests available`}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {sortedRequests.map((request) => (
              <div key={request._id} className="bg-white rounded-lg shadow p-3 border border-gray-200">
                {/* Employee Info */}
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {activeTab === 'leave' ? `${request.employeeId?.firstName || ''} ${request.employeeId?.lastName || ''}` : `${request.employee?.firstName || ''} ${request.employee?.lastName || ''}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {activeTab === 'leave' ? (request.employeeId?.vtid || 'N/A') : (request.category || 'General')}
                    </div>
                  </div>
                  {activeTab === 'leave' ? (
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getLeaveTypeColor(request.leaveType)}`}>
                      {request.leaveType}
                    </span>
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full border bg-violet-100 text-violet-800 border-violet-200">
                        £{Number(request.totalAmount || 0).toFixed(2)}
                      </span>
                      <span className={`px-2 py-1 text-[10px] font-semibold rounded-full border ${getExpenseStatusBadgeClass(request.status)}`}>
                        {formatExpenseStatus(request.status)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-2 mb-3 text-xs">
                  {activeTab === 'leave' ? (
                    <>
                      <div className="flex items-center gap-2 text-gray-700">
                        <CalendarDaysIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium">Dates:</span>
                        <span className="text-gray-600">
                          {new Date(request.startDate).toLocaleDateString('en-GB')} - {new Date(request.endDate).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <ClockIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium">Duration:</span>
                        <span className="text-gray-600">{request.numberOfDays} days</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-gray-700">
                        <CalendarDaysIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium">Date:</span>
                        <span className="text-gray-600">{request.date ? new Date(request.date).toLocaleDateString('en-GB') : 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <CurrencyDollarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium">Amount:</span>
                        <span className="text-gray-600">£{Number(request.totalAmount || 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="text-gray-700">
                    <span className="font-medium">{activeTab === 'leave' ? 'Reason:' : 'Notes:'}</span>
                    <p className="text-gray-600 mt-1 text-xs leading-relaxed">
                      {request.reason || request.notes || 'No details provided'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 pt-1">
                    Submitted: {new Date(request.createdAt).toLocaleDateString('en-GB')}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {activeTab === 'expense' && expenseStatusTab === 'pending' && (
                    <button
                      onClick={() => openExpenseView(request)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                    >
                      <MagnifyingGlassIcon className="h-4 w-4" />
                      View
                    </button>
                  )}
                  {((activeTab === 'expense' && expenseStatusTab === 'pending') || (activeTab === 'leave' && leaveStatusTab === 'pending')) && (
                    <>
                      <button
                        onClick={() => openApprovalModal(request)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => openRejectionModal(request)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                      >
                        <XCircleIcon className="h-4 w-4" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
            <div className="w-full overflow-x-auto">
            <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'auto' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-tight">
                    Employee
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-tight">
                    {activeTab === 'leave' ? 'Type' : 'Category'}
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-tight">
                    {activeTab === 'leave' ? 'Dates' : 'Date'}
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-tight">
                    {activeTab === 'leave' ? 'Duration' : 'Amount'}
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-tight hidden lg:table-cell">
                    {activeTab === 'leave' ? 'Reason' : 'Notes'}
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-tight hidden md:table-cell">
                    Submitted
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-tight">
                    Status
                  </th>
                  {((activeTab === 'expense' && expenseStatusTab === 'pending') || (activeTab === 'leave' && leaveStatusTab === 'pending')) && (
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-tight">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <UserIcon className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-3 sm:ml-4">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">
                            {activeTab === 'leave'
                              ? `${request.employeeId?.firstName || ''} ${request.employeeId?.lastName || ''}`
                              : `${request.employee?.firstName || ''} ${request.employee?.lastName || ''}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {activeTab === 'leave' ? (request.employeeId?.vtid || 'N/A') : (request.category || 'General')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                      {activeTab === 'leave' ? (
                        <span className={`px-2 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getLeaveTypeColor(request.leaveType)}`}>
                          {request.leaveType}
                        </span>
                      ) : (
                        <span className="px-2 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border bg-violet-100 text-violet-800 border-violet-200 w-fit">
                          {request.category || 'General'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                        <span>
                          {activeTab === 'leave'
                            ? `${new Date(request.startDate).toLocaleDateString('en-GB')} - ${new Date(request.endDate).toLocaleDateString('en-GB')}`
                            : (request.date ? new Date(request.date).toLocaleDateString('en-GB') : 'N/A')}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                      {activeTab === 'leave' ? `${request.numberOfDays} days` : `£${Number(request.totalAmount || 0).toFixed(2)}`}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 hidden lg:table-cell">
                      <div className="max-w-xs truncate" title={request.reason || request.notes}>
                        {request.reason || request.notes || 'No details provided'}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                      {new Date(request.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                      {activeTab === 'leave' ? (
                        <span className={`px-2 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getLeaveStatusBadgeClass(request.status)}`}>
                          {request.status}
                        </span>
                      ) : (
                        <span className={`px-2 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getExpenseStatusBadgeClass(request.status)}`}>
                          {formatExpenseStatus(request.status)}
                        </span>
                      )}
                    </td>
                    {((activeTab === 'expense' && expenseStatusTab === 'pending') || (activeTab === 'leave' && leaveStatusTab === 'pending')) && (
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-medium align-top">
                        <div className="flex flex-col items-end gap-2 min-w-[120px]">
                          {activeTab === 'expense' && expenseStatusTab === 'pending' && (
                            <button
                              onClick={() => openExpenseView(request)}
                              className="inline-flex min-w-[96px] items-center justify-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex-shrink-0"
                            >
                              <MagnifyingGlassIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="hidden sm:inline">View</span>
                            </button>
                          )}
                          <div className="flex flex-col sm:flex-row items-end gap-2">
                            <button
                              onClick={() => openApprovalModal(request)}
                              className="inline-flex min-w-[96px] items-center justify-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex-shrink-0"
                            >
                              <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="hidden sm:inline">Approve</span>
                            </button>
                            <button
                              onClick={() => openRejectionModal(request)}
                              className="inline-flex min-w-[96px] items-center justify-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex-shrink-0"
                            >
                              <XCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="hidden sm:inline">Reject</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}

      {viewingExpenseId && (
        <ExpenseDetailsModal
          id={viewingExpenseId}
          showActions
          onClose={() => setViewingExpenseId(null)}
          onUpdated={() => {
            setViewingExpenseId(null);
            fetchPendingRequests();
          }}
        />
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-green-900">Approve {activeTab === 'leave' ? 'Leave' : 'Expense'} Request</h2>

            <div className="mb-4 bg-green-50 border border-green-200 rounded p-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Employee:</strong> {activeTab === 'leave'
                  ? `${selectedRequest.employeeId?.firstName || ''} ${selectedRequest.employeeId?.lastName || ''}`
                  : `${selectedRequest.employee?.firstName || ''} ${selectedRequest.employee?.lastName || ''}`}
              </p>
              {activeTab === 'leave' ? (
                <>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Type:</strong> {selectedRequest.leaveType}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Duration:</strong> {selectedRequest.numberOfDays} days
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Dates:</strong> {new Date(selectedRequest.startDate).toLocaleDateString('en-GB')} - {new Date(selectedRequest.endDate).toLocaleDateString('en-GB')}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Category:</strong> {selectedRequest.category || 'General'}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Amount:</strong> £{Number(selectedRequest.totalAmount || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Date:</strong> {selectedRequest.date ? new Date(selectedRequest.date).toLocaleDateString('en-GB') : 'N/A'}
                  </p>
                </>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approval Notes (Optional)
              </label>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                rows="3"
                placeholder="Add any notes or comments..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? 'Approving...' : 'Confirm Approval'}
              </button>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-red-900">Reject {activeTab === 'leave' ? 'Leave' : 'Expense'} Request</h2>

            <div className="mb-4 bg-red-50 border border-red-200 rounded p-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Employee:</strong> {activeTab === 'leave'
                  ? `${selectedRequest.employeeId?.firstName || ''} ${selectedRequest.employeeId?.lastName || ''}`
                  : `${selectedRequest.employee?.firstName || ''} ${selectedRequest.employee?.lastName || ''}`}
              </p>
              {activeTab === 'leave' ? (
                <>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Type:</strong> {selectedRequest.leaveType}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Dates:</strong> {new Date(selectedRequest.startDate).toLocaleDateString('en-GB')} - {new Date(selectedRequest.endDate).toLocaleDateString('en-GB')}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Category:</strong> {selectedRequest.category || 'General'}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Amount:</strong> £{Number(selectedRequest.totalAmount || 0).toFixed(2)}
                  </p>
                </>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows="4"
                placeholder="Please provide a clear reason for rejection..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The employee will receive this reason via email.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => setShowRejectionModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerApprovalDashboard;
