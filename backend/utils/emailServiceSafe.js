const nodemailer = require('nodemailer');

// Get email sender address
const getEmailFrom = () => process.env.EMAIL_FROM || process.env.EMAIL_USER;

// Check if email is properly configured
const isEmailConfigured = () => {
  return process.env.EMAIL_USER && 
         process.env.EMAIL_PASS && 
         process.env.EMAIL_HOST && 
         process.env.EMAIL_PORT;
};

// Check if we should mock emails
const shouldMockEmail = () => {
  return process.env.MOCK_EMAIL_SENDING === 'true' || !isEmailConfigured();
};

// Create SMTP transporter with error handling
const createTransporter = () => {
  if (shouldMockEmail()) {
    console.log('Email service is in mock mode - emails will not be sent');
    return null;
  }
  
  try {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  } catch (error) {
    console.error('Failed to create email transporter:', error.message);
    return null;
  }
};

// Safe email sending wrapper
const safeSendEmail = async (mailOptions) => {
  try {
    // If mocking is enabled, just log and return success
    if (shouldMockEmail()) {
      console.log('MOCK EMAIL:', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        preview: mailOptions.html ? mailOptions.html.substring(0, 100) + '...' : 'No content'
      });
      return { success: true, messageId: 'MOCK-' + Date.now(), mocked: true };
    }
    
    const transporter = createTransporter();
    if (!transporter) {
      console.warn('Email transporter not available - email not sent');
      return { success: false, error: 'Email service not configured', mocked: true };
    }
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId, mocked: false };
  } catch (error) {
    console.error('Email sending failed (non-critical):', error.message);
    // Don't throw - just return failure
    return { success: false, error: error.message, mocked: false };
  }
};

