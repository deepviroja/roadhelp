import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, MapPin, Play, Flag, IndianRupee, XCircle, ShieldAlert, BadgeDollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { doc, onSnapshot, updateDoc } from "firebase/firestore";
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
  const { updateRequestStatus, completeRequest, verifyArrivalOtp, proposeAdditionalCosts } = useServiceRequest();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | ''>('');
  
  // Custom verification and pricing proposal states
  const [otpInput, setOtpInput] = useState('');
  const [showProposeCosts, setShowProposeCosts] = useState(false);
  const [proposedFees, setProposedFees] = useState<number | ''>('');
  const [proposeReason, setProposeReason] = useState('');
  const finalPriceDirtyRef = useRef(false);
  const wasActiveRef = useRef<boolean | null>(null);

  const { services } = useServices();
  const currencySymbol = useSystemStore((s) => s.currencySymbol) || "$";
  const [showCancel, setShowCancel] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);

  const isJobActive =
    request?.status === "accepted" ||
    request?.status === "arriving" ||
    request?.status === "inProgress" ||
    request?.status === "pendingUserApproval";

  const handleVerifyArrivalOtp = async () => {
    if (otpInput.length !== 4) {
      toast.error("Please enter a valid 4-digit OTP.");
      return;
    }
    setIsUpdating(true);
    try {
      await verifyArrivalOtp(id!, otpInput);
      toast.success("OTP verified! Work started successfully.");
      setOtpInput('');
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP. Please check with customer.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProposeCosts = async () => {
    if (proposedFees === '' || Number(proposedFees) <= 0) {
      toast.error("Please enter a valid additional charge.");
      return;
    }
    if (!proposeReason.trim()) {
      toast.error("Please provide a reason for the additional cost.");
      return;
    }

    setIsUpdating(true);
    try {
      await proposeAdditionalCosts(id!, Number(proposedFees), proposeReason);
      toast.success("Additional charges proposed to customer.");
      setShowProposeCosts(false);
      setProposedFees('');
      setProposeReason('');
    } catch (err: any) {
      toast.error(err.message || "Failed to submit cost proposal.");
    } finally {
      setIsUpdating(false);
    }
  };
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
        
        if (wasActiveRef.current === null) {
          wasActiveRef.current = data.status !== "completed" && data.status !== "cancelled";
        }

        if (data.finalPrice != null) {
          setFinalPrice(data.finalPrice);
          finalPriceDirtyRef.current = false;
        } else if (!finalPriceDirtyRef.current && data.estimatedPrice != null) {
          setFinalPrice(data.estimatedPrice);
        }

        setIsLoading(false);

        if ((data.status === "completed" || data.status === "cancelled") && wasActiveRef.current === true) {
          setTimeout(() => navigate("/provider/dashboard"), 2000);
        }
      }
    });
    return () => unsubscribe();
  }, [id, navigate]);

  const handleStatusUpdate = useCallback(
    async (
      newStatus: "pending" | "accepted" | "arriving" | "inProgress" | "completed" | "cancelled",
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

    // Auto-set providerArrived: true if within 0.1km (100m) and currently 'arriving'
    if (dist < 0.1 && request.status === "arriving" && !request.providerArrived) {
      updateDoc(doc(db, "serviceRequests", request.id), { providerArrived: true });
      toast.info("Auto-arrival registered: Within 100m of customer.");
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

  const handleComplete = async () => {
    if (!request) return;

    if (finalPrice === '') {
      toast.error('Please enter the Service Base Amount');
      return;
    }
    
    if (priceError) {
      toast.error('Please fix the price errors before completing the job');
      return;
    }

    setIsUpdating(true);
    try {
      await completeRequest(request.id, Number(finalPrice), request.additionalFees || 0);

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

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-black text-slate-900 mb-2">
                 <span className="text-[10px] uppercase tracking-widest text-slate-400">Total Yield Expectation</span>
                 <span className="text-xl">{formatCurrency(Number(finalPrice) + (request.additionalFees || 0))}</span>
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
                Enter the final amount based on service performed. If you proposed additional costs during arrival, they are already approved and tracked separately.
              </p>
            </div>


            {/* Status Action Buttons */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Update Status</h3>

              {request.status === "pendingUserApproval" && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
                  <ShieldAlert className="w-6 h-6 text-amber-500 animate-pulse" />
                  <p className="font-black uppercase text-[10px] tracking-widest text-amber-600">Awaiting Customer Approval</p>
                  <p className="text-xs text-amber-700 font-medium">
                    You proposed <strong className="text-slate-900">{formatCurrency(request.proposedAdditionalFees || 0)}</strong> additional charges for: <em className="text-slate-800">"{request.proposedAdditionalReason}"</em>.
                  </p>
                  <p className="text-[10px] text-amber-500 font-semibold italic">Workflow is under waiting state until response.</p>
                </div>
              )}

              {request.status === "accepted" && (
                <>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
                    onClick={() => handleStatusUpdate("arriving")}
                    disabled={isUpdating}
                  >
                    <MapPin className="w-4 h-4" />
                    {isUpdating ? "Updating..." : "I'm Arriving"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 gap-2"
                    onClick={() => setShowProposeCosts(true)}
                    disabled={isUpdating}
                  >
                    <BadgeDollarSign className="w-4 h-4" />
                    Propose Additional Charges
                  </Button>
                </>
              )}

              {request.status === "arriving" && (
                <div className="space-y-3 p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                  {!request.providerArrived ? (
                    <div className="space-y-3">
                      <p className="text-xs text-orange-700 font-bold leading-relaxed">
                        You are en route. Click below or drive closer to register arrival and request OTP from customer.
                      </p>
                      <Button
                        onClick={async () => {
                          setIsUpdating(true);
                          try {
                            const ref = doc(db, "serviceRequests", request.id);
                            await updateDoc(ref, { providerArrived: true });
                            toast.success("Arrival registered! Verify customer's OTP to proceed.");
                          } catch {
                            toast.error("Failed to register arrival");
                          } finally {
                            setIsUpdating(false);
                          }
                        }}
                        disabled={isUpdating}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 rounded-xl"
                      >
                        I have Arrived
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Label htmlFor="arrivalOtp" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enter Arrival Verification OTP</Label>
                      <div className="flex gap-2">
                        <Input
                          id="arrivalOtp"
                          type="text"
                          maxLength={4}
                          placeholder="Enter 4-digit OTP"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="font-bold text-center tracking-widest text-lg h-10 flex-1"
                        />
                        <Button
                          onClick={handleVerifyArrivalOtp}
                          disabled={isUpdating || otpInput.length !== 4}
                          className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-10 animate-pulse"
                        >
                          Verify & Start
                        </Button>
                      </div>
                      <p className="text-[10px] text-slate-400">Ask the customer for the 4-digit OTP shown on their screen.</p>
                    </>
                  )}
                  <Button
                    variant="outline"
                    className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 gap-2 mt-2 h-10"
                    onClick={() => setShowProposeCosts(true)}
                    disabled={isUpdating}
                  >
                    <BadgeDollarSign className="w-4 h-4" />
                    Propose Additional Charges
                  </Button>
                </div>
              )}

              {request.status === "inProgress" && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                  onClick={handleComplete}
                  disabled={isUpdating || !!priceError}
                >
                  <Flag className="w-4 h-4" />
                  {isUpdating ? "Completing..." : "Complete Job"}
                </Button>
              )}

              {request.status !== "pendingUserApproval" && (
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 gap-2"
                  onClick={() => setShowCancel(true)}
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Job
                </Button>
              )}
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

      <Dialog open={showProposeCosts} onOpenChange={setShowProposeCosts}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-none shadow-2xl p-8 bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <BadgeDollarSign className="w-6 h-6 text-blue-600" />
              Propose Additional Costs
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Submit additional inspection, labor, or parts costs to the customer for approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-6">
            <div className="space-y-1">
              <Label htmlFor="proposedFees" className="text-xs font-bold text-slate-600">Additional Charges ({currencySymbol})</Label>
              <Input
                id="proposedFees"
                type="number"
                placeholder="e.g. 50"
                value={proposedFees}
                onChange={(e) => setProposedFees(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-12 rounded-xl font-bold bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="proposeReason" className="text-xs font-bold text-slate-600">Reason for Charges</Label>
              <textarea
                id="proposeReason"
                rows={3}
                placeholder="Explain the inspection findings, parts needed, or extra labor..."
                value={proposeReason}
                onChange={(e) => setProposeReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowProposeCosts(false)}
                className="flex-1 h-12 rounded-xl font-bold border-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProposeCosts}
                disabled={isUpdating || proposedFees === '' || !proposeReason.trim()}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
              >
                {isUpdating ? "Submitting..." : "Submit Proposal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ProviderLayout>
  );
}
