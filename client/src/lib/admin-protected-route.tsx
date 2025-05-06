import { useIsAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

/**
 * Admin Protected Route component
 * Only allows access if the user is authenticated AND has admin role
 * Otherwise redirects to homepage or auth page
 */
export function AdminProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const isAdmin = useIsAdmin();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // If authenticated but not admin, redirect to homepage
  if (!isAdmin) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-lg text-center text-muted-foreground mb-6">
            You do not have permission to access this area.
            Admin privileges are required.
          </p>
          <a 
            href="/" 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Return to Homepage
          </a>
        </div>
      </Route>
    );
  }

  // If the user has admin role, render the component
  return <Route path={path} component={Component} />;
}