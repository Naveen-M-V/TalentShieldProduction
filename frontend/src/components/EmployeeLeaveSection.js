import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from '../utils/axiosConfig';
import LeaveRequestForm from './LeaveRequestForm';
import LeaveBalanceCards from './LeaveBalanceCards';
import UpcomingLeavesCard from './UpcomingLeavesCard';
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const EmployeeLeaveSection = () => {
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/leave/my-requests');
      if (response.data.success) {
        setMyRequests(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to load your leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSuccess = (newRequest) => {
    setMyRequests(prev => [newRequest, ...prev]);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircleIcon style={{ width: '20px', height: '20px', color: '#10b981' }} />;
      case 'Rejected':
        return <XCircleIcon style={{ width: '20px', height: '20px', color: '#ef4444' }} />;
      case 'Pending':
        return <ClockIcon style={{ width: '20px', height: '20px', color: '#f59e0b' }} />;
      default:
        return <CalendarIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
      case 'Rejected':
        return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
      case 'Pending':
        return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' };
      default:
        return { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredRequests = filter === 'all' 
    ? myRequests 
    : myRequests.filter(req => req.status === filter);

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{
        fontSize: '32px',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '8px'
      }}>
        Leave Management
      </h1>
      <p style={{
        fontSize: '16px',
        color: '#6b7280',
        marginBottom: '32px'
      }}>
        Request, track, and manage your leave requests
      </p>

      {/* Leave Balance Cards */}
      <LeaveBalanceCards />

      {/* Upcoming Leaves Card */}
      <UpcomingLeavesCard />

      {/* Two Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '32px',
        marginBottom: '32px'
      }}>
        {/* Leave Request Form */}
        <div>
          <LeaveRequestForm onSuccess={handleRequestSuccess} />
        </div>

        {/* My Leave Requests */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          height: 'fit-content'
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CalendarIcon style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
            My Requests
          </h2>

          {/* Filter */}
          <div style={{ marginBottom: '20px' }}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                background: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Requests</option>
              <option value="Draft">Drafts</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Requests List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 12px'
              }} />
              Loading...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '32px 16px',
              color: '#6b7280'
            }}>
              <CalendarIcon style={{
                width: '48px',
                height: '48px',
                color: '#d1d5db',
                margin: '0 auto 12px'
              }} />
              <p style={{ fontSize: '14px', margin: 0 }}>No leave requests yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredRequests.map((request) => {
                const statusColor = getStatusColor(request.status);
                return (
                  <div
                    key={request._id}
                    style={{
                      background: statusColor.bg,
                      border: `1px solid ${statusColor.border}`,
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: statusColor.text,
                          background: 'rgba(255, 255, 255, 0.5)',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {request.leaveType}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          color: statusColor.text,
                          fontWeight: '500'
                        }}>
                          {request.numberOfDays} day(s)
                        </span>
                      </div>
                      <p style={{
                        fontSize: '13px',
                        color: statusColor.text,
                        margin: 0,
                        fontWeight: '500'
                      }}>
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </p>
                      <p style={{
                        fontSize: '12px',
                        color: statusColor.text,
                        opacity: 0.7,
                        margin: '4px 0 0 0'
                      }}>
                        {request.status === 'Rejected' && request.rejectionReason && `Reason: ${request.rejectionReason}`}
                        {request.status === 'Approved' && 'Approved'}
                        {request.status === 'Pending' && 'Awaiting approval'}
                        {request.status === 'Draft' && 'Not submitted'}
                      </p>
                    </div>
                    <div style={{ marginLeft: '12px' }}>
                      {getStatusIcon(request.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EmployeeLeaveSection;
