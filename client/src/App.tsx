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
import Profile from "@/pages/profile";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import CartDrawer from "@/components/cart/cart-drawer";
function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/product/:slug" component={ProductDetail} />
                <Route path="/category/:slug" component={Category} />
                <ProtectedRoute path="/checkout" component={Checkout} />
                <Route path="/search" component={SearchResults} />
                <ProtectedRoute path="/profile" component={Profile} />
                <Route path="/auth" component={AuthPage} />
                <Route component={NotFound} />
              </Switch>
            </main>
            <Footer />
            <CartDrawer />
          </div>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
