import React, { useState } from 'react';
import { 
  useQuery, 
  useMutation, 
  useQueryClient 
} from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Box, 
  Database, 
  Server, 
  FileBox,
  Gauge,
  Link, 
  RefreshCcw, 
  HardDrive 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import DeveloperLayout from '@/components/developer/developer-layout';
import TestResults from '@/components/developer/test-results';
import PerformanceResultsView from '@/components/developer/performance-results-view';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Type definitions
type TestStatus = 'passed' | 'failed' | 'pending' | 'warning';

type TestResult = {
  status: TestStatus;
  message: string;
  details: any;
  timestamp: string;
};

type ImplementationResults = {
  storageInstance: TestResult;
  interfaceImplementation: TestResult;
};

type CrudResults = {
  userRead: TestResult;
  categoryRead: TestResult;
  productRead: TestResult;
};

type ObjectStorageResults = {
  objectStorageInstance: TestResult;
  listOperation: TestResult;
};

type PerformanceResults = {
  getAllUsers: TestResult;
  getAllCategories: TestResult;
  getAllProducts: TestResult;
};

type RelationsResults = {
  productCategoryRelation: TestResult;
  orderItemsRelation: TestResult;
};

type AllStorageTestResults = {
  status: TestStatus;
  results: {
    implementation: Record<string, TestResult>;
    crud: Record<string, TestResult>;
    objectStorage: Record<string, TestResult>;
    performance: Record<string, TestResult>;
    relations: Record<string, TestResult>;
  };
  failedTests: string[];
  summary: {
    totalTests: number;
    passedTests: number;
    warningTests: number;
    failedTests: number;
  };
  timestamp: string;
};

