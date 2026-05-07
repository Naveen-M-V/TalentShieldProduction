const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import models
const User = require('../models/User');
const TimeEntry = require('../models/TimeEntry');

/**
 * Seed Script for HRMS Clock System
 * Creates dummy users and time entries for testing
 */

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms');
    console.log('✅ MongoDB connected for seeding');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const createUsers = async () => {
  try {
    // Clear existing users (except admin)
    await User.deleteMany({ role: 'user' });
    console.log('🧹 Cleared existing user data');

    // Create dummy employees
    const employees = [
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@localhost.com',
        password: 'password123',
        role: 'user',
        vtid: '1003',
        department: 'Operations',
        jobTitle: 'Blockages Specialist',
        company: 'Vitrux Ltd',
        staffType: 'Direct',
        isActive: true,
        isEmailVerified: true,
        isAdminApproved: true
      },
      {
        firstName: 'David',
        lastName: 'Levito',
        email: 'david.levito@localhost.com',
        password: 'password123',
        role: 'user',
        vtid: '1025',
        department: 'Engineering',
        jobTitle: 'Senior Engineer',
        company: 'Vitrux Ltd',
        staffType: 'Direct',
        isActive: true,
        isEmailVerified: true,
        isAdminApproved: true
      },
      {
        firstName: 'Khan',
        lastName: 'Saleem',
        email: 'khan.saleem@localhost.com',
        password: 'password123',
        role: 'user',
        vtid: '1032',
        department: 'Operations',
        jobTitle: 'Field Technician',
        company: 'Vitrux Ltd',
        staffType: 'Contract',
        isActive: true,
        isEmailVerified: true,
        isAdminApproved: true
      },
      {
        firstName: 'Arthur',
        lastName: 'Williams',
        email: 'arthur.williams@localhost.com',
        password: 'password123',
        role: 'user',
        vtid: '1087',
        department: 'Maintenance',
        jobTitle: 'Maintenance Supervisor',
        company: 'Vitrux Ltd',
        staffType: 'Direct',
        isActive: true,
        isEmailVerified: true,
        isAdminApproved: true
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@localhost.com',
        password: 'password123',
        role: 'user',
        vtid: '1045',
        department: 'Administration',
        jobTitle: 'HR Assistant',
        company: 'Vitrux Ltd',
        staffType: 'Direct',
        isActive: true,
        isEmailVerified: true,
        isAdminApproved: true
      },
      {
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'michael.brown@localhost.com',
        password: 'password123',
        role: 'user',
        vtid: '1056',
        department: 'IT',
        jobTitle: 'System Administrator',
        company: 'Vitrux Ltd',
        staffType: 'Direct',
        isActive: true,
        isEmailVerified: true,
        isAdminApproved: true
      },
      {
        firstName: 'Emma',
        lastName: 'Davis',
        email: 'emma.davis@localhost.com',
        password: 'password123',
        role: 'user',
        vtid: '1067',
        department: 'Finance',
        jobTitle: 'Accountant',
        company: 'Vitrux Ltd',
        staffType: 'Direct',
        isActive: true,
        isEmailVerified: true,
        isAdminApproved: true
      },
      {
        firstName: 'James',
        lastName: 'Wilson',
        email: 'james.wilson@localhost.com',
        password: 'password123',
        role: 'user',
        vtid: '1078',
        department: 'Operations',
        jobTitle: 'Operations Manager',
        company: 'Vitrux Ltd',
        staffType: 'Direct',
        isActive: true,
        isEmailVerified: true,
        isAdminApproved: true
      }
    ];

    const createdUsers = [];
    for (const employeeData of employees) {
      const user = new User(employeeData);
      await user.save();
      createdUsers.push(user);
      console.log(`👤 Created user: ${user.firstName} ${user.lastName} (${user.email})`);
    }

    return createdUsers;
  } catch (error) {
    console.error('❌ Error creating users:', error);
    throw error;
  }
};

