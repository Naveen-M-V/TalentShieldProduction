// src/utils/errorHandler.js
export const handleError = (error, context = 'Unknown') => {
  // Log error for debugging
  console.error(`Error in ${context}:`, error);
  
  // In production, you might want to send errors to a logging service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to error tracking service
    // errorTrackingService.captureException(error, { context });
  }
  
  // Return user-friendly error message
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

export const isNetworkError = (error) => {
  return !error.response && error.request;
};

export const isServerError = (error) => {
  return error?.response?.status >= 500;
};

export const isClientError = (error) => {
  return error?.response?.status >= 400 && error?.response?.status < 500;
};

export const getErrorMessage = (error) => {
  if (isNetworkError(error)) {
    return 'Network error. Please check your internet connection.';
  }
  
  if (isServerError(error)) {
    return 'Server error. Please try again later.';
  }
  
  if (isClientError(error)) {
    return error.response?.data?.message || 'Invalid request.';
  }
  
  return handleError(error);
};
