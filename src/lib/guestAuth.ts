import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/config/firebase';

export async function ensureGuestAuth() {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (e) {
    console.error('Guest auth failed', e);
    throw e;
  }
}
