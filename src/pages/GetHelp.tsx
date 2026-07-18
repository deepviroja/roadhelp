import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  BadgeHelp,
  Car,
  Check,
  ChevronDown,
  Clock3,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  AlertTriangle,

} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PhoneInputGroup } from '@/components/ui/phone-input';
import { LocationPicker } from '@/components/map/LocationPicker';
import { IconRenderer } from '@/components/shared/IconRenderer';
import { useServices } from '@/hooks/useServices';
import { useServiceRequest } from '@/hooks/useServiceRequest';
import { formatCurrency, getServiceLabel } from '@/lib/utils';
import { GeoLocation, ServiceType, ServiceTypeConfig } from '@/types';
import { ensureGuestAuth } from '@/lib/guestAuth';
import { guestHelpSchema, GuestHelpFormData } from '@/lib/validators';

const CONTACT_METHODS = [
  { value: 'phone', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
] as const;

const VEHICLE_TYPES = ['Car', 'SUV', 'Bike', 'Van', 'Truck', 'Other'] as const;

function estimateArrival(service: ServiceTypeConfig | null) {
  if (!service) return '15-25 min';
  if (service.id === 'towing') return '20-35 min';
  if (service.id === 'fuelDelivery') return '15-25 min';
  return '10-20 min';
}

export default function GetHelp() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { services, isLoading: isServicesLoading } = useServices();
  const { createRequest, isLoading } = useServiceRequest();

  const [screen, setScreen] = useState<'form' | 'confirm'>('form');
  const [selectedService, setSelectedService] = useState<ServiceTypeConfig | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(null);
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false);
  const [serviceLabelOverride, setServiceLabelOverride] = useState('');

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnectionSlow, setIsConnectionSlow] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const conn = (navigator as any).connection;
    if (conn) {
      const checkSpeed = () => {
        setIsConnectionSlow(
          conn.effectiveType === 'slow-2g' ||
          conn.effectiveType === '2g' ||
          (conn.rtt && conn.rtt > 1500)
        );
      };
      checkSpeed();
      conn.addEventListener('change', checkSpeed);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        conn.removeEventListener('change', checkSpeed);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const activeServices = useMemo(
    () => services.filter((s) => s.isActive ?? true),
    [services],
  );

  const filteredServices = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();
    if (!query) return activeServices;
    return activeServices.filter((service) =>
      [service.name, getServiceLabel(service.id), service.description].join(' ').toLowerCase().includes(query),
    );
  }, [activeServices, serviceSearch]);

  const resolveServiceConfig = (serviceId: string) => activeServices.find((service) => service.id === serviceId) ?? activeServices.find((service) => service.id === 'otherService') ?? null;

  const form = useForm<GuestHelpFormData>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    resolver: zodResolver(guestHelpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      countryCode: '+91',
      vehicleType: '',
      vehicleBrand: '',
      vehicleModel: '',
      vehicleNumber: '',
      serviceType: '',
      description: '',
      notes: '',
      preferredContactMethod: 'phone',
      isEmergency: false,
    },
  });

  const watchedServiceType = form.watch('serviceType');
  const resolvedServiceType = watchedServiceType || selectedService?.id || (serviceLabelOverride ? 'otherService' : '');
  const selectedServiceConfig = selectedService
    ?? activeServices.find((service) => service.id === resolvedServiceType)
    ?? activeServices.find((service) => service.id === 'otherService')
    ?? null;
  const selectedServiceLabel = serviceLabelOverride || (selectedServiceConfig?.id === 'otherService' ? 'Other Service' : selectedServiceConfig ? getServiceLabel(selectedServiceConfig.id) : 'No service selected yet');

  useEffect(() => {
    const params = new URLSearchParams(routeLocation.search);
    const serviceParam = params.get('service');
    const draftRaw = sessionStorage.getItem('roadhelp:guestRequestDraft');

    const applyServiceSelection = (serviceId: string, label?: string) => {
      const serviceConfig = resolveServiceConfig(serviceId);
      const resolvedId = serviceConfig?.id || 'otherService';
      if (serviceConfig) {
        setSelectedService(serviceConfig);
      }
      setServiceLabelOverride(label || getServiceLabel(resolvedId as ServiceType));
      form.setValue('serviceType', resolvedId as ServiceType, { shouldValidate: true, shouldDirty: true });
    };

    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw) as Partial<GuestHelpFormData> & { serviceLabel?: string };
        if (draft.fullName) form.setValue('fullName', draft.fullName);
        if (draft.email) form.setValue('email', draft.email);
        if (draft.phone) form.setValue('phone', draft.phone);
        if (draft.countryCode) form.setValue('countryCode', draft.countryCode);
        if (draft.description) form.setValue('description', draft.description);
        if (draft.notes) form.setValue('notes', draft.notes);
        if (draft.serviceType) {
          applyServiceSelection(draft.serviceType, draft.serviceLabel);
        } else if (draft.serviceLabel) {
          setServiceLabelOverride(draft.serviceLabel);
        }
      } catch {
        // ignore draft parsing errors
      } finally {
        sessionStorage.removeItem('roadhelp:guestRequestDraft');
      }
    }

    if (serviceParam) {
      applyServiceSelection(serviceParam);
    } else if (!draftRaw && activeServices.length > 0) {
      const first = activeServices[0];
      applyServiceSelection(first.id);
    }
  }, [activeServices, form, routeLocation.search]);

  const handleContinue = async () => {
    if (resolvedServiceType && form.getValues('serviceType') !== resolvedServiceType) {
      form.setValue('serviceType', resolvedServiceType as ServiceType, { shouldValidate: true, shouldDirty: true });
    }

    const valid = await form.trigger();
    if (!resolvedServiceType) {
      toast.warning('Please choose a service.');
      return;
    }
    if (!selectedLocation) {
      toast.warning('Please share your location.');
      return;
    }
    if (!valid) {
      return;
    }
    setConfirmationNumber('RH-' + Math.random().toString(36).slice(2, 8).toUpperCase());
    setScreen('confirm');
  };

  const handleSubmit = async () => {
    if (!selectedServiceConfig || !selectedLocation) return;

    try {
      const user = await ensureGuestAuth();
      const values = form.getValues();

      const requestId = await createRequest({
        customerId: user.uid,
        customerName: values.fullName,
        customerEmail: values.email || undefined,
        customerPhone: `${values.countryCode}${values.phone}`,
        phone: values.phone,
        countryCode: values.countryCode,
        isGuest: true,
        guestSessionId: user.uid,
        serviceType: resolvedServiceType as ServiceType,
        serviceName: selectedServiceLabel,
        serviceIcon: selectedServiceConfig.icon,
        serviceBasePrice: selectedServiceConfig.basePrice,
        serviceMaxPrice: selectedServiceConfig.maxPrice,
        serviceLabel: selectedServiceLabel,
        vehicleType: values.vehicleType,
        description: values.description,
        notes: values.notes,
        preferredContactMethod: values.preferredContactMethod,
        isEmergency: values.isEmergency,
        vehicleInfo: {
          make: values.vehicleBrand,
          model: values.vehicleModel,
          plateNumber: values.vehicleNumber || 'Not shared',
        },
        customerLocation: selectedLocation,
        estimatedPrice: selectedServiceConfig.basePrice,
      });

      toast.success('Your request has been sent.');
      navigate(`/track/${requestId}`);
    } catch (err: unknown) {
      const anyErr = err as { message?: string };
      toast.error(anyErr?.message || 'We could not submit your request.');
    }
  };

  return (
    <div className="flex-1 bg-[#F5F5F6] min-h-screen overflow-x-hidden relative">
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

      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10 md:py-16 pb-24 ">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-600 mb-3">Book help</p>
          <h1 className="text-4xl md:text-5xl font-black text-[#1A1A2E] tracking-tight leading-none mb-4">Tell us what happened and we’ll take care of the rest.</h1>
          <p className="text-slate-500 font-medium max-w-2xl leading-relaxed">Pick a service, share your location, and review the booking before you confirm.</p>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-8 items-start">
          <AnimatePresence mode="wait">
            {screen === 'form' ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="glass-card rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-white/60"
              >
                <div className="flex items-start justify-between gap-4 mb-8">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Selected service</p>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{selectedServiceLabel}</h2>
                  </div>
                  {selectedServiceConfig && (
                    <div className="hidden md:flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-600/5 border border-blue-100 text-blue-700">
                      <IconRenderer name={selectedServiceConfig.icon} size={24} />
                      <span className="font-black text-sm">{formatCurrency(selectedServiceConfig.basePrice)}+</span>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  {!new URLSearchParams(routeLocation.search).get('service') && (
                    <div className="space-y-4 pb-6 border-b border-slate-100">
                      <div>
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Choose a service</Label>
                        <p className="text-xs text-slate-500 mt-1">Please select the service type that describes your breakdown.</p>
                      </div>

                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                          placeholder="Search battery, towing, flat tire..."
                          className="h-12 rounded-2xl pl-12 bg-slate-50 border-slate-200 font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                        {filteredServices.map((service) => {
                          const isSelected = selectedService?.id === service.id;
                          return (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedService(null);
                                  form.setValue('serviceType', '', { shouldValidate: true, shouldDirty: true });
                                  setServiceLabelOverride('');
                                } else {
                                  setSelectedService(service);
                                  form.setValue('serviceType', service.id, { shouldValidate: true, shouldDirty: true });
                                  setServiceLabelOverride(service.name);
                                }
                              }}
                              onDoubleClick={() => {
                                setSelectedService(null);
                                form.setValue('serviceType', '', { shouldValidate: true, shouldDirty: true });
                                setServiceLabelOverride('');
                              }}
                              className={`text-left rounded-2xl border p-4 transition-all flex items-center gap-3 ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                                  : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-200'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/15 text-white' : 'bg-white text-blue-600 shadow-sm'}`}>
                                <IconRenderer name={service.icon} size={20} />
                              </div>
                              <div className="min-w-0">
                                <p className={`font-black text-sm leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>{service.name}</p>
                                <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>{service.description}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {!isOnline && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                      <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                      No Internet Connection. Please check your network and avoid multiple attempts.
                    </div>
                  )}
                  {isOnline && isConnectionSlow && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                      <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
                      Weak Connection Detected. Requests may take longer. Please do not tap buttons multiple times.
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Describe the problem</Label>
                      <Textarea {...form.register('description')} placeholder="What happened, what you’ve already tried, and anything the provider should know." className={`rounded-2xl min-h-[140px] bg-slate-50 border-slate-200 ${form.formState.errors.description ? 'border-red-500 bg-red-50' : ''}`} />
                      {form.formState.errors.description && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.description.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Full name</Label>
                      <Input {...form.register('fullName')} placeholder="Alex Johnson" className={`h-12 rounded-2xl font-semibold ${form.formState.errors.fullName ? 'border-red-500 bg-red-50' : 'bg-slate-50 border-slate-200'}`} />
                      {form.formState.errors.fullName && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.fullName.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Email</Label>
                      <Input {...form.register('email')} type="email" placeholder="you@example.com" className={`h-12 rounded-2xl font-semibold ${form.formState.errors.email ? 'border-red-500 bg-red-50' : 'bg-slate-50 border-slate-200'}`} />
                      {form.formState.errors.email && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.email.message}</p>}
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact number</Label>
                      <PhoneInputGroup
                        countryCode={form.watch('countryCode')}
                        phone={form.watch('phone')}
                        onCountryCodeChange={(v) => form.setValue('countryCode', v, { shouldValidate: true, shouldDirty: true })}
                        onPhoneChange={(v) => form.setValue('phone', v, { shouldValidate: true, shouldDirty: true })}
                        error={!!form.formState.errors.phone}
                      />
                      {form.formState.errors.phone && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.phone.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle type</Label>
                      <Select value={form.watch('vehicleType')} onValueChange={(value) => form.setValue('vehicleType', value, { shouldValidate: true, shouldDirty: true })}>
                        <SelectTrigger className={`h-12 rounded-2xl font-semibold bg-slate-50 border-slate-200 text-slate-900 shadow-sm focus:ring-slate-200 ${form.formState.errors.vehicleType ? 'border-red-500 bg-red-50 text-red-700' : ''}`}>
                          <SelectValue placeholder="Select a vehicle type" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-100 bg-white">
                          {VEHICLE_TYPES.map((type) => (
                            <SelectItem key={type} value={type} className="data-[state=checked]:bg-slate-300 data-[state=checked]:text-slate-700 data-[highlighted]:bg-slate-300/30 data-[highlighted]:text-slate-600">{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle brand</Label>
                      <Input {...form.register('vehicleBrand')} placeholder="Toyota" className={`h-12 rounded-2xl font-semibold ${form.formState.errors.vehicleBrand ? 'border-red-500 bg-red-50' : 'bg-slate-50 border-slate-200'}`} />
                      {form.formState.errors.vehicleBrand && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.vehicleBrand.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle model</Label>
                      <Input {...form.register('vehicleModel')} placeholder="Corolla" className={`h-12 rounded-2xl font-semibold ${form.formState.errors.vehicleModel ? 'border-red-500 bg-red-50' : 'bg-slate-50 border-slate-200'}`} />
                      {form.formState.errors.vehicleModel && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.vehicleModel.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle number (option)</Label>
                      <Input {...form.register('vehicleNumber')} placeholder="ABC-1234" className={`h-12 rounded-2xl font-semibold ${form.formState.errors.vehicleNumber ? 'border-red-500 bg-red-50' : 'bg-slate-50 border-slate-200'}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="rounded-[1.75rem] border border-slate-100 overflow-hidden bg-white">
                      <LocationPicker onLocationSelect={setSelectedLocation} initialLocation={selectedLocation ?? undefined} />
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[1.75rem] bg-slate-50 border border-slate-100 p-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emergency request</p>
                          <p className="text-sm text-slate-500 mt-1">Highlight if the situation is urgent.</p>
                        </div>
                        <Switch checked={form.watch('isEmergency')} onCheckedChange={(checked) => form.setValue('isEmergency', checked, { shouldValidate: true, shouldDirty: true })} />
                      </div>

                      <div className="rounded-[1.75rem] bg-slate-950 text-white p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-400/10 rounded-full -mr-12 -mt-12 blur-2xl" />
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300 mb-2">Current location</p>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {selectedLocation ? selectedLocation.address : 'Use GPS or tap the map to set your location.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="glass-card rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-white/60"
              >
                <div className="mb-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-green-600 mb-2">Review and confirm</p>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Please check the details before we send the request.</h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="rounded-[1.75rem] bg-slate-950 text-white p-7 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-60" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-cyan-300">
                          {selectedServiceConfig ? <IconRenderer name={selectedServiceConfig.icon} size={28} /> : <Sparkles className="w-7 h-7" />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service</p>
                          <h3 className="text-2xl font-black tracking-tight">{selectedServiceLabel}</h3>
                        </div>
                      </div>

                      <div className="space-y-4 text-sm text-slate-300">
                        <p><span className="text-slate-400 font-black uppercase tracking-widest text-[10px] mr-2">Estimated cost</span>{selectedServiceConfig ? formatCurrency(selectedServiceConfig.basePrice) : 'N/A'}+</p>
                        <p><span className="text-slate-400 font-black uppercase tracking-widest text-[10px] mr-2">Estimated arrival</span>{selectedServiceConfig ? estimateArrival(selectedServiceConfig) : 'Estimated arrival'}</p>
                        <p><span className="text-slate-400 font-black uppercase tracking-widest text-[10px] mr-2">Confirmation number</span>{confirmationNumber}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] bg-slate-50 border border-slate-100 p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Customer</p>
                      <p className="font-bold text-slate-900">{form.getValues('fullName') || 'Not provided'}</p>
                      <p className="text-sm text-slate-500 mt-1">{form.getValues('phone') ? `${form.getValues('countryCode')}${form.getValues('phone')}` : 'No phone number yet'}</p>
                    </div>
                    <div className="rounded-[1.5rem] bg-slate-50 border border-slate-100 p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vehicle</p>
                      <p className="font-bold text-slate-900">{form.getValues('vehicleBrand')} {form.getValues('vehicleModel')}</p>
                      <p className="text-sm text-slate-500 mt-1">{form.getValues('vehicleType')} {form.getValues('vehicleNumber') ? `• ${form.getValues('vehicleNumber')}` : ''}</p>
                    </div>
                    <div className="rounded-[1.5rem] bg-slate-50 border border-slate-100 p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Location</p>
                      <p className="text-sm font-medium text-slate-700">{selectedLocation?.address}</p>
                    </div>
                    <div className="rounded-[1.5rem] bg-slate-50 border border-slate-100 p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Problem summary</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{form.getValues('description')}</p>
                    </div>
                    {form.getValues('isEmergency') && (
                      <div className="rounded-[1.5rem] bg-amber-50 border border-amber-200 p-5 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <p className="text-sm text-amber-800 leading-relaxed">This has been marked as urgent. We’ll prioritize the request where possible.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <aside className="space-y-10 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900">Booking summary</h3>
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3"><User className="w-4 h-4 mt-0.5 text-slate-400" /><span>{form.watch('fullName') || 'Your name'}</span></div>
                <div className="flex items-start gap-3"><Car className="w-4 h-4 mt-0.5 text-slate-400" /><span>{form.watch('vehicleBrand') || 'Vehicle brand'} {form.watch('vehicleModel') || ''}</span></div>
                <div className="flex items-start gap-3"><MapPin className="w-4 h-4 mt-0.5 text-slate-400" /><span className="line-clamp-2">{selectedLocation?.address || 'Your current location'}</span></div>
                <div className="flex items-start gap-3"><Clock3 className="w-4 h-4 mt-0.5 text-slate-400" /><span>{selectedServiceConfig ? estimateArrival(selectedServiceConfig) : 'Estimated arrival'}</span></div>
                <div className="flex items-start gap-3"><Phone className="w-4 h-4 mt-0.5 text-slate-400" /><span>{form.watch('countryCode')}{form.watch('phone')}</span></div>
              </div>
            </div>


            <div className="flex flex-row gap-3 ">
              <Button type="button" variant="outline" onClick={() => screen === 'confirm' ? setScreen('form') : navigate(-1)} className="flex-1 h-12 rounded-2xl font-black uppercase text-[10px] md:tracking-widest">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              {screen === 'form' ? (
                <Button type="button" onClick={handleContinue} disabled={!isOnline} className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] md:tracking-widest disabled:opacity-50">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="button" disabled={isLoading || !isOnline} onClick={handleSubmit} className="flex-1 h-12 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] md:tracking-widest disabled:opacity-50">
                  {isLoading ? 'Sending...' : 'Confirm'} <Check className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}



















