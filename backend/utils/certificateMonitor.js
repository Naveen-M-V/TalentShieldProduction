const cron = require('node-cron');
const { sendCertificateExpiryEmail } = require('./emailService');

// Mock certificate data - replace with your actual certificate storage
const certificates = [
  {
    id: 1,
    name: 'SSL Certificate',
    expiryDate: new Date('2024-12-31'),
    userEmail: 'admin@company.com',
    userName: 'Admin User'
  },
  {
    id: 2,
    name: 'API Certificate',
    expiryDate: new Date('2024-11-15'),
    userEmail: 'developer@company.com',
    userName: 'Developer User'
  }
];

// Function to check certificate expiry
const checkCertificateExpiry = async () => {
  const today = new Date();
  
  for (const cert of certificates) {
    const expiryDate = new Date(cert.expiryDate);
    const timeDiff = expiryDate.getTime() - today.getTime();
    const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // Send notifications at 30, 14, 7, 3, and 1 days before expiry
    const notificationDays = [30, 14, 7, 3, 1];
    
    if (notificationDays.includes(daysUntilExpiry) && daysUntilExpiry > 0) {
      try {
        await sendCertificateExpiryEmail(
          cert.userEmail,
          cert.userName,
          cert.name,
          expiryDate.toLocaleDateString(),
          daysUntilExpiry
        );
        console.log(`Certificate expiry notification sent for ${cert.name} (${daysUntilExpiry} days remaining)`);
      } catch (error) {
        console.error(`Failed to send certificate expiry notification for ${cert.name}:`, error);
      }
    }
    
    // Send urgent notification for expired certificates
    if (daysUntilExpiry <= 0) {
      try {
        await sendCertificateExpiryEmail(
          cert.userEmail,
          cert.userName,
          cert.name,
          expiryDate.toLocaleDateString(),
          daysUntilExpiry
        );
        console.log(`URGENT: Certificate expired notification sent for ${cert.name}`);
      } catch (error) {
        console.error(`Failed to send expired certificate notification for ${cert.name}:`, error);
      }
    }
  }
};

// Schedule certificate monitoring to run daily at 9 AM
const startCertificateMonitoring = () => {
  // Run daily at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    console.log('Running certificate expiry check...');
    checkCertificateExpiry();
  });
  
  console.log('Certificate monitoring scheduled - will run daily at 9:00 AM');
};

// Manual trigger for testing
const triggerCertificateCheck = async () => {
  console.log('Manual certificate expiry check triggered...');
  await checkCertificateExpiry();
};

module.exports = {
  startCertificateMonitoring,
  triggerCertificateCheck,
  checkCertificateExpiry
};