function StorageTestsPage() {
  const { toast } = useToast();
  const [selectedTest, setSelectedTest] = useState<string>('implementation');
  const queryClient = useQueryClient();

  // Implementation Tests
  const {
    data: implementationResponse,
    isLoading: isImplementationLoading,
    error: implementationError,
    refetch: refetchImplementation,
  } = useQuery<{ success: boolean, data: { status: TestStatus, results: ImplementationResults, failedTests: string[] } }>({
    queryKey: ['/api/storage-test/implementation'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0, // Don't cache results
    refetchOnWindowFocus: false, // Don't refetch automatically
  });
  
  const implementationResults = implementationResponse?.success ? implementationResponse.data.results : undefined;

  // CRUD Tests
  const {
    data: crudResponse,
    isLoading: isCrudLoading,
    error: crudError,
    refetch: refetchCrud,
  } = useQuery<{ success: boolean, data: { status: TestStatus, results: CrudResults, failedTests: string[] } }>({
    queryKey: ['/api/storage-test/crud'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  
  const crudResults = crudResponse?.success ? crudResponse.data.results : undefined;

  // Object Storage Tests
  const {
    data: objectStorageResponse,
    isLoading: isObjectStorageLoading,
    error: objectStorageError,
    refetch: refetchObjectStorage,
  } = useQuery<{ success: boolean, data: { status: TestStatus, results: ObjectStorageResults, failedTests: string[] } }>({
    queryKey: ['/api/storage-test/object-storage'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  
  const objectStorageResults = objectStorageResponse?.success ? objectStorageResponse.data.results : undefined;

  // Performance Tests
  const {
    data: performanceResponse,
    isLoading: isPerformanceLoading,
    error: performanceError,
    refetch: refetchPerformance,
  } = useQuery<{ success: boolean, data: { status: TestStatus, results: PerformanceResults, failedTests: string[] } }>({
    queryKey: ['/api/storage-test/performance'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  
  const performanceResults = performanceResponse?.success ? performanceResponse.data.results : undefined;

  // Relations Tests
  const {
    data: relationsResponse,
    isLoading: isRelationsLoading,
    error: relationsError,
    refetch: refetchRelations,
  } = useQuery<{ success: boolean, data: { status: TestStatus, results: RelationsResults, failedTests: string[] } }>({
    queryKey: ['/api/storage-test/relations'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  
  const relationsResults = relationsResponse?.success ? relationsResponse.data.results : undefined;

  // All Tests Results
  const {
    data: allTestsResponse,
    isLoading: isAllTestsLoading,
    error: allTestsError,
    refetch: refetchAllTests,
  } = useQuery<{ success: boolean, data: AllStorageTestResults }>({
    queryKey: ['/api/storage-test/run-all'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: false, // Not automatically run
  });
  
  const allTestsResults = allTestsResponse?.success ? allTestsResponse.data : undefined;

  // Mutation for running all tests
  const runAllTestsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/storage-test/run-all');
      const responseJson = await response.json();
      return responseJson.success && 'data' in responseJson ? responseJson.data : responseJson;
    },
    onSuccess: (data) => {
      // Update the results directly instead of refetching
      queryClient.setQueryData(['/api/storage-test/run-all'], {
        success: true,
        data: data
      });
      toast({
        title: 'All Storage Tests Completed',
        description: 'Storage tests run successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Test Error',
        description: `Failed to run storage tests: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Helper function to run the individual test based on the selected tab
  const runIndividualTest = () => {
    switch (selectedTest) {
      case 'implementation':
        refetchImplementation();
        break;
      case 'crud':
        refetchCrud();
        break;
      case 'object-storage':
        refetchObjectStorage();
        break;
      case 'performance':
        refetchPerformance();
        break;
      case 'relations':
        refetchRelations();
        break;
      case 'all':
        runAllTestsMutation.mutate();
        break;
      default:
        console.error('Unknown test type:', selectedTest);
    }
  };

  // Helper function to check if any test is currently loading
  const isAnyTestLoading = 
    isImplementationLoading || 
    isCrudLoading || 
    isObjectStorageLoading || 
    isPerformanceLoading || 
    isRelationsLoading || 
    isAllTestsLoading || 
    runAllTestsMutation.isPending;

  // Helper functions to get status badge color
  const getStatusColor = (status: TestStatus) => {
    switch (status) {
      case 'passed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'pending': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: TestStatus) => {
    switch (status) {
      case 'passed': return 'Passed';
      case 'failed': return 'Failed';
      case 'warning': return 'Warning';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  // Helper function to filter test results for performance tests
  const getFilteredPerfTests = (results?: Record<string, TestResult>) => {
    if (!results) return [];
    
    return Object.entries(results).map(([name, result]) => ({
      name,
      duration: result.details?.durationMs || 0,
      expectedMaxDuration: result.details?.expectedMaxMs || 1000,
      status: result.status
    }));
  };

  return (
    <DeveloperLayout 
      title="Storage Tests" 
      subtitle="Comprehensive tests for storage layer, data access, and object storage"
    >
      <div className="mb-6 flex justify-between items-center">
        <div>
          <div className="flex items-center">
            <Database className="w-6 h-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold">Storage System Tests</h2>
          </div>
          <p className="text-gray-500 mt-1">
            Verify storage implementation, CRUD operations, object storage, and data relationships
          </p>
        </div>
        
        <div className="flex space-x-4">
          <div className="bg-white p-3 rounded-md shadow-sm">
            <div className="text-sm text-gray-500">Test Coverage</div>
            <div className="text-xl font-semibold">5 Categories</div>
          </div>
          <div className="bg-white p-3 rounded-md shadow-sm">
            <div className="text-sm text-gray-500">Overall Status</div>
            <div className="text-xl font-semibold flex items-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
              <span>Comprehensive Testing</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            disabled={runAllTestsMutation.isPending || isAnyTestLoading} 
            onClick={runIndividualTest}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            {isAnyTestLoading ? 'Running Tests...' : 'Run Test'}
          </Button>
          <Button
            disabled={runAllTestsMutation.isPending || isAnyTestLoading}
            onClick={() => {
              setSelectedTest('all');
              runAllTestsMutation.mutate();
            }}
          >
            <Server className="mr-2 h-4 w-4" />
            {runAllTestsMutation.isPending ? 'Running All Tests...' : 'Run All Tests'}
          </Button>
        </div>
      </div>
      
      {isAnyTestLoading && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">Running storage tests...</p>
          <Progress value={undefined} className="h-2" />
        </div>
      )}
      
      <Tabs value={selectedTest} onValueChange={setSelectedTest} className="w-full">
        <TabsList className="grid grid-cols-6 mb-4">
          <TabsTrigger value="implementation" className="flex items-center">
            <Database className="mr-2 h-4 w-4" />
            Implementation
          </TabsTrigger>
          <TabsTrigger value="crud" className="flex items-center">
            <Box className="mr-2 h-4 w-4" />
            CRUD Operations
          </TabsTrigger>
          <TabsTrigger value="object-storage" className="flex items-center">
            <FileBox className="mr-2 h-4 w-4" />
            Object Storage
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center">
            <Gauge className="mr-2 h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="relations" className="flex items-center">
            <Link className="mr-2 h-4 w-4" />
            Relations
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center">
            <HardDrive className="mr-2 h-4 w-4" />
            All Tests
          </TabsTrigger>
        </TabsList>
      
        {/* Implementation Tests */}
        <TabsContent value="implementation">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Storage Implementation Tests</span>
                {implementationResponse?.data?.status && (
                  <Badge className={getStatusColor(implementationResponse.data.status)}>
                    {getStatusText(implementationResponse.data.status)}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Verifies that the storage layer is correctly implemented according to the IStorage interface
              </CardDescription>
            </CardHeader>
            <CardContent>
              {implementationError ? (
                <div className="text-red-500">
                  Error running tests: {implementationError instanceof Error ? implementationError.message : String(implementationError)}
                </div>
              ) : (
                <TestResults 
                  results={implementationResults} 
                  isLoading={isImplementationLoading} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* CRUD Operations Tests */}
        <TabsContent value="crud">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>CRUD Operations Tests</span>
                {crudResponse?.data?.status && (
                  <Badge className={getStatusColor(crudResponse.data.status)}>
                    {getStatusText(crudResponse.data.status)}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Tests basic CRUD (Create, Read, Update, Delete) operations on core entities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {crudError ? (
                <div className="text-red-500">
                  Error running tests: {crudError instanceof Error ? crudError.message : String(crudError)}
                </div>
              ) : (
                <TestResults 
                  results={crudResults} 
                  isLoading={isCrudLoading} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Object Storage Tests */}
        <TabsContent value="object-storage">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Object Storage Tests</span>
                {objectStorageResponse?.data?.status && (
                  <Badge className={getStatusColor(objectStorageResponse.data.status)}>
                    {getStatusText(objectStorageResponse.data.status)}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Verifies the functionality of the system's object storage service
              </CardDescription>
            </CardHeader>
            <CardContent>
              {objectStorageError ? (
                <div className="text-red-500">
                  Error running tests: {objectStorageError instanceof Error ? objectStorageError.message : String(objectStorageError)}
                </div>
              ) : (
                <TestResults 
                  results={objectStorageResults} 
                  isLoading={isObjectStorageLoading} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Performance Tests */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Storage Performance Tests</span>
                {performanceResponse?.data?.status && (
                  <Badge className={getStatusColor(performanceResponse.data.status)}>
                    {getStatusText(performanceResponse.data.status)}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Measures the response time and efficiency of storage operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {performanceError ? (
                <div className="text-red-500">
                  Error running tests: {performanceError instanceof Error ? performanceError.message : String(performanceError)}
                </div>
              ) : (
                <PerformanceResultsView 
                  results={getFilteredPerfTests(performanceResults)} 
                  isLoading={isPerformanceLoading} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Relations Tests */}
        <TabsContent value="relations">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Data Relationship Tests</span>
                {relationsResponse?.data?.status && (
                  <Badge className={getStatusColor(relationsResponse.data.status)}>
                    {getStatusText(relationsResponse.data.status)}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Verifies the integrity of relationships between different data entities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {relationsError ? (
                <div className="text-red-500">
                  Error running tests: {relationsError instanceof Error ? relationsError.message : String(relationsError)}
                </div>
              ) : (
                <TestResults 
                  results={relationsResults} 
                  isLoading={isRelationsLoading} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* All Tests */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>All Storage Tests</span>
                {allTestsResults?.status && (
                  <Badge className={getStatusColor(allTestsResults.status)}>
                    {getStatusText(allTestsResults.status)}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Comprehensive testing of all storage subsystems
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allTestsError ? (
                <div className="text-red-500">
                  Error running tests: {allTestsError instanceof Error ? allTestsError.message : String(allTestsError)}
                </div>
              ) : allTestsResults ? (
                <div className="space-y-6">
                  {/* Results Summary */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-md border">
                      <div className="text-sm text-gray-500">Total Tests</div>
                      <div className="text-2xl font-bold">{allTestsResults.summary.totalTests}</div>
                    </div>
                    <div className="bg-white p-4 rounded-md border">
                      <div className="text-sm text-gray-500">Passed</div>
                      <div className="text-2xl font-bold text-green-600">{allTestsResults.summary.passedTests}</div>
                    </div>
                    <div className="bg-white p-4 rounded-md border">
                      <div className="text-sm text-gray-500">Warnings</div>
                      <div className="text-2xl font-bold text-yellow-500">{allTestsResults.summary.warningTests}</div>
                    </div>
                    <div className="bg-white p-4 rounded-md border">
                      <div className="text-sm text-gray-500">Failed</div>
                      <div className="text-2xl font-bold text-red-600">{allTestsResults.summary.failedTests}</div>
                    </div>
                  </div>
                  
                  {/* Implementation Results */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Implementation Tests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TestResults results={allTestsResults.results.implementation} isLoading={false} />
                    </CardContent>
                  </Card>
                  
                  {/* CRUD Results */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">CRUD Operations Tests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TestResults results={allTestsResults.results.crud} isLoading={false} />
                    </CardContent>
                  </Card>
                  
                  {/* Object Storage Results */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Object Storage Tests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TestResults results={allTestsResults.results.objectStorage} isLoading={false} />
                    </CardContent>
                  </Card>
                  
                  {/* Performance Results */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Performance Tests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PerformanceResultsView 
                        results={getFilteredPerfTests(allTestsResults.results.performance)} 
                        isLoading={false} 
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Relations Results */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Data Relationship Tests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TestResults results={allTestsResults.results.relations} isLoading={false} />
                    </CardContent>
                  </Card>
                  
                  {/* Failed Tests List */}
                  {allTestsResults.failedTests.length > 0 && (
                    <Card className="border-red-200">
                      <CardHeader className="pb-2 bg-red-50">
                        <CardTitle className="text-lg text-red-700">Failed Tests</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside text-red-600">
                          {allTestsResults.failedTests.map((test, index) => (
                            <li key={index}>{test}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <HardDrive className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                  <p>Run all storage tests to see comprehensive results</p>
                  <Button 
                    onClick={() => runAllTestsMutation.mutate()} 
                    className="mt-4"
                    disabled={runAllTestsMutation.isPending}
                  >
                    {runAllTestsMutation.isPending ? 'Running Tests...' : 'Run All Tests Now'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DeveloperLayout>
  );
}

export default StorageTestsPage;