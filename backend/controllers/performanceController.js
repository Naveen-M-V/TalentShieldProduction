const Goal = require('../models/Goal');
const Review = require('../models/Review');
const EmployeesHub = require('../models/EmployeesHub');
const PerformanceNote = require('../models/PerformanceNote');
const DisciplinaryRecord = require('../models/DisciplinaryRecord');
const ImprovementPlan = require('../models/ImprovementPlan');
const mongoose = require('mongoose');
const { resolveActorId } = require('../utils/identityHelper');

// ==================== GOAL CONTROLLERS ====================

// Get all goals
exports.getAllGoals = async (req, res) => {
    try {
        const { status, assignee, search } = req.query;

        let query = {};

        // Filter by status
        if (status && status !== 'all') {
            query.status = status;
        }

        // Filter by assignee
        if (assignee && assignee !== 'all') {
            query.assignee = assignee;
        }

        // Search by goal name
        if (search) {
            query.goalName = { $regex: search, $options: 'i' };
        }

        const goals = await Goal.find(query)
            .populate('assignee', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 });

        res.json(goals);
    } catch (error) {
        console.error('Error fetching goals:', error);
        res.status(500).json({ message: 'Error fetching goals', error: error.message });
    }
};

// Get goals by user (for "My goals" view)
exports.getMyGoals = async (req, res) => {
    try {
        const authId = resolveActorId(req);

        if (!authId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        let employee = null;

        const authIdStr = String(authId).trim();
        const isValidObjectId = mongoose.Types.ObjectId.isValid(authIdStr);

        // Try as EmployeesHub _id first (employee login tokens are issued from EmployeesHub)
        if (isValidObjectId) {
            employee = await EmployeesHub.findById(authIdStr);
        }

        // Try as User _id link next (profile/admin tokens are issued from User model)
        if (!employee) {
            if (isValidObjectId) {
                employee = await EmployeesHub.findOne({ userId: authIdStr });
            }
        }

        // Fallback: some records may not have userId linked; try email match
        if (!employee && req.user?.email) {
            employee = await EmployeesHub.findOne({ email: String(req.user.email).toLowerCase() });
        }

        if (!employee) {
            return res.status(404).json({ message: 'Employee record not found' });
        }

        const goals = await Goal.find({ assignee: employee._id })
            .populate('assignee', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 });

        res.json(goals);
    } catch (error) {
        console.error('Error fetching my goals:', error);
        res.status(500).json({ message: 'Error fetching goals', error: error.message });
    }
};

// Get single goal
exports.getGoalById = async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id)
            .populate('assignee', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName');

        if (!goal) {
            return res.status(404).json({ message: 'Goal not found' });
        }

        res.json(goal);
    } catch (error) {
        console.error('Error fetching goal:', error);
        res.status(500).json({ message: 'Error fetching goal', error: error.message });
    }
};

