import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  IndianRupee,
  Star,
  Wifi,
  WifiOff,
  Search,
  ShieldCheck,
  Zap,
  Activity,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  doc,
  updateDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { ProviderLayout } from "@/components/layout/ProviderLayout";
import { IncomingRequestCard } from "@/components/provider/IncomingRequestCard";
import { ActiveJobCard } from "@/components/provider/ActiveJobCard";
import { StatCard } from "@/components/admin/StatsOverview";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/config/firebase";
import { ServiceRequest } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSystemStore } from "@/stores/systemStore";

export default function ProviderDashboard() {
  const { profile, refreshProfile } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<ServiceRequest[]>([]);
  const [activeJob, setActiveJob] = useState<ServiceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [calculatedEarnings, setCalculatedEarnings] = useState(profile?.totalEarnings || 0);
  const [calculatedJobs, setCalculatedJobs] = useState(profile?.totalJobs || 0);
  const [calculatedRating, setCalculatedRating] = useState<number | null>(profile?.rating || null);
  // Track provider's current serviceTypes to detect changes
  const [providerServiceTypes, setProviderServiceTypes] = useState<string[]>(profile?.serviceTypes || []);

  const isOnline = profile?.isOnline ?? false;

  // Fetch eligible requests from API
  const fetchEligible = async (signal?: AbortSignal) => {
    try {
      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/eligible/mine`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal,
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPendingRequests((prev) => {
          // Detect if any offer was newly rejected
          json.data.forEach((newReq: ServiceRequest) => {
            const oldReq = prev.find((r) => r.id === newReq.id);
            if (oldReq && oldReq.proposalStatus === 'offered' && newReq.proposalStatus === 'rejected') {
              toast.error(`Your offer for ${newReq.customerName}'s request was declined by the customer.`);
            }
          });
          return json.data;
        });
      } else {
        setPendingRequests([]);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Eligible requests fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!profile?.uid) return;

    // Fetch accurate earnings
    import('firebase/firestore').then(({ getDocs }) => {
      const q = query(
        collection(db, 'serviceRequests'),
        where('providerId', '==', profile.uid),
        where('status', '==', 'completed')
      );
      getDocs(q).then((snapshot) => {
        const jobs = snapshot.docs.map(doc => doc.data() as ServiceRequest);
        const totalNet = jobs.reduce((sum, job) => sum + (job.providerEarnings || 0) + (job.tipAmount || 0), 0);
        const ratedJobs = jobs.filter((j) => j.rating && j.rating > 0);
        const avg = ratedJobs.length > 0
          ? (ratedJobs.reduce((sum, j) => sum + (j.rating || 0), 0) / ratedJobs.length)
          : (profile?.rating || 0);

        setCalculatedEarnings(totalNet);
        setCalculatedJobs(jobs.length);
        if (avg > 0) {
          setCalculatedRating(avg);
        }
      }).catch(console.error);
    });

    // Listen for active job
    const activeQ = query(
      collection(db, "serviceRequests"),
      where("providerId", "==", profile.uid),
      where("status", "in", ["accepted", "arriving", "inProgress"]),
      limit(1),
    );
    let isFirstActiveJob = true;
    const unsubActive = onSnapshot(activeQ,
      (snap) => {
        if (!snap.empty) {
          const job = {
            id: snap.docs[0].id,
            ...snap.docs[0].data(),
          } as ServiceRequest;
          setActiveJob(job);
          if (!isFirstActiveJob) {
            toast.success(`🎉 Your offer was accepted! Proceeding to help ${job.customerName}.`);
          }
        } else {
          setActiveJob(null);
        }
        isFirstActiveJob = false;
      },
      (err) => { console.error('Active job snapshot error:', err); }
    );

    // Live-listen to provider's own profile — if serviceTypes or other fields change, sync state
    const unsubProfile = onSnapshot(doc(db, 'users', profile.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const newTypes: string[] = data.serviceTypes || [];
      refreshProfile(); // Keep Zustand store profile in sync in real time
      setProviderServiceTypes((prev) => {
        const changed = JSON.stringify([...prev].sort()) !== JSON.stringify([...newTypes].sort());
        if (changed) {
          // Service types changed — refresh request queue immediately
          setPendingRequests([]);
          setIsLoading(true);
          fetchEligible();
        }
        return newTypes;
      });
    });

    return () => {
      unsubActive();
      unsubProfile();
    };
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.uid) return;
    if (!isOnline || activeJob) {
      setPendingRequests([]);
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    fetchEligible(controller.signal);
    const interval = setInterval(() => fetchEligible(controller.signal), 15000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [profile?.uid, isOnline, activeJob]);

  const handleToggleOnline = async (checked: boolean) => {
    if (!profile) return;
    try {
      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, { isOnline: checked });
      await refreshProfile();
      toast.success(
        checked
          ? "You're Online — Receiving Requests"
          : "You're Offline — No new requests",
      );
    } catch (err) {
      console.error("Failed to update provider status:", err);
      toast.error("Failed to update status");
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken(true);
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${requestId}/decline`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (err) {
      console.warn('Failed to notify backend of decline:', err);
    }
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const handleResetSkipped = async () => {
    try {
      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/eligible/reset-declines`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (res.ok) {
        toast.success('Skipped requests restored successfully!');
        setIsLoading(true);
        fetchEligible();
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not restore skipped requests');
    }
  };

  const ratingVal = calculatedRating ?? profile?.rating;
  const displayRating = ratingVal ? `${Number(ratingVal).toFixed(1)} / 5.0 ⭐` : "New Provider";

  return (
    <ProviderLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container-app pb-20"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 border border-blue-500/30 rounded-full text-blue-600 font-bold text-[10px] tracking-widest mb-4 uppercase backdrop-blur-md">
               DASHBOARD ACTIVE
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-[#1A1A2E] tracking-tight leading-none mb-2">
              {useSystemStore.getState().pageContent?.dashboardProviderWelcome || profile?.fullName}
            </h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{profile?.email} • Shop: {profile?.companyName || 'Verified Provider'}</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm pr-6">
               <div
                 className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${isOnline ? "bg-green-500 text-white shadow-md shadow-green-500/30" : "bg-slate-50 text-slate-400"}`}
               >
                 {isOnline ? (
                   <Wifi className="w-5 h-5 animate-pulse" />
                 ) : (
                   <WifiOff className="w-5 h-5" />
                 )}
               </div>
               <div className="mr-6">
                 <p className="text-[9px] font-bold uppercase text-slate-500 leading-none mb-1 tracking-widest">
                   Incomming Requests Status
                 </p>
                 <p
                   className={`text-xs font-bold uppercase tracking-widest ${isOnline ? "text-green-600" : "text-slate-600"}`}
                 >
                   {isOnline ? "Recieving" : "Not Recieving"}
                 </p>
               </div>
               <Switch
                 checked={isOnline}
                 onCheckedChange={handleToggleOnline}
                 className="data-[state=checked]:bg-green-600 scale-110"
               />
             </div>
          </div>
        </div>

        {/* Real-time Stat Matrix */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            label="Jobs Completed"
            value={calculatedJobs}
            icon={Briefcase}
            color="blue"
          />
          <StatCard
            label="Total Earnings (INR)"
            value={formatCurrency(calculatedEarnings)}
            icon={IndianRupee}
            color="green"
          />
          <StatCard
            label="Trust Score"
            value={displayRating}
            icon={Star}
            color="amber"
          />
          <StatCard
            label="Account Status"
            value={profile?.isVerified ? "CERTIFIED ✓" : "PENDING"}
            icon={ShieldCheck}
            color={profile?.isVerified ? "green" : "amber"}
          />
        </div>

        {!profile?.isVerified && (
          <div className="mb-10 p-5 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏳</span>
              <div className="text-left">
                <h4 className="text-sm font-black uppercase tracking-wider text-amber-800">Verification Pending</h4>
                <p className="text-xs font-semibold text-amber-700/90 mt-0.5">
                  Your provider account is currently pending administrator verification. You won't receive active customer requests in your area until certified.
                </p>
              </div>
            </div>
            <div className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full shrink-0">
              It takes upto 48 business hours for verification
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
           {/* Active Mission or Queue */}
           <div className="lg:col-span-8">
              <AnimatePresence mode="wait">
                {activeJob ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -20 }}
                  >
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                      <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Incoming Request</h2>
                    </div>
                    <ActiveJobCard request={activeJob} />
                  </motion.div>
                ) : isOnline ? (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                      <div className="flex items-center gap-3">
                        <Activity className="w-6 h-6 text-blue-600" />
                        <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Incoming Requests</h2>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleResetSkipped}
                          className="h-8 text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-slate-50 gap-1.5 rounded-lg border border-slate-200/50 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reset Skipped
                        </Button>
                        <div className="px-4 py-1.5 bg-slate-900 rounded-full">
                          <span className="text-[9px] font-bold uppercase text-blue-400 tracking-widest animate-pulse">
                            Scanning Nearby...
                          </span>
                        </div>
                      </div>
                    </div>

                    {isLoading ? (
                      <div className="py-24 flex flex-col items-center glass-card rounded-3xl">
                        <div className="animate-spin w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-xl mb-4" />
                        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Loading Requests...</p>
                      </div>
                    ) : pendingRequests.length === 0 ? (
                      <div className="py-24 glass-card rounded-3xl border-dashed flex flex-col items-center">
                        <EmptyState
                          icon={<Search className="w-16 h-16 text-slate-200" />}
                          title="No Active Requests"
                          description="Waiting for new roadside assistance requests near your area."
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {pendingRequests.map((req, idx) => (
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={req.id}
                          >
                            <IncomingRequestCard
                              request={req}
                              onDecline={() => handleDecline(req.id)}
                            />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-24 glass-card rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center text-center px-6 group">
                    <div className="w-24 h-24 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-300 mb-6 group-hover:rotate-6 group-hover:scale-105 transition-all duration-500">
                      <WifiOff className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950 mb-4">Unavailable to Take Requests</h2>
                    <p className="text-slate-500 font-semibold text-xs max-w-xs leading-relaxed italic">
                      Turn on the switch to start receiving customer requests
                    </p>
                    <Button
                      onClick={() => handleToggleOnline(true)}
                      className="mt-8 h-12 px-8 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-bold uppercase text-[10px] tracking-widest gap-3 shadow-md transition-all active:scale-95 group/btn"
                    >
                      <Zap className="w-4 h-4 text-blue-400 group-hover/btn:scale-110 transition-transform" />
                      I'm Available
                    </Button>
                  </div>
                )}
              </AnimatePresence>
           </div>

           {/* Operational Analytics */}
           <div className="lg:col-span-4">
              <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl h-full relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-125 transition-all duration-700" />
                 <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 border-b border-white/10 pb-3 relative z-10">Dashboard Summary</h3>
                 
                 <div className="space-y-8 relative z-10 mt-6">
                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                          <div>
                             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Jobs Completed</p>
                             <p className="text-xl font-black tracking-tight">{profile?.totalJobs || 0}</p>
                          </div>
                          <Briefcase className="w-6 h-6 text-blue-500" />
                       </div>
                       <div className="flex items-center justify-between">
                          <div>
                             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Payout</p>
                             <p className="text-xl font-black tracking-tight">{formatCurrency(profile?.totalEarnings || 0)}</p>
                          </div>
                          <TrendingUp className="w-6 h-6 text-green-500" />
                       </div>
                       <div className="flex items-center justify-between">
                          <div>
                             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Provider Rating</p>
                             <p className="text-xl font-black tracking-tight">{displayRating}</p>
                          </div>
                          <Star className="w-6 h-6 text-amber-500" />
                       </div>
                    </div>
                 </div>

                 <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
                    <Button variant="outline" asChild className="w-full h-12 rounded-xl bg-white/5 text-white border-white/10 hover:bg-white hover:text-slate-900 font-bold text-[9px] uppercase tracking-widest transition-all">
                       <Link to="/provider/earnings">View Full Analytics</Link>
                    </Button>
                 </div>
              </div>
           </div>
        </div>

        {/* Global Dispatch Heatmap Mockup or something else? */}
      </motion.div>
    </ProviderLayout>
  );
}



