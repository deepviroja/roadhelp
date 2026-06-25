import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Truck, ClipboardList, IndianRupee, Star, Activity, Zap, ShieldCheck } from "lucide-react";
import { collection, getDocs, query, orderBy, where, limit } from "firebase/firestore";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/admin/StatsOverview";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { db } from "@/config/firebase";
import { UserProfile, ServiceRequest } from "@/types";
import { formatDate, getServiceLabel, formatCurrency } from "@/lib/utils";
import { COMMISSION_RATE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    customers: 0,
    providers: 0,
    activeProviders: 0,
    requests: 0,
    revenue: 0,
  });
  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersSnap, recentRequestsSnap, allRequestsSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(
            query(
              collection(db, "serviceRequests"),
              orderBy("createdAt", "desc"),
              limit(50),
            ),
          ),
          getDocs(collection(db, "serviceRequests"))
        ]);

        const users = usersSnap.docs.map((d) => d.data() as UserProfile);
        const customers = users.filter((u) => u.role === "customer").length;
        const providersList = users.filter((u) => u.role === "provider");
        const providers = providersList.length;
        const activeProviders = providersList.filter((u) => u.isOnline).length;

        const allRequests = allRequestsSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as ServiceRequest,
        );
        const revenue = allRequests
          .filter((r) => r.status === "completed" && (r.finalPrice || r.totalPrice || r.estimatedPrice))
          .reduce((sum, r) => sum + (r.adminCommission || (r.totalPrice || r.finalPrice || r.estimatedPrice || 0) * COMMISSION_RATE), 0);

        setStats({
          customers,
          providers,
          activeProviders,
          requests: allRequestsSnap.size,
          revenue,
        });
        
        const recentRequestsData = recentRequestsSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as ServiceRequest,
        );
        setRecentRequests(recentRequestsData.slice(0, 10));
      } catch (error) {
        console.error("Failed to load admin stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    // Force a re-render/re-fetch by briefly toggling state, 
    // or just rely on the effect if we pull the loadData function out.
    // We'll just reload the page for a true hard refresh of all data:
    window.location.reload();
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto pb-20"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-blue-400 font-bold text-[10px] tracking-widest mb-4 uppercase">
               SYSTEM CORE: ONLINE
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-[#1A1A2E] tracking-tight leading-none mb-2">Global Command</h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">RoadHelp Central Intelligence Terminal</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="px-6 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-2">Provider Online Status</p>
                <div className="flex items-center gap-2">
                   <div className="flex-1 h-1 w-20 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.providers > 0 ? Math.round((stats.activeProviders / stats.providers) * 100) : 0}%` }}
                        className="h-full bg-blue-600 rounded-full"
                      />
                   </div>
                   <span className="text-[10px] font-bold text-blue-600 leading-none">{stats.activeProviders} / {stats.providers}</span>
                </div>
             </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-24 flex flex-col items-center">
             <div className="w-10 h-10 border-4 border-blue-600/10 border-t-blue-600 rounded-xl animate-spin mb-4" />
             <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Establishing Master Link...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <StatCard
                label="Total Customers"
                value={stats.customers}
                icon={Users}
                color="blue"
              />
              <StatCard
                label="Total Providers"
                value={stats.providers}
                icon={Truck}
                color="green"
              />
              <StatCard
                label="Total Requests"
                value={stats.requests}
                icon={ClipboardList}
                color="purple"
              />
              <StatCard
                label="Total Revenue"
                value={formatCurrency(stats.revenue)}
                icon={IndianRupee}
                color="amber"
              />
            </div>

            <div className="grid grid-cols-1 gap-8 mb-16">
               {/* Health Monitor */}
               <div className="lg:col-span-4">
                  <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl h-full relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/20 rounded-full blur-2xl -mr-12 -mt-12 group-hover:scale-125 transition-all duration-700" />
                     <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 border-b border-white/10 pb-3 relative z-10">System Overview</h3>
                     <div className="space-y-6 relative z-10">
                        <div className="flex items-center justify-between">
                           <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Customers</p>
                              <p className="text-base font-bold tracking-tight">{stats.customers}</p>
                           </div>
                           <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center text-green-500">
                              <Users className="w-4 h-4" />
                           </div>
                        </div>
                        <div className="flex items-center justify-between">
                           <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Providers</p>
                              <p className="text-base font-bold tracking-tight">{stats.providers}</p>
                           </div>
                           <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-500">
                              <Truck className="w-4 h-4" />
                           </div>
                        </div>
                        <div className="flex items-center justify-between">
                           <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Revenue</p>
                              <p className="text-base font-bold tracking-tight">{formatCurrency(stats.revenue)}</p>
                           </div>
                           <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-500">
                              <IndianRupee className="w-4 h-4" />
                           </div>
                        </div>
                     </div>
                     <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
                        <Button 
                          onClick={handleRefresh}
                          className="w-full h-12 rounded-xl bg-white text-slate-900 hover:bg-blue-600 hover:text-white font-bold text-[9px] uppercase tracking-widest transition-all"
                        >
                           Refresh Statistics
                        </Button>
                     </div>
                  </div>
               </div>
               {/* Live Feed */}
               <div className="lg:col-span-8">
                  <div className="glass-card rounded-3xl overflow-hidden">
                     <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-600/30">
                              <Activity className="w-5 h-5" />
                           </div>
                           <h2 className="text-lg font-black tracking-tight uppercase">Operational Logs</h2>
                        </div>
                        <Button variant="ghost" asChild className="rounded-xl h-10 px-4 font-bold uppercase text-[9px] tracking-widest text-slate-500 hover:text-blue-600">
                           <Link to="/admin/requests">Full Archives</Link>
                        </Button>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="bg-slate-50/50 border-b border-slate-100">
                                 <th className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Protocol ID</th>
                                 <th className="px-4 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Subject</th>
                                 <th className="px-4 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Mission Type</th>
                                 <th className="px-4 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                 <th className="px-6 py-4 text-right text-[9px] font-bold text-slate-500 uppercase tracking-widest">Yield</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {recentRequests.map((req) => (
                                 <tr key={req.id} className="hover:bg-blue-50/50 transition-all group">
                                    <td className="px-6 py-4">
                                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">#{req.id.slice(-8).toUpperCase()}</span>
                                    </td>
                                    <td className="px-4 py-4">
                                       <p className="font-bold text-slate-900 leading-none mb-1 text-xs">{req.customerName}</p>
                                       <p className="text-[9px] font-semibold text-slate-500 uppercase">{formatDate(req.createdAt)}</p>
                                    </td>
                                    <td className="px-4 py-4">
                                       <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">{req.serviceName ?? getServiceLabel(req.serviceType)}</span>
                                    </td>
                                    <td className="px-4 py-4">
                                       <StatusBadge status={req.status} className="scale-90 origin-left" />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <span className="font-bold text-slate-900 text-sm">{req.finalPrice ? formatCurrency(req.finalPrice) : "—"}</span>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>


            </div>

            <div className="mt-10">
              <PageHeader
                title="Mission Feedback"
                subtitle="Recent customer ratings and intelligence reports"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {recentRequests.filter(r => r.rating).slice(0, 6).map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 glass-card rounded-3xl hover:shadow-lg transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-3xl group-hover:scale-110 transition-transform" />
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < (req.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                        #{req.id.slice(-8).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-semibold italic leading-relaxed mb-6 group-hover:text-slate-900 transition-colors">
                      "{req.review || 'Exceptional service provided'}"
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div>
                        <p className="text-[11px] font-bold text-slate-900 leading-none mb-1 uppercase tracking-tight">{req.customerName}</p>
                        <p className="text-[9px] font-semibold text-blue-600 uppercase tracking-widest">{req.serviceName || getServiceLabel(req.serviceType)}</p>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{formatDate(req.createdAt)}</span>
                    </div>
                  </motion.div>
                ))}
                {recentRequests.filter(r => r.rating).length === 0 && (
                  <div className="col-span-full py-24 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center">
                     <Star className="w-12 h-12 text-slate-200 mb-4" />
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No active feedback telemetry detected</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AdminLayout>
  );
}
