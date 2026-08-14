const admin = require('firebase-admin');

function getFrontendUrl() {
  return process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
}

async function getAppName() {
  try {
    const db = admin.firestore();
    const snap = await db.collection('system').doc('config').get();
    if (snap.exists) {
      const data = snap.data();
      return data.appName || 'RoadHelp';
    }
  } catch (err) {
    console.error('Failed to fetch appName from Firestore system config:', err);
  }
  return 'RoadHelp';
}

async function sendEmail({ to, subject, text, html }) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  
  const db = admin.firestore();
  const sysSnap = await db.collection('system').doc('config').get();
  const sysConfig = sysSnap.exists ? sysSnap.data() : {};
  const fromEmail = sysConfig.smtpFromEmail || process.env.SMTP_FROM_EMAIL;

  if (!host || !fromEmail) {
    throw new Error('SMTP is not configured. Set SMTP_FROM_EMAIL or configure in Admin Settings.');
  }

  const appName = sysConfig.appName || 'RoadHelp';
  const fromName = sysConfig.smtpFromName || process.env.SMTP_FROM_NAME || appName;
  const nodemailer = require('nodemailer');

  const configuredPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const portsToTry = configuredPort === 465 ? [465, 587] : [configuredPort, 465];
  const ports = Array.from(new Set(portsToTry));

  let lastError = null;

  for (const port of ports) {
    const isSecure = port === 465;
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: isSecure,
        auth: user && pass ? { user, pass } : undefined,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
        family: 4,
        tls: {
          rejectUnauthorized: false,
          servername: host,
        },
      });

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
      });

      return true;
    } catch (error) {
      lastError = error;
      console.warn(`[SMTP] Attempt on port ${port} failed (${error.message}). Trying alternate port...`);
    }
  }

  console.error('[SMTP] All delivery attempts failed:', lastError?.message);
  throw new Error(`SMTP Mail delivery failed: ${lastError?.message || 'Connection timeout'}`);
}

async function getEmailTemplate(key) {
  try {
    const db = admin.firestore();
    const snap = await db.collection('system').doc('emailTemplates').get();
    if (snap.exists) {
      const data = snap.data();
      if (data && data[key]) {
        return data[key];
      }
    }
  } catch (err) {
    console.error(`Failed to fetch email template ${key} from Firestore:`, err);
  }
  return null;
}

async function renderTemplate(key, defaults, replacements) {
  const custom = await getEmailTemplate(key);
  let subject = custom?.subject || defaults.subject;
  let body = custom?.body || defaults.body;

  const appName = await getAppName();
  if (!replacements.appName) {
    replacements.appName = appName;
  }

  Object.keys(replacements).forEach((k) => {
    const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
    subject = subject.replace(regex, replacements[k]);
    body = body.replace(regex, replacements[k]);
  });

  return { subject, body };
}

async function sendPasswordResetEmail({ to, resetLink, fullName }) {
  const { subject, body } = await renderTemplate('passwordReset', {
    subject: 'Reset your {{appName}} password',
    body: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #2563eb; font-weight: 800; margin: 0;">{{appName}} Security</h2>
        </div>
        <p style="font-size: 16px;">Hi {{fullName}},</p>
        <p style="font-size: 14px; color: #475569;">We received a request to reset your {{appName}} password. Click the button below to choose a new password. This link is valid for 1 hour.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="{{resetLink}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
            Reset Password
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `
  }, { fullName: fullName || 'there', resetLink });

  await sendEmail({ to, subject, text: body.replace(/<[^>]*>?/gm, ''), html: body });
}

async function sendWelcomeEmail({ to, fullName, loginLink, resetLink }) {
  const { subject, body } = await renderTemplate('welcome', {
    subject: 'Welcome to {{appName}}',
    body: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #2563eb; font-weight: 800; margin: 0;">Welcome to {{appName}}</h2>
        </div>
        <p style="font-size: 16px;">Hi {{fullName}},</p>
        <p style="font-size: 14px; color: #475569;">Your account is ready. You can sign in using your email address.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="{{loginLink}}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px;">
            Sign In Now
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px;">If you wish to set a custom password, you may use the forgot password flow on the sign in page.</p>
      </div>
    `
  }, { fullName: fullName || 'there', loginLink, resetLink });

  await sendEmail({ to, subject, text: body.replace(/<[^>]*>?/gm, ''), html: body });
}

