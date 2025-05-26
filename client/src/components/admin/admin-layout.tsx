import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { ChevronRight, Home, Package, ShoppingCart, Users, PieChart, Settings, Database, Book, Grid, List, Layers, Box, Image, FileText, Upload, DollarSign, LogOut, LayoutDashboard, Truck, FolderOpen, Archive, Zap, CreditCard } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: JSX.Element;
  current?: boolean;
}

function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  
  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'Suppliers', href: '/admin/suppliers', icon: <Truck className="h-5 w-5" /> },
    { name: 'Catalogs', href: '/admin/catalogs', icon: <Book className="h-5 w-5" /> },
    { name: 'Product Management', href: '/admin/product-management', icon: <Archive className="h-5 w-5" /> },
    { name: 'Products', href: '/admin/products', icon: <Package className="h-5 w-5" /> },
    { name: 'Mass Upload', href: '/admin/batch-upload', icon: <Upload className="h-5 w-5" /> },
    { name: 'Orders', href: '/admin/orders', icon: <ShoppingCart className="h-5 w-5" /> },
    { name: 'Categories', href: '/admin/categories', icon: <Grid className="h-5 w-5" /> },
    { name: 'Global Attributes', href: '/admin/global-attributes', icon: <List className="h-5 w-5" /> },
    { name: 'Pricing', href: '/admin/pricing', icon: <DollarSign className="h-5 w-5" /> },
    { name: 'AI Settings', href: '/admin/ai-settings', icon: <Zap className="h-5 w-5" /> },
    { name: 'Customers', href: '/admin/customers', icon: <Users className="h-5 w-5" /> },
    { name: 'Payments', href: '/admin/payments', icon: <CreditCard className="h-5 w-5" /> },
    { name: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
  ];
  
  const currentNavItem = navigation.find(item => location === item.href);
  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col flex-grow bg-white overflow-y-auto">
              <div className="flex items-center justify-center flex-shrink-0 px-4 py-6 bg-pink-500">
                <h1 className="font-bold text-xl text-white">TEE ME YOU</h1>
              </div>
              <div className="flex-1 flex flex-col">
                <nav className="flex-1 px-2 py-4 space-y-1">
                  {navigation.map((item) => (
                    <Link 
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-3 py-3 text-sm font-medium rounded-md ${
                        location === item.href
                          ? 'bg-pink-100 text-pink-600 border-r-3 border-pink-500'
                          : 'text-gray-700 hover:bg-pink-50 hover:text-pink-600'
                      }`}
                    >
                      {item.icon}
                      <span className="ml-3">{item.name}</span>
                    </Link>
                  ))}
                </nav>
              </div>
              
              {/* User Profile Section */}
              <div className="flex-shrink-0 border-t border-gray-200">
                <div className="flex items-center px-4 py-4 space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">T</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">TeeMeYouAdmin</p>
                    <p className="text-xs text-gray-500">Admin</p>
                  </div>
                </div>
                
                {/* Logout Link */}
                <div className="px-2 pb-4">
                  <Link 
                    href="/"
                    className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-pink-50 hover:text-pink-600"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="ml-3">Logout</span>
                  </Link>
                </div>
                
                {/* Date/Time Footer */}
                <div className="bg-green-600 text-white text-center py-2 text-xs">
                  {new Date().toLocaleDateString()}/{new Date().toLocaleTimeString().slice(0, 5)}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          <div className="relative z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200">
            <div className="flex-1 px-4 flex justify-between">
              <div className="flex-1 flex items-center">
                <div className="hidden md:block">
                  <div className="flex items-baseline space-x-4">
                    <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
                    {subtitle && (
                      <div className="flex items-center text-sm text-gray-500">
                        <ChevronRight className="h-4 w-4 mx-1" />
                        <span>{subtitle}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-100">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;