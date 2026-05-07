/**
 * Test Email Configuration
 * Tests the email service configuration and sends a test email
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');

console.log('📧 Email Configuration Test\n');
console.log('==========================\n');

// Display current configuration (hide password)
console.log('Current Email Settings:');
console.log('- EMAIL_HOST:', process.env.EMAIL_HOST || '❌ NOT SET');
console.log('- EMAIL_PORT:', process.env.EMAIL_PORT || '❌ NOT SET');
console.log('- EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
console.log('- EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ SET (hidden)' : '❌ NOT SET');
console.log('- EMAIL_FROM:', process.env.EMAIL_FROM || process.env.EMAIL_USER || '❌ NOT SET');
console.log('- EMAIL_SECURE:', process.env.EMAIL_SECURE || 'false');
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL || 'http://localhost:3000');
console.log('\n');

// Check if all required fields are set
const missingFields = [];
if (!process.env.EMAIL_HOST) missingFields.push('EMAIL_HOST');
if (!process.env.EMAIL_PORT) missingFields.push('EMAIL_PORT');
if (!process.env.EMAIL_USER) missingFields.push('EMAIL_USER');
if (!process.env.EMAIL_PASS) missingFields.push('EMAIL_PASS');

if (missingFields.length > 0) {
  console.error('❌ Missing required email configuration:');
  missingFields.forEach(field => console.error(`   - ${field}`));
  console.log('\n📝 Please add these to your .env file:');
  console.log('   EMAIL_HOST=smtp.gmail.com (or your SMTP server)');
  console.log('   EMAIL_PORT=587 (or 465 for SSL)');
  console.log('   EMAIL_USER=your-email@gmail.com');
  console.log('   EMAIL_PASS=your-app-password');
  console.log('   EMAIL_FROM=noreply@yourdomain.com (optional)');
  console.log('   EMAIL_SECURE=false (true for port 465)');
  process.exit(1);
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 10000
});

// Test connection
console.log('🔍 Testing SMTP connection...\n');
transporter.verify()
  .then(() => {
    console.log('✅ SMTP connection successful!\n');
    
    // Ask if user wants to send test email
    const testEmail = process.argv[2];
    if (testEmail) {
      console.log(`📤 Sending test email to: ${testEmail}\n`);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: testEmail,
        subject: '✅ HRMS Email Test - Configuration Working',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
              <h1>✅ Email Configuration Test</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <p>This is a test email from your HRMS system.</p>
              <p><strong>✅ Your email configuration is working correctly!</strong></p>
              <div style="background-color:#fff;padding:20px;border-radius:8px;margin:20px 0;">
                <h3>Email Settings:</h3>
                <ul>
                  <li>Host: ${process.env.EMAIL_HOST}</li>
                  <li>Port: ${process.env.EMAIL_PORT}</li>
                  <li>User: ${process.env.EMAIL_USER}</li>
                  <li>From: ${process.env.EMAIL_FROM || process.env.EMAIL_USER}</li>
                  <li>Secure: ${process.env.EMAIL_SECURE || 'false'}</li>
                </ul>
              </div>
              <p>You should now receive emails for:</p>
              <ul>
                <li>New employee credentials</li>
                <li>Password reset requests</li>
                <li>Certificate expiry notifications</li>
                <li>Leave request notifications</li>
              </ul>
              <p>Sent at: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        `
      };
      
      return transporter.sendMail(mailOptions);
    } else {
      console.log('ℹ️  To send a test email, run:');
      console.log(`   node scripts/testEmailConfig.js your-email@example.com\n`);
      process.exit(0);
    }
  })
  .then((info) => {
    if (info) {
      console.log('✅ Test email sent successfully!');
      console.log('   Message ID:', info.messageId);
      console.log('   Check your inbox for the test email.\n');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Email configuration error:\n');
    console.error('Error:', error.message);
    console.error('\nCommon issues:');
    console.error('1. Gmail: Use App Password instead of regular password');
    console.error('   - Go to: https://myaccount.google.com/apppasswords');
    console.error('   - Generate new app password');
    console.error('   - Use that password in EMAIL_PASS');
    console.error('');
    console.error('2. Wrong SMTP settings:');
    console.error('   - Gmail: smtp.gmail.com, port 587');
    console.error('   - Outlook: smtp-mail.outlook.com, port 587');
    console.error('   - Yahoo: smtp.mail.yahoo.com, port 587');
    console.error('');
    console.error('3. Firewall blocking SMTP ports');
    console.error('4. Two-factor authentication not configured properly\n');
    console.error('Full error details:', error);
    process.exit(1);
  });
