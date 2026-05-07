import React, { useState } from 'react';
import { useProfiles } from '../context/ProfileContext';
import { getCertificatesForJobRole } from '../data/certificateJobRoleMapping';
import { getCertificatesForAnyJobRole } from '../utils/jobRoleResolver';
import JobRoleDropdown from './JobRoleDropdown';
import { formatDateDDMMYY } from '../utils/dateFormatter';

const ProfilesList = () => {
  const { profiles, loading, updateProfileJobRole } = useProfiles();
  const [expandedProfile, setExpandedProfile] = useState(null);
  const [editingJobRoleId, setEditingJobRoleId] = useState(null);

  const formatDate = (date) => {
    if (!date) return "N/A";
    return formatDateDDMMYY(date);
  };

  const toggleExpanded = (profileId) => setExpandedProfile(expandedProfile === profileId ? null : profileId);

  const getCertificateCount = (jobTitle) => {
    const certs = getCertificatesForAnyJobRole(jobTitle, getCertificatesForJobRole);
    return {
      mandatory: certs.mandatory.length,
      alternative: certs.alternative.length,
      total: certs.mandatory.length + certs.alternative.length
    };
  };

  const handleJobRoleChange = (profileId, event) => {
    const newJobRole = event.target.value;
    if (updateProfileJobRole) {
      updateProfileJobRole(profileId, newJobRole);
    }
    setEditingJobRoleId(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">All Profiles ({profiles.length})</h1>
        <div className="text-sm text-gray-600">
          Click on any profile to see certificate requirements
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((profile) => {
          const certCount = getCertificateCount(profile.jobTitle);
          const isExpanded = expandedProfile === profile._id;
          const isEditing = editingJobRoleId === profile._id;

          return (
            <div
              key={profile._id}
              className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => toggleExpanded(profile._id)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {profile.firstName} {profile.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{profile.email}</p>
                    <p className="text-sm text-gray-500">ID: {profile.skillkoId}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      profile.role === 'Manager'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {profile.role}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                      profile.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {profile.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Job Title:</span>
                    <span className="font-medium text-gray-900">
                      {isEditing ? (
                        <JobRoleDropdown
                          value={profile.jobTitle}
                          onChange={(event) => handleJobRoleChange(profile._id, event)}
                          className="w-56"
                        />
                      ) : (
                        <>
                          {profile.jobTitle}{' '}
                          <span
                            className="ml-2 text-xs underline text-blue-600 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingJobRoleId(profile._id);
                            }}
                          >Change Role</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Company:</span>
                    <span className="text-gray-900">{profile.company}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Staff Type:</span>
                    <span className="text-gray-900">{profile.staffType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Seen:</span>
                    <span className="text-gray-900">{formatDate(profile.lastSeen)}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Certificate Requirements</span>
                    <span className="text-xs text-gray-500">
                      {isExpanded ? 'Click to collapse' : 'Click to expand'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-red-50 p-2 rounded">
                      <div className="text-lg font-bold text-red-600">{certCount.mandatory}</div>
                      <div className="text-xs text-red-700">Mandatory</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="text-lg font-bold text-blue-600">{certCount.alternative}</div>
                      <div className="text-xs text-blue-700">Alternative</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-lg font-bold text-gray-600">{certCount.total}</div>
                      <div className="text-xs text-gray-700">Total</div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-gray-900 mb-3">Required Certificates:</h4>
                    {(() => {
                      const certs = getCertificatesForAnyJobRole(profile.jobTitle, getCertificatesForJobRole);
                      return (
                        <div className="space-y-3">
                          {certs.mandatory.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-red-700 mb-2">Mandatory ({certs.mandatory.length})</h5>
                              <div className="space-y-1">
                                {certs.mandatory.map((cert) => (
                                  <div key={cert.code} className="text-xs bg-red-50 p-2 rounded border-l-2 border-red-200">
                                    <div className="font-medium text-red-800">{cert.code}</div>
                                    <div className="text-red-600">{cert.description}</div>
                                    <div className="text-red-500">Category: {cert.category}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {certs.alternative.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-blue-700 mb-2">Alternative ({certs.alternative.length})</h5>
                              <div className="space-y-1">
                                {certs.alternative.map((cert) => (
                                  <div key={cert.code} className="text-xs bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                                    <div className="font-medium text-blue-800">{cert.code}</div>
                                    <div className="text-blue-600">{cert.description}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {profiles.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">No profiles found</div>
          <div className="text-gray-500 text-sm">
            Profiles will appear here when they are loaded from the backend or fallback data.
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilesList;
