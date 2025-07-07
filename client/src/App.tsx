import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/hooks/use-cart";
import { AuthProvider } from "@/hooks/use-auth";
import { FavouritesProvider } from "@/hooks/use-favourites";
import { ScrollManager } from "@/components/scroll-manager";
import { ProtectedRoute } from "@/lib/protected-route";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Home from "@/pages/home";
import ProductDetail from "@/pages/product-detail-new";
import Category from "@/pages/category";
import ProductListing from "@/pages/product-listing";
import ProductsExample from "@/pages/products-example";
import CartPage from "@/pages/cart";
import Checkout from "@/pages/checkout";
import OrderDetail from "@/pages/order-detail";
import OrderConfirmation from "@/pages/order-confirmation";
import PaymentConfirmation from "@/pages/payment-confirmation";
import SearchResults from "@/pages/search-results";
import Profile from "@/pages/profile-fix";
import ProfileSettings from "@/pages/profile-settings";
import MyOrders from "@/pages/my-orders";
import MyFavourites from "@/pages/MyFavourites";
import CreditHistory from "@/pages/credit-history";
import AuthPage from "@/pages/auth-page";
import FlashDeals from "@/pages/flash-deals";
import NotFound from "@/pages/not-found";
import VerifyEmail from "@/pages/verify-email";
import TermsAndConditions from "@/pages/TermsAndConditions";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import CartDrawer from "@/components/cart/cart-drawer";
import { SessionExpiryWarning } from "@/components/session/session-expiry-warning";

import MobileAppInstallButton from "@/components/pwa/MobileAppInstallButton";
import React, { Suspense } from "react";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminSettings from "@/pages/admin/settings";
import AdminProducts from "@/pages/admin/products";
import AdminCategories from "@/pages/admin/categories";
import AdminOrders from "@/pages/admin/orders";
import AdminOrderDetail from "@/pages/admin/order-detail";
import AdminPricing from "@/pages/admin/pricing";
import AdminAISettings from "@/pages/admin/ai-settings";
import AdminSuppliers from "@/pages/admin/suppliers";
import AdminCatalogs from "@/pages/admin/catalogs";
import SupplierOrders from "@/pages/admin/supplier-orders";
import ProductEditPage from "@/pages/admin/product-edit";
import ProductWizardPage from "@/pages/admin/product-wizard";
import AddSupplier from "@/pages/admin/add-supplier";
import EditSupplier from "@/pages/admin/edit-supplier";
import AddCatalog from "@/pages/admin/add-catalog";
import EditCatalog from "@/pages/admin/edit-catalog";
import CatalogProducts from "@/pages/admin/catalog-products";
import CategoryAttributes from "@/pages/admin/category-attributes";
import ProductAttributes from "@/pages/admin/product-attributes";
import GlobalAttributes from "@/pages/admin/global-attributes";
import AttributeEditor from "@/pages/admin/attribute-editor";
import AttributeOptionEditor from "@/pages/admin/attribute-option-editor";
import ProductImages from "@/pages/admin/product-images";
import BatchUpload from "@/pages/admin/batch-upload";
import AuthTestDashboard from "@/pages/admin/auth-test-dashboard";
import PromotionsPage from "@/pages/admin/promotions";
import PromotionProductsPage from "@/pages/admin/promotions/[id]/products";
import CreatePromotionPage from "@/pages/admin/promotions/create";
import EditPromotionPage from "@/pages/admin/promotions/edit";
import CustomerPromotionsPage from "@/pages/promotions";
import FeaturedPage from "@/pages/featured";
import UserAdminPageFixed from "@/pages/admin/users-fixed";
import SalesRepsPage from "@/pages/admin/sales-reps";
import CreateSalesRepPage from "@/pages/admin/sales-reps/create";
import EditSalesRepPage from "@/pages/admin/sales-reps/edit";
import SalesRepCommissionsPage from "@/pages/admin/sales-reps/commissions";
import RecordPaymentPage from "@/pages/admin/sales-reps/record-payment";
import ManageUsersPage from "@/pages/admin/sales-reps/manage-users";

// Developer Pages
import DeveloperDashboard from "@/pages/developer";
import AuthTestsPage from "@/pages/developer/auth-tests";
import DatabaseTestsPage from "@/pages/developer/database-tests";
import ApiTestsPage from "@/pages/developer/api-tests";
import StorageTestsPage from "@/pages/developer/storage-tests";
import URLHandlingTestPage from "@/pages/developer/url-handling-test-page";
import { DeveloperProtectedRoute } from "@/lib/developer-protected-route";

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

  return (
    <Route path={path}>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500" />
        </div>
      }>
        <Component />
      </Suspense>
    </Route>
  );
}

