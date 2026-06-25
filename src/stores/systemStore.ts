import { create } from 'zustand';
import { doc, getDoc } from 'firebase/firestore';
import { dbLite as db } from '@/config/firebase-lite';

interface SystemState {
  appName: string;
  maintenanceMode: boolean;
  acceptingNewProviders: boolean;
  baseCommissionRate: number;
  currency: string;
  currencySymbol: string;
  trackingInterval: number;
  error: string | null;
  initialized: boolean;
  initialize: () => () => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  appName: 'RoadHelp',
  maintenanceMode: false,
  acceptingNewProviders: true,
  baseCommissionRate: 15,
  currency: 'USD',
  currencySymbol: '$',
  trackingInterval: 5,
  error: null,
  initialized: false,
  initialize: () => {
    let cancelled = false;

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'system', 'config'));
        if (cancelled) return;

        if (snap.exists()) {
          const data = snap.data();
          const newAppName = data.appName || 'RoadHelp';
          const newCurrency = data.currency || 'USD';
          document.title = newAppName + ' - Roadside Assistance';
          (window as unknown as Record<string, unknown>).__systemCurrency = newCurrency;
          set({
            appName: newAppName,
            maintenanceMode: data.maintenanceMode || false,
            acceptingNewProviders: data.acceptingNewProviders !== false,
            baseCommissionRate: data.baseCommissionRate || 15,
            currency: newCurrency,
            currencySymbol: data.currencySymbol || '$',
            trackingInterval: data.trackingInterval || 5,
            error: null,
            initialized: true,
          });
        } else {
          set({ initialized: true, error: null });
        }
      } catch (err) {
        console.error('System config load error:', err);
        if (!cancelled) {
          set({ initialized: true, error: (err as Error)?.message || 'Unable to load system config.' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  },
}));
