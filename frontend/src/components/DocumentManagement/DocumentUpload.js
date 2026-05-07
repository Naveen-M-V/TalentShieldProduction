import React, { useEffect, useState, useRef } from 'react';
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
  Plus,
  Calendar,
  Shield,
  Tag
} from 'lucide-react';
import axios from 'axios';
import { validateDocumentFile } from '../../utils/inputValidation';
import '../../utils/axiosConfig';

const DocumentUpload = ({ 
  onClose, 
  onUpload, 
  folders = [], 
  defaultFolder = null 
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(defaultFolder || (folders.length === 1 ? folders[0] : null));
  const [documentMetadata, setDocumentMetadata] = useState({
    category: 'other',
    tags: '',
    employeeId: '',
    permissions: {
      view: ['admin', 'super-admin', 'employee'],
      download: ['admin', 'super-admin'],
      share: ['admin', 'super-admin']
    },
    expiresOn: '',
    reminderEnabled: false
  });
  const [errors, setErrors] = useState({});

  const fileInputRef = useRef(null);
  const roles = ['admin', 'super-admin', 'employee'];
  const categories = ['passport', 'visa', 'contract', 'certificate', 'id_proof', 'resume', 'other'];

  useEffect(() => {
    if (defaultFolder) {
      setSelectedFolder(defaultFolder);
      return;
    }

    if (!selectedFolder && Array.isArray(folders) && folders.length === 1) {
      setSelectedFolder(folders[0]);
    }
  }, [defaultFolder, folders, selectedFolder]);

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
    const newFiles = [];
    const fileErrors = [];
    
    Array.from(fileList).forEach(file => {
      // Validate file type using global validation
      const validation = validateDocumentFile(file);
      if (!validation.isValid) {
        fileErrors.push(`${file.name}: ${validation.message}`);
        return;
      }
      
      newFiles.push({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending'
      });
    });
    
    if (fileErrors.length > 0) {
      setErrors(prev => ({ ...prev, files: fileErrors.join(', ') }));
    } else {
      setErrors(prev => ({ ...prev, files: '' }));
    }
    
    setFiles(prev => [...prev, ...newFiles]);
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
    
    // Folder is optional now; documents can be uploaded without selecting a folder
    
    if (files.length === 0) {
      newErrors.files = 'Please select at least one file';
    }
    
    if (documentMetadata.expiresOn && new Date(documentMetadata.expiresOn) <= new Date()) {
      newErrors.expiresOn = 'Expiry date must be in the future';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpload = async () => {
    if (!validateForm()) return;

    setUploading(true);
    const uploadedDocuments = [];

    try {
      for (const fileItem of files) {
        const formData = new FormData();
        formData.append('file', fileItem.file);
        formData.append('category', documentMetadata.category);
        formData.append('tags', documentMetadata.tags);
        formData.append('employeeId', documentMetadata.employeeId || '');
        // Map legacy permissions to new accessControl structure
        const viewRoles = documentMetadata.permissions && documentMetadata.permissions.view ? documentMetadata.permissions.view : [];
        let accessControl = { visibility: 'all', allowedUserIds: [] };
        if (viewRoles.includes('employee')) {
          accessControl.visibility = 'all';
        } else if (viewRoles.includes('admin') && !viewRoles.includes('employee')) {
          accessControl.visibility = 'admin';
        } else {
          accessControl.visibility = 'custom';
        }
        formData.append('accessControl', JSON.stringify(accessControl));
        formData.append('expiresOn', documentMetadata.expiresOn || '');
        formData.append('reminderEnabled', documentMetadata.reminderEnabled);

        // Update file status
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'uploading' } : f
        ));

        try {
          // Get token from localStorage
          const token = localStorage.getItem('auth_token');
          console.log('Uploading file - Token available:', !!token);
          console.log('Token value:', token ? token.substring(0, 20) + '...' : 'null');
          
          const uploadUrlBase = selectedFolder && selectedFolder._id
            ? `/api/documentManagement/folders/${selectedFolder._id}/documents`
            : `/api/documentManagement/documents`;

          const uploadUrl = token
            ? `${uploadUrlBase}?token=${encodeURIComponent(token)}`
            : uploadUrlBase;

          const response = await axios.post(
            uploadUrl,
            formData,
            {
              headers: {
                // Don't set Content-Type - let axios set it with proper boundary
                // Explicitly set Authorization header for multipart uploads
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
          
          console.log('Upload successful:', response.data);

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
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handlePermissionChange = (permissionType, role, isChecked) => {
    setDocumentMetadata(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionType]: isChecked
          ? [...prev.permissions[permissionType], role]
          : prev.permissions[permissionType].filter(r => r !== role)
      }
    }));
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
            {/* Folder Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Folder *
              </label>
              <select
                value={selectedFolder?._id || ''}
                onChange={(e) => setSelectedFolder((folders || []).find(f => f._id === e.target.value) || null)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                  errors.folder ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Choose a folder...</option>
                {(folders || []).map(folder => (
                  <option key={folder._id} value={folder._id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              {errors.folder && (
                <p className="mt-1 text-sm text-red-600">{errors.folder}</p>
              )}
            </div>

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
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Drag and drop files here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  PDF files only (Max 10MB per file)
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

            {/* Document Metadata */}
            <div className="space-y-4 mb-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={documentMetadata.category}
                  onChange={(e) => setDocumentMetadata(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={documentMetadata.tags}
                  onChange={(e) => setDocumentMetadata(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="Separate tags with commas"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={documentMetadata.expiresOn}
                  onChange={(e) => setDocumentMetadata(prev => ({ ...prev, expiresOn: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 ${
                    errors.expiresOn ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.expiresOn && (
                  <p className="mt-1 text-sm text-red-600">{errors.expiresOn}</p>
                )}
              </div>

              {/* Reminder */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="reminder"
                  checked={documentMetadata.reminderEnabled}
                  onChange={(e) => setDocumentMetadata(prev => ({ ...prev, reminderEnabled: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="reminder" className="text-sm text-gray-700">
                  Enable expiry reminder
                </label>
              </div>

              {/* Permissions */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Shield className="w-4 h-4 inline mr-2" />
                  Access Permissions
                </label>
                
                <div className="space-y-3">
                  {/* View Permission */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Who can view:</p>
                    <div className="flex flex-wrap gap-2">
                      {roles.map(role => (
                        <label key={`view-${role}`} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={documentMetadata.permissions.view.includes(role)}
                            onChange={(e) => handlePermissionChange('view', role, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-1"
                          />
                          <span className="text-sm text-gray-700 capitalize">{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Download Permission */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Who can download:</p>
                    <div className="flex flex-wrap gap-2">
                      {roles.map(role => (
                        <label key={`download-${role}`} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={documentMetadata.permissions.download.includes(role)}
                            onChange={(e) => handlePermissionChange('download', role, e.target.checked)}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500 mr-1"
                          />
                          <span className="text-sm text-gray-700 capitalize">{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Share Permission */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Who can share:</p>
                    <div className="flex flex-wrap gap-2">
                      {roles.map(role => (
                        <label key={`share-${role}`} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={documentMetadata.permissions.share.includes(role)}
                            onChange={(e) => handlePermissionChange('share', role, e.target.checked)}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-1"
                          />
                          <span className="text-sm text-gray-700 capitalize">{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

export default DocumentUpload;
