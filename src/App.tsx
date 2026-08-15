import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useSystemStore } from '@/stores/systemStore';
import { Navbar } from '@/components/layout/Navbar';
import { MaintenanceBanner } from '@/components/shared/MaintenanceBanner';
import { SOSButton } from '@/components/shared/SOSButton';
import { UserRole } from '@/types';
import { NetworkStatusBanner } from '@/components/shared/NetworkStatusBanner';
import { Button } from '@/components/ui/button';
import { logSystemEvent } from '@/lib/systemLogger';
import { logAdminAction } from '@/lib/auditLogger';

const ServicesPage = lazy(() => import('@/pages/ServicesPage'));
const HowItWorksPage = lazy(() => import('@/pages/HowItWorksPage'));
const ForCustomersPage = lazy(() => import('@/pages/ForCustomersPage'));
const ForProvidersPage = lazy(() => import('@/pages/ForProvidersPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const FAQPage = lazy(() => import('@/pages/FAQPage'));

const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Login'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const MagicLogin = lazy(() => import('@/pages/MagicLogin'));
const Register = lazy(() => import('@/pages/Signup'));
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const GetHelp = lazy(() => import('@/pages/GetHelp'));
const PublicTrackRequest = lazy(() => import('@/pages/PublicTrackRequest'));
const HelpCenter = lazy(() => import('@/pages/HelpCenter'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Terms = lazy(() => import('@/pages/Terms'));
const CustomerDashboard = lazy(() => import('@/pages/customer/CustomerDashboard'));
const TrackRequest = lazy(() => import('@/pages/customer/TrackRequest'));
const RequestHistory = lazy(() => import('@/pages/customer/RequestHistory'));
const NewRequest = lazy(() => import('./pages/customer/NewRequest'));
const CustomerProfile = lazy(() => import('./pages/customer/CustomerProfile'));
const NearbyProviders = lazy(() => import('./pages/customer/NearbyProviders'));
const ProviderDashboard = lazy(() => import('@/pages/provider/ProviderDashboard'));
const JobHistory = lazy(() => import('@/pages/provider/JobHistory'));
const Earnings = lazy(() => import('./pages/provider/Earnings'));
const ProviderProfile = lazy(() => import('./pages/provider/ProviderProfile'));
const ActiveJob = lazy(() => import('./pages/provider/ActiveJob'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const ManageProviders = lazy(() => import('@/pages/admin/ManageProviders'));
const ManageServices = lazy(() => import('@/pages/admin/ManageServices'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminRevenue = lazy(() => import('@/pages/admin/AdminRevenue'));
const AdminPayouts = lazy(() => import('@/pages/admin/AdminPayouts'));
const ManageUsers = lazy(() => import('./pages/admin/ManageUsers'));
const ManageRequests = lazy(() => import('./pages/admin/ManageRequests'));
const AdminVehicleTypes = lazy(() => import('./pages/admin/AdminVehicleTypes'));
const AdminFormBuilder = lazy(() => import('./pages/admin/AdminFormBuilder'));
const AdminCMSPages = lazy(() => import('./pages/admin/AdminCMSPages'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminContactMessages = lazy(() => import('./pages/admin/AdminContactMessages'));
const AdminAdmins = lazy(() => import('./pages/admin/AdminAdmins'));
const AdminSOS = lazy(() => import('./pages/admin/AdminSOS'));
const AdminEmailTemplates = lazy(() => import('./pages/admin/AdminEmailTemplates'));
const AdminSuperAdmin = lazy(() => import('./pages/admin/AdminSuperAdmin'));
import { useDocumentTitle } from './hooks/useDocumentTitle';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useDocumentTitle();

  useEffect(() => {
    window.scrollTo(0, 0);

    const profile = useAuthStore.getState().profile;

    // Log admin page visits to the Activity History (auditLogs)
    if (pathname.startsWith('/admin')) {
      if (profile && profile.role === 'admin') {
        const adminModule = pathname.replace('/admin/', '').split('/')[0] || 'Dashboard';
        // Exclude logs page to avoid database recursion loops
        if (adminModule !== 'logs') {
          logAdminAction({
            adminEmail: profile.email,
            adminName: profile.fullName,
            action: `Visited Page`,
            module: adminModule.charAt(0).toUpperCase() + adminModule.slice(1),
            details: `Admin navigated to ${pathname}${search}`,
          }).catch(console.warn);
        }
      }
      return;
    }

    // Log general page navigation event to system logs
    logSystemEvent({
      type: 'navigation',
      message: `Navigated to ${pathname}${search}`,
      userId: profile?.uid,
      userRole: profile?.role,
      userEmail: profile?.email,
    });
  }, [pathname, search]);
  return null;
}


function getDashboardPath(role: UserRole) {
  if (role === 'customer') return '/customer/dashboard';
  if (role === 'provider') return '/provider/dashboard';
  return '/admin/dashboard';
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, initialized } = useAuthStore();

  if (!initialized) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F5F5F6]">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-8 border-blue-600/10 border-t-blue-600 rounded-[2rem] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          </div>
        </div>
        <p className="mt-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse italic">Loading...</p>
      </div>
    );
  }

  if (user && profile?.role) {
    return <Navigate to={getDashboardPath(profile.role)} replace />;
  }

  return <>{children}</>;
}

function ProtectedRoute({ allowedRole, allowedPermissions }: { allowedRole?: 'customer' | 'provider' | 'admin', allowedPermissions?: string[] }) {
  const { user, profile, initialized } = useAuthStore();
  const { maintenanceMode } = useSystemStore();

  if (!initialized) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to={allowedRole === 'admin' ? '/admin' : '/login'} replace />;
  }

  if (allowedRole && profile.role !== allowedRole) {
    return <Navigate to={getDashboardPath(profile.role)} replace />;
  }

  if (maintenanceMode && profile.role !== 'admin') {
    return <MaintenanceBanner />;
  }

  if (profile.role === 'admin' && allowedPermissions && allowedPermissions.length > 0) {
    const hasAll = !profile.permissions || profile.permissions.length === 0 || profile.permissions.includes('all');
    if (!hasAll) {
      const hasPermission = allowedPermissions.some(p => profile.permissions?.includes(p));
      if (!hasPermission) {
        return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6">
            <h1 className="text-3xl font-black mb-2">Access Denied</h1>
            <p className="text-sm font-medium text-slate-500 mb-6">You do not have permission to view this page.</p>
            <Button onClick={() => window.location.href = '/admin/dashboard'} className="rounded-xl font-bold">
              Go to Dashboard
            </Button>
          </div>
        );
      }
    }
  }

  return <Outlet />;
}

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const initializeSystem = useSystemStore((state) => state.initialize);

  const appName = useSystemStore((state) => state.appName);

  useEffect(() => {
    const unsubAuth = initializeAuth();
    const unsubSystem = initializeSystem();
    return () => {
      unsubAuth();
      unsubSystem();
    };
  }, [initializeAuth, initializeSystem]);

  useEffect(() => {
    if (appName) {
      document.title = `${appName} — 24/7 Roadside Assistance`;

      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', `${appName} - Roadside assistance in minutes. Connect with verified service providers near you.`);
      }

      const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (appleTitle) {
        appleTitle.setAttribute('content', appName);
      }
    }
  }, [appName]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen bg-[#F5F5F6] flex flex-col font-sans text-[#1A1A2E]">
        <Toaster position="top-right" richColors />
        <NetworkStatusBanner />
        <SOSButton />
        <Suspense
          fallback={
            <div className="flex-1 min-h-[60vh] flex items-center justify-center px-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full border-4 border-blue-600/10 border-t-blue-600 rounded-[1.25rem] animate-spin mx-auto" />
                <p className="mt-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.35em] italic">Loading module...</p>
              </div>
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                <PublicOnlyRoute>
                  <>
                    <Navbar />
                    <Landing />
                  </>
                </PublicOnlyRoute>
              }
            />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/for-customers" element={<ForCustomersPage />} />
            <Route path="/for-providers" element={<ForProvidersPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route
              path="/get-help"
              element={
                <PublicOnlyRoute>
                  <div className="flex-1 flex flex-col">
                    <GetHelp />
                  </div>
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/track/:id"
              element={
                <>
                  <Navbar />
                  <div className="flex-1 flex flex-col">
                    <PublicTrackRequest />
                  </div>
                </>
              }
            />
            <Route
              path="/privacy"
              element={
                <>
                  <Navbar />
                  <Privacy />
                </>
              }
            />
            <Route
              path="/terms"
              element={
                <>
                  <Navbar />
                  <Terms />
                </>
              }
            />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <>
                    <Navbar />
                    <div className="flex-1 flex flex-col">
                      <Login />
                    </div>
                  </>
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicOnlyRoute>
                  <>
                    <Navbar />
                    <div className="flex-1 flex flex-col">
                      <ForgotPassword />
                    </div>
                  </>
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicOnlyRoute>
                  <>
                    <Navbar />
                    <div className="flex-1 flex flex-col">
                      <ResetPassword />
                    </div>
                  </>
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/magic-login"
              element={
                <div className="flex-1 flex flex-col">
                  <MagicLogin />
                </div>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicOnlyRoute>
                  <>
                    <Navbar />
                    <div className="flex-1 flex flex-col">
                      <Register />
                    </div>
                  </>
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PublicOnlyRoute>
                  <AdminLogin />
                </PublicOnlyRoute>
              }
            />

            <Route element={<ProtectedRoute allowedRole="customer" />}>

              <Route path="/customer/dashboard" element={<CustomerDashboard />} />
              <Route path="/customer/track/:id" element={<TrackRequest />} />
              <Route path="/customer/history" element={<RequestHistory />} />
              <Route path="/customer/new-request" element={<NewRequest />} />
              <Route path="/customer/profile" element={<CustomerProfile />} />
              <Route path="/customer/nearby" element={<NearbyProviders />} />
            </Route>

            <Route element={<ProtectedRoute allowedRole="provider" />}>
              <Route path="/provider/dashboard" element={<ProviderDashboard />} />
              <Route path="/provider/history" element={<JobHistory />} />
              <Route path="/provider/earnings" element={<Earnings />} />
              <Route path="/provider/profile" element={<ProviderProfile />} />
              <Route path="/provider/active-job/:id" element={<ActiveJob />} />
            </Route>

            {/* General Admin Access (No specific granular permission required for dashboard) */}
            <Route element={<ProtectedRoute allowedRole="admin" />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>

            {/* Users & Providers */}
            <Route element={<ProtectedRoute allowedRole="admin" allowedPermissions={['users']} />}>
              <Route path="/admin/users" element={<ManageUsers />} />
              <Route path="/admin/providers" element={<ManageProviders />} />
            </Route>

            {/* Requests */}
            <Route element={<ProtectedRoute allowedRole="admin" allowedPermissions={['requests']} />}>
              <Route path="/admin/requests" element={<ManageRequests />} />
            </Route>

            {/* Services & Vehicles */}
            <Route element={<ProtectedRoute allowedRole="admin" allowedPermissions={['services']} />}>
              <Route path="/admin/services" element={<ManageServices />} />
              <Route path="/admin/vehicles" element={<AdminVehicleTypes />} />
            </Route>

            {/* CMS & Forms */}
            <Route element={<ProtectedRoute allowedRole="admin" allowedPermissions={['cms']} />}>
              <Route path="/admin/forms" element={<AdminFormBuilder />} />
              <Route path="/admin/pages" element={<AdminCMSPages />} />
              <Route path="/admin/email-templates" element={<AdminEmailTemplates />} />
            </Route>

            {/* Finance */}
            <Route element={<ProtectedRoute allowedRole="admin" allowedPermissions={['finance']} />}>
              <Route path="/admin/revenue" element={<AdminRevenue />} />
              <Route path="/admin/payouts" element={<AdminPayouts />} />
            </Route>

            {/* System Settings & Admins */}
            <Route element={<ProtectedRoute allowedRole="admin" allowedPermissions={['settings']} />}>
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/admins" element={<AdminAdmins />} />
              <Route path="/admin/sos" element={<AdminSOS />} />
              <Route path="/admin/logs" element={<AdminAuditLogs />} />
              <Route path="/admin/contact-messages" element={<AdminContactMessages />} />
              <Route path="/admin/super-admin" element={<AdminSuperAdmin />} />
            </Route>


            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}
