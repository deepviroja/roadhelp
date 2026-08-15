import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Search,
  ShieldCheck,
  User,
  Car,
  Phone,
  AlertTriangle,
  FileText,
  Clock,
  Sparkles,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useFormBuilder } from '@/hooks/useFormBuilder';
import { DynamicFormFields } from '@/components/shared/DynamicFormFields';
import { useSystemStore } from '@/stores/systemStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PhoneInputGroup } from '@/components/ui/phone-input';
import { LocationPicker } from '@/components/map/LocationPicker';
import { IconRenderer } from '@/components/shared/IconRenderer';
import { useServices } from '@/hooks/useServices';
import { useVehicleTypes } from '@/hooks/useVehicleTypes';
import { useServiceRequest } from '@/hooks/useServiceRequest';
import { formatCurrency, getServiceLabel } from '@/lib/utils';
import { GeoLocation, ServiceType, ServiceTypeConfig } from '@/types';
import { guestHelpSchema, GuestHelpFormData } from '@/lib/validators';
import { getServiceBackgroundImage } from '@/lib/serviceImages';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/config/firebase';

type WizardStep = 1 | 2 | 3 | 4;

export default function NewRequest() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { services } = useServices();
  const { activeVehicleTypes } = useVehicleTypes();
  const { createRequest, isLoading } = useServiceRequest();
  const { profile } = useAuth();

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [selectedService, setSelectedService] = useState<ServiceTypeConfig | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceLabelOverride, setServiceLabelOverride] = useState('');
  const [isChangingService, setIsChangingService] = useState(false);
  const [directedProvider, setDirectedProvider] = useState<any>(null);

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  // Popstate listener to prevent browser back button
  useEffect(() => {
    if (currentStep <= 1) return;

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setPendingPath(null);
      setShowExitDialog(true);
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentStep]);

  // Click interceptor to prevent internal link clicks
  useEffect(() => {
    if (currentStep <= 1) return;

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && !href.startsWith('tel:') && !href.startsWith('mailto:') && !href.startsWith('#')) {
          e.preventDefault();
          setPendingPath(href);
          setShowExitDialog(true);
        }
      }
    };

    document.addEventListener('click', handleLinkClick, true);
    return () => document.removeEventListener('click', handleLinkClick, true);
  }, [currentStep]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentStep > 1) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentStep]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const activeServices = useMemo(() => {
    let list = services.filter((s) => !!s.isActive);
    if (directedProvider?.serviceTypes && Array.isArray(directedProvider.serviceTypes) && directedProvider.serviceTypes.length > 0) {
      list = list.filter((s) => directedProvider.serviceTypes.includes(s.id));
    }
    return list;
  }, [services, directedProvider]);

  const filteredServices = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();
    if (!query) return activeServices;
    return activeServices.filter((service) =>
      [service.name, getServiceLabel(service.id), service.description].join(' ').toLowerCase().includes(query)
    );
  }, [activeServices, serviceSearch]);

  const resolveServiceConfig = (serviceId?: string) =>
    serviceId ? (activeServices.find((service) => service.id === serviceId) ?? null) : null;

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

  const { config: serviceRequestFormConfig } = useFormBuilder('getHelp');

  const watchedServiceType = form.watch('serviceType');
  const resolvedServiceType = watchedServiceType || selectedService?.id || '';
  const selectedServiceConfig =
    selectedService
      ? (activeServices.find((service) => service.id === (resolvedServiceType || selectedService.id)) ?? null)
      : null;

  const selectedServiceLabel =
    selectedServiceConfig
      ? (selectedServiceConfig.id === 'otherService' ? (serviceLabelOverride || 'Other Service') : getServiceLabel(selectedServiceConfig.id))
      : serviceLabelOverride || '';

  // Pre-populate customer details from auth profile
  useEffect(() => {
    if (profile) {
      form.setValue('fullName', profile.fullName || '');
      form.setValue('email', profile.email || '');

      const rawPhone = profile.phone || '';
      if (rawPhone.startsWith('+')) {
        // Find if +91 or +1 or other country codes
        const match = rawPhone.match(/^(\+\d{1,4})(\d+)$/);
        if (match) {
          form.setValue('countryCode', match[1]);
          form.setValue('phone', match[2]);
        } else {
          form.setValue('phone', rawPhone);
        }
      } else {
        form.setValue('phone', rawPhone);
      }
    }
  }, [profile, form]);

  // Handle URL query parameter preselection
  useEffect(() => {
    const params = new URLSearchParams(routeLocation.search);
    const serviceParam = params.get('service');
    const problemParam = params.get('problem');
    const providerIdParam = params.get('providerId');

    if (problemParam) {
      form.setValue('description', problemParam, { shouldValidate: true, shouldDirty: true });
    }

    if (providerIdParam) {
      getDoc(doc(db, 'users', providerIdParam))
        .then((snap) => {
          if (snap.exists()) {
            setDirectedProvider({ uid: snap.id, ...snap.data() });
          }
        })
        .catch((err) => console.warn('Could not load directed provider details:', err));
    }

    const applyServiceSelection = (serviceId?: string, label?: string) => {
      if (!serviceId) {
        setSelectedService(null);
        setServiceLabelOverride('');
        form.setValue('serviceType', '' as any);
        setIsChangingService(true);
        return;
      }
      const serviceConfig = resolveServiceConfig(serviceId);
      if (serviceConfig) {
        setSelectedService(serviceConfig);
        setServiceLabelOverride(label || getServiceLabel(serviceConfig.id as ServiceType));
        form.setValue('serviceType', serviceConfig.id as ServiceType, { shouldValidate: true, shouldDirty: true });
        setIsChangingService(false);
      } else {
        setSelectedService(null);
        setServiceLabelOverride('');
        form.setValue('serviceType', '' as any);
        setIsChangingService(true);
      }
    };

    if (serviceParam) {
      applyServiceSelection(serviceParam);
    } else if (!selectedService) {
      setServiceLabelOverride('');
      form.setValue('serviceType', '' as any);
      setIsChangingService(true);
    }
  }, [services, routeLocation.search, form]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToFirstError = () => {
    setTimeout(() => {
      const firstError = document.querySelector('.border-red-500, [aria-invalid="true"]');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (firstError as HTMLElement).focus?.();
      }
    }, 100);
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const isServiceValid = !!resolvedServiceType;
      const vehicleTypeVal = form.getValues('vehicleType');
      const isVehicleTypeValid = !!vehicleTypeVal;

      const brandValid = await form.trigger('vehicleBrand');
      const descValid = await form.trigger('description');

      if (!isServiceValid) {
        toast.error('Select Service Type');
      }

      if (!isVehicleTypeValid) {
        toast.error('Select Vehicle Type');
      }

      if (!isServiceValid || !isVehicleTypeValid || !brandValid || !descValid) {
        scrollToFirstError();
        return;
      }

      setCurrentStep(2);
      scrollToTop();
    } else if (currentStep === 2) {
      const nameValid = await form.trigger('fullName');
      const phoneValid = await form.trigger('phone');
      const emailValid = await form.trigger('email');

      if (!nameValid || !phoneValid || !emailValid) {
        scrollToFirstError();
        return;
      }

      setCurrentStep(3);
      scrollToTop();
    } else if (currentStep === 3) {
      if (!selectedLocation) {
        toast.error('Please select your breakdown location on the map *');
        return;
      }
      setCurrentStep(4);
      scrollToTop();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
      scrollToTop();
    } else {
      navigate(-1);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedServiceConfig || !selectedLocation || !profile) return;

    try {
      const values = form.getValues();

      const requestId = await createRequest({
        customerId: profile.uid,
        customerName: values.fullName,
        customerEmail: values.email || profile.email || '',
        customerPhone: `${values.countryCode}${values.phone}`,
        phone: values.phone,
        countryCode: values.countryCode,
        isGuest: false,
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
          make: values.vehicleBrand || values.vehicleType,
          model: values.vehicleModel || 'Standard',
          plateNumber: values.vehicleNumber || 'Not specified',
        },
        customerLocation: selectedLocation,
        estimatedPrice: selectedServiceConfig.basePrice,
        // Pre-assign provider if directed request
        ...(directedProvider ? {
          providerId: directedProvider.uid,
          providerName: directedProvider.fullName,
          providerPhone: directedProvider.phone || '',
          providerRating: directedProvider.rating || 0.0,
          providerVehicleNumber: directedProvider.vehicleNumber || '',
        } : {}),
      });

      toast.success(
        directedProvider
          ? `Request sent to ${directedProvider.fullName}! Awaiting their response.`
          : 'Your assistance request has been submitted!'
      );
      navigate(`/customer/track/${requestId}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request. Please try again.');
    }
  };

  const { heroBgImage } = useSystemStore();
  const currentBgImage = selectedServiceConfig?.bgImage || getServiceBackgroundImage(resolvedServiceType) || heroBgImage || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1200&auto=format&fit=crop';

  return (
    <CustomerLayout>
      {/* Sticky Top Scroll Progress Bar & Header Bar */}
      <div className="fixed top-0 w-full z-40 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/50 -mx-4 sm:-mx-6 lg:-mx-8">
        <div
          className="h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-green-400 transition-all duration-500 shadow-sm"
          style={{ width: `${(currentStep / 4) * 100}%` }}
        />
        <div className="flex flex-row justify-between items-center px-4 md:px-10 w-full h-11 text-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="h-8 my-1 px-4 rounded-lg cursor-pointer text-slate-800 hover:text-blue-600 font-black text-xs uppercase tracking-widest gap-2 backdrop-blur-md shadow-sm transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600" />
            <span>{currentStep === 1 ? 'Back' : 'Back'}</span>
          </Button>
          <p className="text-xs sm:text-sm font-black text-slate-800 tracking-tight truncate">
            {currentStep === 1
              ? 'Get Help in 4 Easy Steps'
              : currentStep === 2
                ? 'Confirm Your Contact Information'
                : currentStep === 3
                  ? 'Select Your Breakdown Location'
                  : 'Review Your Request'}
          </p>
        </div>
      </div>

      <div className="flex-1 bg-[#F5F5F6] min-h-screen overflow-x-hidden relative font-sans pt-6 pb-16">
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/85 backdrop-blur-md"
            >
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6" />
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Submitting Request</h2>
              <p className="text-slate-500 mt-2 font-medium">Notifying nearby verified service providers...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Header Banner with Dynamic Background Image */}
        <div className="relative bg-slate-900 text-white overflow-hidden py-10 md:py-14 border-b border-slate-800 rounded-3xl mt-4 mx-4 shadow-lg">
          <div className="absolute inset-0 z-0">
            <img
              src={currentBgImage}
              alt=""
              className="w-full h-full object-cover opacity-30 transition-all duration-700 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/90 to-slate-950" />
          </div>

          <div className="container-app relative z-10">
            {directedProvider && (
              <div className="bg-blue-600/30 border border-blue-400/40 rounded-2xl p-4 flex items-center gap-3 mb-6 w-fit">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-black uppercase text-blue-300">Direct Invite Request to {directedProvider.fullName}</span>
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              {useSystemStore.getState().pageContent?.getHelpHeadline || 'Get Help in 4 Easy Steps'}
            </h1>
            <p className="text-slate-300 font-medium mt-2 text-sm sm:text-base max-w-xl">
              {useSystemStore.getState().pageContent?.getHelpDescription || 'Complete your breakdown request details to connect with nearby providers.'}
            </p>

            {/* Step Progress Bar */}
            <div className="mt-8 grid grid-cols-4 gap-2 sm:gap-4 max-w-full">
              {[
                { num: 1, label: 'Service' },
                { num: 2, label: 'Contact Info' },
                { num: 3, label: 'Location' },
                { num: 4, label: 'Confirmation' },
              ].map((step) => {
                const isActive = currentStep === step.num;
                const isDone = currentStep > step.num;
                return (
                  <div key={step.num} className="flex flex-col gap-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${isActive ? 'bg-cyan-400 shadow-md shadow-cyan-400/30' : isDone ? 'bg-cyan-400/80' : 'bg-white/20'
                        }`}
                    />
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center ${isActive
                          ? 'bg-cyan-400 text-slate-950'
                          : isDone
                            ? 'bg-cyan-900/60 text-cyan-300'
                            : 'bg-white/10 text-slate-400'
                          }`}
                      >
                        {isDone ? <Check className="w-3 h-3" /> : step.num}
                      </span>
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider hidden sm:inline ${isActive ? 'text-white font-black' : 'text-slate-400'
                          }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="container-app py-8 md:py-12 pb-24">
          {!isOnline && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-wider mb-6">
              <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
              No Internet Connection. Please check network connection before proceeding.
            </div>
          )}

          {/* STEP CONTENT WIZARD */}
          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-xl shadow-slate-900/5 p-6 sm:p-10 relative">
            <AnimatePresence mode="wait">
              {/* STEP 1: SERVICE & VEHICLE TYPE */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-950 flex items-center gap-3">
                      <Sparkles className="w-6 h-6 text-blue-600" />
                      Step 1: Choose Service & Vehicle
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Confirm your service category and vehicle details.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Service & Vehicle Selection */}
                    <div className="lg:col-span-6 space-y-6">
                      <AnimatePresence mode="wait">
                        {selectedServiceConfig && !isChangingService ? (
                          <motion.div
                            key="selected-card"
                            initial={{ opacity: 0, scale: 0.98, y: -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: -8 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-900 text-white p-6 sm:p-8"
                          >
                            <div className="absolute inset-0 z-0">
                              <img
                                src={currentBgImage}
                                alt=""
                                className="w-full h-full object-cover opacity-35"
                              />
                              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent" />
                            </div>

                            <div className="relative z-10 flex flex-col items-start justify-between gap-6">
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white px-3 py-1 rounded-full">
                                    Selected Service
                                  </span>
                                  <span className="text-xs font-black text-cyan-300 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                                    Base Price: {formatCurrency(selectedServiceConfig.basePrice)}
                                  </span>
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                                    <IconRenderer name={selectedServiceConfig.icon} size={22} />
                                  </div>
                                  {selectedServiceLabel}
                                </h3>
                                <p className="text-slate-300 text-xs font-medium leading-relaxed">
                                  {selectedServiceConfig.description}
                                </p>
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsChangingService(true)}
                                className="h-10 px-4 rounded-2xl border-white/30 text-white hover:bg-white/20 bg-white/10 backdrop-blur-md font-black text-xs uppercase tracking-widest shrink-0 gap-2 cursor-pointer active:scale-95 transition-all"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                CHANGE
                              </Button>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="service-picker"
                            initial={{ opacity: 0, scale: 0.98, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 8 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="space-y-4 border border-blue-100 rounded-3xl p-5 bg-blue-50/40 shadow-md"
                          >
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select Service Type *</Label>
                              {selectedServiceConfig && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIsChangingService(false)}
                                  className="text-xs font-black text-blue-600 hover:bg-blue-100/50 cursor-pointer"
                                >
                                  Close Picker ({selectedServiceLabel})
                                </Button>
                              )}
                            </div>

                            <div className="relative">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input
                                value={serviceSearch}
                                onChange={(e) => setServiceSearch(e.target.value)}
                                placeholder="Search battery, towing, flat tire..."
                                className="h-11 rounded-2xl pl-12 bg-white border-slate-200 font-semibold"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
                              {filteredServices.map((service) => {
                                const isSelected = selectedService?.id === service.id;
                                return (
                                  <button
                                    key={service.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedService(service);
                                      form.setValue('serviceType', service.id, { shouldValidate: true, shouldDirty: true });
                                      setServiceLabelOverride(service.name);
                                      setIsChangingService(false);
                                    }}
                                    className={`text-left rounded-2xl border p-3.5 transition-all flex items-center gap-3 cursor-pointer ${isSelected
                                      ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-[1.01]'
                                      : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/20'
                                      }`}
                                  >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
                                      <IconRenderer name={service.icon} size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between">
                                        <p className={`font-black text-xs leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>{service.name}</p>
                                        <span className={`text-[10px] font-bold ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                                          {formatCurrency(service.basePrice)}
                                        </span>
                                      </div>
                                      <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>{service.description}</p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Vehicle Types Grid */}
                      <div className="space-y-3 pt-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Vehicle Type *</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {activeVehicleTypes.map((v) => {
                            const isSelected = form.watch('vehicleType') === v.name;
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => form.setValue('vehicleType', v.name, { shouldValidate: true, shouldDirty: true })}
                                className={`p-3 rounded-2xl border text-center font-black text-xs transition-all flex items-center justify-center ${isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                  : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-blue-300 hover:bg-white'
                                  }`}
                              >
                                <span>{v.name}</span>
                              </button>
                            );
                          })}
                        </div>
                        {form.formState.errors.vehicleType && (
                          <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{form.formState.errors.vehicleType.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Make/Model, Description, Emergency */}
                    <div className="lg:col-span-6 space-y-5">
                      {profile?.vehicles && profile.vehicles.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Use Saved Vehicle</Label>
                          <select
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              if (!selectedId) return;
                              const v = profile.vehicles?.find((x) => x.id === selectedId);
                              if (v) {
                                form.setValue('vehicleBrand', v.make, { shouldValidate: true, shouldDirty: true });
                                form.setValue('vehicleModel', v.model, { shouldValidate: true, shouldDirty: true });
                                form.setValue('vehicleNumber', v.plateNumber || '', { shouldValidate: true, shouldDirty: true });
                                // Auto-select vehicle type if saved
                                if (v.type) {
                                  form.setValue('vehicleType', v.type, { shouldValidate: true, shouldDirty: true });
                                }
                              }
                            }}
                            className="w-full h-12 bg-blue-50 border border-blue-200 rounded-2xl px-4 font-semibold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          >
                            <option value="">-- Select a saved vehicle to auto-fill --</option>
                            {profile.vehicles.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.make} {v.model} ({v.plateNumber}){v.type ? ` — ${v.type}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle Make / Model *</Label>
                        <Input
                          {...form.register('vehicleBrand')}
                          placeholder="e.g. Toyota Corolla / Honda Civic"
                          className={`h-12 rounded-2xl font-semibold ${form.formState.errors.vehicleBrand ? 'border-red-500 bg-red-50' : 'bg-slate-50 border-slate-200'
                            }`}
                        />
                        {form.formState.errors.vehicleBrand && (
                          <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{form.formState.errors.vehicleBrand.message}</p>
                        )}
                      </div>

                      {/* Optional vehicle plate number input */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle License Plate (Optional)</Label>
                        <Input
                          {...form.register('vehicleNumber')}
                          placeholder="e.g. ABC-1234"
                          className="h-12 rounded-2xl font-semibold bg-slate-50 border-slate-200"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Problem Description *</Label>
                        <Textarea
                          {...form.register('description')}
                          placeholder="Describe what happened, noise heard, engine state..."
                          className={`rounded-2xl min-h-[120px] font-semibold ${form.formState.errors.description ? 'border-red-500 bg-red-50' : 'bg-slate-50 border-slate-200'
                            }`}
                        />
                        {form.formState.errors.description && (
                          <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{form.formState.errors.description.message}</p>
                        )}
                      </div>

                      <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-black text-amber-900">Mark as Emergency Request?</p>
                          <p className="text-[11px] text-amber-700 mt-0.5">Prioritizes dispatch if situation involves safety hazards.</p>
                        </div>
                        <Switch
                          checked={form.watch('isEmergency')}
                          onCheckedChange={(c) => form.setValue('isEmergency', c, { shouldValidate: true, shouldDirty: true })}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: CONTACT DETAILS */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-950 flex items-center gap-3">
                      <User className="w-6 h-6 text-blue-600" />
                      Step 2: Customer Contact Information
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Review contact details pulled from your profile settings.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-6 space-y-5">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name *</Label>
                        <Input
                          {...form.register('fullName')}
                          placeholder="Your Name"
                          className={`h-12 rounded-2xl font-semibold ${form.formState.errors.fullName ? 'border-red-500 bg-red-50' : 'bg-slate-50 border-slate-200'
                            }`}
                        />
                        {form.formState.errors.fullName && (
                          <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{form.formState.errors.fullName.message}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mobile Phone Number *</Label>
                        <PhoneInputGroup
                          countryCode={form.watch('countryCode')}
                          phone={form.watch('phone')}
                          onCountryCodeChange={(v) => form.setValue('countryCode', v, { shouldValidate: true, shouldDirty: true })}
                          onPhoneChange={(v) => form.setValue('phone', v, { shouldValidate: true, shouldDirty: true })}
                          error={!!form.formState.errors.phone}
                        />
                        {form.formState.errors.phone && (
                          <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{form.formState.errors.phone.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-6 space-y-5">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address *</Label>
                        <Input
                          {...form.register('email')}
                          type="email"
                          placeholder="you@example.com"
                          className={`h-12 rounded-2xl font-semibold ${form.formState.errors.email ? 'border-red-500 bg-red-50' : 'bg-slate-50 border-slate-200'
                            }`}
                        />
                        {form.formState.errors.email && (
                          <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{form.formState.errors.email.message}</p>
                        )}
                      </div>

                      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 text-xs text-blue-800 leading-relaxed space-y-2">
                        <p className="font-black text-sm text-blue-900 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                          Authenticated Session Profile
                        </p>
                        <p className="text-slate-600 font-medium">Logged in securely. Dispatch updates and provider location maps will appear directly in your customer dashboard.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: MAP LOCATION */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-950 flex items-center gap-3">
                      <MapPin className="w-6 h-6 text-blue-600" />
                      Step 3: Breakdown Location
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Use GPS or click/drag the marker on the map to pinpoint your location.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Map Column */}
                    <div className="lg:col-span-7 space-y-4">
                      <LocationPicker onLocationSelect={setSelectedLocation} initialLocation={selectedLocation ?? undefined} />
                    </div>

                    {/* Address Info & Landmark Column */}
                    <div className="lg:col-span-5 space-y-6">
                      <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-2 shadow-lg">
                        <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Selected Address</p>
                        <p className="text-sm font-medium leading-relaxed">
                          {selectedLocation ? selectedLocation.address : 'Please tap the map or click GPS button.'}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Additional Instructions / Landmarks (Optional)</Label>
                        <Textarea
                          {...form.register('notes')}
                          placeholder="e.g. Parked opposite the red gas station..."
                          className="rounded-2xl min-h-[120px] bg-slate-50 border-slate-200 font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: REVIEW & CONFIRM */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-950 flex items-center gap-3">
                      <ShieldCheck className="w-6 h-6 text-green-600" />
                      Step 4: Review & Confirm Request
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Check all details below before broadcasting to service providers.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-6 space-y-4">
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Service Type
                        </p>
                        <p className="text-base font-black text-slate-900">{selectedServiceLabel}</p>
                        {selectedServiceConfig && (
                          <p className="text-xs font-bold text-blue-600">Base Price: {formatCurrency(selectedServiceConfig.basePrice)}</p>
                        )}
                      </div>

                      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-blue-600" /> Vehicle Info
                        </p>
                        <p className="text-base font-black text-slate-900">
                          {form.getValues('vehicleType') || 'Car'} {form.getValues('vehicleBrand') ? `• ${form.getValues('vehicleBrand')}` : ''}
                        </p>
                        {form.getValues('vehicleNumber') && (
                          <p className="text-xs text-slate-600 font-mono">Plate: {form.getValues('vehicleNumber')}</p>
                        )}
                      </div>

                      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-600" /> Dispatch Contact
                        </p>
                        <p className="text-base font-black text-slate-900">{form.getValues('fullName')}</p>
                        <p className="text-xs text-slate-600">{form.getValues('countryCode')}{form.getValues('phone')}</p>
                      </div>
                    </div>

                    <div className="lg:col-span-6 space-y-4">
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" /> Location
                        </p>
                        <p className="text-xs font-medium text-slate-800 line-clamp-2">{selectedLocation?.address}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-600" /> Problem Description
                        </p>
                        <p className="text-xs text-slate-700 leading-relaxed">{form.getValues('description')}</p>
                      </div>

                      {form.getValues('isEmergency') && (
                        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800 flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                          High-priority emergency alert attached to this breakdown request.
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* WIZARD ACTION BUTTONS */}
            <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="h-12 px-6 rounded-xl font-black uppercase text-xs tracking-wider border-slate-200 hover:bg-slate-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {currentStep === 1 ? 'Back' : 'Back'}
              </Button>
              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!isOnline}
                  className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-600/25"
                >
                  Next Step <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmitRequest}
                  disabled={isLoading || !isOnline}
                  className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-black text-white font-black uppercase text-xs tracking-widest shadow-xl"
                >
                  {isLoading ? 'Submitting...' : 'Submit Request Now'} <Check className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        title="Leave Request Setup?"
        description="Your progress will be lost. Are you sure you want to discard this request?"
        confirmText="Leave and Discard"
        cancelText="Continue Request Setup"
        onConfirm={() => {
          setShowExitDialog(false);
          navigate(pendingPath || '/');
        }}
        isDestructive
      />
    </CustomerLayout>
  );
}

