import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/Logo';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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

  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const primaryNavItems = [
    { label: 'HOME', to: '/' },
    { label: 'SERVICES', to: '/services' },
    { label: 'HOW IT WORKS', to: '/how-it-works' },
    { label: 'GET HELP', to: '/get-help' },
  ];

  const secondaryNavItems = [
    { label: 'FOR CUSTOMERS', to: '/for-customers' },
    { label: 'FOR PROVIDERS', to: '/for-providers' },
    { label: 'ABOUT US', to: '/about' },
    { label: 'CONTACT', to: '/contact' },
    { label: 'FAQ', to: '/faq' },
  ];

  const [moreOpen, setMoreOpen] = useState(false);

  const publicNav = (
    <nav className="hidden lg:flex items-center gap-3 xl:gap-6">
      {primaryNavItems.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          className={`px-2 py-2 text-xs font-black tracking-wider transition-all uppercase relative group ${
            isActive(item.to) ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'
          }`}
        >
          {item.label}
          <span
            className={`absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 transition-transform origin-left ${
              isActive(item.to) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
            }`}
          />
        </Link>
      ))}

      {/* Sleek Dropdown for Secondary Pages */}
      <div className="relative" onMouseEnter={() => setMoreOpen(true)} onMouseLeave={() => setMoreOpen(false)}>
        <button
          type="button"
          className="px-2 py-2 text-xs font-black tracking-wider text-slate-600 hover:text-blue-600 transition-all uppercase flex items-center gap-1 cursor-pointer"
        >
          MORE <ChevronRight className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-90 text-blue-600' : ''}`} />
        </button>

        {moreOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {secondaryNavItems.map((sub) => (
              <Link
                key={sub.label}
                to={sub.to}
                className={`block px-4 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all ${
                  isActive(sub.to) ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                }`}
              >
                {sub.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );



  const allPublicNavItems = [...primaryNavItems, ...secondaryNavItems];

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
                className={`px-5 py-3 rounded-xl text-sm font-black tracking-tight transition-all min-h-[48px] flex items-center ${
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
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-red-600 font-black uppercase tracking-widest text-[10px] min-h-[48px]">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="hidden sm:flex items-center justify-center min-h-[48px] px-6 text-sm font-black text-slate-600 hover:text-blue-600 tracking-widest transition-all">
                SIGN IN
              </Link>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30 font-black tracking-widest uppercase text-[10px] sm:text-[11px] h-11 sm:h-12 px-5 sm:px-6 rounded-2xl min-h-[48px]" asChild>
                <Link to="/get-help">
                   <span className="sm:hidden">Get Help</span>
                   <span className="hidden sm:inline">Get Help Now</span>
                </Link>
              </Button>
            </div>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden w-12 h-12 rounded-2xl bg-white/60 border border-slate-200 shadow-sm text-slate-900 min-h-[48px] min-w-[48px]">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 border-none bg-slate-50/95 backdrop-blur-2xl">
              <div className="flex flex-col h-full p-8 md:p-12 overflow-y-auto">
                <div className="flex items-center justify-between mb-10">
                  <Logo size="lg" />
                </div>
                
                <nav className="flex flex-col gap-5">
                  {(profile ? links.map(l => ({ label: l.label, to: l.to })) : allPublicNavItems).map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className="text-2xl font-black text-slate-900 hover:text-blue-600 transition-all tracking-tight py-2 min-h-[48px] flex items-center"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="mt-auto pt-10 border-t border-slate-200/50 space-y-4">
                  {profile ? (
                    <Button
                      variant="destructive"
                      size="lg"
                      className="w-full rounded-2xl text-base font-black uppercase tracking-widest min-h-[48px]"
                      onClick={() => { setMobileOpen(false); handleLogout(); }}
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      Sign Out
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="lg" className="w-full rounded-2xl text-base font-black tracking-widest border-2 min-h-[48px]" asChild onClick={() => setMobileOpen(false)}>
                        <Link to="/login">SIGN IN</Link>
                      </Button>
                      <Button size="lg" className="w-full rounded-2xl text-base font-black bg-blue-600 hover:bg-blue-700 shadow-xl tracking-widest min-h-[48px]" asChild onClick={() => setMobileOpen(false)}>
                        <Link to="/get-help">GET HELP NOW</Link>
                      </Button>
                    </>
                  )}
                  <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-6">
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