// Create new goal
exports.createGoal = async (req, res) => {
    try {
        const { goalName, description, assignee, startDate, dueDate, measurementType } = req.body;

        // Validate required fields (description is optional on the API)
        if (!goalName || !assignee || !startDate || !dueDate || !measurementType) {
            return res.status(400).json({ message: 'Goal name, assignee, start date, due date, and measurement type are required' });
        }

        // Ensure description is always set (Goal model expects a value)
        const safeDescription = description || '';

        if (!mongoose.Types.ObjectId.isValid(assignee)) {
            return res.status(400).json({ message: 'Invalid assignee' });
        }

        // Validate assignee exists
        const assigneeEmployee = await EmployeesHub.findById(assignee);
        if (!assigneeEmployee) return res.status(400).json({ message: 'Assignee employee not found' });

        // Validate dates
        const sDate = new Date(startDate);
        const dDate = new Date(dueDate);
        if (isNaN(sDate.getTime()) || isNaN(dDate.getTime())) {
            return res.status(400).json({ message: 'Invalid startDate or dueDate' });
        }
        if (dDate <= sDate) return res.status(400).json({ message: 'dueDate must be after startDate' });

        // Validate measurementType
        const allowedMeasurements = ['Yes/No', 'Progress (%)', 'Numeric Target', 'Milestones'];
        if (!allowedMeasurements.includes(measurementType)) return res.status(400).json({ message: 'Invalid measurementType' });

        // Determine createdBy value from session
        const createdBy = (req.user && (req.user.id || req.user._id)) || null;
        if (!createdBy) return res.status(400).json({ message: 'Authenticated user required' });

        if (!mongoose.Types.ObjectId.isValid(createdBy)) {
            return res.status(400).json({ message: 'Invalid authenticated user id' });
        }

        // Create goal
        const goal = new Goal({
            goalName,
            description: safeDescription,
            assignee,
            startDate: sDate,
            dueDate: dDate,
            measurementType,
            createdBy
        });

        await goal.save();

        // Create linked review (non-fatal if it fails)
        let review = null;
        try {
            review = new Review({
                reviewTitle: goalName,
                assignedTo: assignee,
                manager: assigneeEmployee?.managerId || null,
                startDate: sDate,
                dueDate: dDate,
                status: 'Not complete',
                linkedGoal: goal._id,
                reviewType: 'Goal-based'
            });
            await review.save();
        } catch (rvErr) {
            console.error('Failed to create linked review:', rvErr);
            // don't fail the whole request; return goal with warning
        }

        // Populate and return the created goal
        const populatedGoal = await Goal.findById(goal._id)
            .populate('assignee', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName');

        res.status(201).json({
            message: 'Goal created successfully',
            goal: populatedGoal,
            review
        });
    } catch (error) {
        console.error('Error creating goal:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid input', error: error.message });
        }
        // If validation error from Mongoose, return 400 with details
        if (error.name === 'ValidationError') {
            const details = Object.keys(error.errors).reduce((acc, key) => {
                acc[key] = error.errors[key].message;
                return acc;
            }, {});
            return res.status(400).json({ message: 'Validation failed', details });
        }
        res.status(500).json({ message: 'Error creating goal', error: error.message });
    }
};

// Update goal
exports.updateGoal = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const goal = await Goal.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        )
            .populate('assignee', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName');

        if (!goal) {
            return res.status(404).json({ message: 'Goal not found' });
        }

        // Update linked review if goal name or dates changed
        if (updates.goalName || updates.startDate || updates.dueDate) {
            const reviewUpdates = {};
            if (updates.goalName) reviewUpdates.reviewTitle = updates.goalName;
            if (updates.startDate) reviewUpdates.startDate = updates.startDate;
            if (updates.dueDate) reviewUpdates.dueDate = updates.dueDate;

            await Review.findOneAndUpdate(
                { linkedGoal: id },
                { $set: reviewUpdates }
            );
        }

        res.json({ message: 'Goal updated successfully', goal });
    } catch (error) {
        console.error('Error updating goal:', error);
        res.status(500).json({ message: 'Error updating goal', error: error.message });
    }
};

// Delete goal
exports.deleteGoal = async (req, res) => {
    try {
        const { id } = req.params;

        const goal = await Goal.findByIdAndDelete(id);

        if (!goal) {
            return res.status(404).json({ message: 'Goal not found' });
        }

        // Delete linked review
        await Review.findOneAndDelete({ linkedGoal: id });

        res.json({ message: 'Goal and linked review deleted successfully' });
    } catch (error) {
        console.error('Error deleting goal:', error);
        res.status(500).json({ message: 'Error deleting goal', error: error.message });
    }
};

// ==================== REVIEW CONTROLLERS ====================

