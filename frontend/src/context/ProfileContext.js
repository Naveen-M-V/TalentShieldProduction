import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { storageGuard } from '../utils/memoryGuard';
import { API_BASE_URL, SERVER_BASE_URL } from '../utils/config';
import { buildApiUrl } from '../utils/apiConfig';

const ProfileContext = createContext();


export const useProfiles = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfiles must be used within a ProfileProvider');
  return context;
};

export const ProfileProvider = ({ children }) => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  const refreshTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  const MAX_CACHE_SIZE = 750 * 1024; // 750KB limit

  const safeCacheProfiles = useCallback((profilesData) => {
    if (!isMountedRef.current) return;
    
    try {
      const json = JSON.stringify(profilesData);
      if (json.length > MAX_CACHE_SIZE) {
        console.warn(`Profile cache too large (${(json.length / 1024).toFixed(2)}KB), skipping`);
        localStorage.removeItem('profiles_cache_optimized');
        localStorage.removeItem('profiles_cache_time');
        return false;
      }
      localStorage.setItem('profiles_cache_optimized', json);
      localStorage.setItem('profiles_cache_time', Date.now().toString());
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded, clearing cache');
        localStorage.removeItem('profiles_cache_optimized');
        localStorage.removeItem('profiles_cache_time');
      }
      return false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Cleanup old cache on mount
    storageGuard.cleanupOldCaches();
    
    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const fetchProfiles = useCallback(async (forceRefresh = false, usePagination = false, page = 1, limit = 20) => {
    if (!isMountedRef.current) return;
    
    if (isMountedRef.current) {
      setLoading(true);
    }
    try {
      console.log('Fetching profiles from API');

      if (!forceRefresh && !usePagination) {
        const cachedProfiles = localStorage.getItem('profiles_cache_optimized');
        const cacheTime = localStorage.getItem('profiles_cache_time');
        const cacheAge = Date.now() - parseInt(cacheTime || '0');
        if (cachedProfiles && cacheAge < 5 * 60 * 1000) {
          console.log('Using cached profiles data');
          setProfiles(JSON.parse(cachedProfiles));
          setError(null);
          setLoading(false);
          return;
        }
      }

      const endpoint = usePagination
        ? `/api/profiles/paginated?page=${page}&limit=${limit}`
        : `/api/profiles`;

      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch(`${SERVER_BASE_URL}${endpoint}`, {
        credentials: 'include',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const profilesData = usePagination ? data.profiles : data;

        if (isMountedRef.current) {
          setProfiles(profilesData);
          setError(null);
        }

        if (!usePagination && isMountedRef.current) {
          safeCacheProfiles(profilesData);
        }

        return usePagination ? data : profilesData;
      } else {
        if (isMountedRef.current) {
          setError(`Failed to fetch profiles: ${response.status}`);
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError('Failed to fetch profiles');
      }
      console.error('Error fetching profiles:', err);
      try {
        const cachedProfiles = localStorage.getItem('profiles_cache_optimized');
        if (cachedProfiles && isMountedRef.current) {
          setProfiles(JSON.parse(cachedProfiles));
        } else if (isMountedRef.current) {
          setProfiles([]);
        }
      } catch (parseError) {
        console.warn('Cache parse error:', parseError);
        if (isMountedRef.current) {
          setProfiles([]);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [safeCacheProfiles]);

  const deleteProfile = async (profileId) => {
    setDeleting(true);
    const possibleUrls = [
      SERVER_BASE_URL
    ];

    const token = localStorage.getItem('auth_token');
    console.log('DeleteProfile - Profile ID:', profileId);
    console.log('DeleteProfile - Token exists:', !!token);

    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let lastError = null;

    try {
      for (let i = 0; i < possibleUrls.length; i++) {
        const apiUrl = possibleUrls[i];
        console.log(`DeleteProfile - Trying API URL ${i + 1}/${possibleUrls.length}:`, apiUrl);

        try {
          const response = await fetch(`${apiUrl}/api/profiles/${profileId}`, {
            method: 'DELETE',
            headers,
            credentials: 'include'
          });

          console.log('DeleteProfile - Response status:', response.status);
          console.log('DeleteProfile - Response headers:', response.headers.get('content-type'));

          if (response.ok) {
            const contentType = response.headers.get('content-type');
            const isJson = contentType && contentType.includes('application/json');
            const data = isJson ? await response.json() : { message: 'Profile deleted successfully' };

            setProfiles(prev => prev.filter(p => p._id !== profileId));
            localStorage.removeItem('profiles_cache_optimized');
            localStorage.removeItem('profiles_cache_time');
            console.log(`DeleteProfile - Success with URL: ${apiUrl}`);
            return data;
          } else {
            const textResponse = await response.text();
            console.log(`DeleteProfile - Failed with URL ${apiUrl}, status: ${response.status}, response: ${textResponse.substring(0, 200)}`);
            lastError = new Error(`Server error (${response.status})`);
            continue;
          }
        } catch (err) {
          console.log(`DeleteProfile - Error with URL ${apiUrl}:`, err.message);
          lastError = err;
          continue;
        }
      }
      throw lastError || new Error('Failed to delete profile - all API endpoints unreachable');
    } finally {
      if (isMountedRef.current) {
        setDeleting(false);
      }
    }
  };

  const refreshProfiles = useCallback(() => fetchProfiles(true), [fetchProfiles]);

  useEffect(() => {
    if (isMountedRef.current) {
      fetchProfiles();
    }
  }, []);

  const addProfile = useCallback(async (newProfile) => {
    setCreating(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch(buildApiUrl('/profiles'), {
        method: 'POST',
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(newProfile),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json'))
        throw new Error('Server returned non-JSON response');

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Failed to create profile: ${response.status}`);

      if (isMountedRef.current) {
        setProfiles(prev => [data, ...prev]);
        
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            fetchProfiles(true);
          }
        }, 500);
      }
      return data;
    } catch (err) {
      if (isMountedRef.current) {
        setError('Failed to create profile');
      }
      throw err;
    } finally {
      if (isMountedRef.current) {
        setCreating(false);
      }
    }
  }, [fetchProfiles]);

  const updateProfile = useCallback(async (id, updatedProfile) => {
    setUpdating(true);
    try {
      const response = await fetch(buildApiUrl(`/profiles/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile),
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`Failed to update profile: ${response.status}`);

      const data = await response.json();
      if (isMountedRef.current) {
        setProfiles(prev => prev.map(profile => profile._id === id ? data : profile));
        
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            fetchProfiles(true);
          }
        }, 500);
      }

      return data;
    } catch (err) {
      if (isMountedRef.current) {
        setError('Failed to update profile');
      }
      throw err;
    } finally {
      if (isMountedRef.current) {
        setUpdating(false);
      }
    }
  }, [fetchProfiles]);

  const getProfileById = useCallback((id) => profiles.find(profile => profile._id === id), [profiles]);

  const fetchMyProfile = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/my-profile'), { 
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch profile' }));
        throw new Error(errorData.message || `Failed to fetch profile: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('Error fetching my profile:', err);
      throw err;
    }
  }, []);

  const fetchProfileById = useCallback(async (id) => {
    try {
      const response = await fetch(buildApiUrl(`/profiles/${id}`), { credentials: 'include' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch profile' }));
        throw new Error(errorData.message || `Failed to fetch profile: ${response.status}`);
      }

      const profile = await response.json();
      if (isMountedRef.current) {
        setProfiles(prev => {
          const updated = prev.map(p => p._id === id ? { ...p, ...profile } : p);
          safeCacheProfiles(updated);
          return updated;
        });
      }
      return profile;
    } catch (err) {
      console.error('Error fetching profile:', err);
      throw err;
    }
  }, [safeCacheProfiles]);

  const fetchCompleteProfileById = useCallback(async (id) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(buildApiUrl(`/profiles/${id}/complete`), { 
        credentials: 'include',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      if (response.ok) return await response.json();
      throw new Error(`Failed to fetch complete profile: ${response.status}`);
    } catch (err) {
      console.error('Error fetching complete profile:', err);
      throw err;
    }
  }, []);

  const uploadProfilePicture = useCallback(async (id, file) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('profilePicture', file);

      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(buildApiUrl(`/profiles/${id}/upload-picture`), {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (isMountedRef.current) {
          setProfiles(prev => {
            const updated = prev.map(profile =>
              profile._id === id ? { ...profile, profilePicture: data.profilePicture } : profile
            );
            safeCacheProfiles(updated);
            return updated;
          });
        }
        return data.profilePicture;
      } else {
        const textResponse = await response.text();
        throw new Error(`Server error (${response.status}): ${textResponse.substring(0, 100)}`);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError('Failed to upload profile picture: ' + err.message);
      }
      throw err;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [safeCacheProfiles]);

  const deleteProfilePicture = useCallback(async (id) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');

      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(buildApiUrl(`/profiles/${id}/delete-picture`), {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (isMountedRef.current) {
          setProfiles(prev => {
            const updated = prev.map(profile =>
              profile._id === id ? { ...profile, profilePicture: null } : profile
            );
            safeCacheProfiles(updated);
            return updated;
          });
        }
        return data;
      } else {
        const textResponse = await response.text();
        throw new Error(`Server error (${response.status}): ${textResponse.substring(0, 100)}`);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError('Failed to delete profile picture: ' + err.message);
      }
      throw err;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [safeCacheProfiles]);

  const [userProfile, setUserProfile] = useState({});

  useEffect(() => {
    if (user) {
      setUserProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        company: user.company || '',
        jobTitle: user.jobTitle || '',
        mobile: user.mobile || '',
        dateOfBirth: user.dateOfBirth || '',
        bio: user.bio || '',
        language: user.language || 'English',
        address: user.address || {},
        staffType: user.staffType || 'Staff',
        role: user.role || '',
        skillkoId: user.skillkoId || '',
        department: user.department || '',
        jobLevel: user.jobLevel || '',
        profilePicture: user.profilePicture || ''
      });
    }
  }, [user]);

  const updateUserProfile = useCallback(async (profileData) => {
    setLoading(true);
    try {
      const updatedData = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email || profileData.username,
        mobile: profileData.mobile,
        dateOfBirth: profileData.dob,
        gender: profileData.gender,
        company: profileData.company,
        jobTitle: Array.isArray(profileData.jobTitle) ? profileData.jobTitle : [profileData.jobTitle],
        jobLevel: profileData.jobLevel,
        language: profileData.language,
        staffType: profileData.staffType,
        nationality: profileData.nationality,
        bio: profileData.bio,
        otherInformation: profileData.otherInfo,
        address: {
          line1: profileData.addressLine1,
          line2: profileData.addressLine2,
          city: profileData.city,
          postCode: profileData.postCode,
          country: profileData.country
        },
        emergencyContact: {
          name: profileData.emergencyName,
          relationship: profileData.emergencyRelationship,
          phone: profileData.emergencyPhone
        }
      };

      const token = localStorage.getItem('auth_token');
      const response = await fetch(buildApiUrl(`/profiles/${user._id}`), {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(updatedData),
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`Failed to update profile: ${response.status}`);

      const data = await response.json();
      if (isMountedRef.current) {
        setUserProfile(data);
      }
      return { success: true, data };
    } catch (err) {
      if (isMountedRef.current) {
        setError('Failed to update profile: ' + err.message);
      }
      return { success: false, error: err.message };
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user]);

  const value = useMemo(() => ({
    profiles,
    loading,
    updating,
    creating,
    deleting,
    error,
    addProfile,
    updateProfile,
    deleteProfile,
    refreshProfiles,
    fetchProfiles,
    getProfileById,
    fetchMyProfile,
    fetchProfileById,
    fetchCompleteProfileById,
    uploadProfilePicture,
    deleteProfilePicture,
    userProfile,
    updateUserProfile
  }), [
    profiles,
    loading,
    updating,
    creating,
    deleting,
    error,
    addProfile,
    updateProfile,
    deleteProfile,
    refreshProfiles,
    fetchProfiles,
    getProfileById,
    fetchMyProfile,
    fetchProfileById,
    fetchCompleteProfileById,
    uploadProfilePicture,
    deleteProfilePicture,
    userProfile,
    updateUserProfile
  ]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};