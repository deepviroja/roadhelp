const admin = require('firebase-admin');

if (!admin.apps.length) {
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_PRIVATE_KEY_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_CLIENT_ID',
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`? Missing Firebase credentials: ${missing.join(', ')}`);
    process.exit(1);
  }

  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const fixedKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: fixedKey,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
  };

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

module.exports = admin;
