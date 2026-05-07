const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const Folder = require('../models/Folder');
const DocumentManagement = require('../models/DocumentManagement');
const EmployeeHub = require('../models/EmployeesHub');
const hierarchyHelper = require('../utils/hierarchyHelper');
const { ADMIN_ROLES, MANAGER_ROLES } = require('../utils/roles');
const { resolveActorId } = require('../utils/identityHelper');
const { ensureMyDocumentsFolder } = require('../utils/documentFolderHelpers');

const resolveEmployeeIdForUser = async (req) => {
  try {
    if (!req) return null;

    if (req.employeeHubId && mongoose.Types.ObjectId.isValid(String(req.employeeHubId))) {
      return req.employeeHubId;
    }

    const authId = resolveActorId(req);
    const authIdStr = authId ? String(authId).trim() : '';
    let employee = null;

    if (authIdStr && mongoose.Types.ObjectId.isValid(authIdStr)) {
      employee = await EmployeeHub.findOne({ userId: authIdStr }).select('_id');
      if (!employee) {
        employee = await EmployeeHub.findById(authIdStr).select('_id');
      }
    }

    if (!employee && req.user?.email) {
      employee = await EmployeeHub.findOne({ email: String(req.user.email).toLowerCase() }).select('_id');
    }

    if (employee?._id) {
      req.employeeHubId = employee._id;
      if (req.user) {
        req.user.employeeId = employee._id;
      }
      return employee._id;
    }

    return null;
  } catch (err) {
    console.error('⚠️ Error in resolveEmployeeIdForUser:', err.message);
    return null;
  }
};

const resolveEmployeeIdForRequest = async (req) => {
  if (!req.user) return null;
  return resolveEmployeeIdForUser(req);
};

const normalizeIdArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => v && v.toString()).filter(Boolean);
  if (typeof value === 'string') return [value].map(v => v && v.toString()).filter(Boolean);
  return [];
};

const resolveActorEmployeeForFolderScope = async (req) => {
  const actorId = resolveActorId(req);

  if (actorId && mongoose.Types.ObjectId.isValid(String(actorId))) {
    const byId = await EmployeeHub.findById(actorId).select('_id role email managerId');
    if (byId) return byId;

    const byUserId = await EmployeeHub.findOne({ userId: actorId }).select('_id role email managerId');
    if (byUserId) return byUserId;
  }

  if (req.user?.email) {
    return EmployeeHub.findOne({ email: String(req.user.email).trim().toLowerCase() })
      .select('_id role email managerId');
  }

  return null;
};

const getManagerScopedEmployeeIds = async (req) => {
  const role = String(req.user?.role || '').trim().toLowerCase();

  if (ADMIN_ROLES.includes(role)) {
    return null;
  }

  if (!MANAGER_ROLES.includes(role)) {
    return [];
  }

  const manager = await resolveActorEmployeeForFolderScope(req);
  if (!manager?._id) {
    return [];
  }

  const includeIndirect = role === 'senior-manager';
  const subordinates = await hierarchyHelper.getSubordinates(manager._id, includeIndirect);
  return subordinates.map((member) => String(member._id));
};

const getMyDocumentsOwnerId = (folder) => {
  if (!folder) return null;

  if (folder.createdByEmployeeId) {
    return String(folder.createdByEmployeeId);
  }

  const viewEmployeeIds = normalizeIdArray(folder.permissions?.viewEmployeeIds);
  if (viewEmployeeIds.length > 0) {
    return String(viewEmployeeIds[0]);
  }

  return null;
};

const hasEmployeeAclOutsideScope = (submittedIds, allowedIds, currentIds = []) => {
  const currentSet = new Set(normalizeIdArray(currentIds));
  return normalizeIdArray(submittedIds).some((id) => !currentSet.has(id) && !allowedIds.has(id));
};

const getEmployeeContextId = (req) => {
  const asEmployeeId = req.query?.asEmployeeId;
  if (!asEmployeeId) return null;
  const asEmployeeIdStr = String(asEmployeeId).trim();
  if (!mongoose.Types.ObjectId.isValid(asEmployeeIdStr)) return null;
  return asEmployeeIdStr;
};

const enforcePermissionHierarchy = ({ 
  viewEmployeeIds, editEmployeeIds, deleteEmployeeIds,
  viewUserIds, editUserIds, deleteUserIds 
}) => {
  // Employee permission hierarchy
  const viewEmpSet = new Set(normalizeIdArray(viewEmployeeIds));
  const editEmpSet = new Set(normalizeIdArray(editEmployeeIds));
  const deleteEmpSet = new Set(normalizeIdArray(deleteEmployeeIds));

  for (const id of deleteEmpSet) {
    editEmpSet.add(id);
    viewEmpSet.add(id);
  }
  for (const id of editEmpSet) {
    viewEmpSet.add(id);
  }

  // User permission hierarchy (for profile admins)
  const viewUserSet = new Set(normalizeIdArray(viewUserIds));
  const editUserSet = new Set(normalizeIdArray(editUserIds));
  const deleteUserSet = new Set(normalizeIdArray(deleteUserIds));

  for (const id of deleteUserSet) {
    editUserSet.add(id);
    viewUserSet.add(id);
  }
  for (const id of editUserSet) {
    viewUserSet.add(id);
  }

  return {
    viewEmployeeIds: Array.from(viewEmpSet),
    editEmployeeIds: Array.from(editEmpSet),
    deleteEmployeeIds: Array.from(deleteEmpSet),
    viewUserIds: Array.from(viewUserSet),
    editUserIds: Array.from(editUserSet),
    deleteUserIds: Array.from(deleteUserSet)
  };
};

const requireFolderPermission = (action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const role = req.user.role || 'employee';
      if (ADMIN_ROLES.includes(role)) {
        return next();
      }

      await resolveEmployeeIdForRequest(req);

      const folderId = req.params.folderId;
      if (!folderId) return next();

      const folder = await Folder.findById(folderId);
      if (!folder) return res.status(404).json({ message: 'Folder not found' });
      req.folder = folder;

      // Creator can always access (check both User ID and Employee ID)
      const userId = resolveActorId(req);
      const userIdStr = userId ? userId.toString() : null;
      const empId = req.user.employeeId ? req.user.employeeId.toString() : null;
      
      // Check if user is creator (via User ID for profile admins)
      if (userIdStr && folder.createdByUserId && folder.createdByUserId.toString() === userIdStr) {
        return next();
      }
      
      // Check if user is creator (via Employee ID for employees)
      if (empId && folder.createdByEmployeeId && folder.createdByEmployeeId.toString() === empId) {
        return next();
      }

      if (!folder.hasPermission(action, req.user)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      return next();
    } catch (error) {
      console.error('requireFolderPermission error:', { action, error });
      return res.status(500).json({ message: error.message });
    }
  };
};

