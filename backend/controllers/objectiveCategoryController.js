const ObjectiveCategory = require('../models/ObjectiveCategory');
const AuditLog = require('../models/AuditLog');
const { ADMIN_SCOPE_ROLES } = require('../utils/roles');

/**
 * Get all objective categories
 * @route GET /api/objective-categories
 * @access Authenticated
 */
exports.getCategories = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    
    const filter = includeInactive === 'true' ? {} : { isActive: true };
    
    const categories = await ObjectiveCategory.find(filter)
      .populate('createdBy', 'name email')
      .sort({ isDefault: -1, name: 1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

/**
 * Create new objective category
 * @route POST /api/objective-categories
 * @access Manager only (admin, super-admin, hr)
 */
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user._id || req.user.id;

    // Check if user is manager
    if (!ADMIN_SCOPE_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create categories'
      });
    }

    // Check for duplicate name
    const existing = await ObjectiveCategory.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    const category = await ObjectiveCategory.create({
      name,
      createdBy: userId,
      isDefault: false,
      isActive: true
    });

    // Audit log
    await AuditLog.create({
      entityType: 'ObjectiveCategory',
      entityId: category._id,
      action: 'create',
      changedBy: userId,
      changedByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
      changes: { name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

/**
 * Update objective category
 * @route PUT /api/objective-categories/:id
 * @access Manager only
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    const userId = req.user._id || req.user.id;

    // Check if user is manager
    if (!ADMIN_SCOPE_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update categories'
      });
    }

    const category = await ObjectiveCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Prevent editing default categories' names
    if (category.isDefault && name && name !== category.name) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change name of default categories'
      });
    }

    // Check for duplicate name if changing
    if (name && name !== category.name) {
      const duplicate = await ObjectiveCategory.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name}$`, 'i') }
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    const oldValues = { name: category.name, isActive: category.isActive };

    if (name) category.name = name;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    // Audit log
    await AuditLog.create({
      entityType: 'ObjectiveCategory',
      entityId: category._id,
      action: 'update',
      changedBy: userId,
      changedByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
      changes: { old: oldValues, new: { name: category.name, isActive: category.isActive } },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

/**
 * Delete objective category
 * @route DELETE /api/objective-categories/:id
 * @access Manager only
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    // Check if user is manager
    if (!ADMIN_SCOPE_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete categories'
      });
    }

    const category = await ObjectiveCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Prevent deleting default categories
    if (category.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default categories'
      });
    }

    // Check if category is in use
    const Goal = require('../models/Goal');
    const goalsUsingCategory = await Goal.countDocuments({ category: category.name });

    if (goalsUsingCategory > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${goalsUsingCategory} objective(s) are using this category.`,
        inUseCount: goalsUsingCategory
      });
    }

    await category.deleteOne();

    // Audit log
    await AuditLog.create({
      entityType: 'ObjectiveCategory',
      entityId: category._id,
      action: 'delete',
      changedBy: userId,
      changedByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
      changes: { name: category.name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};
