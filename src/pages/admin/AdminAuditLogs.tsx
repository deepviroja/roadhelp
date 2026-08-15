import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, 
  AlertTriangle, 
  Search, 
  Copy, 
  Check, 
  Terminal, 
  User, 
  Calendar, 
  Filter, 
  Eye, 
  EyeOff,
  Trash2
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '@/config/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface AuditLog {
  id: string;
  adminEmail: string;
  adminName?: string;
  action: string;
  module: string;
  details?: string;
  createdAt: any;
}

interface SystemLog {
  id: string;
  type: 'error' | 'warning' | 'navigation';
  message: string;
  componentName?: string;
  file?: string;
  line?: string | number;
  column?: string | number;
  stack?: string;
  pagePath?: string;
  userEmail?: string;
  userRole?: string;
  userId?: string;
  createdAt: any;
}

export default function AdminAuditLogs() {
  const [activeTab, setActiveTab] = useState<'audit' | 'system'>('audit');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Retention cleanup & Pagination state
  const [retentionDays, setRetentionDays] = useState(30);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleCleanupLogs = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete all ${activeTab === 'audit' ? 'audit activities' : 'system events'} older than ${retentionDays} days?`)) {
      return;
    }
    setCleaningUp(true);
    try {
      const collectionName = activeTab === 'audit' ? 'auditLogs' : 'systemLogs';
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const q = query(
        collection(db, collectionName),
        orderBy('createdAt', 'asc')
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        toast.success(`No logs found older than ${retentionDays} days.`);
        setCleaningUp(false);
        return;
      }

      const oldDocs = snap.docs.filter((d) => {
        const data = d.data();
        let logDate: Date;
        if (data.createdAt?.toDate) {
          logDate = data.createdAt.toDate();
        } else if (data.createdAt?.seconds) {
          logDate = new Date(data.createdAt.seconds * 1000);
        } else {
          logDate = new Date(data.createdAt);
        }
        return logDate < cutoffDate;
      });

      if (oldDocs.length === 0) {
        toast.success(`No logs found older than ${retentionDays} days.`);
        setCleaningUp(false);
        return;
      }

      let deletedCount = 0;
      const promises = oldDocs.map(async (d) => {
        await deleteDoc(doc(db, collectionName, d.id));
        deletedCount++;
      });
      await Promise.all(promises);

      toast.success(`Deleted ${deletedCount} logs older than ${retentionDays} days!`);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Logs cleanup error:', err);
      toast.error(err.message || 'Failed to Delete logs.');
    } finally {
      setCleaningUp(false);
    }
  };

  // Subscribe to Audit Logs
  useEffect(() => {
    const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(200));
    const unsub = onSnapshot(q, 
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            adminEmail: data.adminEmail || 'unknown',
            adminName: data.adminName,
            action: data.action || 'Unknown Action',
            module: data.module || 'System',
            details: data.details,
            createdAt: data.createdAt,
          };
        });
        setAuditLogs(list);
        if (activeTab === 'audit') setLoading(false);
      },
      (err) => {
        console.error('Audit Logs Error:', err);
        toast.error('Failed to load audit activities');
      }
    );
    return () => unsub();
  }, [activeTab]);

  // Subscribe to System Logs
  useEffect(() => {
    const q = query(collection(db, 'systemLogs'), orderBy('createdAt', 'desc'), limit(200));
    const unsub = onSnapshot(q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: data.type || 'error',
            message: data.message || 'No message',
            componentName: data.componentName,
            file: data.file,
            line: data.line,
            column: data.column,
            stack: data.stack,
            pagePath: data.pagePath,
            userEmail: data.userEmail,
            userRole: data.userRole,
            userId: data.userId,
            createdAt: data.createdAt,
          };
        });
        setSystemLogs(list);
        if (activeTab === 'system') setLoading(false);
      },
      (err) => {
        console.error('System Logs Error:', err);
        toast.error('Failed to load system diagnostics');
      }
    );
    return () => unsub();
  }, [activeTab]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Logs copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy logs');
    }
  };

  const formatLogDate = (createdAt: any) => {
    if (!createdAt) return 'Unknown Date';
    if (typeof createdAt.toDate === 'function') {
      return createdAt.toDate().toLocaleString();
    }
    if (createdAt.seconds) {
      return new Date(createdAt.seconds * 1000).toLocaleString();
    }
    return new Date(createdAt).toLocaleString();
  };

  const filteredAuditLogs = auditLogs.filter((log) => {
    const q = searchTerm.toLowerCase();
    return (
      (log.adminEmail || '').toLowerCase().includes(q) ||
      (log.adminName || '').toLowerCase().includes(q) ||
      (log.action || '').toLowerCase().includes(q) ||
      (log.module || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q)
    );
  });

  const filteredSystemLogs = systemLogs.filter((log) => {
    // Filter out navigation logs to focus only on errors and warnings
    if (log.type === 'navigation') return false;

    const q = searchTerm.toLowerCase();
    return (
      (log.type || '').toLowerCase().includes(q) ||
      (log.message || '').toLowerCase().includes(q) ||
      (log.componentName || '').toLowerCase().includes(q) ||
      (log.file || '').toLowerCase().includes(q) ||
      (log.pagePath || '').toLowerCase().includes(q) ||
      (log.userEmail || '').toLowerCase().includes(q)
    );
  });

  const totalAuditPages = Math.ceil(filteredAuditLogs.length / itemsPerPage) || 1;
  const paginatedAuditLogs = filteredAuditLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalSystemPages = Math.ceil(filteredSystemLogs.length / itemsPerPage) || 1;
  const paginatedSystemLogs = filteredSystemLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 flex items-center gap-2">
              <History className="w-6 h-6 text-blue-600" />
              Audit Logs & Diagnostics
            </h1>
            <p className="text-sm text-slate-500 mt-1">Track administrator activities and inspect runtime site issues.</p>
          </div>

          {/* Tab Switcher */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 self-start">
            <button
              onClick={() => {
                setActiveTab('audit');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'audit'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              Admin Activities
            </button>
            <button
              onClick={() => {
                setActiveTab('system');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'system'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              System Crashes & Events
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={
                activeTab === 'audit'
                  ? 'Search by admin name, email, action...'
                  : 'Search by error message, component, file name...'
              }
              className="pl-12 h-12 bg-slate-50 border-slate-200 rounded-2xl font-medium w-full"
            />
          </div>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/85 p-2 rounded-2xl w-full md:w-auto self-stretch">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 pl-2 shrink-0">
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              Retention:
            </div>
            <Input
              type="number"
              min="1"
              value={retentionDays}
              onChange={(e) => setRetentionDays(Math.max(1, parseInt(e.target.value) || 30))}
              className="w-16 h-8 text-center bg-white border-slate-200 rounded-lg text-xs font-bold p-1"
            />
            <span className="text-[10px] font-bold text-slate-500 shrink-0">Days</span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={cleaningUp}
              onClick={handleCleanupLogs}
              className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-sm"
            >
              {cleaningUp ? 'Clearing...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Logs Panel */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden min-h-[300px]">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading telemetry logs...</p>
            </div>
          ) : activeTab === 'audit' ? (
            /* Tab 1: Admin Activity Logs */
            <div className="overflow-x-auto scrollbar-hide">
              {filteredAuditLogs.length === 0 ? (
                <div className="py-20 text-center text-slate-400 font-medium">No activity history found.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-6 py-4">Admin Email</th>
                      <th className="px-6 py-4">Module</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Details</th>
                      <th className="px-6 py-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {paginatedAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="font-bold text-slate-900">{log.adminName || 'Unknown Admin'}</p>
                          <p className="text-xs text-slate-400 font-medium">{log.adminEmail}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-700 tracking-wider">
                            {log.module}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">
                          {log.action}
                        </td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                          {log.details || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-semibold">
                          {formatLogDate(log.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {totalAuditPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100 text-xs">
                  <div className="text-slate-500 font-bold">
                    Showing page {currentPage} of {totalAuditPages} ({filteredAuditLogs.length} total logs)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-8 rounded-lg text-[10px] font-black uppercase tracking-wider"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalAuditPages, prev + 1))}
                      disabled={currentPage === totalAuditPages}
                      className="h-8 rounded-lg text-[10px] font-black uppercase tracking-wider"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: System Diagnostics & Crashes */
            <div className="p-6 space-y-4">
              {filteredSystemLogs.length === 0 ? (
                <div className="py-20 text-center text-slate-400 font-medium">No system issues or errors reported.</div>
              ) : (
                <>
                  <div className="space-y-4">
                    {paginatedSystemLogs.map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      const isCopied = copiedId === log.id;
                      const severityColor = 
                        log.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' :
                        log.type === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-slate-50 text-slate-700 border-slate-100';

                      const fullLogText = `[${log.type.toUpperCase()}] ${log.message}\n` +
                        `Component: ${log.componentName || 'N/A'}\n` +
                        `Path: ${log.pagePath || 'N/A'}\n` +
                        `Source: ${log.file || 'Unknown'} (Line: ${log.line || '?'}:${log.column || '?'})\n` +
                        `User: ${log.userEmail || 'Guest'} (${log.userRole || 'anonymous'})\n` +
                        `Date: ${formatLogDate(log.createdAt)}\n` +
                        `Stack Trace:\n${log.stack || 'No Stack Available'}`;

                      return (
                        <div 
                          key={log.id} 
                          className={`border rounded-2xl p-5 space-y-4 hover:border-slate-300 transition-all ${
                            log.type === 'error' ? 'hover:shadow-red-500/5' : 'hover:shadow-blue-500/5'
                          }`}
                        >
                          {/* Top Header Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider ${severityColor}`}>
                                {log.type}
                              </span>
                              {log.componentName && (
                                <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[9px] font-mono">
                                  &lt;{log.componentName} /&gt;
                                </span>
                              )}
                              {log.file && (
                                <span className="bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded-lg text-[9px] font-bold">
                                  {log.file.split('/').pop()}:{log.line || '?'}
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-400 font-semibold">
                              {formatLogDate(log.createdAt)}
                            </div>
                          </div>

                          {/* Error Message */}
                          <div className="space-y-1">
                            <p className="text-sm font-black text-slate-900 break-words leading-snug">
                              {log.message}
                            </p>
                            {log.pagePath && (
                              <p className="text-[11px] text-slate-400 font-mono break-all">
                                Path: {log.pagePath}
                              </p>
                            )}
                          </div>

                          {/* Code Metadata & User context */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Source Reference</p>
                              <p className="font-bold text-slate-700 mt-0.5 truncate" title={log.file}>
                                {log.file || 'Unknown file'}
                              </p>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">User Identity</p>
                              <p className="font-bold text-slate-700 mt-0.5 truncate">
                                {log.userEmail || 'Guest user'}
                              </p>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 sm:col-span-2 md:col-span-1">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">User Role</p>
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-200/60 text-slate-700 font-bold uppercase tracking-wider text-[8px] mt-0.5">
                                {log.userRole || 'anonymous'}
                              </span>
                            </div>
                          </div>

                          {/* Actions Footer */}
                          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopy(log.id, fullLogText)}
                                className="h-9 px-4 rounded-xl border-slate-200 text-slate-600 hover:text-blue-600 gap-1.5 font-bold uppercase tracking-wider text-[10px] bg-white active:scale-95 transition-all"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{isCopied ? 'Copied' : 'Copy Full Log'}</span>
                              </Button>
                              {log.stack && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                  className="h-9 px-4 rounded-xl text-slate-600 hover:text-slate-900 gap-1.5 font-bold uppercase tracking-wider text-[10px] active:scale-95 transition-all"
                                >
                                  {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  <span>{isExpanded ? 'Hide Trace' : 'View Stack Trace'}</span>
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Collapsible Stack Trace */}
                          <AnimatePresence>
                            {isExpanded && log.stack && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-slate-950 text-cyan-400 rounded-2xl border border-slate-900"
                              >
                                <div className="p-4 overflow-x-auto scrollbar-hide text-[11px] font-mono space-y-3 leading-relaxed max-h-[300px]">
                                  <div className="flex items-center justify-between border-b border-white/5 pb-2 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                                    <span>JavaScript Call Stack Trace</span>
                                    <button
                                      onClick={() => handleCopy(`${log.id}-stack`, log.stack || '')}
                                      className="hover:text-white flex items-center gap-1 cursor-pointer"
                                    >
                                      <Copy className="w-3 h-3" /> Copy Trace
                                    </button>
                                  </div>
                                  <pre className="break-all whitespace-pre-wrap">{log.stack}</pre>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  {totalSystemPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs mt-6">
                      <div className="text-slate-500 font-bold">
                        Showing page {currentPage} of {totalSystemPages} ({filteredSystemLogs.length} total logs)
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="h-8 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white animate-in"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalSystemPages, prev + 1))}
                          disabled={currentPage === totalSystemPages}
                          className="h-8 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white animate-in"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

