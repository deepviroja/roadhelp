const admin = require('firebase-admin');
let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch (e) {
  // Fallback to environment variable for production (Render/Firebase Hosting)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      // Fix for private key newlines that often get mangled in environment variables
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
    } catch (parseError) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', parseError.message);
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
