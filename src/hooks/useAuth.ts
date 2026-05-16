import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types';

export function useAuth() {
  const {
    user,
    profile,
    role,
    isLoading,
    isAuthenticated,
    initialized,
    login,
    signup,
    logout,
    refreshProfile,
  } = useAuthStore();

  const hasRole = (targetRole: UserRole) => role === targetRole;
  const isCustomer = role === 'customer';
  const isProvider = role === 'provider';
  const isAdmin = role === 'admin';

  return {
    user,
    profile,
    role,
    isLoading,
    isAuthenticated,
    initialized,
    login,
    signup,
    logout,
    refreshProfile,
    hasRole,
    isCustomer,
    isProvider,
    isAdmin,
  };
}
