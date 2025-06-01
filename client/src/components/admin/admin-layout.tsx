import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { ChevronRight, Home, Package, ShoppingCart, Users, PieChart, Settings, Database, Book, Grid, List, Layers, Box, Image, FileText, Gift } from 'lucide-react';

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
    { name: 'Dashboard', href: '/admin', icon: <Home className="h-5 w-5" /> },
    { name: 'Suppliers', href: '/admin/suppliers', icon: <Database className="h-5 w-5" /> },
    { name: 'Catalogs', href: '/admin/catalogs', icon: <Book className="h-5 w-5" /> },
    { name: 'Products', href: '/admin/products', icon: <Package className="h-5 w-5" /> },
    { name: 'Categories', href: '/admin/categories', icon: <Grid className="h-5 w-5" /> },
    { name: 'Global Attributes', href: '/admin/global-attributes', icon: <List className="h-5 w-5" /> },
    { name: 'Promotions', href: '/admin/promotions', icon: <Gift className="h-5 w-5" /> },
    { name: 'Orders', href: '/admin/orders', icon: <ShoppingCart className="h-5 w-5" /> },
    { name: 'Pricing', href: '/admin/pricing', icon: <PieChart className="h-5 w-5" /> },
    { name: 'Batch Upload', href: '/admin/batch-upload', icon: <FileText className="h-5 w-5" /> },
    { name: 'AI Settings', href: '/admin/ai-settings', icon: <Settings className="h-5 w-5" /> },
    { name: 'Auth Testing', href: '/admin/auth-test', icon: <Users className="h-5 w-5" /> },
  ];
  
  const currentNavItem = navigation.find(item => location === item.href);
  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col flex-grow bg-white pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="font-bold text-xl text-pink-600">TeeMeYou Admin</h1>
              </div>
              <div className="mt-5 flex-1 flex flex-col">
                <nav className="flex-1 px-2 space-y-1">
                  {navigation.map((item) => (
                    <Link 
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        location === item.href
                          ? 'bg-pink-100 text-pink-600'
                          : 'text-gray-600 hover:bg-pink-50 hover:text-pink-600'
                      }`}
                    >
                      {item.icon}
                      <span className="ml-3">{item.name}</span>
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <div className="flex-shrink-0 w-full group block">
                  <div className="flex items-center">
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-700">{user?.username || 'Admin User'}</p>
                      <Link href="/" className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                        View Store
                      </Link>
                    </div>
                  </div>
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