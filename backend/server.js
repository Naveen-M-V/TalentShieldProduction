'use strict';
// server.js — Application entry point (refactored from 4024 → ~430 lines)
// All inline route handlers and schemas extracted into dedicated files under
// middleware/, routes/, models/, and utils/.

const express      = require('express');
const mongoose     = require('mongoose');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const cron         = require('node-cron');
const cookieParser = require('cookie-parser');

const envConfig = require('./config/environment');
const config    = envConfig.getConfig();

const { startCertificateMonitoring, triggerCertificateCheck } = require('./utils/certificateMonitor');
const { startAllCertificateSchedulers }                        = require('./utils/certificateScheduler');
const { runExpiryChecks }                                      = require('./scripts/documentExpiryChecker');
const { scheduleAbsenceDetection }                             = require('./cron/absenceDetectionCron');

const app         = express();
const PORT        = config.server.port;
const JWT_SECRET  = config.jwt.secret;
const MONGODB_URI = config.database.uri;

// ─── SECURITY & PARSING ────────────────────────────────────────────────────
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const isProduction = config.environment === 'production' || process.env.NODE_ENV === 'production';
const authRateLimitEnabled =
  process.env.AUTH_RATE_LIMIT_ENABLED != null
    ? process.env.AUTH_RATE_LIMIT_ENABLED === 'true'
    : isProduction;

const authRateLimiter = authRateLimitEnabled
  ? rateLimit({
      windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
      max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many attempts from this IP, please try again in 15 minutes.' },
      skip: () => process.env.NODE_ENV === 'test',
    })
  : (req, res, next) => next();

require('./middleware/sessionConfig')(app, { mongoUri: MONGODB_URI, jwtSecret: JWT_SECRET });
require('./middleware/corsConfig')(app);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── EAGER MODEL REGISTRATION ──────────────────────────────────────────────
// Load all models once at startup to prevent OverwriteModelError when routes
// require the same model later.
require('./models/User');
require('./models/Profile');
require('./models/Supplier');
require('./models/JobRole');
require('./models/JobTitle');
require('./models/JobLevel');
require('./models/CertificateName');
require('./models/ObjectiveCategory');
require('./models/ObjectiveRequest');
require('./models/PerformanceReview');
require('./models/AuditLog');
require('./models/ELearningCompletion');
require('./models/AnnualLeaveBalance');
require('./models/ArchiveEmployee');
require('./models/DisciplinaryRecord');
require('./models/Document');
require('./models/DocumentManagement');
require('./models/EmployeesHub');
require('./models/Expense');
require('./models/Folder');
require('./models/Goal');
require('./models/ImprovementPlan');
require('./models/LatenessRecord');
require('./models/LeaveRecord');
require('./models/LeaveRequest');
require('./models/Notification');
require('./models/Overtime');
require('./models/PayrollException');
require('./models/PerformanceNote');
require('./models/Review');
require('./models/ReviewEmployeeComment');
require('./models/Rota');
require('./models/Shift');
require('./models/ShiftAssignment');
require('./models/Sickness');
require('./models/Team');
require('./models/TimeEntry');

// ─── INLINE LEGACY SCHEMAS ─────────────────────────────────────────────────
// Certificate and Notification have two schema variants:
//   • Legacy  (this file) — used by /api/profiles and /api/certificates routes
//   • Unified (models/)  — used by newer employee-hub routes
// The legacy models MUST be registered here, before any route file loads, so
// that mongoose.models.Certificate / Notification are already set.

