import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Share2, 
  Archive,
  Calendar,
  User,
  FileText,
  Clock,
  Shield,
  Folder,
  ChevronLeft,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import '../../utils/axiosConfig';
import { buildApiUrl } from '../../utils/apiConfig';
import DocumentUpload from './DocumentUpload';

const DocumentPanel = ({ folder, onClose, onDocumentUploaded }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [showDocumentMenu, setShowDocumentMenu] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  // Fetch documents for the folder
  useEffect(() => {
    if (folder) {
      fetchDocuments();
    }
  }, [folder]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/documentManagement/folders/${folder._id}`);
      // documents may include legacy fileName or new name field
      const docs = (response.data.documents || []).map(d => ({ ...d, name: d.name || d.fileName }));
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUploaded = (document) => {
    setShowUploadZone(false);
    fetchDocuments();
    onDocumentUploaded && onDocumentUploaded(document);
  };

  const handleDownload = async (doc) => {
    try {
      const response = await axios.get(
        `/api/documentManagement/documents/${doc._id}/download`,
        { responseType: 'blob' }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.name || doc.fileName);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowDocumentMenu(null);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const handleArchive = async (doc) => {
    if (!window.confirm(`Are you sure you want to archive "${doc.name || doc.fileName}"?`)) {
      return;
    }

    try {
      await axios.post(`/api/documentManagement/documents/${doc._id}/archive`);
      fetchDocuments();
      setShowDocumentMenu(null);
    } catch (error) {
      console.error('Error archiving document:', error);
      alert('Failed to archive document');
    }
  };

  const handleView = (doc) => {
    const token = localStorage.getItem('auth_token');
    const viewUrl = buildApiUrl(`/documentManagement/documents/${doc._id}/view`) + (token ? `?token=${encodeURIComponent(token)}` : '');
    window.open(viewUrl, '_blank');
    setShowDocumentMenu(null);
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.name || doc.fileName}"?`)) {
      return;
    }

    try {
      await axios.delete(`/api/documentManagement/documents/${doc._id}`);
      fetchDocuments();
      setShowDocumentMenu(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getPermissionBadge = (accessControl) => {
    if (!accessControl) return null;
    const v = accessControl.visibility;
    let label = '';
    if (v === 'all') label = 'All users';
    if (v === 'admin') label = 'Admin only';
    if (v === 'employee') label = 'Employees';
    if (v === 'custom') label = `Custom (${accessControl.allowedUserIds?.length || 0})`;
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
        {label}
      </span>
    );
  };

  // Filter documents based on search and archived status
    const filteredDocuments = documents.filter(doc => {
    const filename = (doc.name || doc.fileName || '').toLowerCase();
    const matchesSearch = filename.includes(searchQuery.toLowerCase()) ||
      (doc.category && doc.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesArchived = showArchived ? doc.isArchived : !doc.isArchived;
    return matchesSearch && matchesArchived;
  });

  // Animation variants
  const panelVariants = {
    hidden: { x: '100%', opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { 
        type: 'spring', 
        stiffness: 300, 
        damping: 30,
        duration: 0.3
      }
    },
    exit: { 
      x: '100%', 
      opacity: 0,
      transition: { 
        duration: 0.25,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <AnimatePresence>
      {folder && (
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center space-x-2">
                  <Folder className="w-5 h-5" />
                  <h2 className="text-lg font-semibold">{folder.name}</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-200 w-4 h-4" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-blue-800 bg-opacity-50 border border-blue-600 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Upload Button & Filter */}
          <div className="p-4 border-b border-gray-200 space-y-2">
            <button
              onClick={() => setShowUploadZone(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Documents</span>
            </button>
            
            {/* Archived Toggle */}
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                showArchived 
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>{showArchived ? 'Hide Archived' : 'Show Archived'}</span>
            </button>
          </div>

          {/* Documents List */}
          <div className="flex-1 overflow-y-auto p-4" style={{ height: 'calc(100vh - 280px)' }}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-gray-100 rounded-full">
                    <FileText className="w-12 h-12 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents</h3>
                <p className="text-gray-500">Upload documents to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocuments.map((document) => (
                  <motion.div
                    key={document._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <h4 className="font-medium text-gray-900 text-sm truncate">
                            {document.name || document.fileName}
                          </h4>
                        </div>
                        
                        {/* Metadata */}
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{document.uploadedBy?.firstName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(document.createdAt)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <FileText className="w-3 h-3" />
                            <span>{formatFileSize(document.fileSize)}</span>
                          </div>
                          {document.version > 1 && (
                            <div className="flex items-center space-x-1">
                              <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">
                                v{document.version}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Category and Permissions */}
                        <div className="flex flex-wrap items-center gap-2">
                          {document.category && (
                            <span className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded-full">
                              {document.category}
                            </span>
                          )}
                          {getPermissionBadge(document.accessControl)}
                          {document.expiresOn && (
                            <div className="flex items-center space-x-1 text-xs text-orange-600">
                              <Clock className="w-3 h-3" />
                              <span>Expires: {formatDate(document.expiresOn)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="relative">
                        <button
                          onClick={() => setShowDocumentMenu(showDocumentMenu === document._id ? null : document._id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                          {showDocumentMenu === document._id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                            >
                              <button
                                onClick={() => handleView(document)}
                                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                <span>View</span>
                              </button>
                              <button
                                onClick={() => handleDownload(document)}
                                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                              </button>
                              <button
                                onClick={() => handleArchive(document)}
                                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Archive className="w-4 h-4" />
                                <span>Archive</span>
                              </button>
                              <button
                                onClick={() => handleDelete(document)}
                                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Zone */}
          {showUploadZone && (
            <DocumentUpload
              onClose={() => setShowUploadZone(false)}
              onUpload={handleDocumentUploaded}
              folders={[folder]}
              defaultFolder={folder}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DocumentPanel;
