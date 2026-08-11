import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Check, MapPin, XCircle, ShieldAlert, Star, Clock, Navigation, Timer, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { collection, doc, onSnapshot, query, orderBy, getDocs, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { LiveTrackingMap } from '@/components/map/LiveTrackingMap';
import { PaymentModal } from '@/components/customer/PaymentModal';
import { RatingModal } from '@/components/customer/RatingModal';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { IconRenderer } from '@/components/shared/IconRenderer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { db } from '@/config/firebase';
import { ServiceRequest } from '@/types';
import { useServiceRequest } from '@/hooks/useServiceRequest';
import { getServiceLabel, formatCurrency } from '@/lib/utils';
import { SERVICE_MAP } from '@/lib/constants';

// --- Countdown Timer Hook ---
function useCountdown(deadlineMs: number | null) {
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
function ProposalsList({
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

  useEffect(() => {
    const q = query(collection(db, 'serviceRequests', requestId, 'proposals'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p: any) => p.status === 'offered');
      setProposals(list);
      setLoading(false);
    });
    return () => unsub();
  }, [requestId]);

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
                <span className="text-amber-300 font-black text-xs">{(prop.providerRating || 5.0).toFixed(1)}</span>
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

              {/* Phone */}
              {prop.providerPhone && (
                <a
                  href={`tel:${prop.providerPhone}`}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {prop.providerPhone}
                </a>
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


function NearbyProvidersList({
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
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {(p.rating || 5.0).toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold flex items-center gap-2">
              <span>📏 {p.distanceKm} km away</span>
              <span className="text-slate-300">•</span>
              <span>⏱ Est. Arrival: <span className="text-blue-600 font-bold">{p.etaMinutes} min</span></span>
            </p>
            {p.companyName && <p className="text-[10px] text-slate-400 font-bold uppercase">{p.companyName}</p>}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
            {p.phone && (
              <Button variant="outline" size="sm" asChild className="h-10 px-3 rounded-xl border-slate-200 text-slate-600 text-xs">
                <a href={`tel:${p.phone}`}>
                  <Phone className="w-3.5 h-3.5" />
                </a>
              </Button>
            )}
            <Button
              disabled={askingId === p.uid}
              onClick={() => handleAsk(p)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider h-10 px-4 rounded-xl"
            >
              {askingId === p.uid ? 'Asking...' : '⚡ Ask Helper'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Request Sent' },
  { key: 'accepted', label: 'Provider Accepted' },
  { key: 'arriving', label: 'Provider Arriving' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

function StatusStepper({ status }: { status: string }) {
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status);
  return (
    <div className="flex flex-col gap-3">
      {STATUS_STEPS.map((step, idx) => {
        const done = idx <= currentIdx && status !== 'cancelled';
        const active = idx === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              done ? 'bg-green-500' : 'bg-gray-200'
            }`}>
              {done ? (
                active && status !== 'completed' ? (
                  <motion.div
                    className="w-3 h-3 bg-white rounded-full"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                ) : (
                  <Check className="w-4 h-4 text-white" />
                )
              ) : (
                <span className="w-2.5 h-2.5 bg-gray-400 rounded-full" />
              )}
            </div>
            <span className={`text-sm font-medium ${done ? 'text-gray-900' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function TrackRequest() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { submitRating, processPayment, updateRequestStatus, approveAdditionalCosts } = useServiceRequest();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showNearbyList, setShowNearbyList] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'serviceRequests', id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as ServiceRequest;
        setRequest(data);
        setIsLoading(false);

        // Auto-show completion confirmation modal when completed
        if (data.status === 'completed' && !data.isPaid) {
          setShowCompletionConfirm(true);
        }
        // Auto-show rating after payment
        if (data.status === 'completed' && data.isPaid && !data.rating) {
          setShowRating(true);
        }
      }
    });
    return () => unsubscribe();
  }, [id]);

  const handleCancel = async () => {
    if (!request) return;
    try {
      await updateRequestStatus(request.id, 'cancelled');
      toast.success('Request cancelled');
      navigate('/customer/dashboard');
    } catch (error) {
      console.error('Failed to cancel request:', error);
      toast.error('We could not cancel this request. Please try again.');
    }
  };

  const handlePaymentComplete = async (tip: number) => {
    if (!request) return;
    await processPayment(request.id, tip);
    setShowPayment(false);
    setShowRating(true);
  };

  const handleRatingSubmit = async (rating: number, review: string) => {
    if (!request) return;
    await submitRating(request.id, rating, review);
    setShowRating(false);
    navigate('/customer/dashboard');
  };

  if (isLoading) return <CustomerLayout><LoadingSpinner fullPage text="Loading request..." /></CustomerLayout>;
  if (!request) return <CustomerLayout><div className="text-center py-8">Request not found</div></CustomerLayout>;

  const service = SERVICE_MAP[request.serviceType];
  const serviceName = request.serviceName ?? getServiceLabel(request.serviceType);
  const serviceIcon = request.serviceIcon ?? service?.icon ?? 'Wrench';
  const canCancel = request.status === 'pending' || request.status === 'accepted';
  const displayBill = (request.totalPrice || request.estimatedPrice) + (request.tipAmount || 0);

  return (
    <CustomerLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* ... (keep existing JSX) */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Track Request</h1>
            <p className="text-gray-500 text-sm mt-0.5">Request #{request.id.slice(-6).toUpperCase()}</p>
          </div>
          <StatusBadge status={request.status} pulse />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Info Panel */}
          <div className="space-y-4">
            {/* Status Timeline */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Status Timeline</h3>
              {request.status === 'cancelled' ? (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Request Cancelled</span>
                </div>
              ) : (
                <StatusStepper status={request.status} />
              )}
            </div>

            {/* Service Info */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl text-blue-600"><IconRenderer name={serviceIcon} size={24} /></span>
                <div>
                  <p className="font-semibold text-gray-900">{serviceName}</p>
                  <p className="text-sm text-gray-500">{formatCurrency(request.estimatedPrice)} estimated</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600">{request.customerLocation.address}</p>
              </div>
            </div>

            {/* Multi-Provider Offers / Bidding Comparison */}
            {['submitted', 'searching_providers', 'offers_received', 'bidding', 'pending'].includes(request.status) && (
              <div className="bg-white rounded-2xl border border-blue-100 shadow-md p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-black text-slate-900 text-lg tracking-tight">Incoming Provider Offers</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Compare price, distance & ETA from nearby providers.</p>
                  </div>
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl">
                    {request.status === 'offers_received' || request.status === 'bidding' ? 'Offers Ready' : 'Searching Nearby...'}
                  </span>
                </div>

                <ProposalsList
                  requestId={request.id}
                  deadlineMs={(request as any).proposalDeadlineMs ?? null}
                  onSelectProposal={async (proposalId) => {
                    try {
                      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken(true);
                      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${request.id}/proposals/select`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ proposalId, customerId: request.customerId }),
                      });
                      if (!res.ok) throw new Error('Failed to select provider');
                      toast.success('Provider selected! They will be on their way shortly.');
                    } catch (err: any) {
                      toast.error(err.message || 'Could not select provider offer');
                    }
                  }}
                  onRejectProposal={async (proposalId) => {
                    try {
                      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken(true);
                      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${request.id}/proposals/${proposalId}`, {
                        method: 'DELETE',
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                      });
                      if (!res.ok) throw new Error();
                      toast.success('Offer declined.');
                    } catch {
                      toast.error('Could not decline offer. Please try again.');
                    }
                  }}
                  onAutoAssign={async () => {
                    try {
                      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken(true);
                      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${request.id}/proposals/auto-assign`, {
                        method: 'POST',
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                      });
                      const data = await res.json();
                      if (data.data?.assigned) {
                        toast.success(`Auto-assigned to ${data.data.providerName}`);
                      }
                    } catch {
                      console.error('Auto-assign failed');
                    }
                  }}
                />
              </div>
            )}

            {/* Direct Request Nearby Providers */}
            {['submitted', 'searching_providers', 'offers_received', 'bidding', 'pending'].includes(request.status) && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-4">
                <button
                  type="button"
                  onClick={() => setShowNearbyList(!showNearbyList)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div>
                    <h3 className="font-black text-slate-900 text-lg tracking-tight">Ask Nearby Providers</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Invite specific online providers to bid on your request.</p>
                  </div>
                  <div className="text-slate-500 hover:text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 transition-all">
                    {showNearbyList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {showNearbyList && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2">
                        <NearbyProvidersList
                          requestId={request.id}
                          customerLocation={request.customerLocation}
                          serviceType={request.serviceType}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Provider Info */}
            {request.providerName && (
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
                <h3 className="font-semibold text-blue-900 mb-3">Your Provider</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{request.providerName}</p>
                    {request.providerRating && (
                      <p className="text-sm text-gray-500">Rating: {request.providerRating.toFixed(1)} ⭐</p>
                    )}
                    {request.providerVehicleNumber && (
                      <p className="text-sm text-gray-500">Vehicle: {request.providerVehicleNumber}</p>
                    )}
                  </div>
                  {request.providerPhone && (
                    <Button variant="outline" asChild className="border-blue-200 text-blue-600 hover:bg-blue-50 min-h-[48px]">
                      <a href={`tel:${request.providerPhone}`}>
                        <Phone className="w-4 h-4 mr-1.5" />
                        Call Helper
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}


            {request.status === 'arriving' && request.arrivalOtp && request.providerArrived && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 text-center space-y-3 mt-4 shadow-md animate-bounce">
                <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Share Verification OTP</p>
                <div className="text-4xl font-black text-slate-900 tracking-[8px]">{request.arrivalOtp}</div>
                <p className="text-xs text-amber-800 font-bold leading-relaxed">
                  Provide this 4-digit code to the service provider to verify their arrival and start the job.
                </p>
              </div>
            )}

            {request.status === 'arriving' && request.arrivalOtp && !request.providerArrived && (
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-6 text-center space-y-2 mt-4 shadow-sm">
                <p className="text-[10px] font-black uppercase text-blue-600 tracking-[0.25em] animate-pulse">Helper en route</p>
                <p className="text-xs text-blue-700 font-semibold leading-relaxed">
                  Your service provider is currently traveling to your location. Your arrival verification OTP will be displayed here once they arrive.
                </p>
              </div>
            )}

            {request.status === 'pendingUserApproval' && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-orange-200 rounded-2xl p-6 space-y-4 mt-6 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-200/10 rounded-full -mr-12 -mt-12" />
                <div className="flex items-center gap-3 border-b border-orange-100 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-orange-800 tracking-widest">Action Required: Additional Fees Proposed</h4>
                    <p className="text-[10px] text-orange-600 font-bold uppercase mt-0.5">Please review extra charges to proceed</p>
                  </div>
                </div>
                
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Additional Cost:</span>
                  <span className="text-3xl font-black text-slate-950">{formatCurrency(request.proposedAdditionalFees || 0)}</span>
                </div>

                <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white/70 border border-orange-50 p-4 rounded-xl">
                  <span className="font-bold text-orange-900 block mb-1">Reason:</span>
                  "{request.proposedAdditionalReason || 'No reason provided'}"
                </p>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await updateRequestStatus(request.id, 'cancelled');
                        toast.success('Request cancelled successfully.');
                      } catch {
                        toast.error('Failed to cancel request.');
                      }
                    }}
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 font-bold h-12 rounded-xl"
                  >
                    Reject & Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${request.id}/approve-additional-costs`, {
                          method: 'POST',
                        });
                        if (!response.ok) throw new Error();
                        toast.success('Additional charges approved!');
                      } catch {
                        toast.error('Failed to approve charges.');
                      }
                    }}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 rounded-xl"
                  >
                    Approve & Proceed
                  </Button>
                </div>
              </div>
            )}

             {/* Actions */}
             {canCancel && request.status !== 'pendingUserApproval' && (
               <Button
                 variant="outline"
                 className="w-full border-red-200 text-red-600 hover:bg-red-50 mt-4"
                 onClick={() => setShowCancel(true)}
               >
                 <XCircle className="w-4 h-4 mr-1.5" />
                 Cancel Request
               </Button>
             )}

             {request.status === 'completed' && !request.isPaid && (
               <Button
                 className="w-full bg-green-600 hover:bg-green-700 text-white mt-4"
                 onClick={() => setShowCompletionConfirm(true)}
               >
                 Complete Payment — {formatCurrency(displayBill)}
               </Button>
             )}
          </div>

          {/* Map */}
          <div>
            <LiveTrackingMap
              requestId={request.id}
              customerLocation={request.customerLocation}
              showNearbyProviders={['pending', 'submitted', 'searching_providers', 'offers_received', 'bidding'].includes(request.status)}
              requestServiceType={request.serviceType}
            />
          </div>
        </div>
      </motion.div>

      {/* Modals */}
      {request && showPayment && (
        <PaymentModal
          open={showPayment}
          onClose={() => setShowPayment(false)}
          request={request}
          onPaid={handlePaymentComplete}
        />
      )}

      {request && showRating && request.providerName && (
        <RatingModal
          open={showRating}
          onClose={() => setShowRating(false)}
          onSubmit={handleRatingSubmit}
          providerName={request.providerName}
        />
      )}

      {request && (
        <ConfirmDialog
          open={showCompletionConfirm}
          onOpenChange={setShowCompletionConfirm}
          title="Confirm Work Completion?"
          description={`Please confirm that the provider has finished the work to your satisfaction. Once confirmed, you will proceed to the payment gateway to pay ${formatCurrency(displayBill)}.`}
          confirmText="Confirm & Pay"
          onConfirm={() => {
            setShowCompletionConfirm(false);
            setShowPayment(true);
          }}
        />
      )}

      <ConfirmDialog
        open={showCancel}
        onOpenChange={setShowCancel}
        title="Cancel Request?"
        description="Are you sure you want to cancel this service request? This action cannot be undone."
        confirmText="Yes, Cancel"
        onConfirm={handleCancel}
        isDestructive
      />
    </CustomerLayout>
  );
}
