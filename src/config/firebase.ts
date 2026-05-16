import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// Replace these values with your actual Firebase project credentials
// Get them from: https://console.firebase.google.com/ → Your Project → Project Settings → Your Apps
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "YOUR_DATABASE_URL",
};

// NOTE: Firebase Security Rules are kept open for development/testing.
// IMPORTANT: Before going to production, restrict Firestore and Realtime DB rules!
// Firestore rules: allow read, write: if request.auth != null;
// Realtime DB rules: { ".read": "auth != null", ".write": "auth != null" }

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Ensure auth persists across refreshes/navigation.
// If this fails (e.g., restricted storage), Firebase will fall back internally.
setPersistence(auth, browserLocalPersistence).catch(() => {});
// Firestore can fail behind some ad blockers / strict networks when using streaming (WebChannel).
// These options improve compatibility by falling back to long polling.
import { initializeFirestore } from 'firebase/firestore';
export const db = initializeFirestore(app, {
  // Force long-polling to avoid QUIC/HTTP3 issues on some networks.
  experimentalForceLongPolling: true,
});

function isPlaceholderDatabaseUrl(url?: string) {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('your_project') ||
    lower.includes('your_database_url') ||
    lower.includes('your_database') ||
    lower.includes('your_')
  );
}

// Use explicit URL from config, but ignore placeholder values; otherwise guess based on project ID.
// Note: If your RTDB is in a non-default region, set `VITE_FIREBASE_DATABASE_URL` to the exact URL.
const rtdbUrl =
  !isPlaceholderDatabaseUrl(firebaseConfig.databaseURL)
    ? firebaseConfig.databaseURL
    : firebaseConfig.projectId
      ? `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`
      : undefined;
export const rtdb = getDatabase(app, rtdbUrl);

export default app;
