import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

// Filter non-fatal internal Firestore SDK WatchStream assertion warnings during Vite HMR module reloads
if (typeof window !== 'undefined') {
  const isFirestoreAssertionError = (err: any) => {
    const str = String(err?.stack || err?.message || err || '');
    return str.includes('INTERNAL ASSERTION FAILED') || (str.includes('FIRESTORE') && str.includes('Unexpected state'));
  };

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      if (isFirestoreAssertionError(event.reason)) {
        console.warn('[Firestore] Suppressed internal WatchStream assertion during module reload.');
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    'error',
    (event) => {
      if (isFirestoreAssertionError(event.error) || isFirestoreAssertionError(event.message)) {
        console.warn('[Firestore] Suppressed internal WatchStream assertion during module reload.');
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

