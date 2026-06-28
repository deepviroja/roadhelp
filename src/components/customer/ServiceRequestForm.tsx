import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ShieldCheck, Car, Search, Clock3, ArrowRight, Check, Phone } from 'lucide-react';
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

function estimateArrival(service: ServiceTypeConfig | null) {
  if (!service) return '15-25 min';
  if (service.id === 'towing') return '20-35 min';
  return '10-20 min';
}

export function ServiceRequestForm() {
  const [selectedService, setSelectedService] = useState<ServiceTypeConfig | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const { services } = useServices();
  const displayServices = services.filter((s) => s.isActive ?? true);
  const { profile } = useAuth();
  const { createRequest, isLoading } = useServiceRequest();
  const navigate = useNavigate();

  const form = useForm<ServiceRequestFormData>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    resolver: zodResolver(serviceRequestSchema),
    defaultValues: {
      serviceType: '',
      description: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleColor: '',
      vehiclePlate: '',
      locationDetails: '',
    },
  });

  const filteredServices = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();
    if (!query) return displayServices;
    return displayServices.filter((service) =>
      [service.name, service.description].join(' ').toLowerCase().includes(query),
    );
  }, [displayServices, serviceSearch]);

  const handleSubmit = async () => {
    const valid = await form.trigger();
    if (!selectedService) {
      toast.warning('Please choose a service.');
      return;
    }
    if (!selectedLocation) {
      toast.warning('Please share your location.');
      return;
    }
    if (!valid || !profile) {
      toast.error('Please complete the form before sending.');
      return;
    }

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
        serviceLabel: selectedService.name,
        vehicleType: 'customer vehicle',
        description: formData.description,
        notes: formData.locationDetails,
        vehicleInfo: {
          make: formData.vehicleMake,
          model: formData.vehicleModel,
          color: formData.vehicleColor || undefined,
          plateNumber: formData.vehiclePlate,
        },
        customerLocation: selectedLocation,
        estimatedPrice: selectedService.basePrice,
      });

      toast.success('Request submitted. We are looking for a nearby provider now.');
      navigate(`/customer/track/${requestId}`);
    } catch {
      toast.error('We could not submit your request. Please try again.');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8 relative">
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md"
          >
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Processing your request</h2>
            <p className="text-slate-500 mt-2 font-medium">Please wait while we find nearby providers...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8 space-y-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600 mb-2">New request</p>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Choose the service and share the details.</h2>
          <p className="text-sm text-slate-500 mt-2">Everything happens on one screen, so the booking feels quick and clear.</p>
        </div>

        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Search services</Label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} placeholder="Battery, towing, tire..." className="h-12 rounded-2xl pl-12 bg-slate-50 border-slate-200" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredServices.map((service) => {
            const isSelected = selectedService?.id === service.id;
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  setSelectedService(service);
                  form.setValue('serviceType', service.id, { shouldValidate: true, shouldDirty: true });
                }}
                className={`text-left rounded-[1.5rem] border p-5 transition-all ${isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/15' : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-200'}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isSelected ? 'bg-white/15 text-white' : 'bg-white text-blue-600 shadow-sm'}`}>
                  <IconRenderer name={service.icon} size={24} />
                </div>
                <p className={`font-black text-base ${isSelected ? 'text-white' : 'text-slate-900'}`}>{service.name}</p>
                <p className={`text-sm leading-relaxed mt-2 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>{service.description}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle make</Label>
            <Input {...form.register('vehicleMake')} placeholder="Toyota" className={`h-12 rounded-2xl font-semibold ${form.formState.errors.vehicleMake ? 'border-red-500 bg-red-50' : 'bg-slate-50 border-slate-200'}`} />
            {form.formState.errors.vehicleMake && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.vehicleMake.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle model</Label>
            <Input {...form.register('vehicleModel')} placeholder="Corolla" className={`h-12 rounded-2xl font-semibold ${form.formState.errors.vehicleModel ? 'border-red-500 bg-red-50' : 'bg-slate-50 border-slate-200'}`} />
            {form.formState.errors.vehicleModel && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.vehicleModel.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle color</Label>
            <Input {...form.register('vehicleColor')} placeholder="White" className={`h-12 rounded-2xl font-semibold ${form.formState.errors.vehicleColor ? 'border-red-500 bg-red-50' : 'bg-slate-50 border-slate-200'}`} />
          </div>
          <div className="space-y-1.5">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle number</Label>
            <Input {...form.register('vehiclePlate')} placeholder="ABC-1234" className={`h-12 rounded-2xl font-semibold ${form.formState.errors.vehiclePlate ? 'border-red-500 bg-red-50' : 'bg-slate-50 border-slate-200'}`} />
            {form.formState.errors.vehiclePlate && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.vehiclePlate.message}</p>}
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">What’s the issue?</Label>
            <Textarea {...form.register('description')} placeholder="Tell us what happened, what stopped working, and anything unusual you noticed." className={`rounded-2xl min-h-[140px] bg-slate-50 border-slate-200 ${form.formState.errors.description ? 'border-red-500 bg-red-50' : ''}`} />
            {form.formState.errors.description && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.description.message}</p>}
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Location details</Label>
            <Input {...form.register('locationDetails')} placeholder="Near the petrol station, opposite the main gate..." className="h-12 rounded-2xl font-semibold bg-slate-50 border-slate-200" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" disabled className="rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest">
            <ShieldCheck className="w-4 h-4 mr-2" /> Registered customer
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isLoading} className="rounded-2xl h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest">
            {isLoading ? 'Sending...' : 'Confirm request'} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>

      <div className="space-y-6">
        <div className="rounded-[2rem] bg-slate-950 text-white p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full -mr-10 -mt-10 blur-2xl" />
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-300 mb-2">Selected service</p>
          <h3 className="text-2xl font-black tracking-tight">{selectedService?.name || 'Choose one above'}</h3>
          <p className="text-sm text-slate-300 mt-3 leading-relaxed">{selectedService?.description || 'Pick the service that best matches your issue.'}</p>
          {selectedService && (
            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <div className="flex items-center gap-3"><Car className="w-4 h-4 text-cyan-300" /> Estimated cost: {formatCurrency(selectedService.basePrice)}+</div>
              <div className="flex items-center gap-3"><Clock3 className="w-4 h-4 text-cyan-300" /> Estimated arrival: {estimateArrival(selectedService)}</div>
            </div>
          )}
        </div>

        <div className="rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h3 className="font-black text-slate-900">Your location</h3>
          </div>
          <div className="rounded-[1.5rem] overflow-hidden border border-slate-100">
            <LocationPicker onLocationSelect={setSelectedLocation} initialLocation={selectedLocation ?? undefined} />
          </div>
          {selectedLocation && <p className="text-sm text-slate-500 mt-4 leading-relaxed">{selectedLocation.address}</p>}
        </div>

        <div className="rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <Phone className="w-5 h-5 text-blue-600" />
            <h3 className="font-black text-slate-900">What happens next</h3>
          </div>
          <ul className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <li>We validate your request and share it with nearby providers.</li>
            <li>You can track the request from the confirmation screen.</li>
            <li>Pricing updates appear before anything is finalized.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}



