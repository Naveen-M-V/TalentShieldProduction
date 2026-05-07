// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getErrorMessage } from '../utils/errorHandler';
import { buildApiUrl } from '../utils/apiConfig';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Configure axios to include credentials (cookies) with requests
axios.defaults.withCredentials = true;

export const AuthProvider = ({ children }) => {
  // Session storage utilities - only for authentication state
  const sessionStorage = {
    // Store user session data
    setUserSession: (userData, token = null) => {
      try {
        console.log('💾 Storing session:', { userData, hasToken: !!token });
        localStorage.setItem('user_session', JSON.stringify({
          user: userData,
          timestamp: Date.now(),
          expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        }));
        if (token) {
          localStorage.setItem('auth_token', token);
          console.log('✅ Token stored in localStorage');
        }
        // Verify storage
        const stored = localStorage.getItem('user_session');
        const storedToken = localStorage.getItem('auth_token');
        console.log('✅ Session stored successfully:', { 
          hasSession: !!stored, 
          hasToken: !!storedToken,
          userRole: userData?.role,
          userType: userData?.userType
        });
      } catch (error) {
        console.error('❌ Error storing session:', error);
      }
    },

    // Get user session data
    getUserSession: () => {
      try {
        const sessionData = localStorage.getItem('user_session');
        console.log('🔍 Getting user session:', { hasData: !!sessionData });
        
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          console.log('📦 Session data:', {
            hasUser: !!parsed.user,
            userRole: parsed.user?.role,
            userType: parsed.user?.userType
          });
          
          // Check if session is expired
          if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
            console.log('⏰ Session expired');
            sessionStorage.clearSession();
            return null;
          }
          return parsed;
        } else {
          console.log('❌ No session data in localStorage');
        }
      } catch (error) {
        console.error('❌ Error reading session:', error);
        sessionStorage.clearSession();
      }
      return null;
    },

    // Clear all session data
    clearSession: () => {
      try {
        localStorage.removeItem('user_session');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('session_cookie');
      } catch (error) {
        console.error('Error clearing session:', error);
      }
    },

    // Store session cookie for backend communication
    setSessionCookie: (cookieValue) => {
      try {
        localStorage.setItem('session_cookie', cookieValue);
      } catch (error) {
        console.error('Error storing session cookie:', error);
      }
    },

    // Get auth token
    getAuthToken: () => {
      try {
        return localStorage.getItem('auth_token');
      } catch (error) {
        console.error('Error reading auth token:', error);
        return null;
      }
    }
  };

  // Initialize state from session storage
  const getInitialState = () => {
    console.log('🚀 Initializing auth state...');
    const sessionData = sessionStorage.getUserSession();
    if (sessionData && sessionData.user) {
      console.log('✅ Found session data on init:', {
        userRole: sessionData.user.role,
        userType: sessionData.user.userType,
        email: sessionData.user.email
      });
      return {
        user: sessionData.user,
        isAuthenticated: true
      };
    }
    console.log('❌ No session data found on init');
    return {
      user: null,
      isAuthenticated: false
    };
  };

  const initialState = getInitialState();
  const [user, setUser] = useState(initialState.user);
  const [isAuthenticated, setIsAuthenticated] = useState(initialState.isAuthenticated);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debug: Track user state changes
  useEffect(() => {
    console.log('👤 User state changed:', {
      isAuthenticated,
      hasUser: !!user,
      userRole: user?.role,
      userType: user?.userType,
      userEmail: user?.email
    });
  }, [user, isAuthenticated]);

  // Note: Session cookies are httpOnly and managed by the server
  // This function is deprecated and should not be used
  const storeSessionCookie = () => {
    console.warn('storeSessionCookie is deprecated - session cookies are httpOnly');
  };

  const checkExistingSession = useCallback(async () => {
    try {
      const sessionData = sessionStorage.getUserSession();
      if (sessionData && sessionData.user) {
        try {
          await axios.get(buildApiUrl('/auth/validate-session'), {
            withCredentials: true,
            timeout: 5000
          });
          // Session is valid, no action needed
        } catch (error) {
          // Session invalid, clear it
          if (error.response?.status === 403 || error.response?.status === 401 || error.response?.status === 404) {
            handleInvalidSession();
          }
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
      // Don't clear session on network errors, only on auth errors
    }
  }, []);

  // Check for existing session on app start
  useEffect(() => {
    let isMounted = true;

    console.log('🔄 useEffect running - checking session', { hasUser: !!user });

    // Only run background validation if user is not already set
    if (!user && isMounted) {
      checkExistingSession();
    }

    // Listen for localStorage changes to sync across tabs (session management only)
    const handleStorageChange = (e) => {
      if (!isMounted) return;

      if (e.key === 'user_session') {
        if (e.newValue) {
          try {
            const sessionData = JSON.parse(e.newValue);
            if (sessionData.user && isMounted) {
              setUser(sessionData.user);
              setIsAuthenticated(true);
            }
          } catch (error) {
            console.error('Error parsing session storage change:', error);
          }
        } else {
          // Session was removed
          if (isMounted) {
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, checkExistingSession]);


  const login = async (emailOrUsername, password, rememberMe = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(buildApiUrl('/auth/login'), {
        identifier: emailOrUsername,
        password,
        rememberMe
      }, {
        timeout: 10000,
        withCredentials: true
      });

      // Backend returns: { success: true, data: { user, token, userType } }
      const { token, user: userData, userType } = response.data.data || response.data;

      console.log('🔍 Login response received:', {
        hasToken: !!token,
        hasUserData: !!userData,
        userType,
        userRole: userData?.role,
        userEmail: userData?.email
      });

      if (!userData) {
        throw new Error('Invalid response from server');
      }

      // Add userType to userData if it exists
      const userWithType = {
        ...userData,
        userType: userType || userData.userType
      };

      console.log('📦 User object prepared for storage:', {
        role: userWithType.role,
        userType: userWithType.userType,
        email: userWithType.email,
        id: userWithType.id
      });

      // Store session data using our session storage utility
      sessionStorage.setUserSession(userWithType, token);

      // Update state - session is automatically handled by cookies
      setUser(userWithType);
      setIsAuthenticated(true);

      console.log('✅ Login complete, state updated');

      return { success: true, user: userWithType };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Login error:', err.response?.data || err.message);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(buildApiUrl('/auth/signup'), userData, {
        timeout: 10000,
        withCredentials: true
      });

      return { success: true, message: "Account created successfully" };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Call backend logout endpoint to destroy session
      await axios.post(buildApiUrl('/auth/logout'));
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Clear session data using our session storage utility
      sessionStorage.clearSession();
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      setLoading(false);
    }
  };

  const handleInvalidSession = () => {
    console.log("Invalid session. Clearing user data.");
    sessionStorage.clearSession();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updatedUserData) => {
    const newUserData = { ...user, ...updatedUserData };
    setUser(newUserData);
    sessionStorage.setUserSession(newUserData);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    signup,
    logout,
    updateUser,
    storeSessionCookie
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
