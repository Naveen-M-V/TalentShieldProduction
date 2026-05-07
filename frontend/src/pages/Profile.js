import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfiles } from '../context/ProfileContext';
import { useCertificates } from '../context/CertificateContext';
import { getImageUrl } from '../utils/config';
import { 
  UserCircleIcon, 
  AcademicCapIcon, 
  BriefcaseIcon,
  CameraIcon,
  PencilIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { useAlert } from "../components/AlertNotification";
import ProfilePhotoPopup from "../components/ProfilePhotoPopup";
import { formatDateDDMMYY } from '../utils/dateFormatter';

export default function Profile() {
  const { success, error: showError } = useAlert();
  const { user } = useAuth();
  const { uploadProfilePicture, deleteProfilePicture } = useProfiles();
  const { certificates } = useCertificates();
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [imageKey, setImageKey] = useState(Date.now());
  const [profileLoading, setProfileLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({});
  const [error, setError] = useState(null);
  const [showPhotoPopup, setShowPhotoPopup] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch current user's profile data
  const fetchMyProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      setError(null);
      
      const response = await fetch('/api/my-profile', {
        credentials: 'include'
      });

      if (response.ok) {
        const profileData = await response.json();
        console.log('My profile data loaded:', profileData);
        setUserProfile(profileData);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching my profile:', error);
      setError(error.message);
      // Fallback to user data from auth context
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  // Fetch profile data when component mounts
  useEffect(() => {
    fetchMyProfile();
  }, [fetchMyProfile]);
  // Get user's certificates (memoized for performance)
  const userCertificates = useMemo(() => {
    return certificates.filter(cert => 
      cert.profileName === `${userProfile?.firstName || user?.firstName} ${userProfile?.lastName || user?.lastName}`
    );
  }, [certificates, userProfile, user]);

  // Generate consistent VTID
  const generateVTID = useCallback((profile) => {
    if (profile.vtid) return profile.vtid;
    
    
    // Generate consistent ID based on profile data
    const firstName = profile.firstName || '';
    const lastName = profile.lastName || '';
    const company = profile.company || 'VTX';
    const timestamp = profile.createdOn ? new Date(profile.createdOn).getTime() : Date.now();
    
    return `${company.substring(0, 3).toUpperCase()}${firstName.substring(0, 2).toUpperCase()}${lastName.substring(0, 2).toUpperCase()}${timestamp.toString().slice(-4)}`;
  }, []);

  const handleProfilePictureUpload = async (file) => {
    if (file && userProfile._id) {
      setUploading(true);
      try {
        await uploadProfilePicture(userProfile._id, file);
        // Force image refresh by updating key
        setImageKey(Date.now());
        // Refresh profile data to get updated picture
        await fetchMyProfile();
        success('Profile picture updated successfully!');
      } catch (err) {
        console.error("Failed to upload profile picture:", err);
        showError('Failed to upload profile picture. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleProfilePictureDelete = async () => {
    if (userProfile._id) {
      setUploading(true);
      try {
        await deleteProfilePicture(userProfile._id);
        // Force image refresh by updating key
        setImageKey(Date.now());
        // Refresh profile data to get updated picture
        await fetchMyProfile();
        success('Profile picture deleted successfully!');
      } catch (err) {
        console.error("Failed to delete profile picture:", err);
        showError('Failed to delete profile picture. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  const formatDate = (date) => {
    if (!date) return "Not specified";
    return formatDateDDMMYY(date);
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: UserCircleIcon },
    { id: 'certificates', name: 'Certificates', icon: AcademicCapIcon },
    { id: 'experience', name: 'Experience', icon: BriefcaseIcon }
  ];

  // Show loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-medium mb-2">Error Loading Profile</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchMyProfile}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="px-6 py-8">
            <div className="flex items-center space-x-6">
              {/* Profile Picture */}
              <div className="relative">
                <div 
                  className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowPhotoPopup(true)}
                >
                  {userProfile.profilePicture ? (
                    <img 
                      src={`${getImageUrl(userProfile.profilePicture)}?t=${imageKey}`}
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      key={`profile-pic-${imageKey}`}
                      loading="lazy"
                    />
                  ) : (
                    <UserCircleIcon className="h-20 w-20 text-gray-400" />
                  )}
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
                {!userProfile.profilePicture && (
                  <p className="text-xs text-gray-500 mt-2 text-center">Click to update profile</p>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {userProfile?.firstName || user?.firstName || 'User'} {userProfile?.lastName || user?.lastName || ''}
                    </h1>
                    <p className="text-lg text-gray-600 mt-1">
                      {Array.isArray(userProfile?.jobTitle) 
                        ? userProfile.jobTitle.join(', ') 
                        : (userProfile?.jobTitle || 'No job title specified')
                      }
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {userProfile?.company || 'No company specified'} • {userProfile?.staffType || 'Staff'} Staff
                    </p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                    <PencilIcon className="h-4 w-4" />
                    Edit Profile
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-emerald-600">{userCertificates.length}</div>
                    <div className="text-sm text-emerald-700">Active Certificates</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{userProfile?.role || 'N/A'}</div>
                    <div className="text-sm text-blue-700">Current Role</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {userProfile?.createdOn ? new Date(userProfile.createdOn).getFullYear() : 'N/A'}
                    </div>
                    <div className="text-sm text-purple-700">Member Since</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-t">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Email</div>
                      <div className="font-medium">{userProfile?.email || user?.email || 'Not specified'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Mobile</div>
                      <div className="font-medium">{userProfile?.mobile || 'Not specified'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Date of Birth</div>
                      <div className="font-medium">{formatDate(userProfile?.dateOfBirth)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPinIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Location</div>
                      <div className="font-medium">{userProfile?.address?.country || 'Not specified'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 flex items-center justify-center text-gray-400 font-bold text-xs">ID</div>
                    <div>
                      <div className="text-sm text-gray-500">Nationality</div>
                      <div className="font-medium">{userProfile?.nationality || 'Not specified'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 flex items-center justify-center text-gray-400 font-bold text-xs">♂♀</div>
                    <div>
                      <div className="text-sm text-gray-500">Gender</div>
                      <div className="font-medium">{userProfile?.gender || 'Not specified'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Professional Information</h2>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500">VTID</div>
                    <div className="font-medium">
                      {(() => {
                        const vtid = userProfile?.vtid || userProfile?.skillkoId;
                        console.log('VTID Display - userProfile.vtid:', userProfile?.vtid, 'userProfile.skillkoId:', userProfile?.skillkoId, 'Final VTID:', vtid);
                        return vtid || 'Not assigned';
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Skillko ID</div>
                    <div className="font-medium">{userProfile?.skillkoId || 'Not assigned'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Job Roles</div>
                    <div className="font-medium">
                      {Array.isArray(userProfile?.jobRole) 
                        ? userProfile.jobRole.join(', ') 
                        : (userProfile?.jobRole || 'Not specified')
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Job Level</div>
                    <div className="font-medium">{userProfile?.jobLevel || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Staff Type</div>
                    <div className="font-medium">{userProfile?.staffType || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Status</div>
                    <div className="font-medium">{userProfile?.status || 'Active'}</div>
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">System Information</h2>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500">NOPS ID</div>
                    <div className="font-medium">{userProfile?.nopsId || userProfile?.nopsID || 'Not assigned'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Circet UIN</div>
                    <div className="font-medium">{userProfile?.circetUIN || 'Not assigned'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Circet SCID</div>
                    <div className="font-medium">{userProfile?.circetSCID || 'Not assigned'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Morrisons ID</div>
                    <div className="font-medium">{userProfile?.morrisonsIDNumber || 'Not assigned'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Insurance Number</div>
                    <div className="font-medium">{userProfile?.insuranceNumber || 'Not assigned'}</div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Information</h2>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500">POC</div>
                    <div className="font-medium">{userProfile?.poc || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Start Date</div>
                    <div className="font-medium">{formatDate(userProfile?.startDate)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Preferred Language</div>
                    <div className="font-medium">{userProfile?.language || 'English'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Other Information</div>
                    <div className="font-medium">{userProfile?.otherInformation || 'None'}</div>
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">About Me</h2>
                <div className="text-gray-600">
                  {userProfile?.bio || 'No bio information available. Click edit profile to add your bio.'}
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Address Information</h2>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500">Address Line 1</div>
                    <div className="font-medium">{userProfile?.address?.line1 || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Address Line 2</div>
                    <div className="font-medium">{userProfile?.address?.line2 || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">City</div>
                    <div className="font-medium">{userProfile?.address?.city || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Post Code</div>
                    <div className="font-medium">{userProfile?.address?.postCode || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Country</div>
                    <div className="font-medium">{userProfile?.address?.country || 'Not specified'}</div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Emergency Contact</h2>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500">Contact Name</div>
                    <div className="font-medium">{userProfile?.emergencyContact?.name || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Relationship</div>
                    <div className="font-medium">{userProfile?.emergencyContact?.relationship || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Phone Number</div>
                    <div className="font-medium">{userProfile?.emergencyContact?.phone || 'Not specified'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'certificates' && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-semibold text-gray-900">My Certificates</h2>
              </div>
              <div className="p-6">
                {userCertificates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userCertificates.map((cert) => (
                      <div key={cert.id || cert._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <AcademicCapIcon className="h-8 w-8 text-emerald-600" />
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            cert.status === 'Approved' 
                              ? 'bg-green-100 text-green-800' 
                              : cert.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {cert.status}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">{cert.certificate}</h3>
                        <p className="text-sm text-gray-600 mb-2">{cert.provider}</p>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>Issued: {formatDateDDMMYY(cert.issueDate)}</div>
                          <div>Expires: {formatDateDDMMYY(cert.expiryDate)}</div>
                          {cert.cost && <div>Cost: £{cert.cost}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No certificates yet</h3>
                    <p className="text-gray-600">Start building your professional credentials by adding certificates.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'experience' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Work Experience</h2>
              <div className="text-center py-12">
                <BriefcaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Experience section coming soon</h3>
                <p className="text-gray-600">This section will display your work history and experience.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Photo Popup */}
      <ProfilePhotoPopup
        isOpen={showPhotoPopup}
        onClose={() => setShowPhotoPopup(false)}
        onUpdate={handleProfilePictureUpload}
        onDelete={handleProfilePictureDelete}
        hasProfilePicture={!!userProfile.profilePicture}
        uploading={uploading}
      />
    </div>
  );
}
