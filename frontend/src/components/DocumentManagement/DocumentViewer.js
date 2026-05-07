import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Download, 
  Eye,
  FileText,
  Image as ImageIcon,
  File,
  Calendar,
  User,
  Tag,
  Shield,
  Clock,
  Maximize,
  Minimize
} from 'lucide-react';
import axios from 'axios';
import '../../utils/axiosConfig';
import { buildApiUrl } from '../../utils/apiConfig';

const DocumentViewer = ({ document, onClose, onDownload }) => {
  const [loading, setLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (document) {
      loadDocumentPreview();
    }
  }, [document]);

  const loadDocumentPreview = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      // E-learning materials are stored as disk files (not DB buffers).
      // Use the dedicated /api/elearning/view/:id endpoint which reads from fileUrl.
      // All other documents use the documentManagement /view endpoint which reads fileData.
      let viewUrl;
      if (document.category === 'e_learning') {
        viewUrl = buildApiUrl(`/elearning/view/${document._id}`) + (token ? `?token=${encodeURIComponent(token)}` : '');
      } else {
        viewUrl = buildApiUrl(`/documentManagement/documents/${document._id}/view`) + (token ? `?token=${encodeURIComponent(token)}` : '');
      }
      setFileUrl(viewUrl);
    } catch (err) {
      console.error('Error loading document preview:', err);
      setError('Failed to load document preview');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getFileIcon = () => {
    const filename = document.name || document.fileName || '';
    const extension = filename && filename.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(extension)) {
      return ImageIcon;
    } else if (['pdf'].includes(extension)) {
      return FileText;
    } else {
      return File;
    }
  };

  const canPreview = () => {
    // Check mimeType first
    if (document.mimeType) {
      if (document.mimeType.includes('pdf')) return true;
      if (document.mimeType.includes('image')) return true;
      if (document.mimeType.includes('powerpoint') || document.mimeType.includes('presentation')) return true;
      if (document.mimeType.includes('word') || document.mimeType.includes('wordprocessing')) return true;
      if (document.mimeType.includes('excel') || document.mimeType.includes('spreadsheet')) return true;
    }
    
    // Fallback to extension check
    const filename = document.name || document.fileName || '';
    const extension = filename && filename.split('.').pop().toLowerCase();
    return extension && [
      'jpg', 'jpeg', 'png', 'gif', 'svg', 'pdf',
      'pptx', 'ppt', 'docx', 'doc', 'xlsx', 'xls'
    ].includes(extension);
  };

  const isOfficeDocument = () => {
    console.log('🔍 DocumentViewer - Checking if Office document:', {
      name: document.name,
      mimeType: document.mimeType,
      fileName: document.fileName
    });
    
    // Check mimeType first (more reliable)
    if (document.mimeType) {
      const officeMimeTypes = [
        'application/vnd.ms-powerpoint', // PPT
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
        'application/msword', // DOC
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
        'application/vnd.ms-excel', // XLS
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // XLSX
      ];
      if (officeMimeTypes.includes(document.mimeType)) {
        console.log('✅ Detected as Office document by mimeType');
        return true;
      }
    }
    // Fallback to extension check
    const filename = document.name || document.fileName || '';
    const extension = filename && filename.split('.').pop().toLowerCase();
    const isOffice = extension && ['pptx', 'ppt', 'docx', 'doc', 'xlsx', 'xls'].includes(extension);
    console.log(`${isOffice ? '✅' : '❌'} Detected as Office document by extension:`, extension);
    return isOffice;
  };

  const FileIcon = getFileIcon();

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 }
  };

  if (!document) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={`bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
            isFullscreen ? 'fixed inset-0 w-screen h-screen max-w-none max-h-screen rounded-none' : 'w-full max-w-5xl max-h-[95vh]'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-600 to-emerald-600">
            <div className="flex items-center space-x-3">
              <FileIcon className="w-6 h-6 text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">{document.name || document.fileName}</h2>
                <p className="text-sm text-green-100">
                  {formatFileSize(document.fileSize)} • Uploaded {formatDate(document.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
              {document.category !== 'e_learning' && (
                <button
                  onClick={() => onDownload(document)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Preview Area */}
            <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-auto">
              {loading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading preview...</p>
                </div>
              ) : error ? (
                <div className="text-center p-8">
                  <FileIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-red-600 mb-2">{error}</p>
                  <button
                    onClick={() => onDownload(document)}
                    className="text-green-600 hover:underline"
                  >
                    Download instead
                  </button>
                </div>
              ) : canPreview() ? (
                <div className="w-full h-full p-4">
                  {document.mimeType && document.mimeType.startsWith('image/') ? (
                    <img 
                      src={fileUrl} 
                      alt={document.name || document.fileName}
                      className="max-w-full max-h-full object-contain mx-auto"
                    />
                  ) : document.mimeType === 'application/pdf' ? (
                    <iframe
                      src={fileUrl}
                      className="w-full h-full border-0"
                      title={document.name || document.fileName}
                    />
                  ) : isOfficeDocument() ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <FileIcon className="w-24 h-24 text-blue-500 mb-6" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        {document.name || document.fileName}
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-md">
                        Office documents (PowerPoint, Word, Excel) cannot be previewed directly in the browser. 
                        Please download the file to view it.
                      </p>
                      <button
                        onClick={() => onDownload(document)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2 text-lg"
                      >
                        <Download className="w-5 h-5" />
                        <span>Download to View</span>
                      </button>
                      <p className="text-sm text-gray-500 mt-4">
                        File size: {formatFileSize(document.fileSize)}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-center p-8">
                  <FileIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                  <button
                    onClick={() => onDownload(document)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </button>
                </div>
              )}
            </div>

            {/* Metadata Sidebar - Hidden in fullscreen */}
            {!isFullscreen && (
              <div className="w-80 bg-white border-l overflow-y-auto p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Document Details</h3>
              
              <div className="space-y-4">
                {/* Category */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Category</p>
                  <p className="text-sm text-gray-900 capitalize">
                    {document.category || 'Other'}
                  </p>
                </div>

                {/* Tags */}
                {document.tags && document.tags.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">
                      <Tag className="w-3 h-3 inline mr-1" />
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {document.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Uploaded By */}
                {document.uploadedBy && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      <User className="w-3 h-3 inline mr-1" />
                      Uploaded By
                    </p>
                    <p className="text-sm text-gray-900">
                      {document.uploadedBy.firstName} {document.uploadedBy.lastName}
                    </p>
                  </div>
                )}

                {/* Expiry Date */}
                {document.expiresOn && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Expires On
                    </p>
                    <p className="text-sm text-gray-900">{formatDate(document.expiresOn)}</p>
                  </div>
                )}

                {/* Permissions */}
                {document.accessControl && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">
                      <Shield className="w-3 h-3 inline mr-1" />
                      Access
                    </p>
                    <div className="text-sm text-gray-900">
                      {document.accessControl.visibility === 'all' && 'Visible to all users'}
                      {document.accessControl.visibility === 'admin' && 'Admin only'}
                      {document.accessControl.visibility === 'employee' && 'Employees (owner or uploader)'}
                      {document.accessControl.visibility === 'custom' && (
                        <>
                          Custom — allowed users: {document.accessControl.allowedUserIds?.length || 0}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Download Count */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    <Eye className="w-3 h-3 inline mr-1" />
                    Downloads
                  </p>
                  <p className="text-sm text-gray-900">{document.downloadCount || 0} times</p>
                </div>

                {/* Last Accessed */}
                {document.lastAccessedAt && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Last Accessed
                    </p>
                    <p className="text-sm text-gray-900">{formatDate(document.lastAccessedAt)}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-2">
                <button
                  onClick={() => onDownload(document)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DocumentViewer;
