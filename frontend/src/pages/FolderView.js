import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Folder,
  FileText,
  Download,
  Upload,
  Eye,
  MoreVertical,
  Pencil,
  Image,
  File,
  FileArchive,
  Home,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import UploadComponent from '../components/DocumentManagement/UploadComponent';
import DocumentViewer from '../components/DocumentManagement/DocumentViewer';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '../components/ui/breadcrumb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { useAlert } from '../components/AlertNotification';
import { buildApiUrl } from '../utils/apiConfig';

const FolderView = ({ isManagerContext = false }) => {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useAlert();
  const [folder, setFolder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState('10');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showItemMenu, setShowItemMenu] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [folderPermissions, setFolderPermissions] = useState({ canView: true, canEdit: true, canDelete: true });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [docToRename, setDocToRename] = useState(null);
  const [renameDocValue, setRenameDocValue] = useState('');

  // Fetch folder contents
  useEffect(() => {
    if (!folderId) {
      console.error('❌ FolderView: No folderId provided in URL params');
      showError('Cannot load folder: Invalid folder ID');
      const targetPath = isManagerContext ? '/manager/documents' : '/documents';
      navigate(targetPath);
      return;
    }
    
    if (folderId === 'undefined' || folderId === 'null') {
      console.error('❌ FolderView: Received invalid folderId:', folderId);
      showError('Cannot load folder: Invalid folder ID');
      const targetPath = isManagerContext ? '/manager/documents' : '/documents';
      navigate(targetPath);
      return;
    }
    
    fetchFolderContents();
  }, [folderId]);

  const fetchFolderContents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        console.error('❌ No auth token found');
        navigate('/login');
        return;
      }
      
      console.log('📂 FolderView: Fetching folder contents for:', folderId);
      
      const response = await axios.get(buildApiUrl(`/documentManagement/folders/${folderId}`), {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      console.log('✅ Folder contents fetched:', response.data);
      setFolder(response.data.folder);
      setBreadcrumb(Array.isArray(response.data.breadcrumb) ? response.data.breadcrumb : []);
      setItems(response.data.contents || []);
      setFolderPermissions(response.data.folderPermissions || { canView: true, canEdit: true, canDelete: true });
    } catch (error) {
      console.error('❌ Error fetching folder contents:', error);
      showError('Failed to load folder contents');
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('Authentication failed, redirecting to login');
        // The axios interceptor will handle redirect
      } else if (error.response?.status === 404) {
        showError('Folder not found');
        const targetPath = isManagerContext ? '/manager/documents' : '/documents';
        navigate(targetPath);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRenameDocument = async (doc) => {
    setShowItemMenu(null);
    setDocToRename(doc);
    setRenameDocValue(doc?.name || doc?.fileName || '');
    setRenameDialogOpen(true);
  };

  const handleItemClick = (item) => {
    if (item.type === 'folder') {
      const targetPath = isManagerContext ? `/manager/documents/${item._id}` : `/documents/${item._id}`;
      navigate(targetPath);
    } else {
      // Show document viewer instead of auto-download
      setSelectedDocument(item);
      setShowDocumentViewer(true);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await axios.get(
        buildApiUrl(`/documentManagement/documents/${doc._id}/download`),
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` })
          },
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data], { type: doc.mimeType || 'application/octet-stream' }));
      const link = window.document.createElement('a');
      link.href = url;
      const originalName = doc.name || doc.fileName || 'document';
      const isPdf = doc.mimeType === 'application/pdf';
      const downloadName = isPdf
        ? (originalName.toLowerCase().endsWith('.pdf')
          ? originalName
          : `${originalName.replace(/\.[^/.]+$/, '')}.pdf`)
        : originalName;
      link.setAttribute('download', downloadName);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handleDelete = async (item) => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (item.type === 'folder') {
        await axios.delete(buildApiUrl(`/documentManagement/folders/${item._id}`), {
          headers: { ...(token && { Authorization: `Bearer ${token}` }) }
        });
      } else {
        await axios.delete(buildApiUrl(`/documentManagement/documents/${item._id}`), {
          headers: { ...(token && { Authorization: `Bearer ${token}` }) }
        });
      }
      
      setShowItemMenu(null);
      showSuccess(item.type === 'folder' ? 'Folder deleted successfully' : 'Document deleted successfully');
      fetchFolderContents();
    } catch (error) {
      console.error('Error deleting item:', error);
      showError('Failed to delete item');
    }
  };

  const openDeleteDialog = (item) => {
    setShowItemMenu(null);
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    await handleDelete(itemToDelete);
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const submitRenameDocument = async () => {
    if (!docToRename?._id) return;
    const nextName = String(renameDocValue || '').trim();
    if (!nextName) return;

    try {
      const token = localStorage.getItem('auth_token');
      await axios.put(
        buildApiUrl(`/documentManagement/documents/${docToRename._id}`),
        { name: nextName },
        {
          headers: { ...(token && { Authorization: `Bearer ${token}` }) }
        }
      );
      setRenameDialogOpen(false);
      setDocToRename(null);
      showSuccess('Document renamed successfully');
      fetchFolderContents();
    } catch (error) {
      console.error('Error renaming document:', error);
      showError('Failed to rename document');
    }
  };

  const handleView = (item) => {
    setShowItemMenu(null);
    if (item.type === 'document') {
      setSelectedDocument(item);
      setShowDocumentViewer(true);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Filter items based on search
    // This is already handled by the filteredItems below
  };

  const formatDate = (dateString) => {
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

  const getFileIcon = (fileName) => {
    const safeName = String(fileName || '');
    const extension = safeName.includes('.') ? safeName.split('.').pop().toLowerCase() : '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(extension)) {
      return Image;
    } else if (['pdf'].includes(extension)) {
      return FileText;
    } else if (['zip', 'rar', '7z'].includes(extension)) {
      return FileArchive;
    } else {
      return File;
    }
  };

  const handleDocumentUploaded = () => {
    setShowUploadModal(false);
    fetchFolderContents();
  };

  // Filter items based on search
  const filteredItems = items.filter((item) => {
    const query = String(searchQuery || '').toLowerCase();
    const name = String(item?.name || item?.fileName || '').toLowerCase();
    return name.includes(query);
  });

  const isEmpty = filteredItems.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/dashboard');
                    }}
                    className="flex items-center gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      const targetPath = isManagerContext ? '/manager/documents' : '/documents';
                      navigate(targetPath);
                    }}
                  >
                    Documents
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumb && breadcrumb.length > 0 && (
                  breadcrumb.map((crumb, idx) => {
                    const isLast = idx === breadcrumb.length - 1;
                    return (
                      <React.Fragment key={crumb._id}>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          {isLast ? (
                            <BreadcrumbPage>{crumb.name || 'Folder'}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                const targetPath = isManagerContext ? `/manager/documents/${crumb._id}` : `/documents/${crumb._id}`;
                                navigate(targetPath);
                              }}
                            >
                              {crumb.name || 'Folder'}
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    );
                  })
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search all folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
              />
            </div>

            {/* View Dropdown */}
            <div className="w-44">
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="focus:ring-green-500">
                  <SelectValue placeholder="View 10 per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">View 10 per page</SelectItem>
                  <SelectItem value="25">View 25 per page</SelectItem>
                  <SelectItem value="50">View 50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(folderPermissions?.canEdit ?? true) && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload file
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Folder Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : isEmpty ? (
          /* Empty State */
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="p-6 bg-gray-100 rounded-full">
                  <Folder className="w-16 h-16 text-gray-400" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">No documents yet</h2>
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">{folder?.name || 'Folder'}</h1>
              </div>
            </div>
          </div>
        ) : (
          /* Folders Table */
          <div className="bg-white rounded-lg border border-gray-200 overflow-visible">
            {/* Table Header */}
            <div className="border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 text-sm font-medium text-gray-700">
                <div className="col-span-5">Name</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Size</div>
                <div className="col-span-3">Date created</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {filteredItems.map((item, index) => {
                const Icon = item.type === 'folder' ? Folder : getFileIcon(item.name || item.fileName);
                
                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleItemClick(item)}
                  >
                    {/* Name */}
                    <div className="col-span-5 flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <Icon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 hover:text-green-600 transition-colors">
                          {item.name || item.fileName}
                        </div>
                        {item.description && (
                          <div className="text-sm text-gray-500">{item.description}</div>
                        )}
                      </div>
                    </div>

                    {/* Type */}
                    <div className="col-span-2 flex items-center">
                      <span className="text-sm text-gray-600">
                        {item.type === 'folder' ? 'Folder' : (item.fileType || 'File')}
                      </span>
                    </div>

                    {/* Size */}
                    <div className="col-span-2 flex items-center">
                      <span className="text-sm text-gray-600">
                        {item.type === 'folder' 
                          ? `${item.itemCount || 0} items`
                          : formatFileSize(item.fileSize || 0)
                        }
                      </span>
                    </div>

                    {/* Date Created */}
                    <div className="col-span-3 flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {formatDate(item.createdAt)}
                      </span>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowItemMenu(showItemMenu === item._id ? null : item._id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                          {showItemMenu === item._id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.type === 'document' && (
                                <button
                                  onClick={() => handleView(item)}
                                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>View</span>
                                </button>
                              )}
                              {item.type === 'document' && (
                                <button
                                  onClick={() => handleDownload(item)}
                                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>Download</span>
                                </button>
                              )}
                              {item.type === 'document' && (folderPermissions?.canEdit ?? true) && (
                                <button
                                  onClick={() => handleRenameDocument(item)}
                                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                  <span>Rename</span>
                                </button>
                              )}
                              {(folderPermissions?.canDelete ?? true) && (
                                <button
                                  onClick={() => openDeleteDialog(item)}
                                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadComponent
            onClose={() => setShowUploadModal(false)}
            onUpload={handleDocumentUploaded}
            folderId={folderId}
          />
        )}
      </AnimatePresence>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {showDocumentViewer && selectedDocument && (
          <DocumentViewer
            document={selectedDocument}
            onClose={() => setShowDocumentViewer(false)}
            onDownload={handleDownload}
          />
        )}
      </AnimatePresence>

      {/* Rename Document Dialog */}
      <AlertDialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit document name</AlertDialogTitle>
            <AlertDialogDescription>
              Update the document name below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <input
              value={renameDocValue}
              onChange={(e) => setRenameDocValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Document name"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDocToRename(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={submitRenameDocument}
              className="bg-green-600 hover:bg-green-700 focus-visible:ring-green-600"
              disabled={!String(renameDocValue || '').trim()}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {itemToDelete?.type === 'folder' ? 'folder' : 'document'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'folder'
                ? 'This will permanently delete the folder and all files/subfolders inside it.'
                : 'This will permanently delete the document.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setItemToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FolderView;
