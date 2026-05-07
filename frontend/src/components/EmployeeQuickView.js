import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  XMarkIcon,
  EnvelopeIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  BriefcaseIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

/**
 * EmployeeQuickView Modal Component
 * Similar to BrightHR's employee quick view
 * Shows employee details, teams, contacts, and reporting structure
 */
const EmployeeQuickView = ({ employee, isOpen, onClose, onViewFullProfile }) => {
  const [workingStatus, setWorkingStatus] = useState('Working from home');
  const [reportsTo, setReportsTo] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee && isOpen) {
      fetchReportingStructure();
      determineWorkingStatus();
    }
  }, [employee, isOpen]);

  const fetchReportingStructure = async () => {
    if (!employee?.managerId) return;
    
    // Validate MongoDB ObjectId format (24 hex characters)
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    if (!objectIdPattern.test(employee.managerId)) {
      console.warn('Invalid manager ID format:', employee.managerId);
      return;
    }
    
    setLoading(true);
    try {
      // Fetch direct manager details
      const response = await axios.get(`/api/employees/${employee.managerId}`);
      if (response.data.success) {
        const manager = response.data.data;
        
        const managers = [{
          id: manager._id,
          name: `${manager.firstName} ${manager.lastName}`,
          jobTitle: manager.jobTitle,
          avatar: manager.avatar,
          initials: manager.initials || `${manager.firstName[0]}${manager.lastName[0]}`,
          color: manager.color || '#3B82F6',
          workLocation: manager.workLocation || 'SCB Group Office'
        }];
        
        // If manager has a manager, fetch them too (up the chain)
        if (manager.managerId && objectIdPattern.test(manager.managerId)) {
          try {
            const upperResponse = await axios.get(`/api/employees/${manager.managerId}`);
            if (upperResponse.data.success) {
              const upperManager = upperResponse.data.data;
              managers.push({
                id: upperManager._id,
                name: `${upperManager.firstName} ${upperManager.lastName}`,
                jobTitle: upperManager.jobTitle,
                avatar: upperManager.avatar,
                initials: upperManager.initials || `${upperManager.firstName[0]}${upperManager.lastName[0]}`,
                color: upperManager.color || '#3B82F6',
                workLocation: upperManager.workLocation || 'SCB Group Office'
              });
            }
          } catch (err) {
            console.log('Could not fetch upper manager');
          }
        }
        
        setReportsTo(managers);
      }
    } catch (error) {
      console.error('Error fetching reporting structure:', error);
    } finally {
      setLoading(false);
    }
  };

  const determineWorkingStatus = () => {
    if (!employee) return;
    
    // Determine status based on work location
    if (employee.workLocation === 'Remote') {
      setWorkingStatus('Working from home');
    } else if (employee.workLocation === 'On-site') {
      setWorkingStatus('Working from usual location');
    } else if (employee.workLocation === 'Hybrid') {
      setWorkingStatus('Working from usual location');
    } else {
      setWorkingStatus('Working from usual location');
    }
  };

  const handleSetWorkingStatus = () => {
    // This would open a dialog to update working status
    console.log('Set working status clicked');
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all">
          {/* Header - Blue background like BrightHR */}
          <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Employee quick view</h2>
              <button
                onClick={onClose}
                className="text-white hover:bg-blue-700 rounded-lg p-1 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Employee Header */}
            <div className="flex items-start gap-4 mb-6">
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0"
                style={{ backgroundColor: employee.color || '#3B82F6' }}
              >
                {employee.avatar ? (
                  <img
                    src={employee.avatar}
                    alt={employee.fullName}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  employee.initials || `${employee.firstName[0]}${employee.lastName[0]}`
                )}
              </div>

              {/* Employee Info */}
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-gray-900">
                  {employee.firstName} {employee.lastName}
                </h3>
                <p className="text-gray-600 text-lg">{employee.jobTitle}</p>
                <button
                  onClick={onViewFullProfile}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1"
                >
                  View full profile
                </button>
              </div>
            </div>

            {/* Working Status */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <HomeIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-gray-900 font-medium">{workingStatus}</p>
                  </div>
                </div>
                <button
                  onClick={handleSetWorkingStatus}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Set working status
                </button>
              </div>
            </div>

            {/* Teams Section */}
            {employee.team && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">{employee.firstName}'s teams</h4>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">
                  <UserGroupIcon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-900">{employee.team}</span>
                </div>
              </div>
            )}

            {/* Contact Section */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Contact {employee.firstName}</h4>
              <div className="space-y-3">
                <a
                  href={`mailto:${employee.email}`}
                  className="flex items-center gap-3 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <EnvelopeIcon className="w-5 h-5" />
                  <span className="text-sm">{employee.email}</span>
                </a>
                {employee.phone && (
                  <a
                    href={`tel:${employee.phone}`}
                    className="flex items-center gap-3 text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <PhoneIcon className="w-5 h-5" />
                    <span className="text-sm">{employee.phone}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className="mb-6 space-y-3">
              {employee.department && (
                <div className="flex items-center gap-3">
                  <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Department</p>
                    <p className="text-sm text-gray-900">{employee.department}</p>
                  </div>
                </div>
              )}
              {employee.office && (
                <div className="flex items-center gap-3">
                  <MapPinIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Office Location</p>
                    <p className="text-sm text-gray-900">{employee.office}</p>
                  </div>
                </div>
              )}
              {employee.employmentType && (
                <div className="flex items-center gap-3">
                  <BriefcaseIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Employment Type</p>
                    <p className="text-sm text-gray-900">{employee.employmentType}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Reports To Section */}
            {reportsTo.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  {employee.firstName} reports to {reportsTo.length} {reportsTo.length === 1 ? 'person' : 'people'}
                </h4>
                <div className="space-y-3">
                  {reportsTo.map((manager) => (
                    <div
                      key={manager.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      {/* Manager Avatar */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                        style={{ backgroundColor: manager.color }}
                      >
                        {manager.avatar ? (
                          <img
                            src={manager.avatar}
                            alt={manager.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          manager.initials
                        )}
                      </div>
                      
                      {/* Manager Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{manager.name}</p>
                        <p className="text-xs text-gray-600">{manager.jobTitle}</p>
                        <button className="text-xs text-blue-600 hover:text-blue-700 mt-1">
                          View full profile
                        </button>
                      </div>

                      {/* Location Badge */}
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        {manager.workLocation === 'Working from home' ? (
                          <>
                            <HomeIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Working from home</span>
                          </>
                        ) : (
                          <>
                            <BuildingOfficeIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">{manager.workLocation}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer - Action Buttons */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200 flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={onViewFullProfile}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View full profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeQuickView;