// Get all reviews
exports.getAllReviews = async (req, res) => {
    try {
        const { status, assignedTo } = req.query;


        let query = {};

        // PATCH: Restrict managers to their own team
        const userRole = req.user?.role || req.session?.user?.role;
        if (userRole === 'manager') {
            // Find manager's team
            const managerId = req.user?.employeeId || req.user?._id || req.session?.user?.employeeId || req.session?.user?._id;
            const EmployeesHub = require('../models/EmployeesHub');
            const hierarchyHelper = require('../utils/hierarchyHelper');
            const manager = await EmployeesHub.findById(managerId);
            if (manager) {
                const teamMembers = await hierarchyHelper.getSubordinates(manager._id, false);
                const teamIds = teamMembers.map((member) => member._id);
                query.assignedTo = { $in: teamIds };
            } else {
                query.assignedTo = { $in: [] };
            }
        }

        // Filter by status
        if (status && status !== 'all') {
            query.status = status;
        }

        // Filter by assignedTo (override if manager restriction is applied)
        if (assignedTo && assignedTo !== 'all' && (!query.assignedTo || userRole !== 'manager')) {
            query.assignedTo = assignedTo;
        }

        const reviews = await Review.find(query)
            .populate('assignedTo', 'firstName lastName email')
            .populate('manager', 'firstName lastName')
            .populate('linkedGoal', 'goalName')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Error fetching reviews', error: error.message });
    }
};

// Get reviews assigned to me
exports.getMyReviews = async (req, res) => {
    try {
        const authId = resolveActorId(req);
        if (!authId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        let employee = null;
        const authIdStr = String(authId).trim();
        const isValidObjectId = mongoose.Types.ObjectId.isValid(authIdStr);
        if (isValidObjectId) {
            employee = await EmployeesHub.findById(authIdStr);
        }
        if (!employee) {
            if (isValidObjectId) {
                employee = await EmployeesHub.findOne({ userId: authIdStr });
            }
        }
        if (!employee && req.user?.email) {
            employee = await EmployeesHub.findOne({ email: String(req.user.email).toLowerCase() });
        }
        if (!employee) {
            return res.status(404).json({ message: 'Employee record not found' });
        }
        // PATCH: Manager self-performance section
        // If manager, show reviews assigned to self
        const userRole = req.user?.role || req.session?.user?.role;
        let reviews = [];
        if (userRole === 'manager') {
            reviews = await Review.find({ assignedTo: employee._id })
                .populate('assignedTo', 'firstName lastName email')
                .populate('manager', 'firstName lastName')
                .populate('linkedGoal', 'goalName')
                .sort({ createdAt: -1 });
        } else {
            reviews = await Review.find({ assignedTo: employee._id })
                .populate('assignedTo', 'firstName lastName email')
                .populate('manager', 'firstName lastName')
                .populate('linkedGoal', 'goalName')
                .sort({ createdAt: -1 });
        }
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching my reviews:', error);
        res.status(500).json({ message: 'Error fetching reviews', error: error.message });
    }
};

// Get single review
exports.getReviewById = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id)
            .populate('assignedTo', 'firstName lastName email')
            .populate('manager', 'firstName lastName')
            .populate('linkedGoal', 'goalName');

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        res.json(review);
    } catch (error) {
        console.error('Error fetching review:', error);
        res.status(500).json({ message: 'Error fetching review', error: error.message });
    }
};

// Update review
exports.updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // If marking as completed, set completedDate
        if (updates.status === 'Completed' && !updates.completedDate) {
            updates.completedDate = new Date();
        }

        const review = await Review.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        )
            .populate('assignedTo', 'firstName lastName email')
            .populate('manager', 'firstName lastName')
            .populate('linkedGoal', 'goalName');

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // PATCH: Notify admin/super-admin if manager self-review is updated
        const EmployeesHub = require('../models/EmployeesHub');
        const User = require('../models/User');
        const { ADMIN_ROLES } = require('../utils/roles');
        if (review && review.assignedTo) {
            const assignedEmployee = await EmployeesHub.findById(review.assignedTo);
            if (assignedEmployee && assignedEmployee.role === 'manager') {
                // Find admin/super-admin users
            const admins = await User.find({ role: { $in: ADMIN_ROLES } });
                // Send notification (placeholder, implement actual notification logic)
                admins.forEach(admin => {
                    // TODO: Replace with actual notification/email logic
                    console.log(`Notify admin (${admin.email}) about manager self-review update.`);
                });
            }
        }
        res.json({ message: 'Review updated successfully', review });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ message: 'Error updating review', error: error.message });
    }
};

