import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/hooks/use-cart";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Home from "@/pages/home";
import ProductDetail from "@/pages/product-detail";
import Category from "@/pages/category";
import Checkout from "@/pages/checkout";
import SearchResults from "@/pages/search-results";
import Profile from "@/pages/profile-fix";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import CartDrawer from "@/components/cart/cart-drawer";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products";

// Admin-specific protected route
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useEffect } from "react";

function AdminProtectedRoute({ 
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
        title: "Access Denied",
        description: "You don't have permission to access the admin area.",
        variant: "destructive",
      });
      navigate('/');
    } else if (!isLoading && !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access the admin area.",
        variant: "destructive",
      });
      navigate('/auth');
    }
  }, [user, isLoading, navigate, toast]);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500" />
        </div>
      </Route>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return <Route path={path}><Component /></Route>;
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <div className="flex flex-col min-h-screen">
            <Switch>
              {/* Admin Routes - No header/footer */}
              <AdminProtectedRoute path="/admin" component={AdminDashboard} />
              <AdminProtectedRoute path="/admin/products" component={AdminProducts} />
              
              {/* Regular Routes - With header/footer */}
              <Route path="*">
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-1">
                    <Switch>
                      <Route path="/"><Home /></Route>
                      <Route path="/product/:slug"><ProductDetail /></Route>
                      <Route path="/category/:slug"><Category /></Route>
                      <ProtectedRoute path="/checkout" component={Checkout} />
                      <Route path="/search"><SearchResults /></Route>
                      <ProtectedRoute path="/profile" component={Profile} />
                      <Route path="/auth"><AuthPage /></Route>
                      <Route><NotFound /></Route>
                    </Switch>
                  </main>
                  <Footer />
                  <CartDrawer />
                </div>
              </Route>
            </Switch>
          </div>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
