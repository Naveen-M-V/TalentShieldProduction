const DocumentManagement = require('../models/DocumentManagement');
const Certificate = require('../models/Certificate');
const EmployeeHub = require('../models/EmployeesHub');
const { sendExpiryNotificationEmail } = require('../utils/emailService');

/**
 * Check for expiring documents and send reminders
 * Run this as a daily cron job
 */
async function checkExpiringDocuments() {
  try {
    console.log('🔍 Checking for expiring documents...');
    
    // Get documents expiring in next 30, 14, 7, 3, and 1 days
    const reminderIntervals = [30, 14, 7, 3, 1];
    let totalReminders = 0;
    
    for (const days of reminderIntervals) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      
      // Check documents
      const expiringDocs = await DocumentManagement.find({
        expiresOn: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        isActive: true,
        isArchived: false
      }).populate('employeeRef', 'firstName lastName email');
      
      console.log(`📄 Found ${expiringDocs.length} documents expiring in ${days} days`);
      
      for (const doc of expiringDocs) {
        try {
          const employee = doc.employeeRef;
          
          if (!employee || !employee.email) {
            console.warn(`⚠️ No employee or email for document ${doc._id}`);
            continue;
          }
          
          // Send expiry reminder email
          const documentUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents/${doc._id}`;
          
          await sendExpiryNotificationEmail(
            employee.email,
            `${employee.firstName} ${employee.lastName}`,
            doc.name || doc.fileName,
            'Document',
            doc.expiresOn,
            days,
            documentUrl
          );
          
          console.log(`✅ Sent expiry reminder to ${employee.email} for document: ${doc.name || doc.fileName}`);
          totalReminders++;
          
        } catch (emailError) {
          console.error(`❌ Failed to send reminder for document ${doc._id}:`, emailError.message);
        }
      }
    }
    
    console.log(`📧 Total expiry reminders sent: ${totalReminders}`);
    
    // Check for already expired documents and auto-archive them
    const expiredDocs = await DocumentManagement.find({
      expiresOn: { $lt: new Date() },
      isActive: true,
      isArchived: false
    }).populate('employeeRef', 'firstName lastName email');
    
    console.log(`🚨 Found ${expiredDocs.length} expired documents`);
    
    for (const doc of expiredDocs) {
      try {
        // Archive expired document
        doc.isArchived = true;
        doc.archivedAt = new Date();
        doc.archivedBy = 'system-auto-archive';
        await doc.save();
        
        console.log(`📁 Auto-archived expired document: ${doc.name || doc.fileName}`);
        
      } catch (archiveError) {
        console.error(`❌ Failed to archive document ${doc._id}:`, archiveError.message);
      }
    }
    
    console.log('✅ Document expiry check completed');
    return {
      remindersSent: totalReminders,
      documentsArchived: expiredDocs.length
    };
    
  } catch (error) {
    console.error('❌ Document expiry checker error:', error);
    throw error;
  }
}

/**
 * Check for expiring certificates and send reminders
 */
async function checkExpiringCertificates() {
  try {
    console.log('🔍 Checking for expiring certificates...');
    
    const reminderIntervals = [30, 14, 7, 3, 1];
    let totalReminders = 0;
    
    for (const days of reminderIntervals) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      
      // Check certificates
      const expiringCerts = await Certificate.find({
        expiryDate: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        isActive: true
      }).populate('employeeRef', 'firstName lastName email');
      
      console.log(`🎓 Found ${expiringCerts.length} certificates expiring in ${days} days`);
      
      for (const cert of expiringCerts) {
        try {
          const employee = cert.employeeRef;
          
          if (!employee || !employee.email) {
            console.warn(`⚠️ No employee or email for certificate ${cert._id}`);
            continue;
          }
          
          const certificateUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/certificates/${cert._id}`;
          
          await sendExpiryNotificationEmail(
            employee.email,
            `${employee.firstName} ${employee.lastName}`,
            cert.name,
            'Certificate',
            cert.expiryDate,
            days,
            certificateUrl
          );
          
          console.log(`✅ Sent expiry reminder to ${employee.email} for certificate: ${cert.name}`);
          totalReminders++;
          
        } catch (emailError) {
          console.error(`❌ Failed to send reminder for certificate ${cert._id}:`, emailError.message);
        }
      }
    }
    
    console.log(`📧 Total certificate reminders sent: ${totalReminders}`);
    
    // Mark expired certificates
    const expiredCerts = await Certificate.find({
      expiryDate: { $lt: new Date() },
      isActive: true,
      status: { $ne: 'expired' }
    });
    
    console.log(`🚨 Found ${expiredCerts.length} expired certificates`);
    
    for (const cert of expiredCerts) {
      try {
        cert.status = 'expired';
        await cert.save();
        console.log(`📁 Marked certificate as expired: ${cert.name}`);
      } catch (error) {
        console.error(`❌ Failed to update certificate ${cert._id}:`, error.message);
      }
    }
    
    console.log('✅ Certificate expiry check completed');
    return {
      remindersSent: totalReminders,
      certificatesExpired: expiredCerts.length
    };
    
  } catch (error) {
    console.error('❌ Certificate expiry checker error:', error);
    throw error;
  }
}

/**
 * Run both document and certificate checks
 */
async function runExpiryChecks() {
  console.log('\n========================================');
  console.log('🚀 Starting Expiry Checks');
  console.log(`📅 Date: ${new Date().toLocaleString()}`);
  console.log('========================================\n');
  
  const results = {
    documents: null,
    certificates: null,
    success: true,
    timestamp: new Date()
  };
  
  try {
    results.documents = await checkExpiringDocuments();
  } catch (error) {
    console.error('❌ Document check failed:', error);
    results.success = false;
  }
  
  try {
    results.certificates = await checkExpiringCertificates();
  } catch (error) {
    console.error('❌ Certificate check failed:', error);
    results.success = false;
  }
  
  console.log('\n========================================');
  console.log('✅ Expiry Checks Completed');
  console.log(`📊 Summary:`);
  console.log(`   - Document reminders: ${results.documents?.remindersSent || 0}`);
  console.log(`   - Documents archived: ${results.documents?.documentsArchived || 0}`);
  console.log(`   - Certificate reminders: ${results.certificates?.remindersSent || 0}`);
  console.log(`   - Certificates expired: ${results.certificates?.certificatesExpired || 0}`);
  console.log('========================================\n');
  
  return results;
}

// If running directly from command line
if (require.main === module) {
  const mongoose = require('mongoose');
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
  
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms')
    .then(() => {
      console.log('✅ Connected to MongoDB');
      return runExpiryChecks();
    })
    .then((results) => {
      console.log('✅ Script completed successfully');
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { 
  checkExpiringDocuments, 
  checkExpiringCertificates, 
  runExpiryChecks 
};
