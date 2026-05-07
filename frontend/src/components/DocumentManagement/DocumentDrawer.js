import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Folder, 
  FileText, 
  Plus, 
  Upload,
  Search,
  Filter,
  ChevronRight,
  Clock,
  User,
  Calendar,
  Shield,
  Archive,
  Download,
  Eye,
  Share2,
  ChevronLeft
} from 'lucide-react';
import FolderCard from './FolderCard';
import DocumentPanel from './DocumentPanel';
import CreateFolderModal from './CreateFolderModal';
import DocumentUpload from './DocumentUpload';
import DocumentPageView from './DocumentPageView';
import { buildApiUrl } from '../../utils/apiConfig';

const DocumentDrawer = ({ isOpen, onClose }) => {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showDocumentPanel, setShowDocumentPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [isDrawerShortened, setIsDrawerShortened] = useState(false);
  const [showFullPageView, setShowFullPageView] = useState(false);

  // Fetch folders from API
  useEffect(() => {
    if (isOpen) {
      fetchFolders();
      // Auto-show full page view when drawer opens
      setIsDrawerShortened(true);
      setShowFullPageView(true);
    }
  }, [isOpen]);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      console.log('Fetching folders - Token available:', !!token);
      
      const response = await fetch(buildApiUrl('/documentManagement/folders') + `?t=${Date.now()}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setFolders(Array.isArray(data) ? data : (data.folders || []));
    } catch (error) {
      console.error('Error fetching folders:', error);
      if (error.message.includes('401') || error.message.includes('403')) {
        console.error('Authentication failed - token may be expired');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (folderData) => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Token available:', !!token);
      console.log('Folder data:', folderData);
      
      const response = await fetch(buildApiUrl('/documentManagement/folders'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(folderData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const createdFolder = data && data.folder ? data.folder : data;
      setFolders((prev) => [...(Array.isArray(prev) ? prev : []), createdFolder]);
      setShowFolderModal(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      if (error.message.includes('401') || error.message.includes('403')) {
        console.error('Authentication failed - token may be expired');
      }
    }
  };

  const handleFolderClick = (folder) => {
    setSelectedFolder(folder);
    setIsDrawerShortened(true);
    setShowFullPageView(true);
  };

  const handleBackToFolders = () => {
    setIsDrawerShortened(false);
    setShowFullPageView(false);
    setSelectedFolder(null);
  };

  const handleUploadDocument = () => {
    if (folders.length === 0) {
      setShowFolderModal(true);
    } else {
      setShowUploadZone(true);
    }
  };

  const handleDocumentUploaded = (document) => {
    setShowUploadZone(false);
    fetchFolders(); // Refresh folders to update document counts
  };

  // Filter folders based on search
  const filteredFolders = folders.filter(folder =>
    folder.name && folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Animation variants
  const drawerVariants = {
    hidden: { x: '-100%', opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      width: isDrawerShortened ? '80px' : '384px',
      transition: { 
        type: 'spring', 
        stiffness: 300, 
        damping: 30,
        duration: 0.3
      }
    },
    exit: { 
      x: '-100%', 
      opacity: 0,
      transition: { 
        duration: 0.25,
        ease: 'easeInOut'
      }
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-0 top-0 h-full bg-white shadow-2xl z-50"
            style={{ width: isDrawerShortened ? '80px' : '384px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {isDrawerShortened ? (
              <div className="p-4">
                <button
                  onClick={handleBackToFolders}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div className="mt-4 text-center">
                  <Folder className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 truncate">{selectedFolder?.name}</p>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Folder className="w-6 h-6" />
                    <h2 className="text-xl font-semibold">Documents</h2>
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
                    placeholder="Search folders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-blue-800 bg-opacity-50 border border-blue-600 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            )}

            {/* Content */}
            {!isDrawerShortened && (
              <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 280px)' }}>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : folders.length === 0 ? (
                  /* Empty State */
                  <div className="text-center py-12">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <FileText className="w-12 h-12 text-gray-400" />
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                    <p className="text-gray-500 mb-6">Get started by uploading your first document</p>
                    <button
                      onClick={handleUploadDocument}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </button>
                  </div>
                ) : (
                  /* Table View */
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input type="checkbox" className="rounded border-gray-300" />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Size
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date created
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredFolders.map((folder) => (
                          <tr key={folder._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleFolderClick(folder)}>
                            <td className="px-4 py-3">
                              <input type="checkbox" className="rounded border-gray-300" onClick={(e) => e.stopPropagation()} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <Folder className="w-5 h-5 text-blue-500 mr-3" />
                                <span className="text-sm font-medium text-gray-900">{folder.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-500">Folder</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-500">-</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-500">
                                {new Date(folder.createdAt).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button className="text-gray-400 hover:text-gray-600" onClick={(e) => e.stopPropagation()}>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Full Page View */}
          <AnimatePresence>
            {showFullPageView && (
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ 
                  x: 0, 
                  opacity: 1,
                  transition: { 
                    type: 'spring', 
                    stiffness: 300, 
                    damping: 30,
                    duration: 0.3
                  }
                }}
                exit={{ 
                  x: '100%', 
                  opacity: 0,
                  transition: { 
                    duration: 0.25,
                    ease: 'easeInOut'
                  }
                }}
                className="fixed left-20 top-0 h-full right-0 bg-white z-40"
                style={{ left: isDrawerShortened ? '80px' : '384px' }}
              >
                <DocumentPageView
                  selectedFolder={selectedFolder}
                  onClose={onClose}
                  onBack={handleBackToFolders}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Folder Modal */}
          {showFolderModal && (
            <CreateFolderModal
              onClose={() => setShowFolderModal(false)}
              onCreate={handleCreateFolder}
              parentFolderId={null}
            />
          )}

          {/* Upload Zone */}
          {showUploadZone && (
            <DocumentUpload
              onClose={() => setShowUploadZone(false)}
              onUpload={handleDocumentUploaded}
              folders={folders}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default DocumentDrawer;
