import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  Search,
  ArrowUpRight,
  TrendingUp,
  IndianRupee,
  BarChart3,
  ShieldCheck,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { db } from "@/config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { ServiceRequest } from "@/types";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

function toJsDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null) {
    const withToDate = value as { toDate?: unknown };
    if (typeof withToDate.toDate === "function") {
      return (withToDate.toDate as () => Date)();
    }
    const withToMillis = value as { toMillis?: unknown };
    if (typeof withToMillis.toMillis === "function") {
      return new Date((withToMillis.toMillis as () => number)());
    }
  }
  return null;
}

function toMillis(value: unknown): number {
  return toJsDate(value)?.getTime() ?? 0;
}

export default function AdminPayouts() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "settled" | "paid">(
    "pending",
  );
  const [search, setSearch] = useState("");
  const [payoutDelay, setPayoutDelay] = useState(7);

  const loadPayouts = async () => {
    setIsLoading(true);
    try {
      const configSnap = await getDoc(doc(db, "system", "config"));
      const delay = configSnap.data()?.payoutDelayDays || 7;
      setPayoutDelay(delay);

      const q = query(
        collection(db, "serviceRequests"),
        where("status", "==", "completed"),
      );
      const snap = await getDocs(q);
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as ServiceRequest)
        .sort((a, b) => {
          const tA = toMillis(a.completedAt);
          const tB = toMillis(b.completedAt);
          return tB - tA;
        });
      setRequests(data);
    } catch (err) {
      console.error("Payout sync error:", err);
      toast.error("Failed to load payout intelligence");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const handleMarkAsPaid = async (requestId: string) => {
    try {
      await updateDoc(doc(db, "serviceRequests", requestId), {
        payoutStatus: "paid",
        paidAt: serverTimestamp(),
      });
      toast.success("Settlement verified and finalized");
      loadPayouts();
    } catch (error) {
      toast.error("Failed to update settlement status");
    }
  };

  const filteredRequests = requests.filter((req) => {
    const providerName = req.providerName?.toLowerCase() || "";
    const reqId = req.id?.toLowerCase() || "";
    const matchesSearch =
      providerName.includes(search.toLowerCase()) ||
      reqId.includes(search.toLowerCase());

    if (filter === "settled") {
      if (req.payoutStatus !== "pending") return false;
      const completedAt = toJsDate(req.completedAt);
      if (!completedAt) return false;
      const diffDays =
        (new Date().getTime() - completedAt.getTime()) / (1000 * 3600 * 24);
      return diffDays >= payoutDelay && matchesSearch;
    }

    return req.payoutStatus === filter && matchesSearch;
  });

  const totalPending = requests
    .filter((r) => r.payoutStatus === "pending")
    .reduce((sum, r) => sum + (r.providerEarnings || 0), 0);

  const totalPaid = requests
    .filter((r) => r.payoutStatus === "paid")
    .reduce((sum, r) => sum + (r.providerEarnings || 0), 0);

  const totalCommission = requests.reduce(
    (sum, r) => sum + (r.adminCommission || 0),
    0,
  );

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto pb-20"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Provider Payouts & Commission
            </h1>
            <p className="text-slate-500 font-medium text-xs mt-1">
              Manage provider balances, verify completed payouts, and track platform commissions.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-[1.75rem] border-2 border-slate-50 shadow-sm">
            {(["pending", "settled", "paid"] as const).map((t) => (
              <Button
                key={t}
                variant={filter === t ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(t)}
                className={`rounded-[1.25rem] px-8 h-12 font-black uppercase text-[9px] tracking-widest transition-all ${
                  filter === t
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {t === "settled" ? "Ready to Pay" : t}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-sm p-8 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-bl-[3rem] group-hover:scale-110 transition-transform" />
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-2">
              Pending Amount
            </p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
              {formatCurrency(totalPending)}
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-3">
              waiting for payout
            </p>
          </div>

          <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-sm p-8 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-600/5 rounded-bl-[3rem] group-hover:scale-110 transition-transform" />
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-2">
              Paid Out
            </p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
              {formatCurrency(totalPaid)}
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-3 text-green-600 font-bold">
              Paid
            </p>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-[3rem] group-hover:scale-110 transition-transform" />
            <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 mb-6 backdrop-blur-sm border border-blue-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-2">
              Commission Earned
            </p>
            <h3 className="text-4xl font-black text-white tracking-tighter">
              {formatCurrency(totalCommission)}
            </h3>
            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-tight mt-3">
              Platform earnings
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] border-2 border-slate-50 shadow-xl shadow-slate-200/20 overflow-hidden">
          <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/20">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <Input
                placeholder="Search providers or request IDs..."
                className="h-16 pl-16 pr-8 rounded-2xl border-2 border-white bg-white shadow-sm font-bold text-lg focus:border-blue-500/30 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="px-6 py-3 bg-white rounded-2xl border border-slate-100 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
                Policy: {payoutDelay} Day Hold
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">
                    Provider
                  </th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">
                    Job Valuation
                  </th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">
                    Commission
                  </th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">
                    Net Settlement
                  </th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">
                    Status
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-32 text-center">
                        <div className="flex flex-col items-center">
                          <BarChart3 className="w-12 h-12 text-slate-100 animate-pulse mb-4" />
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                            Loading payout data...
                          </p>

                        </div>
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-32 text-center font-black text-[10px] uppercase text-slate-300 tracking-[0.3em]"
                      >
                        Zero matching records
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req, idx) => {
                      const completedDate = toJsDate(req.completedAt);
                      return (
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          key={req.id}
                          className="hover:bg-blue-50/30 transition-all group"
                        >
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Wallet className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {req.providerName || "Unknown Provider"}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold font-mono tracking-tighter">
                                  ID-#{req.id.slice(-8).toUpperCase()}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 font-bold text-slate-900">
                            {formatCurrency(req.totalPrice || 0)}
                          </td>
                          <td className="px-6 py-6 text-red-500 font-bold">
                            -{formatCurrency(req.adminCommission || 0)}
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 text-xl tracking-tighter leading-none">
                                {formatCurrency(req.providerEarnings || 0)}
                              </span>
                              {completedDate && (
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight mt-1">
                                  {format(completedDate, "MMM dd, HH:mm")}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            {filter === "settled" ? (
                              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-lg border border-amber-100 w-fit">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span className="font-black uppercase text-[9px] text-amber-600 tracking-widest">
                                  Ready for Settlement
                                </span>
                              </div>
                            ) : (
                              <div
                                className={`flex items-center gap-2 px-3 py-1 rounded-lg border w-fit ${
                                  req.payoutStatus === "paid"
                                    ? "bg-green-50 border-green-100 text-green-600"
                                    : "bg-blue-50 border-blue-100 text-blue-600"
                                }`}
                              >
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${req.payoutStatus === "paid" ? "bg-green-500" : "bg-blue-500"}`}
                                />
                                <span className="font-black uppercase text-[9px] tracking-widest">
                                  {req.payoutStatus || "Awaiting"}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-10 py-6 text-right">
                            {req.payoutStatus !== "paid" && (
                              <Button
                                onClick={() => handleMarkAsPaid(req.id)}
                                className="bg-slate-900 hover:bg-blue-600 text-white h-11 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-sm transition-all group/btn"
                              >
                                Mark as Paid
                                <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                              </Button>
                            )}
                            {req.payoutStatus === "paid" && (
                              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center justify-end gap-2 pr-4">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />{" "}
                                Disbursed
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
