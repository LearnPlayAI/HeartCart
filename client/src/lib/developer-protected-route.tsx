import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Route } from "wouter";

export function DeveloperProtectedRoute({
  path,
  component: Component
}: {
  path: string;
  component: React.ComponentType<any>;
}) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin') {
      toast({
        title: "Developer Access Denied",
        description: "You don't have permission to access the developer dashboard.",
        variant: "destructive",
      });
      navigate('/');
    } else if (!isLoading && !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access the developer dashboard.",
        variant: "destructive",
      });
      navigate('/auth');
    }
  }, [user, isLoading, navigate, toast]);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
        </div>
      </Route>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return <Route path={path}><Component /></Route>;
}