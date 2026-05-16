const admin = require('firebase-admin');

// Only initialize once
if (!admin.apps.length) {
  let credential;

  if (process.env.FIREBASE_PRIVATE_KEY) {
    // Use individual environment variables (preferred for Render)
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      // Render stores env vars with literal \n — replace them with real newlines
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
    };
    credential = admin.credential.cert(serviceAccount);
    console.log('✅ Firebase Admin initialized from individual env vars');

  } else {
    // Fallback: load from local file (local development only)
    try {
      const serviceAccount = require('../serviceAccountKey.json');
      credential = admin.credential.cert(serviceAccount);
      console.log('✅ Firebase Admin initialized from serviceAccountKey.json');
    } catch (e) {
      console.error('❌ No Firebase credentials found. Set FIREBASE_PRIVATE_KEY or provide serviceAccountKey.json');
      process.exit(1);
    }
  }

  admin.initializeApp({ credential });
}

module.exports = admin;
