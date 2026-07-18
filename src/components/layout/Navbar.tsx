import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/Logo';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore } from '@/stores/systemStore';

interface NavLink {
  to: string;
  label: string;
}

interface NavbarProps {
  links?: NavLink[];
  extra?: React.ReactNode;
}

export function Navbar({ links = [], extra }: NavbarProps) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = profile?.role;
  const { appName } = useSystemStore();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { label: 'HOME', to: '/' },
    { label: 'SERVICES', to: '/#services' },
    { label: 'HOW IT WORKS', to: '/#how-it-works' },
    { label: 'REVIEWS', to: '/#reviews' },
  ];

  const publicNav = (
    <nav className="hidden lg:flex items-center gap-1">
      {navItems.map((item) => (
        <a
          key={item.label}
          href={item.to}
          className="px-5 py-2 text-[12px] font-black tracking-[0.15em] text-slate-500 hover:text-blue-600 transition-all uppercase relative group"
        >
          {item.label}
          <span className="absolute bottom-0 left-5 right-5 h-0.5 bg-blue-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
        </a>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-50 glass-effect border-b border-white/10 shadow-lg shadow-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 md:h-24 flex items-center justify-between">
        <Logo size="lg" />

        {profile ? (
          <nav className="hidden md:flex items-center gap-2">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-5 py-3 rounded-xl text-sm font-black tracking-tight transition-all ${
                  isActive(link.to)
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-white/50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ) : publicNav}

        <div className="flex items-center gap-4">
          {profile ? (
            <div className="hidden md:flex items-center gap-6">
              {extra}
              <div className="flex items-center gap-5 pl-6 border-l border-slate-200/50">
                <Link to={user === 'customer' ? '/customer/dashboard' : user === 'provider' ? '/provider/dashboard' : '/admin/dashboard'} className="flex flex-col items-end">
                  <p className="text-sm font-black text-slate-900 leading-tight">{profile?.fullName}</p>
                  <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{profile?.role}</p>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-red-600 font-black uppercase tracking-widest text-[10px]">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="hidden sm:block px-6 py-3 text-sm font-black text-slate-600 hover:text-blue-600 tracking-widest transition-all">
                SIGN IN
              </Link>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30 font-black tracking-widest uppercase text-[10px] sm:text-[11px] h-10 sm:h-11 px-4 sm:px-6" asChild>
                <Link to="/get-help">
                   <span className="sm:hidden">Get Help</span>
                   <span className="hidden sm:inline">Get Help Now</span>
                </Link>
              </Button>
            </div>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden w-12 h-12 rounded-xl bg-white/50 border border-white/20 shadow-sm text-slate-900">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 border-none bg-slate-50/95 backdrop-blur-2xl">
              <div className="flex flex-col h-full p-10 md:p-14">
                <div className="flex items-center justify-between mb-20">
                  <Logo size="lg" />
                </div>
                
                <nav className="flex flex-col gap-8">
                  {(profile ? links.map(l => ({ label: l.label, to: l.to })) : navItems).map((item) => (
                    <a
                      key={item.label}
                      href={item.to}
                      onClick={() => setMobileOpen(false)}
                      className="text-4xl md:text-5xl font-black text-slate-900 hover:text-blue-600 transition-all tracking-tighter"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>

                <div className="mt-auto pt-16 border-t border-slate-200/50 space-y-5">
                  {profile ? (
                    <Button
                      variant="destructive"
                      size="lg"
                      className="w-full rounded-2xl text-lg font-black uppercase tracking-widest"
                      onClick={() => { setMobileOpen(false); handleLogout(); }}
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      Sign Out
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="lg" className="w-full rounded-2xl text-lg font-black tracking-widest border-2" asChild onClick={() => setMobileOpen(false)}>
                        <Link to="/login">SIGN IN</Link>
                      </Button>
                      <Button size="lg" className="w-full rounded-2xl text-lg font-black bg-blue-600 shadow-2xl shadow-blue-600/30 tracking-widest" asChild onClick={() => setMobileOpen(false)}>
                        <Link to="/get-help">GET HELP NOW</Link>
                      </Button>
                    </>
                  )}
                  <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-8">
                    © 2026 {appName.toUpperCase()} CORP.
                  </p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
