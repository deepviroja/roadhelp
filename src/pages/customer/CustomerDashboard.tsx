import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Activity,
  History,
  ArrowRight,
  ChevronRight,
  Truck,
  PlusCircle,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  limit,
} from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { ActiveRequestCard } from "@/components/customer/ActiveRequestCard";
import { StatCard } from "@/components/admin/StatsOverview";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useServiceRequest } from "@/hooks/useServiceRequest";
import { ServiceRequest } from "@/types";
import { db } from "@/config/firebase";
import { formatDate, getServiceLabel, formatCurrency } from "@/lib/utils";
import { useSystemStore } from "@/stores/systemStore";

export default function CustomerDashboard() {
  const { profile } = useAuth();
  const { updateRequestStatus } = useServiceRequest();
  const navigate = useNavigate();
  const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);
  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState({ total: 0, totalSpent: 0, avgRating: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;

    // Listen to active requests in real time (including completed but unpaid, and pending user approval)
    const q = query(
      collection(db, "serviceRequests"),
      where("customerId", "==", profile.uid),
      where("status", "in", ["pending", "accepted", "arriving", "inProgress", "completed", "pendingUserApproval"]),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q,
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRequest));
        const active = docs.find(req => req.status !== 'completed' || !req.isPaid);
        if (active) {
          setActiveRequest(active);
        } else {
          setActiveRequest(null);
        }
      },
      (err) => {
        console.error('Active request snapshot error:', err);
      }
    );

    // Get recent history
    const historyQ = query(
      collection(db, "serviceRequests"),
      where("customerId", "==", profile.uid),
      orderBy("createdAt", "desc"),
      limit(10),
    );

    getDocs(historyQ).then((snap) => {
      const requests = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as ServiceRequest,
      );
      setRecentRequests(requests);
    });

    // Get all completed requests for accurate stats
    const statsQ = query(
      collection(db, "serviceRequests"),
      where("customerId", "==", profile.uid),
      where("status", "==", "completed")
    );

    getDocs(statsQ).then((snap) => {
      const requests = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as ServiceRequest,
      );
      const totalSpent = requests.reduce(
        (sum, r) => sum + (r.totalPrice || r.finalPrice || r.estimatedPrice || 0) + (r.tipAmount || 0),
        0,
      );
      const ratings = requests.filter((r) => r.rating).map((r) => r.rating!);
      const avgRating = ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0;

      setStats({ total: requests.length, totalSpent, avgRating });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  const handleCancelRequest = async () => {
    if (!activeRequest) return;
    try {
      await updateRequestStatus(activeRequest.id, "cancelled");
      toast.success("Request cancelled");
    } catch {
      toast.error("Failed to cancel request");
    }
  };

  return (
    <CustomerLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto pb-20"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
              Welcome, {profile?.fullName?.split(" ")[0]}
            </h1>
            <p className="text-slate-500 font-medium text-xs mt-1">
              {useSystemStore.getState().pageContent?.dashboardCustomerWelcome || "Here's what's happening with your account."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
              <span className="text-[10px] font-black uppercase text-green-700 tracking-widest leading-none">Account Active</span>
            </div>
          </div>
        </div>

        {/* Quick Action Deployment */}
        <AnimatePresence mode="wait">
          {!activeRequest ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-slate-900 rounded-3xl p-8 mb-10 text-white relative overflow-hidden group shadow-xl"
            >
              <div className="absolute top-0 right-0 w-[24rem] h-[24rem] bg-blue-600/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:scale-110 transition-transform duration-1000" />
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="text-center md:text-left">
                  <span className="px-3 py-1 bg-blue-600/20 border border-blue-500/20 rounded-full text-[9px] font-bold uppercase tracking-widest text-blue-400 mb-4 inline-block">Need help?</span>
                  <h2 className="text-3xl md:text-4xl font-black mb-2 tracking-tight leading-none">Stuck on the road?</h2>
                  <p className="text-slate-400 text-sm font-semibold max-w-md leading-relaxed">
                    Get matched with a verified roadside provider in a few simple steps.
                  </p>
                </div>
                <Button
                  asChild
                  className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-white hover:text-blue-600 text-white font-bold text-sm gap-3 shadow-lg transition-all group/btn transform hover:scale-105 active:scale-95 w-full md:w-auto"
                >
                  <Link to="/customer/new-request">
                    <PlusCircle className="w-5 h-5 group-hover/btn:rotate-90 transition-transform duration-500" />
                    Get Help Now
                  </Link>
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-12"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                  Track Your Request
                </h2>
              </div>
              <ActiveRequestCard
                request={activeRequest}
                onCancel={handleCancelRequest}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <StatCard label="Requests" value={stats.total} icon={History} color="blue" />
          <StatCard label="Total Spent" value={formatCurrency(stats.totalSpent)} icon={TrendingUp} color="green" />
          <StatCard label="Average Rating" value={stats.avgRating ? `${stats.avgRating.toFixed(1)}/5.0` : "N/A"} icon={Star} color="amber" />
        </div>

        {/* Operational Records */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-md shadow-slate-200/20 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between bg-slate-50/20 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm">
                <Activity className="w-5 h-5" />
              </div>
            <h2 className="text-lg font-black tracking-tight uppercase">Recent Requests</h2>
            </div>
            <Button variant="ghost" asChild className="rounded-xl h-10 px-4 font-bold uppercase text-[9px] tracking-widest text-slate-500 hover:text-blue-600">
              <Link to="/customer/history" className="flex items-center gap-2">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full mb-3" />
              <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Loading your history...</p>
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={<Zap className="w-12 h-12 text-slate-200" />}
                title="No requests yet"
                description="Your service history will appear here after your first booking."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/30">
                    <th className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Service</th>
                    <th className="px-4 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                    <th className="px-4 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cost</th>
                    <th className="px-4 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {recentRequests.map((req, idx) => (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        key={req.id}
                        onClick={() => navigate(`/customer/track/${req.id}`)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-all group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-6 flex-shrink-0">
                              <Truck className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-none mb-1 uppercase text-xs tracking-tight">{req.serviceName ?? getServiceLabel(req.serviceType)}</p>
                              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">#{req.id.slice(-8).toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{formatDate(req.createdAt)}</span>
                        </td>
                        <td className="px-4 py-4 font-bold text-slate-700 text-sm">
                          {req.finalPrice ? formatCurrency(req.finalPrice) : req.estimatedPrice ? formatCurrency(req.estimatedPrice) : "—"}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={req.status} className="scale-90 origin-left" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="icon" asChild className="opacity-0 group-hover:opacity-100 transition-all hover:bg-white shadow-sm rounded-xl h-8 w-8">
                            <Link to={`/track/${req.id}`}>
                              <ChevronRight className="w-4 h-4 text-blue-600" />
                            </Link>
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </CustomerLayout>
  );
}
