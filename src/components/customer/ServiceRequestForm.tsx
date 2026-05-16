import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronRight, ChevronLeft, Check, Info, Car } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LocationPicker } from '@/components/map/LocationPicker';
import { IconRenderer } from '@/components/shared/IconRenderer';
import { serviceRequestSchema, ServiceRequestFormData } from '@/lib/validators';
import { useAuth } from '@/hooks/useAuth';
import { useServiceRequest } from '@/hooks/useServiceRequest';
import { GeoLocation, ServiceTypeConfig } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useServices } from '@/hooks/useServices';

const STEPS = ['Service Type', 'Location', 'Details', 'Confirm'];

export function ServiceRequestForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const { services } = useServices();
  const displayServices = services.filter((s) => s.isActive ?? true);
  const [selectedService, setSelectedService] = useState<ServiceTypeConfig | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(null);
  const { profile } = useAuth();
  const { createRequest, isLoading } = useServiceRequest();
  const navigate = useNavigate();

  const form = useForm<ServiceRequestFormData>({
    resolver: zodResolver(serviceRequestSchema),
  });

  const handleNext = async () => {
    if (currentStep === 0 && !selectedService) {
      toast.warning('Please select a service type');
      return;
    }
    if (currentStep === 1 && !selectedLocation) {
      toast.warning('Please select your location on the map');
      return;
    }
    if (currentStep === 2) {
      const valid = await form.trigger(['description', 'vehicleMake', 'vehicleModel', 'vehicleColor', 'vehiclePlate']);
      if (!valid) return;
    }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!selectedService || !selectedLocation || !profile) return;

    const formData = form.getValues();

    try {
      const requestId = await createRequest({
        customerId: profile.uid,
        customerName: profile.fullName,
        customerPhone: profile.phone,
        serviceType: selectedService.id,
        serviceName: selectedService.name,
        serviceIcon: selectedService.icon,
        serviceBasePrice: selectedService.basePrice,
        serviceMaxPrice: selectedService.maxPrice,
        description: formData.description,
        vehicleInfo: {
          make: formData.vehicleMake,
          model: formData.vehicleModel,
          color: formData.vehicleColor,
          plateNumber: formData.vehiclePlate,
        },
        customerLocation: selectedLocation,
        estimatedPrice: selectedService.basePrice,
      });

      toast.success('Request submitted! Looking for nearby providers...');
      navigate(`/customer/track/${requestId}`);
    } catch {
      toast.error('Failed to submit request. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, idx) => (
          <div key={step} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
              idx < currentStep
                ? 'bg-green-500 text-white'
                : idx === currentStep
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}>
              {idx < currentStep ? <Check className="w-4 h-4" /> : idx + 1}
            </div>
            <div className="flex-1 ml-2 hidden sm:block">
              <p className={`text-xs font-medium ${idx === currentStep ? 'text-blue-600' : idx < currentStep ? 'text-green-600' : 'text-gray-400'}`}>
                {step}
              </p>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 ${idx < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          {/* Step 0: Service Type */}
          {currentStep === 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">What kind of help do you need?</h2>
              <p className="text-gray-500 text-sm mb-6">Select the service that best describes your situation</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(displayServices.length > 0 ? displayServices : []).map((service) => (
                  <motion.button
                    key={service.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedService(service)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      selectedService?.id === service.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="mb-2 flex justify-center text-blue-600">
                      <IconRenderer name={service.icon} size={32} />
                    </div>
                    <p className="font-medium text-sm text-gray-900">{service.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCurrency(service.basePrice)} - {formatCurrency(service.maxPrice)}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Location */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Where are you located?</h2>
              <p className="text-gray-500 text-sm mb-4">Click on the map or use GPS to share your location</p>
              <LocationPicker onLocationSelect={setSelectedLocation} initialLocation={selectedLocation ?? undefined} />
              {selectedLocation && (
                <div className="mt-3">
                  <Label>Additional details (optional)</Label>
                  <Input
                    placeholder="e.g., Near the gas station, highway exit 12..."
                    {...form.register('locationDetails')}
                    className="mt-1.5"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Vehicle Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Vehicle & Problem Details</h2>
                <p className="text-gray-500 text-sm mb-4">Help the provider identify your vehicle</p>
              </div>

              {profile?.vehicles && profile.vehicles.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quick Select from Your Garage</Label>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
                    {profile.vehicles.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          form.setValue('vehicleMake', v.make);
                          form.setValue('vehicleModel', v.model);
                          form.setValue('vehicleColor', v.color || '');
                          form.setValue('vehiclePlate', v.plateNumber);
                          toast.success(`${v.make} selected from garage`);
                        }}
                        className="flex-shrink-0 flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                          <Car className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{v.make} {v.model}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{v.plateNumber}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="vehicleMake">Make</Label>
                  <Input id="vehicleMake" placeholder="Toyota" {...form.register('vehicleMake')} className={form.formState.errors.vehicleMake ? 'border-red-500' : ''} />
                  {form.formState.errors.vehicleMake && <p className="text-xs text-red-600">{form.formState.errors.vehicleMake.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vehicleModel">Model</Label>
                  <Input id="vehicleModel" placeholder="Camry" {...form.register('vehicleModel')} className={form.formState.errors.vehicleModel ? 'border-red-500' : ''} />
                  {form.formState.errors.vehicleModel && <p className="text-xs text-red-600">{form.formState.errors.vehicleModel.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vehicleColor">Color (Optional)</Label>
                  <Input id="vehicleColor" placeholder="White" {...form.register('vehicleColor')} className={form.formState.errors.vehicleColor ? 'border-red-500' : ''} />
                  {form.formState.errors.vehicleColor && <p className="text-xs text-red-600">{form.formState.errors.vehicleColor.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vehiclePlate">License Plate</Label>
                  <Input id="vehiclePlate" placeholder="ABC-1234" {...form.register('vehiclePlate')} className={form.formState.errors.vehiclePlate ? 'border-red-500' : ''} />
                  {form.formState.errors.vehiclePlate && <p className="text-xs text-red-600">{form.formState.errors.vehiclePlate.message}</p>}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="description">Describe the Problem</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what happened in detail... (min 10 characters)"
                    rows={3}
                    {...form.register('description')}
                    className={form.formState.errors.description ? 'border-red-500' : ''}
                  />
                  {form.formState.errors.description && <p className="text-xs text-red-600">{form.formState.errors.description.message}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === 3 && selectedService && selectedLocation && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Confirm Your Request</h2>
              <p className="text-gray-500 text-sm mb-6">Review your details before submitting</p>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="bg-white p-2 text-blue-600 rounded-lg shadow-sm">
                      <IconRenderer name={selectedService.icon} size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900">{selectedService.name}</p>
                      <p className="text-sm text-blue-700">{selectedService.description}</p>
                      <p className="text-sm font-medium text-blue-800 mt-1">
                        Estimated: {formatCurrency(selectedService.basePrice)} - {formatCurrency(selectedService.maxPrice)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Your Location</p>
                      <p className="text-sm text-gray-500">{selectedLocation.address}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Vehicle</p>
                  <p className="text-sm text-gray-600">
                    {form.getValues('vehicleColor')} {form.getValues('vehicleMake')} {form.getValues('vehicleModel')} — {form.getValues('vehiclePlate')}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">{form.getValues('description')}</p>
                </div>

                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    Final price may vary based on actual service required. Payment is made after service is completed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button
            type="button"
            onClick={handleNext}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {isLoading ? 'Submitting...' : (
              <>
                <Check className="w-4 h-4" />
                Confirm & Request
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
