import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

import { useAuthStore } from './stores/authStore';
import { logSystemEvent, parseErrorStack } from './lib/systemLogger';
import { toast } from 'sonner';

// Intercept all toast error messages globally to present friendly, clean messages.
// Full technical details remain fully visible to administrators.
const originalToastError = toast.error;
toast.error = (message: any, options?: any) => {
  const profile = useAuthStore.getState().profile;
  const isAdmin = profile?.role === 'admin';

  if (isAdmin) {
    return originalToastError(message, options);
  }

  const msg = String(message?.message || message || '');

  // Allow user-friendly sentences (capitalized, at least 2 words, no raw code exceptions) to bypass masking
  const isUserFriendly = 
    /^[A-Z]/.test(msg) && 
    msg.split(' ').length >= 2 && 
    !msg.includes('FirebaseError') && 
    !msg.includes('TypeError') && 
    !msg.includes('ReferenceError') &&
    !msg.includes('Firestore') &&
    !msg.includes('assertion') &&
    !msg.includes('stack') &&
    !msg.includes('Error:');

  if (isUserFriendly) {
    return originalToastError(msg, options);
  }

  // Handle specific scenarios with clean, human-friendly wording
  if (msg.includes('auth/') || msg.includes('invalid-credential') || msg.includes('user-not-found') || msg.includes('wrong-password')) {
    return originalToastError('Invalid credentials. Please try again.', options);
  }
  if (msg.includes('permission-denied') || msg.includes('Permission denied') || msg.includes('denied')) {
    return originalToastError('You do not have permission to do this.', options);
  }
  if (msg.includes('network') || msg.includes('Failed to fetch') || msg.includes('timeout')) {
    return originalToastError('Connection error. Please try again.', options);
  }
  if (msg.includes('otp') || msg.includes('OTP')) {
    return originalToastError('Invalid OTP. Please check and try again.', options);
  }

  return originalToastError('Something went wrong. Please try again.', options);
};

// In production builds, suppress raw console output so users never see system errors
// All errors are already captured to Firestore via logSystemEvent for admin review
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
  console.info = noop;
}

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
        return;
      }

      // Log unhandled promise rejection to Firestore
      try {
        const error = event.reason;
        const profile = useAuthStore.getState().profile;
        const stack = error?.stack || '';
        const { file, line, column } = parseErrorStack(stack);

        logSystemEvent({
          type: 'error',
          message: error?.message || String(error || 'Unhandled Promise Rejection'),
          componentName: 'PromiseRejection',
          file,
          line,
          column,
          stack,
          userId: profile?.uid,
          userRole: profile?.role,
          userEmail: profile?.email,
        });
      } catch (err) {
        console.warn('[GlobalError] Failed to report rejection:', err);
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
        return;
      }

      // Log unhandled runtime error to Firestore
      try {
        const error = event.error;
        const profile = useAuthStore.getState().profile;
        const stack = error?.stack || '';
        const { file, line, column } = parseErrorStack(stack || `${event.filename}:${event.lineno}:${event.colno}`);

        logSystemEvent({
          type: 'error',
          message: event.message || error?.message || 'Global Runtime Error',
          componentName: 'GlobalWindowError',
          file,
          line,
          column,
          stack,
          userId: profile?.uid,
          userRole: profile?.role,
          userEmail: profile?.email,
        });
      } catch (err) {
        console.warn('[GlobalError] Failed to report runtime error:', err);
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

