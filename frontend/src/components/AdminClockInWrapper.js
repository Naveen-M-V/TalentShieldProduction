import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserClockStatus } from '../utils/clockApi';
import AdminClockInModal from './AdminClockInModal';

/**
 * Wrapper component that shows clock-in modal after admin login
 * Checks if admin is already clocked in
 */

const AdminClockInWrapper = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Check if modal was already shown today
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('admin_modal_shown_date');
    const modalShownToday = lastShown === today;
    
    // Only check once when user logs in and modal hasn't been shown today
    if (isAuthenticated && user && !hasChecked && !modalShownToday) {
      checkAndShowClockInModal();
      setHasChecked(true);
    }
    
    // Reset when user logs out
    if (!isAuthenticated) {
      setHasChecked(false);
      setShowClockInModal(false);
    }
  }, [isAuthenticated, user, hasChecked]);

  const checkAndShowClockInModal = async () => {
    try {
      // Wait a bit for UI to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const statusRes = await getUserClockStatus();
      
      if (statusRes.success && statusRes.data) {
        const currentStatus = statusRes.data.status;
        
        // Show modal if not clocked in yet
        if (currentStatus === 'not-clocked-in' || currentStatus === 'clocked-out') {
          console.log('User not clocked in, showing clock-in modal');
          setShowClockInModal(true);
        } else {
          console.log(`User already ${currentStatus}`);
        }
      }
    } catch (error) {
      console.error('Check clock status error:', error);
      // Don't show modal if there's an error - user can clock in manually
      console.log('Skipping auto clock-in modal due to error');
    }
  };

  const handleClockIn = (data) => {
    console.log('Admin clocked in:', data);
    localStorage.setItem('admin-clocked-in', 'true');
    localStorage.setItem('admin_clock_in_time', new Date().toISOString());
  };

  const handleCloseModal = () => {
    setShowClockInModal(false);
    // Mark that modal was shown today
    const today = new Date().toDateString();
    localStorage.setItem('admin_modal_shown_date', today);
  };

  return (
    <>
      {children}
      
      {showClockInModal && isAuthenticated && user && (
        <AdminClockInModal
          user={user}
          onClose={handleCloseModal}
          onClockIn={handleClockIn}
        />
      )}
    </>
  );
};

export default AdminClockInWrapper;
