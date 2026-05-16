const admin = require('firebase-admin');
let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch (e) {
  // Fallback to environment variable for production (Render/Firebase Hosting)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      let rawData = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      
      // Check if it's Base64 (doesn't start with {)
      if (!rawData.startsWith('{')) {
        rawData = Buffer.from(rawData, 'base64').toString('utf8');
      }
      
      serviceAccount = JSON.parse(rawData);
      
      // Final fallback to fix mangled newlines if they still exist
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
    } catch (parseError) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', parseError.message);
      process.exit(1);
    }
  } else {
    console.error('FIREBASE_SERVICE_ACCOUNT environment variable is missing!');
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
