import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, ChevronRight, ChevronDown, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/Logo';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const user = profile?.role;
  const { appName } = useSystemStore();

  const profilePath = user === 'customer' ? '/customer/profile' : user === 'provider' ? '/provider/profile' : '/admin/settings';

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    setMoreOpen(false);
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

  const allPublicNavItems = [...primaryNavItems, ...secondaryNavItems];
  const filteredLinks = links.filter((l) => l.label.toLowerCase() !== 'profile');
  const filteredMobileLinks = profile ? links.filter((l) => l.label.toLowerCase() !== 'profile') : allPublicNavItems;

  const publicNav = (
    <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
      {primaryNavItems.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          className={`relative rounded-full px-3 py-2 text-[0.78rem] font-semibold tracking-[0.12em] uppercase transition-colors ${
            isActive(item.to) ? 'text-primary bg-primary/5' : 'text-slate-600 hover:text-primary hover:bg-slate-50'
          }`}
        >
          {item.label}
          <span
            className={`absolute left-3 right-3 bottom-1 h-0.5 rounded-full bg-primary transition-transform origin-left ${
              isActive(item.to) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
            }`}
          />
        </Link>
      ))}

      <div className="relative" onMouseEnter={() => setMoreOpen(true)} onMouseLeave={() => setMoreOpen(false)}>
        <button
          type="button"
          className="flex items-center gap-1 rounded-full px-3 py-2 text-[0.78rem] font-semibold tracking-[0.12em] uppercase text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary"
        >
          MORE <ChevronRight className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-90 text-primary' : ''}`} />
        </button>

        {moreOpen && (
          <div className="absolute left-0 top-full z-50 mt-2 w-52 rounded-2xl border border-border bg-white p-2 shadow-xl shadow-slate-900/10">
            {secondaryNavItems.map((sub) => (
              <Link
                key={sub.label}
                to={sub.to}
                className={`block rounded-xl px-4 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors ${
                  isActive(sub.to) ? 'bg-primary/5 text-primary' : 'text-slate-700 hover:bg-slate-50 hover:text-primary'
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

  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="container-app flex h-18 md:h-20 items-center justify-between gap-4">
        <Logo size="lg" />

        {profile ? (
          <nav className="hidden md:flex items-center gap-2 overflow-hidden">
            {filteredLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive(link.to)
                    ? 'bg-primary text-white shadow-sm shadow-primary/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ) : publicNav}

        <div className="flex items-center gap-3 sm:gap-4">
          {profile ? (
            <div className="hidden md:flex items-center gap-4">
              {extra}
              <div className="relative border-l border-slate-200 pl-4" onMouseEnter={() => setProfileOpen(true)} onMouseLeave={() => setProfileOpen(false)}>
                <button
                  type="button"
                  className="flex min-h-11 items-center gap-2 rounded-full px-3 py-2 transition-colors hover:bg-slate-50"
                >
                  <span className="max-w-40 truncate text-sm font-semibold text-slate-900">{profile?.fullName}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-300 ${profileOpen ? 'rotate-180 text-primary' : ''}`} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl border border-border bg-white p-2 shadow-xl shadow-slate-900/10">
                    <Link
                      to={profilePath}
                      onClick={() => setProfileOpen(false)}
                      className="block rounded-xl px-4 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase text-slate-700 transition-colors hover:bg-primary/5 hover:text-primary"
                    >
                      PROFILE
                    </Link>
                    <button
                      onClick={() => { setProfileOpen(false); handleLogout(); }}
                      className="block w-full rounded-xl px-4 py-2.5 text-left text-xs font-semibold tracking-[0.12em] uppercase text-slate-700 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      LOGOUT
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/login" className="hidden sm:inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
                SIGN IN
              </Link>
              <Button className="h-11 rounded-full px-5 text-[0.78rem] font-semibold tracking-[0.14em] uppercase shadow-sm shadow-primary/15" asChild>
                <Link to="/get-help">
                  <span className="sm:hidden">Help</span>
                  <span className="hidden sm:inline">Get Help Now</span>
                </Link>
              </Button>
            </div>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden h-11 w-11 rounded-full border border-border bg-white text-slate-900 shadow-sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full border-none bg-white/96 p-0 backdrop-blur-2xl sm:max-w-md">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>Navigation links for mobile screens</SheetDescription>
              </SheetHeader>
              <div className="flex h-full flex-col overflow-y-auto p-6 sm:p-8">
                <div className="mb-8 flex items-center justify-between">
                  <Logo size="lg" />
                </div>

                <nav className="flex flex-col gap-2">
                  {filteredMobileLinks.map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className="flex min-h-12 items-center rounded-2xl px-4 py-3 text-lg font-semibold tracking-tight text-slate-900 transition-colors hover:bg-slate-50 hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="mt-auto space-y-4 border-t border-slate-200 pt-6">
                  {profile ? (
                    <>
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-semibold shadow-sm">
                            {profile?.fullName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{profile?.fullName}</p>
                            <p className="truncate text-[0.7rem] font-medium uppercase tracking-[0.18em] text-slate-500">{profile?.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="h-11 rounded-full text-xs font-semibold uppercase tracking-[0.14em]" asChild onClick={() => setMobileOpen(false)}>
                          <Link to={profilePath}>
                            <User className="h-4 w-4" /> Profile
                          </Link>
                        </Button>

                        <Button variant="outline" className="h-11 rounded-full border-red-200 bg-red-50 text-xs font-semibold uppercase tracking-[0.14em] text-red-600 hover:bg-red-600 hover:text-white" onClick={() => { setMobileOpen(false); handleLogout(); }}>
                          <LogOut className="h-4 w-4" /> Logout
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="lg" className="w-full rounded-full text-sm font-semibold uppercase tracking-[0.14em]" asChild onClick={() => setMobileOpen(false)}>
                        <Link to="/login">SIGN IN</Link>
                      </Button>
                      <Button size="lg" className="w-full rounded-full text-sm font-semibold uppercase tracking-[0.14em]" asChild onClick={() => setMobileOpen(false)}>
                        <Link to="/get-help">GET HELP NOW</Link>
                      </Button>
                    </>
                  )}
                  <p className="pt-2 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
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

