import { create } from 'zustand';
import { doc, onSnapshot } from 'firebase/firestore';
import { dbLite as db } from '@/config/firebase-lite';

interface SystemState {
  appName: string;
  logoUrl?: string;
  supportPhone?: string;
  supportEmail?: string;
  maintenanceMode: boolean;
  acceptingNewProviders: boolean;
  baseCommissionRate: number;
  currency: string;
  currencySymbol: string;
  trackingInterval: number;
  requestVisibilityHours: number;
  smtpFromEmail?: string;
  smtpFromName?: string;
  disableOtp: boolean;
  heroBgImage?: string;
  pageContent: Record<string, any>;
  error: string | null;
  initialized: boolean;
  initialize: () => () => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  appName: 'RoadHelp',
  logoUrl: '',
  supportPhone: '+91 1800 123 4567',
  supportEmail: 'help@roadhelp.com',
  maintenanceMode: false,
  acceptingNewProviders: true,
  baseCommissionRate: 15,
  currency: 'INR',
  currencySymbol: '₹',
  trackingInterval: 5,
  requestVisibilityHours: 24,
  disableOtp: false,
  heroBgImage: '',
  pageContent: {},
  error: null,
  initialized: false,
  initialize: () => {
    let cancelled = false;

    try {
      const cachedConfig = localStorage.getItem('system:config');
      const cachedPages = localStorage.getItem('system:pages');
      if (cachedConfig) {
        const data = JSON.parse(cachedConfig);
        const newAppName = data.appName || 'RoadHelp';
        const newCurrency = data.currency || 'INR';
        document.title = newAppName + ' - Roadside Assistance';
        (window as any).__systemCurrency = newCurrency;
        set({
          appName: newAppName,
          logoUrl: data.logoUrl || '',
          supportPhone: data.supportPhone || '+91 1800 123 4567',
          supportEmail: data.supportEmail || 'help@roadhelp.com',
          maintenanceMode: data.maintenanceMode || false,
          acceptingNewProviders: data.acceptingNewProviders !== false,
          baseCommissionRate: data.baseCommissionRate || 15,
          currency: newCurrency,
          currencySymbol: data.currencySymbol || '₹',
          trackingInterval: data.trackingInterval || 5,
          requestVisibilityHours: Number(data.requestVisibilityHours || 24),
          smtpFromEmail: data.smtpFromEmail || '',
          smtpFromName: data.smtpFromName || '',
          disableOtp: data.disableOtp || false,
          heroBgImage: data.heroBgImage || '',
          pageContent: cachedPages ? JSON.parse(cachedPages) : {},
          initialized: true,
        });
      }
    } catch (e) {
      console.error('Failed to load system store cache:', e);
    }

    let latestConfig: any = null;
    let latestPages: any = null;

    const updateStore = () => {
      if (cancelled) return;
      const config = latestConfig || {};
      const pages = latestPages || {};
      const newAppName = config.appName || 'RoadHelp';
      const newCurrency = config.currency || 'INR';

      document.title = newAppName + ' - Roadside Assistance';
      (window as any).__systemCurrency = newCurrency;

      set({
        appName: newAppName,
        logoUrl: config.logoUrl || '',
        supportPhone: config.supportPhone || '+91 1800 123 4567',
        supportEmail: config.supportEmail || 'help@roadhelp.com',
        maintenanceMode: config.maintenanceMode || false,
        acceptingNewProviders: config.acceptingNewProviders !== false,
        baseCommissionRate: config.baseCommissionRate || 15,
        currency: newCurrency,
        currencySymbol: config.currencySymbol || '₹',
        trackingInterval: config.trackingInterval || 5,
        requestVisibilityHours: Number(config.requestVisibilityHours || 24),
        smtpFromEmail: config.smtpFromEmail || '',
        smtpFromName: config.smtpFromName || '',
        disableOtp: config.disableOtp || false,
        heroBgImage: config.heroBgImage || '',
        pageContent: pages,
        error: null,
        initialized: true,
      });

      try {
        localStorage.setItem('system:config', JSON.stringify(config));
        localStorage.setItem('system:pages', JSON.stringify(pages));
      } catch (e) {
        console.error('Failed to write system store cache:', e);
      }
    };

    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        latestConfig = snap.data();
        updateStore();
      }
    }, (err) => {
      console.error('System config snap error:', err);
    });

    const unsubPages = onSnapshot(doc(db, 'system', 'pages'), (snap) => {
      if (snap.exists()) {
        latestPages = snap.data();
        updateStore();
      }
    }, (err) => {
      console.error('System pages snap error:', err);
    });

    return () => {
      cancelled = true;
      unsubConfig();
      unsubPages();
    };
  },
}));