const parseDateString = (dateString) => {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;
  try {
    const clean = dateString.toString().trim();
    let date;
    if      (clean.match(/^\d{4}-\d{2}-\d{2}/))       { date = new Date(clean); }
    else if (clean.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [day, month, year] = clean.split('/');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else { date = new Date(clean); }
    return isNaN(date.getTime()) ? null : date;
  } catch { return null; }
};

const legacyCertificateSchema = new mongoose.Schema({
  certificate   : { type: String, required: true },
  description   : String,
  account       : String,
  issueDate     : { type: Date },
  expiryDate    : { type: Date },
  profileId     : { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' },
  profileName   : String,
  provider      : String,
  fileRequired  : { type: String, default: 'No' },
  active        : { type: String, default: 'Yes' },
  status        : { type: String, default: 'Approved' },
  cost          : { type: Number, default: 0 },
  category      : { type: String, required: true },
  jobRole       : String,
  approvalStatus: String,
  isInterim     : { type: Boolean, default: false },
  timeLogged    : {
    days   : { type: Number, default: 0 },
    hours  : { type: Number, default: 0 },
    minutes: { type: Number, default: 0 },
  },
  supplier        : String,
  totalCost       : { type: Number, default: 0 },
  certificateFile : String,
  fileData        : Buffer,
  fileSize        : Number,
  mimeType        : String,
  archived        : { type: String, default: 'Unarchived' },
  createdOn       : { type: Date, default: Date.now },
  updatedOn       : { type: Date, default: Date.now },
});
// Compound-only indexes — no single-field "index: true" duplication
legacyCertificateSchema.index({ expiryDate: 1, profileId: 1 });
legacyCertificateSchema.index({ category: 1, status: 1 });
legacyCertificateSchema.index({ createdOn: -1 });
legacyCertificateSchema.pre('save', function (next) {
  if (this.issueDate  && typeof this.issueDate  === 'string') this.issueDate  = parseDateString(this.issueDate);
  if (this.expiryDate && typeof this.expiryDate === 'string') this.expiryDate = parseDateString(this.expiryDate);
  if (this.issueDate && this.expiryDate && this.expiryDate <= this.issueDate)
    return next(new Error('Expiry date must be after issue date'));
  if (typeof this.cost      === 'string') this.cost      = parseFloat(this.cost)      || 0;
  if (typeof this.totalCost === 'string') this.totalCost = parseFloat(this.totalCost) || 0;
  if (typeof this.isInterim === 'string') this.isInterim = ['true', 'yes'].includes(this.isInterim.toLowerCase());
  this.updatedOn = Date.now();
  next();
});
// Guard: only define once even if hot-reloaded (e.g. by Jest)
const Certificate = mongoose.models.Certificate || mongoose.model('Certificate', legacyCertificateSchema);

const legacyNotificationSchema = new mongoose.Schema({
  userId  : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type    : {
    type: String, required: true,
    enum: [
      'profile_created', 'profile_updated', 'profile_deleted',
      'certificate_created', 'certificate_updated', 'certificate_deleted',
      'certificate_expiry', 'certificate_expired',
      'user_created', 'system_notification', 'general',
    ],
  },
  priority : { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  message  : { type: String, required: true },
  title    : String,
  read     : { type: Boolean, default: false },
  createdOn: { type: Date, default: Date.now },
  readOn   : Date,
  metadata : mongoose.Schema.Types.Mixed,
});
legacyNotificationSchema.index({ userId: 1, createdOn: -1 });
legacyNotificationSchema.index({ userId: 1, read: 1 });
const Notification = mongoose.models.Notification || mongoose.model('Notification', legacyNotificationSchema);

// ─── DATABASE CONNECTION ────────────────────────────────────────────────────
mongoose.set('strictQuery', false);

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    startAllCertificateSchedulers();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

mongoose.connection.on('connected', () => {
  console.log('🟢 Connected to MongoDB');
  const User = mongoose.model('User');
  User.ensureAdminExists().catch(err => console.error('Error ensuring admin exists:', err));
  const { seedDefaultCategories } = require('./utils/startup');
  seedDefaultCategories().catch(err => console.error('Error seeding objective categories:', err));
  startAllCertificateSchedulers();
});
mongoose.connection.on('error',        err => console.error('❌ MongoDB error:', err));
mongoose.connection.on('disconnected', ()  => console.log('⚠️  MongoDB disconnected'));

// ─── STATIC FILE SERVING — uploads folder ─────────────────────────────────
// Must be registered BEFORE route middleware so direct file URLs resolve.
// e.g. GET http://localhost:5003/uploads/elearning/elearning-xxx.pdf
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── AUTH MIDDLEWARE RE-EXPORT ──────────────────────────────────────────────
// Some existing route files (clockRoutes, etc.) were updated to import directly
// from middleware/auth, but this re-export keeps backward compatibility in case
// any external script still references server.js exports.
const { asyncHandler, authenticateSession } = require('./middleware/auth');
module.exports.asyncHandler        = asyncHandler;
module.exports.authenticateSession = authenticateSession;

// ─── ROUTE MOUNTING ────────────────────────────────────────────────────────
// Public / lightly-guarded routes first
app.use('/api/auth',              authRateLimiter, require('./routes/auth'));
app.use('/api/profiles',          require('./routes/profiles'));
app.use('/api/certificates',      require('./routes/legacyCertificateRoutes'));
app.use('/api/suppliers',         require('./routes/suppliersRoutes'));
app.use('/api/job-titles',        require('./routes/jobTitlesRoutes'));
app.use('/api/job-levels',        require('./routes/jobLevels'));
app.use('/api/certificate-names', require('./routes/certificateNamesRoutes'));
app.use('/api/job-roles',         require('./routes/jobRoles'));
app.use('/api',                   require('./routes/bulkJobRoles'));
app.use('/api',                   require('./routes/adminRoutes'));

// Authenticated routes
app.use('/api/notifications',        authenticateSession, require('./routes/notifications'));
app.use('/api/rota',                 authenticateSession, require('./routes/rotaRoutes'));
app.use('/api/clock',                authenticateSession, require('./routes/clockRoutes'));
app.use('/api/leave-requests',       authenticateSession, require('./routes/leaveRequestRoutes'));
// unified leave stack — legacy removed 2026-04-09
app.use('/api/leave',                authenticateSession, require('./routes/unifiedLeaveRoutes'));
app.use('/api/teams',                authenticateSession, require('./routes/teamRoutes'));
app.use('/api/employees',            authenticateSession, require('./routes/employeeHubRoutes'));
app.use('/api/employee-profile',     authenticateSession, require('./routes/employeeProfile'));
app.use('/api/documentManagement',   authenticateSession, require('./routes/documentManagement'));
app.use('/api/approvals',            authenticateSession, require('./routes/approvalRoutes'));
app.use('/api/certificates',         authenticateSession, require('./routes/certificates'));
app.use('/api/reports',              authenticateSession, require('./routes/reportingRoutes'));
app.use('/api/report-library',       authenticateSession, require('./routes/reportLibraryRoutes'));
app.use('/api/expenses',             authenticateSession, require('./routes/expenseRoutes'));
app.use('/api/performance',          authenticateSession, require('./routes/performanceRoutes'));
app.use('/api/manager',              authenticateSession, require('./routes/managerRoutes'));
app.use('/api/goals',                authenticateSession, require('./routes/goalsRoutes'));
app.use('/api/objective-categories', authenticateSession, require('./routes/objectiveCategoryRoutes'));
app.use('/api/objective-requests',   authenticateSession, require('./routes/objectiveRequestRoutes'));
app.use('/api/performance-reviews',  authenticateSession, require('./routes/performanceReviewRoutes'));
app.use('/api/reviews',              authenticateSession, require('./routes/reviewRoutes'));
app.use('/api/elearning',            authenticateSession, require('./routes/elearningRoutes'));
app.use('/api/overtime',             authenticateSession, require('./routes/overtimeRoutes'));
app.use('/api/lateness',             authenticateSession, require('./routes/latenessRoutes'));
app.use('/api/sickness',             authenticateSession, require('./routes/sicknessRoutes'));

// ─── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────
app.use((err, req, res, next) => {        // eslint-disable-line no-unused-vars
  if (res.headersSent) return next(err);

  const isDev   = process.env.NODE_ENV !== 'production';
  let   status  = err.statusCode || err.status || 500;
  let   message = err.message    || 'Internal server error';

  if (err.name === 'ValidationError') {
    status  = 400;
    message = Object.values(err.errors).map(e => e.message).join('; ');
  }
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    status  = 400;
    message = `Invalid ID format: ${err.value}`;
  }
  if (err.code === 11000) {
    status  = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with that ${field} already exists`;
  }
  if (err.name === 'TokenExpiredError') { status = 401; message = 'Session expired — please log in again'; }
  if (err.name === 'JsonWebTokenError') { status = 401; message = 'Invalid authentication token'; }

  console.error(`🔥 [${status}] ${req.method} ${req.originalUrl} — ${message}`);
  if (isDev) console.error(err.stack);

  res.status(status).json({
    success: false,
    message: status === 500 && !isDev ? 'Internal server error' : message,
    ...(isDev && status === 500 && { stack: err.stack }),
  });
});

// ─── UNHANDLED ERRORS ──────────────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) =>
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason));
process.on('uncaughtException', error =>
  console.error('🔥 Uncaught Exception:', error));

// ─── CRON JOBS ─────────────────────────────────────────────────────────────
cron.schedule('0 9 * * *', () => {
  console.log('⏰ Daily certificate expiry check...');
  startAllCertificateSchedulers();
});
cron.schedule('0 9 * * *', async () => {
  console.log('⏰ Daily document expiry check...');
  await runExpiryChecks();
});
scheduleAbsenceDetection();
console.log('✅ Absence detection cron initialized');

// ─── SERVER START ──────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Defer startup tasks until after DB connection is likely up
  const { createDefaultUser, createDefaultSuppliers } = require('./utils/startup');
  setTimeout(() => {
    createDefaultUser();
    createDefaultSuppliers();
  }, 2000);

  startCertificateMonitoring();
  setTimeout(() => {
    console.log('⏰ Initial certificate expiry check...');
    triggerCertificateCheck();
  }, 5000);
});

// ─── STATIC SERVING (production only) ─────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) =>
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html')));
} else {
  app.get('*', (req, res) =>
    res.status(404).json({
      message: 'API endpoint not found. Frontend dev server runs on port 3001.',
    }));
}

module.exports = app;   // for testing / import compatibility
