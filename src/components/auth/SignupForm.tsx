import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, ShieldCheck, Truck, UserPlus, LocateFixed } from 'lucide-react';
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

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'customer' | 'provider'>('customer');
  const { signup, isLoading } = useAuth();
  const { services, isLoading: isServicesLoading } = useServices();
  const { lat, lng, loading: geoLoading, error: geoError, getCurrentLocation } = useGeolocation();
  const navigate = useNavigate();

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
      serviceRadiusKm: 25,
    },
  });

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
    try {
      await signup(data);
      toast.success('Your account is ready. Welcome aboard.');
      navigate('/customer/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        toast.error('That email is already in use.');
      } else {
        toast.error('We could not create your account. Please try again.');
      }
    }
  };

  const onProviderSubmit = async (data: ProviderSignupFormData) => {
    try {
      await signup({ ...(data as any), latitude: lat ?? undefined, longitude: lng ?? undefined } as any);
      toast.success('Provider account created successfully.');
      navigate('/provider/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'We could not create the provider account.');
    }
  };

  const errorClass = (err: unknown) => (err ? 'border-red-500 ring-red-100 bg-red-50' : 'bg-slate-50 border-slate-100 focus:bg-white');

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'customer' | 'provider')} className="space-y-8">
        <TabsList className="w-full flex p-1 bg-slate-100/50 rounded-2xl h-14 max-w-sm mx-auto shadow-inner">
          <TabsTrigger value="customer" className="flex-1 rounded-2xl font-black text-[10px] py-4 px-4 uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Customer</TabsTrigger>
          <TabsTrigger value="provider" className="flex-1 rounded-2xl font-black text-[10px] py-4 px-4 uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Provider</TabsTrigger>
        </TabsList>

        <TabsContent value="customer" className="mt-0">
          <form onSubmit={customerForm.handleSubmit(onCustomerSubmit)} className="space-y-8">
            <input type="hidden" {...customerForm.register('role')} />

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Create your account</h3>
              </div>

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
                <div className="space-y-1.5 px-0.5 md:col-span-1">
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
               </div>
            </div>

            <Button type="submit" size="lg" className="w-full h-16 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 text-white text-lg font-black shadow-2xl shadow-blue-600/20 group transform active:scale-[0.98] transition-all" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" />Creating account...</span>
              ) : (
                <span className="flex items-center gap-3 uppercase tracking-widest text-sm"><UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />Create account</span>
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="provider" className="mt-0">
          <form onSubmit={providerForm.handleSubmit(onProviderSubmit)} className="space-y-8">
            <input type="hidden" {...providerForm.register('role')} />

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Truck className="w-6 h-6 text-indigo-600" />
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Business details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 focus-within:z-10">
                  <Label htmlFor="fullName-p" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Owner name</Label>
                  <Input id="fullName-p" placeholder="John Doe" {...providerForm.register('fullName')} className={`h-12 rounded-2xl font-bold ${errorClass(providerForm.formState.errors.fullName)}`} />
                  {providerForm.formState.errors.fullName && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.fullName.message}</p>}
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
                  <Input id="serviceRadiusKm-p" type="number" min="1" max="500" placeholder="25" {...providerForm.register('serviceRadiusKm')} className={`h-12 rounded-2xl font-bold ${errorClass(providerForm.formState.errors.serviceRadiusKm)}`} />
                  {providerForm.formState.errors.serviceRadiusKm && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.serviceRadiusKm.message}</p>}
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
                <div className="space-y-1.5 focus-within:z-10 md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Current location</Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button type="button" variant="outline" className="h-12 rounded-2xl border-blue-100 text-blue-600 hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest gap-2" onClick={() => {
                      getCurrentLocation();
                      if (lat !== null) providerForm.setValue('latitude', lat, { shouldValidate: true, shouldDirty: true });
                      if (lng !== null) providerForm.setValue('longitude', lng, { shouldValidate: true, shouldDirty: true });
                    }}>
                      <LocateFixed className="w-4 h-4" />
                      {geoLoading ? 'Getting location...' : 'Use GPS'}
                    </Button>
                    <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      {lat !== null && lng !== null ? `Pinned: ${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'We will store your shop coordinates for future bookings.'}
                    </div>
                  </div>
                  {geoError && <p className="text-[10px] text-amber-600 font-bold uppercase mt-1 ml-1 tracking-wider">{geoError}</p>}
                </div>
              </div>
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
                          className={`flex items-center space-x-4 p-5 rounded-2xl border-2 transition-all cursor-pointer group/opt relative overflow-hidden ${
                            isSelected
                              ? 'border-blue-600 bg-white/5 shadow-2xl ring-4 ring-blue-600/5'
                              : 'border-white/5 bg-white/10 hover:border-white/20'
                          }`}
                          onClick={() => handleServiceTypeToggle(opt.id, !isSelected)}
                        >
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected
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

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 focus-within:z-10">
                  <Label htmlFor="email-p" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email address</Label>
                  <Input id="email-p" type="email" placeholder="you@company.com" {...providerForm.register('email')} className={`h-12 rounded-2xl font-bold ${errorClass(providerForm.formState.errors.email)}`} />
                  {providerForm.formState.errors.email && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.email.message}</p>}
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
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword-p" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm password</Label>
                  <Input id="confirmPassword-p" type="password" placeholder="••••••••" {...providerForm.register('confirmPassword')} className={`h-12 rounded-2xl font-bold ${errorClass(providerForm.formState.errors.confirmPassword)}`} />
                  {providerForm.formState.errors.confirmPassword && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 tracking-wider">{providerForm.formState.errors.confirmPassword.message}</p>}
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full h-16 rounded-[1.5rem] bg-indigo-600 hover:bg-black text-white text-lg font-black shadow-2xl shadow-indigo-600/20 group transform active:scale-[0.98] transition-all" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" />Saving profile...</span>
              ) : (
                <span className="flex items-center gap-3 uppercase tracking-widest text-sm"><UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />Create provider account</span>
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}







