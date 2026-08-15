import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  User,
  Filter,
  Save,
  Bell,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/Modal';
import { db } from '@/config/firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLogger';

interface SosAlert {
  id: string;
  callType: 'police' | 'ambulance' | 'helpline' | 'team';
  calledNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  locationName: string;
  latitude?: number;
  longitude?: number;
  status: 'active' | 'resolved';
  createdAt: any;
}

const CALL_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  police: { label: 'Police', color: 'bg-blue-100 text-blue-700' },
  ambulance: { label: 'Ambulance', color: 'bg-red-100 text-red-700' },
  helpline: { label: 'Road Helpline', color: 'bg-amber-100 text-amber-700' },
  team: { label: 'Our Team', color: 'bg-purple-100 text-purple-700' },
};

export default function AdminSOS() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  // SOS config editing
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [sosConfig, setSosConfig] = useState({
    policeNumber: '100',
    ambulanceNumber: '108',
    helplineNumber: '1073',
    teamContactNumber: '1090',
    teamCount: 3,
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Load SOS alerts
  useEffect(() => {
    const q = query(collection(db, 'sosAlerts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SosAlert));
        setAlerts(data);
        setIsLoading(false);
      },
      (err) => {
        console.warn('[AdminSOS] Snapshot error:', err?.message);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Load SOS config
  useEffect(() => {
    getDoc(doc(db, 'system', 'config')).then((snap) => {
      if (snap.exists() && snap.data()?.sosConfig) {
        setSosConfig((prev) => ({ ...prev, ...snap.data()!.sosConfig }));
      }
    }).catch(() => {});
  }, []);

  const handleResolve = async (alertId: string, customerName: string) => {
    try {
      await updateDoc(doc(db, 'sosAlerts', alertId), {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
      });
      await logAdminAction({
        adminEmail: profile?.email || 'admin',
        adminName: profile?.fullName || 'Admin',
        action: 'RESOLVE_SOS_ALERT',
        module: 'SOS Alerts',
        details: `Resolved SOS alert from ${customerName}`,
        targetId: alertId,
      });
      toast.success('Alert marked as resolved');
    } catch {
      toast.error('Failed to resolve alert');
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, 'system', 'config'), { sosConfig }, { merge: true });
      await logAdminAction({
        adminEmail: profile?.email || 'admin',
        adminName: profile?.fullName || 'Admin',
        action: 'UPDATE_SOS_CONFIG',
        module: 'SOS Alerts',
        details: 'Updated SOS emergency contact numbers',
      });
      toast.success('SOS configuration saved');
      setIsConfigOpen(false);
    } catch {
      toast.error('Failed to save SOS configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const filtered = alerts.filter((a) => filter === 'all' || a.status === filter);
  const activeCount = alerts.filter((a) => a.status === 'active').length;

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="p-2 rounded-xl bg-red-600/10 text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">SOS & Emergency Alerts</h1>
              {activeCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-black animate-pulse">
                  {activeCount} active
                </span>
              )}
            </div>
            <p className="text-slate-500 text-xs font-medium mt-1 ml-14">
              View emergency calls made by users, track their location, and manage SOS contact numbers.
            </p>
          </div>
          <Button
            onClick={() => setIsConfigOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl h-12 px-6 gap-2"
          >
            <Phone className="w-4 h-4" /> Edit SOS Numbers
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Alerts', value: alerts.length, icon: Bell, color: 'bg-slate-50 text-slate-700' },
            { label: 'Active', value: activeCount, icon: AlertTriangle, color: 'bg-red-50 text-red-700' },
            { label: 'Resolved', value: alerts.filter((a) => a.status === 'resolved').length, icon: CheckCircle2, color: 'bg-green-50 text-green-700' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{value}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2">
          {(['all', 'active', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 h-10 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                filter === f
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'All Alerts' : f === 'active' ? 'Active' : 'Resolved'}
            </button>
          ))}
        </div>

        {/* Alerts table */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading alerts...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 flex flex-col items-center text-center">
              <CheckCircle2 className="w-16 h-16 text-green-200 mb-4" />
              <h3 className="text-xl font-black text-slate-900 mb-1">No Alerts</h3>
              <p className="text-slate-500 text-xs max-w-xs">
                {filter === 'active' ? 'No active emergency alerts at this time.' : 'No SOS alerts match this filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Caller</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Called</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {filtered.map((alert, idx) => (
                      <motion.tr
                        key={alert.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`hover:bg-slate-50/60 transition-all ${alert.status === 'active' ? 'bg-red-50/20' : ''}`}
                      >
                        {/* Caller */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm leading-tight">{alert.customerName || 'Guest'}</p>
                              {alert.customerEmail && (
                                <p className="text-[10px] text-slate-400">{alert.customerEmail}</p>
                              )}
                              {alert.customerPhone && (
                                <p className="text-[10px] text-slate-400">{alert.customerPhone}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Call type */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full w-fit ${CALL_TYPE_LABELS[alert.callType]?.color || 'bg-slate-100 text-slate-600'}`}>
                              {CALL_TYPE_LABELS[alert.callType]?.label || alert.callType}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">{alert.calledNumber}</span>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-1.5 max-w-[160px]">
                            <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-slate-700 leading-snug">{alert.locationName || 'Unknown'}</p>
                              {alert.latitude && alert.longitude && (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] text-blue-500 hover:underline font-bold"
                                >
                                  View on map
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Time */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(alert.createdAt)}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                            alert.status === 'active'
                              ? 'bg-red-100 text-red-700 animate-pulse'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {alert.status === 'active' ? 'Active' : 'Resolved'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          {alert.status === 'active' && (
                            <Button
                              size="sm"
                              onClick={() => handleResolve(alert.id, alert.customerName)}
                              className="h-9 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black text-xs uppercase tracking-wider gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                            </Button>
                          )}
                          {alert.status === 'resolved' && (
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider pr-2">Done</span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SOS Config Modal */}
        <Modal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          title="Edit SOS Emergency Numbers"
          subtitle="These numbers appear in the SOS panel for customers and are dialed when they need help."
          icon={<Phone className="w-6 h-6" />}
          footer={
            <>
              <Button variant="outline" onClick={() => setIsConfigOpen(false)} className="rounded-xl h-11 px-5 font-black text-xs uppercase tracking-widest">
                Cancel
              </Button>
              <Button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 px-6 font-black text-xs uppercase tracking-widest gap-2"
              >
                <Save className="w-4 h-4" />
                {isSavingConfig ? 'Saving...' : 'Save Numbers'}
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Police Number</Label>
              <Input
                value={sosConfig.policeNumber}
                onChange={(e) => setSosConfig({ ...sosConfig, policeNumber: e.target.value })}
                placeholder="100"
                className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ambulance Number</Label>
              <Input
                value={sosConfig.ambulanceNumber}
                onChange={(e) => setSosConfig({ ...sosConfig, ambulanceNumber: e.target.value })}
                placeholder="108"
                className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Road Helpline Number</Label>
              <Input
                value={sosConfig.helplineNumber}
                onChange={(e) => setSosConfig({ ...sosConfig, helplineNumber: e.target.value })}
                placeholder="1073"
                className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Our Team Contact</Label>
              <Input
                value={sosConfig.teamContactNumber}
                onChange={(e) => setSosConfig({ ...sosConfig, teamContactNumber: e.target.value })}
                placeholder="1090"
                className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold"
              />
            </div>
          </div>
        </Modal>
      </motion.div>
    </AdminLayout>
  );
}

