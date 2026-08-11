import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ClipboardList, Zap, Eye, Star, AlertTriangle } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
    { value: 'all', label: 'All Requests' },
    { value: 'pending', label: 'Pending' },
    { value: 'inProgress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <AdminLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="max-w-7xl mx-auto pb-20 space-y-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Service Requests Management</h1>
            <p className="text-slate-500 font-medium text-xs mt-1">Real-time oversight of customer assistance requests and assigned providers.</p>
          </div>
          <div className="w-full md:w-80 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input 
                placeholder="Search by customer, service or ID..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="h-12 pl-12 rounded-2xl bg-white border-slate-200 text-xs font-semibold" 
              />
          </div>
        </div>

        <div>
           <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="h-12 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-sm gap-1">
                {TABS.map((t) => (
                  <TabsTrigger 
                    key={t.value} 
                    value={t.value}
                    className="rounded-xl font-black uppercase text-xs tracking-wider px-5 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all h-full"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center">
               <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
               <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading service requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-24 flex flex-col items-center text-center">
               <ClipboardList className="w-16 h-16 text-slate-200 mb-4" />
               <h3 className="text-xl font-black text-slate-900 mb-1">No Requests Found</h3>
               <p className="text-slate-500 text-xs max-w-sm">No roadside requests matched your search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Request ID</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer & Provider</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Review</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Price</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
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
                      className="hover:bg-slate-50/60 transition-all cursor-pointer"
                      onClick={() => setSelectedRequest(req)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-600">#{req.id.slice(-8).toUpperCase()}</span>
                          {req.isEmergency && (
                            <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase animate-pulse">SOS</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-black text-slate-900 text-sm">{req.serviceName ?? getServiceLabel(req.serviceType)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                           <p className="font-bold text-slate-900 text-xs">{req.customerName}</p>
                           {req.providerName ? (
                             <span className="text-[10px] text-slate-500">Provider: {req.providerName}</span>
                           ) : (
                             <span className="text-[10px] text-amber-600 font-bold">Unassigned</span>
                           )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                         {req.rating ? (
                           <div className="flex items-center gap-1">
                             <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                             <span className="text-xs font-bold text-slate-900">{req.rating}/5</span>
                           </div>
                         ) : (
                           <span className="text-[10px] text-slate-400">No review</span>
                         )}
                      </td>
                      <td className="px-4 py-4">
                         <StatusBadge status={req.status} />
                      </td>
                      <td className="px-4 py-4 text-right">
                         <span className="font-black text-slate-900 text-sm">
                            {req.finalPrice ? formatCurrency(req.finalPrice) : req.estimatedPrice ? formatCurrency(req.estimatedPrice) : '—'}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-500 font-medium">{formatDate(req.createdAt)}</span>
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
        <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          {selectedRequest && (
            <div className="flex flex-col max-h-[85vh]">
              <div className="bg-slate-900 p-8 text-white">
                 <div className="flex items-center justify-between mb-4">
                   <span className="px-3 py-1 bg-blue-600/30 text-blue-400 rounded-full font-bold text-[10px] uppercase">
                      Request Details
                   </span>
                   <span className="text-xs text-slate-400">
                      {formatDate(selectedRequest.createdAt)}
                   </span>
                 </div>
                 <h2 className="text-2xl font-black text-white">
                   {selectedRequest.serviceName || getServiceLabel(selectedRequest.serviceType)}
                 </h2>
                 <p className="text-xs font-mono text-slate-400 mt-1">
                   ID: #{selectedRequest.id}
                 </p>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto">
                 {selectedRequest.isEmergency && (
                   <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 flex items-center gap-2">
                     <AlertTriangle className="w-5 h-5 text-red-600" />
                     <span className="text-xs font-black uppercase">Emergency SOS Triggered</span>
                   </div>
                 )}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                       <p className="text-[10px] font-black uppercase text-slate-400">Customer Details</p>
                       <p className="text-lg font-black text-slate-900">{selectedRequest.customerName}</p>
                       <p className="text-xs text-blue-600 font-bold">{selectedRequest.customerPhone || 'N/A'}</p>
                       {selectedRequest.customerEmail && (
                         <p className="text-xs text-slate-500 truncate">{selectedRequest.customerEmail}</p>
                       )}
                    </div>
                    <div className="p-5 bg-slate-900 rounded-2xl text-white space-y-1">
                       <p className="text-[10px] font-black uppercase text-slate-400">Assigned Provider</p>
                       <p className="text-lg font-black">{selectedRequest.providerName || 'Searching...'}</p>
                       <p className="text-xs text-blue-400 font-bold uppercase">Status: {selectedRequest.status}</p>
                    </div>
                 </div>

                 <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-400">Job Details & Location</p>
                    
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase block mb-1">Issue Description</span>
                        <p className="text-slate-900 font-medium bg-white p-3 rounded-xl border border-slate-200">
                          "{selectedRequest.description || 'No description provided.'}"
                        </p>
                      </div>

                      {selectedRequest.customerLocation && (
                        <div>
                          <span className="text-slate-400 text-[10px] font-bold uppercase block mb-1">Breakdown Location</span>
                          <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-900 space-y-2">
                            <p className="font-semibold">{selectedRequest.customerLocation.address}</p>
                            <Button variant="outline" size="sm" asChild className="h-8 text-xs font-bold text-blue-600">
                              <a 
                                href={`https://www.google.com/maps/search/${selectedRequest.customerLocation.lat},${selectedRequest.customerLocation.lng}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open in Google Maps
                              </a>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                 </div>

                 {selectedRequest.status === 'completed' && selectedRequest.review && (
                   <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400">Customer Feedback</p>
                      <div className="flex items-center gap-1">
                         {[...Array(5)].map((_, i) => (
                           <Star key={i} className={`w-4 h-4 ${i < selectedRequest.rating! ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                         ))}
                      </div>
                      <p className="text-xs text-slate-700 italic">"{selectedRequest.review}"</p>
                   </div>
                 )}

                 <div className="bg-slate-900 rounded-2xl p-6 text-white flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Total Price</p>
                      <p className="text-2xl font-black text-blue-400">{formatCurrency(selectedRequest.finalPrice || selectedRequest.totalPrice || selectedRequest.estimatedPrice || 0)}</p>
                    </div>
                    <StatusBadge status={selectedRequest.status} />
                 </div>

                 <Button 
                   onClick={() => setSelectedRequest(null)}
                   className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-widest"
                 >
                   Close Details
                 </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
