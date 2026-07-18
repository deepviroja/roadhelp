import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Check, MapPin, XCircle, ShieldAlert } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
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

            {/* Provider Info */}
            {request.providerName && (
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
                <h3 className="font-semibold text-blue-900 mb-3">Your Provider</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{request.providerName}</p>
                    {request.providerRating && (
                      <p className="text-sm text-gray-500">Rating: {request.providerRating.toFixed(1)}</p>
                    )}
                    {request.providerVehicleNumber && (
                      <p className="text-sm text-gray-500">Vehicle: {request.providerVehicleNumber}</p>
                    )}
                  </div>
                  {request.providerPhone && (
                    <Button variant="outline" asChild className="border-blue-200 text-blue-600 hover:bg-blue-50">
                      <a href={`tel:${request.providerPhone}`}>
                        <Phone className="w-4 h-4 mr-1.5" />
                        Call
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
