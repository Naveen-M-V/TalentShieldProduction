import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProfiles } from "../context/ProfileContext";
import { useCertificates } from "../context/CertificateContext";
import { getImageUrl } from '../utils/config';
import { generateVTID } from '../utils/vtid';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { PencilIcon } from '@heroicons/react/24/outline';
import { EyeIcon } from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { BellIcon } from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useAlert } from "../components/AlertNotification";
import ProfilePhotoPopup from "../components/ProfilePhotoPopup";
import ConfirmDialog from '../components/ConfirmDialog';
import { formatDateDDMMYY, formatDateTimeDDMMYY } from '../utils/dateFormatter';
import { buildApiUrl } from '../utils/apiConfig';

export default function ProfileDetailView() {
  const { success, error } = useAlert();
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProfileById, uploadProfilePicture, deleteProfilePicture, deleteProfile } = useProfiles();
  const { certificates, uploadCertificateFile, deleteCertificate } = useCertificates();

  const handleEditProfile = () => {
    navigate(`/profiles/edit/${id}`);
  };
  const [profile, setProfile] = useState(null);
  const [showDeleteCertDialog, setShowDeleteCertDialog] = useState(false);
  const [certToDelete, setCertToDelete] = useState(null);
  const [showCertificates, setShowCertificates] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageKey, setImageKey] = useState(Date.now());
  const [showPhotoPopup, setShowPhotoPopup] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadingCertId, setUploadingCertId] = useState(null);
const uploadFileInputRef = useRef(null);
const handleUploadClick = (certId) => {
  setUploadingCertId(certId);
  if (uploadFileInputRef.current) {
    uploadFileInputRef.current.click();
  }
};

const handleCertificateFileSelected = async (event) => {
  const file = event.target.files[0];
  if (!file || !uploadingCertId) return;

  try {
    setUploading(true);
    await uploadCertificateFile(uploadingCertId, file);
    success("Certificate uploaded successfully");
  } catch (err) {
    error("Failed to upload certificate. Please try again.");
  } finally {
    setUploading(false);
    setUploadingCertId(null);
    event.target.value = null;
  }
};

