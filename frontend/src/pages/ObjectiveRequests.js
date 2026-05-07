import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { buildApiUrl } from '../utils/apiConfig';
import { Calendar, User, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const ADMIN_ROLES = ['admin', 'super-admin'];

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const statusIcons = {
  pending: Clock,
  completed: CheckCircle,
  overdue: AlertCircle,
  cancelled: XCircle
};

function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="border-t px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export default function ObjectiveRequests() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    employeeId: '',
    message: '',
    deadline: ''
  });

  const authConfig = () => {
    const token = localStorage.getItem('auth_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return { withCredentials: true, headers };
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
      fetchEmployees();
    }
  }, [isAdmin]);

  const loadUser = async () => {
    try {
      const res = await axios.get(buildApiUrl('/auth/me'), authConfig());
      const resolvedUser = res.data?.data?.user ?? res.data?.user ?? res.data;
      setUser(resolvedUser);
      const adminFlag = ADMIN_ROLES.includes(resolvedUser?.role);
      setIsAdmin(adminFlag);

      if (!adminFlag) {
        toast.error('Only managers can access this page');
      }
    } catch (err) {
      console.error('Failed to load user', err);
      toast.error('Authentication failed');
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(buildApiUrl('/objective-requests'), authConfig());
      const data = res.data?.data || res.data || [];
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch requests', err);
      toast.error('Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(buildApiUrl('/employees'), authConfig());
      const payload = Array.isArray(res.data) ? res.data : res.data.employees || res.data.data || [];
      setEmployees(payload);
    } catch (err) {
      console.error('Failed to load employees', err);
      setEmployees([]);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();

    if (!formData.employeeId) {
      toast.error('Please select an employee');
      return;
    }

    if (!formData.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (!formData.deadline) {
      toast.error('Please select a deadline');
      return;
    }

    try {
      await axios.post(
        buildApiUrl('/objective-requests'),
        formData,
        authConfig()
      );

      toast.success('Objective request sent successfully');
      setShowCreateModal(false);
      setFormData({ employeeId: '', message: '', deadline: '' });
      fetchRequests();
    } catch (err) {
      console.error('Failed to create request', err);
      toast.error(err.response?.data?.message || 'Failed to send request');
    }
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      await axios.put(
        buildApiUrl(`/objective-requests/${requestId}`),
        { status: newStatus },
        authConfig()
      );

      toast.success(`Request marked as ${newStatus}`);
      fetchRequests();
    } catch (err) {
      console.error('Failed to update status', err);
      toast.error('Failed to update request');
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;

    try {
      await axios.delete(
        buildApiUrl(`/objective-requests/${requestId}`),
        authConfig()
      );

      toast.success('Request deleted');
      fetchRequests();
    } catch (err) {
      console.error('Failed to delete request', err);
      toast.error('Failed to delete request');
    }
  };

  const handleCheckOverdue = async () => {
    try {
      const res = await axios.get(
        buildApiUrl('/objective-requests/check-overdue'),
        authConfig()
      );

      const count = res.data?.count || 0;
      if (count > 0) {
        toast.success(`Marked ${count} request(s) as overdue`);
        fetchRequests();
      } else {
        toast.info('No overdue requests found');
      }
    } catch (err) {
      console.error('Failed to check overdue', err);
      toast.error('Failed to check overdue requests');
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
    const matchesSearch = searchTerm === '' ||
      req.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.department?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    completed: requests.filter(r => r.status === 'completed').length,
    overdue: requests.filter(r => r.status === 'overdue').length
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">Only managers can access this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-4 md:px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Objective Requests</h1>
            <p className="text-sm text-gray-600">Request employees to create their objectives</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCheckOverdue}
              className="px-4 py-2 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-100 border border-orange-200"
            >
              Check Overdue
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 shadow-sm"
            >
              + New Request
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 md:px-6 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: statusCounts.all, color: 'blue' },
            { label: 'Pending', value: statusCounts.pending, color: 'yellow' },
            { label: 'Completed', value: statusCounts.completed, color: 'green' },
            { label: 'Overdue', value: statusCounts.overdue, color: 'red' }
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg border p-4 shadow-sm">
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border p-4 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by employee or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg border py-12 text-center shadow-sm">
            <p className="text-gray-600">No requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const StatusIcon = statusIcons[request.status] || Clock;
              const isOverdue = new Date(request.deadline) < new Date() && request.status === 'pending';
              
              return (
                <div key={request._id} className="bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="mt-1">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{request.employeeName}</h3>
                          <p className="text-sm text-gray-600">{request.department}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}>
                            <StatusIcon className="w-3 h-3" />
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                          {isOverdue && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="ml-8">
                        <p className="text-sm text-gray-700 mb-3">{request.message}</p>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Deadline: {new Date(request.deadline).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Requested: {new Date(request.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}</span>
                          </div>
                          {request.completedAt && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span>Completed: {new Date(request.completedAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}</span>
                            </div>
                          )}
                        </div>

                        {request.notes && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                            <p className="font-medium text-gray-900 mb-1">Notes:</p>
                            {request.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="ml-8 mt-4 flex flex-wrap gap-2">
                    {request.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(request._id, 'completed')}
                        className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-lg hover:bg-green-100 border border-green-200"
                      >
                        Mark Completed
                      </button>
                    )}
                    {request.status !== 'cancelled' && (
                      <button
                        onClick={() => handleUpdateStatus(request._id, 'cancelled')}
                        className="px-3 py-1 bg-gray-50 text-gray-700 text-sm rounded-lg hover:bg-gray-100 border border-gray-200"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteRequest(request._id)}
                      className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-lg hover:bg-red-100 border border-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      <Modal
        open={showCreateModal}
        title="Request Objectives"
        onClose={() => {
          setShowCreateModal(false);
          setFormData({ employeeId: '', message: '', deadline: '' });
        }}
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateRequest}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Send Request
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Select Employee *
            </label>
            <select
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              required
            >
              <option value="">-- Choose an employee --</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} - {emp.department || 'No Department'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Please create your objectives for this quarter by the deadline..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Deadline *
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
