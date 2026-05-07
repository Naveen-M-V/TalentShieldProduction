import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getCurrentPosition, 
  watchPosition, 
  clearPositionWatch, 
  requestLocationPermission 
} from '../utils/geolocation';

export const useLiveLocation = (options = {}) => {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,              // ALWAYS fresh GPS
    autoStart = false,
    onLocationUpdate = null,
    onError = null
  } = options;

  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState('prompt');
  const [isLoading, setIsLoading] = useState(false);

  const watchIdRef = useRef(null);

  // Check permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const state = await requestLocationPermission();
        setPermission(state);
      } catch (err) {
        console.warn('Permission check failed:', err);
      }
    };
    checkPermission();
  }, []);

  // Auto-start tracking
  useEffect(() => {
    if (autoStart && permission === 'granted') startTracking();
  }, [autoStart, permission]);

  // Get current location once
  const getCurrentLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const position = await getCurrentPosition({
        enableHighAccuracy,
        timeout,
        maximumAge
      });

      setLocation(position);
      setPermission('granted');

      if (onLocationUpdate) onLocationUpdate(position);
      return position;

    } catch (err) {
      setError(err.message);
      if (onError) onError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [enableHighAccuracy, timeout, maximumAge, onLocationUpdate, onError]);

  // Start tracking
  const startTracking = useCallback(() => {
    if (isTracking) return;

    setError(null);
    setIsTracking(true);

    const handleLocation = (pos) => {
      setLocation(pos);
      setPermission('granted');
      if (onLocationUpdate) onLocationUpdate(pos);
    };

    const handleError = (err) => {
      setError(err.message);
      setIsTracking(false);
      if (onError) onError(err);
    };

    const id = watchPosition(handleLocation, handleError);
    watchIdRef.current = id;

    if (!id) {
      setIsTracking(false);
      setError('Unable to start GPS tracking');
    }
  }, [isTracking, onLocationUpdate, onError]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (!isTracking) return;
    if (watchIdRef.current) {
      clearPositionWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, [isTracking]);

  // Toggle
  const toggleTracking = useCallback(() => {
    if (isTracking) stopTracking();
    else startTracking();
  }, [isTracking, startTracking, stopTracking]);

  // Request manual permission
  const requestPermission = useCallback(async () => {
    try {
      const state = await requestLocationPermission();
      setPermission(state);
      return state;
    } catch (err) {
      setError('Permission request failed');
      throw err;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) clearPositionWatch(watchIdRef.current);
    };
  }, []);

  return {
    location,
    isTracking,
    error,
    permission,
    isLoading,

    getCurrentLocation,
    startTracking,
    stopTracking,
    toggleTracking,
    requestPermission,

    hasLocation: !!location,
    isPermissionGranted: permission === 'granted',
    isPermissionDenied: permission === 'denied',

    // FIXED: Correct order → [lat, lng]
    coordinates: location ? [location.latitude, location.longitude] : null,

    clearError: () => setError(null),
    refreshLocation: getCurrentLocation
  };
};

export default useLiveLocation;
