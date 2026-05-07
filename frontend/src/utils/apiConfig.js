/**
 * API Configuration Utility
 * Reads REACT_APP_API_BASE_URL (set in .env.development or .env.production).
 * No hardcoded URLs — all config lives in the .env files.
 */

/**
 * Get the base API URL without /api suffix.
 * Source: REACT_APP_API_BASE_URL (e.g. http://localhost:5003/api)
 *      or REACT_APP_API_URL      (e.g. http://localhost:5003)
 */
export const getApiBaseUrl = () => {
  // REACT_APP_API_BASE_URL is the canonical var — strip trailing /api if present
  if (process.env.REACT_APP_API_BASE_URL) {
    let baseUrl = process.env.REACT_APP_API_BASE_URL.replace(/\/$/, '');
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.slice(0, -4);
    }
    return baseUrl;
  }

  // Fallback: REACT_APP_API_URL (already without /api)
  if (process.env.REACT_APP_API_URL) {
    let baseUrl = process.env.REACT_APP_API_URL.replace(/\/$/, '');
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.slice(0, -4);
    }
    return baseUrl;
  }

  // Neither env var is set — fail loudly so the developer knows what to fix
  const msg =
    '❌ REACT_APP_API_BASE_URL is not set. ' +
    'Create frontend/.env.development (local) or frontend/.env.production (build) ' +
    'and set REACT_APP_API_BASE_URL=http://localhost:5003/api';
  console.error(msg);
  throw new Error(msg);
};

/**
 * Build full API URL with path
 * @param {string} path - API path (e.g., '/certificates' or 'certificates')
 * @returns {string} Full API URL (e.g., 'https://hrms.talentshield.co.uk/api/certificates')
 */
export const buildApiUrl = (path) => {
  const baseUrl = getApiBaseUrl();
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Build: baseUrl + /api + path
  return `${baseUrl}/api${cleanPath}`;
};

/**
 * Build API URL without /api prefix (for special endpoints)
 * @param {string} path - Path (e.g., '/health')
 * @returns {string} Full URL without /api
 */
export const buildDirectUrl = (path) => {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Get image URL for profile pictures
 * @param {string} imagePath - Image path from profile.profilePicture
 * @returns {string} Full image URL
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  
  // If already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  const baseUrl = getApiBaseUrl();
  
  // Remove leading slash from imagePath if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  
  return `${baseUrl}/${cleanPath}`;
};

/**
 * Log current API configuration (for debugging)
 */
export const logApiConfig = () => {
  const baseUrl = getApiBaseUrl();
  console.log('🔧 API Configuration:');
  console.log('   REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
  console.log('   Resolved base URL:', baseUrl);
  console.log('   Sample endpoint:', `${baseUrl}/api/employees`);
};

// Log on initial load in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Config loaded — Base URL:', process.env.REACT_APP_API_BASE_URL || '(not set)');
}

// Export default object with all utilities
export default {
  getApiBaseUrl,
  buildApiUrl,
  buildDirectUrl,
  getImageUrl,
  logApiConfig
};
