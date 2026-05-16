const admin = require('firebase-admin');

// Only initialize once
if (!admin.apps.length) {
  let credential;

  if (process.env.FIREBASE_PRIVATE_KEY) {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;

    // Diagnostic logging (safe — only shows structure, not actual key content)
    console.log('[Firebase] FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
    console.log('[Firebase] FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
    console.log('[Firebase] Raw key starts with:', rawKey.substring(0, 30));
    console.log('[Firebase] Key contains literal \\n:', rawKey.includes('\\n'));
    console.log('[Firebase] Key contains real newline:', rawKey.includes('\n'));

    // Replace literal \n with real newlines (Render stores them as escaped)
    const fixedKey = rawKey.includes('\\n')
      ? rawKey.replace(/\\n/g, '\n')
      : rawKey;

    console.log('[Firebase] Fixed key starts with:', fixedKey.substring(0, 50));

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
    console.log('✅ Firebase Admin credential created from env vars');

  } else {
    // Fallback: local file for development
    try {
      const serviceAccount = require('../serviceAccountKey.json');
      credential = admin.credential.cert(serviceAccount);
      console.log('✅ Firebase Admin initialized from serviceAccountKey.json');
    } catch (e) {
      console.error('❌ No Firebase credentials found. Set FIREBASE_PRIVATE_KEY or provide serviceAccountKey.json');
      process.exit(1);
    }
  }

  try {
    admin.initializeApp({ credential });
    console.log('✅ Firebase Admin app initialized successfully');
  } catch (err) {
    console.error('❌ Firebase initializeApp error:', err.message);
  }
}

module.exports = admin;
