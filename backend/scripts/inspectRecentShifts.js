const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const env = require('../config/environment');
const ShiftAssignment = require('../models/ShiftAssignment');

async function main() {
  const cfg = env.getConfig();
  await mongoose.connect(cfg.database.uri, {
    maxPoolSize: cfg.database.maxPoolSize,
    minPoolSize: cfg.database.minPoolSize
  });

  const employeeId = process.argv[2];
  const query = employeeId ? { employeeId } : {};

  const rows = await ShiftAssignment.find(query)
    .sort({ createdAt: -1 })
    .limit(20)
    .select('_id employeeId date startDate endDate startTime endTime status groupId createdAt')
    .lean();

  console.log(JSON.stringify(rows, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    try { await mongoose.disconnect(); } catch {}
  });
