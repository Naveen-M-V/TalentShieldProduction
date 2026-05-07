import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  Upload, 
  Plus, 
  FileText, 
  Folder,
  ChevronUp,
  ChevronDown,
  Filter,
  Grid3X3,
  List
} from 'lucide-react';
import DocumentUpload from './DocumentUpload';
import CreateFolderModal from './CreateFolderModal';
import { buildApiUrl } from '../../utils/apiConfig';

const DocumentPageView = ({ selectedFolder, onClose, onBack }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedItems, setSelectedItems] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(buildApiUrl('/documentManagement/folders'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFolders(Array.isArray(data) ? data : (data.folders || []));
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (checked) => {
    if (checked && folders) {
      setSelectedItems(folders.map(folder => folder._id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    }
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
  };

  const handleNewFolderClick = () => {
    setShowFolderModal(true);
  };

  const handleDocumentUploaded = (documents) => {
    setShowUploadModal(false);
    fetchFolders(); // Refresh folders to update document counts
  };

  const handleFolderCreated = async (folderData) => {
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch(buildApiUrl('/documentManagement/folders'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(folderData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setShowFolderModal(false);
      await fetchFolders();
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const q = (searchQuery || '').toLowerCase();
  const filteredFolders = (folders || []).filter((folder) => {
    const name = (folder?.name || '').toLowerCase();
    if (!q) return true;
    return name.includes(q);
  });

  const sortedFolders = [...filteredFolders].sort((a, b) => {
    const aValue = a[sortBy] || '';
    const bValue = b[sortBy] || '';
    const modifier = sortOrder === 'asc' ? 1 : -1;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue) * modifier;
    }
    return (aValue - bValue) * modifier;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronUp className="w-5 h-5 rotate-270" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleUploadClick}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>
            <button 
              onClick={handleNewFolderClick}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New folder</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-8 mb-6">
          <button className="text-blue-600 font-medium border-b-2 border-blue-600 pb-2">
            All folders
          </button>
          <button className="text-gray-500 font-medium hover:text-gray-700 pb-2">
            My documents
          </button>
        </div>

        {/* Search and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search My documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                Search
              </button>
            </div>
            
            <button className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">View</span>
              <select className="border border-gray-300 rounded px-3 py-1 text-sm">
                <option>10 per page</option>
                <option>25 per page</option>
                <option>50 per page</option>
              </select>
            </div>
            
            <div className="flex items-center border border-gray-300 rounded">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={folders && selectedItems.length === folders.length && folders.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('name')}>
                <div className="flex items-center space-x-1">
                  <span>Name</span>
                  {sortBy === 'name' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('mimeType')}>
                <div className="flex items-center space-x-1">
                  <span>Type</span>
                  {sortBy === 'mimeType' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('fileSize')}>
                <div className="flex items-center space-x-1">
                  <span>Size</span>
                  {sortBy === 'fileSize' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('createdAt')}>
                <div className="flex items-center space-x-1">
                  <span>Date created</span>
                  {sortBy === 'createdAt' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedFolders.map((folder) => (
              <tr key={folder._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={selectedItems.includes(folder._id)}
                    onChange={(e) => handleSelectItem(folder._id, e.target.checked)}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <Folder className="w-5 h-5 text-blue-500 mr-3" />
                    <span className="text-sm font-medium text-gray-900">{folder.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">Folder</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">-</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">{formatDate(folder.createdAt)}</span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {(!sortedFolders || sortedFolders.length === 0) && (
          <div className="text-center py-12">
            <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No folders found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <DocumentUpload
          onClose={() => setShowUploadModal(false)}
          onUpload={handleDocumentUploaded}
          folders={folders}
          defaultFolder={selectedFolder}
        />
      )}

      {/* Folder Modal */}
      {showFolderModal && (
        <CreateFolderModal
          onClose={() => setShowFolderModal(false)}
          onCreate={handleFolderCreated}
          isFirstFolder={!folders || folders.length === 0}
          parentFolderId={selectedFolder?._id || null}
        />
      )}
    </>
  );
};

export default DocumentPageView;
