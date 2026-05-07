import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useProfiles } from "../context/ProfileContext";
import { getImageUrl } from "../utils/config";
import { useAlert } from "../components/AlertNotification";
import ProfilePictureUpload from "../components/ProfilePictureUpload";
import { formatDateDDMMYY } from '../utils/dateFormatter';
import { buildApiUrl } from '../utils/apiConfig';

export default function MyAccount() {
  const { success, error: showError } = useAlert();
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAuth();
  const { uploadProfilePicture, deleteProfilePicture, getProfileById } = useProfiles();

  const [profile, setProfile] = useState({});
  const [savingImage, setSavingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageKey, setImageKey] = useState(Date.now());

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        if (!token) {
          throw new Error('Authentication required');
        }
        const response = await fetch(buildApiUrl(`/my-profile?t=${Date.now()}`), {
          credentials: 'include',
          cache: 'no-cache',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Server returned non-JSON response');
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch profile data');
        }

        const profileData = data;
        console.log('===== PROFILE DATA LOADED =====');
        console.log('Profile ID fields:', {
          _id: profileData._id,
          profileId: profileData.profileId,
          email: profileData.email,
          role: profileData.role || user?.role,
          isAdmin: profileData.isAdmin,
          hasProfilePicture: !!profileData.profilePicture
        });
        console.log('==============================');

        // If we have a valid profile data
        if (profileData) {
          setProfile({
            ...user,
            ...profileData,
            fullName: `${profileData.firstName || user.firstName || ''} ${profileData.lastName || user.lastName || ''}`.trim(),
            jobTitle: Array.isArray(profileData.jobTitle) ? profileData.jobTitle.join(', ') : profileData.jobTitle || user.jobTitle,
            address: profileData.address || user.address || {},
            emergencyContact: profileData.emergencyContact || user.emergencyContact || {},
          });
        } else {
          // If we don't have profile data, use user data
          setProfile({
            ...user,
            fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            jobTitle: user.jobTitle || '',
            address: user.address || {},
            emergencyContact: user.emergencyContact || {},
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.message);
        // Set profile with user data even if fetch fails
        setProfile({
          ...user,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  // Handle profile picture upload
  const handleProfilePictureUpload = async (file) => {
    if (!file) {
      showError('Please select a file to upload');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      showError('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('File size should be less than 10MB');
      return;
    }

    try {
      setSavingImage(true);

      const token = localStorage.getItem('auth_token');

      // Fetch fresh profile data with cache busting
      const response = await fetch(buildApiUrl(`/my-profile?t=${Date.now()}`), {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to verify profile');
      }

      const currentProfile = await response.json();
      
      console.log('===== UPLOAD: PROFILE DATA =====');
      console.log('Profile meta:', {
        profileId: currentProfile.profileId,
        _id: currentProfile._id,
        email: currentProfile.email,
        isAdmin: currentProfile.isAdmin || currentProfile.role === 'admin'
      });
      console.log('================================');
      
      const profileId = currentProfile.profileId || currentProfile._id;

      if (!profileId) {
        showError('Profile ID not found. Refreshing page...');
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      try {
        const profilePicturePath = await uploadProfilePicture(profileId, file);

        setProfile(prev => ({
          ...prev,
          profilePicture: profilePicturePath || `/api/profiles/${profileId}/picture`,
          profileId: currentProfile.profileId
        }));

        setImageKey(Date.now());
        success("Profile picture updated successfully!");
      } catch (uploadErr) {
        // If 404, the profile doesn't exist - try to fix it
        if (uploadErr.message && uploadErr.message.includes('404')) {
          console.error('Profile not found (404), attempting to fix...');
          showError('Profile not found. Attempting to fix...');
          
          try {
            const fixResponse = await fetch(buildApiUrl('/fix-my-profile'), {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (fixResponse.ok) {
              const fixData = await fixResponse.json();
              console.log('✅ Profile fixed successfully:', fixData);
              success('Profile fixed! Refreshing...');
              setTimeout(() => window.location.reload(), 1000);
            } else {
              const fixError = await fixResponse.json();
              console.error('❌ Fix failed:', fixError);
              console.error('Fix error details:', JSON.stringify(fixError, null, 2));
              
              let errorMsg = fixError.message || 'Unknown error';
              if (fixError.userData) {
                errorMsg += ` (Missing: ${!fixError.userData.firstName ? 'firstName ' : ''}${!fixError.userData.lastName ? 'lastName' : ''})`;
              }
              showError(`Profile fix failed: ${errorMsg}`);
            }
          } catch (fixErr) {
            console.error('Error fixing profile:', fixErr);
            showError('Could not fix profile. Please contact support.');
          }
        } else {
          throw uploadErr;
        }
      }
    } catch (err) {
      console.error("Failed to upload profile picture:", err);
      const errorMessage = err.message || "Please try again.";
      if (!errorMessage.includes('Refreshing')) {
        showError("Failed to upload profile picture: " + errorMessage);
      }
      localStorage.removeItem('profiles_cache_optimized');
      localStorage.removeItem('profiles_cache_time');
    } finally {
      setSavingImage(false);
    }
  };

  // Handle profile picture delete
  const handleProfilePictureDelete = async () => {
    // For admins, we need to find their Profile._id, not User._id
    // For regular users, profile._id is already the Profile._id
    const profileId = profile?.profileId || profile?._id;

    if (!profileId) {
      showError('Unable to delete: Missing profile information. Please try refreshing the page.');
      return;
    }

    try {
      setSavingImage(true);
      console.log('Deleting profile picture for profile ID:', profileId);

      await deleteProfilePicture(profileId);
      console.log('Profile picture deleted successfully');

      // Update local profile state to remove picture
      setProfile(prev => ({
        ...prev,
        profilePicture: null
      }));

      // Update image key to force refresh
      setImageKey(Date.now());

      success("Profile picture deleted successfully!");
    } catch (err) {
      console.error("Failed to delete profile picture:", err);
      showError("Failed to delete profile picture: " + (err.message || "Please try again."));
    } finally {
      setSavingImage(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>Error loading profile: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header row with title + buttons */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (loading || !user) {
                return;
              }
                navigate('/dashboard/admin-details');
            }}
            className="text-sm border px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={loading || !user}
            title={loading ? 'Loading your profile...' : !user ? 'Please log in to edit your profile' : 'Edit your profile'}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Profile
              </>
            )}
          </button>
          <button
            onClick={handleLogout}
            disabled={authLoading}
            className="text-sm border px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Logging out...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <button className="px-4 py-2 border-b-2 border-green-600 font-medium text-gray-700">
          Profile
        </button>
      </div>

      {/* Profile Row */}
      {loading ? (
        <div className="bg-white shadow rounded-lg p-6 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : error ? (
        <div className="bg-white shadow rounded-lg p-6 text-center text-red-600">
          {error}
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-sm border px-3 py-1 rounded bg-red-50 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6 relative">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-12">
            {/* Profile Image */}
            <div className="flex flex-col items-center">
              <ProfilePictureUpload
                profilePicture={profile.profilePicture ? `${getImageUrl(profile.profilePicture)}?t=${imageKey}` : null}
                onUpload={handleProfilePictureUpload}
                onDelete={handleProfilePictureDelete}
                firstName={profile.firstName}
                lastName={profile.lastName}
                uploading={savingImage}
                size={120}
              />
            </div>

            {/* Name + Role */}
            <div className="flex-1">
              <h2 className="text-xl font-semibold">
                {profile.firstName ? `${profile.firstName} ${profile.lastName || ''}` : 'Loading...'}
              </h2>
              <p className="text-gray-600">{profile.jobTitle || 'No job title specified'}</p>
              <p className="text-green-600 text-sm mt-1">
                {profile.company || 'No company specified'} • {profile.staffType || 'Staff'} Staff
              </p>

              {/* Bio */}
              <div className="mt-6">
                <p className="text-gray-500 text-sm font-medium">Bio</p>
                <p className="text-sm">{profile.bio || "No bio information available"}</p>
              </div>
            </div>

            {/* Details Section */}
            <div className="text-sm space-y-4 w-full md:w-1/3">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Email</span>
                <span>{profile.email || "Not provided"}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Mobile</span>
                <span className="text-gray-500">{profile.mobile || "Not provided"}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium text-gray-700">D.O.B.</span>
                <span>{profile.dateOfBirth ? formatDateDDMMYY(profile.dateOfBirth) : "Not provided"}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Department</span>
                <span>{profile.department || "Not specified"}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Staff Type</span>
                <span>{profile.staffType || "Not specified"}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Address</span>
                <span>{profile.address?.country || "Not provided"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}