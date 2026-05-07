const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const envConfig = require('../config/environment');
const DocumentManagement = require('../models/DocumentManagement');
const EmployeeHub = require('../models/EmployeesHub');
const { ensureMyDocumentsFolder } = require('../utils/documentFolderHelpers');

async function main() {
  const config = envConfig.getConfig();

  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.database.uri, {
    maxPoolSize: config.database.maxPoolSize,
    minPoolSize: config.database.minPoolSize
  });

  const looseDocuments = await DocumentManagement.find({
    folderId: null,
    ownerId: { $ne: null }
  }).select('_id name ownerId folderId');

  let updatedCount = 0;
  let skippedCount = 0;

  for (const document of looseDocuments) {
    const ownerId = document.ownerId ? String(document.ownerId) : null;

    if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
      skippedCount += 1;
      continue;
    }

    const employeeExists = await EmployeeHub.exists({ _id: ownerId });
    if (!employeeExists) {
      skippedCount += 1;
      continue;
    }

    const folder = await ensureMyDocumentsFolder(ownerId);
    document.folderId = folder._id;
    await document.save();
    updatedCount += 1;
  }

  console.log(`Updated ${updatedCount} document(s). Skipped ${skippedCount} document(s).`);
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
