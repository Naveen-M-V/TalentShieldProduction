import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { formatDateDDMMYY } from '../utils/dateFormatter';
import { buildApiUrl } from '../utils/apiConfig';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shouldAutoFetch, setShouldAutoFetch] = useState(false);
  const { user } = useAuth();
  
  const refreshTimeoutRef = useRef(null);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const callbacksRef = useRef(new Set());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      if (isMountedRef.current) {
        setLoading(true);
        setError(null);
      }

      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch(buildApiUrl('/notifications'), {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // If authentication failed, stop polling to prevent console spam
        if (response.status === 401) {
          console.log('Notifications: Authentication required, skipping...');
          // Clear the interval to stop repeated 401 errors
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const transformedNotifications = data.notifications.map(notif => ({
        id: notif._id,
        title: notif.title || notif.message,
        message: notif.message,
        type: notif.type,
        priority: notif.priority,
        read: notif.read,
        status: notif.read ? 'Read' : 'Open',
        date: formatDateDDMMYY(notif.createdOn || notif.createdAt),
        createdAt: notif.createdOn || notif.createdAt,
        metadata: notif.metadata || {}
      }));

      if (isMountedRef.current) {
        setNotifications(transformedNotifications);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      if (isMountedRef.current) {
        setError('Failed to fetch notifications');
        setNotifications([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (user && user.id && shouldAutoFetch && isMountedRef.current) {
      // Fetch immediately
      fetchNotifications();

      // Poll every 15 seconds for better responsiveness
      intervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          fetchNotifications();
        }
      }, 15000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, shouldAutoFetch, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId) => {
    if (!isMountedRef.current) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch(buildApiUrl(`/notifications/${notificationId}/read`), {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (isMountedRef.current) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, read: true, status: 'Read' }
              : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch(buildApiUrl('/notifications/mark-all-read'), {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (isMountedRef.current) {
        setNotifications(prev => prev.map(notif => ({ ...notif, read: true, status: 'Read' })));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  const getUnreadCount = useCallback(() => {
    return notifications.filter(notif => !notif.read).length;
  }, [notifications]);

  const refreshNotifications = useCallback(() => {
    if (isMountedRef.current) {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const subscribeToNotificationChanges = useCallback((callback) => {
    if (!callbacksRef.current.has(callback)) {
      callbacksRef.current.add(callback);
    }
    return () => {
      callbacksRef.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    if (!isMountedRef.current) return;
    
    const unreadCount = notifications.filter(n => !n.read).length;
    callbacksRef.current.forEach(cb => {
      try {
        cb(unreadCount);
      } catch (err) {
        console.error('Notification callback error:', err);
      }
    });
  }, [notifications]);

  const triggerRefresh = useCallback(() => {
    if (!isMountedRef.current) return;
    
    setShouldAutoFetch(true);
    
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    refreshTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        fetchNotifications();
      }
    }, 1000);
  }, [fetchNotifications]);

  const initializeNotifications = useCallback(() => {
    if (!shouldAutoFetch && isMountedRef.current) {
      setShouldAutoFetch(true);
    }
  }, [shouldAutoFetch]);

  const value = useMemo(() => ({
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    refreshNotifications,
    triggerRefresh,
    subscribeToNotificationChanges,
    initializeNotifications
  }), [
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    refreshNotifications,
    triggerRefresh,
    subscribeToNotificationChanges,
    initializeNotifications
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
