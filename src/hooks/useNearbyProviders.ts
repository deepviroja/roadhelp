import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { UserProfile } from '@/types';

export function useNearbyProviders() {
  const [providers, setProviders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'provider')
      // Removed strict filters for better visibility during staging
      // where('isOnline', '==', true),
      // where('isVerified', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setProviders(data);
      setLoading(false);
    }, (err) => {
      console.error('Nearby Providers error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { providers, loading };
}
