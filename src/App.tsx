import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useSystemStore } from '@/stores/systemStore';
import { Navbar } from '@/components/layout/Navbar';
import { MaintenanceBanner } from '@/components/shared/MaintenanceBanner';
import { UserRole } from '@/types';

// Public Pages
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Signup';
import AdminLogin from '@/pages/admin/AdminLogin';
import NotFound from '@/pages/NotFound';
import GetHelp from '@/pages/GetHelp';
import PublicTrackRequest from '@/pages/PublicTrackRequest';
import HelpCenter from '@/pages/HelpCenter';
import { SOSButton } from '@/components/shared/SOSButton';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';

// Customer Pages
import CustomerDashboard from '@/pages/customer/CustomerDashboard';
import TrackRequest from '@/pages/customer/TrackRequest';
import RequestHistory from '@/pages/customer/RequestHistory';
import NewRequest from './pages/customer/NewRequest';
import CustomerProfile from './pages/customer/CustomerProfile';
import NearbyProviders from './pages/customer/NearbyProviders';

// Provider Pages
import ProviderDashboard from '@/pages/provider/ProviderDashboard';
import JobHistory from '@/pages/provider/JobHistory';
import Earnings from './pages/provider/Earnings';
import ProviderProfile from './pages/provider/ProviderProfile';
import ActiveJob from './pages/provider/ActiveJob';

// Admin Pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import ManageProviders from '@/pages/admin/ManageProviders';
import ManageServices from '@/pages/admin/ManageServices';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminRevenue from '@/pages/admin/AdminRevenue';
import AdminPayouts from '@/pages/admin/AdminPayouts';
import ManageUsers from './pages/admin/ManageUsers';
import ManageRequests from './pages/admin/ManageRequests';

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

  // Show maintenance screen to customers and providers (not admins)
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
        <Routes>
          {/* Public Routes */}
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
          <Route
            path="/help"
            element={<HelpCenter />}
          />
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

          {/* Customer Routes */}
          <Route element={<ProtectedRoute allowedRole="customer" />}>
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />
            <Route path="/customer/track/:id" element={<TrackRequest />} />
            <Route path="/customer/history" element={<RequestHistory />} />
            <Route path="/customer/new-request" element={<NewRequest />} />
            <Route path="/customer/profile" element={<CustomerProfile />} />
            <Route path="/customer/nearby" element={<NearbyProviders />} />
          </Route>

          {/* Provider Routes */}
          <Route element={<ProtectedRoute allowedRole="provider" />}>
            <Route path="/provider/dashboard" element={<ProviderDashboard />} />
            <Route path="/provider/history" element={<JobHistory />} />
            <Route path="/provider/earnings" element={<Earnings />} />
            <Route path="/provider/profile" element={<ProviderProfile />} />
            <Route path="/provider/active-job/:id" element={<ActiveJob />} />
          </Route>

          {/* Admin Routes - never blocked by maintenance */}
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

          {/* Catch All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
