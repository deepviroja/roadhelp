import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import {
  TrendingUp,
  IndianRupee,
  Calendar,
  Activity,
  BarChart3,
  CreditCard,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/admin/StatsOverview";
import { db } from "@/config/firebase";
import { ServiceRequest } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { formatSafe, ensureDate } from "@/lib/date-utils";

export default function AdminRevenue() {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<ServiceRequest[]>([]);
  const [commissionRate, setCommissionRate] = useState(0.15);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    thisMonth: 0,
    avgTransaction: 0,
    activeCommission: 0.15,
  });

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const [configSnap, requestsSnap] = await Promise.all([
          getDoc(doc(db, "system", "config")),
          getDocs(
            query(
              collection(db, "serviceRequests"),
              orderBy("createdAt", "desc"),
            ),
          ),
        ]);

        const rate = configSnap.exists()
          ? configSnap.data().baseCommissionRate / 100
          : 0.15;
        setCommissionRate(rate);

        const reqs = requestsSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as ServiceRequest,
        );
        const completed = reqs.filter(
          (r) => r.status === "completed" && r.finalPrice != null,
        );

        const total = completed.reduce(
          (sum, r) => sum + r.finalPrice! * rate,
          0,
        );

        // Month logic
        const now = new Date();
        const firstOfCurrentMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        ).getTime();

        const thisMonth = completed
          .filter((r) => {
            const date = ensureDate(r.createdAt);
            return date.getTime() > firstOfCurrentMonth;
          })

          .reduce((sum, r) => sum + r.finalPrice! * rate, 0);

        const avg =
          completed.length > 0
            ? completed.reduce((sum, r) => sum + (r.finalPrice || 0), 0) /
              completed.length
            : 0;

        setStats({
          totalRevenue: total,
          thisMonth: thisMonth,
          avgTransaction: avg,
          activeCommission: rate,
        });

        setTransactions(completed);
      } catch (err) {
        console.error("Revenue sync failure:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRevenue();
  }, []);

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto pb-20"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
              Financial Ledger
            </h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
              Platform Yields & Transaction Intelligence
            </p>
          </div>
          <div className="flex items-center gap-4 bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] shadow-2xl">
            <div className="p-2 bg-blue-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 leading-none mb-1">
                Active Policy
              </p>
              <p className="text-lg font-black leading-none">
                {(stats.activeCommission * 100).toFixed(1)}% Commission
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-16">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 bg-white rounded-[2.5rem] animate-pulse border-2 border-slate-50"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-16">
              <StatCard
                label="Platform Total Yield"
                value={formatCurrency(stats.totalRevenue)}
                icon={IndianRupee}
                color="green"
              />
              <StatCard
                label="Current Month Net"
                value={formatCurrency(stats.thisMonth)}
                icon={Calendar}
                color="blue"
              />
              <StatCard
                label="Avg. Order Value"
                value={formatCurrency(stats.avgTransaction)}
                icon={Activity}
                color="indigo"
              />
            </div>

            <div className="bg-white rounded-[3rem] border-2 border-slate-50 shadow-xl shadow-slate-200/20 overflow-hidden">
              <div className="px-10 py-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-black flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                    Transaction Matrix
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 italic">
                    Real-time settlement history of verified completed services
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="px-4 py-2 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">
                      Master Ledger Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="text-left px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Transaction ID
                      </th>
                      <th className="text-left px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Deployment Type
                      </th>
                      <th className="text-left px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Gross Value
                      </th>
                      <th className="text-left px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Platform Yield
                      </th>
                      <th className="text-left px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Provider Cut
                      </th>
                      <th className="text-right px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Cleared Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence>
                      {transactions.map((req, idx) => {
                        const total = req.finalPrice || 0;
                        const fee = total * commissionRate;
                        const providerEarned = total - fee;
                        return (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.03 }}
                            key={req.id}
                            className="hover:bg-blue-50/30 transition-all group"
                          >
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                  <CreditCard className="w-4 h-4" />
                                </div>
                                <span className="font-mono text-xs font-black text-slate-400 group-hover:text-blue-600 transition-colors">
                                  #{req.id.slice(-8).toUpperCase()}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <span className="font-black text-slate-900 group-hover:translate-x-1 inline-block transition-transform">
                                {req.serviceName ??
                                  req.serviceType
                                    .replace(/([A-Z])/g, " $1")
                                    .trim()}
                              </span>
                            </td>
                            <td className="px-6 py-6">
                              <span className="font-bold text-slate-600">
                                {formatCurrency(total)}
                              </span>
                            </td>
                            <td className="px-6 py-6">
                              <div className="flex flex-col">
                                <span className="font-black text-green-600">
                                  +{formatCurrency(fee)}
                                </span>
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tight">
                                  {(commissionRate * 100).toFixed(0)}% Fee
                                  Captured
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <span className="font-bold text-slate-900">
                                {formatCurrency(providerEarned)}
                              </span>
                            </td>
                            <td className="px-10 py-6 text-right">
                              <span className="text-[11px] font-black text-slate-400 group-hover:text-slate-900 transition-colors uppercase tracking-widest">
                                {formatSafe(req.createdAt)}
                              </span>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-10 py-32 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                              <IndianRupee className="w-10 h-10 text-slate-200" />
                            </div>
                            <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">
                              No valid transactions in period
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AdminLayout>
  );
}
