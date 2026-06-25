import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Check, MapPin, XCircle } from 'lucide-react';
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
  const { submitRating, processPayment, updateRequestStatus } = useServiceRequest();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'serviceRequests', id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as ServiceRequest;
        setRequest(data);
        setIsLoading(false);

        // Auto-show payment modal when completed
        if (data.status === 'completed' && !data.isPaid) {
          setShowPayment(true);
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

            {/* Actions */}
            {canCancel && (
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => setShowCancel(true)}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Cancel Request
              </Button>
            )}

            {request.status === 'completed' && !request.isPaid && (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setShowPayment(true)}
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