// Delete review
exports.deleteReview = async (req, res) => {
    try {
        const { id } = req.params;

        const review = await Review.findByIdAndDelete(id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ message: 'Error deleting review', error: error.message });
    }
};

// ==================== PERFORMANCE NOTES ====================

// Create a performance note (admin/hr/manager)
exports.createNote = async (req, res) => {
    try {
        const { employeeId, content, visibility } = req.body;

        if (!employeeId || !content) return res.status(400).json({ message: 'employeeId and content are required' });
        if (content.length > 5000) return res.status(400).json({ message: 'Content too long (max 5000 chars)' });

        // Check permissions: admin/super-admin or manager of the employee or hr
        const userRole = req.user.role;

        const employee = await EmployeesHub.findById(employeeId);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        let allowed = false;
        if (userRole === 'admin' || userRole === 'super-admin') allowed = true;

        if (!allowed) {
            // Determine if current user is manager of employee
            const managerRecord = await EmployeesHub.findOne({ userId: req.user.id });
            if (managerRecord && managerRecord._id.equals(employee.managerId)) allowed = true;
            if (managerRecord && managerRecord.role === 'hr') allowed = true;
        }

        if (!allowed) return res.status(403).json({ message: 'Access denied' });

        const note = new PerformanceNote({
            employee: employeeId,
            createdBy: req.user.id,
            content,
            visibility: visibility || 'hr_manager_only'
        });

        await note.save();

        res.status(201).json({ message: 'Note created', note });
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ message: 'Error creating note', error: error.message });
    }
};

// Get notes for an employee (only hr/manager/admin or the manager can view)
exports.getNotesForEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;
        if (!employeeId) return res.status(400).json({ message: 'employeeId required' });

        const employee = await EmployeesHub.findById(employeeId);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const userRole = req.user.role;
        let allowed = false;
        if (userRole === 'admin' || userRole === 'super-admin') allowed = true;

        if (!allowed) {
            const managerRecord = await EmployeesHub.findOne({ userId: req.user.id });
            if (managerRecord && managerRecord._id.equals(employee.managerId)) allowed = true;
            if (managerRecord && managerRecord.role === 'hr') allowed = true;
        }

        if (!allowed) return res.status(403).json({ message: 'Access denied' });

        const notes = await PerformanceNote.find({ employee: employeeId }).populate('createdBy', 'firstName lastName email').sort({ createdAt: -1 });

        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ message: 'Error fetching notes', error: error.message });
    }
};

