'use strict';
/**
 * Migration Audit Script — TalentShield v1 → v2 Database Analysis
 *
 * Run FROM the backend directory:   node scripts/auditMigration.js
 *  OR from the scripts directory:   node auditMigration.js
 *
 * What it does:
 *   1. Lists every User (v1 auth: admins + profiles) and every EmployeeHub record
 *   2. Cross-references them by email to find overlaps, orphans, and role conflicts
 *   3. Counts how many records each module holds (LeaveRequest, TimeEntry, etc.)
 *   4. Generates a concrete action list for Path 2 (collapsing User into EmployeeHub)
 *   5. Saves a full JSON report to scripts/migration-audit.json
 *
 * Give the output to your developer (or paste it back here) to plan Path 2.
 */

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const backendRoot = path.join(__dirname, '..');
const backendRequire = createRequire(path.join(backendRoot, 'package.json'));

function loadEnvFile(envFilePath) {
  if (!fs.existsSync(envFilePath)) return;

  const content = fs.readFileSync(envFilePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue;

    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

const envName = process.env.NODE_ENV || 'development';
const envFiles = {
  development: '.env',
  staging: '.env.deployment',
  production: '.env.production'
};
const preferredEnvFile = path.join(backendRoot, envFiles[envName] || '.env');
const fallbackEnvFile = path.join(backendRoot, '.env');

loadEnvFile(preferredEnvFile);
if (preferredEnvFile !== fallbackEnvFile) {
  loadEnvFile(fallbackEnvFile);
}

let mongoose;
try {
  mongoose = backendRequire('mongoose');
} catch (error) {
  console.error('❌ Missing required package: mongoose');
  console.error('');
  console.error(`Script location: ${__filename}`);
  console.error(`Expected backend root: ${backendRoot}`);
  console.error('');
  console.error('This script must be run in a backend installation that has its Node.js dependencies installed.');
  console.error('');
  console.error('Fix options:');
  console.error(`  1. cd ${backendRoot}`);
  console.error('  2. npm install --omit=dev');
  console.error('  3. node scripts/auditMigration.js');
  console.error('');
  console.error('If you are using Docker, run the script inside the running backend container or image that already has node_modules installed.');
  console.error('');
  console.error(`Original error: ${error.message}`);
  process.exit(1);
}

// ─── Minimal inline schemas so the script is self-contained ─────────────────
// (avoids triggering the full model registry in server.js)

const userSchema = new mongoose.Schema({
  firstName: String, lastName: String, email: String,
  role: String, profileType: String, vtid: String,
  isActive: Boolean, isAdminApproved: Boolean,
  createdAt: Date,
}, { collection: 'users' });

const empSchema = new mongoose.Schema({
  firstName: String, lastName: String, email: String,
  role: String, employeeId: String, department: String,
  jobTitle: String, isActive: Boolean, status: String,
  userId: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
}, { collection: 'employeehubs' });

// ─── Main ────────────────────────────────────────────────────────────────────
async function runAudit() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ No MONGO_URI or MONGODB_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB\n');

  const User        = mongoose.model('_AuditUser',        userSchema);
  const EmployeeHub = mongoose.model('_AuditEmployeeHub', empSchema);

  const users     = await User.find({}).lean();
  const employees = await EmployeeHub.find({}).lean();

  const usersByEmail = new Map(users.map(u    => [u.email?.toLowerCase(), u]));
  const empsByEmail  = new Map(employees.map(e => [e.email?.toLowerCase(), e]));

  // ── Categorise ────────────────────────────────────────────────────────────
  const overlaps  = [];  // same email in BOTH collections
  const userOnly  = [];  // User record but NO EmployeeHub  (admins without EH, or profiles)
  const empOnly   = [];  // EmployeeHub record but NO User  (pure employees)

  for (const [email, user] of usersByEmail) {
    const emp = empsByEmail.get(email);
    if (emp) {
      overlaps.push({
        email,
        user: { _id: user._id, role: user.role, name: `${user.firstName} ${user.lastName}` },
        emp:  { _id: emp._id,  role: emp.role,  name: `${emp.firstName} ${emp.lastName}`, employeeId: emp.employeeId, department: emp.department },
        roleConflict: user.role !== emp.role,
        linkedByUserId: emp.userId?.toString() === user._id?.toString(),
      });
    } else {
      userOnly.push({
        _id:         user._id,
        email,
        name:        `${user.firstName} ${user.lastName}`,
        role:        user.role,
        profileType: user.profileType || null,
        vtid:        user.vtid        || null,
        isActive:    user.isActive,
        path2Action: ['admin', 'super-admin'].includes(user.role)
          ? 'CREATE_EMPLOYEE_HUB — admin needs an EmployeeHub record so employeeHubId is set in JWT'
          : 'KEEP_AS_PROFILE — profile (intern/trainee) stays in User until Path 2 merge',
      });
    }
  }

  for (const [email, emp] of empsByEmail) {
    if (!usersByEmail.has(email)) {
      empOnly.push({
        _id:        emp._id,
        email,
        name:       `${emp.firstName} ${emp.lastName}`,
        role:       emp.role,
        employeeId: emp.employeeId,
        department: emp.department,
        isActive:   emp.isActive,
        path2Action: 'VERIFY_AUTH — employee-only record; ensure login flow goes through EmployeesHub.authenticate()',
      });
    }
  }

  // ── Module reference counts ───────────────────────────────────────────────
  const db = mongoose.connection.db;
  const countIn = async (collection, field, ids) => {
    if (!ids.length) return 0;
    return db.collection(collection).countDocuments({ [field]: { $in: ids } });
  };

  const empIds  = employees.map(e => e._id);
  const userIds = users.map(u => u._id);

  const moduleCounts = {
    leaverequests:      { byEmployee: await countIn('leaverequests',      'employeeId', empIds) },
    expenses:           { byEmployee: await countIn('expenses',            'employee',   empIds) },
    timeentries:        { byEmployee: await countIn('timeentries',         'employee',   empIds) },
    shiftassignments:   { byEmployee: await countIn('shiftassignments',    'employeeId', empIds) },
    reviews:            { byEmployee: await countIn('reviews',             'employeeId', empIds) },
    elearningcompletions:{ byEmployee: await countIn('elearningcompletions','employeeId', empIds) },
    documentmanagements: {
      uploadedByUser:   await countIn('documentmanagements', 'uploadedBy', userIds),
      uploadedByEmp:    await countIn('documentmanagements', 'uploadedBy', empIds),
    },
    certificates:       { total: await db.collection('certificates').countDocuments() },
  };

  // ── Action plan for Path 2 ─────────────────────────────────────────────────
  const path2Actions = [
    ...overlaps.filter(o => o.roleConflict).map(o => ({
      priority: 'HIGH',
      action:   'RESOLVE_ROLE_CONFLICT',
      email:    o.email,
      detail:   `User.role="${o.user.role}" vs EmployeeHub.role="${o.emp.role}" — decide which wins (User role is auth source of truth in current system)`,
    })),
    ...overlaps.filter(o => !o.linkedByUserId).map(o => ({
      priority: 'MEDIUM',
      action:   'LINK_BY_USERID',
      email:    o.email,
      detail:   `EmployeeHub.userId is not set to User._id (${o.user._id}). Set it so the records are formally linked.`,
    })),
    ...userOnly.filter(u => ['admin', 'super-admin'].includes(u.role)).map(u => ({
      priority: 'MEDIUM',
      action:   'CREATE_EMPLOYEE_HUB',
      email:    u.email,
      detail:   `Admin "${u.name}" has no EmployeeHub record. Without one, employeeHubId in JWT is null and admin cannot act as an approver via EmployeeHub refs.`,
    })),
  ];

  // ── Build report ──────────────────────────────────────────────────────────
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalUsers:        users.length,
      totalEmployees:    employees.length,
      emailOverlaps:     overlaps.length,
      userOnlyRecords:   userOnly.length,  // User with no EmployeeHub
      empOnlyRecords:    empOnly.length,   // EmployeeHub with no User
      roleConflicts:     overlaps.filter(o => o.roleConflict).length,
      unlinkedOverlaps:  overlaps.filter(o => !o.linkedByUserId).length,
    },
    overlaps,
    userOnly,
    empOnly,
    moduleCounts,
    path2Actions,
    path2ReadinessScore: (() => {
      const issues = path2Actions.length;
      if (issues === 0) return '✅ Ready for Path 2 merge';
      if (issues <= 3)  return `⚠️  ${issues} issue(s) to resolve before Path 2`;
      return `❌ ${issues} issues — clean data before Path 2`;
    })(),
  };

  // ── Print summary ─────────────────────────────────────────────────────────
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║          TALENTSHIELD MIGRATION AUDIT             ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log('── Identity collections ──────────────────────────');
  console.log(`  User (v1 auth):          ${report.summary.totalUsers}`);
  console.log(`  EmployeeHub (v2 auth):   ${report.summary.totalEmployees}`);
  console.log(`  Same email in both:      ${report.summary.emailOverlaps}`);
  console.log(`  User only (no EH):       ${report.summary.userOnlyRecords}`);
  console.log(`  EmployeeHub only:        ${report.summary.empOnlyRecords}`);
  console.log(`  Role conflicts:          ${report.summary.roleConflicts}`);
  console.log(`  Unlinked overlaps:       ${report.summary.unlinkedOverlaps}`);

  console.log('\n── Module record counts ──────────────────────────');
  console.log(`  LeaveRequests:           ${moduleCounts.leaverequests.byEmployee}`);
  console.log(`  Expenses:                ${moduleCounts.expenses.byEmployee}`);
  console.log(`  TimeEntries:             ${moduleCounts.timeentries.byEmployee}`);
  console.log(`  ShiftAssignments:        ${moduleCounts.shiftassignments.byEmployee}`);
  console.log(`  Reviews:                 ${moduleCounts.reviews.byEmployee}`);
  console.log(`  ELearningCompletions:    ${moduleCounts.elearningcompletions.byEmployee}`);
  console.log(`  Documents (by User):     ${moduleCounts.documentmanagements.uploadedByUser}`);
  console.log(`  Documents (by EmpHub):   ${moduleCounts.documentmanagements.uploadedByEmp}`);
  console.log(`  Certificates:            ${moduleCounts.certificates.total}`);

  console.log(`\n── Path 2 readiness: ${report.path2ReadinessScore}\n`);

  if (path2Actions.length) {
    console.log('── Required actions before Path 2 ───────────────');
    path2Actions.forEach((a, i) =>
      console.log(`  ${i + 1}. [${a.priority}] ${a.action} — ${a.email}\n     ${a.detail}`)
    );
    console.log('');
  }

  // Save full JSON
  const outPath = path.join(__dirname, 'migration-audit.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`📁 Full report saved → ${outPath}`);
  console.log('   Paste this file\'s contents back to plan the Path 2 merge.\n');

  await mongoose.disconnect();
}

runAudit().catch(err => {
  console.error('❌ Audit failed:', err.message);
  process.exit(1);
});
