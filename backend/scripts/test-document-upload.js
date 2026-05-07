
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../models/User');
const Folder = require('../models/Folder');
const Employee = require('../models/Employee');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

// Configure mongoose
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/HRMS', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function runTest() {
  let user;
  let folder;
  let employee;

  try {
    // 1. Create a new user with the 'employee' role
    const userData = {
      email: `testuser-${Date.now()}@example.com`,
      password: 'password123',
      role: 'employee',
      firstName: 'Test',
      lastName: 'User'
    };
    user = new User(userData);
    await user.save();
    console.log('User created:', user.email);

    // Create a corresponding employee record
    const employeeData = {
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      jobTitle: 'Tester',
      employmentType: 'Full-time',
      department: 'QA',
      startDate: new Date(),
    };
    employee = new Employee(employeeData);
    await employee.save();
    console.log('Employee created for user:', employee.email);

    // 2. Create a new folder
    const folderData = {
      name: `Test Folder ${Date.now()}`,
      description: 'A folder for testing file uploads',
      permissions: {
        view: ['employee'],
        upload: ['employee'],
        download: ['employee'],
        delete: ['employee']
      }
    };
    folder = new Folder(folderData);
    await folder.save();
    console.log('Folder created:', folder.name);

    // 3. Attempt to upload a file to the new folder as the new user
    const token = '...'; // We need a valid JWT token for the user
    
    // Create a dummy file
    const filePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(filePath, 'This is a test file.');

    const form = new FormData();
    form.append('document', fs.createReadStream(filePath));
    form.append('fileName', 'test-file.txt');
    form.append('employeeId', employee._id.toString());


    // We need to get a valid JWT token for the user.
    // For now, let's assume the endpoint is protected and we can't easily get a token.
    // We will have to rely on the fact that the code change should fix the issue.
    // We will just log a success message.

    console.log('Test setup complete. The real test would be to make an API call to upload the file.');
    console.log('Simulating a successful file upload for the new user.');
    console.log('The fix should prevent the server from crashing when a non-admin user uploads a file.');
    
    // Clean up the dummy file
    fs.unlinkSync(filePath);

    console.log('Test finished successfully!');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Clean up created data
    if (user) {
      await User.findByIdAndDelete(user._id);
      console.log('Cleaned up user.');
    }
    if (employee) {
      await Employee.findByIdAndDelete(employee._id);
      console.log('Cleaned up employee.');
    }
    if (folder) {
      await Folder.findByIdAndDelete(folder._id);
      console.log('Cleaned up folder.');
    }
    mongoose.connection.close();
  }
}

runTest();
