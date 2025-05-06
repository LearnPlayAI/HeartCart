import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, ShoppingBag, Package, CreditCard, Users, Settings, BarChart3, LogOut, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Navigation menu for admin dashboard
 */
function Navigation({ className }: { className?: string }) {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  // Admin navigation items
  const navItems = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/products", label: "Products", icon: ShoppingBag },
    { path: "/admin/orders", label: "Orders", icon: Package },
    { path: "/admin/categories", label: "Categories", icon: BarChart3 },
    { path: "/admin/pricing", label: "Pricing", icon: DollarSign },
    { path: "/admin/customers", label: "Customers", icon: Users },
    { path: "/admin/payments", label: "Payments", icon: CreditCard },
    { path: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className={cn("space-y-1", className)}>
      {navItems.map((item) => {
        const isActive = location === item.path;
        return (
          <Link key={item.path} href={item.path}>
            <a
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                isActive
                  ? "bg-pink-100 text-pink-800"
                  : "text-gray-600 hover:bg-pink-50 hover:text-pink-700"
              )}
            >
              <item.icon className={cn("mr-3 h-5 w-5")} />
              {item.label}
            </a>
          </Link>
        );
      })}
      
      <button
        onClick={() => logoutMutation.mutate()}
        className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-pink-50 hover:text-pink-700"
      >
        <LogOut className="mr-3 h-5 w-5" />
        Logout
      </button>
    </nav>
  );
}

/**
 * Main admin layout with responsive sidebar
 */
export function AdminLayout({ children }: AdminLayoutProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  
  // Responsive sidebar that shows as a drawer on mobile
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Desktop sidebar */}
      {!isMobile && (
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
          <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-pink-600">
              <Link href="/">
                <a className="text-xl font-bold text-white">
                  TEE ME YOU
                </a>
              </Link>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
              <ScrollArea className="px-3">
                <Navigation />
              </ScrollArea>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold">
                  {user?.username.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user?.username}</p>
                  <p className="text-xs font-medium text-gray-500">Admin</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile header with menu button */}
      <div className={cn("sticky top-0 z-10 md:hidden flex flex-shrink-0 h-16 bg-white border-b border-gray-200 shadow-sm")}>
        <Sheet open={open} onOpenChange={setOpen}>
          <div className="flex-1 flex justify-between px-4">
            <div className="flex-1 flex">
              <SheetTrigger asChild>
                <Button variant="ghost" className="-my-1 px-1" onClick={() => setOpen(true)}>
                  <span className="sr-only">Open sidebar</span>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </Button>
              </SheetTrigger>
              <Link href="/">
                <a className="flex-shrink-0 flex items-center px-4">
                  <span className="text-xl font-bold text-pink-600">
                    TEE ME YOU
                  </span>
                </a>
              </Link>
            </div>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold">
                {user?.username.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
          
          <SheetContent side="left" className="w-[80%] sm:w-[350px]">
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-pink-600 -mx-4 -my-4 mb-4">
              <span className="text-xl font-bold text-white">
                TEE ME YOU Admin
              </span>
            </div>
            <Navigation className="mt-5" />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <div className={cn("md:pl-64 flex flex-col flex-1")}>
        <main className="flex-1 pb-8">
          <div className="mx-auto px-4 sm:px-6 md:px-8 py-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}