const createTimeEntries = async (users) => {
  try {
    // Clear existing time entries
    await TimeEntry.deleteMany({});
    console.log('🧹 Cleared existing time entries');

    const workTypes = ['Regular', 'Overtime', 'Weekend Overtime', 'Client-side Overtime'];
    const locations = ['Work From Office', 'Work From Home', 'Field', 'Client Side'];
    const statuses = ['clocked-in', 'clocked-out', 'on-break'];

    // Create time entries for the last 30 days
    const timeEntries = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const entryDate = new Date(today);
      entryDate.setDate(today.getDate() - i);
      
      // Skip weekends for some variety
      if (entryDate.getDay() === 0 || entryDate.getDay() === 6) {
        if (Math.random() > 0.3) continue; // 70% chance to skip weekends
      }

      for (const user of users) {
        // 80% chance each user has an entry for this day
        if (Math.random() > 0.8) continue;

        const clockInHour = 8 + Math.floor(Math.random() * 2); // 8-9 AM
        const clockInMinute = Math.floor(Math.random() * 60);
        const clockInTime = `${clockInHour.toString().padStart(2, '0')}:${clockInMinute.toString().padStart(2, '0')}`;

        const workHours = 8 + Math.floor(Math.random() * 3); // 8-10 hours
        const clockOutHour = clockInHour + workHours;
        const clockOutMinute = clockInMinute + Math.floor(Math.random() * 60);
        const clockOutTime = `${(clockOutHour % 24).toString().padStart(2, '0')}:${(clockOutMinute % 60).toString().padStart(2, '0')}`;

        // Generate breaks
        const breaks = [];
        const numBreaks = Math.floor(Math.random() * 3); // 0-2 breaks
        for (let b = 0; b < numBreaks; b++) {
          const breakDuration = 15 + Math.floor(Math.random() * 45); // 15-60 minutes
          const breakStartHour = clockInHour + 2 + Math.floor(Math.random() * 4);
          const breakStartMinute = Math.floor(Math.random() * 60);
          const breakEndMinute = (breakStartMinute + breakDuration) % 60;
          const breakEndHour = breakStartHour + Math.floor((breakStartMinute + breakDuration) / 60);

          breaks.push({
            startTime: `${breakStartHour.toString().padStart(2, '0')}:${breakStartMinute.toString().padStart(2, '0')}`,
            endTime: `${breakEndHour.toString().padStart(2, '0')}:${breakEndMinute.toString().padStart(2, '0')}`,
            duration: breakDuration,
            type: ['lunch', 'coffee', 'other'][Math.floor(Math.random() * 3)]
          });
        }

        // Determine status (most entries should be clocked_out for historical data)
        let status = 'clocked-out';
        if (i === 0) { // Today's entries
          const rand = Math.random();
          if (rand < 0.4) status = 'clocked-in';
          else if (rand < 0.5) status = 'on-break';
          else status = 'clocked-out';
        }

        const timeEntry = new TimeEntry({
          employee: user._id,
          date: entryDate,
          clockIn: clockInTime,
          clockOut: status === 'clocked-out' ? clockOutTime : null,
          location: locations[Math.floor(Math.random() * locations.length)],
          workType: workTypes[Math.floor(Math.random() * workTypes.length)],
          breaks: breaks,
          status: status,
          isManualEntry: Math.random() > 0.8, // 20% are manual entries
          createdBy: user._id
        });

        await timeEntry.save();
        timeEntries.push(timeEntry);
      }
    }

    console.log(`⏰ Created ${timeEntries.length} time entries`);
    return timeEntries;
  } catch (error) {
    console.error('❌ Error creating time entries:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    
    const users = await createUsers();
    await createTimeEntries(users);
    
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Test Accounts Created:');
    console.log('Admin: admin@localhost.com / admin123');
    console.log('Users:');
    console.log('  - john.smith@localhost.com / password123');
    console.log('  - david.levito@localhost.com / password123');
    console.log('  - khan.saleem@localhost.com / password123');
    console.log('  - arthur.williams@localhost.com / password123');
    console.log('  - sarah.johnson@localhost.com / password123');
    console.log('  - michael.brown@localhost.com / password123');
    console.log('  - emma.davis@localhost.com / password123');
    console.log('  - james.wilson@localhost.com / password123');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the seeding
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
