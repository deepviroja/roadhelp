import { useState } from "react";
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
} from "lucide-react";

import { Logo } from "@/components/shared/Logo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ADMIN_LINKS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "Customers", icon: Users },
  { to: "/admin/providers", label: "Providers", icon: Truck },
  { to: "/admin/requests", label: "Requests", icon: ClipboardList },
  { to: "/admin/payouts", label: "Payouts", icon: IndianRupee },

  { to: "/admin/revenue", label: "Revenue", icon: TrendingUp },
  { to: "/admin/services", label: "Services", icon: Wrench },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success("Protocol Disconnected");
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  const sidebar = (
    <div className="flex flex-col h-full bg-[#0F1117] text-white selection:bg-blue-500/30">
      <div className="px-8 py-10 border-b border-white/5 bg-gradient-to-b from-blue-600/5 to-transparent">
        <Logo
          size="sm"
          className="text-white [&_span]:text-white [&_span_span]:text-blue-500"
        />
        <div className="mt-6 flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Admin</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto scrollbar-hide">
        {ADMIN_LINKS.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all group relative ${
                active
                  ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20"
                  : "text-slate-500 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 transition-transform ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
              {link.label}
              {active && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-8 border-t border-white/5 bg-slate-900/50 backdrop-blur-xl">
        <div className="px-3 py-4 mb-6 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white">
              {profile?.fullName?.[0]}
           </div>
           <div>
              <p className="text-xs font-black text-white tracking-tight leading-none mb-1">{profile?.fullName}</p>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global Admin</p>
           </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 w-full h-14 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-400 hover:bg-red-400/5 border border-white/5 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Terminate Session
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8F9FA] font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 border-r border-white/10 shadow-2xl z-50">
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
                className="absolute left-0 top-0 bottom-0 w-72 overflow-hidden bg-[#0F1117] shadow-2xl"
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
  );
}
