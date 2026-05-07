const express = require('express');
const router = express.Router();
const multer = require('multer');
const DocumentManagement = require('../models/DocumentManagement');
const ELearningCompletion = require('../models/ELearningCompletion');
const { resolveActorId } = require('../utils/identityHelper');
const EmployeeHub = require('../models/EmployeesHub');
const User = require('../models/User');
const mongoose = require('mongoose');
const hierarchyHelper = require('../utils/hierarchyHelper');
const { MANAGER_ROLES, ADMIN_SCOPE_ROLES } = require('../utils/roles');

// Store file bytes in memory — saved as Buffer (fileData) in MongoDB.
// Nothing is written to disk; no static file serving needed for e-learning.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
      'application/vnd.ms-powerpoint', // ppt
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/msword' // doc
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PPT, PPTX, DOC, and DOCX files are allowed.'));
    }
  }
});

const uploadSingleFile = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    next();
  });
};

// Middleware: Check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const resolveActorEmployee = async (req) => {
  const actorId = resolveActorId(req);

  if (actorId && mongoose.Types.ObjectId.isValid(String(actorId))) {
    const byId = await EmployeeHub.findById(actorId).select('_id role email managerId');
    if (byId) return byId;

    const byUserId = await EmployeeHub.findOne({ userId: actorId }).select('_id role email managerId');
    if (byUserId) return byUserId;
  }

  if (req.user?.email) {
    return EmployeeHub.findOne({
      email: String(req.user.email).trim().toLowerCase()
    }).select('_id role email managerId');
  }

  return null;
};

const getManagerScopedEmployeeIds = async (req) => {
  const role = req.user?.role;
  if (!MANAGER_ROLES.includes(role) && !ADMIN_SCOPE_ROLES.includes(role)) {
    return null;
  }

  const actorEmployee = await resolveActorEmployee(req);
  if (!actorEmployee?._id) {
    return [];
  }

  const subordinates = await hierarchyHelper.getSubordinates(actorEmployee._id, false);
  return subordinates.map((member) => String(member._id));
};

/**
 * POST /api/elearning/upload
 * Upload E-Learning material (admin only)
 */