async function sendRequestReceivedEmail({ to, fullName, loginLink }) {
  const { subject, body } = await renderTemplate('requestReceived', {
    subject: 'Your {{appName}} Request Received',
    body: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #2563eb; font-weight: 800; margin: 0;">{{appName}} Dispatch</h2>
        </div>
        <p style="font-size: 16px;">Hi {{fullName}},</p>
        <p style="font-size: 14px; color: #475569;">We have received your new service request.</p>
        <p style="font-size: 14px; color: #475569;">Please sign in to track the status of your request and see real-time updates.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="{{loginLink}}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px;">
            Track Service Status
          </a>
        </div>
      </div>
    `
  }, { fullName: fullName || 'there', loginLink });

  await sendEmail({ to, subject, text: body.replace(/<[^>]*>?/gm, ''), html: body });
}

async function sendOtpEmail({ to, otp, fullName, type = 'login' }) {
  const templateKey = type === 'signup' ? 'signupOtp' : 'loginOtp';
  const { subject, body } = await renderTemplate(templateKey, {
    subject: 'Your {{appName}} Verification Code',
    body: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #2563eb; font-weight: 800; margin: 0;">{{appName}} Verification</h2>
        </div>
        <p style="font-size: 16px;">Hi {{fullName}},</p>
        <p style="font-size: 14px; color: #475569;">Use the following 6-digit verification code to complete your verification. This code is valid for 10 minutes.</p>
        <div style="text-align: center; margin: 32px 0;">
          <div style="display: inline-block; background-color: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 16px; padding: 16px 32px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0f172a;">
            {{otp}}
          </div>
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">If you did not make this request, please ignore this email.</p>
      </div>
    `
  }, { fullName: fullName || 'there', otp });

  await sendEmail({ to, subject, text: body.replace(/<[^>]*>?/gm, ''), html: body });
}

async function sendWelcomeGuestEmail({ to, fullName, password, magicLink }) {
  const { subject, body } = await renderTemplate('welcomeGuest', {
    subject: 'Welcome to {{appName}} - Account Created',
    body: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #2563eb; font-weight: 800; margin: 0;">Welcome to {{appName}}</h2>
        </div>
        <p style="font-size: 16px;">Hi {{fullName}},</p>
        <p style="font-size: 14px; color: #475569;">An account has been created for you to help you track your service request.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; font-size: 13px; color: #64748b;"><strong>Account Details:</strong></p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #334155;"><strong>Email:</strong> {{email}}</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 700;">{{password}}</code></p>
          <p style="margin: 12px 0 0 0; font-size: 12px; color: #94a3b8; font-style: italic;">Note: You can change this password at any time in settings or via the forgot password page.</p>
        </div>

        <p style="font-size: 14px; color: #475569;">To track your request in real-time, click the button below to log in directly:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="{{magicLink}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
            Track Service Now
          </a>
        </div>
      </div>
    `
  }, { fullName: fullName || 'there', email: to, password, magicLink });

  await sendEmail({ to, subject, text: body.replace(/<[^>]*>?/gm, ''), html: body });
}

async function sendMagicLinkEmail({ to, fullName, magicLink }) {
  const { subject, body } = await renderTemplate('magicLink', {
    subject: 'Access your {{appName}} Account',
    body: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #2563eb; font-weight: 800; margin: 0;">{{appName}} Magic Link</h2>
        </div>
        <p style="font-size: 16px;">Hi {{fullName}},</p>
        <p style="font-size: 14px; color: #475569;">Click the button below to log in directly to your {{appName}} dashboard. This link is valid for 10 minutes and can only be used once.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="{{magicLink}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
            Sign In to Dashboard
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">If you did not request this link, you can safely ignore this email.</p>
      </div>
    `
  }, { fullName: fullName || 'there', magicLink });

  await sendEmail({ to, subject, text: body.replace(/<[^>]*>?/gm, ''), html: body });
}

module.exports = {
  getFrontendUrl,
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendRequestReceivedEmail,
  sendOtpEmail,
  sendWelcomeGuestEmail,
  sendMagicLinkEmail,
};
