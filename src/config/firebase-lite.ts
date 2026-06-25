import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import app from './firebaseApp';

export const authLite = getAuth(app);
export const dbLite = getFirestore(app);

