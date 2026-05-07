const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const envConfig = require('../config/environment');
const EmployeeHub = require('../models/EmployeesHub');
const Folder = require('../models/Folder');
const { ensureMyDocumentsFolder } = require('../utils/documentFolderHelpers');

async function hasMyDocumentsFolder(employeeId) {
  return Folder.exists({
    name: 'My Documents',
    isActive: true,
    $or: [
      { createdBy: String(employeeId) },
      { createdByEmployeeId: employeeId },
      { 'permissions.viewEmployeeIds': employeeId }
    ]
  });
}

async function main() {
  const config = envConfig.getConfig();

  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.database.uri, {
    maxPoolSize: config.database.maxPoolSize,
    minPoolSize: config.database.minPoolSize
  });

  const employees = await EmployeeHub.find({})
    .select('_id role email firstName lastName managerId')
    .lean();

  let createdCount = 0;
  let existingCount = 0;

  for (const employee of employees) {
    const exists = await hasMyDocumentsFolder(employee._id);
    if (exists) {
      existingCount += 1;
      continue;
    }

    await ensureMyDocumentsFolder(employee._id);
    createdCount += 1;
  }

  console.log(`Employees processed: ${employees.length}`);
  console.log(`Folders created: ${createdCount}`);
  console.log(`Folders already existing: ${existingCount}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {}
  });
