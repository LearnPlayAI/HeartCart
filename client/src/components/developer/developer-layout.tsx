import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  AlertCircle, 
  Database, 
  Code, 
  FileCode, 
  LayoutDashboard, 
  LogOut, 
  Settings, 
  ShieldCheck, 
  Terminal,
  BookOpen,
  Zap,
  Cpu,
  Activity,
  Puzzle,
  Palette,
  ArrowLeft,
  FileImage,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';

interface DeveloperLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const DeveloperNavItems = [
  {
    title: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5 mr-2" />,
    href: '/developer',
  },
  {
    title: 'URL Handling Test',
    icon: <FileImage className="w-5 h-5 mr-2 text-green-600" />,
    href: '/developer/url-handling-test',
  },
  {
    title: 'Auth Tests',
    icon: <ShieldCheck className="w-5 h-5 mr-2" />,
    href: '/developer/auth-tests',
  },
  {
    title: 'Database Tests',
    icon: <Database className="w-5 h-5 mr-2" />,
    href: '/developer/database-tests',
  },
  {
    title: 'AI Tests',
    icon: <Cpu className="w-5 h-5 mr-2" />,
    href: '/developer/ai-tests',
  },
  {
    title: 'Storage Tests',
    icon: <FileCode className="w-5 h-5 mr-2" />,
    href: '/developer/storage-tests',
  },
  {
    title: 'API Tests',
    icon: <Code className="w-5 h-5 mr-2" />,
    href: '/developer/api-tests',
  },
  {
    title: 'E-commerce Tests',
    icon: <BookOpen className="w-5 h-5 mr-2" />,
    href: '/developer/ecommerce-tests',
  },
  {
    title: 'Attribute Tests',
    icon: <Puzzle className="w-5 h-5 mr-2" />,
    href: '/developer/attribute-tests',
  },
  {
    title: 'UI Tests',
    icon: <Palette className="w-5 h-5 mr-2" />,
    href: '/developer/ui-tests',
  },
  {
    title: 'Performance Tests',
    icon: <Activity className="w-5 h-5 mr-2" />,
    href: '/developer/performance-tests',
  },
  {
    title: 'Debug Console',
    icon: <Terminal className="w-5 h-5 mr-2" />,
    href: '/developer/debug-console',
  },
];

export default function DeveloperLayout({ children, title, subtitle }: DeveloperLayoutProps) {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-green-700 text-white py-3 px-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Terminal className="h-6 w-6 mr-2" />
            <h1 className="text-xl font-bold">Developer Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="text-white hover:text-green-200">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Site
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-white border-white hover:bg-green-800"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 hidden md:block">
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <div className="py-6 px-4">
              <p className="text-sm font-medium text-gray-500 mb-4">DEVELOP & TEST</p>
              <nav className="space-y-1">
                {DeveloperNavItems.map((item) => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-start ${
                      location === item.href
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:text-green-700 hover:bg-green-50'
                    }`}
                    asChild
                  >
                    <Link href={item.href}>
                      {item.icon}
                      {item.title}
                    </Link>
                  </Button>
                ))}
              </nav>
              
              <Separator className="my-6" />
              
              <p className="text-sm font-medium text-gray-500 mb-4">OTHER</p>
              <nav className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-gray-600 hover:text-green-700 hover:bg-green-50"
                  asChild
                >
                  <Link href="/admin">
                    <Settings className="w-5 h-5 mr-2" />
                    Admin Dashboard
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-gray-600 hover:text-green-700 hover:bg-green-50"
                  asChild
                >
                  <Link href="/admin/auth-test">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Legacy Auth Tests
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-gray-600 hover:text-pink-600 hover:bg-pink-50"
                  asChild
                >
                  <Link href="/">
                    <Zap className="w-5 h-5 mr-2" />
                    Go to Store
                  </Link>
                </Button>
              </nav>
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}