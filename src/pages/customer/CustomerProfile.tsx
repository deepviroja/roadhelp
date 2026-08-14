import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Save, Trash2, ShieldCheck, Smartphone } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ImageUrlInput } from "@/components/shared/ImageUrlInput";
import { useAuth } from "@/hooks/useAuth";
import { db, auth } from "@/config/firebase";
import { profileUpdateSchema, ProfileUpdateFormData } from "@/lib/validators";
import { formatDate } from "@/lib/utils";
import { VehicleManager } from "@/components/customer/VehicleManager";
import { PhoneInputGroup } from "@/components/ui/phone-input";
import { useSystemStore } from "@/stores/systemStore";

export default function CustomerProfile() {
  const { profile, logout, refreshProfile } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { appName } = useSystemStore();

  const initialCountryCode = profile?.countryCode || (profile?.phone?.startsWith("+91") ? "+91" : profile?.phone?.startsWith("+1") ? "+1" : "+91");
  const initialPhone = profile?.phone ? (profile.phone.startsWith(initialCountryCode) ? profile.phone.slice(initialCountryCode.length) : profile.phone) : "";

  const form = useForm<ProfileUpdateFormData>({
    mode: "onChange",
    reValidateMode: "onChange",
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      fullName: profile?.fullName || "",
      countryCode: initialCountryCode,
      phone: initialPhone,
    },
  });

  useEffect(() => {
    if (profile && !hasInitialized) {
      const currentCountryCode = profile.countryCode || (profile.phone?.startsWith("+91") ? "+91" : profile.phone?.startsWith("+1") ? "+1" : "+91");
      const currentPhone = profile.phone ? (profile.phone.startsWith(currentCountryCode) ? profile.phone.slice(currentCountryCode.length) : profile.phone) : "";

      setTimeout(() => {
        form.reset({
          fullName: profile.fullName || "",
          countryCode: currentCountryCode,
          phone: currentPhone,
        });
        setHasInitialized(true);
      }, 0);
    }
  }, [profile, hasInitialized, form]);

  const onSubmit = async (data: ProfileUpdateFormData) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        fullName: data.fullName,
        countryCode: data.countryCode,
        phone: data.phone,
      });
      await refreshProfile();
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
      await logout();
      toast.success("Account deleted");
    } catch {
      toast.error("Failed to delete account. Please re-login and try again.");
    }
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

  return (
    <CustomerLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto space-y-8 pb-20"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Details</h1>
            <p className="text-slate-500 font-medium tracking-wide italic">Manage your profile</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest leading-none flex items-center gap-1.5 shadow-sm">
               <ShieldCheck className="w-3.5 h-3.5" /> Premium Member
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Summary Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-bl-3xl group-hover:scale-110 transition-transform" />
              <div className="w-20 h-20 mx-auto mb-4 relative z-10">
                <ImageUrlInput
                  currentImage={profile?.photoURL}
                  onImageChange={async (url) => {
                    if (!profile?.uid) return;
                    const userRef = doc(db, "users", profile.uid);
                    await updateDoc(userRef, { photoURL: url });
                    refreshProfile();
                  }}
                  variant="avatar"
                  className="w-full h-full [&>div]:rounded-2xl"
                />
              </div>
              <h2 className="text-xl font-black text-slate-900 leading-tight mb-1">{profile?.fullName}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{profile?.email}</p>
              
              <div className="space-y-3 pt-6 border-t border-slate-50 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 text-slate-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-slate-400 leading-none mb-1">Phone Number</p>
                    <p className="text-[11px] font-bold text-slate-700">{profile?.countryCode} {profile?.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-slate-400 leading-none mb-1">Registration Date</p>
                    <p className="text-[11px] font-bold text-slate-700">{profile?.createdAt ? formatDate(profile.createdAt) : "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 text-white relative group shadow-xl">
               <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mb-12 blur-2xl group-hover:bg-blue-600/10 transition-all" />
               <h4 className="text-sm font-bold mb-2">Emergency Status</h4>
               <p className="text-slate-400 text-[11px] font-medium leading-relaxed mb-4">Your account is active and verified for instant roadside dispatch nationwide.</p>
               <div className="flex items-center gap-2 text-green-400">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Network Connected</span>
               </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* Edit Profile Form */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-4">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Update Profile Details</h3>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit, scrollToFirstError)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="ml-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">Full Name</Label>
                    <Input id="fullName" {...form.register("fullName")} className={`h-12 rounded-xl font-bold bg-slate-50 border-slate-100 ${form.formState.errors.fullName ? "border-red-500 bg-red-50" : "focus:bg-white focus:border-blue-500 transition-all"}`} />
                    {form.formState.errors.fullName && <p className="text-[9px] text-red-500 font-bold uppercase mt-1 ml-1">{form.formState.errors.fullName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="ml-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">Phone Number</Label>
                    <PhoneInputGroup
                      countryCode={form.watch("countryCode") || "+1"}
                      phone={form.watch("phone")}
                      onCountryCodeChange={(v) => form.setValue("countryCode", v)}
                      onPhoneChange={(v) => form.setValue("phone", v)}
                      error={!!form.formState.errors.phone}
                    />
                    {form.formState.errors.phone && <p className="text-[9px] text-red-500 font-bold uppercase mt-1 ml-1">{form.formState.errors.phone.message}</p>}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full md:w-auto min-w-[180px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 h-12 font-bold text-[10px] shadow-md shadow-blue-600/20 group transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={form.formState.isSubmitting || !form.formState.isDirty}
                >
                  {form.formState.isSubmitting ? (
                    <span className="flex items-center gap-2 italic">Updating profile...</span>
                  ) : (
                    <span className="flex items-center gap-2 uppercase tracking-widest">
                      <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Save Account Changes
                    </span>
                  )}
                </Button>
              </form>
            </div>

            {/* My Garage Section */}
            {profile && (
              <VehicleManager profile={profile} onRefresh={refreshProfile} />
            )}

            {/* High-Risk Actions */}
            <div className="bg-red-50/50 rounded-3xl border border-red-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-red-800 tracking-tight uppercase">Close Account</h3>
                </div>
                <p className="text-[10px] text-red-600/70 font-bold leading-relaxed uppercase tracking-widest max-w-sm">
                  Permanently delete your account and remove all saved vehicles. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-red-200 bg-white text-red-600 hover:bg-red-600 hover:text-white rounded-xl px-6 h-12 font-bold text-[10px] transition-all active:scale-95"
                onClick={() => setShowDeleteDialog(true)}
              >
                DELETE ACCOUNT
              </Button>
            </div>
          </div>
        </div>

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Delete Your Account?"
          description={`You are about to irreversibly delete your ${appName} profile and vehicle garage. Are you absolutely certain you wish to proceed with account removal?`}
          confirmText="Yes, Delete My Account"
          onConfirm={handleDeleteAccount}
          isDestructive
        />
      </motion.div>
    </CustomerLayout>
  );
}
