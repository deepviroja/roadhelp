import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Timer, Star, XCircle, Check, Zap, Ruler, Navigation } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

import { getAuth, onAuthStateChanged } from 'firebase/auth';

// --- Countdown Timer Hook ---
export function useCountdown(deadlineMs: number | null) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!deadlineMs) { setSecondsLeft(null); return; }
    const calc = () => Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
    setSecondsLeft(calc());
    const t = setInterval(() => {
      const s = calc();
      setSecondsLeft(s);
      if (s <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [deadlineMs]);

  return secondsLeft;
}

// --- Enhanced Proposals List with Timer + Auto-Assign ---
export function ProposalsList({
  requestId,
  deadlineMs,
  onSelectProposal,
  onRejectProposal,
  onAutoAssign,
}: {
  requestId: string;
  deadlineMs: number | null;
  onSelectProposal: (id: string) => Promise<void>;
  onRejectProposal: (id: string) => Promise<void>;
  onAutoAssign: () => Promise<void>;
}) {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const secondsLeft = useCountdown(deadlineMs);

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const authInstance = getAuth();
    setCurrentUser(authInstance.currentUser);
    const unsubAuth = onAuthStateChanged(authInstance, (user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setLoading(true);
      return;
    }
    const q = query(collection(db, 'serviceRequests', requestId, 'proposals'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p: any) => p.status === 'offered');
      setProposals(list);
      setLoading(false);
    }, (err) => {
      console.warn('Proposals list snapshot error:', err);
    });
    return () => unsub();
  }, [requestId, currentUser]);

  // Auto-assign when timer hits 0
  useEffect(() => {
    if (secondsLeft === 0 && !autoAssigning && proposals.length > 0) {
      setAutoAssigning(true);
      onAutoAssign().catch(() => setAutoAssigning(false));
    }
  }, [secondsLeft]);

  const timerColor = secondsLeft != null && secondsLeft <= 30 ? 'text-red-600 border-red-200 bg-red-50' :
    secondsLeft != null && secondsLeft <= 60 ? 'text-orange-600 border-orange-200 bg-orange-50' :
    'text-blue-600 border-blue-200 bg-blue-50';

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (loading) {
    return <div className="py-4 text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Checking for nearby offers...</div>;
  }

  if (proposals.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 text-center space-y-2">
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto animate-spin">
          <Clock className="w-4 h-4" />
        </div>
        <p className="text-sm font-black text-slate-800">Broadcasting to Nearby Providers</p>
        <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
          Eligible verified providers within service radius are receiving your request. Offers will appear here shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timer Banner */}
      {deadlineMs && secondsLeft != null && secondsLeft > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border font-bold text-sm ${timerColor}`}
        >
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-black">Choose a Provider</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-black text-lg tabular-nums">{fmtTime(secondsLeft)}</span>
            <span className="text-[10px] font-bold opacity-70">remaining</span>
          </div>
        </motion.div>
      )}

      {secondsLeft === 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-black uppercase tracking-widest">
          <Zap className="w-4 h-4 text-amber-500" />
          Time up — auto-assigning earliest offer...
        </div>
      )}

      {/* Provider Offer Cards */}
      <AnimatePresence>
        {proposals.map((prop, idx) => (
          <motion.div
            key={prop.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all"
          >
            {/* Card Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white font-black text-base">
                  {prop.providerName?.charAt(0) || 'P'}
                </div>
                <div>
                  <p className="font-black text-white text-sm leading-tight">{prop.providerName}</p>
                  {prop.providerCompanyName && (
                    <p className="text-slate-400 text-[10px] font-semibold">{prop.providerCompanyName}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-400/20 border border-amber-400/30 px-2 py-1 rounded-lg">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-amber-300 font-black text-xs">{(prop.providerRating ? prop.providerRating.toFixed(1) : 'N/A')}</span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3">
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Quote</p>
                  <p className="text-base font-black text-blue-700 mt-0.5">{formatCurrency(prop.estimatedPrice || 0)}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] font-black uppercase text-green-400 tracking-wider">ETA</p>
                  <p className="text-base font-black text-green-700 mt-0.5">{prop.estimatedTime || '?'} min</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Distance</p>
                  <p className="text-base font-black text-slate-700 mt-0.5">
                    {prop.distanceKm != null ? `${prop.distanceKm} km` : '—'}
                  </p>
                </div>
              </div>

              {/* Message */}
              {prop.message && (
                <p className="text-xs text-slate-600 italic bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                  "{prop.message}"
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={rejectingId === prop.id || !!selectingId}
                  onClick={async () => {
                    setRejectingId(prop.id);
                    await onRejectProposal(prop.id);
                    setRejectingId(null);
                  }}
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 rounded-xl h-10 font-bold text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  {rejectingId === prop.id ? 'Removing...' : 'Decline'}
                </Button>
                <Button
                  size="sm"
                  disabled={selectingId === prop.id || !!rejectingId}
                  onClick={async () => {
                    setSelectingId(prop.id);
                    await onSelectProposal(prop.id);
                    setSelectingId(null);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 font-black text-xs"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  {selectingId === prop.id ? 'Selecting...' : 'Choose This Provider'}
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// --- Direct Request Nearby Providers List ---
export function NearbyProvidersList({
  requestId,
  customerLocation,
  serviceType,
}: {
  requestId: string;
  customerLocation: { lat: number; lng: number };
  serviceType: string;
}) {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [askingId, setAskingId] = useState<string | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    let active = true;
    const fetchNearby = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'provider'),
          where('isOnline', '==', true),
          where('isVerified', '==', true)
        );
        const snap = await getDocs(q);
        if (!active) return;
        const list = snap.docs
          .map((d) => ({ uid: d.id, ...d.data() }))
          .filter((p: any) => p.location && p.location.lat != null && p.location.lng != null)
          .filter((p: any) => !serviceType || (p.serviceTypes && p.serviceTypes.includes(serviceType)))
          .map((p: any) => {
            const dist = calculateDistance(customerLocation.lat, customerLocation.lng, p.location.lat, p.location.lng);
            return {
              ...p,
              distanceKm: Number(dist.toFixed(1)),
              etaMinutes: Math.ceil(dist * 3),
            };
          })
          .sort((a: any, b: any) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
          .slice(0, 10);
        setProviders(list);
      } catch (err) {
        console.warn('Failed to load nearby list:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNearby();
    const interval = setInterval(fetchNearby, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [customerLocation, serviceType]);

  const handleAsk = async (provider: any) => {
    setAskingId(provider.uid);
    try {
      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${requestId}/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          providerId: provider.uid,
          providerName: provider.fullName,
          providerPhone: provider.phone || '',
          providerRating: provider.rating || 5,
          estimatedPrice: 0,
          estimatedTime: provider.etaMinutes,
          message: 'Customer has directly requested your assistance.',
          distanceKm: provider.distanceKm,
          requestedByCustomer: true,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Request sent to ${provider.fullName}! Awaiting their quote.`);
    } catch {
      toast.error('Could not send request to provider.');
    } finally {
      setAskingId(null);
    }
  };

  if (loading) {
    return <div className="py-4 text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Checking for nearby providers...</div>;
  }

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {providers.map((p) => (
        <div
          key={p.uid}
          className="bg-slate-50 hover:bg-white border border-slate-200 rounded-2xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-sm">{p.fullName}</span>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 bg-opacity-70 px-2 py-0.5 rounded-lg flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {(p.rating || 5.0).toFixed(1)}
              </span>
            </div>
             <p className="text-xs text-slate-500 font-semibold flex items-center gap-2">
               <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5 text-slate-400" /> {p.distanceKm} km away</span>
               <span className="text-slate-300">•</span>
               <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5 text-slate-400" /> Est. Arrival: <span className="text-blue-600 font-bold">{p.etaMinutes} min</span></span>
             </p>
            {p.companyName && <p className="text-[10px] text-slate-400 font-bold uppercase">{p.companyName}</p>}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
            <Button
              disabled={askingId === p.uid}
              onClick={() => handleAsk(p)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider h-10 px-4 rounded-xl"
            >
              {askingId === p.uid ? 'Asking...' : <><Zap className="w-3 h-3 mr-1" /> Ask Helper</>}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
