import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, MapPin, Play, Flag, IndianRupee, XCircle } from "lucide-react";

import { doc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProviderLayout } from "@/components/layout/ProviderLayout";
import { ProviderLocationMap } from "@/components/map/ProviderLocationMap";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { db } from "@/config/firebase";
import { ServiceRequest } from "@/types";
import { useServiceRequest } from "@/hooks/useServiceRequest";
import { useProviderTracking } from "@/hooks/useProviderTracking";
import { getServiceLabel, formatCurrency } from "@/lib/utils";
import { SERVICE_MAP } from "@/lib/constants";
import { IconRenderer } from "@/components/shared/IconRenderer";
import { useServices } from "@/hooks/useServices";
import { useSystemStore } from "@/stores/systemStore";

export default function ActiveJob() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateRequestStatus, completeRequest } = useServiceRequest();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | ''>('');
  const [additionalFees, setAdditionalFees] = useState<number | ''>('');
  const finalPriceDirtyRef = useRef(false);
  const additionalFeesDirtyRef = useRef(false);

  const { services } = useServices();
  const currencySymbol = useSystemStore((s) => s.currencySymbol) || "$";
  const [showCancel, setShowCancel] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [feesError, setFeesError] = useState<string | null>(null);

  const isJobActive =
    request?.status === "accepted" ||
    request?.status === "arriving" ||
    request?.status === "inProgress";
  const {
    lat,
    lng,
    error: trackingError,
    requestPermission,
  } = useProviderTracking(id ?? null, isJobActive);

  useEffect(() => {
    if (!id) return;
    finalPriceDirtyRef.current = false;
    const unsubscribe = onSnapshot(doc(db, "serviceRequests", id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as ServiceRequest;
        setRequest(data);
        if (data.finalPrice != null) {
          setFinalPrice(data.finalPrice);
          finalPriceDirtyRef.current = false;
        } else if (!finalPriceDirtyRef.current && data.estimatedPrice != null) {
          setFinalPrice(data.estimatedPrice);
        }
        
        if (data.additionalFees != null) {
          setAdditionalFees(data.additionalFees);
          additionalFeesDirtyRef.current = false;
        }

        setIsLoading(false);

        if (data.status === "completed" || data.status === "cancelled") {
          setTimeout(() => navigate("/provider/dashboard"), 2000);
        }
      }
    });
    return () => unsubscribe();
  }, [id, navigate]);

  const handleStatusUpdate = useCallback(
    async (
      newStatus:
        | "arriving"
        | "inProgress"
        | "accepted"
        | "cancelled"
        | "completed",
    ) => {
      if (!request) return;
      setIsUpdating(true);
      try {
        await updateRequestStatus(request.id, newStatus);
        toast.success(`Status updated to ${newStatus}`);
      } catch {
        toast.error("Failed to update status");
      } finally {
        setIsUpdating(false);
      }
    },
    [request, updateRequestStatus],
  );

  // Automatic state changes based on distance
  useEffect(() => {
    if (!id || !request || lat == null || lng == null || isUpdating) return;

    const calculateDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number,
    ) => {
      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in km
    };

    const dist = calculateDistance(
      lat,
      lng,
      request.customerLocation.lat,
      request.customerLocation.lng,
    );

    // Auto-update to 'arriving' if within 1km and currently 'accepted'
    if (dist < 1 && request.status === "accepted") {
      handleStatusUpdate("arriving");
      toast.info("Status automatically updated to Arriving (Within 1km)");
    }

    // Auto-update to 'inProgress' if within 0.1km (100m) and currently 'arriving'
    if (dist < 0.1 && request.status === "arriving") {
      handleStatusUpdate("inProgress");
      toast.success(
        "You have arrived at the customer location! Status updated to In Progress.",
      );
    }
  }, [id, request, lat, lng, isUpdating, handleStatusUpdate]);

  useEffect(() => {
    if (!request) return;
    const service = services.find((s) => s.id === request.serviceType);
    if (service && finalPrice !== '') {
      if (finalPrice < 0) {
        setPriceError("Price cannot be negative");
      } else if (finalPrice < service.basePrice || finalPrice > service.maxPrice) {
        setPriceError(`Price must be between ${formatCurrency(service.basePrice)} and ${formatCurrency(service.maxPrice)}`);
      } else {
        setPriceError(null);
      }
    } else {
      setPriceError(null);
    }
  }, [finalPrice, request, services]);

  useEffect(() => {
    if (additionalFees !== '' && additionalFees < 0) {
      setFeesError("Additional fees cannot be negative");
    } else {
      setFeesError(null);
    }
  }, [additionalFees]);

  const handleComplete = async () => {
    if (!request) return;

    if (finalPrice === '') {
      toast.error('Please enter the Service Base Amount');
      return;
    }
    
    if (priceError || feesError) {
      toast.error('Please fix the price errors before completing the job');
      return;
    }

    setIsUpdating(true);
    try {
      await completeRequest(request.id, Number(finalPrice), Number(additionalFees) || 0);

      toast.success(
        "Job completed! Great work! Customer will be notified to pay.",
      );
    } catch {
      toast.error("Failed to complete job");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!request) return;
    try {
      await updateRequestStatus(request.id, "cancelled");
      toast.info("Job has been cancelled");
      navigate("/provider/dashboard");
    } catch (err) {
      console.error("Cancel error:", err);
      toast.error("Failed to cancel job");
    }
  };

  if (isLoading)
    return (
      <ProviderLayout>
        <LoadingSpinner fullPage text="Loading job..." />
      </ProviderLayout>
    );
  if (!request)
    return (
      <ProviderLayout>
        <div>Job not found</div>
      </ProviderLayout>
    );

  const service = SERVICE_MAP[request.serviceType];
  const serviceIcon = request.serviceIcon ?? service?.icon ?? "Wrench";

  return (
    <ProviderLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Active Job</h1>
            <p className="text-gray-500 text-sm">
              Job #{request.id.slice(-6).toUpperCase()}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Job Info */}
          <div className="space-y-4">
            {/* Service Info */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-blue-600">
                  <IconRenderer name={serviceIcon} size={24} />
                </span>
                <div>
                  <p className="font-semibold text-gray-900">
                    {request.serviceName ??
                      getServiceLabel(request.serviceType)}
                  </p>
                  <p className="text-sm text-gray-500">{request.description}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 mb-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <p className="text-sm text-gray-600">
                  {request.customerLocation.address}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
              <h3 className="font-semibold text-blue-900 mb-3">
                Customer Details
              </h3>
              <p className="font-semibold text-gray-900">
                {request.customerName}
              </p>
              {request.vehicleInfo && (
                <p className="text-sm text-gray-600 mt-1">
                  {[
                    request.vehicleInfo.color,
                    request.vehicleInfo.make,
                    request.vehicleInfo.model,
                  ]
                    .filter(Boolean)
                    .join(" ")}{" "}
                  — {request.vehicleInfo.plateNumber}
                </p>
              )}
              <Button
                variant="outline"
                asChild
                className="mt-3 border-blue-200 text-blue-600"
              >
                <a href={`tel:${request.customerPhone}`}>
                  <Phone className="w-4 h-4 mr-1.5" />
                  Call {request.customerName}
                </a>
              </Button>
            </div>

            {/* Final Price - Editable by Provider */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="space-y-1.5 font-medium mb-3">
                <Label
                  htmlFor="finalPrice"
                  className="flex items-center gap-1.5 text-gray-700"
                >
                  <IndianRupee className="w-4 h-4 text-green-600" />
                  Service Base Amount
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                    {currencySymbol}
                  </div>
                  <Input
                    id="finalPrice"
                    type="number"
                    min={services.find((s) => s.id === request?.serviceType)?.basePrice}
                    max={services.find((s) => s.id === request?.serviceType)?.maxPrice}
                    value={finalPrice === '' ? '' : finalPrice}
                    onChange={(e) => {
                      finalPriceDirtyRef.current = true;
                      setFinalPrice(e.target.value === '' ? '' : Number(e.target.value));
                    }}
                    className={`pl-7 text-2xl font-bold h-14 ${priceError ? "border-red-500 bg-red-50 text-red-900" : "text-slate-900"}`}
                  />
                </div>
                {priceError && <p className="text-red-600 text-xs font-bold mt-1">{priceError}</p>}
              </div>

              <div className="space-y-1.5 font-medium mb-3">
                <Label
                  htmlFor="additionalFees"
                  className="flex items-center gap-1.5 text-gray-700"
                >
                  <IndianRupee className="w-4 h-4 text-blue-600" />
                  Additional Charges / Parts Fee
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                    {currencySymbol}
                  </div>
                  <Input
                    id="additionalFees"
                    type="number"
                    value={additionalFees === '' ? '' : additionalFees}
                    onChange={(e) => {
                      additionalFeesDirtyRef.current = true;
                      setAdditionalFees(e.target.value === '' ? '' : Number(e.target.value));
                    }}
                    className={`pl-7 text-2xl font-bold h-14 ${feesError ? "border-red-500 bg-red-50 text-red-900" : "text-blue-600"}`}
                  />
                </div>
                {feesError && <p className="text-red-600 text-xs font-bold mt-1">{feesError}</p>}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-black text-slate-900 mb-2">
                 <span className="text-[10px] uppercase tracking-widest text-slate-400">Total Yield Expectation</span>
                 <span className="text-xl">{formatCurrency(Number(finalPrice) + Number(additionalFees))}</span>
              </div>

              {services.find((s) => s.id === request.serviceType) && (
                <p className="text-xs text-gray-400 mb-4">
                  Service Price Range:{" "}
                  {formatCurrency(
                    services.find((s) => s.id === request.serviceType)!
                      .basePrice,
                  )}{" "}
                  -{" "}
                  {formatCurrency(
                    services.find((s) => s.id === request.serviceType)!
                      .maxPrice,
                  )}
                </p>
              )}
              
              <p className="text-xs text-blue-600 bg-blue-50 p-3 rounded-xl border border-blue-100">
                Enter the final amount based on service performed and any additional parts or labor. Customer will see these as mandatory charges.
              </p>
            </div>


            {/* Status Action Buttons */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Update Status</h3>

              {request.status === "accepted" && (
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
                  onClick={() => handleStatusUpdate("arriving")}
                  disabled={isUpdating}
                >
                  <MapPin className="w-4 h-4" />
                  {isUpdating ? "Updating..." : "I'm Arriving"}
                </Button>
              )}

              {request.status === "arriving" && (
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2"
                  onClick={() => handleStatusUpdate("inProgress")}
                  disabled={isUpdating}
                >
                  <Play className="w-4 h-4" />
                  {isUpdating ? "Updating..." : "Start Work"}
                </Button>
              )}

              {request.status === "inProgress" && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                  onClick={handleComplete}
                  disabled={isUpdating || !!priceError || !!feesError}
                >
                  <Flag className="w-4 h-4" />
                  {isUpdating ? "Completing..." : "Complete Job"}
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 gap-2"
                onClick={() => setShowCancel(true)}
              >
                <XCircle className="w-4 h-4" />
                Cancel Job
              </Button>
            </div>
          </div>

          {/* Map */}
          <div>
            {lat != null && lng != null ? (
              <ProviderLocationMap
                providerLocation={{ lat, lng }}
                customerLocation={request.customerLocation}
              />
            ) : (
              <div className="bg-gray-100 rounded-xl h-96 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-500">
                    {trackingError ? trackingError : "Waiting for GPS..."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestPermission}
                    className="mt-2"
                  >
                    Enable Location
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={showCancel}
        onOpenChange={setShowCancel}
        title="Cancel Job?"
        description="Are you sure you want to cancel this job? The customer will be notified."
        confirmText="Cancel Job"
        onConfirm={handleCancel}
        isDestructive
      />
    </ProviderLayout>
  );
}
