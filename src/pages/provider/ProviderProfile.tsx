import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Phone, Truck, Save, ShieldCheck, AlertCircle, MapPin, Clock3, ShieldAlert, Navigation, Loader2, Target, Building2, FileText, Compass } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProviderLayout } from '@/components/layout/ProviderLayout';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/config/firebase';
import { providerProfileUpdateSchema, ProviderProfileUpdateFormData } from '@/lib/validators';
import { useServices } from '@/hooks/useServices';
import { Badge } from '@/components/ui/badge';
import { ImageUrlInput } from '@/components/shared/ImageUrlInput';
import { LocationPicker } from '@/components/map/LocationPicker';
import { PhoneInputGroup } from '@/components/ui/phone-input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function ProviderProfile() {
  const { profile, refreshProfile } = useAuth();
  const { services, isLoading: isServicesLoading } = useServices();
  const [serviceTypes, setServiceTypes] = useState<string[]>(profile?.serviceTypes || []);
  const [showSupportDialog, setShowSupportDialog] = useState(false);

  const initCountryCode = profile?.countryCode || (profile?.phone?.startsWith("+91") ? "+91" : profile?.phone?.startsWith("+1") ? "+1" : "+91");
  const initPhone = profile?.phone ? (profile.phone.startsWith(initCountryCode) ? profile.phone.slice(initCountryCode.length) : profile.phone) : "";

  const form = useForm<ProviderProfileUpdateFormData>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    resolver: zodResolver(providerProfileUpdateSchema),
    defaultValues: {
      fullName: profile?.fullName || '',
      countryCode: initCountryCode,
      phone: initPhone,
      companyName: profile?.companyName || '',
      licenseNumber: profile?.licenseNumber || '',
      businessAddress: profile?.businessAddress || '',
      city: profile?.city || '',
      state: profile?.state || '',
      pin: profile?.pin || '',
      businessHours: profile?.businessHours || '',
      serviceRadiusKm: profile?.serviceRadiusKm || 25,
      vehicleNumber: profile?.vehicleNumber || '',
    },
  });

  const [hasInitialized, setHasInitialized] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  useEffect(() => {
    if (profile && !hasInitialized) {
      const currentCountryCode = profile.countryCode || (profile.phone?.startsWith("+91") ? "+91" : profile.phone?.startsWith("+1") ? "+1" : "+91");
      const currentPhone = profile.phone ? (profile.phone.startsWith(currentCountryCode) ? profile.phone.slice(currentCountryCode.length) : profile.phone) : "";

      setTimeout(() => {
        setServiceTypes(profile.serviceTypes || []);
        form.reset({
          fullName: profile.fullName || '',
          countryCode: currentCountryCode,
          phone: currentPhone,
          companyName: profile.companyName || '',
          licenseNumber: profile.licenseNumber || '',
          businessAddress: profile.businessAddress || '',
          city: profile.city || '',
          state: profile.state || '',
          pin: profile.pin || '',
          businessHours: profile.businessHours || '',
          serviceRadiusKm: profile.serviceRadiusKm || 25,
          vehicleNumber: profile.vehicleNumber || '',
        });
        setHasInitialized(true);
      }, 0);
    }
  }, [profile, hasInitialized, form]);

  const servicesChanged = JSON.stringify([...serviceTypes].sort()) !== JSON.stringify([...(profile?.serviceTypes || [])].sort());
  const isDirty = form.formState.isDirty || servicesChanged;

  const onSubmit = async (data: ProviderProfileUpdateFormData) => {
    if (!profile) return;
    if (!serviceTypes || serviceTypes.length === 0) {
      toast.error('Choose at least one service before saving settings.');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        fullName: data.fullName,
        countryCode: data.countryCode,
        phone: data.phone,
        companyName: data.companyName,
        businessAddress: data.businessAddress,
        city: data.city,
        state: data.state,
        pin: data.pin,
        businessHours: data.businessHours,
        serviceRadiusKm: Number(data.serviceRadiusKm) || 25,
        licenseNumber: data.licenseNumber || '',
        vehicleNumber: data.vehicleNumber || '',
        serviceTypes,
      });
      await refreshProfile();
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update profile settings.');
    }
  };

  const toggleService = (serviceId: string, checked: boolean) => {
    setServiceTypes((prev) => (checked ? [...prev, serviceId] : prev.filter((s) => s !== serviceId)));
  };

  const activeServices = services.filter((s) => s.isActive !== false);

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
    <ProviderLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Provider Profile</h1>
            <p className="text-slate-500 font-medium tracking-wide">Keep your business details, working hours and service list up to date.</p>
          </div>
          <div className="flex items-center gap-3">
            {profile?.isVerified ? (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 rounded-xl py-2 px-4 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Verified Provider
              </Badge>
            ) : (
              <Badge 
                title="Your provider credentials are currently under review by our admin team. Verification is usually completed within 24 hours."
                className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 rounded-xl py-2 px-4 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 cursor-help"
              >
                <AlertCircle className="w-4 h-4" /> Verification Pending
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 text-center group">
              <div className="w-24 h-24 mx-auto mb-6 relative z-10">
                <ImageUrlInput
                  currentImage={profile?.photoURL}
                  onImageChange={async (url) => {
                    if (!profile?.uid) return;
                    const userRef = doc(db, 'users', profile.uid);
                    await updateDoc(userRef, { photoURL: url });
                    refreshProfile();
                  }}
                  variant="avatar"
                  className="w-full h-full [&>div]:rounded-[2rem]"
                />
              </div>
              <h3 className="text-2xl font-black text-slate-900 leading-tight mb-1">{profile?.fullName}</h3>
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-6">{profile?.companyName}</p>
              <div className="space-y-4 pt-6 border-t border-slate-50 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100"><Mail className="w-4 h-4 text-slate-400" /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Email</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100"><Phone className="w-4 h-4 text-slate-400" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Phone</p>
                    <p className="text-sm font-bold text-slate-700">{profile?.phone || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100"><Truck className="w-4 h-4 text-slate-400" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Vehicle</p>
                    <p className="text-sm font-bold text-slate-700">{profile?.vehicleNumber || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100"><MapPin className="w-4 h-4 text-slate-400" /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Business Base</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{profile?.businessAddress || 'Add your shop address'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100"><Clock3 className="w-4 h-4 text-slate-400" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Hours</p>
                    <p className="text-sm font-bold text-slate-700">{profile?.businessHours || 'Add business hours'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-500/20 transition-all" />
              <h4 className="text-lg font-black mb-2 relative z-10">Need Help?</h4>
              <p className="text-slate-400 text-sm font-medium leading-relaxed relative z-10 mb-6">Contact support if you need help updating your business details or service area.</p>
              <Button type="button" onClick={() => setShowSupportDialog(true)} className="w-full bg-white/10 hover:bg-white/20 border-white/10 text-white rounded-xl h-11 backdrop-blur-sm relative z-10">Support Details</Button>
            </div>
          </div>

          {/* Form Details Area */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={form.handleSubmit(onSubmit, scrollToFirstError)} className="space-y-6">
              
              {/* Card 1: Owner & Contact */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Phone className="w-5 h-5" /></div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Owner & Contact Details</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Owner Full Name *</Label>
                    <Input {...form.register('fullName')} className={`h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold ${form.formState.errors.fullName ? 'border-red-500 bg-red-50' : 'focus:bg-white'}`} />
                    {form.formState.errors.fullName && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.fullName.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Number *</Label>
                    <PhoneInputGroup
                      countryCode={form.watch('countryCode') || '+91'}
                      phone={form.watch('phone')}
                      onCountryCodeChange={(v) => form.setValue('countryCode', v, { shouldDirty: true })}
                      onPhoneChange={(v) => form.setValue('phone', v, { shouldDirty: true })}
                      error={!!form.formState.errors.phone}
                    />
                    {form.formState.errors.phone && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.phone.message}</p>}
                  </div>
                </div>
              </div>

              {/* Card 2: Company & Operations */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Building2 className="w-5 h-5" /></div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Business Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Company / Shop Name *</Label>
                    <Input {...form.register('companyName')} className={`h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold ${form.formState.errors.companyName ? 'border-red-500 bg-red-50' : 'focus:bg-white'}`} />
                    {form.formState.errors.companyName && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.companyName.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Trade License Number (Optional)</Label>
                    <Input {...form.register('licenseNumber')} className={`h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold ${form.formState.errors.licenseNumber ? 'border-red-500 bg-red-50' : 'focus:bg-white'}`} />
                    {form.formState.errors.licenseNumber && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.licenseNumber.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Working Hours *</Label>
                    <Input {...form.register('businessHours')} placeholder="e.g. 24 Hours, or Mon-Sat 9AM-9PM" className={`h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold ${form.formState.errors.businessHours ? 'border-red-500 bg-red-50' : 'focus:bg-white'}`} />
                    {form.formState.errors.businessHours && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.businessHours.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Service Coverage Radius (KM) *</Label>
                    <Input type="number" {...form.register('serviceRadiusKm')} className={`h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold ${form.formState.errors.serviceRadiusKm ? 'border-red-500 bg-red-50' : 'focus:bg-white'}`} />
                    {form.formState.errors.serviceRadiusKm && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.serviceRadiusKm.message}</p>}
                  </div>
                </div>
              </div>

              {/* Card 3: Address & Vehicle Details */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Compass className="w-5 h-5" /></div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Location & Dispatch Info</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Business Base Address *</Label>
                    <Input {...form.register('businessAddress')} className={`h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold ${form.formState.errors.businessAddress ? 'border-red-500 bg-red-50' : 'focus:bg-white'}`} />
                    {form.formState.errors.businessAddress && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.businessAddress.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">City *</Label>
                    <Input {...form.register('city')} className={`h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold ${form.formState.errors.city ? 'border-red-500 bg-red-50' : 'focus:bg-white'}`} />
                    {form.formState.errors.city && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.city.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">State *</Label>
                    <Input {...form.register('state')} className={`h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold ${form.formState.errors.state ? 'border-red-500 bg-red-50' : 'focus:bg-white'}`} />
                    {form.formState.errors.state && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.state.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">ZIP / PIN Code *</Label>
                    <Input {...form.register('pin')} className={`h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold ${form.formState.errors.pin ? 'border-red-500 bg-red-50' : 'focus:bg-white'}`} />
                    {form.formState.errors.pin && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.pin.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Tow Truck / Vehicle Plate (Optional)</Label>
                    <Input {...form.register('vehicleNumber')} className={`h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold ${form.formState.errors.vehicleNumber ? 'border-red-500 bg-red-50' : 'focus:bg-white'}`} />
                    {form.formState.errors.vehicleNumber && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.vehicleNumber.message}</p>}
                  </div>
                </div>
              </div>

              {/* Card 4: Services Checkboxes */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Save className="w-5 h-5" /></div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Offered Roadside Services</h3>
                </div>

                <div className="pt-2">
                  {isServicesLoading ? (
                    <div className="py-8 text-center text-slate-400 animate-pulse font-bold flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                      Loading service list...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeServices.map((opt) => {
                        const isSelected = serviceTypes.includes(opt.id);
                        return (
                          <div 
                            key={opt.id} 
                            className={`flex items-center space-x-4 p-5 rounded-2xl border-2 transition-all cursor-pointer group/opt relative overflow-hidden ${
                              isSelected 
                                ? 'border-blue-600 bg-blue-50/50 shadow-inner ring-4 ring-blue-600/5' 
                                : 'border-slate-50 bg-slate-50/30 hover:border-slate-200'
                            }`}
                            onClick={() => toggleService(opt.id, !isSelected)}
                          >
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                              isSelected 
                                ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-600/20' 
                                : 'bg-white border-slate-200 group-hover/opt:border-slate-300'
                            }`}>
                              {isSelected && <ShieldCheck className="w-4 h-4 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0 relative z-10">
                              <Label className="text-sm font-black text-slate-900 block cursor-pointer uppercase tracking-tight">
                                {opt.name}
                              </Label>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 line-clamp-1">
                                {opt.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isServicesLoading && activeServices.length === 0 && (
                    <div className="p-10 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
                      <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No service types found in database</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-600/20 group disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={form.formState.isSubmitting || !isDirty}
              >
                {form.formState.isSubmitting ? (
                  <span className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving Account Details...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Save Profile Changes
                  </span>
                )}
              </Button>
            </form>

            {/* Service Location Card */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 tracking-tight uppercase">Service Base Location</h4>
                  <p className="text-xs font-semibold text-slate-400">Select your base location on the map for matching and dispatching</p>
                </div>
              </div>

              {profile?.location && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">
                    {profile.location.address || `${profile.location.lat?.toFixed(4)}, ${profile.location.lng?.toFixed(4)}`}
                  </span>
                </div>
              )}

              <div className="rounded-3xl overflow-hidden border border-slate-200">
                <LocationPicker
                  onLocationSelect={async (loc) => {
                    if (!profile?.uid) return;
                    setIsUpdatingLocation(true);
                    try {
                      await updateDoc(doc(db, 'users', profile.uid), {
                        location: loc,
                      });
                      await refreshProfile();
                      toast.success('Service base location updated successfully!');
                    } catch {
                      toast.error('Failed to update base location');
                    } finally {
                      setIsUpdatingLocation(false);
                    }
                  }}
                  initialLocation={profile?.location}
                />
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase">Trust and Security</h4>
                <p className="text-sm font-medium text-slate-500">Your profile data is stored for booking fulfillment and provider matching only.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-none shadow-2xl p-8 bg-slate-950 text-white">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-black text-white flex items-center justify-center gap-2">
              <ShieldAlert className="w-6 h-6 text-blue-400" />
              Operational Support
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs font-semibold uppercase mt-1.5 tracking-wider">
              Direct uplink to help desk
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Voice Protocol</p>
                <p className="text-sm font-bold text-white">+1 (800) ROAD-HELP</p>
              </div>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Email Command</p>
                <p className="text-sm font-bold text-white">support@roadhelp.com</p>
              </div>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
                <Clock3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Availability</p>
                <p className="text-sm font-bold text-white">24/7/365</p>
              </div>
            </div>

            <Button onClick={() => setShowSupportDialog(false)} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs mt-2">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ProviderLayout>
  );
}
