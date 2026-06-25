const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

function getFrontendUrl() {
  return process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
}

async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME || 'RoadHelp';

  if (!apiKey || !fromEmail) {
    throw new Error('SendGrid is not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.');
  }

  const response = await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: fromName },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid request failed: ${response.status} ${errorText}`);
  }
}

async function sendPasswordResetEmail({ to, resetLink, fullName }) {
  const subject = 'Reset your RoadHelp password';
  const text = [
    `Hi ${fullName || 'there'},`,
    '',
    'We received a request to reset your RoadHelp password.',
    `Reset it here: ${resetLink}`,
    '',
    'If you did not request this, you can safely ignore this email.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6">
      <p>Hi ${fullName || 'there'},</p>
      <p>We received a request to reset your RoadHelp password.</p>
      <p>
        <a href="${resetLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">
          Reset password
        </a>
      </p>
      <p>If the button does not work, use this link:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail({ to, subject, text, html });
}

async function sendWelcomeEmail({ to, fullName, loginLink, resetLink }) {
  const subject = 'Welcome to RoadHelp';
  const text = [
    `Hi ${fullName || 'there'},`,
    '',
    'Your RoadHelp account is ready.',
    `Sign in here: ${loginLink}`,
    `If you want to set a new password, use this link: ${resetLink}`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6">
      <p>Hi ${fullName || 'there'},</p>
      <p>Your RoadHelp account is ready.</p>
      <p>
        <a href="${loginLink}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">
          Sign in now
        </a>
      </p>
      <p>If you want to set a new password, use this link:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
    </div>
  `;

  await sendEmail({ to, subject, text, html });
}

module.exports = {
  getFrontendUrl,
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};
