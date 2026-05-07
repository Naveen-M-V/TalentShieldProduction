import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import {
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import LeaveBalanceCards from '../components/LeaveBalanceCards';
import LeaveRequestForm from '../components/LeaveRequestForm';
import UserClockIns from './UserClockIns';

const StatCard = ({ title, value, icon: Icon, accent = 'blue' }) => {
  const accentClasses = {
    blue: 'text-blue-700 bg-blue-50 border-blue-100',
    green: 'text-green-700 bg-green-50 border-green-100',
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
    violet: 'text-violet-700 bg-violet-50 border-violet-100',
    indigo: 'text-indigo-700 bg-indigo-50 border-indigo-100',
    rose: 'text-rose-700 bg-rose-50 border-rose-100'
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-100 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`rounded-lg border p-2 ${accentClasses[accent] || accentClasses.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [showLeaveRequestForm, setShowLeaveRequestForm] = useState(false);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError('');
    try {
      const response = await axios.get('/api/manager/dashboard');
      if (response.data.success && response.data.data) {
        setDashboardData(response.data.data);
      } else {
        setError(response.data.message || 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTeamMembers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.get('/api/manager/team-members', {
        params: {
          includeIndirect: 'true'
        }
      });
      if (response.data.success) {
        setTeamMembers(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchTeamMembers();
  }, [user]);

  const handleRefresh = async () => {
    await Promise.all([fetchDashboardData(true), fetchTeamMembers(true)]);
  };

  const filteredMembers = useMemo(() => {
    if (!searchTerm) return teamMembers;
    const term = searchTerm.toLowerCase();
    return teamMembers.filter(
      (member) =>
        (member.firstName || '').toLowerCase().includes(term) ||
        (member.lastName || '').toLowerCase().includes(term) ||
        (member.email || '').toLowerCase().includes(term)
    );
  }, [teamMembers, searchTerm]);

  const stats = useMemo(() => {
    const teamStats = dashboardData?.teamStats || {};
    const counts = dashboardData?.pendingApprovals?.counts || {};

    return {
      totalMembers: teamStats.totalMembers || 0,
      activeMembers: teamStats.activeMembers || 0,
      pendingLeave: counts.leave || 0,
      pendingExpense: counts.expense || 0
    };
  }, [dashboardData]);

  const leaveRequests = dashboardData?.pendingApprovals?.leaveRequests || [];
  const expenses = dashboardData?.pendingApprovals?.expenses || [];

  const currentUser = {
    id: user?._id || user?.id,
    role: user?.role,
    firstName: user?.firstName,
    lastName: user?.lastName,
    vtid: user?.vtid || user?.employeeId || ''
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {currentUser.firstName || 'Manager'}!</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg text-sm transition-colors duration-200"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Team Members" value={stats.totalMembers} icon={UsersIcon} accent="blue" />
        <StatCard title="Active Members" value={stats.activeMembers} icon={CheckCircleIcon} accent="green" />
        <StatCard title="Pending Leaves" value={stats.pendingLeave} icon={CalendarDaysIcon} accent="amber" />
        <StatCard title="Pending Expenses" value={stats.pendingExpense} icon={CurrencyDollarIcon} accent="violet" />
      </div>

      {/* My Leave Section */}
      <section className="bg-white rounded-lg shadow border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">My Leave</h2>
          <button
            type="button"
            onClick={() => setShowLeaveRequestForm(true)}
            className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors duration-200"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Request Leave
          </button>
        </div>
        <div className="p-4">
          <LeaveBalanceCards currentUser={currentUser} />
        </div>
      </section>

      {/* My Time Section */}
      <section className="bg-white rounded-lg shadow border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Clock In/Out</h2>
        </div>
        <div className="p-4">
          <UserClockIns />
        </div>
      </section>

      {/* Pending Requests Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Leaves */}
        <section className="bg-white rounded-lg shadow border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pending Leaves</h2>
              <p className="text-sm text-gray-500 mt-1">{leaveRequests.length} request{leaveRequests.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {leaveRequests.length > 0 ? (
              leaveRequests.map((request) => (
                <div key={request._id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {request.employeeId?.firstName} {request.employeeId?.lastName}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{request.leaveType}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded">
                      {request.numberOfDays} day{request.numberOfDays !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                No pending leave requests
              </div>
            )}
          </div>
        </section>

        {/* Pending Expenses */}
        <section className="bg-white rounded-lg shadow border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pending Expenses</h2>
              <p className="text-sm text-gray-500 mt-1">{expenses.length} request{expenses.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {expenses.length > 0 ? (
              expenses.map((expense) => (
                <div key={expense._id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {expense.employee?.firstName} {expense.employee?.lastName}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{expense.category}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(expense.totalAmount || 0)}
                      </p>
                      <span className="px-2 py-1 bg-violet-100 text-violet-800 text-xs font-semibold rounded mt-1 inline-block">
                        {expense.claimType || 'Expense'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                No pending expense requests
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Team Members Section */}
      <section className="bg-white rounded-lg shadow border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-4 flex-col sm:flex-row">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => navigate('/team-members')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors duration-200 whitespace-nowrap"
            >
              View All Team
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {filteredMembers.length > 0 ? (
            filteredMembers.slice(0, 10).map((member) => (
              <div key={member._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{member.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {member.department} • {member.role}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    member.isActive && member.status !== 'Terminated'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.status || 'Active'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              {searchTerm ? 'No matching team members' : 'No team members'}
            </div>
          )}
        </div>
      </section>

      {/* Leave Request Form Modal */}
      {showLeaveRequestForm && (
        <LeaveRequestForm
          isOpen={showLeaveRequestForm}
          onClose={() => setShowLeaveRequestForm(false)}
          onSuccess={() => {
            setShowLeaveRequestForm(false);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
};

export default ManagerDashboard;
