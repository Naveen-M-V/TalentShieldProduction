const cron = require('node-cron');
const mongoose = require('mongoose');
const { 
  sendNotificationEmail
} = require('./emailService');
const {
  notifyCertificateExpiring,
  notifyCertificateExpired
} = require('./notificationService');

// Helper function to parse DD/MM/YYYY date format or Date object
function parseDate(dateInput) {
  if (!dateInput) return null;
  
  // If it's already a Date object, return it
  if (dateInput instanceof Date) return dateInput;
  
  // If it's a string, parse DD/MM/YYYY format
  if (typeof dateInput === 'string') {
    const [day, month, year] = dateInput.split('/');
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  }
  
  return null;
}

// Calculate days until expiry
function getDaysUntilExpiry(expiryDateInput) {
  const expiryDate = parseDate(expiryDateInput);
  if (!expiryDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);
  
  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Check for expiring certificates and send reminders
async function checkExpiringCertificates() {
  try {
    console.log('[Certificate Scheduler] Running certificate expiry check...', new Date().toISOString());
    
    // Get Certificate and Profile models
    const Certificate = mongoose.model('Certificate');
    const Profile = mongoose.model('Profile');
    
    const allCertificates = await Certificate.find({});
    console.log(`[Certificate Scheduler] Found ${allCertificates.length} certificates to check`);
    
    let remindersSent = 0;
    
    for (const cert of allCertificates) {
      const daysUntilExpiry = getDaysUntilExpiry(cert.expiryDate);
      
      if (daysUntilExpiry === null) {
        console.warn(`[Certificate Scheduler] Invalid expiry date for certificate: ${cert.certificate}`);
        continue;
      }
      
      // Send reminders at 60, 30, 14, 7, 3, and 1 day(s) before expiry
      const reminderDays = [60, 30, 14, 7, 3, 1];
      
      if (reminderDays.includes(daysUntilExpiry) && daysUntilExpiry > 0) {
        // Find the profile using profileId (now properly linked)
        if (!cert.profileId) {
          console.warn(`[Certificate Scheduler] No profileId for certificate: ${cert.certificate}`);
          continue;
        }
        
        const profile = await Profile.findById(cert.profileId);
        
        if (profile && profile.email) {
          console.log(`[Certificate Scheduler] Sending expiry reminder: ${cert.certificate} to ${profile.email} (${daysUntilExpiry} days remaining)`);
          
          try {
            // Use the new notification service
            await notifyCertificateExpiring(cert, profile, daysUntilExpiry);
            remindersSent++;
              
            // OPTIONAL: Track that reminder was sent (requires adding expiryRemindersSent field to Certificate schema)
            // if (!cert.expiryRemindersSent) {
            //   cert.expiryRemindersSent = [];
            // }
            // if (!cert.expiryRemindersSent.includes(daysUntilExpiry)) {
            //   cert.expiryRemindersSent.push(daysUntilExpiry);
            //   cert.lastEmailSentAt = new Date();
            //   await cert.save();
            // }
          } catch (notificationError) {
            console.error(`[Certificate Scheduler] Failed to send expiry notification:`, notificationError);
          }
        } else {
          console.warn(`[Certificate Scheduler] Profile not found for certificate: ${cert.certificate} (${cert.profileName})`);
        }
      }
    }
    
    console.log(`[Certificate Scheduler] Expiry check completed. Sent ${remindersSent} reminder(s).`);
  } catch (error) {
    console.error('[Certificate Scheduler] Error checking expiring certificates:', error);
  }
}

// Check for expired certificates and send notifications
async function checkExpiredCertificates() {
  try {
    console.log('[Certificate Scheduler] Running expired certificate check...', new Date().toISOString());
    
    // Get Certificate and Profile models
    const Certificate = mongoose.model('Certificate');
    const Profile = mongoose.model('Profile');
    
    const allCertificates = await Certificate.find({});
    console.log(`[Certificate Scheduler] Found ${allCertificates.length} certificates to check`);
    
    let expiredNotificationsSent = 0;
    
    for (const cert of allCertificates) {
      const daysUntilExpiry = getDaysUntilExpiry(cert.expiryDate);
      
      if (daysUntilExpiry === null) {
        console.warn(`[Certificate Scheduler] Invalid expiry date for certificate: ${cert.certificate}`);
        continue;
      }
      
      // If expired (negative days or zero)
      if (daysUntilExpiry <= 0) {
        // Find the profile using profileId
        if (!cert.profileId) {
          console.warn(`[Certificate Scheduler] No profileId for expired certificate: ${cert.certificate}`);
          continue;
        }
        
        const profile = await Profile.findById(cert.profileId);
        
        if (profile && profile.email) {
          console.log(`[Certificate Scheduler] Certificate EXPIRED: ${cert.certificate} for ${profile.email} (expired ${Math.abs(daysUntilExpiry)} days ago)`);
          
          // OPTION 2 (RECOMMENDED): Only send once when it first expires
          // Requires adding 'expiredEmailSent' field to Certificate schema
          if (!cert.expiredEmailSent) {
            try {
              // Use the new notification service
              await notifyCertificateExpired(cert, profile, Math.abs(daysUntilExpiry));
              expiredNotificationsSent++;
                
              // Mark as sent (requires expiredEmailSent field in schema)
              // cert.expiredEmailSent = true;
              // cert.lastEmailSentAt = new Date();
              // await cert.save();
            } catch (notificationError) {
              console.error(`[Certificate Scheduler] Failed to send expired notification:`, notificationError);
            }
          }
        } else {
          console.warn(`[Certificate Scheduler] Profile not found for expired certificate: ${cert.certificate} (${cert.profileName})`);
        }
      }
    }
    
    console.log(`[Certificate Scheduler] Expired check completed. Sent ${expiredNotificationsSent} notification(s).`);
  } catch (error) {
    console.error('[Certificate Scheduler] Error checking expired certificates:', error);
  }
}

// Start the certificate expiry reminder scheduler
// CALL THIS IN: server.js after database connection
function startCertificateExpiryScheduler() {
  // Run daily at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    checkExpiringCertificates();
  }, {
    timezone: "Europe/London" // Adjust to your timezone
  });
  
  console.log('[Certificate Scheduler] Certificate expiry reminder scheduler started (runs daily at 9:00 AM)');
}

// Start the expired certificate notification scheduler
// CALL THIS IN: server.js after database connection
function startExpiredCertificateScheduler() {
  // Run daily at 10:00 AM
  cron.schedule('0 10 * * *', () => {
    checkExpiredCertificates();
  }, {
    timezone: "Europe/London" // Adjust to your timezone
  });
  
  console.log('[Certificate Scheduler] Expired certificate notification scheduler started (runs daily at 10:00 AM)');
}

// Combined function to start both schedulers
// CALL THIS IN: server.js after database connection
function startAllCertificateSchedulers() {
  startCertificateExpiryScheduler();
  startExpiredCertificateScheduler();
  
  // Optional: Run immediately on startup for testing
  // console.log('[Certificate Scheduler] Running initial check on startup...');
  // setTimeout(() => {
  //   checkExpiringCertificates();
  //   checkExpiredCertificates();
  // }, 5000); // Wait 5 seconds after server start
}

module.exports = {
  startCertificateExpiryScheduler,
  startExpiredCertificateScheduler,
  startAllCertificateSchedulers,
  checkExpiringCertificates,
  checkExpiredCertificates,
  getDaysUntilExpiry,
  parseDate
};
