import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * Clock Status Context
 * Provides real-time clock status updates across the application
 * Uses multiple mechanisms for instant synchronization:
 * 1. Context state - for same-tab updates
 * 2. localStorage events - for cross-tab updates (same device)
 * 3. BroadcastChannel - for modern browser cross-tab communication
 * 4. Polling fallback - for cross-device updates
 */

const ClockStatusContext = createContext();
const CLOCK_EVENT_KEY = 'hrms_clock_event';
const CLOCK_CHANNEL_NAME = 'hrms_clock_channel';

export const useClockStatus = () => {
  const context = useContext(ClockStatusContext);
  if (!context) {
    throw new Error('useClockStatus must be used within ClockStatusProvider');
  }
  return context;
};

export const ClockStatusProvider = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [broadcastChannel, setBroadcastChannel] = useState(null);

  // Initialize BroadcastChannel for modern browsers
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CLOCK_CHANNEL_NAME);
      setBroadcastChannel(channel);
      
      // Listen for messages from other tabs
      channel.onmessage = (event) => {
        if (event.data.type === 'CLOCK_STATUS_CHANGED') {
          console.log('🔔 Received clock status change from another tab:', event.data);
          setRefreshTrigger(prev => prev + 1);
        }
      };
      
      return () => {
        channel.close();
      };
    }
  }, []);

  // Listen for localStorage events (fallback for older browsers)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === CLOCK_EVENT_KEY && e.newValue) {
        try {
          const eventData = JSON.parse(e.newValue);
          console.log('📢 Received clock status change via localStorage:', eventData);
          setRefreshTrigger(prev => prev + 1);
        } catch (error) {
          console.error('Error parsing clock event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Trigger a refresh across all components and broadcast to other tabs
  const triggerClockRefresh = useCallback((eventData = {}) => {
    console.log('🚀 Triggering clock refresh:', eventData);
    
    // Update local state (same tab)
    setRefreshTrigger(prev => prev + 1);
    
    // Broadcast to other tabs using BroadcastChannel (modern browsers)
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'CLOCK_STATUS_CHANGED',
        timestamp: Date.now(),
        ...eventData
      });
    }
    
    // Broadcast to other tabs using localStorage (fallback)
    try {
      const event = {
        type: 'CLOCK_STATUS_CHANGED',
        timestamp: Date.now(),
        ...eventData
      };
      localStorage.setItem(CLOCK_EVENT_KEY, JSON.stringify(event));
      // Clear after a short delay to allow other tabs to read it
      setTimeout(() => {
        localStorage.removeItem(CLOCK_EVENT_KEY);
      }, 100);
    } catch (error) {
      console.error('Error broadcasting clock event:', error);
    }
  }, [broadcastChannel]);

  const value = {
    refreshTrigger,
    triggerClockRefresh
  };

  return (
    <ClockStatusContext.Provider value={value}>
      {children}
    </ClockStatusContext.Provider>
  );
};
