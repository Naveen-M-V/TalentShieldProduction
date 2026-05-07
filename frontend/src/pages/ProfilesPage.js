// src/pages/ProfilesPage.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useProfiles } from '../context/ProfileContext';
import { EyeIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAlert } from "../components/AlertNotification";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from '../components/ui/pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { formatDateDDMMYY } from '../utils/dateFormatter';


// Safely get VTID for a profile row
function generateVTID(profile) {
  if (!profile) return "N/A";
  // If backend has assigned a VTID, use it
  if (profile.vtid) return profile.vtid;
  // Otherwise, show placeholder
  return "N/A";
}

export default function ProfilesPage() {
  const { success, error } = useAlert();
  const { profiles, deleteProfile, fetchProfiles } = useProfiles();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStaffType, setSelectedStaffType] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedManager, setSelectedManager] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState({ id: null, name: '' });
  const [selectedProfiles, setSelectedProfiles] = useState(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const navigate = useNavigate();

  // Get unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    if (!Array.isArray(profiles)) {
      console.error("Profiles data is not an array:", profiles);
      return { roles: [], staffTypes: [], companies: [], managers: [] };
    }

    const roles = [...new Set(profiles.map(p => p.role).filter(Boolean))].sort();
    const staffTypes = [...new Set(profiles.map(p => p.staffType).filter(Boolean))].sort();
    const companies = [...new Set(profiles.map(p => p.company).filter(Boolean))].sort();
    const managers = [...new Set(profiles.map(p => p.poc).filter(Boolean))].sort();
    
    return { roles, staffTypes, companies, managers };
  }, [profiles]);

  // Format date helper function
  const formatDate = (date) => {
    if (!date) return "N/A";
    return formatDateDDMMYY(date);
  };

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearch("");
    setCurrentPage(1);
    setSelectedRole("all");
    setSelectedStaffType("all");
    setSelectedCompany("all");
    setSelectedManager("all");
    setSelectedProfiles(new Set());
  }, []);

  // Handle profile deletion
  const handleDeleteProfile = useCallback(async (profileId, profileName) => {
    console.log('handleDeleteProfile called with:', { profileId, profileName });
    
    // Validate inputs
    if (!profileId || !profileName) {
      console.error('Invalid profile data:', { profileId, profileName });
      error('Invalid profile data. Please refresh the page and try again.');
      return;
    }

    // Check if deleteProfile function exists
    if (typeof deleteProfile !== 'function') {
      console.error('deleteProfile function not available');
      error('Delete function not available. Please refresh the page and try again.');
      return;
    }

    console.log('User confirmed deletion');
    setLoading(true);
      
      try {
        console.log('Calling deleteProfile function...');
        const response = await deleteProfile(profileId);
        console.log('Delete response:', response);

        // Show simple success message
        let successMessage = `'${profileName}' has been deleted successfully`;

        success(successMessage);
        console.log(`Profile ${profileName} deleted successfully`, response);
        
        // Refresh the profiles list to ensure UI is updated
        console.log('Refreshing profiles list...');
        await fetchProfiles();
        console.log('Profiles refreshed');
        
      } catch (err) {
        console.error('Error deleting profile:', err);
        error(`Failed to delete profile: ${err.message || 'Please try again.'}`);
      } finally {
        setLoading(false);
      }
  }, [deleteProfile, profiles, fetchProfiles]);

  // Handle profile selection
  const handleProfileSelect = useCallback((profileId) => {
    setSelectedProfiles(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(profileId)) {
        newSelection.delete(profileId);
      } else {
        newSelection.add(profileId);
      }
      return newSelection;
    });
  }, []);


  // Filtered profiles with memoization for performance
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchesSearch = `${p.firstName} ${p.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesRole = !selectedRole || selectedRole === 'all' || p.role === selectedRole;
      const matchesStaffType = !selectedStaffType || selectedStaffType === 'all' || p.staffType === selectedStaffType;
      const matchesCompany = !selectedCompany || selectedCompany === 'all' || p.company === selectedCompany;
      const matchesManager = !selectedManager || selectedManager === 'all' || p.poc === selectedManager;

      return matchesSearch && matchesRole && matchesStaffType && matchesCompany && matchesManager;
    });
  }, [profiles, search, selectedRole, selectedStaffType, selectedCompany, selectedManager]);

         // Pagination logic
  const itemsPerPage = 10; // Fixed at 10 as per requirement
  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedProfiles = filteredProfiles.slice(startIndex, endIndex);


  // Handle select all
 const handleSelectAll = useCallback(() => {
  if (!displayedProfiles.length) {
    setSelectedProfiles(new Set());
    return;
  }

  if (selectedProfiles.size === displayedProfiles.length) {
    setSelectedProfiles(new Set());
  } else {
    setSelectedProfiles(new Set(displayedProfiles.map(p => p._id)));
  }
}, [selectedProfiles.size, displayedProfiles]);


  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedProfiles.size === 0) return;
    
    setLoading(true);
    const profileIds = Array.from(selectedProfiles);
    let successCount = 0;
    let errorCount = 0;
    let errorMessage = '';
    
    try {
      // Delete profiles one by one using the existing deleteProfile function
      for (const profileId of profileIds) {
        try {
          const profile = profiles.find(p => p._id === profileId);
          const profileName = profile ? `${profile.firstName} ${profile.lastName}` : 'Unknown';
          
          await deleteProfile(profileId);
          successCount++;
        } catch (err) {
          errorCount++;
          if (!errorMessage) {
            errorMessage = err.message || 'Failed to delete some profiles';
          }
          console.error(`Error deleting profile ${profileId}:`, err);
        }
      }
      
      if (successCount > 0) {
        let successMessage = `${successCount} profile(s) deleted successfully!`;
        if (errorCount > 0) {
          successMessage += `\n${errorCount} profile(s) failed to delete.`;
        }
        success(successMessage);
        setSelectedProfiles(new Set());
        await fetchProfiles();
      } else {
        throw new Error(errorMessage || 'Failed to delete any profiles');
      }
    } catch (err) {
      console.error('Error bulk deleting profiles:', err);
      error(`Failed to delete profiles: ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
      setShowBulkDeleteDialog(false);
    }
  }, [selectedProfiles, profiles, deleteProfile]);

  // Load profiles on mount and refresh when component becomes visible
  useEffect(() => {
    fetchProfiles();
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchProfiles();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Remove fetchProfiles dependency to prevent infinite loop

  

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedRole, selectedStaffType, selectedCompany, selectedManager]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      if (start > 2) pages.push('ellipsis-start');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('ellipsis-end');
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Profiles</h1>
                <p className="text-gray-600 mt-1">Manage and track all employee profiles</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Rows per page - Fixed at 10 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">10 entries per page</span>
              </div>
            </div>

            {/* Filters */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-5 gap-4">
                <Select 
                  value={selectedRole} 
                  onValueChange={setSelectedRole}
                >
                  <SelectTrigger className="border border-gray-300 rounded-lg px-3 py-2">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {filterOptions.roles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={selectedStaffType} 
                  onValueChange={setSelectedStaffType}
                >
                  <SelectTrigger className="border border-gray-300 rounded-lg px-3 py-2">
                    <SelectValue placeholder="All Staff Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff Types</SelectItem>
                    {filterOptions.staffTypes.map(staffType => (
                      <SelectItem key={staffType} value={staffType}>{staffType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={selectedCompany} 
                  onValueChange={setSelectedCompany}
                >
                  <SelectTrigger className="border border-gray-300 rounded-lg px-3 py-2">
                    <SelectValue placeholder="All Companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {filterOptions.companies.map(company => (
                      <SelectItem key={company} value={company}>{company}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={selectedManager} 
                  onValueChange={setSelectedManager}
                >
                  <SelectTrigger className="border border-gray-300 rounded-lg px-3 py-2">
                    <SelectValue placeholder="All Managers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {filterOptions.managers.map(manager => (
                      <SelectItem key={manager} value={manager}>{manager}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-300"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table Header with Bulk Actions */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {selectedProfiles.size > 0 
                    ? `${selectedProfiles.size} profile${selectedProfiles.size === 1 ? '' : 's'} selected`
                    : 'No profiles selected'
                  }
                </span>
                {selectedProfiles.size > 0 && (
                  <button
                    onClick={() => setShowBulkDeleteDialog(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete Selected ({selectedProfiles.size})
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-600">
                Total: {filteredProfiles.length} profiles
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedProfiles.size === displayedProfiles.length && displayedProfiles.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={displayedProfiles.length === 0}
                    />
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">SI No.</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">VTID</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">First name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedProfiles.map((p, index) => (
                  <tr key={p._id} className={`hover:bg-gray-50 ${selectedProfiles.has(p._id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProfiles.has(p._id)}
                        onChange={() => handleProfileSelect(p._id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{startIndex + index + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{generateVTID(p)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{p.role}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{p.firstName}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{p.lastName}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{p.staffType}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{p.company}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {(() => {
                        const jobRoles = Array.isArray(p.jobRole) ? p.jobRole : (p.jobRole ? [p.jobRole] : []);
                        return jobRoles.length > 0 ? jobRoles.join(', ') : (p.jobTitle || "N/A");
                      })()
                      }
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatDate(p.lastSeen)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link 
                          to={`/profiles/${p._id}`} 
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors font-medium"
                          title="View Profile"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => {
                            console.log('Edit clicked for profile:', p._id);
                            console.log('Navigating to:', `/profiles/edit/${p._id}`);
                            navigate(`/profiles/edit/${p._id}`);
                          }}
                          className="text-gray-600 hover:text-gray-800"
                          title="Edit Profile"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            console.log('Delete clicked for profile:', p._id, p.firstName, p.lastName);
                            setProfileToDelete({ id: p._id, name: `${p.firstName} ${p.lastName}` });
                            setShowDeleteDialog(true);
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Delete Profile"
                          disabled={loading}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredProfiles.length > 0 && totalPages > 1 && (
            <div className="px-6 py-4 border-t">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>

                  {getPageNumbers().map((pageNum, index) => {
                    if (typeof pageNum === 'string' && pageNum.startsWith('ellipsis')) {
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => handlePageChange(pageNum)}
                          isActive={pageNum === currentPage}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              
              {/* Pagination Info */}
              <div className="mt-4 text-sm text-gray-600 text-center">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredProfiles.length)} of {filteredProfiles.length} entries
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Profile Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Profile"
        description={`Are you sure you want to delete profile for ${profileToDelete.name}? This will also delete any associated certificates and user account. This action cannot be undone.`}
        onConfirm={() => handleDeleteProfile(profileToDelete.id, profileToDelete.name)}
        confirmText="Delete Profile"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        title="Delete Multiple Profiles"
        description={`Are you sure you want to delete ${selectedProfiles.size} profile${selectedProfiles.size === 1 ? '' : 's'}? This will also delete any associated certificates and user accounts. This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        confirmText={`Delete ${selectedProfiles.size} Profile${selectedProfiles.size === 1 ? '' : 's'}`}
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
