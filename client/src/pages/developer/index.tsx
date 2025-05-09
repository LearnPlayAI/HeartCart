import DeveloperLayout from '@/components/developer/developer-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { 
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

interface TestModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  testsCount: number;
}

function TestModuleCard({ title, description, icon, link, testsCount }: TestModuleCardProps) {
  return (
    <Card className="h-full transition-all duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <div className="h-9 w-9 rounded-lg bg-pink-100 p-2 text-pink-600">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="min-h-[60px]">{description}</CardDescription>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {testsCount} test{testsCount !== 1 ? 's' : ''}
          </div>
          <Link href={link}>
            <Button size="sm" variant="outline">
              Run Tests
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function DeveloperDashboard() {
  const modules = [
    {
      title: 'Authentication',
      description: 'Test user authentication, sessions, permissions, and password security',
      icon: <Lock className="h-5 w-5" />,
      link: '/developer/auth-tests',
      testsCount: 12
    },
    {
      title: 'Database',
      description: 'Verify database connections, queries, data integrity, and transactions',
      icon: <Database className="h-5 w-5" />,
      link: '/developer/database-tests',
      testsCount: 8
    },
    {
      title: 'AI System',
      description: 'Test Gemini integration, image processing, and AI recommendations',
      icon: <Brain className="h-5 w-5" />,
      link: '/developer/ai-tests',
      testsCount: 6
    },
    {
      title: 'Storage',
      description: 'Validate object storage, file uploads, and image optimization',
      icon: <HardDrive className="h-5 w-5" />,
      link: '/developer/storage-tests',
      testsCount: 5
    },
    {
      title: 'API',
      description: 'Check endpoint responses, rate limiting, and error handling',
      icon: <Globe className="h-5 w-5" />,
      link: '/developer/api-tests',
      testsCount: 10
    },
    {
      title: 'E-commerce',
      description: 'Test product CRUD, cart functionality, and order processing',
      icon: <ShoppingCart className="h-5 w-5" />,
      link: '/developer/ecommerce-tests',
      testsCount: 9
    },
    {
      title: 'Attributes',
      description: 'Verify attribute management, product attributes, and multi-value support',
      icon: <Tags className="h-5 w-5" />,
      link: '/developer/attribute-tests',
      testsCount: 7
    },
    {
      title: 'UI Components',
      description: 'Test form validation, component rendering, and accessibility',
      icon: <Layout className="h-5 w-5" />,
      link: '/developer/ui-tests',
      testsCount: 11
    },
    {
      title: 'Performance',
      description: 'Analyze load times, response times, and resource optimization',
      icon: <Gauge className="h-5 w-5" />,
      link: '/developer/performance-tests',
      testsCount: 6
    },
    {
      title: 'Debug Console',
      description: 'Interactive console for debugging and running custom test commands',
      icon: <Code className="h-5 w-5" />,
      link: '/developer/debug-console',
      testsCount: 3
    }
  ];

  return (
    <DeveloperLayout title="Developer Dashboard">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">System Testing Dashboard</h2>
          <p className="text-gray-500">
            Welcome to the TeeMeYou Developer Dashboard. This tool provides comprehensive testing 
            capabilities for all core system components. Select a module below to run specific tests.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <TestModuleCard
              key={module.title}
              title={module.title}
              description={module.description}
              icon={module.icon}
              link={module.link}
              testsCount={module.testsCount}
            />
          ))}
        </div>
      </div>
    </DeveloperLayout>
  );
}

export default DeveloperDashboard;