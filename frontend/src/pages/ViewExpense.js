import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  Calendar,
  MapPin,
  Download,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';

const ViewExpense = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('employee');
  const [isOwn, setIsOwn] = useState(false);

  useEffect(() => {
    fetchExpense();
  }, [id]);

  useEffect(() => {
    if (user?.role) {
      setUserRole(user.role);
    }
  }, [user]);

  const fetchExpense = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/expenses/${id}`);
      setExpense(response.data);
      
      // Check if current user is the owner
      const currentUserId = user?.id || user?._id;
      setIsOwn(!!currentUserId && response.data.submittedBy?._id === currentUserId);
    } catch (err) {
      console.error('Error fetching expense:', err);
      setError(err.response?.data?.message || 'Failed to fetch expense');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this expense claim?')) return;
    
    try {
      await axios.post(`/api/expenses/${id}/approve`);
      fetchExpense();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve expense');
    }
  };

  const handleDecline = async () => {
    const reason = window.prompt('Please provide a reason for declining this expense claim:');
    if (!reason || reason.trim().length === 0) {
      alert('Decline reason is required');
      return;
    }
    
    try {
      await axios.post(`/api/expenses/${id}/decline`, { reason });
      fetchExpense();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to decline expense');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!window.confirm('Are you sure you want to mark this expense as paid?')) return;
    
    try {
      await axios.post(`/api/expenses/${id}/pay`);
      fetchExpense();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark as paid');
    }
  };

  const handleRevertToPending = async () => {
    if (!window.confirm('Are you sure you want to revert this expense to pending status?')) return;
    
    try {
      await axios.post(`/api/expenses/${id}/revert`);
      fetchExpense();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revert to pending');
    }
  };

  const handleDownloadAttachment = async (attachmentId, fileName) => {
    try {
      const response = await axios.get(`/api/expenses/${id}/attachments/${attachmentId}`, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download attachment');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      declined: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      paid: { color: 'bg-blue-100 text-blue-800', label: 'Paid' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading expense details...</p>
        </div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Expense not found'}
        </div>
        <button
          onClick={() => navigate('/user-dashboard?tab=expenses')}
          className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft size={20} />
          Back to Expenses
        </button>
      </div>
    );
  }

  const canApprove = ['admin', 'super-admin'].includes(userRole) && expense.status === 'pending';
  const canMarkAsPaid = userRole === 'admin' && expense.status === 'approved';
  const canRevert = userRole === 'admin' && ['approved', 'declined'].includes(expense.status);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/expenses')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Expenses
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Expense Details</h1>
            <p className="text-gray-600 mt-1">
              Submitted on {format(new Date(expense.createdAt), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
          <div>{getStatusBadge(expense.status)}</div>
        </div>

        {/* Approved By Information */}
        {expense.status === 'approved' && expense.approvedBy && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Approved by {expense.approvedBy.firstName} {expense.approvedBy.lastName}
                </p>
                {expense.approvedAt && (
                  <p className="text-sm text-green-700 mt-1">
                    on {format(new Date(expense.approvedAt), 'dd/MM/yyyy HH:mm')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rejected By Information */}
        {expense.status === 'declined' && expense.declinedBy && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  Rejected by {expense.declinedBy.firstName} {expense.declinedBy.lastName}
                </p>
                {expense.declinedAt && (
                  <p className="text-sm text-red-700 mt-1">
                    on {format(new Date(expense.declinedAt), 'dd/MM/yyyy HH:mm')}
                  </p>
                )}
                {expense.declineReason && (
                  <p className="text-sm text-red-700 mt-2">
                    <strong>Reason:</strong> {expense.declineReason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {(canApprove || canMarkAsPaid || canRevert) && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-3">
            {canApprove && (
              <>
                <button
                  onClick={handleApprove}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <CheckCircle size={20} />
                  Approve
                </button>
                <button
                  onClick={handleDecline}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  <XCircle size={20} />
                  Decline
                </button>
              </>
            )}
            {canMarkAsPaid && (
              <button
                onClick={handleMarkAsPaid}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <DollarSign size={20} />
                Mark as Paid
              </button>
            )}
            {canRevert && (
              <button
                onClick={handleRevertToPending}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
              >
                <RotateCcw size={20} />
                Revert to Pending
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expense Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Basic Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500">Claim Type</label>
              <p className="font-medium capitalize">{expense.claimType}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Date</label>
              <p className="font-medium">{format(new Date(expense.date), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Category</label>
              <p className="font-medium">{expense.category}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Amount</label>
              <p className="text-2xl font-bold text-gray-900">
                {expense.currency} {expense.totalAmount.toFixed(2)}
              </p>
              {expense.tax > 0 && (
                <p className="text-sm text-gray-500">Including tax: {expense.currency} {expense.tax.toFixed(2)}</p>
              )}
            </div>
            {expense.tags && expense.tags.length > 0 && (
              <div>
                <label className="text-sm text-gray-500">Tags</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {expense.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Claim-Specific Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {expense.claimType === 'receipt' ? 'Receipt Details' : 'Mileage Details'}
          </h2>
          <div className="space-y-3">
            {expense.claimType === 'receipt' ? (
              <>
                <div>
                  <label className="text-sm text-gray-500">Supplier</label>
                  <p className="font-medium">{expense.supplier || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Receipt Value</label>
                  <p className="font-medium">{expense.currency} {(expense.receiptValue || 0).toFixed(2)}</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm text-gray-500">Distance</label>
                  <p className="font-medium">
                    {expense.mileage?.distance || 0} {expense.mileage?.unit || 'miles'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Rate per {expense.mileage?.unit || 'mile'}</label>
                  <p className="font-medium">{expense.currency} {(expense.mileage?.ratePerUnit || 0).toFixed(2)}</p>
                </div>
                {expense.mileage?.destinations && expense.mileage.destinations.length > 0 && (
                  <div>
                    <label className="text-sm text-gray-500">Journey</label>
                    <div className="mt-2 space-y-2">
                      {expense.mileage.destinations.map((dest, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <MapPin size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                          <p className="text-sm">{dest.address || `Destination ${index + 1}`}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        {expense.notes && (
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{expense.notes}</p>
          </div>
        )}

        {/* Attachments */}
        {expense.attachments && expense.attachments.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Attachments ({expense.attachments.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {expense.attachments.map((att, index) => (
                <button
                  key={index}
                  onClick={() => handleDownloadAttachment(att._id, att.name || att.fileName)}
                  className="border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition text-left"
                >
                  <FileText size={32} className="text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700 truncate">{att.name || att.fileName}</p>
                  <p className="text-xs text-gray-500">{(att.fileSize / 1024).toFixed(1)} KB</p>
                  <div className="flex items-center gap-1 mt-2 text-blue-600 text-xs">
                    <Download size={12} />
                    Download
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Approval History */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Approval History</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-500">Submitted by</span>
              <span className="font-medium">
                {expense.employee?.firstName} {expense.employee?.lastName}
                {expense.submittedBy && expense.submittedBy._id !== expense.employee?._id && (
                  <span className="text-sm text-gray-500 ml-2">
                    (via {expense.submittedBy.firstName} {expense.submittedBy.lastName})
                  </span>
                )}
              </span>
            </div>
            {expense.approvedBy && (
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-500">Approved by</span>
                <span className="font-medium">
                  {expense.approvedBy.firstName} {expense.approvedBy.lastName}
                  <span className="text-sm text-gray-500 ml-2">
                    on {format(new Date(expense.approvedAt), 'dd/MM/yyyy HH:mm')}
                  </span>
                </span>
              </div>
            )}
            {expense.declinedBy && (
              <div className="py-2 border-b border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Declined by</span>
                  <span className="font-medium">
                    {expense.declinedBy.firstName} {expense.declinedBy.lastName}
                    <span className="text-sm text-gray-500 ml-2">
                      on {format(new Date(expense.declinedAt), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </span>
                </div>
                {expense.declineReason && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
                    <p className="text-sm text-red-800">
                      <strong>Reason:</strong> {expense.declineReason}
                    </p>
                  </div>
                )}
              </div>
            )}
            {expense.paidBy && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500">Paid by</span>
                <span className="font-medium">
                  {expense.paidBy.firstName} {expense.paidBy.lastName}
                  <span className="text-sm text-gray-500 ml-2">
                    on {format(new Date(expense.paidAt), 'dd/MM/yyyy HH:mm')}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewExpense;