// ==================== UNIFIED DOCUMENT FETCH LOGIC ====================

// Get all documents (admin: all, employee: permitted only)
router.get('/documents', async (req, res) => {
  try {
    if (!req.user || !resolveActorId(req)) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const role = req.user.role || 'employee';
    const isAdminLike = ADMIN_ROLES.includes(role);
    const userId = resolveActorId(req);
    let query = { isActive: true };

    const empId = await resolveEmployeeIdForRequest(req);

    if (isAdminLike) {
      // Admin sees all
    } else {
      if (!empId) {
        return res.json([]);
      }

      // Limit to folders the user can view (prevents folder permission bypass)
      const userId = resolveActorId(req);
      const folderOrConditions = [];
      
      if (userId) {
        folderOrConditions.push(
          { createdByUserId: userId },
          { 'permissions.viewUserIds': userId },
          { 'permissions.editUserIds': userId },
          { 'permissions.deleteUserIds': userId }
        );
      }
      
      if (empId) {
        folderOrConditions.push(
          { createdByEmployeeId: empId },
          { 'permissions.viewEmployeeIds': empId },
          { 'permissions.editEmployeeIds': empId },
          { 'permissions.deleteEmployeeIds': empId }
        );
      }
      
      const allowedFolders = await Folder.find({
        isActive: true,
        $or: folderOrConditions
      }).select('_id');
      const allowedFolderIds = allowedFolders.map(f => f._id);

      // Employee/User: only permitted documents
      const docAccessOr = [
        { 'accessControl.visibility': 'all' },
        { 'accessControl.visibility': 'employee', ownerId: empId },
        { 'accessControl.allowedUserIds': userId },
        { uploadedBy: userId } // Profile admins can see documents they uploaded
      ];

      query.$or = [
        { folderId: null, $or: docAccessOr },
        { folderId: { $in: allowedFolderIds }, $or: docAccessOr }
      ];
    }

    // Optional: filter by folder, category, etc.
    if (req.query.folderId) {
      const requestedFolderId = String(req.query.folderId);
      if (isAdminLike) {
        query.folderId = requestedFolderId;
      } else {
        // Ensure employee can view this folder
        const folder = await Folder.findById(requestedFolderId);
        if (!folder) {
          return res.status(404).json({ message: 'Folder not found' });
        }
        if (!folder.hasPermission('view', req.user)) {
          return res.status(403).json({ message: 'Insufficient permissions' });
        }
        query.folderId = requestedFolderId;
      }
    }
    if (req.query.category) query.category = req.query.category;

    const documents = await DocumentManagement.find(query)
      .populate('uploadedBy', 'firstName lastName email')
      .populate('ownerId', 'firstName lastName employeeId')
      .populate('folderId', 'name')
      .sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'documents');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      console.log('Upload directory ensured:', uploadPath);
      cb(null, uploadPath);
    } catch (error) {
      console.error('Error creating upload directory:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    console.log('Generating filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', // PPT
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, Excel, images and text files are allowed.'));
    }
  }
});

// Middleware to check user role and permissions
const checkPermission = (action) => {
  return async (req, res, next) => {
    try {
      // If no user at this point, return 401 immediately
      if (!req.user) {
        console.warn('checkPermission: No user found, returning 401');
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const user = req.user;
      const userRole = user.role || 'employee';
      
      // Admin and super-admin have all permissions
      if (ADMIN_ROLES.includes(userRole)) {
        return next();
      }

      await resolveEmployeeIdForRequest(req);
      
      // For folder operations, check folder permissions
      if (req.params.folderId) {
        return requireFolderPermission(action)(req, res, next);
      }
      
      // For document operations, check document permissions
      if (req.params.documentId) {
        const document = await DocumentManagement.findById(req.params.documentId);
        if (!document) {
          return res.status(404).json({ message: 'Document not found' });
        }

        // If document belongs to a folder, folder permissions must allow this action too
        if (document.folderId) {
          const folder = await Folder.findById(document.folderId);
          if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
          }

          // Creator can always access (check both User ID and Employee ID)
          const userId = resolveActorId(req);
          const userIdStr = userId ? userId.toString() : null;
          const empId = req.user.employeeId ? req.user.employeeId.toString() : null;
          
          const isCreator = 
            (userIdStr && folder.createdByUserId && folder.createdByUserId.toString() === userIdStr) ||
            (empId && folder.createdByEmployeeId && folder.createdByEmployeeId.toString() === empId);
          
          if (!isCreator) {
            if (!folder.hasPermission(action, req.user)) {
              return res.status(403).json({ message: 'Insufficient permissions' });
            }
          }
        }
        
        if (!document.hasPermission(action, req.user)) {
          return res.status(403).json({ message: 'Insufficient permissions' });
        }
      }
      
      next();
    } catch (error) {
      console.error('checkPermission error:', { action, error });
      res.status(500).json({ message: error.message });
    }
  };
};

// ==================== FOLDER ROUTES ====================

