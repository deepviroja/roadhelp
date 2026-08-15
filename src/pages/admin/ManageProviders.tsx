import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ShieldCheck, ShieldX, Star, Truck } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminLayout } from '@/components/layout/AdminLayout';
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
        toast.error('Failed to load service providers');
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
      toast.success(verify ? `Provider ${provider.fullName} verified` : `Provider ${provider.fullName} unverified`);
    } catch {
      toast.error('Failed to update provider status');
    }
  };

  return (
    <AdminLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="container-app pb-20 space-y-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Providers Management</h1>
            <p className="text-slate-500 font-medium text-xs mt-1">Review, verify, and monitor roadside service provider accounts.</p>
          </div>
          <div className="w-full md:w-80 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input 
                placeholder="Search provider name or email..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="h-12 pl-12 rounded-2xl bg-white border-slate-200 text-xs font-semibold" 
              />
          </div>
        </div>

        <div>
           <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="h-12 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-sm gap-1">
                <TabsTrigger value="all" className="rounded-xl font-black uppercase text-xs tracking-wider px-5 data-[state=active]:bg-blue-600 data-[state=active]:text-white h-full transition-all">All ({providers.length})</TabsTrigger>
                <TabsTrigger value="verified" className="rounded-xl font-black uppercase text-xs tracking-wider px-5 data-[state=active]:bg-green-600 data-[state=active]:text-white h-full transition-all">Verified ({providers.filter((p) => p.isVerified).length})</TabsTrigger>
                <TabsTrigger value="pending" className="rounded-xl font-black uppercase text-xs tracking-wider px-5 data-[state=active]:bg-amber-600 data-[state=active]:text-white h-full transition-all">Pending ({providers.filter((p) => !p.isVerified).length})</TabsTrigger>
                <TabsTrigger value="online" className="rounded-xl font-black uppercase text-xs tracking-wider px-5 data-[state=active]:bg-blue-600 data-[state=active]:text-white h-full transition-all">Online ({providers.filter((p) => p.isOnline).length})</TabsTrigger>
              </TabsList>
            </Tabs>
        </div>

        <div className="rounded-[2rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5 overflow-hidden">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center">
               <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
               <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading service providers...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 flex flex-col items-center text-center">
               <Truck className="w-16 h-16 text-slate-200 mb-4" />
               <h3 className="text-xl font-black text-slate-900 mb-1">No Providers Found</h3>
               <p className="text-slate-500 text-xs max-w-sm">No service providers matched your search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Provider</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Services Offered</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Rating</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Jobs Completed</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => (
                    <tr key={p.uid} className="hover:bg-slate-50/60 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                              {p.fullName?.[0] || 'P'}
                           </div>
                           <div>
                              <p className="font-bold text-slate-900 text-sm leading-tight">{p.fullName}</p>
                              <p className="text-xs text-slate-500 font-semibold">{p.email}</p>
                              {p.companyName && <p className="text-[10px] text-slate-400 font-medium">{p.companyName}</p>}
                           </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(p.serviceTypes || []).slice(0, 2).map((s) => (
                            <span key={s} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                              {getServiceLabel(s)}
                            </span>
                          ))}
                          {(p.serviceTypes?.length || 0) > 2 && (
                            <span className="text-[10px] font-bold text-slate-400 ml-1">+{(p.serviceTypes?.length || 0) - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                         <div className="flex items-center justify-center gap-1">
                            <span className="font-bold text-slate-900 text-xs">{(p.totalJobs && p.totalJobs > 0 && p.rating) ? p.rating.toFixed(1) : 'N/A'}</span>
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                         </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                         <span className="font-bold text-slate-900 text-xs">{p.totalJobs || 0}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${p.isVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {p.isVerified ? 'Verified' : 'Pending'}
                          </span>
                          {p.isOnline && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              Online
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!p.isVerified ? (
                          <Button 
                            className="h-9 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black text-xs uppercase tracking-wider gap-1.5" 
                            onClick={() => handleVerify(p, true)}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Verify
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            className="h-9 px-4 rounded-xl text-red-600 border-red-200 hover:bg-red-50 font-black text-xs uppercase tracking-wider gap-1.5" 
                            onClick={() => handleVerify(p, false)}
                          >
                            <ShieldX className="w-3.5 h-3.5" /> Unverify
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

