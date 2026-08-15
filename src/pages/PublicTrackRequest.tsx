import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Check, MapPin, XCircle, ShieldAlert, Star, ChevronDown, ChevronUp, Zap, Clock } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LiveTrackingMap } from '@/components/map/LiveTrackingMap';
import { PaymentModal } from '@/components/customer/PaymentModal';
import { RatingModal } from '@/components/customer/RatingModal';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { IconRenderer } from '@/components/shared/IconRenderer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { db, auth } from '@/config/firebase';
import { ServiceRequest } from '@/types';
import { useServiceRequest } from '@/hooks/useServiceRequest';
import { getServiceLabel, formatCurrency } from '@/lib/utils';
import { SERVICE_MAP } from '@/lib/constants';
import { ensureGuestAuth } from '@/lib/guestAuth';
import { ProposalsList, NearbyProvidersList } from '@/components/customer/TrackingComponents';

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
    <div className="flex flex-col gap-6 relative">
      <div className="absolute left-[15px] top-4 bottom-4 w-1 bg-slate-100 rounded-full z-0" />
      {STATUS_STEPS.map((step, idx) => {
        const done = idx <= currentIdx && status !== 'cancelled';
        const active = idx === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-6 relative z-10">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                done ? 'bg-blue-600 shadow-lg shadow-blue-600/30' : 'bg-white border-2 border-slate-100 text-slate-300'
              } ${active ? 'scale-125 ring-4 ring-blue-600/10' : ''}`}
            >
              {done ? (
                active && status !== 'completed' ? (
                  <motion.div
                    className="w-2.5 h-2.5 bg-white rounded-full"
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                ) : (
                  <Check className="w-4 h-4 text-white" strokeWidth={4} />
                )
              ) : (
                <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
              )}
            </div>
            <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${done ? 'text-slate-900' : 'text-slate-400'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function PublicTrackRequest() {
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
  const [showOtpModal, setShowOtpModal] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [detailsExpanded, setDetailsExpanded] = useState(true);

  const isAcceptedOrLater = request ? ['accepted', 'provider_en_route', 'arriving', 'inProgress', 'completed'].includes(request.status) : false;

  useEffect(() => {
    if (!id) return;
    let unsubscribe: (() => void) | null = null;
    (async () => {
      try {
        await ensureGuestAuth();
        unsubscribe = onSnapshot(
          doc(db, 'serviceRequests', id),
          (snap) => {
            if (snap.exists()) {
              const data = { id: snap.id, ...snap.data() } as ServiceRequest;
              setRequest(data);
              setIsLoading(false);

              if (data.status === 'completed' && !data.isPaid) {
                setShowCompletionConfirm(true);
              }
              if (data.status === 'completed' && data.isPaid && !data.rating) {
                setShowRating(true);
              }
            } else {
              setRequest(null);
              setIsLoading(false);
            }
          },
          (err) => {
            console.error('PublicTrackRequest snapshot error:', err);
            toast.error(err?.message || 'Unable to load this request.');
            setRequest(null);
            setIsLoading(false);
          }
        );
      } catch (err: unknown) {
        console.error('ensureGuestAuth error:', err);
        toast.error('Unable to access this request.');
        setRequest(null);
        setIsLoading(false);
      }
    })();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id]);

  const handleCancel = async () => {
    if (!request) return;
    try {
      await updateRequestStatus(request.id, 'cancelled');
      toast.success('Request cancelled');
      navigate('/');
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
    if (!request || !request.providerId) return;
    await submitRating(request.id, rating, review, request.providerId);
    setShowRating(false);
    navigate('/');
  };

  if (isLoading) return <LoadingSpinner fullPage text="Connecting live tracker..." />;
  if (!request) return <div className="text-center py-32 font-black text-slate-400 uppercase tracking-[0.5em]">Error: Request Tracking Not Found</div>;

  const service = SERVICE_MAP[request.serviceType];
  const serviceName = request.serviceName ?? getServiceLabel(request.serviceType);
  const serviceIcon = request.serviceIcon ?? service?.icon ?? 'Wrench';
  const canCancel = ['pending', 'submitted', 'searching_providers', 'offers_received', 'bidding', 'provider_selected', 'accepted'].includes(request.status);
  const displayBill = request.totalPrice || request.finalPrice || request.estimatedPrice || 0;

  return (
    <div className="flex-1 bg-[#F5F5F6] min-h-screen overflow-x-hidden">
      <div className="container-app py-10 md:py-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          {/* Tracker Header */}
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 border border-blue-500/30 rounded-full text-blue-600 font-bold text-[10px] tracking-widest mb-4 uppercase backdrop-blur-md">
                 LIVE TRACKING ACTIVE
              </div>
              <h1 className="text-4xl md:text-[2rem] sm:text-4xl font-black text-[#1A1A2E] tracking-tight mb-2 leading-none">Track Request</h1>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Request ID: {request.id.slice(-8).toUpperCase()}</p>
            </div>
            <div className="flex items-center gap-6">
               <StatusBadge status={request.status} pulse className="px-8 py-3 rounded-2xl font-black text-xs tracking-[0.2em]" />
            </div>
          </div>

          {/* Double Column Dashboard Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Info & Control Cards */}
            <div className="space-y-6 order-2 lg:order-1">
              {/* Status Timeline */}
              <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm p-6">
                <button
                  type="button"
                  onClick={() => setTimelineExpanded(!timelineExpanded)}
                  className="w-full flex items-center justify-between text-left focus:outline-none"
                >
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Status Timeline</h3>
                  <div className="text-slate-500 hover:text-slate-700 bg-slate-50 p-1.5 rounded-lg border border-slate-100 transition-all">
                    {timelineExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {timelineExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pt-4"
                    >
                      {request.status === 'cancelled' ? (
                        <div className="flex items-center gap-3 text-red-600 p-4 bg-red-50 rounded-2xl border border-red-200">
                          <XCircle className="w-6 h-6" />
                          <span className="font-bold uppercase text-xs tracking-widest">Request Cancelled</span>
                        </div>
                      ) : (
                        <StatusStepper status={request.status} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Service Details */}
              <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm p-6">
                <button
                  type="button"
                  onClick={() => setDetailsExpanded(!detailsExpanded)}
                  className="w-full flex items-center justify-between text-left focus:outline-none"
                >
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Service Details</h3>
                  <div className="text-slate-500 hover:text-slate-700 bg-slate-50 p-1.5 rounded-lg border border-slate-100 transition-all">
                    {detailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {detailsExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pt-4 space-y-3"
                    >
                      <div className="flex items-center gap-4 mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-600/30">
                          <IconRenderer name={serviceIcon} size={24} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-base leading-tight truncate">{serviceName}</p>
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">{formatCurrency(request.estimatedPrice)} Est.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 mb-6">
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm font-semibold text-slate-600 leading-relaxed">{request.customerLocation.address}</p>
                      </div>
                      {request.additionalFees && request.additionalFees > 0 ? (
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-bold uppercase tracking-wider">Base Service Price:</span>
                            <span className="font-black text-slate-900">{formatCurrency(request.finalPrice || request.estimatedPrice || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-orange-700 font-bold uppercase tracking-wider">Additional Fees:</span>
                            <span className="font-black text-orange-700">+{formatCurrency(request.additionalFees)}</span>
                          </div>
                          <div className="border-t border-orange-100 pt-2 flex justify-between items-center text-xs">
                            <span className="text-slate-900 font-black uppercase tracking-wider">Total Price:</span>
                            <span className="font-black text-blue-600 text-sm">{formatCurrency((request.finalPrice || request.estimatedPrice || 0) + request.additionalFees)}</span>
                          </div>
                        </div>
                      ) : null}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Incoming Provider Offers */}
              {['submitted', 'searching_providers', 'offers_received', 'bidding', 'pending'].includes(request.status) && (
                <div className="bg-white rounded-3xl border border-blue-100 shadow-md p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-black text-slate-900 text-lg tracking-tight">Incoming Provider Offers</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Compare price, distance & ETA from nearby providers.</p>
                    </div>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl">
                      {request.status === 'offers_received' || request.status === 'bidding' ? 'Offers Ready' : 'Searching...'}
                    </span>
                  </div>
                  <ProposalsList
                    requestId={request.id}
                    deadlineMs={(request as any).proposalDeadlineMs ?? null}
                    onSelectProposal={async (proposalId) => {
                      try {
                        const token = await auth.currentUser?.getIdToken(true);
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
                        const token = await auth.currentUser?.getIdToken(true);
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
                        const token = await auth.currentUser?.getIdToken(true);
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

              {/* Ask Nearby Providers collapsible card */}
              {['submitted', 'searching_providers', 'offers_received', 'bidding', 'pending'].includes(request.status) && (
                <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm p-6 space-y-4">
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

              {/* Assigned Provider Info */}
              {request.providerName && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-full -mr-12 -mt-12" />
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-100 pb-3">Your Provider</h3>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-bold text-xl tracking-tight mb-2 truncate text-slate-900">{request.providerName}</p>
                      <div className="flex flex-col gap-1">
                         {request.providerRating && (
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                             <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> VERIFIED RATING: {request.providerRating.toFixed(1)}
                           </p>
                         )}
                         {request.providerVehicleNumber && (
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                             Vehicle: {isAcceptedOrLater ? request.providerVehicleNumber : '•••••• (Masked until accepted)'}
                           </p>
                         )}
                      </div>
                    </div>
                    {request.providerPhone && isAcceptedOrLater ? (
                      <Button variant="outline" asChild className="h-12 w-12 rounded-xl bg-slate-50 border-slate-200 hover:bg-blue-600 hover:text-white p-0 shadow-sm transition-all">
                        <a href={`tel:${request.providerPhone}`}>
                          <Phone className="w-5 h-5 text-slate-600 hover:text-white" />
                        </a>
                      </Button>
                    ) : request.providerPhone ? (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        Masked
                      </span>
                    ) : null}
                  </div>
                </div>
              )}

              {/* OTP Verifications & Popups */}
              {request.status === 'arriving' && request.arrivalOtp && request.providerArrived && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 mt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                        <Zap className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-amber-900 uppercase">Provider Arrived!</p>
                        <p className="text-[10px] text-amber-700 font-medium">Verification OTP is ready to share.</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowOtpModal(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider h-9 px-4 rounded-xl shadow-md cursor-pointer"
                    >
                      Show OTP
                    </Button>
                  </div>

                  <AnimatePresence>
                    {showOtpModal && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          transition={{ type: 'spring', duration: 0.4 }}
                          className="bg-white border border-slate-200/80 rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full text-center space-y-6 relative"
                        >
                          <div className="w-16 h-16 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mx-auto shadow-md">
                            <ShieldAlert className="w-8 h-8" />
                          </div>

                          <div className="space-y-2">
                            <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase tracking-[0.1em]">
                              Share Verification OTP
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Provide this 4-digit code to the service provider to verify their arrival and start the job.
                            </p>
                          </div>

                          <div className="bg-slate-50 border border-slate-100 rounded-2xl py-5 text-center shadow-inner">
                            <div className="text-[2rem] sm:text-4xl font-black text-slate-900 tracking-[12px] pl-3 select-all cursor-pointer font-mono">
                              {request.arrivalOtp}
                            </div>
                          </div>

                          <Button
                            onClick={() => setShowOtpModal(false)}
                            className="w-full bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest h-12 rounded-xl"
                          >
                            Close Window
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {request.status === 'arriving' && request.arrivalOtp && !request.providerArrived && (
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-6 text-center space-y-2 mt-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase text-blue-600 tracking-[0.25em] animate-pulse">Helper en route</p>
                  <p className="text-xs text-blue-700 font-semibold leading-relaxed">
                    Your service provider is currently traveling to your location. Your arrival verification OTP will be displayed here once they arrive.
                  </p>
                </div>
              )}

              {/* Additional Cost Proposals */}
              {request.status === 'pendingUserApproval' && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-orange-200 rounded-2xl p-6 space-y-4 shadow-md relative overflow-hidden">
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

                  <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white/70 border border-orange-50 p-4 rounded-xl text-left">
                    <span className="font-bold text-orange-900 block mb-1">Reason:</span>
                    "{request.proposedAdditionalReason || 'No reason provided'}"
                  </p>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const token = await auth.currentUser?.getIdToken(true);
                          const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${request.id}/reject-additional-costs`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                          });
                          if (!response.ok) {
                            const errData = await response.json().catch(() => ({}));
                            throw new Error(errData.message || 'Failed to reject charges');
                          }
                          toast.success('Additional charges rejected.');
                        } catch (err: any) {
                          toast.error(err.message || 'Failed to reject charges.');
                        }
                      }}
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 font-bold h-12 rounded-xl bg-white"
                    >
                      Reject Extra Fees
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          const token = await auth.currentUser?.getIdToken(true);
                          const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${request.id}/approve-additional-costs`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                          });
                          if (!response.ok) {
                            const errData = await response.json().catch(() => ({}));
                            throw new Error(errData.message || 'Failed to approve charges');
                          }
                          toast.success('Additional charges approved!');
                        } catch (err: any) {
                          toast.error(err.message || 'Failed to approve charges.');
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
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 mt-4 rounded-xl font-bold h-12 transition-all active:scale-[0.98]"
                  onClick={() => setShowCancel(true)}
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Cancel Request
                </Button>
              )}

              {request.status === 'completed' && !request.isPaid && (
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white mt-4 rounded-xl font-bold h-12 transition-all active:scale-[0.98]" 
                  onClick={() => setShowCompletionConfirm(true)}
                >
                  Complete Payment — {formatCurrency(displayBill)}
                </Button>
              )}
            </div>

            {/* Right Column: Live Map */}
            <div className="order-1 lg:order-2">
              <LiveTrackingMap 
                requestId={request.id} 
                customerLocation={request.customerLocation}
                showNearbyProviders={['pending', 'submitted', 'searching_providers', 'offers_received', 'bidding'].includes(request.status)}
                requestServiceType={request.serviceType}
                isProviderAccepted={['accepted', 'provider_en_route', 'provider_arrived', 'arriving', 'in_progress', 'inProgress', 'pendingUserApproval', 'completed'].includes(request.status)}
              />
            </div>
          </div>
        </motion.div>

        {request && showPayment && (
          <PaymentModal open={showPayment} onClose={() => setShowPayment(false)} request={request} onPaid={handlePaymentComplete} />
        )}

        {request && showRating && request.providerId && (
          <RatingModal
            open={showRating}
            onClose={() => setShowRating(false)}
            onSubmit={handleRatingSubmit}
            providerName={request.providerName || 'Helper'}
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
          confirmText="Yes, Cancel Request"
          onConfirm={handleCancel}
          isDestructive
        />
      </div>
    </div>
  );
}


