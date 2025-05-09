import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  ChevronRight, 
  Home, 
  Lock, 
  Database, 
  Brain, 
  HardDrive, 
  Globe, 
  ShoppingCart, 
  Tags, 
  Layout, 
  Gauge,
  Code
} from 'lucide-react';

interface DeveloperLayoutProps {
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

function DeveloperLayout({ children, title, subtitle }: DeveloperLayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  
  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/developer', icon: <Home className="h-5 w-5" /> },
    { name: 'Auth Tests', href: '/developer/auth-tests', icon: <Lock className="h-5 w-5" /> },
    { name: 'Database Tests', href: '/developer/database-tests', icon: <Database className="h-5 w-5" /> },
    { name: 'AI Tests', href: '/developer/ai-tests', icon: <Brain className="h-5 w-5" /> },
    { name: 'Storage Tests', href: '/developer/storage-tests', icon: <HardDrive className="h-5 w-5" /> },
    { name: 'API Tests', href: '/developer/api-tests', icon: <Globe className="h-5 w-5" /> },
    { name: 'E-commerce Tests', href: '/developer/ecommerce-tests', icon: <ShoppingCart className="h-5 w-5" /> },
    { name: 'Attribute Tests', href: '/developer/attribute-tests', icon: <Tags className="h-5 w-5" /> },
    { name: 'UI Tests', href: '/developer/ui-tests', icon: <Layout className="h-5 w-5" /> },
    { name: 'Performance Tests', href: '/developer/performance-tests', icon: <Gauge className="h-5 w-5" /> },
    { name: 'Debug Console', href: '/developer/debug-console', icon: <Code className="h-5 w-5" /> },
  ];
  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col flex-grow bg-white pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="font-bold text-xl text-pink-600">TeeMeYou Developer</h1>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{user?.username || 'Admin User'}</p>
                      <div className="flex space-x-2">
                        <Link href="/" className="text-xs font-medium text-gray-500 hover:text-gray-700">
                          View Store
                        </Link>
                        <span className="text-xs text-gray-500">|</span>
                        <Link href="/admin" className="text-xs font-medium text-gray-500 hover:text-gray-700">
                          Admin
                        </Link>
                      </div>
                    </div>
                    
                    <div className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                      Dev Mode
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
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default DeveloperLayout;