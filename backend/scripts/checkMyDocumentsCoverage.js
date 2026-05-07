const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const envConfig = require('../config/environment');
const EmployeeHub = require('../models/EmployeesHub');
const Folder = require('../models/Folder');

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

  await mongoose.connect(config.database.uri, {
    maxPoolSize: config.database.maxPoolSize,
    minPoolSize: config.database.minPoolSize
  });

  const employees = await EmployeeHub.find({}).select('_id role').lean();

  let missingAll = 0;
  let missingManagers = 0;

  for (const employee of employees) {
    const hasFolder = await hasMyDocumentsFolder(employee._id);
    if (!hasFolder) {
      missingAll += 1;
      if (['manager', 'senior-manager'].includes(employee.role)) {
        missingManagers += 1;
      }
    }
  }

  console.log(`Total EmployeeHub records: ${employees.length}`);
  console.log(`Missing My Documents (all roles): ${missingAll}`);
  console.log(`Missing My Documents (manager/senior-manager): ${missingManagers}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Coverage check failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {}
  });
