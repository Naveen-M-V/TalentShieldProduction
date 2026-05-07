import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useProfiles } from "../context/ProfileContext";
import { useCertificates } from "../context/CertificateContext";
import { EyeIcon, UserIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { getImageUrl } from '../utils/config';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { formatDateDDMMYY } from '../utils/dateFormatter';

export default function Sharestaff() {
  const [search, setSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const { profiles, loading } = useProfiles();
  const { certificates } = useCertificates();

  // Filter profiles based on search
  const filteredStaff = profiles.filter(
    (profile) =>
      profile.firstName.toLowerCase().includes(search.toLowerCase()) ||
      profile.lastName.toLowerCase().includes(search.toLowerCase()) ||
      (profile.jobTitle && profile.jobTitle.toLowerCase().includes(search.toLowerCase())) ||
      (profile.company && profile.company.toLowerCase().includes(search.toLowerCase()))
  );

  // Pagination
  const totalPages = Math.ceil(filteredStaff.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedStaff = filteredStaff.slice(startIndex, startIndex + entriesPerPage);

  // Get certificate count for each staff member
  const getCertificateCount = (profileName) => {
    return certificates.filter(cert => 
      cert.profileName === profileName && cert.status === 'Approved'
    ).length;
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return formatDateDDMMYY(date);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Share Staff</h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1 sm:mt-2">
              Manage and share staff information with clients. Total staff: {filteredStaff.length}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Auto-share enabled
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700">Show</label>
              <Select 
                value={String(entriesPerPage)}
                onValueChange={(value) => {
                  setEntriesPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-700">entries</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto border border-gray-300 rounded-md px-3 sm:px-4 py-2 pl-8 sm:pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <button className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm whitespace-nowrap">
              Export CSV
            </button>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3 mb-4">
          {paginatedStaff.length > 0 ? (
            paginatedStaff.map((profile) => {
              const fullName = `${profile.firstName} ${profile.lastName}`;
              const certCount = getCertificateCount(fullName);
              
              return (
                <div key={profile._id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0">
                      {profile.profilePicture ? (
                        <img 
                          className="h-12 w-12 rounded-full object-cover" 
                          src={getImageUrl(profile.profilePicture)}
                          alt={fullName}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{fullName}</div>
                      <div className="text-sm text-gray-500 truncate">{profile.email}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          profile.staffType === 'Direct' ? 'bg-green-100 text-green-800' :
                          profile.staffType === 'Contractor' ? 'bg-blue-100 text-blue-800' :
                          profile.staffType === 'Agency' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {profile.staffType || 'Direct'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">Company:</span>
                      <div className="font-medium">{profile.company || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Job Title:</span>
                      <div className="font-medium">
                        {Array.isArray(profile.jobTitle) 
                          ? profile.jobTitle.join(', ') 
                          : (profile.jobTitle || 'N/A')
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Certificates:</span>
                      <div className="font-medium">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                          certCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          <DocumentTextIcon className="h-3 w-3 mr-1" />
                          {certCount}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <div className="font-medium">{formatDate(profile.createdAt)}</div>
                    </div>
                  </div>
                  
                  <Link
                    to={`/profile/${profile._id}`}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    <EyeIcon className="h-4 w-4" />
                    View Profile
                  </Link>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-base font-medium text-gray-900 mb-2">No staff found</h3>
              <p className="text-sm text-gray-500">
                {search ? 'Try adjusting your search criteria.' : 'No staff members available.'}
              </p>
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'auto' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff Member
                </th>
                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                  Company
                </th>
                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Title
                </th>
                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Staff Type
                </th>
                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Certificates
                </th>
                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                  Status
                </th>
                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                  Created
                </th>
                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedStaff.length > 0 ? (
                paginatedStaff.map((profile) => {
                  const fullName = `${profile.firstName} ${profile.lastName}`;
                  const certCount = getCertificateCount(fullName);
                  
                  return (
                    <tr key={profile._id} className="hover:bg-gray-50">
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {profile.profilePicture ? (
                              <img 
                                className="h-10 w-10 rounded-full object-cover" 
                                src={getImageUrl(profile.profilePicture)}
                                alt={fullName}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <UserIcon className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-3 sm:ml-4">
                            <div className="text-sm font-medium text-gray-900">{fullName}</div>
                            <div className="text-xs sm:text-sm text-gray-500">{profile.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden xl:table-cell">
                        {profile.company || 'N/A'}
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {Array.isArray(profile.jobTitle) 
                          ? profile.jobTitle.join(', ') 
                          : (profile.jobTitle || 'N/A')
                        }
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          profile.staffType === 'Direct' ? 'bg-green-100 text-green-800' :
                          profile.staffType === 'Contractor' ? 'bg-blue-100 text-blue-800' :
                          profile.staffType === 'Agency' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {profile.staffType || 'Direct'}
                        </span>
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-1" />
                          {certCount}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          profile.status === 'Onboarded' ? 'bg-green-100 text-green-800' :
                          profile.status === 'Onboarding' ? 'bg-yellow-100 text-yellow-800' :
                          profile.status === 'Left' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {profile.status || 'Onboarding'}
                        </span>
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                        {formatDate(profile.createdOn)}
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Link 
                            to={`/profiledetailview/${profile._id}`}
                            className="inline-flex items-center px-2 sm:px-3 py-1 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <EyeIcon className="h-4 w-4 lg:mr-1" />
                            <span className="hidden lg:inline">View</span>
                          </Link>
                          <Link 
                            to={`/edituserprofile/${profile._id}`}
                            className="inline-flex items-center px-2 sm:px-3 py-1 border border-transparent rounded-md text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <span className="hidden lg:inline">Edit</span>
                            <span className="lg:hidden">✎</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-3 lg:px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No staff found</h3>
                      <p className="text-sm text-gray-500">
                        {search ? 'Try adjusting your search criteria.' : 'No staff members available.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-4 sm:mt-6">
            <div className="text-xs sm:text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(startIndex + entriesPerPage, filteredStaff.length)} of {filteredStaff.length} results
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-2 sm:px-3 py-1 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-2 sm:px-3 py-1 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
