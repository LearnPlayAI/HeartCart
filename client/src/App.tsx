import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/hooks/use-cart";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Home from "@/pages/home";
import ProductDetail from "@/pages/product-detail-new";
import Category from "@/pages/category";
import ProductListing from "@/pages/product-listing";
import ProductsExample from "@/pages/products-example";
import Checkout from "@/pages/checkout";
import OrderDetail from "@/pages/order-detail";
import SearchResults from "@/pages/search-results";
import Profile from "@/pages/profile-fix";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import CartDrawer from "@/components/cart/cart-drawer";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products";
import AdminCategories from "@/pages/admin/categories";
import AdminOrders from "@/pages/admin/orders";
import AdminPricing from "@/pages/admin/pricing";
import AdminAISettings from "@/pages/admin/ai-settings";
import AdminSuppliers from "@/pages/admin/suppliers";
import AdminCatalogs from "@/pages/admin/catalogs";
import ProductEditPage from "@/pages/admin/product-edit";
import AddSupplier from "@/pages/admin/add-supplier";
import EditSupplier from "@/pages/admin/edit-supplier";
import AddCatalog from "@/pages/admin/add-catalog";
import EditCatalog from "@/pages/admin/edit-catalog";
import CatalogProducts from "@/pages/admin/catalog-products";
import CategoryAttributes from "@/pages/admin/category-attributes";
import ProductAttributes from "@/pages/admin/product-attributes";
import GlobalAttributes from "@/pages/admin/global-attributes";
import AttributeEditor from "@/pages/admin/attribute-editor";
import ProductImages from "@/pages/admin/product-images";
import BatchUpload from "@/pages/admin/batch-upload";

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
              <AdminProtectedRoute path="/admin/suppliers" component={AdminSuppliers} />
              <AdminProtectedRoute path="/admin/suppliers/new" component={AddSupplier} />
              <AdminProtectedRoute path="/admin/suppliers/:id/edit" component={EditSupplier} />
              <AdminProtectedRoute path="/admin/catalogs" component={AdminCatalogs} />
              <AdminProtectedRoute path="/admin/catalogs/new" component={AddCatalog} />
              <AdminProtectedRoute path="/admin/catalogs/:id/edit" component={EditCatalog} />
              <AdminProtectedRoute path="/admin/catalogs/:id/products" component={CatalogProducts} />
              <AdminProtectedRoute path="/admin/products" component={AdminProducts} />
              <AdminProtectedRoute path="/admin/products/new" component={ProductEditPage} />
              <AdminProtectedRoute path="/admin/products/:id/edit" component={ProductEditPage} />
              <AdminProtectedRoute path="/admin/products/:id/images" component={ProductImages} />
              <AdminProtectedRoute path="/admin/products/:productId/attributes" component={ProductAttributes} />
              <AdminProtectedRoute path="/admin/categories" component={AdminCategories} />
              <AdminProtectedRoute path="/admin/categories/:categoryId/attributes" component={CategoryAttributes} />
              <AdminProtectedRoute path="/admin/category-attributes/:categoryId" component={CategoryAttributes} />
              <AdminProtectedRoute path="/admin/global-attributes" component={GlobalAttributes} />
              <AdminProtectedRoute path="/admin/attributes/new" component={AttributeEditor} />
              <AdminProtectedRoute path="/admin/attributes/:id/edit" component={AttributeEditor} />
              <AdminProtectedRoute path="/admin/pricing" component={AdminPricing} />
              <AdminProtectedRoute path="/admin/orders" component={AdminOrders} />
              <AdminProtectedRoute path="/admin/ai-settings" component={AdminAISettings} />
              <AdminProtectedRoute path="/admin/batch-upload" component={BatchUpload} />
              
              {/* Regular Routes - With header/footer */}
              <Route path="*">
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-1">
                    <Switch>
                      <Route path="/"><Home /></Route>
                      <Route path="/product/id/:id"><ProductDetail /></Route>
                      <Route path="/product/:slug"><ProductDetail /></Route>
                      <Route path="/category/:slug"><Category /></Route>
                      <Route path="/products"><ProductListing /></Route>
                      <Route path="/products-example"><ProductsExample /></Route>
                      <ProtectedRoute path="/checkout" component={Checkout} />
                      <Route path="/search"><SearchResults /></Route>
                      <ProtectedRoute path="/profile" component={Profile} />
                      <ProtectedRoute path="/order/:id" component={OrderDetail} />
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
