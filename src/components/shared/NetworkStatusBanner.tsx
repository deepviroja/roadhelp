import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, AlertTriangle, X } from 'lucide-react';

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnectionSlow, setIsConnectionSlow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const conn = (navigator as any).connection;
    if (conn) {
      const checkSpeed = () => {
        const slow =
          conn.effectiveType === 'slow-2g' ||
          conn.effectiveType === '2g' ||
          (conn.rtt && conn.rtt > 1500);
        setIsConnectionSlow(slow);
        if (slow) setDismissed(false);
      };
      checkSpeed();
      conn.addEventListener('change', checkSpeed);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        conn.removeEventListener('change', checkSpeed);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {(!isOnline || isConnectionSlow) && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] w-[calc(100vw-3rem)] max-w-md"
        >
          <div
            className={`rounded-2xl p-4 shadow-xl border backdrop-blur-md flex items-center justify-between gap-4 ${
              !isOnline
                ? 'bg-red-600/90 text-white border-red-500/30 shadow-red-500/20'
                : 'bg-amber-500/90 text-slate-950 border-amber-400/30 shadow-amber-500/10'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  !isOnline ? 'bg-white/20 text-white' : 'bg-slate-950/10 text-slate-950'
                }`}
              >
                {!isOnline ? <WifiOff className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider leading-tight">
                  {!isOnline ? 'Network Link Lost' : 'Degraded Signal'}
                </p>
                <p className="text-[10px] opacity-90 mt-0.5 leading-relaxed font-medium">
                  {!isOnline
                    ? 'Disconnected from Internet , Check your connection.'
                    : 'Slow connection detected. Avoid sending multiple requests.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setDismissed(true)}
              className={`p-1.5 rounded-lg transition-colors ${
                !isOnline ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-950/10 text-slate-950'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
