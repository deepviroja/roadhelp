import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Truck,
  ClipboardList,
  Settings,
  Wrench,
  LogOut,
  Menu,
  X,
  TrendingUp,
  IndianRupee,
  Car,
  FormInput,
  FileText,
  History,
  MessageSquare,
  Shield,
  AlertTriangle,
  Mail,
  Skull,
} from "lucide-react";

import { Logo } from "@/components/shared/Logo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

const ADMIN_LINKS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "Customers", icon: Users },
  { to: "/admin/providers", label: "Providers", icon: Truck },
  { to: "/admin/requests", label: "Requests", icon: ClipboardList },
  { to: "/admin/sos", label: "SOS Alerts", icon: AlertTriangle },
  { to: "/admin/contact-messages", label: "Contact Inquiries", icon: MessageSquare },
  { to: "/admin/payouts", label: "Payouts", icon: IndianRupee },
  { to: "/admin/revenue", label: "Revenue", icon: TrendingUp },
  { to: "/admin/services", label: "Services", icon: Wrench },
  { to: "/admin/vehicles", label: "Vehicle Types", icon: Car },
  { to: "/admin/forms", label: "Form Builder", icon: FormInput },
  { to: "/admin/pages", label: "Page CMS", icon: FileText },
  { to: "/admin/email-templates", label: "Email Templates", icon: Mail },
  { to: "/admin/admins", label: "Admins & Roles", icon: Shield },
  { to: "/admin/logs", label: "Audit Logs", icon: History },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/super-admin", label: "Danger Zone", icon: Skull, superAdminOnly: true },
];

