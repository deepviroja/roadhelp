import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { AppSettings } from '@/types';

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'RoadHelp',
  acceptingNewProviders: true,
  maintenanceMode: false,
  baseCommissionRate: 15,
  payoutDelayDays: 7,
  currency: 'INR',
  currencySymbol: '₹',
  trackingInterval: 5,
  requestVisibilityHours: 24,
  heroHeadline: 'Roadside help', 
  heroSubheadline: 'without the stress.',
  heroSlides: [],
  featuredReviews: [],
  steps: [],
  sosConfig: {
    policeNumber: '100',
    ambulanceNumber: '108',
    helplineNumber: '1073',
    teamContactNumber: '1090',
    teamCount: 3,
  },
};

export { DEFAULT_SETTINGS };

export function usePlatformSettings() {
  // Start with loading=false and defaults — content renders immediately,
  // Firestore settings will silently merge in background when they arrive.
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'system', 'config'),
      (snap) => {
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...snap.data() } as AppSettings);
        }
      },
      (err) => {
        // Silently fall back to DEFAULT_SETTINGS — no UI disruption.
        console.warn('[PlatformSettings] Notice (using defaults):', err?.code || err?.message);
      }
    );

    return () => unsub();
  }, []);

  return { settings, loading };
}


