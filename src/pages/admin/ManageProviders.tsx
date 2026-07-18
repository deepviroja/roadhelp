import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ShieldCheck, ShieldX, Star, Truck } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { db } from '@/config/firebase';
import { UserProfile } from '@/types';
import { getServiceLabel } from '@/lib/utils';

function isTimestampLike(value: unknown): value is { toMillis: () => number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in value &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  );
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  }
  if (isTimestampLike(value)) return value.toMillis();
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = (value as { seconds?: unknown }).seconds;
    if (typeof seconds === 'number') return seconds * 1000;
  }
  return 0;
}

export default function ManageProviders() {
  const [providers, setProviders] = useState<UserProfile[]>([]);
  const [filtered, setFiltered] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const data = snap.docs
          .map((d) => ({ uid: d.id, ...d.data() }) as UserProfile)
          .filter((u) => u.role === 'provider')
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setProviders(data);
        setFiltered(data);
      } catch (err) {
        console.error('Failed to load providers:', err);
        toast.error('Failed to synchronize assets');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const s = search.toLowerCase();
    let data = providers.filter((p) => p.fullName?.toLowerCase().includes(s) || p.email?.toLowerCase().includes(s));
    if (tab === 'verified') data = data.filter((p) => p.isVerified);
    if (tab === 'pending') data = data.filter((p) => !p.isVerified);
    if (tab === 'online') data = data.filter((p) => p.isOnline);
    setFiltered(data);
  }, [search, providers, tab]);

  const handleVerify = async (provider: UserProfile, verify: boolean) => {
    try {
      await updateDoc(doc(db, 'users', provider.uid), { isVerified: verify });
      setProviders((prev) => prev.map((p) => p.uid === provider.uid ? { ...p, isVerified: verify } : p));
      toast.success(verify ? `Unit ${provider.fullName} Authorized` : `Unit ${provider.fullName} Access Revoked`);
    } catch {
      toast.error('Protocol Update Failed');
    }
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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-blue-400 font-bold text-[10px] tracking-widest mb-4 uppercase">
               ASSET MANAGEMENT
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-[#1A1A2E] tracking-tight leading-none mb-2">Fleet Units</h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Validate and monitor operational field assets</p>
          </div>
          <div className="w-full md:w-80 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
              <Input 
                placeholder="SEARCH FLEET UNITS..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="h-12 pl-12 rounded-xl border-2 border-slate-100 bg-white shadow-sm text-xs font-bold uppercase tracking-widest placeholder:text-slate-400 focus:border-blue-500 transition-all" 
              />
          </div>
        </div>

        <div className="mb-8">
           <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="h-14 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm gap-1">
                <TabsTrigger value="all" className="rounded-xl font-bold uppercase text-[10px] tracking-widest px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white h-full transition-all">All Assets ({providers.length})</TabsTrigger>
                <TabsTrigger value="verified" className="rounded-xl font-bold uppercase text-[10px] tracking-widest px-6 data-[state=active]:bg-green-600 data-[state=active]:text-white h-full transition-all">Verified ({providers.filter((p) => p.isVerified).length})</TabsTrigger>
                <TabsTrigger value="pending" className="rounded-xl font-bold uppercase text-[10px] tracking-widest px-6 data-[state=active]:bg-amber-600 data-[state=active]:text-white h-full transition-all">Pending ({providers.filter((p) => !p.isVerified).length})</TabsTrigger>
                <TabsTrigger value="online" className="rounded-xl font-bold uppercase text-[10px] tracking-widest px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white h-full transition-all">Online ({providers.filter((p) => p.isOnline).length})</TabsTrigger>
              </TabsList>
            </Tabs>
        </div>

        <div className="glass-card rounded-3xl overflow-hidden">
          {isLoading ? (
            <div className="py-32 flex flex-col items-center">
               <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-600 rounded-2xl animate-spin mb-6" />
               <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.4em]">Synchronizing Fleet Telemetry...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-32 flex flex-col items-center text-center">
               <Truck className="w-24 h-24 text-slate-50 mb-8" />
               <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-4">No Units Detected</h3>
               <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] max-w-sm italic">Our scanners found no operational assets matching your search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Asset Identifier</th>
                    <th className="px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Capabilities</th>
                    <th className="px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Efficiency</th>
                    <th className="px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Missions</th>
                    <th className="px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocol Status</th>
                    <th className="px-6 py-5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => (
                    <tr key={p.uid} className="hover:bg-blue-50/50 transition-all group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-base shadow-md shadow-blue-600/20 group-hover:rotate-3 transition-transform">
                              {p.fullName?.[0]}
                           </div>
                           <div>
                              <p className="font-bold text-slate-900 leading-none mb-1 text-sm">{p.fullName}</p>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{p.companyName || 'Independent Unit'}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex flex-wrap gap-1">
                          {(p.serviceTypes || []).slice(0, 2).map((s) => (
                            <span key={s} className="text-[9px] font-bold uppercase tracking-widest bg-slate-900 text-white px-2 py-1 rounded-md">
                              {getServiceLabel(s)}
                            </span>
                          ))}
                          {(p.serviceTypes?.length || 0) > 2 && (
                            <span className="text-[10px] font-bold text-slate-400 ml-1">+{(p.serviceTypes?.length || 0) - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center">
                         <div className="flex items-center justify-center gap-1.5">
                            <span className="font-bold text-slate-900">{p.rating ? p.rating.toFixed(1) : '5.0'}</span>
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                         </div>
                      </td>
                      <td className="px-4 py-5 text-center">
                         <span className="font-bold text-slate-900">{p.totalJobs || 0}</span>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex flex-col gap-1.5">
                          {p.isVerified ? (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-green-600 bg-green-50 px-2 py-0.5 rounded-full w-fit">Authorized</span>
                          ) : (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full w-fit">In Triage</span>
                          )}
                          {p.isOnline && (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit">Uplink Active</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {!p.isVerified ? (
                          <Button 
                            className="h-10 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold uppercase text-[10px] tracking-widest gap-2 shadow-sm shadow-green-600/20 active:scale-95 transition-all" 
                            onClick={() => handleVerify(p, true)}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Verified
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            className="h-10 px-4 rounded-xl text-red-600 border-red-100 hover:bg-red-50 font-bold uppercase text-[10px] tracking-widest gap-2 active:scale-95 transition-all" 
                            onClick={() => handleVerify(p, false)}
                          >
                            <ShieldX className="w-3.5 h-3.5" /> Unverified
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </AdminLayout>
  );
}
