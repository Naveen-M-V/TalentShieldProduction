// src/utils/notificationUtils.js
export const calculateDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export const getCertificateExpiryNotifications = (certificates, userEmail) => {
  if (!Array.isArray(certificates)) {
    console.error("Expected an array of certificates, but got:", certificates);
    return [];
  }

  const notifications = [];
  const today = new Date();

  certificates.forEach(cert => {
    if (!cert.expiryDate) return;

    const daysUntilExpiry = calculateDaysUntilExpiry(cert.expiryDate);

    // Create notifications for certificates expiring in 30, 14, 7, and 1 days
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      let priority = 'low';
      let message = '';

      if (daysUntilExpiry <= 1) {
        priority = 'critical';
        message = `Certificate "${cert.certificate}" expires today!`;
      } else if (daysUntilExpiry <= 7) {
        priority = 'high';
        message = `Certificate "${cert.certificate}" expires in ${daysUntilExpiry} days`;
      } else if (daysUntilExpiry <= 14) {
        priority = 'medium';
        message = `Certificate "${cert.certificate}" expires in ${daysUntilExpiry} days`;
      } else {
        priority = 'low';
        message = `Certificate "${cert.certificate}" expires in ${daysUntilExpiry} days`;
      }

      notifications.push({
        id: `cert-expiry-${cert.id || cert._id}`,
        type: 'certificate_expiry',
        priority,
        message,
        certificate: cert,
        daysUntilExpiry,
        userEmail,
        createdAt: today.toISOString(),
        read: false
      });
    } else if (daysUntilExpiry <= 0) {
      // Certificate has already expired
      notifications.push({
        id: `cert-expired-${cert.id || cert._id}`,
        type: 'certificate_expired',
        priority: 'critical',
        message: `Certificate "${cert.certificate}" has expired!`,
        certificate: cert,
        daysUntilExpiry,
        userEmail,
        createdAt: today.toISOString(),
        read: false
      });
    }
  });

  return notifications.sort((a, b) => {
    // Sort by priority: critical > high > medium > low
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

export const generateEmailNotification = (notification) => {
  const { certificate, daysUntilExpiry, userEmail } = notification;
  
  let subject = '';
  let body = '';
  
  if (daysUntilExpiry <= 0) {
    subject = `URGENT: Certificate "${certificate.certificate}" has expired`;
    body = `
Dear User,

Your certificate "${certificate.certificate}" has expired as of ${certificate.expiryDate}.

Certificate Details:
- Certificate Name: ${certificate.certificate}
- Provider: ${certificate.provider || 'N/A'}
- Expiry Date: ${certificate.expiryDate}
- Status: EXPIRED

Please renew this certificate immediately to maintain compliance.

Best regards,
HRMS Team
    `;
  } else if (daysUntilExpiry <= 7) {
    subject = `URGENT: Certificate "${certificate.certificate}" expires in ${daysUntilExpiry} days`;
    body = `
Dear User,

Your certificate "${certificate.certificate}" will expire in ${daysUntilExpiry} days.

Certificate Details:
- Certificate Name: ${certificate.certificate}
- Provider: ${certificate.provider || 'N/A'}
- Expiry Date: ${certificate.expiryDate}
- Days Remaining: ${daysUntilExpiry}

Please take immediate action to renew this certificate.

Best regards,
HRMS Team
    `;
  } else {
    subject = `Reminder: Certificate "${certificate.certificate}" expires in ${daysUntilExpiry} days`;
    body = `
Dear User,

This is a reminder that your certificate "${certificate.certificate}" will expire in ${daysUntilExpiry} days.

Certificate Details:
- Certificate Name: ${certificate.certificate}
- Provider: ${certificate.provider || 'N/A'}
- Expiry Date: ${certificate.expiryDate}
- Days Remaining: ${daysUntilExpiry}

Please plan to renew this certificate before it expires.

Best regards,
HRMS Team
    `;
  }
  
  return {
    to: userEmail,
    subject,
    body,
    type: 'certificate_expiry',
    certificateId: certificate.id || certificate._id
  };
};