const handleDeleteCertificate = async () => {
  try {
    await deleteCertificate(certToDelete);
    success("Certificate deleted successfully");
  } catch (err) {
    error("Failed to delete certificate");
  }
};

  useEffect(() => {
    const profileData = getProfileById(id);
    if (profileData) {
      setProfile(profileData);
    }
  }, [id, getProfileById]);

  // Refresh profile data when profiles context updates
  const { profiles } = useProfiles();
  useEffect(() => {
    const profileData = getProfileById(id);
    if (profileData) {
      setProfile(profileData);
      // Update image key to force refresh when profile data changes
      setImageKey(Date.now());
    }
  }, [profiles, id, getProfileById]);

  const handleProfilePictureUpload = async (file) => {
    if (file) {
      setUploading(true);
      try {
        await uploadProfilePicture(id, file);
        const updatedProfile = getProfileById(id);
        if (updatedProfile) {
          setProfile(updatedProfile);
        }
        setImageKey(Date.now());
        success('Profile picture updated successfully!');
      } catch (err) {
        console.error("Failed to upload profile picture:", err);
        error('Failed to upload profile picture. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleProfilePictureDelete = async () => {
    setUploading(true);
    try {
      await deleteProfilePicture(id);
      const updatedProfile = getProfileById(id);
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
      setImageKey(Date.now());
      success('Profile picture deleted successfully!');
    } catch (err) {
      console.error("Failed to delete profile picture:", err);
      error('Failed to delete profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return formatDateDDMMYY(date);
  };

  const formatDateTime = (date) => {
    if (!date) return "N/A";
    return formatDateTimeDDMMYY(date);
  };

  const userCertificates = certificates.filter(cert =>
    cert.profileName === `${profile?.firstName} ${profile?.lastName}`
  );

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {profile.firstName} {profile.lastName}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleEditProfile}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <PencilIcon className="h-5 w-5" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Hidden input for certificate file upload */}
      <input
        type="file"
        accept="application/pdf,image/*"
        ref={uploadFileInputRef}
        onChange={handleCertificateFileSelected}
        className="hidden"
      />

      {/* Main Profile Card */}
      <div className="px-6 py-6">
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="grid grid-cols-4 gap-8">
            {/* Column 1: Profile Overview */}
            <div className="space-y-4">
              <div className="text-center">
                <div className="relative inline-block">
                  <div 
                    className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setShowPhotoPopup(true)}
                  >
                    {profile.profilePicture ? (
                      <img
                        src={`${getImageUrl(profile.profilePicture)}?t=${imageKey}`}
                        alt={`${profile.name || 'User'}`}
                        className="w-full h-full object-cover"
                        key={`profile-pic-${imageKey}`}
                        loading="lazy"
                      />
                    ) : (
                      <UserCircleIcon className="h-16 w-16 text-gray-400" />
                    )}
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                {!profile.profilePicture && (
                  <p className="text-xs text-gray-500 mt-2 text-center">Click to update profile</p>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">User role:</span>
                  <div className="text-gray-600">{profile.staffType} Staff</div>
                </div>
                <div>
                  <span className="font-medium">Company name:</span>
                  <div className="text-gray-600">{profile.company}</div>
                </div>
                <div>
                  <span className="font-medium">Created On:</span>
                  <div className="text-gray-600">{formatDate(profile.createdOn)}</div>
                </div>
                <div>
                  <span className="font-medium">Last Seen:</span>
                  <div className="text-gray-600">{formatDateTime(profile.lastSeen)}</div>
                </div>
              </div>
            </div>

            {/* Column 2: User Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">User Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-semibold">VTID:</span>
                  <span className="font-medium">{generateVTID(profile)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">User Role:</span>
                  <span className="font-medium">{profile.role || "User"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Circet UIN:</span>
                  <span className="font-medium">{profile.circetUIN || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Circet SCID:</span>
                  <span className="font-medium">{profile.circetSCID || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">NOPS ID:</span>
                  <span className="font-medium">{profile.nopsId || profile.nopsID || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Email:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{profile.email}</span>
                    {profile.emailVerified && (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Mobile:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{profile.mobile || "N/A"}</span>
                    {profile.mobileVerified && (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Preferred Language:</span>
                  <span className="font-medium">{profile.language || "English"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date of Birth:</span>
                  <span className="font-medium">{formatDate(profile.dob || profile.dateOfBirth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nationality:</span>
                  <span className="font-medium">{profile.nationality || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium">{profile.status || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">POC:</span>
                  <span className="font-medium">{profile.poc || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Insurance Number:</span>
                  <span className="font-medium">{profile.insuranceNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Morrisons ID:</span>
                  <span className="font-medium">{profile.morrisonsIDNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Morrisons UIN:</span>
                  <span className="font-medium">{profile.morrisonsUIN || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Column 3: Job, Team & Training Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Job, Team & Training Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active Job Roles:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {(() => {
                        const jobRoles = Array.isArray(profile.jobRole) ? profile.jobRole : (profile.jobRole ? [profile.jobRole] : []);
                        return jobRoles.length > 0 ? jobRoles.join(', ') : "N/A";
                      })()
                      }
                    </span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Job Level:</span>
                  <span className="font-medium">{profile.jobLevel || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600"># of Active Certificates:</span>
                  <span className="font-medium">{userCertificates.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Start Date:</span>
                  <span className="font-medium">{formatDate(profile.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Staff Type:</span>
                  <span className="font-medium">{profile.staffType || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Column 4: Additional Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Additional Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">External System ID:</span>
                  <span className="font-medium">{profile.externalSystemId || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Third Party System ID:</span>
                  <span className="font-medium">{profile.extThirdPartySystemId || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gender:</span>
                  <span className="font-medium">{profile.gender || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bio:</span>
                  <span className="font-medium">{profile.bio || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Other Information:</span>
                  <span className="font-medium">{profile.otherInformation || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Address and Emergency Contact Section */}
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow border p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Address Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Address Line 1:</span>
                    <span className="font-medium">{profile.address?.line1 || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Address Line 2:</span>
                    <span className="font-medium">{profile.address?.line2 || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">City:</span>
                    <span className="font-medium">{profile.address?.city || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Post Code:</span>
                    <span className="font-medium">{profile.address?.postCode || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Country:</span>
                    <span className="font-medium">{profile.address?.country || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Emergency Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Emergency Contact</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contact Name:</span>
                    <span className="font-medium">{profile.emergencyContact?.name || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Relationship:</span>
                    <span className="font-medium">{profile.emergencyContact?.relationship || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone Number:</span>
                    <span className="font-medium">{profile.emergencyContact?.phone || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Active Training Certificates */}
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow border">
            <button
              onClick={() => setShowCertificates(!showCertificates)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <h3 className="font-semibold text-lg">Active Training Certificates</h3>
              <ChevronDownIcon
                className={`h-5 w-5 transform transition-transform ${
                  showCertificates ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showCertificates && (
              <div className="border-t p-4">
                {userCertificates.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2 border">Certificate</th>
                          <th className="text-left p-2 border">Issue Date</th>
                          <th className="text-left p-2 border">Expiry Date</th>
                          <th className="text-left p-2 border">Provider</th>
                          <th className="text-left p-2 border">Status</th>
                          <th className="text-left p-2 border">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userCertificates.map((cert) => (
                          <tr key={cert.id || cert._id} className="hover:bg-gray-50">
                            <td className="p-2 border font-medium">{cert.certificate}</td>
                            <td className="p-2 border">{formatDate(cert.issueDate)}</td>
                            <td className="p-2 border">{formatDate(cert.expiryDate)}</td>
                            <td className="p-2 border">{cert.provider}</td>
                            <td className="p-2 border">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  cert.status === "Approved"
                                    ? "bg-green-100 text-green-800"
                                    : cert.status === "Pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {cert.status}
                              </span>
                            </td>
                            <td className="p-2 border flex items-center gap-2">
                              {cert.certificateFile ? (
                                <a
                                  href={buildApiUrl(`/certificates/${cert.id || cert._id}/file`)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-2 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
                                  onClick={() =>
                                    console.log(
                                      "🔗 Opening certificate:",
                                      cert.certificate,
                                      "File URL:",
                                      buildApiUrl(`/certificates/${cert.id || cert._id}/file`)
                                    )
                                  }
                                  title="View Certificate"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </a>
                              ) : (
                                <span className="text-gray-500 text-sm">No file available</span>
                              )}

                              <button
  onClick={() => handleUploadClick(cert.id || cert._id)}
  title="Upload Certificate"
  className="inline-flex items-center px-2 py-1 text-sm bg-yellow-400 text-white hover:bg-yellow-500 rounded transition-colors"
>
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v8m0-8l-4 4m4-4l4 4M12 4v8" />
  </svg>
</button>


<button
  onClick={() => { setCertToDelete(cert.id || cert._id); setShowDeleteCertDialog(true); }}
  title="Delete Certificate"
  className="inline-flex items-center px-2 py-1 text-sm bg-red-600 text-white hover:bg-red-700 rounded transition-colors"
>
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
</button>

                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="mb-2">📋 No active certificates found for this user.</div>
                    <div className="text-sm">
                      Certificates will appear here once they are created and assigned to this profile.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Photo Popup */}
      <ProfilePhotoPopup
        isOpen={showPhotoPopup}
        onClose={() => setShowPhotoPopup(false)}
        onUpdate={handleProfilePictureUpload}
        onDelete={handleProfilePictureDelete}
        hasProfilePicture={!!profile.profilePicture}
        uploading={uploading}
      />

      {/* Delete Certificate Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteCertDialog}
        onOpenChange={setShowDeleteCertDialog}
        title="Delete Certificate"
        description="Are you sure you want to delete this certificate? This action cannot be undone."
        onConfirm={handleDeleteCertificate}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