// Health check endpoint
router.get('/health', (req, res) => {
  console.log('🏥 Document Management Health Check Called');
  res.json({ 
    status: 'OK', 
    message: 'Document Management API is working',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to check Folder model
router.get('/test-folder', async (req, res) => {
  try {
    console.log('🧪 Testing Folder model...');
    
    // Test if Folder model exists
    console.log('📁 Folder model:', typeof Folder);
    
    // Test database connection
    const count = await Folder.countDocuments();
    console.log('📊 Folder count:', count);
    
    // Test creating a simple folder
    const testFolder = {
      name: 'Test Folder ' + Date.now(),
      description: 'Test description',
      createdBy: 'system'
    };
    
    console.log('✅ Test endpoint successful');
    res.json({
      status: 'OK',
      folderModelExists: typeof Folder === 'function',
      folderCount: count,
      testFolder: testFolder
    });
  } catch (error) {
    console.error('💥 Test endpoint error:', error);
    console.error('💥 Error stack:', error.stack);
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      stack: error.stack
    });
  }
});

// Get all folders - SIMPLIFIED
router.get('/folders', async (req, res) => {
  try {
    console.log("📂 Fetching folders...");
    console.log("📂 User:", req.user?.email || req.user?.id, "Role:", req.user?.role);
    
    const includeSubfolders = String(req.query.includeSubfolders || '').toLowerCase() === 'true';
    const role = req.user?.role;
    const isAdminLike = ADMIN_ROLES.includes(role);
    const asEmployeeId = isAdminLike ? getEmployeeContextId(req) : null;
    const effectiveAdminLike = isAdminLike && !asEmployeeId;
    
    let empId = null;
    try {
      const empIdResolved = await resolveEmployeeIdForRequest(req);
      empId = empIdResolved ? empIdResolved.toString() : null;
      console.log("📂 Resolved employee ID:", empId);
    } catch (resolveErr) {
      console.warn('⚠️ Error resolving employee ID:', resolveErr.message);
      empId = null;
    }
    
    const folderQuery = {
      isActive: true,
      ...(includeSubfolders ? {} : { parentFolder: null })
    };

    const effectiveEmpId = asEmployeeId || empId;

    if (!effectiveAdminLike && !effectiveEmpId) {
      console.log('📂 EmployeeId not resolved for non-admin user; returning no folders');
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, folders: [] });
    }

    if (!effectiveAdminLike) {
      const userId = resolveActorId(req);
      const orConditions = [];
      
      // Add User ID checks (for profile admins)
      if (userId && !asEmployeeId) {
        const userIdStr = userId.toString();
        orConditions.push(
          { createdByUserId: userIdStr },
          { 'permissions.viewUserIds': userId },
          { 'permissions.editUserIds': userId },
          { 'permissions.deleteUserIds': userId }
        );
      }
      
      // Add Employee ID checks (for employees)
      if (effectiveEmpId) {
        orConditions.push(
          { createdByEmployeeId: effectiveEmpId },
          { 'permissions.viewEmployeeIds': effectiveEmpId },
          { 'permissions.editEmployeeIds': effectiveEmpId },
          { 'permissions.deleteEmployeeIds': effectiveEmpId }
        );
      }
      
      if (orConditions.length > 0) {
        folderQuery.$or = orConditions;
      } else {
        // No user or employee ID - return empty
        console.log('📂 No user or employee ID conditions - returning empty');
        res.set('Cache-Control', 'no-store');
        return res.json({ success: true, folders: [] });
      }
    }

    console.log('📂 Folder query:', JSON.stringify(folderQuery, null, 2));
    const folders = await Folder.find(folderQuery)
      .sort({ name: 1 });
    
    console.log("📂 Found", folders.length, "folders");
    
    // Add document count and owner info to each folder
    const foldersWithCount = await Promise.all(folders.map(async (folder) => {
      try {
        // Count documents respecting access control
        let documentCountQuery = { folderId: folder._id, isActive: true, isArchived: false };
        if (!effectiveAdminLike) {
          const userId = resolveActorId(req);
          const docCountOr = [
            { 'accessControl.visibility': 'all' },
            { 'accessControl.visibility': 'employee', ownerId: effectiveEmpId }
          ];

          if (userId && !asEmployeeId) {
            docCountOr.push(
              { 'accessControl.allowedUserIds': userId },
              { uploadedBy: userId }
            );
          }
          
          documentCountQuery = {
            folderId: folder._id,
            isActive: true,
            isArchived: false,
            $or: docCountOr
          };
        }
        const documentCount = await DocumentManagement.countDocuments(documentCountQuery);
        
        // Enhanced permission checks for folder
        const userId = resolveActorId(req);
        const canEditFolder = effectiveAdminLike ? true : (
          (userId && folder.createdByUserId && folder.createdByUserId.toString() === userId.toString()) ||
          (typeof folder.hasPermission === 'function' && folder.hasPermission('edit', asEmployeeId ? { role: 'employee', employeeId: effectiveEmpId, _id: effectiveEmpId, id: effectiveEmpId } : req.user))
        );
        const canDeleteFolder = effectiveAdminLike ? true : (
          (userId && folder.createdByUserId && folder.createdByUserId.toString() === userId.toString()) ||
          (typeof folder.hasPermission === 'function' && folder.hasPermission('delete', asEmployeeId ? { role: 'employee', employeeId: effectiveEmpId, _id: effectiveEmpId, id: effectiveEmpId } : req.user))
        );
        
        // For "My Documents" folders, get the employee owner info for admins
        let ownerInfo = null;
        if (isAdminLike && folder.name === 'My Documents') {
          // Try to find owner from permissions.viewEmployeeIds, createdByEmployeeId, or createdBy
          const ownerEmpId = folder.permissions?.viewEmployeeIds?.[0] || folder.createdByEmployeeId || folder.createdBy;
          if (ownerEmpId && mongoose.Types.ObjectId.isValid(ownerEmpId)) {
            try {
              const ownerEmployee = await EmployeeHub.findById(ownerEmpId).select('firstName lastName employeeId email');
              if (ownerEmployee) {
                ownerInfo = {
                  _id: ownerEmployee._id,
                  firstName: ownerEmployee.firstName,
                  lastName: ownerEmployee.lastName,
                  employeeId: ownerEmployee.employeeId,
                  email: ownerEmployee.email
                };
              }
            } catch (empErr) {
              console.warn('⚠️ Error fetching owner employee:', empErr.message);
            }
          }
        }
        
        // Convert folder to plain object safely
        const folderObj = {
          _id: folder._id,
          name: folder.name,
          description: folder.description,
          parentFolder: folder.parentFolder,
          permissions: folder.permissions,
          createdBy: folder.createdBy,
          createdByUserId: folder.createdByUserId,
          createdByEmployeeId: folder.createdByEmployeeId,
          isActive: folder.isActive,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
          canView: true,
          canEdit: canEditFolder,
          canDelete: canDeleteFolder,
          documentCount,
          ownerInfo
        };
        
        return folderObj;
      } catch (folderError) {
        console.error('💥 Error processing folder:', folder._id, folderError.message);
        console.error('💥 Error stack:', folderError.stack);
        // Return basic folder info even if processing fails
        return {
          _id: folder._id,
          name: folder.name,
          description: folder.description,
          parentFolder: folder.parentFolder,
          createdAt: folder.createdAt,
          canView: true,
          canEdit: isAdminLike,
          canDelete: isAdminLike,
          documentCount: 0,
          ownerInfo: null
        };
      }
    }));
    
    console.log("✅ Folders fetched successfully:", foldersWithCount.length);
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, folders: foldersWithCount });
  } catch (error) {
    console.error("💥 Error fetching folders:", error);
    console.error("💥 Error stack:", error.stack);
    console.error("💥 User:", req.user?.email || req.user?.id);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Internal server error while fetching folders',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get folder by ID with documents
router.get('/folders/:folderId', requireFolderPermission('view'), async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.folderId)
      .populate('createdBy', 'firstName lastName employeeId');
    
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    
    // Apply access control: admin/super-admin sees all unless previewing as employee
    let documents;
    const role = req.user?.role;
    const isAdminLike = role === 'admin' || role === 'super-admin';
    const asEmployeeId = isAdminLike ? getEmployeeContextId(req) : null;
    const effectiveAdminLike = isAdminLike && !asEmployeeId;
    const permissionUser = asEmployeeId
      ? { role: 'employee', employeeId: asEmployeeId, _id: asEmployeeId, id: asEmployeeId }
      : req.user;
    const userId = resolveActorId(req);

    if (asEmployeeId && !folder.hasPermission('view', permissionUser)) {
      return res.status(403).json({ message: 'Insufficient permissions for this employee context' });
    }

    if (effectiveAdminLike) {
      documents = await DocumentManagement.getByFolder(req.params.folderId);
    } else {
      const query = {
        folderId: req.params.folderId,
        isActive: true,
        isArchived: false,
        $or: [
          { 'accessControl.visibility': 'all' },
          { 'accessControl.visibility': 'employee', ownerId: asEmployeeId || req.user.employeeId }
        ]
      };

      if (userId && !asEmployeeId) {
        query.$or.push({ 'accessControl.allowedUserIds': userId });
      }

      documents = await DocumentManagement.find(query)
        .populate('uploadedBy', 'firstName lastName email')
        .populate('ownerId', 'firstName lastName employeeId')
        .sort({ createdAt: -1 });
    }
    
    // Build breadcrumb (ancestors) for UI
    const breadcrumb = [];
    try {
      let current = folder;
      while (current) {
        breadcrumb.unshift({
          _id: current._id,
          name: current.name,
          parentFolder: current.parentFolder || null
        });
        if (!current.parentFolder) break;
        current = await Folder.findById(current.parentFolder).select('name parentFolder');
      }
    } catch (breadcrumbError) {
      console.error('Error building folder breadcrumb:', breadcrumbError);
    }

    // Get subfolders
    const subfoldersRaw = await Folder.find({ parentFolder: req.params.folderId, isActive: true });

    const isAdminLikeForFolder = ADMIN_ROLES.includes(req.user?.role) && !asEmployeeId;
    const subfolders = isAdminLikeForFolder
      ? subfoldersRaw
      : subfoldersRaw.filter((sf) => sf.hasPermission('view', permissionUser));
    
    // Format contents with type field for frontend
    const contents = [
      ...subfolders.map(f => ({
        ...f.toObject(),
        type: 'folder',
        canView: true,
        canEdit: isAdminLikeForFolder ? true : f.hasPermission('edit', permissionUser),
        canDelete: isAdminLikeForFolder ? true : f.hasPermission('delete', permissionUser)
      })),
      ...documents.map(d => ({
        ...d.toObject(),
        type: 'document',
        canView: true,
        canEdit: isAdminLikeForFolder ? true : d.hasPermission('edit', permissionUser),
        canDelete: isAdminLikeForFolder ? true : d.hasPermission('delete', permissionUser)
      }))
    ];
    
    res.json({
      folder,
      folderPermissions: {
        canView: true,
        canEdit: isAdminLikeForFolder ? true : folder.hasPermission('edit', permissionUser),
        canDelete: isAdminLikeForFolder ? true : folder.hasPermission('delete', permissionUser)
      },
      breadcrumb,
      contents,
      documents // Keep for backwards compatibility
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update folder
router.put('/folders/:folderId', requireFolderPermission('edit'), async (req, res) => {
  try {
    const {
      name,
      description,
      viewEmployeeIds,
      editEmployeeIds,
      deleteEmployeeIds,
      viewUserIds,
      editUserIds,
      deleteUserIds
    } = req.body;

    const actorRole = String(req.user?.role || '').trim().toLowerCase();
    const managerScopedEmployeeIds = await getManagerScopedEmployeeIds(req);
    const isManagerCaller = MANAGER_ROLES.includes(actorRole);

    const update = {};
    if (typeof name === 'string' && name.trim()) update.name = name.trim();
    if (typeof description === 'string') update.description = description;

    if (isManagerCaller && (normalizeIdArray(viewUserIds).length || normalizeIdArray(editUserIds).length || normalizeIdArray(deleteUserIds).length)) {
      return res.status(403).json({ message: 'Managers cannot edit user-based folder access' });
    }

    if (isManagerCaller) {
      const allowedIds = new Set(managerScopedEmployeeIds || []);
      const currentPermissions = req.folder?.permissions || {};

      const newView = hasEmployeeAclOutsideScope(viewEmployeeIds, allowedIds, currentPermissions.viewEmployeeIds);
      const newEdit = hasEmployeeAclOutsideScope(editEmployeeIds, allowedIds, currentPermissions.editEmployeeIds);
      const newDelete = hasEmployeeAclOutsideScope(deleteEmployeeIds, allowedIds, currentPermissions.deleteEmployeeIds);

      if (newView || newEdit || newDelete) {
        return res.status(403).json({ message: 'Cannot grant access to employees outside your team' });
      }
    }

    if (viewEmployeeIds !== undefined || editEmployeeIds !== undefined || deleteEmployeeIds !== undefined || viewUserIds !== undefined || editUserIds !== undefined || deleteUserIds !== undefined) {
      const normalized = enforcePermissionHierarchy({
        viewEmployeeIds,
        editEmployeeIds,
        deleteEmployeeIds,
        viewUserIds,
        editUserIds,
        deleteUserIds
      });

      // Prevent accidental lockout of original creator
      const creatorEmpId = req.folder?.createdByEmployeeId ? req.folder.createdByEmployeeId.toString() : null;
      if (creatorEmpId) {
        const v = new Set(normalizeIdArray(normalized.viewEmployeeIds));
        const e = new Set(normalizeIdArray(normalized.editEmployeeIds));
        const d = new Set(normalizeIdArray(normalized.deleteEmployeeIds));
        v.add(creatorEmpId);
        e.add(creatorEmpId);
        d.add(creatorEmpId);
        update.permissions = {
          viewEmployeeIds: Array.from(v),
          editEmployeeIds: Array.from(e),
          deleteEmployeeIds: Array.from(d),
          viewUserIds: normalized.viewUserIds,
          editUserIds: normalized.editUserIds,
          deleteUserIds: normalized.deleteUserIds
        };
      } else {
        update.permissions = normalized;
      }

      const folderName = String(req.folder?.name || '').trim().toLowerCase();
      if (folderName === 'my documents') {
        const ownerEmployeeId = getMyDocumentsOwnerId(req.folder);
        if (ownerEmployeeId) {
          const viewSet = new Set(normalizeIdArray(update.permissions?.viewEmployeeIds || normalized.viewEmployeeIds));
          const editSet = new Set(normalizeIdArray(update.permissions?.editEmployeeIds || normalized.editEmployeeIds));
          const deleteSet = new Set(normalizeIdArray(update.permissions?.deleteEmployeeIds || normalized.deleteEmployeeIds));

          if (!viewSet.has(ownerEmployeeId) || !editSet.has(ownerEmployeeId) || !deleteSet.has(ownerEmployeeId)) {
            return res.status(400).json({ message: 'My Documents folders must retain the owner in all access lists' });
          }
        }
      }
    }
    
    const folder = await Folder.findByIdAndUpdate(
      req.params.folderId,
      update,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName employeeId');
    
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    
    res.json({ success: true, folder });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/folders", async (req, res) => {
  try {
    console.log("FOLDER API BODY:", req.body);

    const {
      name,
      createdBy,
      parentFolderId,
      parentId,
      viewEmployeeIds,
      editEmployeeIds,
      deleteEmployeeIds,
      viewUserIds,
      editUserIds,
      deleteUserIds
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    let createdById = createdBy;
    if (!createdById) {
      createdById = resolveActorId(req);
    }
    const createdByEmployeeId = await resolveEmployeeIdForRequest(req);
    const rawParent = parentFolderId || parentId || null;
    const resolvedParentFolder = rawParent && String(rawParent).trim() ? String(rawParent).trim() : null;
    if (resolvedParentFolder && !mongoose.Types.ObjectId.isValid(resolvedParentFolder)) {
      return res.status(400).json({ message: 'Invalid parentFolderId' });
    }

    const actorRole = String(req.user?.role || '').trim().toLowerCase();
    const managerScopedEmployeeIds = await getManagerScopedEmployeeIds(req);
    const isManagerCaller = MANAGER_ROLES.includes(actorRole);

    const normalized = enforcePermissionHierarchy({
      viewEmployeeIds,
      editEmployeeIds,
      deleteEmployeeIds,
      viewUserIds,
      editUserIds,
      deleteUserIds
    });

    if (isManagerCaller) {
      if (normalizeIdArray(viewUserIds).length || normalizeIdArray(editUserIds).length || normalizeIdArray(deleteUserIds).length) {
        return res.status(403).json({ message: 'Managers cannot grant user-based folder access' });
      }

      const allowedIds = new Set(managerScopedEmployeeIds || []);
      const selectedIds = new Set([
        ...normalizeIdArray(normalized.viewEmployeeIds),
        ...normalizeIdArray(normalized.editEmployeeIds),
        ...normalizeIdArray(normalized.deleteEmployeeIds)
      ]);

      const outOfScope = Array.from(selectedIds).filter((id) => !allowedIds.has(id));
      if (outOfScope.length > 0) {
        return res.status(403).json({ message: 'Cannot grant access to employees outside your team' });
      }
    }

    // Creator must always retain full access (prevents lockout)
    if (createdByEmployeeId) {
      const v = new Set(normalizeIdArray(normalized.viewEmployeeIds));
      const e = new Set(normalizeIdArray(normalized.editEmployeeIds));
      const d = new Set(normalizeIdArray(normalized.deleteEmployeeIds));
      const creatorIdStr = createdByEmployeeId.toString();
      v.add(creatorIdStr);
      e.add(creatorIdStr);
      d.add(creatorIdStr);
      normalized.viewEmployeeIds = Array.from(v);
      normalized.editEmployeeIds = Array.from(e);
      normalized.deleteEmployeeIds = Array.from(d);
    }

    const folder = await Folder.create({
      name: name.trim(),
      description: req.body.description || '',
      createdBy: createdById,
      createdByUserId: createdById,
      createdByEmployeeId,
      parentFolder: resolvedParentFolder,
      permissions: normalized,
    });

    console.log("✅ Folder created successfully:", folder);
    return res.status(201).json({ success: true, folder });
  } catch (err) {
    console.error("FOLDER CREATION ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error creating folder",
      error: err.message
    });
  }
});

// Delete folder (soft delete)
router.delete('/folders/:folderId', checkPermission('delete'), async (req, res) => {
  try {
    const rootFolder = await Folder.findById(req.params.folderId);
    if (!rootFolder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Collect folder + all descendants
    const folderIds = [String(rootFolder._id)];
    for (let i = 0; i < folderIds.length; i++) {
      const currentId = folderIds[i];
      const children = await Folder.find({ parentFolder: currentId }).select('_id');
      for (const child of children) {
        folderIds.push(String(child._id));
      }
    }

    const deleteDocsResult = await DocumentManagement.deleteMany({
      folderId: { $in: folderIds },
    });
    const deleteFoldersResult = await Folder.deleteMany({ _id: { $in: folderIds } });

    res.json({
      message: 'Folder deleted successfully',
      deletedDocuments: deleteDocsResult.deletedCount,
      deletedFolders: deleteFoldersResult.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload document to folder
router.post('/folders/:folderId/documents', 
  checkPermission('edit'),
  upload.single('file'),
  async (req, res) => {
    try {
      // --- Unified Document Upload Logic ---
      const authenticatedUserId = req.actorId || resolveActorId(req);
      if (!req.user || !authenticatedUserId) {
        if (req.file) {
          try { await fs.unlink(req.file.path); } catch {}
        }
        return res.status(401).json({ message: 'Authentication required' });
      }
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      if (req.body.category === 'e_learning' && req.file.mimetype !== 'application/pdf') {
        try { await fs.unlink(req.file.path); } catch {}
        return res.status(400).json({ message: 'Invalid file type. Only PDF files are allowed for E-Learning documents.' });
      }

      // Folder is optional, but if provided, check existence
      let folderId = req.params.folderId || null;
      if (folderId) {
        const folder = await Folder.findById(folderId);
        if (!folder) {
          return res.status(404).json({ message: 'Folder not found' });
        }
      } else {
        folderId = null;
      }

      // Determine uploader info
      const userRole = req.user.role === 'admin' ? 'admin' : 'employee';
      const uploadedBy = authenticatedUserId;
      const uploadedByRole = userRole;

      // OwnerId: for employee uploads, set to employeeId; for admin, can be null or set by admin
      let ownerId = null;
      if (userRole === 'employee') {
        // Try to get employeeId from user or request
        ownerId = req.user.employeeId || req.body.ownerId || null;
      } else if (req.body.ownerId) {
        ownerId = req.body.ownerId;
      }

      // Access control
      let accessControl = { visibility: 'all', allowedUserIds: [] };
      if (req.body.accessControl) {
        try {
          const parsed = typeof req.body.accessControl === 'string' ? JSON.parse(req.body.accessControl) : req.body.accessControl;
          accessControl = {
            visibility: parsed.visibility || 'all',
            allowedUserIds: Array.isArray(parsed.allowedUserIds) ? parsed.allowedUserIds : []
          };
        } catch (e) {
          // fallback to default
        }
      } else if (userRole === 'admin' && ownerId) {
        // Admin uploading for a specific employee defaults to employee-only visibility
        accessControl = { visibility: 'employee', allowedUserIds: [] };
      } else if (userRole === 'employee') {
        // Employees can only upload for themselves, default to employee-only
        accessControl = { visibility: 'employee', allowedUserIds: [uploadedBy] };
      }

      // Read file data into buffer
      const fileBuffer = await fs.readFile(req.file.path);

      // Create document
      const document = new DocumentManagement({
        name: req.file.originalname,
        fileUrl: null,
        fileData: fileBuffer,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy,
        uploadedByRole,
        ownerId,
        folderId,
        accessControl,
        category: req.body.category || 'other',
        tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
        version: 1,
        parentDocument: null,
        expiresOn: req.body.expiresOn ? new Date(req.body.expiresOn) : null,
        reminderEnabled: req.body.reminderEnabled === 'true',
        isActive: true,
        isArchived: false,
        downloadCount: 0,
        lastAccessedAt: null,
        // Actor/Subject Tracking
        performedByAdmin: userRole === 'admin' && ownerId !== null && ownerId !== uploadedBy,
        targetEmployeeId: ownerId,
        auditLog: [{
          action: 'uploaded',
          performedBy: uploadedBy,
          timestamp: new Date(),
          details: `Document uploaded by ${req.user.firstName || ''} ${req.user.lastName || ''}` + 
                   (userRole === 'admin' && ownerId ? ` for employee ${ownerId}` : '')
        }]
      });

      // Delete uploaded file from filesystem after reading into buffer
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {}

      await document.save();

      // Populate references - handle cases where ownerId might be null or invalid
      try {
        const populateOptions = [
          { path: 'uploadedBy', select: 'firstName lastName email' },
          { path: 'folderId', select: 'name' }
        ];
        
        // Only populate ownerId if it exists
        if (document.ownerId) {
          populateOptions.push({ path: 'ownerId', select: 'firstName lastName employeeId' });
        }
        
        await document.populate(populateOptions);
      } catch (populateError) {
        console.warn('Document populate warning:', populateError.message);
        // Continue even if populate fails - document is already saved
      }

      res.status(201).json(document);
    } catch (error) {
      // Clean up uploaded file if there's an error
      if (req.file) {
        try { await fs.unlink(req.file.path); } catch {}
      }
      res.status(500).json({ message: error.message });
    }
  }
);

// Search documents (MUST be before /:documentId to avoid 'search' being treated as an ID)
router.get('/documents/search', async (req, res) => {
  try {
    const { q, folderId } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const documents = await DocumentManagement.searchDocuments(q, { folderId });
    
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get expiring documents (MUST be before /:documentId)
router.get('/documents/expiring', async (req, res) => {
  try {
    const { days } = req.query;
    const documents = await DocumentManagement.getExpiringSoon(parseInt(days) || 30);
    
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get document by ID
router.get('/documents/:documentId', checkPermission('view'), async (req, res) => {
  try {
    const document = await DocumentManagement.findById(req.params.documentId)
      .populate('folderId', 'name')
      .populate('uploadedBy', 'firstName lastName email')
      .populate('ownerId', 'firstName lastName employeeId');
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Add audit log for viewing
    try {
      const userId = resolveActorId(req);
      if (userId) {
        document.auditLog.push({
          action: 'viewed',
          performedBy: userId,
          timestamp: new Date(),
          details: 'Document viewed'
        });
        await document.save();
      }
    } catch (auditError) {
      console.error('Error logging view:', auditError);
      // Continue to return document even if audit fails
    }
    
    res.json(document);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      message: error.message,
      name: error.name,
      code: error.code
    });
  }
});

// View/stream document (for opening in browser) - accepts token in query param
router.get('/documents/:documentId/view', async (req, res) => {
  try {
    console.log('=== View Document Request ===');
    console.log('Query token:', req.query.token ? 'Present' : 'Missing');
    console.log('Auth header:', req.headers.authorization ? 'Present' : 'Missing');

    // Authentication is handled by authenticateSession middleware mounted in server.js
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check permissions
    const isAdminLike = ADMIN_ROLES.includes(user.role);
    
    // Always resolve employeeId for the user - important for permission checks
    await resolveEmployeeIdForUser(req);
    
    console.log('👤 User after resolve:', {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      isAdminLike
    });

    const document = await DocumentManagement.findById(req.params.documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    console.log('📄 Document info:', {
      documentId: document._id,
      ownerId: document.ownerId,
      uploadedBy: document.uploadedBy,
      folderId: document.folderId,
      visibility: document.accessControl?.visibility
    });

    if (!isAdminLike) {
      // For employees, check if they are the owner of the document
      const userEmployeeId = user.employeeId ? String(user.employeeId) : null;
      const docOwnerId = document.ownerId ? String(document.ownerId) : null;
      
      // Direct ownership check - if employee owns the document, allow access
      if (userEmployeeId && docOwnerId && userEmployeeId === docOwnerId) {
        console.log('✅ Direct ownership match - allowing access');
      } else {
        // Fall back to folder and document permission checks
        if (document.folderId) {
          const folder = await Folder.findById(document.folderId);
          if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
          }
          if (!folder.hasPermission('view', user)) {
            console.log('❌ Folder permission denied');
            return res.status(403).json({ message: 'Insufficient permissions' });
          }
        }
        if (!document.hasPermission('view', user)) {
          console.log('❌ Document permission denied');
          return res.status(403).json({ message: 'Insufficient permissions' });
        }
      }
    }
    
    // Send file inline (for viewing in browser)
    // Support both DB-backed files (fileData) and disk-backed files (fileUrl)
    let responseBuffer = null;

    if (document.fileData && document.fileData.length) {
      responseBuffer = document.fileData;
    } else if (document.fileUrl) {
      const relativePath = String(document.fileUrl).replace(/^\/+/, '');
      const absolutePath = path.join(__dirname, '..', relativePath);

      try {
        responseBuffer = await fs.readFile(absolutePath);
      } catch (fileError) {
        if (fileError && fileError.code === 'ENOENT') {
          return res.status(404).json({ message: 'File not found on disk' });
        }
        throw fileError;
      }
    } else {
      return res.status(404).json({ message: 'File data not found' });
    }

    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${document.name || document.fileName}"`);
    res.setHeader('Content-Length', responseBuffer.length);
    res.send(responseBuffer);
  } catch (error) {
    console.error('View error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Upload document without folder (optional folder)
router.post('/documents',
  checkPermission('edit'),
  upload.single('file'),
  async (req, res) => {
    try {
      console.log('📤 Document upload request received');
      console.log('👤 User:', { 
        id: resolveActorId(req),
        role: req.user?.role,
        email: req.user?.email,
        employeeId: req.user?.employeeId 
      });
      console.log('📋 Request body:', { 
        category: req.body.category,
        ownerId: req.body.ownerId,
        hasFile: !!req.file
      });

      const authenticatedUserId = resolveActorId(req);
      if (!req.user || !authenticatedUserId) {
        if (req.file) {
          try { await fs.unlink(req.file.path); } catch {}
        }
        console.error('❌ Authentication required');
        return res.status(401).json({ message: 'Authentication required' });
      }
      if (!req.file) {
        console.error('❌ No file uploaded');
        return res.status(400).json({ message: 'No file uploaded' });
      }

      if (req.body.category === 'e_learning' && req.file.mimetype !== 'application/pdf') {
        try { await fs.unlink(req.file.path); } catch {}
        console.error('❌ Invalid file type for e-learning');
        return res.status(400).json({ message: 'Invalid file type. Only PDF files are allowed for E-Learning documents.' });
      }

      // Route employee-owned onboarding documents into My Documents
      let folderId = null;

      // Check if user is admin using ADMIN_ROLES array
      const isAdmin = ADMIN_ROLES.includes(req.user.role);
      const userRole = isAdmin ? 'admin' : 'employee';
      const uploadedBy = authenticatedUserId;
      const uploadedByRole = userRole;

      console.log('🔐 Role check:', { role: req.user.role, isAdmin, userRole });

      // Determine document owner
      let ownerId = null;
      if (isAdmin) {
        // Admin can upload for specific employee (ownerId in request) or for themselves
        if (req.body.ownerId) {
          ownerId = req.body.ownerId;
          console.log('👤 Admin uploading for employee:', ownerId);
        } else {
          // Admin uploading for themselves - resolve their employee ID
          const resolvedEmployeeId = await resolveEmployeeIdForRequest(req);
          ownerId = resolvedEmployeeId;
          console.log('👤 Admin uploading for self:', ownerId);
        }
      } else {
        // Employee uploading for themselves
        ownerId = req.user.employeeId || req.body.ownerId || null;
        console.log('👤 Employee uploading:', ownerId);
      }

      // Validate ownerId exists
      if (!ownerId) {
        if (req.file) {
          try { await fs.unlink(req.file.path); } catch {}
        }
        console.error('❌ Could not determine document owner');
        return res.status(400).json({ 
          message: 'Could not determine document owner. Please ensure employee exists.',
          details: {
            isAdmin,
            userRole,
            hasBodyOwnerId: !!req.body.ownerId,
            hasEmployeeId: !!req.user.employeeId
          }
        });
      }

      console.log('✅ Document owner resolved:', ownerId);

      if (ownerId && mongoose.Types.ObjectId.isValid(String(ownerId))) {
        const ownerFolder = await ensureMyDocumentsFolder(ownerId);
        folderId = ownerFolder._id;
        console.log('📁 Routed document into My Documents folder:', folderId);
      }

      let accessControl = { visibility: 'all', allowedUserIds: [] };
      if (req.body.accessControl) {
        try {
          const parsed = typeof req.body.accessControl === 'string' ? JSON.parse(req.body.accessControl) : req.body.accessControl;
          accessControl = {
            visibility: parsed.visibility || 'all',
            allowedUserIds: Array.isArray(parsed.allowedUserIds) ? parsed.allowedUserIds : []
          };
        } catch (e) {}
      } else if (userRole === 'admin' && ownerId) {
        // Admin uploading for a specific employee defaults to employee-only visibility
        accessControl = { visibility: 'employee', allowedUserIds: [] };
      } else if (userRole === 'employee') {
        accessControl = { visibility: 'employee', allowedUserIds: [uploadedBy] };
      }

      console.log('📁 Reading file from disk:', req.file.path);
      const fileBuffer = await fs.readFile(req.file.path);
      console.log('✅ File read successfully, size:', fileBuffer.length, 'bytes');

      const document = new DocumentManagement({
        name: req.file.originalname,
        fileUrl: null,
        fileData: fileBuffer,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy,
        uploadedByRole,
        ownerId,
        folderId,
        accessControl,
        category: req.body.category || 'other',
        tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
        version: 1,
        parentDocument: null,
        expiresOn: req.body.expiresOn ? new Date(req.body.expiresOn) : null,
        reminderEnabled: req.body.reminderEnabled === 'true',
        isActive: true,
        isArchived: false,
        downloadCount: 0,
        lastAccessedAt: null,
        auditLog: [{ action: 'uploaded', performedBy: uploadedBy, timestamp: new Date(), details: `Document uploaded by ${req.user.firstName || ''} ${req.user.lastName || ''}` }]
      });

      console.log('💾 Saving document to database...');
      try { await fs.unlink(req.file.path); } catch {}

      await document.save();
      console.log('✅ Document saved successfully:', document._id);
      await document.populate([
        { path: 'uploadedBy', select: 'firstName lastName email' },
        { path: 'ownerId', select: 'firstName lastName employeeId' }
      ]);

      console.log('✅ Document upload complete:', document._id);
      res.status(201).json(document);
    } catch (error) {
      console.error('❌ Document upload failed:', {
        message: error.message,
        stack: error.stack,
        file: req.file?.originalname,
        user: req.user?.email,
        ownerId: req.body?.ownerId
      });
      if (req.file) { try { await fs.unlink(req.file.path); } catch {} }
      res.status(500).json({ 
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// Download document
router.get('/documents/:documentId/download', checkPermission('download'), async (req, res) => {
  try {
    const document = await DocumentManagement.findById(req.params.documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    if (!document.fileData) {
      return res.status(404).json({ message: 'File data not found' });
    }
    
    // Increment download count - don't block download if this fails
    try {
      const userId = resolveActorId(req);
      document.downloadCount += 1;
      document.lastAccessedAt = new Date();
      if (userId) {
        document.auditLog.push({
          action: 'downloaded',
          performedBy: userId,
          timestamp: new Date(),
          details: 'Document downloaded'
        });
      }
      await document.save();
    } catch (auditError) {
      console.error('Error updating download audit:', auditError);
      // Continue with download even if audit fails
    }
    
    const originalName = document.name || document.fileName || 'document';
    const isPdf = document.mimeType === 'application/pdf';
    let downloadName = originalName;
    if (isPdf) {
      const base = downloadName.replace(/\.[^/.]+$/, '');
      downloadName = base.endsWith('.pdf') ? base : `${base}.pdf`;
    }

    // Send file from MongoDB buffer
    res.setHeader('Content-Type', isPdf ? 'application/pdf' : document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Content-Length', document.fileData.length);
    res.send(document.fileData);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update document
router.put('/documents/:documentId', checkPermission('edit'), async (req, res) => {
  try {
    const { name, fileName, category, tags, permissions, expiresOn, reminderEnabled } = req.body;

    const update = {};
    if (typeof name === 'string' && name.trim()) update.name = name.trim();
    if (typeof fileName === 'string' && fileName.trim()) update.fileName = fileName.trim();
    if (category !== undefined) update.category = category;

    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        update.tags = tags.map((tag) => String(tag).trim()).filter(Boolean);
      } else if (typeof tags === 'string') {
        update.tags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      }
    }

    if (permissions !== undefined) {
      if (typeof permissions === 'string') {
        try {
          update.permissions = JSON.parse(permissions);
        } catch {
          // ignore invalid permissions payload
        }
      } else {
        update.permissions = permissions;
      }
    }

    if (expiresOn !== undefined) {
      const parsed = expiresOn ? new Date(expiresOn) : null;
      if (!expiresOn) update.expiresOn = null;
      else if (!Number.isNaN(parsed.getTime())) update.expiresOn = parsed;
    }
    if (reminderEnabled !== undefined) update.reminderEnabled = reminderEnabled;
    
    const document = await DocumentManagement.findByIdAndUpdate(
      req.params.documentId,
      update,
      { new: true, runValidators: true }
    ).populate([
      { path: 'folderId', select: 'name' },
      { path: 'uploadedBy', select: 'firstName lastName employeeId' },
      { path: 'ownerId', select: 'firstName lastName employeeId' }
    ]);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Add audit log
    try {
      const userId = resolveActorId(req);
      if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
        document.auditLog.push({
          action: 'updated',
          performedBy: userId,
          timestamp: new Date(),
          details: 'Document updated'
        });
        await document.save();
      }
    } catch (auditError) {
      console.error('Error logging update:', auditError);
      // Continue to return document even if audit fails
    }
    
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new version of document
router.post('/documents/:documentId/version', 
  checkPermission('edit'), 
  upload.single('file'), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const originalDocument = await DocumentManagement.findById(req.params.documentId);
      if (!originalDocument) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Read file data into buffer
      const fileBuffer = await fs.readFile(req.file.path);
      
      // Delete temp file
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting temp file:', unlinkError);
      }
      
      // Create new version
      const userId = resolveActorId(req);
      const newVersion = await originalDocument.createNewVersion(
        fileBuffer,
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        userId
      );
      
      await newVersion.populate([
        { path: 'folderId', select: 'name' },
        { path: 'uploadedBy', select: 'firstName lastName employeeId' },
        { path: 'ownerId', select: 'firstName lastName employeeId' }
      ]);
      
      // Add audit log
      try {
        if (userId) {
          newVersion.auditLog.push({
            action: 'uploaded',
            performedBy: userId,
            timestamp: new Date(),
            details: 'New version uploaded'
          });
          await newVersion.save();
        }
      } catch (auditError) {
        console.error('Error logging new version:', auditError);
        // Continue to return document even if audit fails
      }
      
      res.status(201).json(newVersion);
    } catch (error) {
      // Clean up uploaded file if there's an error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error('Failed to clean up file:', cleanupError);
        }
      }
      res.status(500).json({ message: error.message });
    }
  }
);

// Archive document
router.post('/documents/:documentId/archive', checkPermission('delete'), async (req, res) => {
  try {
    const document = await DocumentManagement.findById(req.params.documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const userId = resolveActorId(req);
    document.isArchived = true;
    document.isActive = false;
    if (userId) {
      document.auditLog.push({
        action: 'archived',
        performedBy: userId,
        timestamp: new Date(),
        details: 'Document archived'
      });
    }
    await document.save();
    
    res.json({ message: 'Document archived successfully' });
  } catch (error) {
    console.error('Archive error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete document
router.delete('/documents/:documentId', checkPermission('delete'), async (req, res) => {
  try {
    const document = await DocumentManagement.findById(req.params.documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Delete from database (file data is stored in MongoDB, no filesystem cleanup needed)
    await DocumentManagement.findByIdAndDelete(req.params.documentId);
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get document versions
router.get('/documents/:documentId/versions', checkPermission('view'), async (req, res) => {
  try {
    const document = await DocumentManagement.findById(req.params.documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const versions = await DocumentManagement.find({
      $or: [
        { _id: req.params.documentId },
        { parentDocument: req.params.documentId }
      ]
    })
    .populate('uploadedBy', 'firstName lastName employeeId')
    .sort({ version: 1 });
    
    res.json(versions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== MY DOCUMENTS FEATURE ====================

/**
 * POST /api/document-management/employees/:employeeId/upload
 * Upload document to employee's "My Documents" folder (admin only)
 */
router.post('/employees/:employeeId/upload',
  upload.single('file'),
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { category } = req.body;

      // Explicit admin authorization check
      if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Read file data into buffer (system stores files in MongoDB, not on disk)
      const fileBuffer = await fs.readFile(req.file.path);
      try { await fs.unlink(req.file.path); } catch {}

      // Ensure My Documents folder exists
      const folder = await ensureMyDocumentsFolder(employeeId);

      // Create document record
      const document = await DocumentManagement.create({
        name: req.file.originalname,
        fileData: fileBuffer,
        fileUrl: null,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.actorId || resolveActorId(req),
        uploadedByRole: 'admin',
        ownerId: employeeId,
        folderId: folder._id,
        category: category || 'other',
        accessControl: {
          visibility: 'employee',
          allowedUserIds: [employeeId]
        },
        isActive: true,
        isArchived: false
      });

      console.log('Document uploaded to My Documents:', document._id);

      res.status(201).json({
        message: 'Document uploaded successfully',
        document
      });
    } catch (error) {
      console.error('Upload to My Documents error:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /api/document-management/employees/:employeeId/my-documents
 * Get all documents in employee's "My Documents" folder
 * Auth: Employee can only access their own, admins can access any
 */
router.get('/employees/:employeeId/my-documents', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const userRole = req.user?.role;
    const userId = resolveActorId(req);
    const resolvedEmployeeId = await resolveEmployeeIdForRequest(req);
    const resolvedEmployeeIdStr = resolvedEmployeeId ? String(resolvedEmployeeId) : null;

    console.log('📂 GET /my-documents - Auth check:', {
      employeeId,
      userId,
      userRole,
      match: String(userId) === String(employeeId) || resolvedEmployeeIdStr === String(employeeId),
      reqUser: req.user
    });

    // Authorization check: if not admin, must be accessing own documents
    if (userRole !== 'admin' && userRole !== 'super-admin') {
      const isOwnByUserId = String(userId) === String(employeeId);
      const isOwnByEmployeeId = resolvedEmployeeIdStr === String(employeeId);

      if (!isOwnByUserId && !isOwnByEmployeeId) {
        console.error('❌ Access denied: userId mismatch', {
          userId,
          resolvedEmployeeId: resolvedEmployeeIdStr,
          employeeId
        });
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Always ensure a My Documents folder exists for this employee
    await ensureMyDocumentsFolder(employeeId);

    // Find My Documents folder - search by multiple criteria since folder could be:
    // 1. Created by the employee (createdBy or createdByEmployeeId)
    // 2. Created by admin FOR the employee (has employee in viewEmployeeIds)
    const folder = await Folder.findOne({
      name: 'My Documents',
      isActive: true,
      $or: [
        { createdBy: employeeId },
        { createdByEmployeeId: employeeId },
        { 'permissions.viewEmployeeIds': employeeId }
      ]
    });

    if (!folder) {
      console.log('📂 No My Documents folder found for employee:', employeeId);
      return res.json({ folder: null, documents: [] });
    }
    
    console.log('📂 Found My Documents folder:', folder._id, 'for employee:', employeeId);

    // Get documents in folder
    const documents = await DocumentManagement.find({
      folderId: folder._id,
      isActive: true,
      isArchived: false
    })
      .populate('uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ folder, documents });
  } catch (error) {
    console.error('Get My Documents error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