function App() {
  return (
    <AuthProvider>
      <FavouritesProvider>
        <CartProvider>
          <TooltipProvider>
            <ScrollManager>
              <Toaster />
              <SessionExpiryWarning />
              <MobileAppInstallButton />
              <div className="flex flex-col min-h-screen">
                <Switch>
                  {/* Admin Routes - No header/footer */}
                  <AdminProtectedRoute path="/admin" component={AdminDashboard} />
                  <AdminProtectedRoute path="/admin/settings" component={AdminSettings} />
                  <AdminProtectedRoute path="/admin/suppliers" component={AdminSuppliers} />
                  <AdminProtectedRoute path="/admin/suppliers/new" component={AddSupplier} />
                  <AdminProtectedRoute path="/admin/suppliers/:id/edit" component={EditSupplier} />
                  <AdminProtectedRoute path="/admin/catalogs" component={AdminCatalogs} />
                  <AdminProtectedRoute path="/admin/catalogs/new" component={AddCatalog} />
                  <AdminProtectedRoute path="/admin/catalogs/:id/edit" component={EditCatalog} />
                  <AdminProtectedRoute path="/admin/catalogs/:id/products" component={CatalogProducts} />
                  <AdminProtectedRoute path="/admin/products" component={AdminProducts} />
                  
                  {/* Original Product Routes (Commented out to use new implementation) */}
                  {/* <AdminProtectedRoute path="/admin/products/new" component={ProductEditPage} /> */}
                  {/* <AdminProtectedRoute path="/admin/products/:id/edit" component={ProductEditPage} /> */}
                  <AdminProtectedRoute path="/admin/products/:id/images" component={ProductImages} />
                  <AdminProtectedRoute path="/admin/products/:productId/attributes" component={ProductAttributes} />
                  
                  {/* New Product Management System */}
                  <AdminProtectedRoute path="/admin/product-management" component={React.lazy(() => import("@/pages/admin/product-management"))} />
                  <AdminProtectedRoute path="/admin/products/manage" component={React.lazy(() => import("@/pages/admin/product-management"))} />
                  <AdminProtectedRoute path="/admin/catalogs/:catalogId/products/manage" component={React.lazy(() => import("@/pages/admin/product-management"))} />
                  <AdminProtectedRoute path="/admin/product-wizard/:id?" component={React.lazy(() => import("@/pages/admin/product-wizard"))} />
                  <AdminProtectedRoute path="/admin/mass-upload" component={React.lazy(() => import("@/pages/admin/mass-upload"))} />
                  
                  {/* Redirect current routes to new product management */}
                  <Route path="/admin/products/new">
                    {() => {
                      const [_, navigate] = useLocation();
                      React.useEffect(() => {
                        navigate('/admin/products/manage', { replace: true });
                      }, [navigate]);
                      return <div className="p-8 text-center">Redirecting to new product management system...</div>;
                    }}
                  </Route>
                  <Route path="/admin/products/:id/edit">
                    {(params) => {
                      const [_, navigate] = useLocation();
                      React.useEffect(() => {
                        navigate(`/admin/products/manage/${params.id}`, { replace: true });
                      }, [params.id, navigate]);
                      return <div className="p-8 text-center">Redirecting to new product management system...</div>;
                    }}
                  </Route>
                  <Route path="/admin/catalogs/:catalogId/products/new">
                    {(params) => {
                      const [_, navigate] = useLocation();
                      React.useEffect(() => {
                        navigate(`/admin/catalogs/${params.catalogId}/products/manage`, { replace: true });
                      }, [params.catalogId, navigate]);
                      return <div className="p-8 text-center">Redirecting to new product management system...</div>;
                    }}
                  </Route>
                  
                  {/* Product wizard routes */}
                  <AdminProtectedRoute path="/admin/products/wizard/:id?" component={ProductWizardPage} />
                  <Route path="/admin/catalogs/:catalogId/products/wizard">
                    {(params) => {
                      const [_, navigate] = useLocation();
                      React.useEffect(() => {
                        navigate(`/admin/catalogs/${params.catalogId}/products/manage`, { replace: true });
                      }, [params.catalogId, navigate]);
                      return <div className="p-8 text-center">Redirecting to new product management system...</div>;
                    }}
                  </Route>
                  <AdminProtectedRoute path="/admin/categories" component={AdminCategories} />
                  <AdminProtectedRoute path="/admin/categories/:categoryId/attributes" component={CategoryAttributes} />
                  <AdminProtectedRoute path="/admin/category-attributes/:categoryId" component={CategoryAttributes} />
                  <AdminProtectedRoute path="/admin/global-attributes" component={GlobalAttributes} />
                  <AdminProtectedRoute path="/admin/attributes/new" component={AttributeEditor} />
                  <AdminProtectedRoute path="/admin/attributes/:id/edit" component={AttributeEditor} />
                  <AdminProtectedRoute path="/admin/attributes/:id/options" component={AttributeOptionEditor} />
                  <AdminProtectedRoute path="/admin/pricing" component={AdminPricing} />
                  <AdminProtectedRoute path="/admin/promotions" component={PromotionsPage} />
                  <AdminProtectedRoute path="/admin/promotions/create" component={CreatePromotionPage} />
                  <AdminProtectedRoute path="/admin/promotions/:id/edit" component={EditPromotionPage} />
                  <AdminProtectedRoute path="/admin/promotions/:id/products" component={PromotionProductsPage} />
                  <AdminProtectedRoute path="/admin/orders" component={AdminOrders} />
                  <AdminProtectedRoute path="/admin/orders/:id" component={AdminOrderDetail} />
                  <AdminProtectedRoute path="/admin/supplier-orders" component={SupplierOrders} />
                  <AdminProtectedRoute path="/admin/users" component={UserAdminPageFixed} />
                  <AdminProtectedRoute path="/admin/sales-reps" component={SalesRepsPage} />
                  <AdminProtectedRoute path="/admin/sales-reps/create" component={CreateSalesRepPage} />
                  <AdminProtectedRoute path="/admin/sales-reps/:id/edit" component={EditSalesRepPage} />
                  <AdminProtectedRoute path="/admin/sales-reps/:id/commissions" component={SalesRepCommissionsPage} />
                  <AdminProtectedRoute path="/admin/sales-reps/:id/record-payment" component={RecordPaymentPage} />
                  <AdminProtectedRoute path="/admin/sales-reps/:id/manage-users" component={ManageUsersPage} />
                  <AdminProtectedRoute path="/admin/ai-settings" component={AdminAISettings} />
                  <AdminProtectedRoute path="/admin/batch-upload" component={BatchUpload} />
                  <AdminProtectedRoute path="/admin/auth-test" component={AuthTestDashboard} />
                  
                  {/* Developer Routes - No header/footer */}
                  <DeveloperProtectedRoute path="/developer" component={DeveloperDashboard} />
                  <DeveloperProtectedRoute path="/developer/auth-tests" component={AuthTestsPage} />
                  <DeveloperProtectedRoute path="/developer/database-tests" component={DatabaseTestsPage} />
                  <DeveloperProtectedRoute path="/developer/url-handling-test" component={URLHandlingTestPage} />
                  <DeveloperProtectedRoute path="/developer/ai-tests" component={DeveloperDashboard} />
                  <DeveloperProtectedRoute path="/developer/storage-tests" component={StorageTestsPage} />
                  <DeveloperProtectedRoute path="/developer/api-tests" component={ApiTestsPage} />
                  <DeveloperProtectedRoute path="/developer/ecommerce-tests" component={DeveloperDashboard} />
                  <DeveloperProtectedRoute path="/developer/attribute-tests" component={DeveloperDashboard} />
                  <DeveloperProtectedRoute path="/developer/ui-tests" component={DeveloperDashboard} />
                  <DeveloperProtectedRoute path="/developer/performance-tests" component={DeveloperDashboard} />
                  <DeveloperProtectedRoute path="/developer/debug-console" component={DeveloperDashboard} />
                  
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
                          <Route path="/flash-deals"><FlashDeals /></Route>
                          <Route path="/promotions"><CustomerPromotionsPage /></Route>
                          <Route path="/featured"><FeaturedPage /></Route>
                          <Route path="/products"><ProductListing /></Route>
                          <Route path="/products-example"><ProductsExample /></Route>
                          <ProtectedRoute path="/cart" component={CartPage} />
                          <ProtectedRoute path="/checkout" component={Checkout} />
                          <ProtectedRoute path="/payment-confirmation" component={PaymentConfirmation} />
                          <ProtectedRoute path="/order-confirmation/:id" component={OrderConfirmation} />
                          <Route path="/search"><SearchResults /></Route>
                          <ProtectedRoute path="/profile" component={Profile} />
                          <ProtectedRoute path="/profile-settings" component={ProfileSettings} />
                          <ProtectedRoute path="/my-orders" component={MyOrders} />
                          <ProtectedRoute path="/my-favourites" component={MyFavourites} />
                          <ProtectedRoute path="/credit-history" component={CreditHistory} />
                          <ProtectedRoute path="/order/:id" component={OrderDetail} />
                          <ProtectedRoute path="/orders/:id" component={OrderDetail} />
                          <Route path="/auth"><AuthPage /></Route>
                          <Route path="/reset-password"><AuthPage /></Route>
                          <Route path="/verify-email"><VerifyEmail /></Route>
                          <Route path="/terms-and-conditions"><TermsAndConditions /></Route>
                          <Route path="/privacy-policy"><PrivacyPolicy /></Route>
                          <Route><NotFound /></Route>
                        </Switch>
                      </main>
                      <Footer />
                      <CartDrawer />
                    </div>
                  </Route>
                </Switch>
              </div>
            </ScrollManager>
          </TooltipProvider>
        </CartProvider>
      </FavouritesProvider>
    </AuthProvider>
  );
}

export default App;
