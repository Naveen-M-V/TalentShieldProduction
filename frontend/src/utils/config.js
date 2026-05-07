// API Configuration utility
// All URLs come from .env.development or .env.production — no hardcoded values here.
const getApiBaseUrl = () => {
  // REACT_APP_API_BASE_URL already includes /api (e.g. http://localhost:5003/api)
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL.replace(/\/$/, '');
  }
  // Fallback: REACT_APP_API_URL + /api
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '').replace(/\/api$/, '') + '/api';
  }
  console.error('❌ REACT_APP_API_BASE_URL is not set. Check frontend/.env.development or frontend/.env.production');
  return '';
};

const getServerBaseUrl = () => {
  // Strip /api suffix to get the bare server URL
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '').replace(/\/api$/, '');
  }
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL.replace(/\/$/, '').replace(/\/api$/, '');
  }
  console.error('❌ REACT_APP_API_URL is not set. Check frontend/.env.development or frontend/.env.production');
  return '';
};

export const API_BASE_URL = getApiBaseUrl();
export const SERVER_BASE_URL = getServerBaseUrl();

// Helper function to get full image URL (works for PDFs and other files too)
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If the path already starts with http/https, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If the path starts with /uploads, use it directly
  if (imagePath.startsWith('/uploads/')) {
    return `${SERVER_BASE_URL}${imagePath}`;
  }
  
  // If the path doesn't start with /, add /uploads/ prefix
  if (!imagePath.startsWith('/')) {
    return `${SERVER_BASE_URL}/uploads/${imagePath}`;
  }
  
  // Default case - use the path as provided
  return `${SERVER_BASE_URL}${imagePath}`;
};
