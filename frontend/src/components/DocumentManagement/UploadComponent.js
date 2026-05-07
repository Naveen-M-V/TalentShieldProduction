import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Upload, 
  File, 
  FileText, 
  Image, 
  Archive,
  AlertCircle,
  Check,
  Plus
} from 'lucide-react';
import axios from 'axios';
import '../../utils/axiosConfig';

const UploadComponent = ({ onClose, onUpload, folderId }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState({});

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList).map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending'
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setErrors({});
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getFileIcon = (fileName) => {
    const extension = fileName && fileName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(extension)) {
      return Image;
    } else if (['pdf'].includes(extension)) {
      return FileText;
    } else if (['zip', 'rar', '7z'].includes(extension)) {
      return Archive;
    } else {
      return File;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (files.length === 0) {
      newErrors.files = 'Please select at least one file';
    }
    
    // Check file sizes (max 10MB per file)
    for (const fileItem of files) {
      if (fileItem.file.size > 10 * 1024 * 1024) {
        newErrors[fileItem.id] = 'File size must be less than 10MB';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpload = async () => {
    if (!validateForm()) return;

    setUploading(true);
    const uploadedDocuments = [];

    try {
      const token = localStorage.getItem('auth_token');

      for (const fileItem of files) {
        const formData = new FormData();
        formData.append('file', fileItem.file);
        if (folderId) formData.append('folderId', folderId);

        // Update file status
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'uploading' } : f
        ));

        try {
          const uploadUrlBase = folderId
            ? `/api/documentManagement/folders/${folderId}/documents`
            : `/api/documentManagement/documents`;

          const uploadUrl = token
            ? `${uploadUrlBase}?token=${encodeURIComponent(token)}`
            : uploadUrlBase;

          const response = await axios.post(
            uploadUrl,
            formData,
            {
              headers: {
                ...(token && { 'Authorization': `Bearer ${token}` })
              },
              withCredentials: true,
              onUploadProgress: (progressEvent) => {
                const progress = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                setUploadProgress(prev => ({
                  ...prev,
                  [fileItem.id]: progress
                }));
              }
            }
          );

          uploadedDocuments.push(response.data);
          
          // Update file status
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { ...f, status: 'completed' } : f
          ));
        } catch (error) {
          console.error('Error uploading file:', {
            status: error?.response?.status,
            message: error?.response?.data?.message || error?.message,
            url: error?.config?.url
          });
          // Update file status
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { ...f, status: 'error' } : f
          ));
        }
      }

      // Call success callback
      if (uploadedDocuments.length > 0) {
        onUpload(uploadedDocuments);
        // Close modal after successful upload
        setTimeout(() => onClose(), 1000);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  // Animation variants
  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.9,
      transition: { duration: 0.2 }
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: 'spring', 
        stiffness: 300, 
        damping: 25,
        duration: 0.3
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      transition: { duration: 0.2 }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
          exit: { opacity: 0 }
        }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          variants={modalVariants}
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Upload Documents</h2>
            </div>
            <button
              onClick={onClose}
              disabled={uploading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            {/* Drag & Drop Area */}
            <div className="mb-6">
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Drag and drop files here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  PDF, Word, Excel, Images (Max 10MB per file)
                </p>
              </div>
              {errors.files && (
                <p className="mt-1 text-sm text-red-600">{errors.files}</p>
              )}
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Files to Upload</h3>
                <div className="space-y-2">
                  {files.map(fileItem => {
                    const FileIcon = getFileIcon(fileItem.file.name);
                    return (
                      <div key={fileItem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileIcon className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{fileItem.file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(fileItem.file.size)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {fileItem.status === 'pending' && (
                            <button
                              onClick={() => removeFile(fileItem.id)}
                              disabled={uploading}
                              className="p-1 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                            >
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                          )}
                          {fileItem.status === 'uploading' && (
                            <div className="flex items-center space-x-2">
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-600 transition-all duration-300"
                                  style={{ width: `${uploadProgress[fileItem.id] || 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">
                                {uploadProgress[fileItem.id] || 0}%
                              </span>
                            </div>
                          )}
                          {fileItem.status === 'completed' && (
                            <Check className="w-5 h-5 text-green-500" />
                          )}
                          {fileItem.status === 'error' && (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Documents'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UploadComponent;