// Export all the original functions but with safe wrappers
module.exports = {
  // Test configuration
  testEmailConfiguration: async () => {
    if (shouldMockEmail()) {
      return { success: true, message: 'Email is in mock mode', mocked: true };
    }
    
    try {
      const transporter = createTransporter();
      if (!transporter) {
        return { success: false, error: 'Email service not configured' };
      }
      await transporter.verify();
      return { success: true, message: 'SMTP configuration is valid' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // Generic send email
  sendEmail: async ({ to, subject, html }) => {
    const mailOptions = {
      from: getEmailFrom(),
      to,
      subject,
      html
    };
    return safeSendEmail(mailOptions);
  },
  
  // Send verification email
  sendVerificationEmail: async (userEmail, verifyUrl, userName = 'User') => {
    const mailOptions = {
      from: getEmailFrom(),
      to: userEmail,
      subject: 'Verify your email - HRMS',
      html: `<div>Hello ${userName}, please verify your email by clicking <a href="${verifyUrl}">here</a></div>`
    };
    return safeSendEmail(mailOptions);
  },
  
  // Send user credentials
  sendUserCredentialsEmail: async (userEmail, userName, password, loginUrl) => {
    const mailOptions = {
      from: getEmailFrom(),
      to: userEmail,
      subject: 'Welcome to Talent Shield HRMS - Your Login Credentials',
      html: `<div>Hello ${userName}, your password is: ${password}. Login at: ${loginUrl}</div>`
    };
    return safeSendEmail(mailOptions);
  },
  
  // Send login success email
  sendLoginSuccessEmail: async (userEmail, userName, loginTime, ipAddress) => {
    const mailOptions = {
      from: getEmailFrom(),
      to: userEmail,
      subject: 'Login Successful - HRMS System',
      html: `<div>Hello ${userName}, you logged in at ${loginTime} from ${ipAddress}</div>`
    };
    return safeSendEmail(mailOptions);
  },
  
  // Send certificate expiry email
  sendCertificateExpiryEmail: async (userEmail, userName, certificateName, expiryDate, daysUntilExpiry) => {
    const mailOptions = {
      from: getEmailFrom(),
      to: userEmail,
      subject: `Certificate Expiry Warning: ${certificateName}`,
      html: `<div>Hello ${userName}, your certificate ${certificateName} expires on ${expiryDate} (${daysUntilExpiry} days)</div>`
    };
    return safeSendEmail(mailOptions);
  },
  
  // Profile event emails
  sendProfileCreationEmail: async (profileData, userData = null) => {
    const { email, firstName, lastName } = profileData;
    const mailOptions = {
      from: getEmailFrom(),
      to: email,
      subject: 'Welcome to Talent Shield HRMS - Profile Created',
      html: `<div>Hello ${firstName} ${lastName}, your profile has been created.</div>`
    };
    return safeSendEmail(mailOptions);
  },
  
  sendProfileUpdateEmail: async (profileData, updatedFields) => {
    const { email, firstName, lastName } = profileData;
    const mailOptions = {
      from: getEmailFrom(),
      to: email,
      subject: 'Profile Updated - Talent Shield HRMS',
      html: `<div>Hello ${firstName} ${lastName}, your profile has been updated.</div>`
    };
    return safeSendEmail(mailOptions);
  },
  
  sendProfileDeletionEmail: async (profileData) => {
    const { email, firstName, lastName } = profileData;
    const mailOptions = {
      from: getEmailFrom(),
      to: email,
      subject: 'Profile Deletion Notification - Talent Shield HRMS',
      html: `<div>Hello ${firstName} ${lastName}, your profile has been deleted.</div>`
    };
    return safeSendEmail(mailOptions);
  },
  
  // Certificate event emails
  sendCertificateAddedEmail: async (profileData, certificateData) => {
    const { email, firstName, lastName } = profileData;
    const { certificate } = certificateData;
    const mailOptions = {
      from: getEmailFrom(),
      to: email,
      subject: `Certificate Added: ${certificate}`,
      html: `<div>Hello ${firstName} ${lastName}, certificate ${certificate} has been added.</div>`
    };
    return safeSendEmail(mailOptions);
  },
  
  sendCertificateDeletedEmail: async (profileData, certificateData) => {
    const { email, firstName, lastName } = profileData;
    const { certificate } = certificateData;
    const mailOptions = {
      from: getEmailFrom(),
      to: email,
      subject: `Certificate Removed: ${certificate}`,
      html: `<div>Hello ${firstName} ${lastName}, certificate ${certificate} has been removed.</div>`
    };
    return safeSendEmail(mailOptions);
  },
  
  // Other emails
  sendNotificationEmail: async (userEmail, userName, subject, message, type = 'info') => {
    const mailOptions = {
      from: getEmailFrom(),
      to: userEmail,
      subject: `HRMS Notification: ${subject}`,
      html: `<div>Hello ${userName}, ${message}</div>`
    };
    return safeSendEmail(mailOptions);
  },
  
  sendAdminApprovalRequestEmail: async (superAdminEmail, applicantName, applicantEmail, approveUrl) => {
    const mailOptions = {
      from: getEmailFrom(),
      to: superAdminEmail,
      subject: 'Admin Signup Approval Request - HRMS',
      html: `<div>New admin ${applicantName} (${applicantEmail}) needs approval: ${approveUrl}</div>`
    };
    return safeSendEmail(mailOptions);
  },
  
  sendAdminNewUserCredentialsEmail: async (adminEmail, newUserName, newUserEmail, newUserPassword, loginUrl) => {
    const mailOptions = {
      from: getEmailFrom(),
      to: adminEmail,
      subject: 'New User Created - Credentials',
      html: `<div>You created user ${newUserName} (${newUserEmail}) with password: ${newUserPassword}</div>`
    };
    return safeSendEmail(mailOptions);
  },
  
  sendWelcomeEmailToNewUser: async (userEmail, userName, loginUrl) => {
    const mailOptions = {
      from: getEmailFrom(),
      to: userEmail,
      subject: 'Welcome to Talent Shield HRMS',
      html: `<div>Welcome ${userName}! Login at: ${loginUrl}</div>`
    };
    return safeSendEmail(mailOptions);
  }
};
