import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { AppSettings } from '@/types';

export function usePlatformSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'platform'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as AppSettings);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { settings, loading };
}

