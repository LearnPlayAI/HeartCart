import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const SESSION_WARNING_TIME = 5 * 60 * 1000; // 5 minutes before session expires
const SESSION_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity

export function SessionExpiryWarning() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showWarning, setShowWarning] = useState<boolean>(false);

  // Update last activity time on user interaction
  const updateLastActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
  }, []);

  // Function to manually refresh the session
  const handleRefreshSession = useCallback(async () => {
    try {
      // Call the refresh session endpoint
      const response = await fetch("/api/session/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      if (response.ok) {
        setShowWarning(false);
        setLastActivity(Date.now());
        
      } else {
        // If refresh fails, show error and redirect will happen automatically
        toast({
          title: "Session expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to refresh session:", error);
      toast({
        title: "Error",
        description: "Failed to refresh your session. Please log in again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Set up session monitoring
  useEffect(() => {
    if (!user) return; // Only run for authenticated users
    
    // Track user activity
    const activityEvents = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    
    const handleUserActivity = () => {
      updateLastActivity();
    };
    
    // Add event listeners for user activity
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });
    
    // Check for session expiry warning
    const checkSessionInterval = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      
      // If approaching session timeout, show warning
      if (inactiveTime > SESSION_IDLE_TIMEOUT - SESSION_WARNING_TIME && !showWarning) {
        setShowWarning(true);
        
        toast({
          title: "Session expiring soon",
          description: "Your session will expire soon due to inactivity. Click to extend.",
          action: <Button variant="outline" size="sm" onClick={handleRefreshSession}>Extend Session</Button>,
          duration: 0, // Don't auto-dismiss
          variant: "warning",
        });
      }
    }, 60000); // Check every minute
    
    return () => {
      // Clean up event listeners and intervals
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(checkSessionInterval);
    };
  }, [user, lastActivity, showWarning, handleRefreshSession, updateLastActivity, toast]);

  return null; // This component doesn't render anything visible
}