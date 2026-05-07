'use strict';
/**
 * Admin Identity Reconciliation (Path 1.5)
 *
 * Purpose
 * - Keep User as the single auth source for admin/profile identities
 * - Ensure each active User admin has a linked EmployeeHub shadow record for approver refs
 *
 * Modes
 * - Dry run (default): node scripts/migrateAdminIdentity.js
 * - Apply changes:      node scripts/migrateAdminIdentity.js --apply
 *
 * Output
 * - Writes scripts/admin-identity-migration-log.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createRequire } = require('module');

const backendRoot = path.join(__dirname, '..');
const backendRequire = createRequire(path.join(backendRoot, 'package.json'));

function loadEnvFile(envFilePath) {
  if (!fs.existsSync(envFilePath)) return;
  const content = fs.readFileSync(envFilePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue;

    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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
if (preferredEnvFile !== fallbackEnvFile) loadEnvFile(fallbackEnvFile);

const mongoose = backendRequire('mongoose');
const bcrypt = backendRequire('bcrypt');

const shouldApply = process.argv.includes('--apply');
const ADMIN_ROLES = ['admin', 'super-admin'];

function randomStrongPassword() {
  return crypto.randomBytes(32).toString('hex');
}

function asLowerEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ No MONGO_URI or MONGODB_URI found');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const usersCol = db.collection('users');
  const empsCol = db.collection('employeehubs');

  const admins = await usersCol.find({
    role: { $in: ADMIN_ROLES },
    isActive: true
  }).project({
    firstName: 1, lastName: 1, email: 1, role: 1, phone: 1, createdAt: 1
  }).toArray();

  const log = {
    generatedAt: new Date().toISOString(),
    mode: shouldApply ? 'apply' : 'dry-run',
    summary: {
      adminsFound: admins.length,
      createsPlanned: 0,
      updatesPlanned: 0,
      skipped: 0,
      createsApplied: 0,
      updatesApplied: 0
    },
    creates: [],
    updates: [],
    skipped: []
  };

  for (const admin of admins) {
    const email = asLowerEmail(admin.email);
    if (!email) {
      log.skipped.push({ reason: 'Missing email', adminUserId: String(admin._id) });
      log.summary.skipped += 1;
      continue;
    }

    const existingByUser = await empsCol.findOne({ userId: admin._id });
    const existingByEmail = existingByUser ? null : await empsCol.findOne({ email });
    const existing = existingByUser || existingByEmail;

    if (!existing) {
      const plain = randomStrongPassword();
      const hash = await bcrypt.hash(plain, 12);

      const doc = {
        firstName: admin.firstName || 'Admin',
        lastName: admin.lastName || 'User',
        email,
        role: admin.role,
        userId: admin._id,
        isActive: true,
        status: 'Active',
        department: 'Administration',
        jobTitle: admin.role === 'super-admin' ? 'Super Administrator' : 'Administrator',
        startDate: admin.createdAt || new Date(),
        password: hash,
        phone: admin.phone || '',
        workLocation: 'On-site',
        employmentType: 'Full-time',
        office: 'Head Office',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      log.creates.push({
        action: 'CREATE_EMPLOYEEHUB_ADMIN_SHADOW',
        userId: String(admin._id),
        email,
        role: admin.role,
        document: {
          firstName: doc.firstName,
          lastName: doc.lastName,
          email: doc.email,
          role: doc.role,
          userId: String(doc.userId),
          department: doc.department,
          jobTitle: doc.jobTitle,
          startDate: doc.startDate
        }
      });
      log.summary.createsPlanned += 1;

      if (shouldApply) {
        const result = await empsCol.insertOne(doc);
        log.summary.createsApplied += 1;
        log.creates[log.creates.length - 1].employeeHubId = String(result.insertedId);
      }

      continue;
    }

    const before = {
      _id: String(existing._id),
      role: existing.role,
      userId: existing.userId ? String(existing.userId) : null,
      firstName: existing.firstName,
      lastName: existing.lastName,
      isActive: existing.isActive,
      status: existing.status
    };

    const updates = {
      role: admin.role,
      userId: admin._id,
      firstName: admin.firstName || existing.firstName,
      lastName: admin.lastName || existing.lastName,
      isActive: true,
      status: 'Active',
      department: existing.department || 'Administration',
      jobTitle: existing.jobTitle || (admin.role === 'super-admin' ? 'Super Administrator' : 'Administrator'),
      updatedAt: new Date()
    };

    const changed =
      String(before.userId || '') !== String(updates.userId) ||
      before.role !== updates.role ||
      before.firstName !== updates.firstName ||
      before.lastName !== updates.lastName ||
      before.isActive !== updates.isActive ||
      before.status !== updates.status;

    if (!changed) {
      log.skipped.push({
        reason: 'Already linked and aligned',
        userId: String(admin._id),
        email,
        employeeHubId: String(existing._id)
      });
      log.summary.skipped += 1;
      continue;
    }

    log.updates.push({
      action: 'UPDATE_EMPLOYEEHUB_ADMIN_SHADOW',
      userId: String(admin._id),
      email,
      employeeHubId: String(existing._id),
      before,
      after: {
        role: updates.role,
        userId: String(updates.userId),
        firstName: updates.firstName,
        lastName: updates.lastName,
        isActive: updates.isActive,
        status: updates.status
      }
    });
    log.summary.updatesPlanned += 1;

    if (shouldApply) {
      await empsCol.updateOne({ _id: existing._id }, { $set: updates });
      log.summary.updatesApplied += 1;
    }
  }

  const outPath = path.join(__dirname, 'admin-identity-migration-log.json');
  fs.writeFileSync(outPath, JSON.stringify(log, null, 2));

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║      ADMIN IDENTITY RECONCILIATION REPORT       ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  console.log(`Mode:                    ${log.mode}`);
  console.log(`Admins found:            ${log.summary.adminsFound}`);
  console.log(`Creates planned:         ${log.summary.createsPlanned}`);
  console.log(`Updates planned:         ${log.summary.updatesPlanned}`);
  console.log(`Skipped:                 ${log.summary.skipped}`);
  if (shouldApply) {
    console.log(`Creates applied:         ${log.summary.createsApplied}`);
    console.log(`Updates applied:         ${log.summary.updatesApplied}`);
  }
  console.log(`\nLog file: ${outPath}\n`);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('❌ Admin identity migration failed:', err.message);
  try { await mongoose.disconnect(); } catch (e) {}
  process.exit(1);
});
