require('dotenv').config();
const { sendEmail } = require('../services/emailService');

async function run() {
  console.log('--- SMTP Configuration Test ---');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_FROM_EMAIL:', process.env.SMTP_FROM_EMAIL);
  console.log('-------------------------------');

  const testEmail = process.argv[2] || process.env.SMTP_FROM_EMAIL;
  if (!testEmail) {
    console.error('Error: Please provide a recipient email address as an argument or set SMTP_FROM_EMAIL in your .env file.');
    console.error('Usage: node backend/scratch/test-smtp.js recipient@example.com');
    process.exit(1);
  }

  console.log(`Sending test email to: ${testEmail}...`);
  try {
    // Initialize firebase app if needed for getting appName (fallback to local mock if Firebase admin not fully online in test context)
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      console.log('Initializing Firebase admin mock for SMTP test...');
      const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
      const fixedKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: fixedKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
      };
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }

    const success = await sendEmail({
      to: testEmail,
      subject: 'SMTP Connection Test - resQroad Replacement',
      text: 'This is a test email verifying that your SMTP server details work correctly and Nodemailer is sending successfully!',
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px;">
          <h2 style="color: #2563eb; margin-top: 0;">SMTP Test Successful</h2>
          <p>This message confirms that your Node.js backend has successfully connected to the SMTP server and dispatched an email using Nodemailer.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #6b7280;">Sent via SMTP Engine.</p>
        </div>
      `
    });
    if (success) {
      console.log('SUCCESS: SMTP test email sent successfully!');
    }
  } catch (error) {
    console.error('FAILURE: SMTP test email sending failed. Details:');
    console.error(error.message || error);
  }
}

run();
