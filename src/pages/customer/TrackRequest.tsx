import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Check, MapPin, XCircle, ShieldAlert, Star, Clock, Navigation, Timer, Zap, ChevronDown, ChevronUp, RefreshCw, Ruler } from 'lucide-react';
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
import { db, auth } from '@/config/firebase';
import { ServiceRequest } from '@/types';
import { useServiceRequest } from '@/hooks/useServiceRequest';
import { getServiceLabel, formatCurrency } from '@/lib/utils';
import { SERVICE_MAP } from '@/lib/constants';
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
  const isAcceptedOrLater = request ? ['accepted', 'arriving', 'inProgress', 'completed'].includes(request.status) : false;
  const [showPayment, setShowPayment] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showNearbyList, setShowNearbyList] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [detailsExpanded, setDetailsExpanded] = useState(true);

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
  const canCancel = ['pending', 'submitted', 'searching_providers', 'offers_received', 'bidding', 'provider_selected', 'accepted'].includes(request.status);
  const displayBill = request.totalPrice || request.finalPrice || request.estimatedPrice || 0;

  return (
    <CustomerLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* ... (keep existing JSX) */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Track Request</h1>
            <p className="text-gray-500 text-sm mt-0.5">Request #{request.id.slice(-6).toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.reload();
              }}
              className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:text-blue-600 cursor-pointer flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] active:scale-95 transition-all bg-white"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
            <StatusBadge status={request.status} pulse />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Info Panel */}
          <div className="space-y-4 order-2 lg:order-1">
            {/* Status Timeline */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
              <button
                type="button"
                onClick={() => setTimelineExpanded(!timelineExpanded)}
                className="w-full flex items-center justify-between text-left font-semibold text-gray-900 focus:outline-none"
              >
                <span>Status Timeline</span>
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
                      <div className="flex items-center gap-2 text-red-600 p-2 bg-red-50 rounded-xl">
                        <XCircle className="w-5 h-5" />
                        <span className="font-medium">Request Cancelled</span>
                      </div>
                    ) : (
                      <StatusStepper status={request.status} />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Service Info */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
              <button
                type="button"
                onClick={() => setDetailsExpanded(!detailsExpanded)}
                className="w-full flex items-center justify-between text-left font-semibold text-gray-900 focus:outline-none"
              >
                <span>Service Details</span>
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
                    {request.additionalFees && request.additionalFees > 0 ? (
                      <div className="mt-3 p-3 bg-orange-50 border border-orange-100 rounded-xl space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-medium">Base Service Price:</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(request.finalPrice || request.estimatedPrice || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-orange-700 font-medium">Additional Fees:</span>
                          <span className="font-semibold text-orange-700">+{formatCurrency(request.additionalFees)}</span>
                        </div>
                        <div className="border-t border-orange-100 pt-1.5 flex justify-between items-center text-xs">
                          <span className="text-gray-900 font-semibold">Total Price:</span>
                          <span className="font-bold text-blue-600">{formatCurrency((request.finalPrice || request.estimatedPrice || 0) + request.additionalFees)}</span>
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
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
                    {request.providerRating > 0 && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">Rating: {request.providerRating.toFixed(1)} <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /></p>
                    )}
                    {request.providerVehicleNumber && (
                      <p className="text-sm text-gray-500">
                        Vehicle: {isAcceptedOrLater ? request.providerVehicleNumber : '•••••• (Masked until accepted)'}
                      </p>
                    )}
                  </div>
                  {request.providerPhone && isAcceptedOrLater ? (
                    <Button variant="outline" asChild className="border-blue-200 text-blue-600 hover:bg-blue-50 min-h-[48px]">
                      <a
                        href={`tel:${request.providerPhone}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `tel:${request.providerPhone}`;
                        }}
                      >
                        <Phone className="w-4 h-4 mr-1.5" />
                        Call Helper
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            )}


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
                        console.error('Reject Additional Costs Error:', err);
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
                        console.error('Approve Additional Costs Error:', err);
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


