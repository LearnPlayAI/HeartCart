import { Link } from 'wouter';
import DeveloperLayout from '@/components/developer/developer-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ShieldCheck, 
  Database, 
  Cpu, 
  FileCode, 
  Code, 
  BookOpen, 
  Puzzle, 
  Palette, 
  Activity, 
  Terminal 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TestModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  testsCount: number;
}

function TestModuleCard({ title, description, icon, link, testsCount }: TestModuleCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-gray-500">
        <p>{testsCount} tests available</p>
      </CardContent>
      <CardFooter className="pt-2 pb-4">
        <Button variant="outline" className="w-full" asChild>
          <Link href={link}>View Tests</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function DeveloperDashboard() {
  const testModules = [
    {
      title: 'Authentication',
      description: 'Test user authentication, session management, and security',
      icon: <ShieldCheck className="h-5 w-5 text-green-600" />,
      link: '/developer/auth-tests',
      testsCount: 20,
    },
    {
      title: 'Database',
      description: 'Verify database connections, queries, and performance',
      icon: <Database className="h-5 w-5 text-blue-600" />,
      link: '/developer/database-tests',
      testsCount: 16,
    },
    {
      title: 'AI Integration',
      description: 'Test Gemini AI features and content generation',
      icon: <Cpu className="h-5 w-5 text-purple-600" />,
      link: '/developer/ai-tests',
      testsCount: 6,
    },
    {
      title: 'Storage',
      description: 'Verify object storage and file management',
      icon: <FileCode className="h-5 w-5 text-orange-600" />,
      link: '/developer/storage-tests',
      testsCount: 5,
    },
    {
      title: 'API',
      description: 'Test API endpoints, validation, and error handling',
      icon: <Code className="h-5 w-5 text-gray-600" />,
      link: '/developer/api-tests',
      testsCount: 10,
    },
    {
      title: 'E-commerce',
      description: 'Verify product, cart, and order functionality',
      icon: <BookOpen className="h-5 w-5 text-pink-600" />,
      link: '/developer/ecommerce-tests',
      testsCount: 15,
    },
    {
      title: 'Attributes',
      description: 'Test dynamic attribute system and pricing',
      icon: <Puzzle className="h-5 w-5 text-amber-600" />,
      link: '/developer/attribute-tests',
      testsCount: 7,
    },
    {
      title: 'UI Components',
      description: 'Verify UI components and responsive design',
      icon: <Palette className="h-5 w-5 text-indigo-600" />,
      link: '/developer/ui-tests',
      testsCount: 9,
    },
    {
      title: 'Performance',
      description: 'Run performance tests and analyze metrics',
      icon: <Activity className="h-5 w-5 text-red-600" />,
      link: '/developer/performance-tests',
      testsCount: 4,
    },
    {
      title: 'Debug Console',
      description: 'Interactive debugging and logging tools',
      icon: <Terminal className="h-5 w-5 text-slate-600" />,
      link: '/developer/debug-console',
      testsCount: 3,
    },
  ];

  return (
    <DeveloperLayout 
      title="Developer Dashboard" 
      subtitle="Comprehensive testing and diagnostic tools for the TeeMeYou platform"
    >
      <div className="mb-8">
        <div className="p-6 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-md">
          <h2 className="text-xl font-semibold mb-2 text-green-800">Welcome to the Developer Dashboard</h2>
          <p className="text-green-700 mb-4">
            This dashboard provides tools for testing, debugging, and validating all aspects of the TeeMeYou e-commerce platform. 
            Select a testing module below to get started.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center px-3 py-1.5 bg-green-700 text-white rounded text-sm">
              <span className="font-medium">Authentication system:</span>
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded">Ready for testing</span>
            </div>
            <div className="flex items-center px-3 py-1.5 bg-amber-100 text-amber-800 rounded text-sm">
              <span className="font-medium">Active development modules:</span>
              <span className="ml-2">3</span>
            </div>
            <div className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-800 rounded text-sm">
              <span className="font-medium">Overall test status:</span>
              <span className="ml-2 px-2 py-0.5 bg-blue-700 text-white rounded">86/95 tests passing (90%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testModules.map((module) => (
          <TestModuleCard
            key={module.link}
            title={module.title}
            description={module.description}
            icon={module.icon}
            link={module.link}
            testsCount={module.testsCount}
          />
        ))}
      </div>
    </DeveloperLayout>
  );
}

export default DeveloperDashboard;