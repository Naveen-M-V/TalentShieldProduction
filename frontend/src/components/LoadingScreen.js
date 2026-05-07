import React from 'react';

const LoadingScreen = ({ 
  isLoading, 
  message = "Saving changes...", 
  overlay = true,
  size = "medium",
  showSpinner = true,
  className = ""
}) => {
  if (!isLoading) return null;

  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-8 h-8", 
    large: "w-12 h-12"
  };

  const LoadingContent = () => (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {showSpinner && (
        <div className={`animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 ${sizeClasses[size]}`}></div>
      )}
      {message && (
        <p className="text-gray-600 text-sm font-medium animate-pulse">
          {message}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          <LoadingContent />
        </div>
      </div>
    );
  }

  return <LoadingContent />;
};

// Button Loading Component
export const LoadingButton = ({ 
  isLoading, 
  children, 
  loadingText = "Loading...",
  className = "",
  disabled = false,
  ...props 
}) => {
  return (
    <button
      className={`relative flex items-center justify-center space-x-2 ${className} ${
        isLoading || disabled ? 'opacity-75 cursor-not-allowed' : ''
      }`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
      )}
      <span>{isLoading ? loadingText : children}</span>
    </button>
  );
};

// Inline Loading Component (for smaller areas)
export const InlineLoading = ({ 
  isLoading, 
  message = "Loading...",
  size = "small" 
}) => {
  if (!isLoading) return null;

  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-6 h-6"
  };

  return (
    <div className="flex items-center space-x-2 text-gray-600">
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}></div>
      <span className="text-sm">{message}</span>
    </div>
  );
};

// Form Loading Overlay (for forms specifically)
export const FormLoadingOverlay = ({ 
  isLoading, 
  message = "Saving changes...",
  formRef 
}) => {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
      <div className="flex flex-col items-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