// Delete a note (admin or creator)
exports.deleteNote = async (req, res) => {
    try {
        const { id } = req.params;
        const note = await PerformanceNote.findById(id);
        if (!note) return res.status(404).json({ message: 'Note not found' });

        const userRole = req.user.role;
        if (userRole !== 'admin' && userRole !== 'super-admin' && note.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await note.remove();
        res.json({ message: 'Note deleted' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ message: 'Error deleting note', error: error.message });
    }
};

// ==================== DISCIPLINARY RECORDS ====================

exports.createDisciplinary = async (req, res) => {
    try {
        const { employeeId, type, reason, outcome, attachments } = req.body;
        if (!employeeId || !type || !reason) return res.status(400).json({ message: 'employeeId, type and reason are required' });
        const allowedTypes = ['verbal','written','final'];
        if (!allowedTypes.includes(type)) return res.status(400).json({ message: 'Invalid disciplinary type' });
        if (reason.length > 2000) return res.status(400).json({ message: 'Reason too long (max 2000 chars)' });

        // Only admin/super-admin or hr can create disciplinary records
        const userRole = req.user.role;
        if (userRole !== 'admin' && userRole !== 'super-admin') {
            const requester = await EmployeesHub.findOne({ userId: req.user.id });
            if (!requester || requester.role !== 'hr') return res.status(403).json({ message: 'Access denied' });
        }

        const record = new DisciplinaryRecord({
            employee: employeeId,
            createdBy: req.user.id,
            type,
            reason,
            outcome: outcome || '',
            attachments: attachments || []
        });

        await record.save();
        res.status(201).json({ message: 'Disciplinary record created', record });
    } catch (error) {
        console.error('Error creating disciplinary record:', error);
        res.status(500).json({ message: 'Error creating record', error: error.message });
    }
};

exports.getDisciplinaryForEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;
        if (!employeeId) return res.status(400).json({ message: 'employeeId required' });

        const userRole = req.user.role;
        // Admin/super-admin and hr can view; employees can view their own records
        if (userRole !== 'admin' && userRole !== 'super-admin') {
            const requester = await EmployeesHub.findOne({ userId: req.user.id });
            if (!requester) return res.status(403).json({ message: 'Access denied' });
            if (requester._id.equals(employeeId) === false && requester.role !== 'hr') {
                // allow managers to view if they are manager
                const target = await EmployeesHub.findById(employeeId);
                if (!target) return res.status(404).json({ message: 'Employee not found' });
                if (!requester._id.equals(target.managerId)) return res.status(403).json({ message: 'Access denied' });
            }
        }

        const records = await DisciplinaryRecord.find({ employee: employeeId }).populate('createdBy', 'firstName lastName email').sort({ createdAt: -1 });
        res.json(records);
    } catch (error) {
        console.error('Error fetching disciplinary records:', error);
        res.status(500).json({ message: 'Error fetching records', error: error.message });
    }
};

// ==================== IMPROVEMENT PLANS (PIP) ====================

exports.createImprovementPlan = async (req, res) => {
    try {
        const { employeeId, startDate, endDate, goals } = req.body;
        if (!employeeId || !startDate) return res.status(400).json({ message: 'employeeId and startDate are required' });
        // Validate dates
        const start = new Date(startDate);
        if (isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid startDate' });
        let end = null;
        if (endDate) {
            end = new Date(endDate);
            if (isNaN(end.getTime())) return res.status(400).json({ message: 'Invalid endDate' });
        }
        // Validate goals structure
        if (goals && !Array.isArray(goals)) return res.status(400).json({ message: 'goals must be an array' });

        const userRole = req.user.role;
        if (userRole !== 'admin' && userRole !== 'super-admin') {
            const requester = await EmployeesHub.findOne({ userId: req.user.id });
            if (!requester || (requester.role !== 'hr' && requester.role !== 'manager')) return res.status(403).json({ message: 'Access denied' });
        }

        const pip = new ImprovementPlan({
            employee: employeeId,
            createdBy: req.user.id,
            startDate,
            endDate,
            goals: goals || []
        });

        await pip.save();
        res.status(201).json({ message: 'Improvement plan created', pip });
    } catch (error) {
        console.error('Error creating improvement plan:', error);
        res.status(500).json({ message: 'Error creating plan', error: error.message });
    }
};

exports.getImprovementPlansForEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;
        if (!employeeId) return res.status(400).json({ message: 'employeeId required' });

        const userRole = req.user.role;
        if (userRole !== 'admin' && userRole !== 'super-admin') {
            const requester = await EmployeesHub.findOne({ userId: req.user.id });
            if (!requester) return res.status(403).json({ message: 'Access denied' });
            if (!requester._id.equals(employeeId) && requester.role !== 'hr') {
                const target = await EmployeesHub.findById(employeeId);
                if (!target) return res.status(404).json({ message: 'Employee not found' });
                if (!requester._id.equals(target.managerId)) return res.status(403).json({ message: 'Access denied' });
            }
        }

        const plans = await ImprovementPlan.find({ employee: employeeId }).sort({ startDate: -1 });
        res.json(plans);
    } catch (error) {
        console.error('Error fetching improvement plans:', error);
        res.status(500).json({ message: 'Error fetching plans', error: error.message });
    }
};

