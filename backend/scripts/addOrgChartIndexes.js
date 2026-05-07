/**
 * Migration script to add indexes for organizational chart functionality
 * This script adds indexes to improve query performance for the organizational chart
 */

const mongoose = require('mongoose');
const EmployeeHub = require('../models/EmployeesHub');

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

/**
 * Add indexes for organizational chart performance
 */
const addOrgChartIndexes = async () => {
  try {
    console.log('🚀 Adding organizational chart indexes...');

    // Add index for managerId field for faster lookups
    console.log('Adding managerId index...');
    await EmployeeHub.collection.createIndex({ managerId: 1 });
    console.log('✅ managerId index added');

    // Add compound index for active employees with their managers
    console.log('Adding compound index for active employees...');
    await EmployeeHub.collection.createIndex({ 
      managerId: 1, 
      isActive: 1, 
      status: 1 
    });
    console.log('✅ Compound index added');

    // Add index for department filtering
    console.log('Adding department index...');
    await EmployeeHub.collection.createIndex({ department: 1 });
    console.log('✅ Department index added');

    // Add index for team filtering
    console.log('Adding team index...');
    await EmployeeHub.collection.createIndex({ team: 1 });
    console.log('✅ Team index added');

    console.log('🎉 All organizational chart indexes added successfully!');
    
    // Show existing indexes
    const indexes = await EmployeeHub.collection.getIndexes();
    console.log('\n📋 Current indexes on EmployeeHub collection:');
    Object.keys(indexes).forEach(key => {
      console.log(`  - ${key}: ${JSON.stringify(indexes[key].key)}`);
    });

  } catch (error) {
    console.error('❌ Error adding indexes:', error);
    throw error;
  }
};

/**
 * Create sample hierarchical data for testing
 */
const createSampleData = async () => {
  try {
    console.log('\n🔧 Creating sample organizational chart data...');
    
    // Find CEO (employee without manager)
    const ceo = await EmployeeHub.findOne({ managerId: null, isActive: true });
    
    if (!ceo) {
      console.log('⚠️  No CEO found. Please create an employee without a manager first.');
      return;
    }

    // Get some employees to assign as managers
    const managers = await EmployeeHub.find({ 
      isActive: true, 
      status: { $ne: 'Terminated' },
      _id: { $ne: ceo._id }
    }).limit(5);

    if (managers.length < 2) {
      console.log('⚠️  Need at least 2 employees besides CEO to create hierarchy');
      return;
    }

    // Assign first manager to CEO
    await EmployeeHub.findByIdAndUpdate(managers[0]._id, { managerId: ceo._id });
    console.log(`✅ Assigned ${managers[0].firstName} ${managers[0].lastName} to report to CEO`);

    // Assign remaining managers to first manager
    for (let i = 1; i < managers.length; i++) {
      await EmployeeHub.findByIdAndUpdate(managers[i]._id, { managerId: managers[0]._id });
      console.log(`✅ Assigned ${managers[i].firstName} ${managers[i].lastName} to report to ${managers[0].firstName} ${managers[0].lastName}`);
    }

    console.log('🎉 Sample organizational chart data created!');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  }
};

// Main execution
const runMigration = async () => {
  try {
    await connectDB();
    
    // Add indexes
    await addOrgChartIndexes();
    
    // Ask if user wants to create sample data
    console.log('\n❓ Do you want to create sample hierarchical data? (y/n)');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', async (key) => {
      if (key === 'y' || key === 'Y') {
        await createSampleData();
      } else if (key === 'n' || key === 'N') {
        console.log('Skipping sample data creation.');
      }
      
      console.log('\n👋 Migration completed!');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Migration interrupted by user');
  process.exit(0);
});

// Run the migration
if (require.main === module) {
  runMigration();
}

module.exports = { addOrgChartIndexes, createSampleData };
