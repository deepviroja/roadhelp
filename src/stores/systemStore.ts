import { create } from 'zustand';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

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
    const unsub = onSnapshot(
      doc(db, 'system', 'config'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const newAppName = data.appName || 'RoadHelp';
          const newCurrency = data.currency || 'USD';
          document.title = newAppName + ' - Roadside Assistance';
          // Make currency accessible to formatCurrency without circular deps
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
      },
      (err) => {
        console.error('System config snapshot error:', err);
        set({ initialized: true, error: err?.message || 'Unable to load system config.' });
      }
    );
    return unsub;
  },
}));
