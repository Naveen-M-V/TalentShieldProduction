const mongoose = require('mongoose');
const EmployeeHub = require('./models/EmployeesHub');
const config = require('./config/environment');

mongoose.connect(config.DB_URL)
  .then(async () => {
    const result = await EmployeeHub.deleteMany({ email: { $regex: /test\.com/ } });
    console.log(`Deleted ${result.deletedCount} test employees`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
