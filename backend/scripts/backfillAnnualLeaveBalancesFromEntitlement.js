const mongoose = require('mongoose');
const envConfig = require('../config/environment');
const EmployeeHub = require('../models/EmployeesHub');
const AnnualLeaveBalance = require('../models/AnnualLeaveBalance');

function getCurrentLeaveYearWindow(date = new Date()) {
  const currentYear = date.getFullYear();
  const month = date.getMonth();
  const leaveYearStart = month >= 3 ? new Date(currentYear, 3, 1) : new Date(currentYear - 1, 3, 1);
  const leaveYearEnd = month >= 3 ? new Date(currentYear + 1, 2, 31) : new Date(currentYear, 2, 31);
  return { leaveYearStart, leaveYearEnd };
}

async function run() {
  const config = envConfig.getConfig();
  await mongoose.connect(config.database.uri);

  const { leaveYearStart, leaveYearEnd } = getCurrentLeaveYearWindow(new Date());

  const employees = await EmployeeHub.find({
    leaveEntitlement: { $ne: null },
    isActive: { $ne: false },
    deleted: { $ne: true }
  })
    .select('_id employeeId firstName lastName leaveEntitlement')
    .lean();

  let created = 0;
  let skipped = 0;

  for (const employee of employees) {
    const entitlementDays = Number(employee.leaveEntitlement);
    if (!Number.isFinite(entitlementDays) || entitlementDays < 0) {
      skipped += 1;
      continue;
    }

    const existing = await AnnualLeaveBalance.findOne({
      user: employee._id,
      leaveYearStart,
      leaveYearEnd
    })
      .select('_id')
      .lean();

    if (existing) {
      skipped += 1;
      continue;
    }

    await AnnualLeaveBalance.create({
      user: employee._id,
      leaveYearStart,
      leaveYearEnd,
      entitlementDays,
      carryOverDays: 0,
      usedDays: 0,
      adjustments: [],
      notes: 'Backfilled from EmployeesHub.leaveEntitlement'
    });

    created += 1;
  }

  console.log(JSON.stringify({
    leaveYearStart,
    leaveYearEnd,
    scanned: employees.length,
    created,
    skipped
  }, null, 2));

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
