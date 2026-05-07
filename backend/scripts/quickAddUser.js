const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');

/**
 * Quick script to add john.smith@localhost.com user
 */

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms');
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const addUser = async () => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'john.smith@localhost.com' });
    if (existingUser) {
      console.log('✅ User already exists: john.smith@localhost.com');
      return;
    }

    // Create the user
    const user = new User({
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@localhost.com',
      password: 'password123', // Will be hashed automatically
      role: 'user',
      vtid: '1003',
      department: 'Operations',
      jobTitle: 'Blockages Specialist',
      isActive: true,
      isEmailVerified: true,
      emailVerified: true,
      isAdminApproved: true
    });

    await user.save();
    console.log('✅ User created: john.smith@localhost.com / password123');
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

connectDB().then(addUser);