router.post('/upload', isAdmin, uploadSingleFile, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Create E-Learning material record using DocumentManagement model
    // uploaderModel must be 'User' (not the default 'EmployeeHub') because
    // admins authenticate via the User collection, not EmployeeHub.
    const material = await DocumentManagement.create({
      name: title,
      description: description || '',
      fileUrl: null,          // file stored as Buffer in DB, not on disk
      fileData: req.file.buffer,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: resolveActorId(req),
      uploaderModel: 'User',   // ← fix: ensures populate resolves against User collection
      uploadedByRole: 'admin',
      ownerId: null,           // global — no specific owner
      category: 'e_learning',
      accessControl: {
        visibility: 'all',
        allowedUserIds: []
      },
      isActive: true,
      isArchived: false
    });

    console.log('E-Learning material uploaded:', material._id);

    res.status(201).json({
      message: 'E-Learning material uploaded successfully',
      data: material
    });
  } catch (error) {
    console.error('E-Learning upload error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/elearning
 * Get all E-Learning materials (all authenticated users)
 * Includes completion status for current user and statistics for admins
 */
router.get('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const materials = await DocumentManagement.find({
      category: 'e_learning',
      isActive: true,
      isArchived: false
    })
      .select('-fileData')   // never send binary payload to the list endpoint
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // Get current user's employee ID
    const currentUserId = resolveActorId(req);
    const currentEmployeeId = req.employeeHubId || currentUserId;

    // Get all completions for the current user
    const userCompletions = await ELearningCompletion.find({
      employeeId: currentEmployeeId
    });

    const completionMap = new Map(
      userCompletions.map(comp => [comp.materialId.toString(), comp])
    );

    // Get total employee count for admins
    let totalEmployees = 0;
    if (req.user.role === 'admin' || req.user.role === 'super-admin') {
      totalEmployees = await EmployeeHub.countDocuments({ isActive: true });
    }

    // Enhance materials with completion data
    const enhancedMaterials = await Promise.all(
      materials.map(async (material) => {
        const materialObj = material.toObject();
        
        // Add user's completion status
        const userCompletion = completionMap.get(material._id.toString());
        materialObj.completed = !!userCompletion;
        materialObj.completedDate = userCompletion ? userCompletion.completedDate : null;

        // Add completion statistics for admins
        if (req.user.role === 'admin' || req.user.role === 'super-admin') {
          const completedCount = await ELearningCompletion.countDocuments({
            materialId: material._id
          });
          materialObj.completedCount = completedCount;
          materialObj.totalEmployees = totalEmployees;
        }

        return materialObj;
      })
    );

    res.json({
      success: true,
      data: enhancedMaterials
    });
  } catch (error) {
    console.error('Get E-Learning materials error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/elearning/complete
 * Mark a course as completed by an employee
 */
router.post('/complete', async (req, res) => {
  try {
    console.log('📚 E-Learning complete request:', { user: req.user?.email, body: req.body });
    
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { materialId, employeeId, completedDate } = req.body;

    if (!materialId) {
      return res.status(400).json({ message: 'Material ID is required' });
    }

    // Resolve the EmployeeHub _id for the acting user.
    // - Employees: req.user.employeeId is already set by the JWT.
    // - Admins: req.user.employeeId is undefined; look up by matching User._id.
    let targetEmployeeId = employeeId || req.user.employeeId;
    if (!targetEmployeeId) {
      const userId = resolveActorId(req);
      const empRecord = await EmployeeHub.findOne({ userId }).select('_id').lean();
      targetEmployeeId = empRecord?._id || userId; // fall back to User _id if no hub record
    }

    console.log('📚 Target employee ID:', targetEmployeeId);

    if (!targetEmployeeId) {
      return res.status(400).json({ message: 'Unable to determine employee ID' });
    }

    // Verify the material exists
    const material = await DocumentManagement.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: 'E-Learning material not found' });
    }

    if (material.category !== 'e_learning') {
      return res.status(400).json({ message: 'Not an E-Learning material' });
    }

    // Check if already completed
    const existingCompletion = await ELearningCompletion.findOne({
      materialId,
      employeeId: targetEmployeeId
    });

    if (existingCompletion) {
      return res.status(409).json({ 
        message: 'Course already completed',
        data: existingCompletion
      });
    }

    // Create completion record
    const completion = await ELearningCompletion.create({
      materialId,
      employeeId: targetEmployeeId,
      completedDate: completedDate || new Date(),
      completedBy: resolveActorId(req)
    });

    console.log('E-Learning completion recorded:', completion._id);

    res.status(201).json({
      success: true,
      message: 'Course marked as completed',
      data: completion
    });
  } catch (error) {
    console.error('💥 E-Learning completion error:', error);
    console.error('💥 Error stack:', error.stack);
    
    // Handle duplicate key error (unique constraint)
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Course already completed' });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to mark course as complete',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/elearning/completions/:materialId
 * Get all completions for a specific material (admin only)
 */
router.get('/completions/:materialId', isAdmin, async (req, res) => {
  try {
    const { materialId } = req.params;

    // Verify the material exists
    const material = await DocumentManagement.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: 'E-Learning material not found' });
    }

    // Get all completions for this material
    const completions = await ELearningCompletion.find({ materialId })
      .sort({ completedDate: -1 });

    // Get total active employees
    const totalEmployees = await EmployeeHub.countDocuments({ isActive: true });

    // Enhance completions with employee details
    const enhancedCompletions = await Promise.all(
      completions.map(async (completion) => {
        // Try to find employee in EmployeeHub first
        let employee = await EmployeeHub.findById(completion.employeeId);
        
        // If not found, try User collection
        if (!employee) {
          employee = await User.findById(completion.employeeId);
        }

        return {
          employeeId: employee?.employeeId || employee?._id?.toString() || 'Unknown',
          employeeName: employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : 'Unknown Employee',
          department: employee?.department || 'N/A',
          completedDate: completion.completedDate,
          _id: completion._id
        };
      })
    );

    res.json({
      success: true,
      data: enhancedCompletions,
      totalEmployees,
      completedCount: completions.length
    });
  } catch (error) {
    console.error('Get completions error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/elearning/team-completions/:materialId
 * Manager-scoped completion roster for direct reports only
 */
router.get('/team-completions/:materialId', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const role = req.user?.role;
    if (!MANAGER_ROLES.includes(role) && role !== 'hr') {
      return res.status(403).json({ message: 'Manager access required' });
    }

    const { materialId } = req.params;

    const material = await DocumentManagement.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: 'E-Learning material not found' });
    }

    const scopedEmployeeIds = await getManagerScopedEmployeeIds(req);
    if (scopedEmployeeIds === null) {
      return res.status(403).json({ message: 'Manager access required' });
    }

    const teamMembers = scopedEmployeeIds.length
      ? await EmployeeHub.find({ _id: { $in: scopedEmployeeIds }, isActive: true, status: { $ne: 'Terminated' } })
          .select('firstName lastName employeeId department role')
          .sort({ firstName: 1, lastName: 1 })
          .lean()
      : [];

    const completions = await ELearningCompletion.find({
      materialId,
      employeeId: { $in: scopedEmployeeIds }
    }).lean();

    const completionMap = new Map(
      completions.map((completion) => [String(completion.employeeId), completion])
    );

    const roster = teamMembers.map((member) => {
      const completion = completionMap.get(String(member._id));
      return {
        employeeId: member.employeeId || String(member._id),
        employeeName: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown Employee',
        department: member.department || 'N/A',
        completed: !!completion,
        completedDate: completion?.completedDate || null,
        _id: completion?._id || `${member._id}-${materialId}`
      };
    });

    res.json({
      success: true,
      data: roster,
      totalEmployees: teamMembers.length,
      completedCount: completions.length
    });
  } catch (error) {
    console.error('Get team completions error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/elearning/my-completions
 * Get current user's completions
 */
router.get('/my-completions', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const employeeId = resolveActorId(req);

    const completions = await ELearningCompletion.find({ employeeId })
      .populate('materialId', 'name description fileUrl mimeType')
      .sort({ completedDate: -1 });

    const formattedCompletions = completions.map(comp => ({
      materialId: comp.materialId?._id,
      materialTitle: comp.materialId?.name || 'Unknown Material',
      completedDate: comp.completedDate,
      _id: comp._id
    }));

    res.json({
      success: true,
      data: formattedCompletions
    });
  } catch (error) {
    console.error('Get my completions error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/elearning/view/:id
 * Stream an e-learning file from disk directly (bypasses DocumentManagement /view
 * which reads fileData — e-learning files are stored as disk files, not buffers).
 * Auth: any authenticated user (all e-learning materials have visibility:'all').
 */
router.get('/view/:id', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });

    // Explicitly select fileData — it is excluded from list queries by default
    const material = await DocumentManagement.findById(req.params.id).select('+fileData');
    if (!material || material.category !== 'e_learning') {
      return res.status(404).json({ message: 'E-Learning material not found' });
    }
    if (!material.isActive || material.isArchived) {
      return res.status(404).json({ message: 'E-Learning material is no longer available' });
    }
    if (!material.fileData || material.fileData.length === 0) {
      return res.status(404).json({ message: 'File data not found in database. Please re-upload this material.' });
    }

    res.setHeader('Content-Type', material.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(material.name)}"`);
    res.setHeader('Content-Length', material.fileData.length);
    res.send(material.fileData);
  } catch (error) {
    console.error('ELearning view error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/elearning/:id
 * Soft delete E-Learning material (admin only)
 */
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const material = await DocumentManagement.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ message: 'E-Learning material not found' });
    }

    if (material.category !== 'e_learning') {
      return res.status(400).json({ message: 'Not an E-Learning material' });
    }

    // Soft delete
    material.isActive = false;
    await material.save();

    console.log('E-Learning material deleted:', material._id);

    res.json({
      message: 'E-Learning material deleted successfully'
    });
  } catch (error) {
    console.error('Delete E-Learning material error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
