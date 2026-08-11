import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import app, { firebaseConfig } from './firebaseApp';

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

export const db = getFirestore(app);
export const storage = getStorage(app);

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

const rtdbUrl =
  !isPlaceholderDatabaseUrl(firebaseConfig.databaseURL)
    ? firebaseConfig.databaseURL
    : firebaseConfig.projectId
      ? `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`
      : undefined;
export const rtdb = getDatabase(app, rtdbUrl);

export default app;
