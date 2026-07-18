import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Check, MapPin, XCircle, ShieldAlert } from 'lucide-react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { ensureGuestAuth } from '@/lib/guestAuth';

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
  const { submitRating, updateRequestStatus, approveAdditionalCosts } = useServiceRequest();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const handlePaymentComplete = async () => {
    if (!request) return;
    await updateDoc(doc(db, 'serviceRequests', request.id), {
      isPaid: true,
      paymentMethod: 'card',
    });
    setShowPayment(false);
    setShowRating(true);
  };

  const handleRatingSubmit = async (rating: number, review: string) => {
    if (!request || !request.providerId) return;
    await submitRating(request.id, rating, review, request.providerId);
    setShowRating(false);
    navigate('/');
  };

  if (isLoading) return <LoadingSpinner fullPage text="Syncing satellite link..." />;
  if (!request) return <div className="text-center py-32 font-black text-slate-400 uppercase tracking-[0.5em]">Protocol Error: Mission Not Found</div>;

  const service = SERVICE_MAP[request.serviceType];
  const serviceName = request.serviceName ?? getServiceLabel(request.serviceType);
  const serviceIcon = request.serviceIcon ?? service?.icon ?? 'Wrench';
  const canCancel = request.status === 'pending' || request.status === 'accepted';

  return (
    <div className="flex-1 bg-[#F5F5F6] min-h-screen overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 md:py-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 border border-blue-500/30 rounded-full text-blue-600 font-bold text-[10px] tracking-widest mb-4 uppercase backdrop-blur-md">
                 LIVE TELEMETRY ACTIVE
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-[#1A1A2E] tracking-tight mb-2 leading-none">Mission Tracker</h1>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Protocol ID: {request.id.slice(-8).toUpperCase()}</p>
            </div>
            <div className="flex items-center gap-6">
               <StatusBadge status={request.status} pulse className="px-8 py-3 rounded-2xl font-black text-xs tracking-[0.2em]" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Info Panel */}
            <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
              <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-bl-[3rem]" />
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-100 pb-3">Mission Status</h3>
                {request.status === 'cancelled' ? (
                  <div className="flex items-center gap-3 text-red-600 p-6 bg-red-50 rounded-2xl border-2 border-white shadow-md">
                    <XCircle className="w-6 h-6" />
                    <span className="font-bold uppercase text-xs tracking-widest">Protocol Aborted</span>
                  </div>
                ) : (
                  <StatusStepper status={request.status} />
                )}
              </div>

              <div className="glass-card rounded-3xl p-8">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-100 pb-3">Asset Details</h3>
                <div className="flex items-center gap-4 mb-6 bg-slate-50 p-5 rounded-2xl border border-white">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-600/30">
                    <IconRenderer name={serviceIcon} size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-base leading-tight truncate">{serviceName}</p>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">{formatCurrency(request.estimatedPrice)} Est.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-5 bg-slate-50/50 rounded-2xl border border-white">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm font-semibold text-slate-600 leading-relaxed">{request.customerLocation.address}</p>
                </div>
              </div>

              {request.providerName && (
                <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/20 rounded-full -mr-12 -mt-12 blur-xl group-hover:scale-150 transition-all duration-1000" />
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-white/10 pb-3 relative z-10">Deployed Asset</h3>
                  <div className="flex items-center justify-between gap-4 relative z-10">
                    <div className="min-w-0">
                      <p className="font-bold text-xl tracking-tight mb-2 truncate">{request.providerName}</p>
                      <div className="flex flex-col gap-1">
                         {request.providerRating && (
                           <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                             <Check className="w-3 h-3" /> VERIFIED RATING: {request.providerRating.toFixed(1)}
                           </p>
                         )}
                         {request.providerVehicleNumber && (
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UNIT CODE: {request.providerVehicleNumber}</p>
                         )}
                      </div>
                    </div>
                    {request.providerPhone && (
                      <Button variant="outline" asChild className="h-12 w-12 rounded-xl bg-white/5 border-white/10 hover:bg-blue-600 hover:border-blue-500 p-0 shadow-lg">
                        <a href={`tel:${request.providerPhone}`}>
                          <Phone className="w-5 h-5 text-white" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {request.status === 'arriving' && request.arrivalOtp && request.providerArrived && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 text-center space-y-3 shadow-md animate-bounce">
                  <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Share Verification OTP</p>
                  <div className="text-4xl font-black text-slate-800 tracking-[8px]">{request.arrivalOtp}</div>
                  <p className="text-xs text-amber-700 font-medium">Your service provider will require this code to verify their arrival.</p>
                </div>
              )}

              {request.status === 'arriving' && request.arrivalOtp && !request.providerArrived && (
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-6 text-center space-y-2 shadow-sm">
                  <p className="text-[10px] font-black uppercase text-blue-600 tracking-[0.25em] animate-pulse">Helper en route</p>
                  <p className="text-xs text-blue-700 font-semibold leading-relaxed">
                    Your service provider is currently traveling to your location. Your arrival verification OTP will be displayed here once they arrive.
                  </p>
                </div>
              )}

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

              {canCancel && request.status !== 'pendingUserApproval' && (
                <Button
                  variant="outline"
                  className="h-14 w-full rounded-2xl border-red-100 text-red-500 hover:bg-red-50 font-bold text-[10px] uppercase tracking-widest transition-all"
                  onClick={() => setShowCancel(true)}
                >
                  <XCircle className="w-4 h-4 mr-3" />
                  Cancel Request
                </Button>
              )}

              {request.status === 'completed' && !request.isPaid && (
                <Button 
                  className="h-16 w-full rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm tracking-widest shadow-lg shadow-green-600/40 transform hover:scale-105 transition-all" 
                  onClick={() => setShowCompletionConfirm(true)}
                >
                  SETTLE PROTOCOL — {formatCurrency(request.finalPrice || request.estimatedPrice)}
                </Button>
              )}
            </div>

            {/* Map */}
            <div className="lg:col-span-8 order-1 lg:order-2 h-[450px] md:h-[600px] lg:h-[700px]">
              <div className="w-full h-full rounded-3xl overflow-hidden border-4 border-white shadow-xl relative">
                 <LiveTrackingMap requestId={request.id} customerLocation={request.customerLocation} />
              </div>
            </div>
          </div>
        </motion.div>

        {request && showPayment && (
          <PaymentModal open={showPayment} onClose={() => setShowPayment(false)} request={request} onPaid={handlePaymentComplete} />
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
            description={`Please confirm that the provider has finished the work to your satisfaction. Once confirmed, you will proceed to the payment gateway to pay ${formatCurrency(request.finalPrice || request.estimatedPrice)}.`}
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
          description="Are you sure you want to cancel this help request? This action cannot be undone."
          confirmText="Yes, Cancel Request"
          onConfirm={handleCancel}
          isDestructive
        />
      </div>
    </div>
  );
}
