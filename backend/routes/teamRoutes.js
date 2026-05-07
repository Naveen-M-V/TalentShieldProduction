const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticateSession, requireRole } = require('../middleware/auth');
const { MANAGER_SCOPE_ROLES, ADMIN_SCOPE_ROLES } = require('../utils/roles');

// Team CRUD operations
// GET operations: accessible to authenticated users
router.get('/', authenticateSession, teamController.getAllTeams);
router.get('/:id', authenticateSession, teamController.getTeamById);

// POST/PUT/DELETE operations: restricted to manager/admin roles
router.post('/', authenticateSession, requireRole(MANAGER_SCOPE_ROLES), teamController.createTeam);
router.put('/:id', authenticateSession, requireRole(MANAGER_SCOPE_ROLES), teamController.updateTeam);
router.delete('/:id', authenticateSession, requireRole(ADMIN_SCOPE_ROLES), teamController.deleteTeam);

// Team member management: restricted to manager/admin roles
router.post('/:id/members/add', authenticateSession, requireRole(MANAGER_SCOPE_ROLES), teamController.addMemberToTeam);
router.post('/:id/members/remove', authenticateSession, requireRole(MANAGER_SCOPE_ROLES), teamController.removeMemberFromTeam);

module.exports = router;
