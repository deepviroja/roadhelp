import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Shield, Search, Calendar, UserCheck, AlertTriangle, Terminal, Eye, EyeOff, LayoutGrid } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { db } from '@/config/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface AuditLogDoc {
  id: string;
  adminEmail: string;
  adminName?: string;
  action: string;
  module: string;
  details?: string;
  createdAt: string;
}

interface SystemLogDoc {
  id: string;
  type: 'navigation' | 'error' | 'warning' | 'info';
  message: string;
  componentName?: string;
  file?: string;
  line?: number;
  column?: number;
  stack?: string;
  pagePath: string;
  userId?: string;
  userRole?: string;
  userEmail?: string;
  createdAt: string;
}

export default function AdminAuditLogs() {
  const [activeTab, setActiveTab] = useState<'audit' | 'system'>('audit');
  const [auditLogs, setAuditLogs] = useState<AuditLogDoc[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLogDoc[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    if (activeTab === 'audit') {
      const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(100));
      const unsub = onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLogDoc));
        setAuditLogs(docs);
        setIsLoading(false);
      }, (err) => {
        console.warn('[AuditLogs] Listener error:', err);
        setIsLoading(false);
      });
      return () => unsub();
    } else {
      const q = query(collection(db, 'systemLogs'), orderBy('createdAt', 'desc'), limit(100));
      const unsub = onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SystemLogDoc));
        setSystemLogs(docs);
        setIsLoading(false);
      }, (err) => {
        console.warn('[SystemLogs] Listener error:', err);
        setIsLoading(false);
      });
      return () => unsub();
    }
  }, [activeTab]);

  const filteredAuditLogs = auditLogs.filter((log) => {
    const q = searchTerm.toLowerCase();
    return (
      (log.adminEmail || '').toLowerCase().includes(q) ||
      (log.action || '').toLowerCase().includes(q) ||
      (log.module || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q)
    );
  });

  const filteredSystemLogs = systemLogs.filter((log) => {
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

  return (
    <AdminLayout>
      <div className="space-y-8 pb-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-600/10 text-blue-600">
                <History className="w-6 h-6" />
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Logs & Audits</h1>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Immutable diagnostic log center tracking administrative changes, navigation events, and runtime component crashes.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'audit' ? 'Search actions, modules...' : 'Search message, file, page...'}
              className="h-12 rounded-2xl pl-12 bg-white border-slate-200 font-semibold"
            />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/50 max-w-md">
          <button
            onClick={() => { setActiveTab('audit'); setSearchTerm(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'audit'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/20'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" /> Admin Activities
          </button>
          <button
            onClick={() => { setActiveTab('system'); setSearchTerm(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'system'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/20'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4" /> System Crashes & Events
          </button>
        </div>

        {/* Audit Log Tab View */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">Activity History</h3>
              <span className="text-xs font-bold text-slate-500">{filteredAuditLogs.length} Log Entries</span>
            </div>

            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-8 text-center text-slate-400 font-medium text-xs">Loading audit activity logs...</div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium text-xs">No matching admin audit logs recorded yet.</div>
              ) : (
                filteredAuditLogs.map((log) => (
                  <div key={log.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider">
                          {log.module || 'System'}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-900">{log.action}</span>
                        <span className="text-xs text-slate-500 font-medium">{log.adminEmail}</span>
                      </div>
                      {log.details && <p className="text-xs text-slate-700 font-medium">{log.details}</p>}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400 inline" />
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* System Logs Tab View */}
        {activeTab === 'system' && (
          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">Runtime & Diagnostics History</h3>
              <span className="text-xs font-bold text-slate-500">{filteredSystemLogs.length} Events Logged</span>
            </div>

            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-8 text-center text-slate-400 font-medium text-xs">Loading system diagnostics logs...</div>
              ) : filteredSystemLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium text-xs">No matching diagnostic system logs recorded yet.</div>
              ) : (
                filteredSystemLogs.map((log) => {
                  const isCrash = log.type === 'error';
                  const isNav = log.type === 'navigation';
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <div key={log.id} className="p-6 space-y-4 hover:bg-slate-50/40 transition-all">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              isCrash
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : isNav
                                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {log.type}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 truncate">
                              Path: <span className="text-slate-800 font-bold font-mono text-[11px]">{log.pagePath}</span>
                            </span>
                            {log.userEmail && (
                              <span className="text-[10px] text-slate-400 font-semibold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                                User: {log.userEmail} ({log.userRole || 'customer'})
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm font-black text-slate-900 leading-tight pr-4 break-words">
                            {log.message}
                          </p>

                          {log.file && log.file !== 'Unknown' && (
                            <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold bg-blue-50 border border-blue-100/50 w-fit px-3 py-1 rounded-xl">
                              <AlertTriangle className="w-3 h-3 text-blue-500 shrink-0" />
                              Line Reference: <span className="font-mono">{log.file}:{log.line}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 w-full sm:w-auto">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now'}
                          </span>

                          {log.stack && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="h-8 text-xs font-bold text-slate-500 hover:text-slate-900 px-2 gap-1 rounded-lg"
                            >
                              {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              {isExpanded ? 'Hide Trace' : 'Expand Trace'}
                            </Button>
                          )}
                        </div>
                      </div>

                      {isExpanded && log.stack && (
                        <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-[10px] leading-relaxed max-h-72 overflow-y-auto overflow-x-auto select-text scrollbar-thin">
                          <pre className="whitespace-pre-wrap">{log.stack}</pre>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
