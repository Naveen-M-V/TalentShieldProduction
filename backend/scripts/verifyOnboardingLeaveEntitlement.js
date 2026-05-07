const mongoose = require('mongoose');
const envConfig = require('../config/environment');
const employeeHubController = require('../controllers/employeeHubController');
const AnnualLeaveBalance = require('../models/AnnualLeaveBalance');

async function run() {
  const config = envConfig.getConfig();
  await mongoose.connect(config.database.uri);

  const testEmail = `diag.leave.${Date.now()}@talentshield.local`;
  const req = {
    actorId: new mongoose.Types.ObjectId().toString(),
    body: {
      title: 'Mr',
      firstName: 'Diag',
      lastName: 'LeaveBalance',
      gender: 'Male',
      ethnicity: 'White - British',
      dateOfBirth: '1990-01-01',
      email: testEmail,
      phone: '07000000000',
      workPhone: '02000000000',
      jobTitle: 'Support Worker',
      role: 'employee',
      department: 'Operations',
      office: 'HQ',
      startDate: new Date().toISOString(),
      leaveEntitlement: 20,
      leaveAllowance: 20,

      address1: '1 Test Street',
      townCity: 'London',
      county: 'London',
      postcode: 'E1 1AA',

      emergencyContactName: 'Test Contact',
      emergencyContactRelation: 'Spouse',
      emergencyContactPhone: '07000000001',
      emergencyContactEmail: 'contact@example.com',

      niNumber: 'AB123456C',
      isUKCitizen: true,
      dvlaConsent: true,
      rightToWorkDeclaration: true,

      passportNumber: 'P1234567',
      passportCountry: 'United Kingdom',
      passportExpiryDate: '2032-01-01',

      licenceType: 'Full UK Manual Licence',
      licenceNumber: 'SMITH901010AB9CD',
      licenceCountry: 'United Kingdom',
      licenceClass: 'B',
      licenceExpiryDate: '2032-01-01',
      penaltyPoints: 0,

      accountName: 'Diag Leave',
      bankName: 'Test Bank',
      bankBranch: 'Main',
      accountNumber: '12345678',
      sortCode: '112233',
      taxCode: '1257L'
    }
  };

  let statusCode = 200;
  let payload = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    }
  };

  await employeeHubController.createEmployee(req, res);

  if (statusCode !== 201 || !payload?.data?.id) {
    console.log(JSON.stringify({ statusCode, payload }, null, 2));
    throw new Error('Employee onboarding verification failed');
  }

  const employeeId = payload.data.id;
  const now = new Date();
  const balance = await AnnualLeaveBalance.findOne({
    user: employeeId,
    leaveYearStart: { $lte: now },
    leaveYearEnd: { $gte: now }
  }).lean();

  console.log(JSON.stringify({
    testEmployeeId: employeeId,
    email: testEmail,
    onboardingEntitlement: req.body.leaveEntitlement,
    savedEntitlementDays: balance?.entitlementDays ?? null,
    daysUsed: balance?.usedDays ?? null,
    remaining: balance ? ((balance.entitlementDays || 0) + (balance.carryOverDays || 0) - (balance.usedDays || 0)) : null,
    hasCurrentYearBalance: Boolean(balance)
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
