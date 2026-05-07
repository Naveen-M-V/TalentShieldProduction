/**
 * Geolocation Utilities – Accurate, No Cached GPS, Correct Filtering
 * Fixed: Added default cases to all switch statements
 */

// Get current position (with option support)
export const getCurrentPosition = (options = {}) => {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0  // ALWAYS get fresh, uncached GPS
  } = options;

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Reject inaccurate GPS (optional but recommended)
        if (accuracy > 50) {
          console.warn("Low GPS accuracy:", accuracy);
        }

        resolve({ latitude, longitude, accuracy });
      },
      (error) => {
        let message = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
          default:
            message = 'Unknown geolocation error';
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );
  });
};

// Live tracking with accuracy filtering
export const watchPosition = (onLocationUpdate, onError) => {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation unsupported'));
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy, heading, speed } = position.coords;

      // Ignore inaccurate results > 50m
      if (accuracy > 50) return;

      onLocationUpdate({
        latitude,
        longitude,
        accuracy,
        heading,
        speed,
        timestamp: position.timestamp
      });
    },
    (error) => {
      let message = 'Failed to watch location';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'Location permission denied';
          break;
        case error.POSITION_UNAVAILABLE:
          message = 'Position unavailable';
          break;
        case error.TIMEOUT:
          message = 'Watching position timed out';
          break;
        default:
          message = 'Unknown watch position error';
      }
      onError(new Error(message));
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0 // No cached GPS
    }
  );
};

// Clear watcher
export const clearPositionWatch = (watchId) => {
  if (watchId && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
};

// Check geolocation support
export const isGeolocationAvailable = () => {
  return "geolocation" in navigator;
};

// Permission helper
export const requestLocationPermission = async () => {
  if (!navigator.permissions) {
    try {
      await getCurrentPosition();
      return 'granted';
    } catch {
      return 'denied';
    }
  }

  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    return permission.state; // granted / prompt / denied
  } catch (e) {
    return "prompt";
  }
};

// Haversine distance
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2)**2 +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2)**2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// Format helper
export const formatCoordinates = (lat, lon, precision = 6) => {
  return `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`;
};
