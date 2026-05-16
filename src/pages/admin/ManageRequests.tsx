import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatSafe } from '@/lib/date-utils';
import { Search, ClipboardList, Zap, Eye, Filter, Loader2, Star } from 'lucide-react';

import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { db } from '@/config/firebase';
import { ServiceRequest } from '@/types';
import { formatDate, getServiceLabel, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function ManageRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  useEffect(() => {
    getDocs(query(collection(db, 'serviceRequests'), orderBy('createdAt', 'desc'))).then((snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ServiceRequest);
      setRequests(data);
      setIsLoading(false);
    });
  }, []);

  const filteredRequests = useMemo(() => {
    let data = requests.filter((r) => 
      r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      r.serviceName?.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase())
    );
    if (tab !== 'all') {
      data = data.filter((r) => r.status === tab);
    }
    return data;
  }, [search, requests, tab]);

  const TABS = [
    { value: 'all', label: 'Omni Feed' },
    { value: 'pending', label: 'Triage' },
    { value: 'inProgress', label: 'In Field' },
    { value: 'completed', label: 'Concluded' },
    { value: 'cancelled', label: 'Aborted' },
  ];

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
               SATELLITE MONITORING
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-[#1A1A2E] tracking-tight leading-none mb-2">Mission Intelligence</h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Real-time global deployment and triage telemetry</p>
          </div>
          <div className="w-full md:w-80 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
              <Input 
                placeholder="SEARCH MISSION LOGS..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="h-12 pl-12 rounded-xl border-2 border-slate-100 bg-white shadow-sm text-xs font-bold uppercase tracking-widest placeholder:text-slate-400 focus:border-blue-500 transition-all" 
              />
          </div>
        </div>

        <div className="mb-8">
           <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="h-14 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm gap-1">
                {TABS.map((t) => (
                  <TabsTrigger 
                    key={t.value} 
                    value={t.value}
                    className="rounded-xl font-bold uppercase text-[10px] tracking-widest px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all h-full"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
        </div>

        <div className="glass-card rounded-3xl overflow-hidden">
          {isLoading ? (
            <div className="py-32 flex flex-col items-center">
               <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-600 rounded-2xl animate-spin mb-6" />
               <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.4em]">Decoding Mission Telemetry...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-32 flex flex-col items-center text-center">
               <ClipboardList className="w-24 h-24 text-slate-50 mb-8" />
               <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-4">No Missions Found</h3>
               <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] max-w-sm italic">Our sensors found no active or archived deployments matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocol ID</th>
                    <th className="px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mission Context</th>
                    <th className="px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Personnel</th>
                    <th className="px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Field Outcome</th>
                    <th className="px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-4 py-5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Valuation</th>
                    <th className="px-6 py-5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                  {filteredRequests.map((req, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      key={req.id} 
                      className="hover:bg-blue-50/50 transition-all group cursor-pointer"
                      onClick={() => setSelectedRequest(req)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <Zap className="w-4 h-4" />
                           </div>
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">#{req.id.slice(-8).toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex flex-col">
                           <span className="font-bold text-slate-900 leading-tight mb-1 text-sm">{req.serviceName ?? getServiceLabel(req.serviceType)}</span>
                           <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Level 1 Response</span>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex flex-col gap-1">
                           <p className="font-bold text-slate-900 leading-none mb-1 text-sm">{req.customerName}</p>
                           {req.providerName ? (
                             <div className="flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{req.providerName}</span>
                             </div>
                           ) : (
                             <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Awaiting Unit</span>
                           )}
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex flex-col">
                           {req.rating ? (
                             <div className="flex flex-col gap-1">
                               <div className="flex gap-0.5">
                                 {[...Array(5)].map((_, i) => (
                                   <Star key={i} className={`w-3 h-3 ${i < req.rating! ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                 ))}
                               </div>
                               <p className="text-[10px] font-semibold text-slate-500 italic line-clamp-1 max-w-[120px] leading-tight">"{req.review}"</p>
                             </div>
                           ) : (
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">NO INTEL</span>
                           )}
                        </div>
                      </td>
                      <td className="px-4 py-5">
                         <StatusBadge status={req.status} className="scale-90 origin-left" />
                      </td>
                      <td className="px-4 py-5 text-right">
                         <div className="flex flex-col items-end">
                            <span className="font-bold text-slate-900 text-sm leading-none">
                               {req.finalPrice ? formatCurrency(req.finalPrice) : req.estimatedPrice ? formatCurrency(req.estimatedPrice) : '—'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Net Yield</span>
                         </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                         <div className="flex items-center justify-end gap-3">
                            <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors uppercase tracking-widest">{formatDate(req.createdAt)}</span>
                            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-600 opacity-0 group-hover:opacity-100 transition-all border border-slate-100">
                               <Eye className="w-4 h-4" />
                            </div>
                         </div>
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

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-2xl rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          {selectedRequest && (
            <div className="flex flex-col max-h-[85vh]">
              <div className="bg-slate-900 p-8 text-white relative">
                 <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/20 rounded-full blur-[80px] -mr-24 -mt-24" />
                 <div className="relative z-10">
                   <div className="flex items-center justify-between mb-6">
                     <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/20 border border-blue-500/20 rounded-full text-blue-400 font-bold text-[10px] tracking-widest uppercase backdrop-blur-md">
                        MISSION LOG ANALYTICS
                     </div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {formatDate(selectedRequest.createdAt)}
                     </span>
                   </div>
                   <h2 className="text-3xl font-black tracking-tight mb-2 uppercase leading-none">
                     {selectedRequest.serviceName || getServiceLabel(selectedRequest.serviceType)}
                   </h2>
                   <p className="font-bold text-xs text-slate-400 uppercase tracking-widest">
                     PROTOCOL: {selectedRequest.id.toUpperCase()}
                   </p>
                 </div>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-3 leading-none">Dispatcher Info</p>
                       <p className="text-xl font-bold text-slate-900 leading-none mb-2">{selectedRequest.customerName}</p>
                       <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{selectedRequest.customerPhone || 'UNAVAILABLE'}</p>
                    </div>
                    <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-white">
                       <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-3 leading-none">Deployed Unit</p>
                       <p className="text-xl font-bold leading-none mb-2">{selectedRequest.providerName || 'AWAITING SELECTION'}</p>
                       <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">MISSION STATUS: {selectedRequest.status}</p>
                    </div>
                 </div>

                 {selectedRequest.status === 'completed' && (
                   <div className="space-y-6">
                      <div className="flex items-center gap-3">
                         <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                         <h3 className="text-base font-black uppercase tracking-tight text-slate-900">Field Intelligence Report</h3>
                      </div>
                      
                      {selectedRequest.rating ? (
                         <div className="p-6 glass-card rounded-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 blur-xl" />
                            <div className="flex items-center gap-1 mb-4 relative z-10">
                               {[...Array(5)].map((_, i) => (
                                 <Star key={i} className={`w-5 h-5 ${i < selectedRequest.rating! ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                               ))}
                            </div>
                            <p className="text-lg font-bold text-slate-800 leading-relaxed italic relative z-10 tracking-tight">
                               "{selectedRequest.review}"
                            </p>
                         </div>
                      ) : (
                         <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Intelligence Pipeline Empty</p>
                         </div>
                      )}
                   </div>
                 )}

                 <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-all" />
                    <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4 relative z-10">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Yield Breakdown</span>
                       <StatusBadge status={selectedRequest.status} />
                    </div>
                    <div className="space-y-4 relative z-10">
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Protocol Fee</span>
                          <span className="text-lg font-bold">{formatCurrency(selectedRequest.totalPrice || selectedRequest.estimatedPrice || 0)}</span>
                       </div>
                       {selectedRequest.tipAmount && (
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Performance Premium</span>
                            <span className="text-lg font-bold text-green-500">{formatCurrency(selectedRequest.tipAmount)}</span>
                         </div>
                       )}
                       <div className="flex justify-between items-center pt-6 border-t border-white/10 mt-6">
                          <span className="text-base font-bold uppercase tracking-tight">Total Protocol Yield</span>
                          <span className="text-2xl font-black tracking-tight text-blue-400">
                             {formatCurrency((selectedRequest.totalPrice || selectedRequest.estimatedPrice || 0) + (selectedRequest.tipAmount || 0))}
                          </span>
                       </div>
                    </div>
                 </div>

                 <Button 
                   onClick={() => setSelectedRequest(null)}
                   className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-blue-600 text-white font-bold uppercase text-xs tracking-widest transition-all shadow-md"
                 >
                   TERMINATE ANALYSIS
                 </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
