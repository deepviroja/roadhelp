import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IndianRupee,
  TrendingUp,
  Percent,
  Heart,
  Wallet,
  BarChart3,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { ProviderLayout } from "@/components/layout/ProviderLayout";
import { StatCard } from "@/components/admin/StatsOverview";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { useServiceRequest } from "@/hooks/useServiceRequest";
import { ServiceRequest } from "@/types";
import { formatDate, getServiceLabel, formatCurrency } from "@/lib/utils";
import { db } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Earnings() {
  const { profile } = useAuth();
  const { getProviderRequests } = useServiceRequest();
  const [jobs, setJobs] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState(0.15);
  const [payoutDelay, setPayoutDelay] = useState(7);

  useEffect(() => {
    if (!profile?.uid) return;

    const loadData = async () => {
      try {
        const [configSnap, data] = await Promise.all([
          getDoc(doc(db, "system", "config")),
          getProviderRequests(profile.uid),
        ]);

        let delay = 7;
        if (configSnap.exists()) {
          const cfg = configSnap.data();
          setCommissionRate((cfg.baseCommissionRate || 15) / 100);
          setPayoutDelay(cfg.payoutDelayDays || 7);
          delay = cfg.payoutDelayDays || 7;
        }

        const completedJobs = data.filter((j) => j.status === "completed");

        // Auto-settle completed requests past the delay days
        const now = new Date().getTime();
        const expiredJobs = completedJobs.filter((req) => {
          if (req.payoutStatus !== "pending") return false;
          const completedAt = req.completedAt ? (typeof (req.completedAt as any).toDate === 'function' ? (req.completedAt as any).toDate() : new Date(req.completedAt as any)) : null;
          if (!completedAt) return false;
          const diffDays = (now - completedAt.getTime()) / (1000 * 3600 * 24);
          return diffDays >= delay;
        });

        if (expiredJobs.length > 0) {
          const { writeBatch, serverTimestamp } = await import("firebase/firestore");
          const batch = writeBatch(db);
          expiredJobs.forEach((req) => {
            batch.update(doc(db, "serviceRequests", req.id), {
              payoutStatus: "paid",
              paidAt: serverTimestamp(),
            });
            req.payoutStatus = "paid";
            req.paidAt = new Date() as any;
          });
          await batch.commit();
        }

        setJobs(completedJobs);
      } catch (err) {
        console.error("Earnings sync error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [profile?.uid, getProviderRequests]);

  const totalServiceGross = jobs.reduce(
    (sum, j) => sum + (j.totalPrice || j.estimatedPrice || 0),
    0,
  );
  const totalTips = jobs.reduce((sum, j) => sum + (j.tipAmount || 0), 0);
  const totalCommission = jobs.reduce(
    (sum, j) => sum + (j.adminCommission !== undefined ? j.adminCommission : (j.totalPrice || j.estimatedPrice || 0) * commissionRate),
    0,
  );
  const totalNet = jobs.reduce(
    (sum, j) => sum + (j.providerEarnings !== undefined ? j.providerEarnings : (j.totalPrice || j.estimatedPrice || 0) * (1 - commissionRate)) + (j.tipAmount || 0),
    0,
  );

  return (
    <ProviderLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto pb-20"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
              My Earnings
            </h1>
            <p className="text-slate-500 font-medium text-xs mt-1">
              Track your income and job history.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:scale-150 transition-transform" />
            <div className="p-2 bg-blue-600 rounded-xl relative z-10">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 leading-none mb-1">
                Total Earnings
              </p>
              <p className="text-2xl font-black leading-none">
                {formatCurrency(totalNet)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <StatCard
            label="Service Gross"
            value={formatCurrency(totalServiceGross)}
            icon={IndianRupee}
            color="blue"
          />
          <StatCard
            label="Tips (100% Yours)"
            value={formatCurrency(totalTips)}
            icon={Heart}
            color="pink"
          />
          <StatCard
            label={`Platform Fee (${(commissionRate * 100).toFixed(0)}%)`}
            value={formatCurrency(totalCommission)}
            icon={Percent}
            color="red"
          />
          <StatCard
            label="Net Earnings"
            value={formatCurrency(totalNet)}
            icon={TrendingUp}
            color="green"
          />
        </div>

        <div className="bg-white rounded-[3.5rem] p-10 border-2 border-slate-50 flex flex-col md:flex-row items-center justify-between gap-10 overflow-hidden relative group shadow-xl shadow-slate-200/20 mb-16">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 text-center md:text-left flex-1">
            <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
              <Clock className="w-6 h-6 text-indigo-600" />
              Payout Timeline
            </h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl">
              after completing a job, held for{" "}
              <span className="text-indigo-600 font-bold">
                {payoutDelay} days
              </span>{" "}
              before being released to your account.
            </p>
          </div>
          <div className="relative z-10 flex flex-col items-center md:items-end bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">
              Platform Policy
            </p>
            <p className="text-xl font-black text-blue-400 mb-1">
              {payoutDelay}-Day Hold
            </p>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
              Current Policy
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-32 flex flex-col items-center bg-white rounded-[3rem] border-2 border-slate-50">
            <LoadingSpinner
              text="Loading Earnings..."
              className="w-12 h-12 text-blue-600 mb-4"
            />
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">
              Loading earnings...
            </p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-24 bg-white rounded-[3rem] border-2 border-slate-50 border-dashed">
            <EmptyState
              icon={<Zap className="w-16 h-16 text-slate-100" />}
              title="No completed jobs yet"
              description="Your earnings will appear here after completing your first job."
            />
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] border-2 border-slate-50 shadow-xl shadow-slate-200/20 overflow-hidden">
            <div className="px-10 py-10 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                 <IndianRupee className="w-4 h-4 text-green-600" />
                 Earnings History
              </h2>
              <div className="px-5 py-2 bg-green-50 rounded-full border border-green-100 text-[9px] font-black text-green-600 uppercase tracking-widest">
                {jobs.length} Total Jobs
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50">
                     <th className="text-left px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                       Service
                     </th>
                    <th className="text-left px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Timestamp
                    </th>
                    <th className="text-right px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Gross Value
                    </th>
                    <th className="text-right px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Cut & Tips
                    </th>
                     <th className="text-right px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                       Net Amount
                     </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <AnimatePresence>
                    {jobs.map((job, idx) => {
                      const serviceTotal =
                        job.totalPrice || job.estimatedPrice || 0;
                      const tip = job.tipAmount || 0;
                      const appFee = job.adminCommission !== undefined ? job.adminCommission : serviceTotal * commissionRate;
                      const net = job.providerEarnings !== undefined ? (job.providerEarnings + tip) : (serviceTotal - appFee + tip);
                      return (
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          key={job.id}
                          className="hover:bg-blue-50/30 transition-all group"
                        >
                          <td className="px-10 py-8">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-50 rounded-2xl border-2 border-white shadow-sm flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-6 transition-all">
                                <ShieldCheck className="w-6 h-6" />
                              </div>
                              <div className="relative">
                                <p className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-sm tracking-tight">
                                  {job.serviceName ??
                                    getServiceLabel(job.serviceType)}
                                </p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                  ID-#{job.id.slice(-8).toUpperCase()}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-8">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">
                              {formatDate(job.createdAt)}
                            </span>
                          </td>
                          <td className="px-6 py-8 text-right font-bold text-slate-600">
                            {formatCurrency(serviceTotal)}
                          </td>
                          <td className="px-6 py-8 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-black text-red-400 uppercase tracking-tight">
                                Fee: -{formatCurrency(appFee)}
                              </span>
                              {tip > 0 && (
                                <span className="text-[10px] font-black text-pink-500 uppercase tracking-tight">
                                  Tip: +{formatCurrency(tip)}
                                </span>
                              )}
                            </div>
                          </td>
                           <td className="px-10 py-8 text-right">
                             <div className="flex flex-col items-end">
                               <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
                                 {formatCurrency(net)}
                               </span>
                               {job.payoutStatus === 'paid' ? (
                                 <span className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1">
                                   CLEARED ✓
                                 </span>
                               ) : (
                                 <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1">
                                   HOLDING
                                 </span>
                               )}
                             </div>
                           </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </ProviderLayout>
  );
}
