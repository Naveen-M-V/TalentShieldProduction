import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCertificates } from "../context/CertificateContext";
import { useProfiles } from "../context/ProfileContext";
import { getCertificatesForMultipleJobRoles, getAllJobRoles, allCertificates } from "../data/certificateJobRoleMapping";
import SearchableDropdown from "../components/SearchableDropdown";
import { DatePicker } from "../components/ui/date-picker";
import { useAlert } from "../components/AlertNotification";
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { buildApiUrl } from '../utils/apiConfig';

export default function CreateCertificate() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { addCertificate, creating, uploading } = useCertificates();
  const { profiles, loading: profilesLoading, error: profilesError } = useProfiles();
  const { success, error, warning } = useAlert();

  // Debug logging (commented out to prevent infinite loops)
  // console.log('CreateCertificate - profiles:', profiles);
  // console.log('CreateCertificate - profiles length:', profiles?.length);
  // console.log('CreateCertificate - loading:', profilesLoading);
  // console.log('CreateCertificate - error:', profilesError);

  // State for certificate suggestions based on job role
  const [suggestedCertificates, setSuggestedCertificates] = useState({ mandatory: [], alternative: [] });
  const [profileJobRoles, setProfileJobRoles] = useState([]);
  const [pageError, setPageError] = useState(null);
  const [localProfiles, setLocalProfiles] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const fallbackAttempted = useRef(false);

  // Fallback function to fetch profiles directly if context fails
  const fetchProfilesDirectly = async () => {
    try {
      setLocalLoading(true);
      const response = await fetch('/api/profiles', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setLocalProfiles(data);
        console.log('Profiles fetched directly:', data);
      } else {
        throw new Error(`Failed to fetch profiles: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching profiles directly:', error);
      setPageError(error.message);
    } finally {
      setLocalLoading(false);
    }
  };

  // Use effect to fetch profiles if context fails (only once)
  useEffect(() => {
    if (profilesError && (!profiles || profiles.length === 0) && !fallbackAttempted.current) {
      console.log('ProfileContext failed, trying direct fetch...');
      fallbackAttempted.current = true;
      fetchProfilesDirectly();
    }
  }, [profilesError]);

  // Determine which profiles to use
  const availableProfiles = profiles && profiles.length > 0 ? profiles : localProfiles;
  const isLoading = profilesLoading || localLoading;

  const [form, setForm] = useState({
    profileId: "",
    certificateName: "",
    account: "",
    description: "",
    issueDate: "",
    expiryDate: "",
    approvalStatus: "",
    isInterim: "False",
    fileRequired: "True",
    timeLoggedDays: "",
    timeLoggedHours: "",
    timeLoggedMinutes: "",
    supplier: "",
    totalCost: "",
    certificateFile: null
  });

  const [selectedProfile, setSelectedProfile] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [certificateNames, setCertificateNames] = useState([]);

  // Load suppliers and certificate names on component mount
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadData = async () => {
      try {
        await Promise.all([
          fetchSuppliers(isMounted, abortController.signal),
          fetchCertificateNames(isMounted, abortController.signal),
          initializeCertificateNames(abortController.signal)
        ]);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error loading data:', error);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  // Pre-fill profile if passed from ProfileDetailView
  useEffect(() => {
    if (routerLocation.state?.profileId && availableProfiles.length > 0) {
      const prefilledProfile = availableProfiles.find(p => p._id === routerLocation.state.profileId);
      if (prefilledProfile) {
        setForm(prev => ({ ...prev, profileId: prefilledProfile._id }));
        setSelectedProfile(prefilledProfile);
        
        let jobRoles = [];
        if (prefilledProfile.jobRole) {
          jobRoles = Array.isArray(prefilledProfile.jobRole) ? prefilledProfile.jobRole : [prefilledProfile.jobRole];
          jobRoles = jobRoles.filter(Boolean);
        }
        setProfileJobRoles(jobRoles);
        
        if (jobRoles.length > 0) {
          const certificates = getCertificatesForMultipleJobRoles(jobRoles);
          setSuggestedCertificates({
            mandatory: certificates.mandatory || [],
            alternative: certificates.alternative || []
          });
        }
      }
    }
  }, [routerLocation.state, availableProfiles]);

  const fetchSuppliers = async (isMounted = true, signal = null) => {
    try {
      const response = await fetch(buildApiUrl('/suppliers'), { signal });
      if (response.ok) {
        const data = await response.json();
        if (isMounted) {
          setSuppliers(data);
        }
      } else {
        console.error('Failed to fetch suppliers:', response.status, response.statusText);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching suppliers:', error);
      }
    }
  };

  const fetchCertificateNames = async (isMounted = true, signal = null) => {
    try {
      const response = await fetch(buildApiUrl('/certificate-names'), { signal });
      if (response.ok) {
        const data = await response.json();
        if (isMounted) {
          setCertificateNames(data);
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching certificate names:', error);
      }
    }
  };

  const initializeCertificateNames = async (signal = null) => {
    try {
      const response = await fetch(buildApiUrl('/certificate-names/initialize'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal
      });
      if (!response.ok) {
        console.warn('Certificate names initialization failed, but continuing anyway');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn('Error initializing certificate names (non-critical):', error);
      }
    }
  };

  const handleSupplierSearch = async (searchTerm) => {
    try {
      const response = await fetch(buildApiUrl(`/suppliers/search?q=${encodeURIComponent(searchTerm)}`));
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      } else {
        console.error('Failed to search suppliers:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error searching suppliers:', error);
    }
  };

  const handleAddSupplier = async (supplierName) => {
    try {
      const response = await fetch(buildApiUrl('/suppliers'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: supplierName }),
      });
      
      if (response.ok) {
        const newSupplier = await response.json();
        console.log('New supplier added:', newSupplier);
        // Update suppliers list
        fetchSuppliers();
        // Update form
        setForm(prev => ({ ...prev, supplier: supplierName }));
      } else {
        console.error('Failed to add supplier:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error adding supplier:', error);
    }
  };

  const handleCertificateNameSearch = async (searchTerm) => {
    try {
      const response = await fetch(buildApiUrl(`/certificate-names/search?q=${encodeURIComponent(searchTerm)}`));
      if (response.ok) {
        const data = await response.json();
        setCertificateNames(data);
      } else {
        console.error('Failed to search certificate names:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error searching certificate names:', error);
    }
  };

  const handleAddCertificateName = async (certificateName) => {
    try {
      const response = await fetch(buildApiUrl('/certificate-names'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: certificateName }),
      });
      
      if (response.ok) {
        const newCertificateName = await response.json();
        console.log('New certificate name added:', newCertificateName);
        // Update certificate names list
        fetchCertificateNames();
        // Update form
        setForm(prev => ({ ...prev, certificateName: certificateName }));
      } else {
        console.error('Failed to add certificate name:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error adding certificate name:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    // Handle profile selection change
    if (name === 'profileId') {
      const profile = availableProfiles.find(p => p._id === value);
      setSelectedProfile(profile);
      
      // Get job roles from profile
      let jobRoles = [];
      if (profile && profile.jobRole) {
        jobRoles = Array.isArray(profile.jobRole) ? profile.jobRole : [profile.jobRole];
        jobRoles = jobRoles.filter(Boolean); // Remove empty values
      }
      setProfileJobRoles(jobRoles);
      
      // Get suggested certificates based on ALL job roles
      if (jobRoles.length > 0) {
        const certificates = getCertificatesForMultipleJobRoles(jobRoles);
        setSuggestedCertificates({
          mandatory: certificates.mandatory || [],
          alternative: certificates.alternative || []
        });
      } else {
        setSuggestedCertificates({ mandatory: [], alternative: [] });
      }
      
      // Reset certificate selection when profile changes
      setForm(prev => ({ ...prev, certificateName: "" }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        error('File size exceeds 10MB limit. Please select a smaller file.');
        e.target.value = '';
        return;
      }
      
      // Check file type
      if (file.type === 'application/pdf' || 
          file.type === 'image/jpeg' || 
          file.type === 'image/png' || 
          file.type === 'image/jpg') {
        setForm({ ...form, certificateFile: file });
      } else {
        error('Please select a PDF, JPEG, or PNG file only.');
        e.target.value = '';
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!form.profileId) {
      error('Please select a profile');
      return;
    }
    
    if (!form.certificateName) {
      error('Please select or enter a certificate name');
      return;
    }
    
    // Helper to safely convert dates to ISO format for backend
    const toIsoDate = (dateStr) => {
      if (!dateStr) return null;
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        // Return ISO string for proper backend parsing
        return date.toISOString();
      } catch {
        return null;
      }
    };
    
    // Transform form data to match certificate structure
    const newCertificate = {
      // Required fields for backend validation
      certificate: form.certificateName || "New Certificate",
      category: form.certificateName ? "Professional Development" : "Other", // Use a meaningful default category
      
      // CRITICAL: Link to profile via profileId
      profileId: selectedProfile?._id,
      profileName: selectedProfile ? `${selectedProfile.firstName} ${selectedProfile.lastName}` : "Unknown Profile",
      
      // Other fields
      description: form.description || "",
      account: form.account || "",
      issueDate: toIsoDate(form.issueDate),
      expiryDate: toIsoDate(form.expiryDate),
      provider: form.supplier || "SKILLS PROVIDER",
      fileRequired: form.fileRequired === "True" ? "Yes" : "No",
      status: form.approvalStatus || "Approved",
      cost: parseFloat(form.totalCost) || 0,
      jobRole: selectedProfile && selectedProfile.jobRole ? (Array.isArray(selectedProfile.jobRole) ? selectedProfile.jobRole[0] : selectedProfile.jobRole) : "Unknown",
      approvalStatus: form.approvalStatus || "Approved",
      isInterim: form.isInterim === "True", // Convert string to boolean
      
      supplier: form.supplier || "",
      totalCost: parseFloat(form.totalCost) || 0,
      fileData: form.certificateFile
    };

    // Add certificate to context
    addCertificate(newCertificate)
      .then(() => {
        success('Certificate created successfully!');
        // Navigate to certificate management page
        navigate("/certificates");
      })
      .catch((err) => {
        console.error('Error creating certificate:', err);
        error('Failed to create certificate. Please try again.');
      });
  };

  const handleCancel = () => {
    navigate(-1); // go back one page
    // OR navigate("/certificates"); // redirect to certificate list
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profiles...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (profilesError || pageError) {
    return (
      <div className="flex-1 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-red-800 font-medium mb-2">Error Loading Create Certificate Page</h3>
          <p className="text-red-600 mb-4">{profilesError || pageError}</p>
          <div className="space-x-2">
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no profiles available
  if (!availableProfiles || availableProfiles.length === 0) {
    return (
      <div className="flex-1 p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-yellow-800 font-medium mb-2">No Profiles Available</h3>
          <p className="text-yellow-600 mb-4">You need to create profiles before you can create certificates.</p>
          <button 
            onClick={() => navigate('/dashboard/profilescreate')}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            Create Profile First
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      {/* Main content */}
      <div className="flex-1 p-3 sm:p-4 md:p-6">
        <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Create Certificate</h1>

        <div className="w-full max-w-6xl mx-auto bg-white shadow-md rounded-2xl p-3 sm:p-4 md:p-6 relative">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Profile */}
            {/* Profile Selection */}
            <div>
              <label className="block font-medium mb-1">Profile <span className="text-red-500">*</span></label>
              <Select
                value={form.profileId}
                onValueChange={(value) => handleChange({ target: { name: 'profileId', value } })}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a profile..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProfiles.map((profile) => (
                    <SelectItem key={profile._id} value={profile._id}>
                      {profile.firstName} {profile.lastName} - {Array.isArray(profile.jobRole) 
                        ? profile.jobRole.join(', ') 
                        : (profile.jobRole || 'N/A')
                      }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProfile && (
                <p className="text-sm text-gray-600 mt-1">
                  Job Role: <strong>{Array.isArray(selectedProfile.jobRole) 
                    ? selectedProfile.jobRole.join(', ') 
                    : (selectedProfile.jobRole || 'N/A')
                  }</strong>
                </p>
              )}
            </div>

            {/* Display Job Roles */}
            {profileJobRoles.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3">
                <p className="text-xs sm:text-sm font-medium text-gray-700">
                  Selected User's Job Roles: 
                  <span className="ml-2 text-green-700">{profileJobRoles.join(', ')}</span>
                </p>
              </div>
            )}

            {/* Suggested Certificates - Mandatory */}
            {suggestedCertificates.mandatory.length > 0 && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-3 sm:p-4">
                <h3 className="font-medium text-red-800 mb-2 sm:mb-3 flex items-center">
                  <span className="bg-red-600 text-white px-2 py-1 rounded text-xs mr-2">MANDATORY</span>
                  <span className="text-sm sm:text-base">Required Certificates ({suggestedCertificates.mandatory.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedCertificates.mandatory.map((cert, index) => (
                    <button
                      key={`mandatory-${index}`}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, certificateName: cert.code || cert }))}
                      className="text-left p-2 bg-white border border-red-300 rounded hover:bg-red-100 text-xs sm:text-sm"
                      title={cert.description || cert.code || cert}
                    >
                      <div className="font-medium">{cert.code || cert}</div>
                      {cert.description && (
                        <div className="text-xs text-gray-600 truncate">{cert.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Certificates - Alternative */}
            {suggestedCertificates.alternative.length > 0 && (
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 sm:p-4">
                <h3 className="font-medium text-blue-800 mb-2 sm:mb-3 flex items-center">
                  <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs mr-2">ALTERNATIVE</span>
                  <span className="text-sm sm:text-base">Optional Certificates ({suggestedCertificates.alternative.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedCertificates.alternative.map((cert, index) => (
                    <button
                      key={`alternative-${index}`}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, certificateName: cert.code || cert }))}
                      className="text-left p-2 bg-white border border-blue-300 rounded hover:bg-blue-100 text-xs sm:text-sm"
                      title={cert.description || cert.code || cert}
                    >
                      <div className="font-medium">{cert.code || cert}</div>
                      {cert.description && (
                        <div className="text-xs text-gray-600 truncate">{cert.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Certificate Name */}
            <div>
              <label className="block font-medium mb-1">Certificate Name <span className="text-red-500">*</span></label>
              <SearchableDropdown
                name="certificateName"
                value={form.certificateName}
                onChange={handleChange}
                options={certificateNames}
                placeholder="Type to search certificates or add new..."
                onSearch={handleCertificateNameSearch}
                onAddNew={handleAddCertificateName}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can type to search existing certificates or add a new one
              </p>
            </div>

            {/* Account */}
            <div>
              <label className="block font-medium mb-1">Account</label>
              <input
                type="text"
                name="account"
                placeholder="Please select a profile above to proceed"
                value={form.account}
                onChange={handleChange}
                className="w-full border rounded-lg p-2"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block font-medium mb-1">Description</label>
              <textarea
                name="description"
                placeholder="Description (optional)"
                value={form.description}
                onChange={handleChange}
                className="w-full border rounded-lg p-2"
              />
            </div>
            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              <div>
                <label className="block text-sm sm:text-base font-medium mb-1">Issue Date</label>
                <DatePicker
                  name="issueDate"
                  value={form.issueDate}
                  onChange={handleChange}
                  placeholder="Select issue date"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium mb-1">Expiry Date</label>
                <DatePicker
                  name="expiryDate"
                  value={form.expiryDate}
                  onChange={handleChange}
                  placeholder="Select expiry date"
                  className="w-full"
                />
              </div>
            </div>

            {/* Approval Status */}
            <div>
              <label className="block font-medium mb-1">Approval Status</label>
              <Select
                value={form.approvalStatus}
                onValueChange={(value) => handleChange({ target: { name: 'approvalStatus', value } })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select approval status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Is Interim */}
            <div>
              <label className="block font-medium mb-1">Is Interim</label>
              <Select
                value={form.isInterim}
                onValueChange={(value) => handleChange({ target: { name: 'isInterim', value } })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="True">True</SelectItem>
                  <SelectItem value="False">False</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Required */}
            <div>
              <label className="block font-medium mb-1">File Required</label>
              <Select
                value={form.fileRequired}
                onValueChange={(value) => handleChange({ target: { name: 'fileRequired', value } })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="True">True</SelectItem>
                  <SelectItem value="False">False</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Supplier */}
            <div>
              <label className="block font-medium mb-1">Supplier</label>
              <SearchableDropdown
                name="supplier"
                value={form.supplier}
                onChange={handleChange}
                options={suppliers}
                placeholder="Type to search suppliers or add new..."
                onSearch={handleSupplierSearch}
                onAddNew={handleAddSupplier}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can type to search existing suppliers or add a new one
              </p>
            </div>

            {/* Total Cost */}
            <div>
              <label className="block font-medium mb-1">Total Cost</label>
              <input
                type="number"
                name="totalCost"
                placeholder="Enter total cost of the certificate"
                value={form.totalCost}
                onChange={handleChange}
                className="w-full border rounded-lg p-2"
              />
            </div>

            {/* Certificate PDF Upload */}
            <div>
              <label htmlFor="certificateFile" className="block font-medium mb-1">Upload Certificate File</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="certificateFile"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="certificateFile"
                        name="certificateFile"
                        type="file"
                        className="sr-only"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
                  {form.certificateFile && (
                    <p className="text-sm text-green-600">
                      Selected: {form.certificateFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 md:space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                className="w-full sm:w-auto border px-3 sm:px-4 py-2 rounded text-xs sm:text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || uploading}
                className="w-full sm:w-auto bg-green-600 text-white px-3 sm:px-4 py-2 rounded text-xs sm:text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {creating || uploading ? (uploading ? "Uploading..." : "Creating...") : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}