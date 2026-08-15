import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, ShieldCheck, Truck, UserPlus, LocateFixed, ShieldAlert, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { customerSignupSchema, providerSignupSchema, CustomerSignupFormData, ProviderSignupFormData } from '@/lib/validators';
import { useAuth } from '@/hooks/useAuth';
import { useServices } from '@/hooks/useServices';
import { PhoneInputGroup } from '@/components/ui/phone-input';
import { useGeolocation } from '@/hooks/useGeolocation';
import { LocationPicker } from '@/components/map/LocationPicker';
import { reverseGeocodeAddress } from '@/lib/mapService';
import { useFormBuilder } from '@/hooks/useFormBuilder';
import { DynamicFormFields } from '@/components/shared/DynamicFormFields';

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'customer' | 'provider'>('customer');
  const [showProviderMapPicker, setShowProviderMapPicker] = useState(false);
  const [providerAddressName, setProviderAddressName] = useState('');
  const navigate = useNavigate();


  const { services, isLoading: isServicesLoading } = useServices();
  const {
    lat,
    lng,
    loading: geoLoading,
    error: geoError,
    getCurrentLocation,
  } = useGeolocation();

  const { config: customerFormConfig } = useFormBuilder('customerSignup');
  const { config: providerFormConfig } = useFormBuilder('providerSignup');

  const computedCustomerFields = useMemo(() => {
    if (!customerFormConfig || !customerFormConfig.fields) return [];
    const list = [...customerFormConfig.fields];
    
    const hasEmail = list.some((f) => f.id === 'email');
    if (!hasEmail) {
      const nameIdx = list.findIndex((f) => f.id === 'fullName');
      const insertIdx = nameIdx !== -1 ? nameIdx + 1 : 1;
      list.splice(insertIdx, 0, {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        placeholder: 'you@example.com',
        required: true,
        options: [],
      });
    }

    const hasPassword = list.some((f) => f.id === 'password');
    if (!hasPassword) {
      list.push({
        id: 'password',
        type: 'text',
        label: 'Password',
        placeholder: '••••••••',
        required: true,
        options: [],
      });
    }

    const hasConfirmPassword = list.some((f) => f.id === 'confirmPassword');
    if (!hasConfirmPassword) {
      list.push({
        id: 'confirmPassword',
        type: 'text',
        label: 'Confirm Password',
        placeholder: '••••••••',
        required: true,
        options: [],
      });
    }
    return list;
  }, [customerFormConfig]);

  const computedProviderFields = useMemo(() => {
    if (!providerFormConfig || !providerFormConfig.fields) return [];
    const list = [...providerFormConfig.fields];
    
    const hasEmail = list.some((f) => f.id === 'email');
    if (!hasEmail) {
      const nameIdx = list.findIndex((f) => f.id === 'fullName');
      const insertIdx = nameIdx !== -1 ? nameIdx + 1 : 1;
      list.splice(insertIdx, 0, {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        placeholder: 'you@company.com',
        required: true,
        options: [],
      });
    }

    const hasPassword = list.some((f) => f.id === 'password');
    if (!hasPassword) {
      list.push({
        id: 'password',
        type: 'text',
        label: 'Password',
        placeholder: '••••••••',
        required: true,
        options: [],
      });
    }

    const hasConfirmPassword = list.some((f) => f.id === 'confirmPassword');
    if (!hasConfirmPassword) {
      list.push({
        id: 'confirmPassword',
        type: 'text',
        label: 'Confirm Password',
        placeholder: '••••••••',
        required: true,
        options: [],
      });
    }
    return list;
  }, [providerFormConfig]);

  // OTP Verification States
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [pendingSignupData, setPendingSignupData] = useState<any>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setIsRequestingOtp(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/signup-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, fullName: pendingSignupData?.fullName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Resend failed.');
      toast.success('A new verification code has been sent to your email.');
      setResendCountdown(30);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend OTP.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const customerForm = useForm<CustomerSignupFormData>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    resolver: zodResolver(customerSignupSchema),
    defaultValues: { role: 'customer', countryCode: '+91', phone: '' },
  });

  const providerForm = useForm<ProviderSignupFormData>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    resolver: zodResolver(providerSignupSchema),
    defaultValues: {
      role: 'provider',
      serviceTypes: [],
      countryCode: '+91',
      phone: '',
      businessHours: 'Mon - Sat, 9:00 AM - 8:00 PM',
      serviceRadiusKm: '' as any,
      vehicleNumber: '',
    },
  });

  useEffect(() => {
    if (lat !== null) {
      providerForm.setValue('latitude', lat, { shouldValidate: true, shouldDirty: true });
    }
  }, [lat, providerForm]);

  useEffect(() => {
    if (lng !== null) {
      providerForm.setValue('longitude', lng, { shouldValidate: true, shouldDirty: true });
    }
  }, [lng, providerForm]);

  const watchedServiceTypes = providerForm.watch('serviceTypes') || [];
  const activeServices = useMemo(() => services.filter((s) => s.isActive !== false), [services]);

  const handleServiceTypeToggle = (value: string, shouldBeChecked: boolean) => {
    const current = watchedServiceTypes as string[];
    if (shouldBeChecked) {
      providerForm.setValue('serviceTypes', [...current, value], { shouldValidate: true, shouldDirty: true });
    } else {
      providerForm.setValue('serviceTypes', current.filter((s) => s !== value), { shouldValidate: true, shouldDirty: true });
    }
    providerForm.trigger('serviceTypes');
  };

  const onCustomerSubmit = async (data: CustomerSignupFormData) => {
    setIsRequestingOtp(true);
    const cleanEmail = data.email.trim().toLowerCase();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/signup-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, fullName: data.fullName, signupData: { ...data, email: cleanEmail } }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Verification code request failed.');
      }

      // Bypass OTP if disableOtp is enabled on admin side
      if (result.verified && result.token) {
        const { signInWithCustomToken } = await import('firebase/auth');
        const { auth } = await import('@/config/firebase');
        await signInWithCustomToken(auth, result.token);
        toast.success('Registration complete! Welcome aboard.');
        navigate('/customer/dashboard');
        return;
      }

      setPendingEmail(cleanEmail);
      setPendingSignupData({ ...data, email: cleanEmail });
      setShowOtpDialog(true);
      setResendCountdown(30);
      toast.success('Verification code sent to your email.');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed to initialize.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const onProviderSubmit = async (data: ProviderSignupFormData) => {
    setIsRequestingOtp(true);
    const cleanEmail = data.email.trim().toLowerCase();
    const fullSignupData = {
      ...data,
      email: cleanEmail,
      serviceRadiusKm: Number(data.serviceRadiusKm) || 25,
      latitude: lat ?? undefined,
      longitude: lng ?? undefined,
    };
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/signup-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, fullName: data.fullName, signupData: fullSignupData }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Verification code request failed.');
      }

      // Bypass OTP if disableOtp is enabled on admin side
      if (result.verified && result.token) {
        const { signInWithCustomToken } = await import('firebase/auth');
        const { auth } = await import('@/config/firebase');
        await signInWithCustomToken(auth, result.token);
        toast.success('Registration complete! Welcome aboard.');
        navigate('/provider/dashboard');
        return;
      }

      setPendingEmail(cleanEmail);
      setPendingSignupData(fullSignupData);
      setShowOtpDialog(true);
      setResendCountdown(30);
      toast.success('Verification code sent to your email.');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed to initialize.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue.trim()) {
      toast.error('Please enter the verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/verify-signup-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingEmail,
          otp: otpValue.trim(),
          signupData: pendingSignupData,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Incorrect verification code.');
      }

      // Sign in with custom Firebase token
      const { signInWithCustomToken } = await import('firebase/auth');
      const { auth } = await import('@/config/firebase');
      await signInWithCustomToken(auth, result.token);

      toast.success('Registration complete! Welcome aboard.');
      setShowOtpDialog(false);
      navigate(pendingSignupData.role === 'provider' ? '/provider/dashboard' : '/customer/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Incorrect verification code. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const errorClass = (err: unknown) => (err ? 'border-red-500 ring-red-100 bg-red-50' : 'bg-slate-50 border-slate-100 focus:bg-white');

  const scrollToFirstError = () => {
    setTimeout(() => {
      const firstError = document.querySelector('.border-red-500, [aria-invalid="true"]');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (firstError as HTMLElement).focus?.();
      }
    }, 100);
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'customer' | 'provider')} className="space-y-8">
        <TabsList className="w-full flex p-1 bg-slate-100/50 rounded-2xl h-14 max-w-sm mx-auto shadow-inner">
          <TabsTrigger value="customer" className="flex-1 rounded-2xl font-black text-[10px] py-4 px-4 uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Customer</TabsTrigger>
          <TabsTrigger value="provider" className="flex-1 rounded-2xl font-black text-[10px] py-4 px-4 uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Provider</TabsTrigger>
        </TabsList>

        <TabsContent value="customer" className="mt-0">
          <form onSubmit={customerForm.handleSubmit(onCustomerSubmit, scrollToFirstError)} className="space-y-8">

            <input type="hidden" {...customerForm.register('role')} />

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Create your account</h3>
              </div>

              {computedCustomerFields.length > 0 ? (
                <DynamicFormFields fields={computedCustomerFields} form={customerForm} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 px-0.5">
                    <Label htmlFor="fullName-c" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full name</Label>
                    <Input id="fullName-c" placeholder="John Doe" {...customerForm.register('fullName')} className={`h-12 rounded-2xl font-bold ${errorClass(customerForm.formState.errors.fullName)}`} />
                    {customerForm.formState.errors.fullName && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{customerForm.formState.errors.fullName.message}</p>}
                  </div>
                  <div className="space-y-1.5 px-0.5">
                    <Label htmlFor="email-c" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email address</Label>
                    <Input id="email-c" type="email" placeholder="you@example.com" {...customerForm.register('email')} className={`h-12 rounded-2xl font-bold ${errorClass(customerForm.formState.errors.email)}`} />
                    {customerForm.formState.errors.email && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{customerForm.formState.errors.email.message}</p>}
                  </div>
                  <div className="space-y-1.5 px-0.5 md:col-span-2">
                    <Label htmlFor="phone-c" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mobile number</Label>
                    <PhoneInputGroup
                      countryCode={customerForm.watch('countryCode')}
                      phone={customerForm.watch('phone')}
                      onCountryCodeChange={(v) => customerForm.setValue('countryCode', v, { shouldValidate: true, shouldDirty: true })}
                      onPhoneChange={(v) => customerForm.setValue('phone', v, { shouldValidate: true, shouldDirty: true })}
                      error={!!customerForm.formState.errors.phone}
                    />
                    {customerForm.formState.errors.phone && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{customerForm.formState.errors.phone.message}</p>}
                  </div>

                  <div className="space-y-1.5 px-0.5">
                    <Label htmlFor="password-c" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</Label>
                    <div className="relative">
                      <Input id="password-c" type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...customerForm.register('password')} className={`h-12 rounded-2xl font-bold pr-14 ${errorClass(customerForm.formState.errors.password)}`} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {customerForm.formState.errors.password && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{customerForm.formState.errors.password.message}</p>}
                  </div>
                  <div className="space-y-1.5 px-0.5">
                    <Label htmlFor="confirmPassword-c" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm password</Label>
                    <Input id="confirmPassword-c" type="password" placeholder="••••••••" {...customerForm.register('confirmPassword')} className={`h-12 rounded-2xl font-bold ${errorClass(customerForm.formState.errors.confirmPassword)}`} />
                    {customerForm.formState.errors.confirmPassword && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{customerForm.formState.errors.confirmPassword.message}</p>}
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full h-16 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 text-white text-lg font-black shadow-2xl shadow-blue-600/20 group transform active:scale-[0.98] transition-all" disabled={isRequestingOtp}>
              {isRequestingOtp ? (
                <span className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" />Loading...</span>
              ) : (
                <span className="flex items-center gap-3 uppercase tracking-widest text-sm"><UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />Create account</span>
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="provider" className="mt-0">
          <form onSubmit={providerForm.handleSubmit(onProviderSubmit, scrollToFirstError)} className="space-y-8">

            <input type="hidden" {...providerForm.register('role')} />

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Truck className="w-6 h-6 text-indigo-600" />
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Business details</h3>
              </div>
              {computedProviderFields.length > 0 ? (
                <div className="space-y-6">
                  <DynamicFormFields
                    fields={computedProviderFields.filter((f) => !['password', 'confirmPassword'].includes(f.id))}
                    form={providerForm}
                  />

                  <DynamicFormFields
                    fields={computedProviderFields.filter((f) => ['password', 'confirmPassword'].includes(f.id))}
                    form={providerForm}
                  />

                  <div className="space-y-1.5 focus-within:z-10 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Shop location *</Label>
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-2xl border-blue-100 text-blue-600 hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest gap-2"
                          onClick={async () => {
                            getCurrentLocation();
                            if (lat && lng) {
                              const addr = await reverseGeocodeAddress(lat, lng);
                              setProviderAddressName(addr);
                            }
                          }}
                        >
                          <LocateFixed className="w-4 h-4" />
                          {geoLoading ? 'Getting GPS...' : 'Use Current GPS'}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 font-black uppercase text-[10px] tracking-widest gap-2"
                          onClick={() => setShowProviderMapPicker(!showProviderMapPicker)}
                        >
                          <MapPin className="w-4 h-4 text-blue-600" />
                          {showProviderMapPicker ? 'Hide Map' : 'Select on Map'}
                        </Button>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text.sm text-slate-700 font-semibold">
                        {providerAddressName ? (
                          <p className="flex items-center gap-2 text-xs font-bold text-slate-900">
                            <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                            <span>Shop Location Pinned: {providerAddressName}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">Use GPS button or open map to pinpoint your garage location.</p>
                        )}
                      </div>

                      {showProviderMapPicker && (
                        <div className="rounded-3xl border border-slate-200 overflow-hidden h-[300px] shadow-sm">
                          <LocationPicker
                            onLocationSelect={async (loc) => {
                              providerForm.setValue('latitude', loc.lat, { shouldValidate: true, shouldDirty: true });
                              providerForm.setValue('longitude', loc.lng, { shouldValidate: true, shouldDirty: true });
                              setProviderAddressName(loc.address || 'Selected Shop Area');
                            }}
                          />
                        </div>
                      )}
                    </div>
                    {geoError && <p className="text-[10px] text-amber-600 font-bold uppercase mt-1 ml-1 tracking-wider">{geoError}</p>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 focus-within:z-10">
                    <Label htmlFor="fullName-p" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Owner name</Label>
                    <Input id="fullName-p" placeholder="John Doe" {...providerForm.register('fullName')} className={`h-12 rounded-2xl font-bold ${errorClass(providerForm.formState.errors.fullName)}`} />
                    {providerForm.formState.errors.fullName && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.fullName.message}</p>}
                  </div>
                  <div className="space-y-1.5 focus-within:z-10">
                    <Label htmlFor="email-p-top" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email address <span className="text-red-500">*</span></Label>
                    <Input id="email-p-top" type="email" placeholder="you@company.com" {...providerForm.register('email')} className={`h-12 w-full rounded-2xl font-bold ${errorClass(providerForm.formState.errors.email)}`} autoComplete="email" />
                    {providerForm.formState.errors.email && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.email.message}</p>}
                  </div>
                  <div className="space-y-1.5 focus-within:z-10">
                    <Label htmlFor="companyName-p" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Shop name</Label>
                    <Input id="companyName-p" placeholder="QuickTow Services" {...providerForm.register('companyName')} className={`h-12 rounded-2xl font-bold ${errorClass(providerForm.formState.errors.companyName)}`} />
                    {providerForm.formState.errors.companyName && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.companyName.message}</p>}
                  </div>
                  <div className="space-y-1.5 focus-within:z-10 md:col-span-2">
                    <Label htmlFor="businessAddress-p" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Business address</Label>
                    <Input id="businessAddress-p" placeholder="123 Main Street, Near City Mall" {...providerForm.register('businessAddress')} className={`h-12 rounded-2xl font-bold ${errorClass(providerForm.formState.errors.businessAddress)}`} />
                    {providerForm.formState.errors.businessAddress && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.businessAddress.message}</p>}
                  </div>
                  <div className="space-y-1.5 focus-within:z-10">
                    <Label htmlFor="city-p" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">City</Label>
                    <Input id="city-p" placeholder="Mumbai" {...providerForm.register('city')} className={`h-12 rounded-2xl font-bold ${errorClass(providerForm.formState.errors.city)}`} />
                    {providerForm.formState.errors.city && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.city.message}</p>}
                  </div>
                  <div className="space-y-1.5 focus-within:z-10">
                    <Label htmlFor="state-p" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">State</Label>
                    <Input id="state-p" placeholder="Maharashtra" {...providerForm.register('state')} className={`h-12 rounded-2xl font-bold ${errorClass(providerForm.formState.errors.state)}`} />
                    {providerForm.formState.errors.state && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.state.message}</p>}
                  </div>
                  <div className="space-y-1.5 focus-within:z-10">
                    <Label htmlFor="pin-p" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">PIN code</Label>
                    <Input id="pin-p" placeholder="400001" {...providerForm.register('pin')} className={`h-12 rounded-2xl font-bold ${errorClass(providerForm.formState.errors.pin)}`} />
                    {providerForm.formState.errors.pin && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.pin.message}</p>}
                  </div>
                  <div className="space-y-1.5 focus-within:z-10">
                    <Label htmlFor="businessHours-p" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Business hours</Label>
                    <Input id="businessHours-p" placeholder="Mon - Sat, 9:00 AM - 8:00 PM" {...providerForm.register('businessHours')} className={`h-12 rounded-2xl font-bold ${errorClass(providerForm.formState.errors.businessHours)}`} />
                    {providerForm.formState.errors.businessHours && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.businessHours.message}</p>}
                  </div>
                  <div className="space-y-1.5 focus-within:z-10">
                    <Label htmlFor="serviceRadiusKm-p" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Service radius (km)</Label>
                    <Input id="serviceRadiusKm-p" type="number" min="1" max="500" placeholder="e.g. 25" {...providerForm.register('serviceRadiusKm', { setValueAs: (v) => (v === "" ? undefined : Number(v)) })} className={`h-12 rounded-2xl font-bold ${errorClass(providerForm.formState.errors.serviceRadiusKm)}`} />
                    {providerForm.formState.errors.serviceRadiusKm && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.serviceRadiusKm.message}</p>}
                  </div>
                  <div className="space-y-1.5 focus-within:z-10">
                    <Label htmlFor="licenseNumber-p" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Shop / Garage License Number (Optional)</Label>
                    <Input id="licenseNumber-p" placeholder="SHOP-LIC-2026" {...providerForm.register('licenseNumber')} className={`h-12 rounded-2xl font-bold ${errorClass(providerForm.formState.errors.licenseNumber)}`} />
                    {providerForm.formState.errors.licenseNumber && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.licenseNumber.message}</p>}
                  </div>

                  <div className="space-y-1.5 focus-within:z-10">
                    <Label htmlFor="phone-p" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact number</Label>
                    <PhoneInputGroup
                      countryCode={providerForm.watch('countryCode')}
                      phone={providerForm.watch('phone')}
                      onCountryCodeChange={(v) => providerForm.setValue('countryCode', v, { shouldValidate: true, shouldDirty: true })}
                      onPhoneChange={(v) => providerForm.setValue('phone', v, { shouldValidate: true, shouldDirty: true })}
                      error={!!providerForm.formState.errors.phone}
                    />
                    {providerForm.formState.errors.phone && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.phone.message}</p>}
                  </div>

                  <div className="space-y-1.5 focus-within:z-10">
                    <Label htmlFor="password-p" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</Label>
                    <div className="relative">
                      <Input id="password-p" type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...providerForm.register('password')} className={`h-12 rounded-2xl pr-14 font-bold ${errorClass(providerForm.formState.errors.password)}`} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {providerForm.formState.errors.password && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.password.message}</p>}
                  </div>
                  <div className="space-y-1.5 focus-within:z-10">
                    <Label htmlFor="confirmPassword-p" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm password</Label>
                    <Input id="confirmPassword-p" type="password" placeholder="••••••••" {...providerForm.register('confirmPassword')} className={`h-12 rounded-2xl font-bold ${errorClass(providerForm.formState.errors.confirmPassword)}`} />
                    {providerForm.formState.errors.confirmPassword && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.confirmPassword.message}</p>}
                  </div>

                  <div className="space-y-1.5 focus-within:z-10 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Shop location *</Label>
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-2xl border-blue-100 text-blue-600 hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest gap-2"
                          onClick={async () => {
                            getCurrentLocation();
                            if (lat && lng) {
                              const addr = await reverseGeocodeAddress(lat, lng);
                              setProviderAddressName(addr);
                            }
                          }}
                        >
                          <LocateFixed className="w-4 h-4" />
                          {geoLoading ? 'Getting GPS...' : 'Use Current GPS'}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 font-black uppercase text-[10px] tracking-widest gap-2"
                          onClick={() => setShowProviderMapPicker(!showProviderMapPicker)}
                        >
                          <MapPin className="w-4 h-4 text-blue-600" />
                          {showProviderMapPicker ? 'Hide Map' : 'Select on Map'}
                        </Button>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text.sm text-slate-700 font-semibold">
                        {providerAddressName ? (
                          <p className="flex items-center gap-2 text-xs font-bold text-slate-900">
                            <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                            <span>Shop Location Pinned: {providerAddressName}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">Use GPS button or open map to pinpoint your garage location.</p>
                        )}
                      </div>

                      {showProviderMapPicker && (
                        <div className="rounded-3xl border border-slate-200 overflow-hidden h-[300px] shadow-sm">
                          <LocationPicker
                            onLocationSelect={async (loc) => {
                              providerForm.setValue('latitude', loc.lat, { shouldValidate: true, shouldDirty: true });
                              providerForm.setValue('longitude', loc.lng, { shouldValidate: true, shouldDirty: true });
                              setProviderAddressName(loc.address || 'Selected Shop Area');
                            }}
                          />
                        </div>
                      )}
                    </div>
                    {geoError && <p className="text-[10px] text-amber-600 font-bold uppercase mt-1 ml-1 tracking-wider">{geoError}</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-800 rounded-[2.5rem] p-8 space-y-6 text-white group shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-black tracking-tight">Services offered</h3>
              </div>

              {isServicesLoading ? (
                <div className="py-10 text-center font-black text-[10px] uppercase tracking-[0.5em] text-slate-500 animate-pulse">Loading service list...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeServices.map((opt) => {
                    const isSelected = watchedServiceTypes.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        className={`flex items-center space-x-4 p-5 rounded-2xl border-2 transition-all cursor-pointer group/opt relative overflow-hidden ${isSelected
                          ? 'border-blue-600 bg-white/5 shadow-2xl ring-4 ring-blue-600/5'
                          : 'border-white/5 bg-white/10 hover:border-white/20'
                          }`}
                        onClick={() => handleServiceTypeToggle(opt.id, !isSelected)}
                      >
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isSelected
                          ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/30'
                          : 'border-white/20 group-hover/opt:border-white/40'
                          }`}>
                          {isSelected && <ShieldCheck className="w-4 h-4 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1 relative z-10">
                          <Label className="text-[10px] font-black text-white uppercase tracking-[0.2em] block cursor-pointer truncate">
                            {opt.name}
                          </Label>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">{opt.description}</p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {providerForm.formState.errors.serviceTypes && (
                <p className="text-[10px] text-red-400 font-bold uppercase ml-1 tracking-wider">{providerForm.formState.errors.serviceTypes.message as string}</p>
              )}
            </div>



            <Button type="submit" size="lg" className="w-full h-14 sm:h-16 rounded-[1.25rem] bg-indigo-600 hover:bg-black text-white text-sm sm:text-base font-black shadow-2xl shadow-indigo-600/20 group transform active:scale-[0.98] transition-all" disabled={isRequestingOtp}>
              {isRequestingOtp ? (
                <span className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" />Loading...</span>
              ) : (
                <span className="flex items-center gap-3 uppercase tracking-widest text-sm"><UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />Create provider account</span>
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {/* OTP Verification Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-none shadow-2xl p-8 bg-white">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
              <ShieldAlert className="w-6 h-6 text-blue-600" />
              Email Verification
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs font-semibold uppercase mt-1.5 tracking-wider">
              Verify your security code to complete registration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            <div className="space-y-2 text-center">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">
                Verification Code Sent to Email
              </Label>
              <Input
                type="text"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-16 text-center text-3xl font-black tracking-[8px] bg-slate-50 border-slate-200 rounded-2xl focus:bg-white focus:ring-slate-300"
              />
            </div>

            <Button
              onClick={handleVerifyOtp}
              disabled={isVerifyingOtp || otpValue.length !== 6}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest"
            >
              {isVerifyingOtp ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify & Create Account'
              )}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                disabled={resendCountdown > 0 || isRequestingOtp}
                onClick={handleResendOtp}
                className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 disabled:text-slate-400 transition-colors cursor-pointer"
              >
                {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : 'Resend Verification Code'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}