const ROUTE_PERMISSION_MAP: Record<string, string> = {
  "/admin/dashboard": "all_admins",
  "/admin/users": "users",
  "/admin/providers": "users",
  "/admin/requests": "requests",
  "/admin/sos": "requests",
  "/admin/contact-messages": "cms",
  "/admin/payouts": "finance",
  "/admin/revenue": "finance",
  "/admin/services": "services",
  "/admin/vehicles": "services",
  "/admin/forms": "cms",
  "/admin/pages": "cms",
  "/admin/email-templates": "cms",
  "/admin/admins": "all",
  "/admin/logs": "settings",
  "/admin/settings": "settings",
  "/admin/super-admin": "all",
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSosAlerts, setActiveSosAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      if (profile.role !== 'admin') {
        toast.error('Unauthorized access: Admin privileges required.');
        navigate('/login');
        return;
      }

      // Route Authorization & Redirect Logic
      const currentPath = location.pathname;
      const isSuper = profile.isSuperAdmin || profile.permissions?.includes('all');
      
      if (!isSuper) {
        const requiredPermission = ROUTE_PERMISSION_MAP[currentPath];
        if (requiredPermission && requiredPermission !== 'all_admins') {
          const hasPerm = profile.permissions?.includes(requiredPermission);
          if (!hasPerm) {
            // Find first permitted page
            const firstAllowed = ADMIN_LINKS.find(link => {
              const req = ROUTE_PERMISSION_MAP[link.to];
              return req === 'all_admins' || profile.permissions?.includes(req);
            });
            if (firstAllowed) {
              toast.warning('Access restricted: redirected to accessible page.');
              navigate(firstAllowed.to);
            } else {
              toast.error('No accessible administrator pages found.');
              navigate('/login');
            }
          }
        }
      }
    }
  }, [profile, location.pathname, navigate]);

  useEffect(() => {
    const q = query(collection(db, 'sosAlerts'), where('status', '==', 'active'));
    const unsub = onSnapshot(
      q,
      (snap: any) => {
        const alerts = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        setActiveSosAlerts(alerts);
      },
      (err: any) => {
        // Silently handle permission or connection errors
        console.warn('[AdminLayout] SOS alerts notice:', err?.code || err?.message);
      }
    );
    return () => unsub();
  }, []);


  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  const sidebar = (
    <div className="fixed flex flex-col h-full w-[268px] bg-[#0F1117] text-white selection:bg-blue-500/30">
      <div className="px-6 py-8 border-b border-white/5 bg-gradient-to-b from-blue-600/5 to-transparent">
        <Logo
          size="sm"
          className="text-white [&_span]:text-white [&_span_span]:text-blue-500"
        />
        <div className="px-2 my-1">
           <p className="text-[11px] font-black text-white tracking-tight leading-none">{profile?.fullName}</p>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.24em]">Administrator</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto scrollbar-hide">
        {ADMIN_LINKS.filter(link => {
          const isSuper = profile?.isSuperAdmin || !profile?.permissions || profile?.permissions?.length === 0 || profile?.permissions?.includes('all');
          if ((link as any).superAdminOnly) return isSuper;
          if (isSuper) return true;
          const req = ROUTE_PERMISSION_MAP[link.to];
          return req === 'all_admins' || profile?.permissions?.includes(req);
        }).map((link) => {
          const Icon = link.icon;
          const active = isActive(link.to);
          const isDanger = (link as any).superAdminOnly;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.14em] transition-all group relative ${
                isDanger
                  ? active
                    ? 'bg-red-600/20 text-red-400 ring-1 ring-red-600/30'
                    : 'text-red-600/60 hover:text-red-400 hover:bg-red-600/10 mt-2 border border-red-600/10'
                  : active
                    ? 'bg-white/10 text-white shadow-lg shadow-black/20 ring-1 ring-white/10'
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 transition-transform ${active ? 'scale-105' : 'group-hover:scale-105'}`} />
              {link.label}
              {active && (
                <motion.div 
                  layoutId="activeTab"
                  className={`absolute left-0 inset-y-3.5 w-1 rounded-r-full shadow-sm ${isDanger ? 'bg-red-500' : 'bg-blue-500'}`}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-6 border-t border-white/5 bg-slate-900/50 backdrop-blur-xl">
        
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-400 hover:bg-red-400/5 border border-white/5 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-transparent font-sans selection:bg-blue-100 selection:text-blue-900">
      {activeSosAlerts.length > 0 && (
        <div className="bg-red-600 text-white p-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-[9999] shadow-lg shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">ðŸš¨</span>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] leading-none mb-1.5 text-red-200">Active SOS Alert</p>
              <p className="text-sm font-bold leading-tight">
                {activeSosAlerts[0].customerName}{activeSosAlerts[0].customerPhone ? ` Â· ${activeSosAlerts[0].customerPhone}` : ''}{activeSosAlerts[0].locationName ? ` Â· ${activeSosAlerts[0].locationName}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {activeSosAlerts[0].latitude && activeSosAlerts[0].longitude && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${activeSosAlerts[0].latitude},${activeSosAlerts[0].longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-red-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-md"
              >
                View on Map
              </a>
            )}
            <button
              onClick={async () => {
                try {
                  await updateDoc(doc(db, 'sosAlerts', activeSosAlerts[0].id), { status: 'resolved' });
                  toast.success('SOS alert resolved');
                } catch (err) {
                  console.error(err);
                  toast.error('Failed to resolve alert');
                }
              }}
              className="bg-slate-950/40 text-white border border-white/20 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              Resolve
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-[268px] flex-shrink-0 border-r border-white/10 shadow-2xl z-50 sticky top-0 h-screen">
          {sidebar}
        </aside>

        {/* Mobile: Top bar + Drawer */}
        <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 h-20 flex items-center justify-between">
          <Logo size="sm" />
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-900 shadow-sm"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Mobile Sidebar Drawer */}
        <AnimatePresence>
          {sidebarOpen && (
            <div className="fixed inset-0 z-[200] lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute left-0 top-0 bottom-0 w-[268px] overflow-hidden bg-[#0F1117] shadow-2xl"
              >
                <div className="h-full relative flex flex-col">
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="absolute top-8 right-6 text-slate-500 hover:text-white z-20 w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  {sidebar}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-x-hidden pt-6 px-4 sm:px-10 lg:pt-12">
           <div className="max-w-7xl mx-auto">
              {children}
           </div>
        </main>
      </div>
    </div>
    </div>
  );
}


