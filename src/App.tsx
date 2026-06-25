import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useSystemStore } from '@/stores/systemStore';
import { Navbar } from '@/components/layout/Navbar';
import { MaintenanceBanner } from '@/components/shared/MaintenanceBanner';
import { SOSButton } from '@/components/shared/SOSButton';
import { UserRole } from '@/types';

const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Login'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
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

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F5F5F6]">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-blue-600/10 border-t-blue-600 rounded-[2rem] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          </div>
        </div>
        <p className="mt-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse italic">Initializing Neural Link...</p>
      </div>
    );
  }

  if (user && profile?.role) {
    return <Navigate to={getDashboardPath(profile.role)} replace />;
  }

  return <>{children}</>;
}

function ProtectedRoute({ allowedRole }: { allowedRole?: 'customer' | 'provider' | 'admin' }) {
  const { user, profile, initialized } = useAuthStore();
  const { maintenanceMode } = useSystemStore();

  if (!initialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
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

  return <Outlet />;
}

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const initializeSystem = useSystemStore((state) => state.initialize);
  
  useEffect(() => {
    const unsubAuth = initializeAuth();
    const unsubSystem = initializeSystem();
    return () => {
      unsubAuth();
      unsubSystem();
    };
  }, [initializeAuth, initializeSystem]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen bg-[#F5F5F6] flex flex-col font-sans text-[#1A1A2E]">
        <Toaster position="top-right" richColors />
        <SOSButton />
        <Suspense
          fallback={
            <div className="flex-1 min-h-[60vh] flex items-center justify-center px-6">
              <div className="text-center">
                <div className="w-14 h-14 border-4 border-blue-600/10 border-t-blue-600 rounded-[1.25rem] animate-spin mx-auto" />
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
            <Route path="/help" element={<HelpCenter />} />
            <Route
              path="/get-help"
              element={
                <PublicOnlyRoute>
                  <>
                    <Navbar />
                    <div className="flex-1 flex flex-col">
                      <GetHelp />
                    </div>
                  </>
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

            <Route element={<ProtectedRoute allowedRole="admin" />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/providers" element={<ManageProviders />} />
              <Route path="/admin/services" element={<ManageServices />} />
              <Route path="/admin/revenue" element={<AdminRevenue />} />
              <Route path="/admin/payouts" element={<AdminPayouts />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/users" element={<ManageUsers />} />
              <Route path="/admin/requests" element={<ManageRequests />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}
