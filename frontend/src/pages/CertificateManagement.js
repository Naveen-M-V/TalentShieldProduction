// src/pages/CertificateManagement.js
import React, { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCertificates } from "../context/CertificateContext";
import { useProfiles } from "../context/ProfileContext";
import { useAlert } from "../components/AlertNotification";
import ConfirmDialog from "../components/ConfirmDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { formatDateDDMMYY } from '../utils/dateFormatter';
import { 
  AcademicCapIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function CertificateManagement() {
  const { certificates, deleteCertificate } = useCertificates();
  const { profiles } = useProfiles();
  const navigate = useNavigate();
  const { error } = useAlert();
  
  const [search, setSearch] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState(30);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({ open: false, certificateId: null, certificateName: '' });
  const [selectedProvider, setSelectedProvider] = useState("");
  const [viewMode, setViewMode] = useState('table'); // 'grid' or 'table'
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);

  // Get filter options
  const filterOptions = useMemo(() => {
    const categories = [...new Set(certificates.map(c => c.category).filter(Boolean))].sort();
    const statuses = [...new Set(certificates.map(c => c.status).filter(Boolean))].sort();
    const providers = [...new Set(certificates.map(c => c.provider).filter(Boolean))].sort();
    
    return { categories, statuses, providers };
  }, [certificates]);

  // Format date to show only date without timestamp
  const formatDate = (date) => {
    if (!date) return "N/A";
    return formatDateDDMMYY(date);
  };

  // Check if certificate is expiring soon (within 30 days)
  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate.split('/').reverse().join('-'));
    const today = new Date();
    const futureDate = new Date(today.getTime() + (selectedTimeframe * 24 * 60 * 60 * 1000));
    return expiry <= futureDate && expiry >= today;
  };

  // Check if certificate is expired
  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate.split('/').reverse().join('-'));
    const today = new Date();
    return expiry < today;
  };

  // Filter certificates
  const filteredCertificates = useMemo(() => {
    let filtered = certificates.filter((cert) => {
      const matchesSearch = cert.certificate.toLowerCase().includes(search.toLowerCase()) ||
                           cert.profileName.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || selectedCategory === 'all' || cert.category === selectedCategory;
      const matchesStatus = !selectedStatus || selectedStatus === 'all' || cert.status === selectedStatus;
      const matchesProvider = !selectedProvider || selectedProvider === 'all' || cert.provider === selectedProvider;
      
      return matchesSearch && matchesCategory && matchesStatus && matchesProvider;
    });

    // Apply section filter
    if (selectedSection) {
      switch (selectedSection) {
        case 'total':
          // Show all filtered certificates
          break;
        case 'approved':
          filtered = filtered.filter(c => c.status === 'Approved');
          break;
        case 'pending':
          filtered = filtered.filter(c => c.status === 'Pending');
          break;
        case 'expiring':
          filtered = filtered.filter(c => isExpiringSoon(c.expiryDate));
          break;
        case 'expired':
          filtered = filtered.filter(c => isExpired(c.expiryDate));
          break;
        default:
          break;
      }
    }

    return filtered;
  }, [certificates, search, selectedCategory, selectedStatus, selectedProvider, selectedSection, selectedTimeframe]);

  // Get certificate status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get certificate status icon
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4" />;
      case 'expired':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const handleDeleteCertificate = async () => {
    try {
      await deleteCertificate(deleteDialog.certificateId);
    } catch (err) {
      console.error('Failed to delete certificate:', err);
      error('Failed to delete certificate. Please try again.');
    }
  };

  const openDeleteDialog = (certificateId, certificateName) => {
    setDeleteDialog({ open: true, certificateId, certificateName });
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSelectedProvider("all");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border mb-4 sm:mb-6">
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                  <AcademicCapIcon className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-emerald-600" />
                  Certificate Management
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage and track all certificates across your organization</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 md:gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Expiry Alert Period:</label>
                  <Select
                    value={selectedTimeframe.toString()}
                    onValueChange={(value) => setSelectedTimeframe(parseInt(value))}
                  >
                    <SelectTrigger className="w-[120px] sm:w-[140px]">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <button
                  onClick={() => navigate("/dashboard/createcertificate")}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium"
                >
                  <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  Add Certificate
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mt-4 sm:mt-5 md:mt-6">
              <button
                onClick={() => setSelectedSection(selectedSection === 'total' ? null : 'total')}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md text-left ${
                  selectedSection === 'total' ? 'border-emerald-500 bg-emerald-50' : 'bg-emerald-50 border-gray-200 hover:border-emerald-300'
                }`}
              >
                <div className="text-2xl font-bold text-emerald-600">{certificates.length}</div>
                <div className="text-sm text-emerald-700">Total Certificates</div>
              </button>
              <button
                onClick={() => setSelectedSection(selectedSection === 'approved' ? null : 'approved')}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md text-left ${
                  selectedSection === 'approved' ? 'border-green-500 bg-green-50' : 'bg-green-50 border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="text-2xl font-bold text-green-600">
                  {certificates.filter(c => c.status === 'Approved').length}
                </div>
                <div className="text-sm text-green-700">Approved</div>
              </button>
              <button
                onClick={() => setSelectedSection(selectedSection === 'pending' ? null : 'pending')}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md text-left ${
                  selectedSection === 'pending' ? 'border-yellow-500 bg-yellow-50' : 'bg-yellow-50 border-gray-200 hover:border-yellow-300'
                }`}
              >
                <div className="text-2xl font-bold text-yellow-600">
                  {certificates.filter(c => c.status === 'Pending').length}
                </div>
                <div className="text-sm text-yellow-700">Pending</div>
              </button>
              <button
                onClick={() => setSelectedSection(selectedSection === 'expiring' ? null : 'expiring')}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md text-left ${
                  selectedSection === 'expiring' ? 'border-yellow-500 bg-yellow-50' : 'bg-yellow-50 border-gray-200 hover:border-yellow-300'
                }`}
              >
                <div className="text-2xl font-bold text-yellow-600">
                  {certificates.filter(c => isExpiringSoon(c.expiryDate)).length}
                </div>
                <div className="text-sm text-yellow-700">Expiring Soon</div>
              </button>
              <button
                onClick={() => setSelectedSection(selectedSection === 'expired' ? null : 'expired')}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md text-left ${
                  selectedSection === 'expired' ? 'border-red-500 bg-red-50' : 'bg-red-50 border-gray-200 hover:border-red-300'
                }`}
              >
                <div className="text-2xl font-bold text-red-600">
                  {certificates.filter(c => isExpired(c.expiryDate)).length}
                </div>
                <div className="text-sm text-red-700">Expired</div>
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border mb-4 sm:mb-6">
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 w-full sm:max-w-md">
                  <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search certificates or profiles..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm"
                  />
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-lg transition-colors text-xs sm:text-sm ${
                    showFilters ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <FunnelIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  Filters
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 sm:gap-2 border rounded-lg p-1 self-start sm:self-auto">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${
                    viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${
                    viewMode === 'table' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Table
                </button>
              </div>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="border-t pt-3 sm:pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="border border-gray-300 rounded-lg px-3 py-2">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {filterOptions.categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedStatus}
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger className="border border-gray-300 rounded-lg px-3 py-2">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {filterOptions.statuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedProvider}
                    onValueChange={setSelectedProvider}
                  >
                    <SelectTrigger className="border border-gray-300 rounded-lg px-3 py-2">
                      <SelectValue placeholder="All Providers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Providers</SelectItem>
                      {filterOptions.providers.map(provider => (
                        <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-300"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border">
          {filteredCertificates.length === 0 ? (
            <div className="text-center py-12">
              <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No certificates found</h3>
              <p className="text-gray-600 mb-4">
                {selectedSection 
                  ? `No ${selectedSection === 'total' ? '' : selectedSection} certificates found`
                  : search || selectedCategory || selectedStatus || selectedProvider
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first certificate'
                }
              </p>
              {!selectedSection && (
                <button
                  onClick={() => navigate("/dashboard/createcertificate")}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Certificate
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCertificates.map((cert) => (
                  <div key={cert.id || cert._id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <AcademicCapIcon className="h-8 w-8 text-emerald-600 flex-shrink-0" />
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(cert.status)}`}>
                          {getStatusIcon(cert.status)}
                          {cert.status}
                        </span>
                        {isExpiringSoon(cert.expiryDate) && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                            <ExclamationTriangleIcon className="h-3 w-3" />
                            Expiring Soon
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{cert.certificate}</h3>
                    <p className="text-sm text-gray-600 mb-1">VTID: {cert.profileId?.vtid || 'N/A'}</p>
                    <p className="text-sm text-gray-600 mb-3">{cert.profileName}</p>
                    
                    <div className="space-y-2 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-2">
                        <BuildingOfficeIcon className="h-4 w-4" />
                        {cert.provider}
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Expires: {formatDate(cert.expiryDate)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t">
                      <Link
                        to={`/viewcertificate/${cert.id || cert._id}`}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors font-medium"
                      >
                        <EyeIcon className="h-4 w-4" />
                        View Certificate
                      </Link>
                      <Link
                        to={`/editcertificate/${cert.id || cert._id}`}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
                      >
                        <PencilIcon className="h-4 w-4" />
                        Edit
                      </Link>
                      <button
                        onClick={() => openDeleteDialog(cert.id || cert._id, cert.certificate)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded ml-auto"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="sm:hidden divide-y divide-gray-200">
                {filteredCertificates.map((cert) => (
                  <div key={cert.id || cert._id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3 mb-3">
                      <AcademicCapIcon className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm mb-1">{cert.certificate}</div>
                        <div className="text-xs text-gray-500">{cert.profileName}</div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getStatusColor(cert.status)}`}>
                        {getStatusIcon(cert.status)}
                        {cert.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div>
                        <span className="text-gray-500">VTID:</span>
                        <div className="font-medium text-gray-900">{cert.profileId?.vtid || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Category:</span>
                        <div className="font-medium text-gray-900">{cert.category}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Provider:</span>
                        <div className="font-medium text-gray-900">{cert.provider}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Expiry:</span>
                        <div className="font-medium text-gray-900">{formatDate(cert.expiryDate)}</div>
                        {isExpired(cert.expiryDate) ? (
                          <div className="text-xs text-red-600 font-medium">Expired</div>
                        ) : isExpiringSoon(cert.expiryDate) && (
                          <div className="text-xs text-yellow-600 font-medium">Expiring Soon</div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/viewcertificate/${cert.id || cert._id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors font-medium"
                        title="View Certificate"
                      >
                        <EyeIcon className="h-3 w-3" />
                        View
                      </Link>
                      <Link
                        to={`/editcertificate/${cert.id || cert._id}`}
                        className="px-3 py-2 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
                        title="Edit Certificate"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => openDeleteDialog(cert.id || cert._id, cert.certificate)}
                        className="px-3 py-2 text-xs text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
                        title="Delete Certificate"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-hidden">
                <table className="w-full" style={{ tableLayout: 'auto' }}>
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-3 sm:px-4 md:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate</th>
                      <th className="text-left px-3 sm:px-4 md:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">VTID</th>
                      <th className="text-left px-3 sm:px-4 md:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Profile Name</th>
                      <th className="text-left px-3 sm:px-4 md:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Category</th>
                      <th className="text-left px-3 sm:px-4 md:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Provider</th>
                      <th className="text-left px-3 sm:px-4 md:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                      <th className="text-left px-3 sm:px-4 md:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-3 sm:px-4 md:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCertificates.map((cert) => (
                      <tr key={cert.id || cert._id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <AcademicCapIcon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 flex-shrink-0" />
                            <div>
                              <div className="font-medium text-gray-900 text-xs sm:text-sm">{cert.certificate}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 hidden md:table-cell">{cert.profileId?.vtid || 'N/A'}</td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">{cert.profileName}</td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 hidden lg:table-cell">{cert.category}</td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 hidden lg:table-cell">{cert.provider}</td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900">{formatDate(cert.expiryDate)}</div>
                          {isExpired(cert.expiryDate) ? (
                            <div className="text-xs text-red-600 font-medium">Expired</div>
                          ) : isExpiringSoon(cert.expiryDate) && (
                            <div className="text-xs text-yellow-600 font-medium">Expiring Soon</div>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(cert.status)}`}>
                            {getStatusIcon(cert.status)}
                            {cert.status}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Link
                              to={`/viewcertificate/${cert.id || cert._id}`}
                              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors font-medium"
                              title="View Certificate"
                            >
                              <EyeIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden lg:inline">View</span>
                            </Link>
                            <Link
                              to={`/editcertificate/${cert.id || cert._id}`}
                              className="text-gray-600 hover:text-gray-800 p-1"
                              title="Edit Certificate"
                            >
                              <PencilIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Link>
                            <button
                              onClick={() => openDeleteDialog(cert.id || cert._id, cert.certificate)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Delete Certificate"
                            >
                              <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
          title="Delete Certificate"
          description={`Are you sure you want to delete "${deleteDialog.certificateName}"? This action cannot be undone.`}
          onConfirm={handleDeleteCertificate}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      </div>
    </div>
  );
}
