const admin = require('firebase-admin');

// Only initialize once
if (!admin.apps.length) {
  let credential;

  if (process.env.FIREBASE_PRIVATE_KEY) {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;
    // Replace literal \n with real newlines (Render stores them as escaped)
    const fixedKey = rawKey.includes('\\n')
      ? rawKey.replace(/\\n/g, '\n')
      : rawKey;

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
    credential = admin.credential.cert(serviceAccount);
  } else {
    // Fallback: local file for development
    try {
      const serviceAccount = require('../serviceAccountKey.json');
      credential = admin.credential.cert(serviceAccount);
    } catch (e) {
      console.error('❌ No Firebase credentials found. Set FIREBASE_PRIVATE_KEY or provide serviceAccountKey.json');
      process.exit(1);
    }
  }

  admin.initializeApp({ credential });
}

module.exports = admin;
