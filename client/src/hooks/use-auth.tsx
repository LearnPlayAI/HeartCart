import { createContext, ReactNode, useContext, useEffect, useRef, useCallback } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { apiRequest, getQueryFn, queryClient } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { StandardApiResponse } from "@/types/api";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<undefined, Error, void>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "email" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const {
    data: response,
    error,
    isLoading,
    refetch,
  } = useQuery<any, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Handle the response formats, supporting both standardized and direct data
  const user = response?.success && 'data' in response 
    ? response.data 
    : (response && !('success' in response) ? response : null);
  
  // Session refresh implementation
  const SESSION_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds
  const sessionRefreshTimerRef = useRef<number | null>(null);
  
  // Function to refresh the session wrapped in useCallback to prevent unnecessary re-renders
  const refreshSession = useCallback(async () => {
    if (user) {
      try {
        // Use dedicated endpoint for session refresh instead of refetching all user data
        await apiRequest("POST", "/api/session/refresh");
        
        // Log only in development
        if (process.env.NODE_ENV === 'development') {
          console.log('Session refreshed at', new Date().toISOString());
        }
      } catch (err) {
        // If the refresh fails (e.g., session expired), refetch user data
        // This will trigger login redirect if needed
        console.error('Failed to refresh session, refetching user data:', err);
        await refetch();
      }
    }
  }, [user, refetch]);
  
  // Set up session refresh mechanism
  useEffect(() => {
    // Only set up refresh for authenticated users
    if (user) {
      // Clear any existing timer
      if (sessionRefreshTimerRef.current) {
        window.clearInterval(sessionRefreshTimerRef.current);
      }
      
      // Set new timer for periodic session refresh
      sessionRefreshTimerRef.current = window.setInterval(refreshSession, SESSION_REFRESH_INTERVAL);
      
      // Throttle for activity-based refresh (5 minutes between refreshes)
      const ACTIVITY_THROTTLE = 5 * 60 * 1000; // 5 minutes
      let lastActivityRefresh = Date.now();
      
      // Activity-based refresh (mouse movement, keyboard, touch)
      const handleUserActivity = () => {
        const now = Date.now();
        
        // Check if enough time has passed since the last activity-based refresh
        if (now - lastActivityRefresh > ACTIVITY_THROTTLE) {
          refreshSession();
          lastActivityRefresh = now;
        }
      };
      
      // Add activity listeners with throttling
      window.addEventListener('mousemove', handleUserActivity, { passive: true });
      window.addEventListener('keydown', handleUserActivity, { passive: true });
      window.addEventListener('touchstart', handleUserActivity, { passive: true });
      
      return () => {
        // Clean up on unmount or when user changes
        if (sessionRefreshTimerRef.current) {
          window.clearInterval(sessionRefreshTimerRef.current);
        }
        
        // Remove activity listeners
        window.removeEventListener('mousemove', handleUserActivity);
        window.removeEventListener('keydown', handleUserActivity);
        window.removeEventListener('touchstart', handleUserActivity);
      };
    }
  }, [user?.id]); // Only re-run when user ID changes (login/logout)

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const data = await apiRequest("POST", "/api/login", credentials);
      
      // Handle standard API response format
      if ('success' in data) {
        if (!data.success) {
          throw new Error(data.error?.message || "Login failed");
        }
        return data.data;
      }
      
      // Handle direct response format (fallback)
      return data;
    },
    onSuccess: async (user: User) => {
      // Store data in the standardized format for consistency
      queryClient.setQueryData(["/api/user"], { success: true, data: user });
      
      // Force refetch to ensure components re-render with fresh data
      await refetch();
      
      // Log login success (dev only)
      if (process.env.NODE_ENV === 'development') {
        console.log('Login successful, user data stored in cache');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const data = await apiRequest("POST", "/api/register", credentials);
      
      // Handle standard API response format
      if ('success' in data) {
        if (!data.success) {
          throw new Error(data.error?.message || "Registration failed");
        }
        return data.data;
      }
      
      // Handle direct response format (fallback)
      return data;
    },
    onSuccess: (response: any) => {
      // Only set user as authenticated if email verification was NOT sent
      // If emailVerificationSent is true, user should remain unauthenticated until they verify
      if (!response?.emailVerificationSent) {
        queryClient.setQueryData(["/api/user"], { success: true, data: response });
      }
      // If email verification was sent, don't authenticate user - let the auth page handle the verification flow
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const data = await apiRequest("POST", "/api/logout");
      
      // Handle standard API response format
      if ('success' in data && !data.success) {
        throw new Error(data.error?.message || "Logout failed");
      }
      
      // Return void instead of null to match the return type declaration
      return undefined;
    },
    onSuccess: async () => {
      // Clear authentication data immediately
      queryClient.setQueryData(["/api/user"], { success: true, data: null });
      
      // Force refetch to ensure components re-render with fresh data
      await refetch();
      
      // Show success message
      
      
      // Navigate using router instead of forcing page reload
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}