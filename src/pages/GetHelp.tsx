import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronRight, ChevronLeft, Check, Info, User, Phone, Truck, ShieldCheck, MapPinned, ListTodo, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LocationPicker } from '@/components/map/LocationPicker';
import { IconRenderer } from '@/components/shared/IconRenderer';
import { useServices } from '@/hooks/useServices';
import { useServiceRequest } from '@/hooks/useServiceRequest';
import { formatCurrency } from '@/lib/utils';
import { GeoLocation, ServiceTypeConfig } from '@/types';
import { ensureGuestAuth } from '@/lib/guestAuth';
import { PhoneInputGroup } from '@/components/ui/phone-input';
import { guestHelpSchema, GuestHelpFormData } from '@/lib/validators';

const STEPS = [
  { id: 'service', label: 'Service Type', icon: Truck },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'details', label: 'Brief Details', icon: ListTodo },
  { id: 'confirm', label: 'Confirmation', icon: ShieldCheck }
];

export default function GetHelp() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { services, isLoading: isServicesLoading } = useServices();
  const { createRequest, isLoading } = useServiceRequest();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedService, setSelectedService] = useState<ServiceTypeConfig | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(null);

  const activeServices = useMemo(
    () => services.filter((s) => s.isActive ?? true),
    [services]
  );

  const form = useForm<GuestHelpFormData>({
    resolver: zodResolver(guestHelpSchema),
    defaultValues: {
      name: '',
      phone: '',
      countryCode: '+1',
      vehicleMake: '',
      vehicleModel: '',
      vehicleColor: '',
      vehiclePlate: '',
      description: '',
    },
  });

  useEffect(() => {
    ensureGuestAuth().catch((err: unknown) => {
      console.error('ensureGuestAuth error:', err);
    });

    const params = new URLSearchParams(routeLocation.search);
    const serviceParam = params.get('service');

    const draftRaw = sessionStorage.getItem('roadhelp:guestRequestDraft');
    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw) as Partial<{ name: string; phone: string; serviceType: string; notes: string }>;
        if (draft.name) form.setValue('name', draft.name);
        if (draft.phone) form.setValue('phone', draft.phone);
        if (draft.notes) form.setValue('description', draft.notes);
        if (!serviceParam && draft.serviceType) {
          params.set('service', draft.serviceType);
          navigate(`/get-help?service=${encodeURIComponent(draft.serviceType)}`, { replace: true });
        }
      } catch {
        // ignore
      } finally {
        sessionStorage.removeItem('roadhelp:guestRequestDraft');
      }
    }
  }, []);

  useEffect(() => {
    if (selectedService) return;
    const params = new URLSearchParams(routeLocation.search);
    const serviceParam = params.get('service');
    if (!serviceParam) return;
    const match = activeServices.find((s) => s.id === serviceParam);
    if (match) setSelectedService(match);
  }, [activeServices, routeLocation.search, selectedService]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

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
      const ok = await form.trigger();
      if (!ok) {
        toast.error('Please check the details before continuing');
        return;
      }
    }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!selectedService || !selectedLocation) return;
    const values = form.getValues();
    
    try {
      const user = await ensureGuestAuth();

      const requestId = await createRequest({
        customerId: user.uid,
        customerName: values.name,
        customerPhone: `${values.countryCode}${values.phone}`,
        isGuest: true,
        guestSessionId: user.uid,
        serviceType: selectedService.id,
        serviceName: selectedService.name,
        serviceIcon: selectedService.icon,
        serviceBasePrice: selectedService.basePrice,
        serviceMaxPrice: selectedService.maxPrice,
        description: values.description,
        vehicleInfo: {
          make: values.vehicleMake,
          model: values.vehicleModel,
          color: values.vehicleColor,
          plateNumber: values.vehiclePlate,
        },
        customerLocation: selectedLocation,
        estimatedPrice: selectedService.basePrice,
      });

      toast.success('Mission Deployment Successful! Monitoring fleet...');
      navigate(`/track/${requestId}`);
    } catch (err: unknown) {
      const anyErr = err as { message?: string };
      toast.error(anyErr?.message || 'Dispatch failure. Please try again.');
    }
  };

  return (
    <div className="flex-1 bg-[#F5F5F6] min-h-screen overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10 md:py-16 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-12 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-black text-[#1A1A2E] tracking-tight mb-3 leading-none">Urgent Dispatch</h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Instant Roadside Assets • Zero Subscription Protocol</p>
          </div>

          <div className="flex items-center justify-between mb-20 relative overflow-x-auto pb-6 scrollbar-hide">
            <div className="absolute top-7 left-0 right-0 h-1.5 bg-slate-200 rounded-full z-0" />
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex flex-col items-center flex-1 relative z-10 px-2 sm:px-4 min-w-[70px] sm:min-w-[120px]">
                  <div
                    className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-4 transition-all duration-500 font-black ${
                      idx < currentStep
                        ? 'bg-blue-600 border-white text-white shadow-xl shadow-blue-600/40'
                        : idx === currentStep
                          ? 'bg-white border-blue-600 text-blue-600 shadow-2xl scale-110'
                          : 'bg-slate-100 border-slate-100 text-slate-400'
                    }`}
                  >
                    {idx < currentStep ? <Check className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={4} /> : <Icon className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </div>
                  <p className={`text-[9px] sm:text-[11px] font-black uppercase tracking-widest mt-4 sm:mt-6 whitespace-nowrap ${idx === currentStep ? 'text-blue-600 block' : 'text-slate-400 hidden sm:block'}`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="glass-card rounded-3xl p-6 md:p-12 mb-10 min-h-[500px] flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full -mr-32 -mt-32 blur-3xl" />
              
              {currentStep === 0 && (
                <div className="flex-1 relative z-10">
                  <div className="mb-10">
                    <span className="bg-blue-600/10 text-blue-600 py-2 px-4 rounded-xl font-bold uppercase text-[10px] tracking-widest mb-4 inline-block backdrop-blur-md">Initial Evaluation</span>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Diagnostic Analysis</h2>
                    <p className="text-slate-500 font-medium text-sm">Identify the primary system failure for immediate asset deployment</p>
                  </div>

                  {isServicesLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 animate-pulse">
                        <div className="w-20 h-20 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-8" />
                        <span className="font-black text-[12px] uppercase tracking-[0.5em] text-slate-400">Syncing Intelligence Library...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activeServices.map((service) => (
                        <motion.button
                          key={service.id}
                          type="button"
                          whileHover={{ y: -5, scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedService(service)}
                          className={`p-6 md:p-8 rounded-3xl border-2 text-left transition-all relative group overflow-hidden ${
                            selectedService?.id === service.id
                              ? 'border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-600/30'
                              : 'border-slate-100 bg-slate-50 hover:border-blue-300 hover:bg-white'
                          }`}
                        >
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all ${selectedService?.id === service.id ? 'bg-white/20 text-white shadow-inner' : 'bg-white shadow-md text-blue-600 group-hover:rotate-6'}`}>
                            <IconRenderer name={service.icon} size={28} />
                          </div>
                          <p className={`font-black text-xl mb-1 tracking-tight ${selectedService?.id === service.id ? 'text-white' : 'text-slate-900'}`}>{service.name}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedService?.id === service.id ? 'text-white/80' : 'text-slate-500'}`}>
                             ESTIMATED: {formatCurrency(service.basePrice)}+
                          </p>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentStep === 1 && (
                <div className="flex-1 flex flex-col relative z-10">
                  <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                      <span className="bg-indigo-600/10 text-indigo-600 py-2 px-4 rounded-xl font-bold uppercase text-[10px] tracking-widest mb-4 inline-block backdrop-blur-md">Telemetry Hook</span>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Geolocation Lock</h2>
                      <p className="text-slate-500 font-medium text-sm">Coordinate synchronization for absolute precision in field deployment</p>
                    </div>
                    {selectedLocation && (
                       <motion.div 
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         className="flex items-center gap-6 bg-green-600/5 border-2 border-white p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-md"
                       >
                          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-green-600/30">
                             <MapPinned className="w-8 h-8" />
                          </div>
                          <div className="min-w-0 max-w-[200px] md:max-w-[300px]">
                             <p className="text-[11px] font-black text-green-700 uppercase tracking-[0.3em] leading-none mb-2">Coordinates Verified</p>
                             <p className="text-sm font-bold text-slate-700 truncate">{selectedLocation.address}</p>
                          </div>
                       </motion.div>
                    )}
                  </div>
                  <div className="w-full h-[450px] bg-slate-100 rounded-3xl overflow-hidden border-4 border-white shadow-lg relative group">
                    <LocationPicker onLocationSelect={setSelectedLocation} initialLocation={selectedLocation ?? undefined} />
                    {!selectedLocation && (
                       <div className="absolute inset-x-0 bottom-8 flex justify-center pointer-events-none z-10">
                          <motion.div 
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="bg-slate-900/90 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 border border-white/10"
                          >
                             <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                               <MapPin className="w-5 h-5" />
                             </div>
                             <span className="font-bold text-[10px] uppercase tracking-widest text-white">ESTABLISH GPS</span>
                          </motion.div>
                       </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="flex-1 relative z-10">
                  <div className="mb-10">
                    <span className="bg-amber-600/10 text-amber-600 py-2 px-4 rounded-xl font-bold uppercase text-[10px] tracking-widest mb-4 inline-block backdrop-blur-md">Mission Briefing</span>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Intelligence Entry</h2>
                    <p className="text-slate-500 font-medium text-sm">Handler credentials and subject identification profiles</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-3 group">
                        <Label htmlFor="name" className="ml-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 group-focus-within:text-blue-600 transition-colors">Mission Handler Name</Label>
                        <Input
                          id="name"
                          placeholder="EX: JOHNATHAN WICK"
                          {...form.register('name')}
                          className={`h-14 rounded-2xl font-semibold text-base bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all ${form.formState.errors.name ? 'border-red-500 bg-red-50' : ''}`}
                        />
                        {form.formState.errors.name && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-2 tracking-widest">{form.formState.errors.name.message}</p>}
                      </div>
                      <div className="space-y-3 group">
                        <Label htmlFor="phone" className="ml-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 group-focus-within:text-blue-600 transition-colors">Tactical Mobile Link</Label>
                        <PhoneInputGroup
                          countryCode={form.watch('countryCode')}
                          phone={form.watch('phone')}
                          onCountryCodeChange={(v) => form.setValue('countryCode', v)}
                          onPhoneChange={(v) => form.setValue('phone', v)}
                          error={!!form.formState.errors.phone}
                        />
                        {form.formState.errors.phone && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-2 tracking-widest">{form.formState.errors.phone.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3 group">
                          <Label className="ml-2 text-[10px] font-bold uppercase text-slate-500 tracking-widest">Vehicle Make</Label>
                          <Input placeholder="TESLA" {...form.register('vehicleMake')} className={`h-14 rounded-2xl bg-slate-50 border-slate-200 font-semibold text-base focus:bg-white transition-all uppercase ${form.formState.errors.vehicleMake ? 'border-red-500 bg-red-50' : ''}`} />
                          {form.formState.errors.vehicleMake && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-2 tracking-widest">{form.formState.errors.vehicleMake.message}</p>}
                        </div>
                        <div className="space-y-3 group">
                          <Label className="ml-2 text-[10px] font-bold uppercase text-slate-500 tracking-widest">Vehicle Model</Label>
                          <Input placeholder="MODEL S" {...form.register('vehicleModel')} className={`h-14 rounded-2xl bg-slate-50 border-slate-200 font-semibold text-base focus:bg-white transition-all uppercase ${form.formState.errors.vehicleModel ? 'border-red-500 bg-red-50' : ''}`} />
                          {form.formState.errors.vehicleModel && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-2 tracking-widest">{form.formState.errors.vehicleModel.message}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3 group">
                          <Label className="ml-2 text-[10px] font-bold uppercase text-slate-500 tracking-widest">Primary Color (Optional)</Label>
                          <Input placeholder="MIDNIGHT" {...form.register('vehicleColor')} className={`h-14 rounded-2xl bg-slate-50 border-slate-200 font-semibold text-base focus:bg-white transition-all uppercase ${form.formState.errors.vehicleColor ? 'border-red-500 bg-red-50' : ''}`} />
                          {form.formState.errors.vehicleColor && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-2 tracking-widest">{form.formState.errors.vehicleColor.message}</p>}
                        </div>
                        <div className="space-y-3 group">
                          <Label className="ml-2 text-[10px] font-bold uppercase text-slate-500 tracking-widest">Plate Code</Label>
                          <Input placeholder="ALPHA-001" {...form.register('vehiclePlate')} className={`h-14 rounded-2xl bg-slate-50 border-slate-200 font-semibold text-base focus:bg-white transition-all uppercase ${form.formState.errors.vehiclePlate ? 'border-red-500 bg-red-50' : ''}`} />
                          {form.formState.errors.vehiclePlate && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-2 tracking-widest">{form.formState.errors.vehiclePlate.message}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-3 pt-4 group">
                      <Label className="ml-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 group-focus-within:text-blue-600">Incident Parameters / Tactical Situation</Label>
                      <Textarea
                        placeholder="Detail the failure parameters (e.g., Engine unresponsive, Rear-left puncture, Electronic lockout, Stranded in dark area)..."
                        className="rounded-2xl bg-slate-50 border-slate-200 font-medium text-base p-6 min-h-[160px] resize-none focus:bg-white focus:border-blue-500 transition-all"
                        {...form.register('description')}
                      />
                      {form.formState.errors.description && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-2 tracking-widest">{form.formState.errors.description.message}</p>}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && selectedService && selectedLocation && (
                <div className="flex-1 relative z-10">
                  <div className="mb-10 text-center">
                    <span className="bg-green-600/10 text-green-600 py-2 px-4 rounded-xl font-bold uppercase text-[10px] tracking-widest mb-4 inline-block backdrop-blur-md">Pre-Deployment Review</span>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Final Protocol</h2>
                    <p className="text-slate-500 font-medium text-sm">Validate mission trajectory before absolute fleet dispatch</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 bg-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden group">
                       <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-50" />
                       <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/20 rounded-full -mr-24 -mt-24 blur-2xl group-hover:scale-150 transition-all duration-1000" />
                       
                       <div className="flex items-center gap-6 mb-8 relative z-10">
                          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg transform -rotate-3">
                             <IconRenderer name={selectedService.icon} size={28} />
                          </div>
                          <div>
                             <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Target Capability</p>
                             <h4 className="text-2xl font-black tracking-tight">{selectedService.name}</h4>
                          </div>
                       </div>
                       
                       <p className="text-sm text-slate-300 font-medium leading-relaxed mb-8 italic relative z-10">"{selectedService.description}"</p>
                       
                       <div className="flex items-baseline justify-between relative z-10 p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Baseline Rate</span>
                          <span className="text-3xl font-black">{formatCurrency(selectedService.basePrice)}</span>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-5 hover:bg-white hover:shadow-md transition-all group">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 flex-shrink-0 group-hover:rotate-6 transition-transform">
                             <MapPin className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Primary Hook</p>
                             <p className="text-sm font-semibold text-slate-700 truncate">{selectedLocation.address}</p>
                          </div>
                       </div>
                       <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-5 hover:bg-white hover:shadow-md transition-all group">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 flex-shrink-0 group-hover:rotate-6 transition-transform">
                             <User className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Subject Handler</p>
                             <p className="text-base font-bold text-slate-900 tracking-tight">{form.getValues('name')}</p>
                          </div>
                       </div>
                       <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-5 hover:bg-white hover:shadow-md transition-all group">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 flex-shrink-0 group-hover:rotate-6 transition-transform">
                             <Truck className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Target Vehicle</p>
                             <p className="text-sm font-semibold text-slate-700 uppercase">{form.getValues('vehicleColor')} {form.getValues('vehicleMake')} {form.getValues('vehicleModel')} | {form.getValues('vehiclePlate')}</p>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center gap-6 p-6 bg-blue-600 text-white rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                    <ShieldCheck className="w-8 h-8 text-white shrink-0" strokeWidth={2.5} />
                    <p className="text-xs font-bold uppercase tracking-wider leading-relaxed opacity-90">
                      Operational Assurance: Platform protocols fully synchronized. Fleet assets are on high-alert status.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-10 pt-8 flex flex-col sm:flex-row justify-between gap-4 border-t border-slate-100 relative z-10">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="lg"
                  onClick={handleBack} 
                  disabled={currentStep === 0} 
                  className="rounded-xl font-bold text-[11px] uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all px-8 group"
                >
                  <ChevronLeft className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" />
                  ABORT / RETURN
                </Button>

                {currentStep < STEPS.length - 1 ? (
                  <Button 
                   type="button" 
                   size="lg"
                   onClick={handleNext} 
                   className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] uppercase tracking-widest shadow-md px-10 group transition-all"
                  >
                    ENGAGE NEXT PHASE
                    <ChevronRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="rounded-xl bg-slate-900 hover:bg-black text-white font-black text-sm uppercase tracking-widest shadow-lg group relative overflow-hidden transition-all px-12 h-14"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {isLoading ? (
                       <span className="flex items-center gap-4 animate-pulse"><Loader2 className="w-5 h-5 animate-spin" /> SYNCHRONIZING...</span>
                    ) : (
                      <span className="flex items-center gap-4">
                         <ShieldCheck className="w-5 h-5 group-hover:rotate-12 transition-transform text-blue-400" strokeWidth={2.5} />
                         DISPATCH ASSETS NOW
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black transition-all uppercase tracking-widest ${className}`}>
      {children}
    </div>
  );
}
