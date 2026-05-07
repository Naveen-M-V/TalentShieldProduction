import React, { useState, useRef } from 'react';
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  CalendarIcon,
  BriefcaseIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { DatePicker } from './ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { formatDateDDMMYY } from '../utils/dateFormatter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import axios from '../utils/axiosConfig';

const TerminationFlowModal = ({ employee, isOpen, onClose, onSuccess }) => {
  const modalRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form data for termination
  const [terminationData, setTerminationData] = useState({
    terminationType: '',
    noticePeriod: '',
    lastWorkingDay: '',
    exitDate: '',
    terminationReason: '',
    managerComments: '',
    resignationLetter: null
  });

  const terminationTypes = [
    'Voluntary Resignation',
    'Termination by Company',
    'Retirement',
    'Redundancy',
    'End of Contract'
  ];

  const terminationReasons = [
    'Performance Issues',
    'Misconduct',
    'Restructuring',
    'Mutual Agreement',
    'End of Contract',
    'Retirement',
    'Other'
  ];

  const resetForm = () => {
    setTerminationData({
      terminationType: '',
      noticePeriod: '',
      lastWorkingDay: '',
      exitDate: '',
      terminationReason: '',
      managerComments: '',
      resignationLetter: null
    });
    setCurrentStep(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        return terminationData.terminationType;
      case 2:
        return terminationData.noticePeriod &&
          terminationData.lastWorkingDay &&
          terminationData.exitDate &&
          terminationData.terminationReason;
      case 3:
        return true; // Confirmation step doesn't need validation
      default:
        return true;
    }
  };

  const handleExecuteTermination = async () => {
    // Move to step 4 (Loading/Success view)
    setCurrentStep(4);
    setLoading(true);

    try {
      const response = await axios.patch(`/api/employees/${employee._id}/terminate`, {
        terminationType: terminationData.terminationType,
        noticePeriod: parseInt(terminationData.noticePeriod),
        lastWorkingDay: terminationData.lastWorkingDay,
        exitDate: terminationData.exitDate,
        terminationReason: terminationData.terminationReason,
        managerComments: terminationData.managerComments,
        resignationLetter: terminationData.resignationLetter
      });

      if (response.data.success) {
        // Success: Call parent handler but don't close modal yet
        if (onSuccess) onSuccess(response.data.data);
        // Loading false will reveal the "Success" UI in Step 4
      } else {
        setErrorMessage('Failed to terminate employee: ' + response.data.message);
        setShowErrorDialog(true);
        setCurrentStep(3); // Go back to confirmation if failed
      }
    } catch (error) {
      console.error('Error terminating employee:', error);
      setErrorMessage('Error terminating employee: ' + (error.response?.data?.message || error.message));
      setShowErrorDialog(true);
      setCurrentStep(3); // Go back to confirmation if failed
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Step 1: Initiate Termination
  if (currentStep === 1) {
    return (
      <div
        id="termination-modal-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            padding: '32px',
            position: 'relative',
            color: 'white'
          }}>
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <XMarkIcon style={{ width: '24px', height: '24px', color: 'white' }} />
            </button>

            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
              Initiate Termination
            </h2>
            <p style={{ opacity: '0.9', fontSize: '16px' }}>
              Step 1 of 4: Select termination type
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '32px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                Employee: {employee.firstName} {employee.lastName}
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                Please select the type of termination to proceed with the offboarding process.
              </p>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Termination Type *
              </label>
              <Select
                value={terminationData.terminationType}
                onValueChange={(value) => setTerminationData(prev => ({ ...prev, terminationType: value }))}
              >
                <SelectTrigger style={{ width: '100%', height: '48px' }}>
                  <SelectValue placeholder="Select termination type" />
                </SelectTrigger>
                <SelectContent className="z-[10001]">
                  {terminationTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={handleClose}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#6b7280',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={!validateStep()}
                style={{
                  padding: '12px 24px',
                  background: validateStep() ? '#dc2626' : '#d1d5db',
                  color: validateStep() ? '#ffffff' : '#9ca3af',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: validateStep() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Next
                <ChevronRightIcon style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Termination Details
  if (currentStep === 2) {
    return (
      <div
        id="termination-modal-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            padding: '32px',
            position: 'relative',
            color: 'white'
          }}>
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <XMarkIcon style={{ width: '24px', height: '24px', color: 'white' }} />
            </button>

            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
              Termination Details
            </h2>
            <p style={{ opacity: '0.9', fontSize: '16px' }}>
              Step 2 of 4: Fill in termination information
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Notice Period (days) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={terminationData.noticePeriod}
                  onChange={(e) => setTerminationData(prev => ({ ...prev, noticePeriod: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="e.g., 30"
                />
              </div>

              <div style={{ position: 'relative', zIndex: 10001 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Last Working Day *
                </label>
                <DatePicker
                  value={terminationData.lastWorkingDay ? new Date(terminationData.lastWorkingDay) : null}
                  onChange={(date) => setTerminationData(prev => ({
                    ...prev,
                    lastWorkingDay: date ? date.format('YYYY-MM-DD') : ''
                  }))}
                  disablePortal={true}
                />
              </div>

              <div style={{ position: 'relative', zIndex: 10001 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Exit Date *
                </label>
                <DatePicker
                  value={terminationData.exitDate ? new Date(terminationData.exitDate) : null}
                  onChange={(date) => setTerminationData(prev => ({
                    ...prev,
                    exitDate: date ? date.format('YYYY-MM-DD') : ''
                  }))}
                  disablePortal={true}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Termination Reason *
                </label>
                <Select
                  value={terminationData.terminationReason}
                  onValueChange={(value) => setTerminationData(prev => ({ ...prev, terminationReason: value }))}
                >
                  <SelectTrigger style={{ width: '100%', height: '48px' }}>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent className="z-[10001]">
                    {terminationReasons.map(reason => (
                      <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Manager Comments
              </label>
              <textarea
                value={terminationData.managerComments}
                onChange={(e) => setTerminationData(prev => ({ ...prev, managerComments: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  minHeight: '100px',
                  resize: 'vertical'
                }}
                placeholder="Add any additional comments or notes..."
              />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Resignation Letter (Optional)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setTerminationData(prev => ({ ...prev, resignationLetter: e.target.files[0] }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handlePrevious}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#6b7280',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <ChevronLeftIcon style={{ width: '16px', height: '16px' }} />
                  Previous
                </button>
                <button
                  onClick={handleClose}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#6b7280',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
              </div>
              <button
                onClick={handleNext}
                disabled={!validateStep()}
                style={{
                  padding: '12px 24px',
                  background: validateStep() ? '#dc2626' : '#d1d5db',
                  color: validateStep() ? '#ffffff' : '#9ca3af',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: validateStep() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Next
                <ChevronRightIcon style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Confirmation
  if (currentStep === 3) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            padding: '32px',
            position: 'relative',
            color: 'white'
          }}>
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <XMarkIcon style={{ width: '24px', height: '24px', color: 'white' }} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <ExclamationTriangleIcon style={{ width: '32px', height: '32px' }} />
              <h2 style={{ fontSize: '24px', fontWeight: '700' }}>
                Confirmation Required
              </h2>
            </div>
            <p style={{ opacity: '0.9', fontSize: '16px' }}>
              Step 3 of 4: Review and confirm termination
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '32px' }}>
            <div style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#92400e' }}>
                <ExclamationTriangleIcon style={{ width: '20px', height: '20px' }} />
                <span style={{ fontWeight: '600' }}>This action cannot be undone</span>
              </div>
              <p style={{ color: '#92400e', fontSize: '14px', marginTop: '8px' }}>
                Once terminated, the employee will lose access to all systems and will be removed from active employee lists.
              </p>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                Termination Summary
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
                <div>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Employee:</span>
                  <div style={{ color: '#111827', fontWeight: '600', marginTop: '4px' }}>
                    {employee.firstName} {employee.lastName}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Termination Type:</span>
                  <div style={{ color: '#111827', fontWeight: '600', marginTop: '4px' }}>
                    {terminationData.terminationType}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Notice Period:</span>
                  <div style={{ color: '#111827', fontWeight: '600', marginTop: '4px' }}>
                    {terminationData.noticePeriod} days
                  </div>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Last Working Day:</span>
                  <div style={{ color: '#111827', fontWeight: '600', marginTop: '4px' }}>
                    {formatDateDDMMYY(terminationData.lastWorkingDay)}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Exit Date:</span>
                  <div style={{ color: '#111827', fontWeight: '600', marginTop: '4px' }}>
                    {formatDateDDMMYY(terminationData.exitDate)}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Reason:</span>
                  <div style={{ color: '#111827', fontWeight: '600', marginTop: '4px' }}>
                    {terminationData.terminationReason}
                  </div>
                </div>
              </div>

              {terminationData.managerComments && (
                <div style={{ marginTop: '16px' }}>
                  <span style={{ color: '#6b7280', fontWeight: '500', fontSize: '14px' }}>Manager Comments:</span>
                  <div style={{ color: '#111827', marginTop: '4px', fontSize: '14px', lineHeight: '1.5' }}>
                    {terminationData.managerComments}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handlePrevious}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#6b7280',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <ChevronLeftIcon style={{ width: '16px', height: '16px' }} />
                  Previous
                </button>
                <button
                  onClick={handleClose}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#6b7280',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
              </div>
              <button
                onClick={handleExecuteTermination}
                style={{
                  padding: '12px 24px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Confirm Termination
                <ChevronRightIcon style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Execute Termination
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        animation: 'slideUp 0.3s ease-out'
      }}>
        {/* Header */}
        <div style={{
          background: loading ? '#6b7280' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: '32px',
          position: 'relative',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            {loading ? (
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                borderTop: '3px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            ) : (
              <CheckCircleIcon style={{ width: '32px', height: '32px' }} />
            )}
            <h2 style={{ fontSize: '24px', fontWeight: '700' }}>
              {loading ? 'Processing Termination' : 'Termination Complete'}
            </h2>
          </div>
          <p style={{ opacity: '0.9', fontSize: '16px' }}>
            Step 4 of 4: {loading ? 'Please wait...' : 'Employee has been terminated'}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '32px', textAlign: 'center' }}>
          {loading ? (
            <div>
              <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 24px'
              }} />
              <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '16px' }}>
                Executing termination process...
              </p>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                This may take a few moments to complete.
              </p>
            </div>
          ) : (
            <div>
              <div style={{
                width: '60px',
                height: '60px',
                background: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <CheckCircleIcon style={{ width: '32px', height: '32px', color: 'white' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                Termination Successful
              </h3>
              <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '24px' }}>
                {employee.firstName} {employee.lastName} has been successfully terminated and removed from active systems.
              </p>
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'left'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#166534' }}>
                  What happens next:
                </h4>
                <ul style={{ fontSize: '14px', color: '#166534', margin: 0, paddingLeft: '20px' }}>
                  <li>Employee login has been disabled</li>
                  <li>Removed from active employee lists</li>
                  <li>Excluded from leave accrual and scheduling</li>
                  <li>All employee data has been preserved</li>
                </ul>
              </div>
              <button
                onClick={handleClose}
                style={{
                  padding: '12px 24px',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {/* Error Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Termination Error</AlertDialogTitle>
            <AlertDialogDescription>
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TerminationFlowModal;
