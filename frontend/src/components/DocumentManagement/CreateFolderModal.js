import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, Shield, Users, Eye, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';
import '../../utils/axiosConfig';
import MultiSelectDropdown from '../MultiSelectDropdown';
import { buildApiUrl } from '../../utils/apiConfig';
import { useScopedFolderEmployees } from './useScopedFolderEmployees';

const CreateFolderModal = ({ onClose, onCreate, onUpdate, parentFolderId, folder = null }) => {
  const isEditMode = Boolean(folder?._id);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    viewEmployeeIds: [],
    editEmployeeIds: [],
    deleteEmployeeIds: [],
    viewUserIds: [],
    editUserIds: [],
    deleteUserIds: []
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { employees, employeesLoading } = useScopedFolderEmployees();

  const permissionTypes = [
    { key: 'view', label: 'View Access', icon: Eye, color: 'green' },
    { key: 'edit', label: 'Edit Access', icon: Edit, color: 'blue' },
    { key: 'delete', label: 'Delete Access', icon: Trash2, color: 'red' }
  ];

  useEffect(() => {
    const sourceFolder = folder || null;
    const ownerEmployeeId = sourceFolder?.createdByEmployeeId || sourceFolder?.ownerInfo?._id || sourceFolder?.ownerInfo?.id || null;
    const permissions = sourceFolder?.permissions || {};

    if (isEditMode) {
      setFormData({
        name: sourceFolder?.name || '',
        description: sourceFolder?.description || '',
        viewEmployeeIds: Array.isArray(permissions.viewEmployeeIds) ? permissions.viewEmployeeIds.map(String) : [],
        editEmployeeIds: Array.isArray(permissions.editEmployeeIds) ? permissions.editEmployeeIds.map(String) : [],
        deleteEmployeeIds: Array.isArray(permissions.deleteEmployeeIds) ? permissions.deleteEmployeeIds.map(String) : [],
        viewUserIds: Array.isArray(permissions.viewUserIds) ? permissions.viewUserIds.map(String) : [],
        editUserIds: Array.isArray(permissions.editUserIds) ? permissions.editUserIds.map(String) : [],
        deleteUserIds: Array.isArray(permissions.deleteUserIds) ? permissions.deleteUserIds.map(String) : []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        viewEmployeeIds: [],
        editEmployeeIds: [],
        deleteEmployeeIds: [],
        viewUserIds: [],
        editUserIds: [],
        deleteUserIds: []
      });
    }

    if (sourceFolder?.name === 'My Documents' && ownerEmployeeId) {
      const ownerId = String(ownerEmployeeId);
      setFormData((prev) => {
        const view = new Set((prev.viewEmployeeIds || []).map(String));
        const edit = new Set((prev.editEmployeeIds || []).map(String));
        const del = new Set((prev.deleteEmployeeIds || []).map(String));
        view.add(ownerId);
        edit.add(ownerId);
        del.add(ownerId);
        return {
          ...prev,
          viewEmployeeIds: Array.from(view),
          editEmployeeIds: Array.from(edit),
          deleteEmployeeIds: Array.from(del)
        };
      });
    }
  }, [folder, isEditMode]);

  const ownerEmployeeId = useMemo(() => {
    const sourceFolder = folder || null;
    return sourceFolder?.createdByEmployeeId || sourceFolder?.ownerInfo?._id || sourceFolder?.ownerInfo?.id || null;
  }, [folder]);

  const lockOwnerAccess = Boolean(isEditMode && folder?.name === 'My Documents' && ownerEmployeeId);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const applyHierarchy = (next) => {
    const viewSet = new Set((next.viewEmployeeIds || []).map(String));
    const editSet = new Set((next.editEmployeeIds || []).map(String));
    const deleteSet = new Set((next.deleteEmployeeIds || []).map(String));

    for (const id of deleteSet) {
      editSet.add(id);
      viewSet.add(id);
    }
    for (const id of editSet) {
      viewSet.add(id);
    }

    if (lockOwnerAccess) {
      const ownerId = String(ownerEmployeeId);
      viewSet.add(ownerId);
      editSet.add(ownerId);
      deleteSet.add(ownerId);
    }

    for (const id of Array.from(editSet)) {
      if (!viewSet.has(id)) editSet.delete(id);
    }
    for (const id of Array.from(deleteSet)) {
      if (!editSet.has(id)) deleteSet.delete(id);
      if (!viewSet.has(id)) deleteSet.delete(id);
    }

    return {
      ...next,
      viewEmployeeIds: Array.from(viewSet),
      editEmployeeIds: Array.from(editSet),
      deleteEmployeeIds: Array.from(deleteSet)
    };
  };

  const handleViewChange = (selected) => {
    setFormData((prev) => {
      const viewSet = new Set((selected || []).map(String));
      const nextEdit = (prev.editEmployeeIds || []).map(String).filter((id) => viewSet.has(id));
      const nextDelete = (prev.deleteEmployeeIds || []).map(String).filter((id) => viewSet.has(id));
      return applyHierarchy({
        ...prev,
        viewEmployeeIds: Array.from(viewSet),
        editEmployeeIds: nextEdit,
        deleteEmployeeIds: nextDelete,
        viewUserIds: prev.viewUserIds || [],
        editUserIds: prev.editUserIds || [],
        deleteUserIds: prev.deleteUserIds || []
      });
    });
  };

  const handleEditChange = (selected) => {
    setFormData((prev) => {
      const editSet = new Set((selected || []).map(String));
      const viewSet = new Set((prev.viewEmployeeIds || []).map(String));
      for (const id of editSet) viewSet.add(id);
      const nextDelete = (prev.deleteEmployeeIds || []).map(String).filter((id) => editSet.has(id));
      return applyHierarchy({
        ...prev,
        viewEmployeeIds: Array.from(viewSet),
        editEmployeeIds: Array.from(editSet),
        deleteEmployeeIds: nextDelete,
        viewUserIds: prev.viewUserIds || [],
        editUserIds: prev.editUserIds || [],
        deleteUserIds: prev.deleteUserIds || []
      });
    });
  };

  const handleDeleteChange = (selected) => {
    setFormData((prev) => {
      const deleteSet = new Set((selected || []).map(String));
      const editSet = new Set((prev.editEmployeeIds || []).map(String));
      const viewSet = new Set((prev.viewEmployeeIds || []).map(String));

      for (const id of deleteSet) {
        editSet.add(id);
        viewSet.add(id);
      }

      return applyHierarchy({
        ...prev,
        viewEmployeeIds: Array.from(viewSet),
        editEmployeeIds: Array.from(editSet),
        deleteEmployeeIds: Array.from(deleteSet),
        viewUserIds: prev.viewUserIds || [],
        editUserIds: prev.editUserIds || [],
        deleteUserIds: prev.deleteUserIds || []
      });
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Folder name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Folder name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Folder name cannot exceed 100 characters';
    }
    
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        parentFolderId: parentFolderId || null,
        viewEmployeeIds: formData.viewEmployeeIds,
        editEmployeeIds: formData.editEmployeeIds,
        deleteEmployeeIds: formData.deleteEmployeeIds,
        viewUserIds: formData.viewUserIds,
        editUserIds: formData.editUserIds,
        deleteUserIds: formData.deleteUserIds
      };

      if (isEditMode) {
        if (!onUpdate) {
          throw new Error('Missing update handler');
        }
        await onUpdate(folder._id, payload);
      } else {
        const response = await axios.post(
          buildApiUrl('/documentManagement/folders'),
          payload,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        onCreate(response.data);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      setErrors({ submit: 'Failed to create folder. Please try again.' });
    } finally {
      setLoading(false);
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

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Folder className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditMode ? 'Edit Folder ACL' : 'Create New Folder'}
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 88px)' }}>
            {/* Folder Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Employee Documents, Contracts, etc."
                autoFocus
                disabled={loading}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 resize-none ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Optional description of this folder..."
                disabled={loading}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            {lockOwnerAccess && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                My Documents folders must keep the owner in all ACL groups.
              </div>
            )}

            {/* Permissions */}
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-700">Folder Permissions</h3>
              </div>

              <div className="mb-3 text-xs text-gray-500">Only selected employees can access this folder.</div>
              
              <div className="space-y-4">
                {permissionTypes.map(({ key, label, icon: Icon, color }) => {
                  const selectedValues =
                    key === 'view'
                      ? formData.viewEmployeeIds
                      : key === 'edit'
                        ? formData.editEmployeeIds
                        : formData.deleteEmployeeIds;

                  const onChange =
                    key === 'view'
                      ? handleViewChange
                      : key === 'edit'
                        ? handleEditChange
                        : handleDeleteChange;

                  return (
                    <div key={key} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <Icon className={`w-4 h-4 text-${color}-600`} />
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                      </div>
                      <MultiSelectDropdown
                        options={(employees || []).map((emp) => ({
                          value: emp.id || emp._id,
                          label: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || 'Employee',
                          subLabel: emp.email || ''
                        }))}
                        selectedValues={selectedValues}
                        onChange={onChange}
                        placeholder={employeesLoading ? 'Loading employees...' : 'Select employees...'}
                        className={employeesLoading ? 'opacity-60 pointer-events-none' : ''}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create')}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateFolderModal;
