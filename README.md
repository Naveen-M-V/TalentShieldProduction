# TalentShield HRMS

A full-stack Human Resource Management System (HRMS) built for managing employees, leave, expenses, shifts, performance, documents, e-learning, sickness, lateness, overtime, and more.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Architecture & Auth Model](#architecture--auth-model)
4. [Running Locally](#running-locally)
5. [Environment Variables](#environment-variables)
6. [Frontend Routes](#frontend-routes)
7. [Backend API Routes](#backend-api-routes)
8. [Modules](#modules)
9. [Database Models](#database-models)
10. [Known Issues & Pending Work](#known-issues--pending-work)
11. [Deployment](#deployment)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Tailwind CSS, MUI, Lucide, Framer Motion |
| Backend | Node.js, Express 4 |
| Database | MongoDB (Atlas), Mongoose 8 |
| Auth | JWT (jsonwebtoken), express-session, connect-mongo |
| File Storage | Multer memoryStorage → MongoDB Buffer (eLearning); Multer diskStorage (other uploads) |
| Email | Nodemailer |
| PDF | PDFKit |
| Maps | Leaflet, MapLibre GL, Protomaps |
| Scheduling | node-cron |
| Security | helmet, express-rate-limit, bcrypt |

---

## Project Structure

```
ServerTalentShield/
├── backend/
│   ├── server.js               # Express app entry point (~331 lines)
│   ├── config/
│   │   └── environment.js      # Env loader (.env / .env.deployment / .env.production)
│   ├── controllers/            # Business logic
│   ├── middleware/             # Auth, CORS, rate limiting, shift validation
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # Express routers
│   ├── services/               # Shared service helpers
│   ├── cron/                   # Scheduled jobs (absence detection)
│   ├── scripts/                # One-off utility scripts
│   └── uploads/                # Disk-stored uploads (non-eLearning)
└── frontend/
    ├── src/
    │   ├── App.js              # Router + context providers
    │   ├── pages/              # Route-level page components
    │   ├── components/         # Shared UI components
    │   ├── context/            # AuthContext, ClockStatusContext, NotificationContext
    │   └── utils/              # axiosConfig, apiConfig, clockApi, dateFormatter
    └── public/
```

---

## Architecture & Auth Model

### Two User Collections

The system evolved through two versions and has two MongoDB collections that both represent "people":

| Collection | Mongoose Model | Who | Roles |
|---|---|---|---|
| `users` | `User.js` | Admins, super-admins, profiles/trainees/contractors (v1) | `profile`, `admin`, `super-admin` |
| `employeeshubs` | `EmployeesHub.js` | Employees, managers, HR, cloned admins (v2) | `employee`, `manager`, `senior-manager`, `hr`, `admin`, `super-admin` |

**The key fact:** `admin` and `super-admin` exist in **both** collections. An admin logs in via `User.js` and gets a `User._id`. They may or may not have a matching record in `EmployeesHub`. Controllers must handle both cases.

### JWT Payload (Post Path-1 Fix)

```js
{
  id,              // primary identity (_id of whichever collection authenticated)
  email,
  role,            // 'admin' | 'super-admin' | 'employee' | 'manager' | etc.
  userType,        // 'admin' | 'employee' — tells you WHICH collection id came from
  employeeHubId,   // EmployeesHub._id — always set for employees; set for admins only if they have an EmployeesHub record
  userId,          // User._id — always set for admins/profiles; null for employees
  actorId,         // Always = id (primary identity, convenience alias)
  firstName,
  lastName,
  iat, exp
}
```

### Middleware (authenticateSession)

After JWT decode, the middleware sets three clean properties on every request:

```js
req.employeeHubId  // EmployeesHub._id — safe to use for employees
req.userId         // User._id — safe to use for admins
req.actorId        // Always-populated primary ID
req.user.employeeId // Backward-compat alias for req.employeeHubId
```

---

## Running Locally

### Backend

```bash
cd backend
npm install
npm run dev        # nodemon, port 5003
```

### Frontend

```bash
cd frontend
npm install
npm start          # CRA dev server, port 3000 (or 3001)
```

The frontend proxies API calls to `http://localhost:5003` via the `proxy` field in `package.json` or via `REACT_APP_API_URL`.

---

## Environment Variables

Create `backend/.env` with the following:

```env
# Required in all environments
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# Required in production
EMAIL_HOST=smtp.example.com
EMAIL_USER=noreply@example.com
EMAIL_PASS=your_email_password
EMAIL_FROM=noreply@example.com

# CORS
CORS_ORIGIN=https://hrms.talentshield.co.uk

# Optional
NODE_ENV=development         # development | staging | production
PORT=5003
```

**Env file selection by NODE_ENV:**

| NODE_ENV | File |
|---|---|
| `development` | `.env` |
| `staging` | `.env.deployment` |
| `production` | `.env.production` |

---

## Frontend Routes

### Public (no auth required)
| Path | Component |
|---|---|
| `/login` | Login |
| `/signup` | Signup |
| `/forgot-password` | ForgotPassword |
| `/reset-password` | ResetPassword |

### Employee Portal (UserProtectedRoute / EmployeeProtectedRoute)
| Path | Component / Behaviour |
|---|---|
| `/user-dashboard` | UserDashboard (tabs: overview, leave, expenses, documents, e-learning, performance) |
| `/employee/expenses` | → redirects to `/user-dashboard?tab=expenses` |
| `/employee/expenses/receipt/new` | → redirects to dashboard expenses tab |
| `/employee/expenses/mileage/new` | → redirects to dashboard expenses tab |
| `/user/certificates/create` | UserCertificateCreate |
| `/user/certificates/:id` | UserCertificateView |

### Admin Dashboard (AdminProtectedRoute + AdminLayout sidebar)
| Path | Component |
|---|---|
| `/` , `/dashboard` | Dashboard (overview, attendance summary, clock status) |
| `/profiles` | ProfilesPage (v1 users) |
| `/profiles/:id` | ProfileDetailView |
| `/profiles/edit/:id` | EditUserProfile |
| `/myaccount/profiles` | MyAccount |
| `/myaccount/notifications` | Notifications |
| `/employee-hub` | EmployeeHub (employee list) |
| `/add-employee` | AddEmployee |
| `/employee/:employeeId` | EmployeeProfile (personal, employment, emergencies, documents, absence, overtime tabs) |
| `/edit-employee/:id` | EditEmployeeProfile |
| `/archive-employees` | ArchiveEmployees |
| `/organisational-chart` | OrganizationalChartNew |
| `/rota-management` , `/rota-shift-management` | RotaShiftManagement |
| `/clock-overview` | ClockInOut |
| `/clock-ins` | ClockIns |
| `/time-history` | TimeHistory |
| `/manage-teams` | ManageTeams |
| `/calendar` | Calendar |
| `/annual-leave-balance` | AnnualLeaveBalance |
| `/manager-approvals` | ManagerApprovalDashboard |
| `/expenses` | Expenses |
| `/admin/expenses` | AdminExpenses |
| `/expenses/add` | AddExpense |
| `/expenses/:id` | ViewExpense |
| `/documents` | Documents |
| `/documents/:folderId` | FolderView |
| `/performance` | Performance (goals + reviews unified page) |
| `/performance/objective-requests` | ObjectiveRequests |
| `/e-learning` | ELearning |
| `/certificates` | CertificateManagement |
| `/reporting/certificates` | CertificatesPage |
| `/report-library` | ReportLibrary |

---

## Backend API Routes

### Public (no auth)
| Mount | Purpose |
|---|---|
| `POST /api/auth/login` | Unified login (employees + admins) |
| `POST /api/auth/employee-login` | Employee-specific login |
| `POST /api/auth/logout` | Logout |
| `GET /api/auth/me` | Get current user from session |
| `/api/profiles` | Profile (v1 user) CRUD |
| `/api/certificates` | Legacy certificate routes |
| `/api/suppliers` | Supplier lookup |
| `/api/job-titles` | Job title reference data |
| `/api/job-levels` | Job level reference data |
| `/api/job-roles` | Job role reference data |
| `/api/certificate-names` | Certificate name reference data |

### Authenticated (require `authenticateSession`)
| Mount | Purpose |
|---|---|
| `/api/notifications` | Employee + admin notification management |
| `/api/rota` | Rota creation, shift assignment, schedule view |
| `/api/clock` | Clock-in, clock-out, break start/resume, time entries |
| `/api/leave` | Leave requests, approval, annual leave balances |
| `/api/leave-requests` | Legacy leave request routes |
| `/api/teams` | Team CRUD and membership |
| `/api/employees` | EmployeeHub CRUD (create, update, archive, list) |
| `/api/employee-profile/:id` | Full employee profile with leave balance, absences, documents |
| `/api/documentManagement` | Folders, document upload/download/view, permissions |
| `/api/approvals` | Approval dashboard (leave, expense, overtime, sickness) |
| `/api/certificates` | Certificate create, assign, expire, renew |
| `/api/reports` | Reporting endpoints |
| `/api/report-library` | Pre-built report library |
| `/api/expenses` | Expense submit, approve, reject (receipts + mileage) |
| `/api/performance` | Performance notes, disciplinary records, PIPs |
| `/api/goals` | Objectives/goals CRUD, progress updates, approval workflow |
| `/api/objective-categories` | Custom goal categories |
| `/api/objective-requests` | Manager requesting employee to create objectives |
| `/api/performance-reviews` | Formal review cycles (draft → publish → acknowledge) |
| `/api/reviews` | Review submissions and comments |
| `/api/elearning` | eLearning material upload (DB storage), list, view, completions |
| `/api/overtime` | Overtime request, approve, reject |
| `/api/lateness` | Lateness record create, list |
| `/api/sickness` | Sickness record create, approve, list |

---

## Modules

### Authentication
- **File:** `controllers/authController.js`, `middleware/auth.js`
- Employees log in via `EmployeesHub` (password on the EmployeeHub record).
- Admins/profiles log in via `User` collection.
- `unifiedLogin` tries both collections and dispatches to the correct handler.
- JWT signed with clean payload using `buildEmployeePayload()` / `buildAdminPayload()` helpers.
- Session stored in MongoDB (`connect-mongo`).

### Employee Hub
- **Files:** `routes/employeeHubRoutes.js`, `controllers/employeeHubController.js`
- Central employee directory: create, update, archive, restore employees.
- Filters out User-type (profile/admin) records from employee lists.
- Org chart, team membership, status tracking.

### Leave Management
- **Files:** `routes/leaveRoutes.js`, `routes/unifiedLeaveRoutes.js`, `controllers/unifiedLeaveController.js`
- Unified leave system (`/api/leave`) is canonical.
- Supports: annual leave, time off, sick leave requests.
- Approval workflow: pending → approved/rejected.
- Annual leave balances tracked in `AnnualLeaveBalance` model.
- Actor/subject tracking on all approval actions.

### Rota & Shifts
- **Files:** `routes/rotaRoutes.js`, `controllers/rotaController.js`
- Admins create rotas and assign shifts to employees.
- Shift assignment sends notifications to employees.
- Validates no shift conflicts with approved leave.

### Clock In/Out
- **Files:** `routes/clockRoutes.js`
- Employees clock in, start break, resume work, clock out.
- Stores `TimeEntry` records with status: `clocked-in`, `on-break`, `clocked-out`.
- Admin dashboard shows real-time clock status for all employees.
- Supports GPS-based location capture.

### Expenses
- **Files:** `routes/expenseRoutes.js`, `controllers/expenseController.js`
- Employees submit receipts and mileage claims.
- Admin reviews and approves/rejects.
- PDF export of expense reports.

### Sickness
- **Files:** `routes/sicknessRoutes.js`, `controllers/sicknessController.js`, `models/Sickness.js`
- Employee self-reporting or admin-created sickness records.
- Sickness type enum: `illness`, `injury`, `medical-appointment`, `mental-health`, `other`.
- Bradford Factor calculation support.
- Auto-sets `requiresNote = true` for absences ≥ 5 days.
- Approval workflow: pending → approved/rejected.
- Notifications sent to admins on self-report; to employee when admin creates.
- Employee profile's sickness count draws from `Sickness` + `DisciplinaryRecord` + `LeaveRecord`.

### Lateness
- **Files:** `routes/latenessRoutes.js`, `controllers/latenessController.js`, `models/LatenessRecord.js`
- Admin records lateness occurrences for employees.
- Tracks scheduled vs actual start time, minutes late, reason.

### Overtime
- **Files:** `routes/overtimeRoutes.js`, `controllers/overtimeController.js`, `models/Overtime.js`
- Employees request overtime; admins approve or reject.
- Actor/subject tracking on all approvals.

### Performance
- **Files:** `routes/performanceRoutes.js`, `controllers/performanceController.js`
- Performance notes (visible to HR/manager only or private).
- Disciplinary records (verbal, written, final warning).
- Improvement Plans (PIP) with goals and target dates.

### Goals & Objectives
- **Files:** `routes/goalsRoutes.js`, `controllers/goalsController.js`, `models/Goal.js`
- Employees create objectives; managers request, approve, or send back.
- Progress tracking with employee input submissions.
- Manager feedback on each submission.
- Auto-overdue detection, auto-complete at 100% progress.
- Linked to review cycles via `reviewCycle` field.

### Reviews
- **Files:** `routes/reviewRoutes.js`, `controllers/reviewController.js`, `models/Review.js`
- Formal review cycles: DRAFT → SUBMITTED → RATING_PUBLISHED → REVIEW_CLOSED.
- Manager publishes; employee acknowledges with optional comments.
- `Review.js` is the canonical review model.

### E-Learning
- **Files:** `routes/elearningRoutes.js`, `models/DocumentManagement.js`
- Admins upload materials (PDF, video, Word, etc.).
- Files stored as `Buffer` in MongoDB (no disk) — served via `GET /api/elearning/view/:id`.
- List endpoint excludes `fileData` field to prevent large payloads.
- Employees mark modules as complete; completions tracked with progress percentage.
- `uploaderModel` field distinguishes User vs EmployeeHub uploaders.

### Documents
- **Files:** `routes/documentManagement.js`, `models/DocumentManagement.js`, `models/Folder.js`
- Folder-based document organisation with role-based permissions.
- Folders have dual permission arrays: `viewEmployeeIds`/`editEmployeeIds`/`deleteEmployeeIds` (EmployeeHub) and `viewUserIds`/`editUserIds`/`deleteUserIds` (User).
- Admin uploading to employee profile creates/reuses an employee-scoped "My Documents" folder.
- `ownerId` field links documents to specific employees.
- `DocumentViewer` component handles all MIME types (PDF, image, video, Word, Excel).

### Certificates
- **Files:** `routes/certificates.js`, legacy routes
- Certificate creation, assignment to employees/profiles, expiry tracking.
- Daily cron sends expiry reminder and urgent-expiry emails.

### Notifications
- **Files:** `routes/notifications.js`, `models/Notification.js`
- `recipientType`: `'employee'` (→ `employeeRef`) or `'profile'` (→ `profileRef`).
- Valid types: `certificate`, `rota`, `clock-in`, `document`, `system`, `welcome`, `profile_created`, `employee_created`, `shift_assigned`, `break_started`, `work_resumed`, `admin_clock_in`, `admin_clock_out`, `leave`, `reminder`, `alert`, `objective_request`, `objective_approved`, `objective_sent_back`, `objective_overdue`, `input_submitted`, `review_published`, `review_acknowledged`.

### Reporting
- **Files:** `routes/reportingRoutes.js`, `routes/reportLibraryRoutes.js`
- Pre-built reports: absence, leave, lateness, sickness, overtime.
- CSV and PDF export.

---

## Database Models

| Model File | Collection | Purpose |
|---|---|---|
| `User.js` | `users` | Admins, super-admins, profiles/trainees |
| `EmployeesHub.js` | `employeeshubs` | Employees + cloned admins |
| `ArchiveEmployee.js` | `archiveemployees` | Terminated employee snapshots |
| `AnnualLeaveBalance.js` | `annualeavebalances` | Per-employee leave entitlement |
| `LeaveRecord.js` | `leaverecords` | Leave history |
| `LeaveRequest.js` | `leaverequests` | Leave requests with approval state |
| `Sickness.js` | `sicknesses` | Sickness records + Bradford Factor |
| `LatenessRecord.js` | `latenessrecords` | Lateness occurrences |
| `Overtime.js` | `overtimes` | Overtime requests + approvals |
| `TimeEntry.js` | `timeentries` | Clock-in/out records |
| `Shift.js` | `shifts` | Rota shift assignments |
| `ShiftAssignment.js` | `shiftassignments` | Shift assignment junction |
| `Rota.js` | `rotas` | Rota schedules |
| `Team.js` | `teams` | Team definitions + membership |
| `Goal.js` | `goals` | Objectives / goals |
| `Review.js` | `reviews` | Formal review cycles (canonical) |
| `ReviewEmployeeComment.js` | `reviewemployeecomments` | Employee review acknowledgements |
| `PerformanceNote.js` | `performancenotes` | HR/manager performance notes |
| `ImprovementPlan.js` | `improvementplans` | PIPs |
| `DisciplinaryRecord.js` | `disciplinaryrecords` | Disciplinary actions |
| `Expense.js` | `expenses` | Expense claims |
| `DocumentManagement.js` | `documentmanagements` | Documents + eLearning files |
| `Folder.js` | `folders` | Document folders with permissions |
| `Document.js` | `documents` | Employee-only document store (v1) |
| `Certificate.js` | `certificates` | Certificate records |
| `Notification.js` | `notifications` | In-app notifications |
| `PayrollException.js` | `payrollexceptions` | Payroll anomalies |

---

## Known Issues & Pending Work

### Architecture (Path 2 — not yet done)
- The dual `User` + `EmployeesHub` collections still exist. A future migration (`scripts/auditMigration.js`) will collapse them into one.
- Several models have `createdBy: ref: 'User'` that should be `ref: 'EmployeeHub'` — populate returns null for admin/manager actors on these fields.
- `PerformanceReview.js` is a legacy model (old review system); `Review.js` is canonical. `Goal.reviewCycle` still refs `PerformanceReview` — should be updated to `Review`.

### TimeEntry Status Enum
- `TimeEntry.status` has duplicate values: `clocked-in` vs `clocked_in`, `clocked-out` vs `clocked_out`. Standardise to hyphen form and run a migration.

### Trust Proxy / Rate Limiter Warning
- `express-rate-limit` warns about `X-Forwarded-For` when `app.set('trust proxy')` is not configured. Add `app.set('trust proxy', 1)` in `server.js` if behind a reverse proxy (nginx, Docker).

### CORS — localhost:5003 Rejected
- The backend itself (`localhost:5003`) is in the allowed origins list but the origin header comparison is strict (`/` suffix mismatch). If the frontend makes requests from `http://localhost:5003/`, CORS will reject them. Ensure the frontend always runs on port 3000/3001.

### eLearning — Old Disk-Stored Files
- Files uploaded before the DB-storage migration are stored on disk with a `fileUrl` path. They will 404 on the `/view/:id` endpoint until re-uploaded (or a migration script reads them from disk into the `fileData` field).

---

## Deployment

### Environment Files
| Environment | File |
|---|---|
| Development | `backend/.env` |
| Staging | `backend/.env.deployment` |
| Production | `backend/.env.production` |

### PM2 (no Docker)
```bash
cd backend
pm2 start ecosystem.config.js
pm2 restart ecosystem.config.js
```

### Docker Compose
```bash
# Rebuild and restart backend service
docker-compose up -d --build hrms_backend_staging

# View logs
docker-compose logs -f hrms_backend_staging
```

### Nginx
The `nginx.conf` at the root handles reverse-proxy from the public domain to the Node.js backend on port 5003 and serves the React build from `frontend/build/`.

### Utility Scripts
```bash
# Check certificate expiry (normally runs via cron at 9 AM)
npm run check-expiring-docs

# Initialise annual leave balances for existing employees
npm run init-leave-balances

# Audit migration — outputs migration-audit.json (run with server stopped)
node scripts/auditMigration.js
```
