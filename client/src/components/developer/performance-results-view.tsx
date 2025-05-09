import React from 'react';
import { Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

type TestStatus = 'passed' | 'failed' | 'pending' | 'warning';

type PerformanceResult = {
  name: string;
  duration: number;
  expectedMaxDuration: number;
  status: TestStatus;
};

interface PerformanceResultsViewProps {
  results: PerformanceResult[];
  isLoading: boolean;
}

const PerformanceResultsView: React.FC<PerformanceResultsViewProps> = ({ 
  results, 
  isLoading 
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <Clock className="mr-2 h-4 w-4" />
        No performance test results available. Please run the tests.
      </div>
    );
  }

  const formatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/([a-z])([A-Z])/g, '$1 $2');
  };

  const getStatusColor = (status: TestStatus) => {
    switch (status) {
      case 'passed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'pending': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getProgressBarColor = (status: TestStatus) => {
    switch (status) {
      case 'passed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'pending': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      {results.map((result) => {
        const percentOfMax = Math.min(100, (result.duration / result.expectedMaxDuration) * 100);
        
        return (
          <div key={result.name} className="border rounded-md p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">{formatKey(result.name)}</h3>
              <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                {result.duration}ms 
                {result.expectedMaxDuration && (
                  <span className="text-gray-500"> / {result.expectedMaxDuration}ms max</span>
                )}
              </span>
            </div>
            <div className="relative pt-1">
              <div className="flex items-center justify-between">
                <div className="w-full">
                  <div className="bg-gray-200 rounded-full h-2 mb-1">
                    <div 
                      className={`h-2 rounded-full ${getProgressBarColor(result.status)}`} 
                      style={{ width: `${percentOfMax}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0ms</span>
                    <span>{Math.ceil(result.expectedMaxDuration * 1.2)}ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PerformanceResultsView;