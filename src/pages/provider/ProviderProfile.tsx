import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Phone, Truck, Save, ShieldCheck, AlertCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProviderLayout } from '@/components/layout/ProviderLayout';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/config/firebase';
import { profileUpdateSchema, ProfileUpdateFormData } from '@/lib/validators';
import { useServices } from '@/hooks/useServices';
import { Badge } from '@/components/ui/badge';
import { ImageUrlInput } from '@/components/shared/ImageUrlInput';

export default function ProviderProfile() {
  const { profile, refreshProfile } = useAuth();
  const { services, isLoading: isServicesLoading } = useServices();
  const [serviceTypes, setServiceTypes] = useState<string[]>(profile?.serviceTypes || []);

  const form = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { 
      fullName: profile?.fullName || '', 
      phone: profile?.phone || '' 
    },
  });

  // Initialize local state from profile once
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    if (profile && !hasInitialized) {
      setTimeout(() => {
        setServiceTypes(profile.serviceTypes || []);
        form.reset({
          fullName: profile.fullName || '',
          phone: profile.phone || ''
        });
        setHasInitialized(true);
      }, 0);
    }
  }, [profile, hasInitialized, form]);

  const onSubmit = async (data: ProfileUpdateFormData) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        fullName: data.fullName,
        phone: data.phone,
        serviceTypes,
      });
      await refreshProfile();
      toast.success('Profile updated successfully!');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const toggleService = (serviceId: string, checked: boolean) => {
    setServiceTypes((prev) => 
      checked ? [...prev, serviceId] : prev.filter((s) => s !== serviceId)
    );
  };

  const activeServices = services.filter(s => s.isActive !== false);

  return (
    <ProviderLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Provider Profile</h1>
            <p className="text-slate-500 font-medium tracking-wide">Manage your professional credentials and services</p>
          </div>
          <div className="flex items-center gap-3">
             {profile?.isVerified ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 rounded-xl py-2 px-4 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Provider Verified
                </Badge>
             ) : (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 rounded-xl py-2 px-4 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Verification Pending
                </Badge>
             )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Summary Column */}
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
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Email</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                    <Phone className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Phone</p>
                    <p className="text-sm font-bold text-slate-700">{profile?.phone || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                    <Truck className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Vehicle</p>
                    <p className="text-sm font-bold text-slate-700">{profile?.vehicleNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-500/20 transition-all" />
               <h4 className="text-lg font-black mb-2 relative z-10">Need Help?</h4>
               <p className="text-slate-400 text-sm font-medium leading-relaxed relative z-10 mb-6">Contact our provider success team for verification assistance or technical help.</p>
               <Button className="w-full bg-white/10 hover:bg-white/20 border-white/10 text-white rounded-xl h-11 backdrop-blur-sm relative z-10">Support Chat</Button>
            </div>
          </div>

          {/* Form Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Save className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Professional Services</h3>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 focus-within:z-10">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Your Full Name</Label>
                    <Input {...form.register('fullName')} className={`h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold ${form.formState.errors.fullName ? 'border-red-500' : ''}`} />
                    {form.formState.errors.fullName && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.fullName.message}</p>}
                  </div>
                  <div className="space-y-1.5 focus-within:z-10">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Phone</Label>
                    <Input {...form.register('phone')} className={`h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold ${form.formState.errors.phone ? 'border-red-500' : ''}`} />
                    {form.formState.errors.phone && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1">{form.formState.errors.phone.message}</p>}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-50">
                  <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-6">Available Services (Authorized by Admin)</Label>
                  
                  {isServicesLoading ? (
                    <div className="py-8 text-center text-slate-400 animate-pulse font-bold flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                      FETCHING SERVICE TYPES...
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

                <Button 
                  type="submit" 
                  className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-600/20 group"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <span className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      SAVING...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                       <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                       Save Profile Settings
                    </span>
                  )}
                </Button>
              </form>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="flex-1 text-center md:text-left">
                 <h4 className="text-lg font-black text-slate-900 tracking-tight">Trust & Security</h4>
                 <p className="text-sm font-medium text-slate-500">Your information is protected by industry standard encryption and used only for fulfilling service requests.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </ProviderLayout>
  );
}
