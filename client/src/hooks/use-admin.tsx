import { useAuth } from "./use-auth";

/**
 * Custom hook to check if the current user has admin role
 * @returns Boolean indicating whether the user has admin privileges
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return user?.role === 'admin';
}

/**
 * Custom hook to check if the current user is authenticated and has admin role
 * Returns an object with loading, isAuthenticated, and isAdmin states
 */
export function useAdminStatus() {
  const { user, isLoading } = useAuth();
  
  return {
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };
}