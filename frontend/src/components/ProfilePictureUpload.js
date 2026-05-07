import React, { useState, useEffect, useRef } from 'react';
import { CameraIcon, TrashIcon } from '@heroicons/react/24/outline';
import { validateImageFile } from '../utils/inputValidation';

const ProfilePictureUpload = ({ 
  profilePicture, 
  onUpload, 
  onDelete,
  firstName = '',
  lastName = '',
  uploading = false,
  size = 120
}) => {
  const [previewUrl, setPreviewUrl] = useState(profilePicture);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);
  const fileReaderRef = useRef(null);

  // Cleanup FileReader on unmount
  useEffect(() => {
    return () => {
      if (fileReaderRef.current) {
        fileReaderRef.current.abort();
        fileReaderRef.current = null;
      }
    };
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Clear previous error
    setUploadError('');

    // Validate file type using global validation
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setUploadError(validation.message);
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size should be less than 10MB');
      event.target.value = '';
      return;
    }

    // Cleanup previous FileReader if exists
    if (fileReaderRef.current) {
      fileReaderRef.current.abort();
    }

    // Create new FileReader
    const reader = new FileReader();
    fileReaderRef.current = reader;
    
    reader.onloadend = () => {
      if (fileReaderRef.current === reader) {
        setPreviewUrl(reader.result);
      }
    };
    reader.onerror = () => {
      console.error('FileReader error');
      if (fileReaderRef.current === reader) {
        reader.abort();
        fileReaderRef.current = null;
      }
    };
    reader.readAsDataURL(file);

    if (onUpload) {
      try {
        await onUpload(file);
      } catch (error) {
        // Revert preview on error
        setPreviewUrl(profilePicture);
      }
    }

    event.target.value = '';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete your profile picture?')) {
      setPreviewUrl(null);
      if (onDelete) {
        await onDelete();
      }
    }
  };

  const getInitials = () => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return `${first}${last}` || '?';
  };

  return (
    <div className="relative inline-block">
      <div 
        className="rounded-full overflow-hidden shadow-lg border-4 border-white relative"
        style={{ width: size, height: size }}
      >
        {uploading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt={`${firstName} ${lastName}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-4xl font-semibold">
            {getInitials()}
          </div>
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="text-white text-xs font-medium">Uploading...</div>
          </div>
        )}
      </div>

      {!uploading && (
        <>
          <button
            type="button"
            onClick={handleUploadClick}
            className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-colors"
            title="Upload photo"
          >
            <CameraIcon className="h-5 w-5" />
          </button>

          {previewUrl && (
            <button
              type="button"
              onClick={handleDelete}
              className="absolute top-0 right-0 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-lg transition-colors"
              title="Delete photo"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error Message */}
      {uploadError && (
        <div className="mt-2 text-sm text-red-600 text-center">
          {uploadError}
        </div>
      )}
    </div>
  );
};

export default ProfilePictureUpload;