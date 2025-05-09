import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';

type TestStatus = 'passed' | 'failed' | 'pending' | 'warning';

type TestResult = {
  status: TestStatus;
  message: string;
  details: any;
  timestamp?: string;
};

interface TestResultsProps {
  results?: Record<string, TestResult>;
  isLoading: boolean;
}

const TestResults: React.FC<TestResultsProps> = ({ results, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!results || Object.keys(results).length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <Clock className="mr-2 h-4 w-4" />
        No test results available. Please run the tests.
      </div>
    );
  }

  const getIcon = (status: TestStatus) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="text-green-500 h-5 w-5" />;
      case 'failed':
        return <AlertCircle className="text-red-500 h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500 h-5 w-5" />;
      case 'pending':
        return <Clock className="text-blue-500 h-5 w-5" />;
      default:
        return <AlertCircle className="text-gray-500 h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: TestStatus) => {
    let color = '';
    let label = '';
    
    switch (status) {
      case 'passed':
        color = 'bg-green-100 text-green-800 hover:bg-green-100';
        label = 'Passed';
        break;
      case 'failed':
        color = 'bg-red-100 text-red-800 hover:bg-red-100';
        label = 'Failed';
        break;
      case 'warning':
        color = 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
        label = 'Warning';
        break;
      case 'pending':
        color = 'bg-blue-100 text-blue-800 hover:bg-blue-100';
        label = 'Pending';
        break;
      default:
        color = 'bg-gray-100 text-gray-800 hover:bg-gray-100';
        label = 'Unknown';
    }
    
    return (
      <Badge className={color} variant="outline">
        {label}
      </Badge>
    );
  };

  const formatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/([a-z])([A-Z])/g, '$1 $2');
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">Status</TableHead>
          <TableHead>Test</TableHead>
          <TableHead>Result</TableHead>
          <TableHead className="text-right">Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(results).map(([key, result]) => (
          <TableRow key={key}>
            <TableCell className="py-2">{getIcon(result.status)}</TableCell>
            <TableCell className="font-medium py-2">{formatKey(key)}</TableCell>
            <TableCell className="py-2">{result.message}</TableCell>
            <TableCell className="text-right py-2">
              {result.details && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-0">
                    <AccordionTrigger className="p-0 text-xs text-gray-500 hover:text-gray-700">
                      View Details
                    </AccordionTrigger>
                    <AccordionContent>
                      <pre className="text-xs bg-gray-50 p-2 rounded-md overflow-auto max-h-48">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default TestResults;