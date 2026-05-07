'use strict';
/**
 * Authentication Middleware
 * Extracted from server.js — single source of truth for JWT/session auth.
 *
 * Exported:
 *   asyncHandler        – wrap async route handlers to forward errors to the global error handler
 *   authenticateSession – verify JWT (Bearer header, query param, or multipart) then fall back to session
 */

const jwt = require('jsonwebtoken');
const envConfig = require('../config/environment');
const EmployeeHub = require('../models/EmployeesHub');
const config    = envConfig.getConfig();
const JWT_SECRET = config.jwt.secret;

// ── asyncHandler ─────────────────────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── role/context enrichment ─────────────────────────────────────────────
const MANAGER_ROLES = ['manager', 'senior-manager', 'admin', 'super-admin'];
const ADMIN_ROLES = ['admin', 'super-admin'];

const enrichRoleFlags = (req) => {
  if (!req.user) return;

  req.user.isManager = MANAGER_ROLES.includes(req.user.role);
  req.user.isAdmin = ADMIN_ROLES.includes(req.user.role);
  req.user.isSuperAdmin = req.user.role === 'super-admin';
};

const attachEmployeeContext = async (req) => {
  try {
    // already mapped from token/session
    if (req.employeeHubId || req.user?.employeeId) return;

    const email = req.user?.email;
    if (!email) return;

    const employee = await EmployeeHub.findOne({ email: String(email).toLowerCase() })
      .select('_id managerId department role')
      .lean();

    if (!employee) return;

    req.employeeHubId = employee._id;
    req.user.employeeId = employee._id;
    req.user.managerId = employee.managerId || null;
    req.user.department = req.user.department || employee.department;

    // keep role if not present in token/session payload
    if (!req.user.role && employee.role) {
      req.user.role = employee.role;
    }
  } catch (error) {
    console.error('Authentication context enrichment error:', error.message);
  }
};

// ── authenticateSession ──────────────────────────────────────────────────
const authenticateSession = async (req, res, next) => {
  try {
    const isMultipart = req.headers['content-type']?.includes('multipart/form-data');
    const authHeader  = req.headers['authorization'];
    const queryToken  = req.query.token;

    // Try JWT first (header, query param, or multipart requests)
    if (authHeader || queryToken || isMultipart) {
      const token = queryToken || (authHeader && authHeader.split(' ')[1]);
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);

          // ── Normalize id/_id ──────────────────────────────────────────
          if (decoded.id  && !decoded._id) decoded._id = decoded.id;
          if (decoded._id && !decoded.id)  decoded.id  = decoded._id;

          // ── Path 1: three clean convenience fields ────────────────────
          // req.employeeHubId → EmployeeHub ObjectId (null for admin/profile
          //                     who have no EmployeeHub record)
          // req.userId        → User ObjectId (null for employees)
          // req.actorId       → primary _id — whichever collection owns this token
          req.employeeHubId = decoded.employeeHubId || null;
          req.userId        = decoded.userId        || null;
          req.actorId       = decoded.id;

          // ── req.user: backward-compatible for all existing routes ──────
          // CRITICAL: req.user.employeeId is mapped to the EmployeeHub ObjectId
          // (decoded.employeeHubId), NOT to the string "EMP-1001" and NOT to a
          // User._id. Routes that did `req.user.employeeId || userId` previously
          // got a User._id as fallback for admins — now they get null, which is
          // the correct fail-fast behaviour for operations that require an employee.
          req.user = {
            ...decoded,
            _id:        decoded.id,
            employeeId: decoded.employeeHubId || null,
          };

          enrichRoleFlags(req);
          await attachEmployeeContext(req);
          enrichRoleFlags(req);

          // Keep session in sync
          if (req.session) {
            req.session.user = req.user;
            req.session.save((err) => {
              if (err) console.error('\u274c Session save error in middleware:', err);
            });
          }
          return next();
        } catch (tokenError) {
          console.error('JWT verification failed:', tokenError.message);
          // Fall through to session check
        }
      }
    }

    // Fall back to session
    if (req.session && req.session.user) {
      const sessionUser    = req.session.user;
      req.user             = sessionUser;
      req.employeeHubId    = sessionUser.employeeHubId || sessionUser.employeeId || null;
      req.userId           = sessionUser.userId        || null;
      req.actorId          = sessionUser._id || sessionUser.id;

      enrichRoleFlags(req);
      await attachEmployeeContext(req);
      enrichRoleFlags(req);

      return next();
    }

    return res.status(401).json({ message: 'Authentication required' });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

// Legacy alias
const authenticateToken = authenticateSession;

// ── requireRole ──────────────────────────────────────────────────────────
/**
 * Authorization middleware to check if the user has one of the required roles.
 * Must be used AFTER authenticateSession in the middleware chain.
 * 
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 * @returns {Function} Express middleware function
 * 
 * Usage:
 *   router.post('/api/teams', authenticateSession, requireRole('admin'), createTeam);
 *   router.get('/api/reports', authenticateSession, requireRole(['manager', 'admin']), getReport);
 */
const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const userRole = req.user.role;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}. You have: ${userRole || 'none'}`
      });
    }
    
    next();
  };
};

module.exports = { asyncHandler, authenticateSession, authenticateToken, requireRole };
