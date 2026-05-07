const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const envConfig = require('../config/environment');
const EmployeeHub = require('../models/EmployeesHub');
const Folder = require('../models/Folder');
const employeeHubController = require('../controllers/employeeHubController');

function createMockRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

async function main() {
  const config = envConfig.getConfig();

  await mongoose.connect(config.database.uri, {
    maxPoolSize: config.database.maxPoolSize,
    minPoolSize: config.database.minPoolSize
  });

  const manager = await EmployeeHub.findOne({
    role: { $in: ['manager', 'senior-manager'] },
    isActive: true
  }).select('_id role firstName lastName email');

  if (!manager) {
    throw new Error('No active manager/senior-manager found to verify manager ACL behavior.');
  }

  const now = Date.now();
  const oneYear = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();
  const twoYears = new Date(now + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
  const email = `mydocs.verify.${now}@example.com`;

  const req = {
    body: {
      firstName: 'MyDocs',
      lastName: 'Verifier',
      email,
      jobTitle: 'QA Verifier',
      department: 'Testing',
      managerId: manager._id,
      role: 'employee',
      office: 'Head Office',
      workLocation: 'On-site',
      employmentType: 'Full-time',
      licenceType: 'NA',
      penaltyPoints: 0,
      passportNumber: `P${String(now).slice(-8)}`,
      passportExpiryDate: twoYears,
      niNumber: 'AA123456A',
      isUKCitizen: true,
      dvlaConsent: true,
      rightToWorkDeclaration: true,
      leaveEntitlement: 20
    },
    user: { role: 'admin' },
    actorId: null
  };

  const res = createMockRes();

  let createdEmployeeId = null;
  let createdFolderId = null;

  try {
    await employeeHubController.createEmployee(req, res);

    if (res.statusCode !== 201 || !res.payload?.success) {
      throw new Error(`Employee creation failed: HTTP ${res.statusCode} ${JSON.stringify(res.payload)}`);
    }

    createdEmployeeId = res.payload?.data?.id;
    if (!createdEmployeeId) {
      throw new Error('Employee creation succeeded but no employee id returned.');
    }

    const folder = await Folder.findOne({
      name: 'My Documents',
      isActive: true,
      createdByEmployeeId: createdEmployeeId
    }).select('_id permissions createdByEmployeeId');

    if (!folder) {
      throw new Error('My Documents folder was not auto-created for the new employee.');
    }

    createdFolderId = folder._id;

    const viewIds = (folder.permissions?.viewEmployeeIds || []).map((id) => String(id));
    const editIds = (folder.permissions?.editEmployeeIds || []).map((id) => String(id));
    const deleteIds = (folder.permissions?.deleteEmployeeIds || []).map((id) => String(id));

    const employeeIdStr = String(createdEmployeeId);
    const managerIdStr = String(manager._id);

    const employeeAclOk = viewIds.includes(employeeIdStr) && editIds.includes(employeeIdStr) && deleteIds.includes(employeeIdStr);
    const managerAclOk = viewIds.includes(managerIdStr) && editIds.includes(managerIdStr) && deleteIds.includes(managerIdStr);

    if (!employeeAclOk || !managerAclOk) {
      throw new Error(`ACL validation failed. employeeAclOk=${employeeAclOk}, managerAclOk=${managerAclOk}`);
    }

    const managerOwnFolderExists = await Folder.exists({
      name: 'My Documents',
      isActive: true,
      $or: [
        { createdBy: managerIdStr },
        { createdByEmployeeId: manager._id },
        { 'permissions.viewEmployeeIds': manager._id }
      ]
    });

    if (!managerOwnFolderExists) {
      throw new Error('Manager does not have their own My Documents folder.');
    }

    console.log('✅ Verification passed');
    console.log(`Created employee: ${createdEmployeeId}`);
    console.log(`Employee manager: ${manager.firstName} ${manager.lastName} (${manager._id})`);
    console.log(`Created folder: ${folder._id}`);
    console.log('ACL contains both employee and manager for view/edit/delete: YES');
    console.log('Manager has own My Documents folder: YES');
  } finally {
    // Cleanup test records created by this verification script
    if (createdFolderId) {
      await Folder.deleteOne({ _id: createdFolderId });
    }
    if (createdEmployeeId) {
      await EmployeeHub.deleteOne({ _id: createdEmployeeId });
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {}
  });
