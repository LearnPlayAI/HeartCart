import * as React from 'react';
import { useState } from 'react';
import DeveloperLayout from '@/components/developer/developer-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Server, 
  ShieldCheck, 
  AlertTriangle, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  FileWarning,
  Zap, 
  Network
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define types for test results
type TestStatus = 'passed' | 'failed' | 'pending' | 'warning';

type EndpointAvailabilityResults = {
  status: TestStatus;
  results: {
    endpointTests: Array<{
      endpoint: string;
      method: string;
      description: string;
      status: TestStatus;
      statusCode?: number;
      responseTime?: number;
      message: string;
    }>;
    totalEndpoints: number;
    availableEndpoints: number;
  };
  failedTests: string[];
};

type ResponseValidationResults = {
  status: TestStatus;
  results: {
    validationTests: Array<{
      endpoint: string;
      description: string;
      status: TestStatus;
      message: string;
      responseExample?: string;
    }>;
    totalTests: number;
    passedTests: number;
  };
  failedTests: string[];
};

type AuthTestResults = {
  status: TestStatus;
  results: {
    authTests: Array<{
      endpoint: string;
      method: string;
      description: string;
      status: TestStatus;
      message: string;
      testType: string;
      results?: {
        noAuth: number;
        userAuth: number;
        adminAuth: number;
      };
    }>;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    warningTests: number;
  };
  failedTests: string[];
};

type ErrorHandlingResults = {
  status: TestStatus;
  results: {
    errorTests: Array<{
      endpoint: string;
      method: string;
      description: string;
      status: TestStatus;
      message: string;
      expectedStatus: number;
      actualStatus?: number;
      hasStandardFormat?: boolean;
    }>;
    totalTests: number;
    passedTests: number;
  };
  failedTests: string[];
};

type PerformanceResults = {
  status: TestStatus;
  results: {
    performanceTests: Array<{
      endpoint: string;
      method: string;
      description: string;
      status: TestStatus;
      responseTime?: number;
      expectedMaxTime: number;
      message: string;
      measurements?: number[];
    }>;
    totalTests: number;
    passedTests: number;
    warningTests: number;
    failedTests: number;
    averageResponseTime: number;
  };
  failedTests: string[];
};

type AllApiTestResults = {
  status: TestStatus;
  results: {
    endpointAvailability: EndpointAvailabilityResults;
    responseValidation: ResponseValidationResults;
    authTests: AuthTestResults;
    errorHandling: ErrorHandlingResults;
    performance: PerformanceResults;
  };
  failedTests: string[];
  summary: {
    totalTests: number;
    passedTests: number;
    warningTests: number;
    failedTests: number;
  };
};

function ApiTestsPage() {
  const { toast } = useToast();
  const [selectedTest, setSelectedTest] = useState<string>('availability');

  // Endpoint Availability Tests
  const {
    data: availabilityResponse,
    isLoading: isAvailabilityLoading,
    error: availabilityError,
    refetch: refetchAvailability,
  } = useQuery<{ success: boolean, data: EndpointAvailabilityResults }>({
    queryKey: ['/api/api-test/endpoint-availability'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0, // Don't cache results
    refetchOnWindowFocus: false, // Don't refetch automatically
    onSuccess: (data) => {
      console.log('Endpoint availability test results:', data);
    },
    onError: (error) => {
      console.error('Endpoint availability test error:', error);
    }
  });
  
  const availabilityResults = availabilityResponse?.success ? availabilityResponse.data : undefined;

  // Response Validation Tests
  const {
    data: validationResponse,
    isLoading: isValidationLoading,
    error: validationError,
    refetch: refetchValidation,
  } = useQuery<{ success: boolean, data: ResponseValidationResults }>({
    queryKey: ['/api/api-test/response-validation'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0, // Don't cache results
    refetchOnWindowFocus: false, // Don't refetch automatically
  });
  
  const validationResults = validationResponse?.success ? validationResponse.data : undefined;

  // Auth & Authorization Tests
  const {
    data: authResponse,
    isLoading: isAuthLoading,
    error: authError,
    refetch: refetchAuth,
  } = useQuery<{ success: boolean, data: AuthTestResults }>({
    queryKey: ['/api/api-test/auth'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0, // Don't cache results
    refetchOnWindowFocus: false, // Don't refetch automatically
  });
  
  const authResults = authResponse?.success ? authResponse.data : undefined;

  // Error Handling Tests
  const {
    data: errorResponse,
    isLoading: isErrorLoading,
    error: errorHandlingError,
    refetch: refetchError,
  } = useQuery<{ success: boolean, data: ErrorHandlingResults }>({
    queryKey: ['/api/api-test/error-handling'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0, // Don't cache results
    refetchOnWindowFocus: false, // Don't refetch automatically
  });
  
  const errorResults = errorResponse?.success ? errorResponse.data : undefined;

  // Performance Tests
  const {
    data: performanceResponse,
    isLoading: isPerformanceLoading,
    error: performanceError,
    refetch: refetchPerformance,
  } = useQuery<{ success: boolean, data: PerformanceResults }>({
    queryKey: ['/api/api-test/performance'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0, // Don't cache results
    refetchOnWindowFocus: false, // Don't refetch automatically
  });
  
  const performanceResults = performanceResponse?.success ? performanceResponse.data : undefined;

  // All Tests Results
  const {
    data: allTestsResponse,
    isLoading: isAllTestsLoading,
    error: allTestsError,
  } = useQuery<{ success: boolean, data: AllApiTestResults }>({
    queryKey: ['/api/api-test/run-all'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: false, // Not automatically run
  });
  
  const allTestsResults = allTestsResponse?.success ? allTestsResponse.data : undefined;

  // Mutation for running all tests
  const runAllTestsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/api-test/run-all');
      const responseJson = await response.json();
      return responseJson.success && 'data' in responseJson ? responseJson.data : responseJson;
    },
    onSuccess: (data) => {
      // Update the results directly instead of refetching
      queryClient.setQueryData(['/api/api-test/run-all'], {
        success: true,
        data: data
      });
      toast({
        title: 'All API Tests Completed',
        description: 'API tests run successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Test Error',
        description: `Failed to run API tests: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // TestStatus component
  const TestStatus = ({ status }: { status: TestStatus }) => {
    if (status === 'passed') {
      return <div className="flex items-center text-green-600"><CheckCircle className="w-5 h-5 mr-1" /> Passed</div>;
    } else if (status === 'failed') {
      return <div className="flex items-center text-red-600"><XCircle className="w-5 h-5 mr-1" /> Failed</div>;
    } else if (status === 'warning') {
      return <div className="flex items-center text-amber-600"><AlertTriangle className="w-5 h-5 mr-1" /> Warning</div>;
    } else {
      return <div className="flex items-center text-blue-600"><Loader2 className="w-5 h-5 mr-1 animate-spin" /> Pending</div>;
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setSelectedTest(value);
  };

  // Run all tests
  const runAllTests = () => {
    runAllTestsMutation.mutate();
  };

  // Run individual test
  const runIndividualTest = () => {
    let testName = '';
    
    switch (selectedTest) {
      case 'availability':
        refetchAvailability();
        testName = 'Endpoint Availability';
        break;
      case 'validation':
        refetchValidation();
        testName = 'Response Validation';
        break;
      case 'auth':
        refetchAuth();
        testName = 'Authentication & Authorization';
        break;
      case 'error-handling':
        refetchError();
        testName = 'Error Handling';
        break;
      case 'performance':
        refetchPerformance();
        testName = 'Performance';
        break;
    }
    
    toast({
      title: `Running ${testName} Test`,
      description: 'The test is being executed, please wait for results to appear.',
    });
  };

  // Filter states for endpoint availability table
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [statusCodeFilter, setStatusCodeFilter] = useState<string>('all');
  
  // Filter states for response validation table
  const [validationStatusFilter, setValidationStatusFilter] = useState<string>('all');
  
  // Filter states for auth & authorization table
  const [authMethodFilter, setAuthMethodFilter] = useState<string>('all');
  const [authStatusFilter, setAuthStatusFilter] = useState<string>('all');
  const [authTypeFilter, setAuthTypeFilter] = useState<string>('all');
  
  // Filter states for error handling table
  const [errorMethodFilter, setErrorMethodFilter] = useState<string>('all');
  const [errorStatusFilter, setErrorStatusFilter] = useState<string>('all');
  const [errorStatusCodeFilter, setErrorStatusCodeFilter] = useState<string>('all');
  
  // Filter states for performance table
  const [perfMethodFilter, setPerfMethodFilter] = useState<string>('all');
  const [perfStatusFilter, setPerfStatusFilter] = useState<string>('all');
  
  // Filtering function for endpoint tests
  const getFilteredEndpointTests = () => {
    if (!availabilityResults?.results.endpointTests) return [];
    
    return availabilityResults.results.endpointTests.filter(test => {
      const matchesMethod = methodFilter === 'all' || test.method === methodFilter;
      const matchesStatus = statusFilter === 'all' || test.status === statusFilter;
      const matchesStatusCode = statusCodeFilter === 'all' || 
        (test.statusCode && statusCodeFilter === test.statusCode.toString());
      
      return matchesMethod && matchesStatus && matchesStatusCode;
    });
  };
  
  // Filtering function for response validation tests
  const getFilteredValidationTests = () => {
    if (!validationResults?.results.validationTests) return [];
    
    return validationResults.results.validationTests.filter(test => {
      const matchesStatus = validationStatusFilter === 'all' || test.status === validationStatusFilter;
      
      return matchesStatus;
    });
  };
  
  // Filtering function for auth tests
  const getFilteredAuthTests = () => {
    if (!authResults?.results.authTests) return [];
    
    return authResults.results.authTests.filter(test => {
      const matchesMethod = authMethodFilter === 'all' || test.method === authMethodFilter;
      const matchesStatus = authStatusFilter === 'all' || test.status === authStatusFilter;
      const matchesType = authTypeFilter === 'all' || test.testType === authTypeFilter;
      
      return matchesMethod && matchesStatus && matchesType;
    });
  };
  
  // Filtering function for error handling tests
  const getFilteredErrorTests = () => {
    if (!errorResults?.results.errorTests) return [];
    
    return errorResults.results.errorTests.filter(test => {
      const matchesMethod = errorMethodFilter === 'all' || test.method === errorMethodFilter;
      const matchesStatus = errorStatusFilter === 'all' || test.status === errorStatusFilter;
      const matchesStatusCode = errorStatusCodeFilter === 'all' || 
        (test.actualStatus && errorStatusCodeFilter === test.actualStatus.toString()) ||
        (test.expectedStatus && errorStatusCodeFilter === test.expectedStatus.toString());
      
      return matchesMethod && matchesStatus && matchesStatusCode;
    });
  };
  
  // Filtering function for performance tests
  const getFilteredPerformanceTests = () => {
    if (!performanceResults?.results.performanceTests) return [];
    
    return performanceResults.results.performanceTests.filter(test => {
      const matchesMethod = perfMethodFilter === 'all' || test.method === perfMethodFilter;
      const matchesStatus = perfStatusFilter === 'all' || test.status === perfStatusFilter;
      
      return matchesMethod && matchesStatus;
    });
  };
  
  // Get unique status codes for filter options
  const getUniqueStatusCodes = () => {
    if (!availabilityResults?.results.endpointTests) return [];
    
    const statusCodes = availabilityResults.results.endpointTests
      .map(test => test.statusCode?.toString())
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
      
    return statusCodes;
  };
  
  // Get unique status codes for error tests filter
  const getUniqueErrorStatusCodes = () => {
    if (!errorResults?.results.errorTests) return [];
    
    const statusCodes = errorResults.results.errorTests
      .flatMap(test => [
        test.actualStatus?.toString(), 
        test.expectedStatus?.toString()
      ])
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
      
    return statusCodes;
  };
  
  // Get unique auth test types for auth test filter
  const getUniqueAuthTestTypes = () => {
    if (!authResults?.results.authTests) return [];
    
    const testTypes = authResults.results.authTests
      .map(test => test.testType)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
      
    return testTypes;
  };
  
  // Determine if any test is loading
  const isAnyTestLoading = 
    isAvailabilityLoading || 
    isValidationLoading || 
    isAuthLoading || 
    isErrorLoading || 
    isPerformanceLoading;

  return (
    <DeveloperLayout 
      title="API Tests" 
      subtitle="Comprehensive tests for API endpoints, validation, auth, error handling, and performance"
    >
      <div className="mb-6 flex justify-between items-center">
        <div>
          <div className="flex items-center">
            <Server className="w-6 h-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold">API System Tests</h2>
          </div>
          <p className="text-gray-500 mt-1">
            Verify endpoint functionality, response validation, authentication, error handling, and performance
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
            {isAnyTestLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Current Test
          </Button>
          <Button 
            variant="default" 
            disabled={runAllTestsMutation.isPending} 
            onClick={runAllTests}
          >
            {runAllTestsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run All Tests
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      {allTestsResults && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>Test Summary</CardTitle>
              <TestStatus status={allTestsResults.status} />
            </div>
            <CardDescription>
              Overall API system test results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Test Completion</span>
                  <span>{allTestsResults.summary.passedTests} of {allTestsResults.summary.totalTests} passed</span>
                </div>
                <Progress value={(allTestsResults.summary.passedTests / allTestsResults.summary.totalTests) * 100} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                <Card className={`p-3 border ${allTestsResults.results.endpointAvailability.status === 'passed' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="text-xs font-medium mb-1">Availability</div>
                  <TestStatus status={allTestsResults.results.endpointAvailability.status} />
                </Card>
                <Card className={`p-3 border ${allTestsResults.results.responseValidation.status === 'passed' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="text-xs font-medium mb-1">Validation</div>
                  <TestStatus status={allTestsResults.results.responseValidation.status} />
                </Card>
                <Card className={`p-3 border ${allTestsResults.results.authTests.status === 'passed' ? 'border-green-200 bg-green-50' : allTestsResults.results.authTests.status === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="text-xs font-medium mb-1">Auth</div>
                  <TestStatus status={allTestsResults.results.authTests.status} />
                </Card>
                <Card className={`p-3 border ${allTestsResults.results.errorHandling.status === 'passed' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="text-xs font-medium mb-1">Errors</div>
                  <TestStatus status={allTestsResults.results.errorHandling.status} />
                </Card>
                <Card className={`p-3 border ${allTestsResults.results.performance.status === 'passed' ? 'border-green-200 bg-green-50' : allTestsResults.results.performance.status === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="text-xs font-medium mb-1">Performance</div>
                  <TestStatus status={allTestsResults.results.performance.status} />
                </Card>
              </div>

              {allTestsResults.failedTests.length > 0 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Failed Tests</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      {allTestsResults.failedTests.slice(0, 5).map((test, idx) => (
                        <li key={idx}>{test}</li>
                      ))}
                      {allTestsResults.failedTests.length > 5 && (
                        <li>...and {allTestsResults.failedTests.length - 5} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="availability" value={selectedTest} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-5 mb-6">
          <TabsTrigger value="availability" className="flex items-center">
            <Network className="w-4 h-4 mr-2" />
            <span>Endpoint Availability</span>
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            <span>Response Validation</span>
          </TabsTrigger>
          <TabsTrigger value="auth" className="flex items-center">
            <ShieldCheck className="w-4 h-4 mr-2" />
            <span>Auth & Authorization</span>
          </TabsTrigger>
          <TabsTrigger value="error-handling" className="flex items-center">
            <FileWarning className="w-4 h-4 mr-2" />
            <span>Error Handling</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            <span>Performance</span>
          </TabsTrigger>
        </TabsList>

        {/* Endpoint Availability Tab */}
        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Endpoint Availability Tests</CardTitle>
                {availabilityResults && <TestStatus status={availabilityResults.status} />}
              </div>
              <CardDescription>
                Verifies that all API endpoints are accessible and responding correctly
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAvailabilityLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="animate-spin w-6 h-6 mr-2" />
                  <p>Running endpoint availability tests...</p>
                </div>
              ) : availabilityResults ? (
                <div>
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-100 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Total Endpoints</div>
                        <div className="text-xl font-semibold">{availabilityResults.results.totalEndpoints}</div>
                      </div>
                      <div className="bg-gray-100 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Available</div>
                        <div className="text-xl font-semibold">{availabilityResults.results.availableEndpoints}</div>
                      </div>
                      <div className="bg-gray-100 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Success Rate</div>
                        <div className="text-xl font-semibold">
                          {Math.round((availabilityResults.results.availableEndpoints / availabilityResults.results.totalEndpoints) * 100)}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Filters */}
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <label className="text-xs mb-1 text-gray-500">Method</label>
                        <Select value={methodFilter} onValueChange={setMethodFilter}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Methods</SelectItem>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex flex-col">
                        <label className="text-xs mb-1 text-gray-500">Status</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="passed">Passed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex flex-col">
                        <label className="text-xs mb-1 text-gray-500">Status Code</label>
                        <Select value={statusCodeFilter} onValueChange={setStatusCodeFilter}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Status Code" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Codes</SelectItem>
                            {getUniqueStatusCodes().map(code => (
                              <SelectItem key={code} value={code}>{code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="mb-2 text-sm text-gray-500">
                    Showing {getFilteredEndpointTests().length} of {availabilityResults.results.endpointTests.length} endpoints
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Response Time</TableHead>
                        <TableHead>Status Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredEndpointTests().map((test, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{test.endpoint}</TableCell>
                          <TableCell>
                            <Badge variant={test.method === 'GET' ? 'outline' : 'default'}>
                              {test.method}
                            </Badge>
                          </TableCell>
                          <TableCell>{test.description}</TableCell>
                          <TableCell>
                            <TestStatus status={test.status} />
                          </TableCell>
                          <TableCell>{test.responseTime ? `${test.responseTime}ms` : '-'}</TableCell>
                          <TableCell>
                            {test.statusCode && (
                              <Badge 
                                variant={
                                  test.statusCode >= 200 && test.statusCode < 300 ? 'success' :
                                  test.statusCode >= 300 && test.statusCode < 400 ? 'outline' :
                                  'destructive'
                                }
                              >
                                {test.statusCode}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500">No test results available. Run the test to see results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Response Validation Tab */}
        <TabsContent value="validation">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Response Validation Tests</CardTitle>
                {validationResults && <TestStatus status={validationResults.status} />}
              </div>
              <CardDescription>
                Verifies that API responses follow the expected data structure and format
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isValidationLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="animate-spin w-6 h-6 mr-2" />
                  <p>Running response validation tests...</p>
                </div>
              ) : validationResults ? (
                <div>
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-100 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Total Tests</div>
                        <div className="text-xl font-semibold">{validationResults.results.totalTests}</div>
                      </div>
                      <div className="bg-gray-100 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Passed</div>
                        <div className="text-xl font-semibold">{validationResults.results.passedTests}</div>
                      </div>
                      <div className="bg-gray-100 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Success Rate</div>
                        <div className="text-xl font-semibold">
                          {Math.round((validationResults.results.passedTests / validationResults.results.totalTests) * 100)}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Filters */}
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <label className="text-xs mb-1 text-gray-500">Status</label>
                        <Select value={validationStatusFilter} onValueChange={setValidationStatusFilter}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="passed">Passed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResults.results.validationTests.map((test, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{test.endpoint}</TableCell>
                          <TableCell>{test.description}</TableCell>
                          <TableCell>
                            <TestStatus status={test.status} />
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{test.message}</span>
                              </TooltipTrigger>
                              {test.responseExample && (
                                <TooltipContent>
                                  <pre className="text-xs max-w-xs overflow-auto">{test.responseExample}</pre>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500">No test results available. Run the test to see results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auth & Authorization Tab */}
        <TabsContent value="auth">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Authentication & Authorization Tests</CardTitle>
                {authResults && <TestStatus status={authResults.status} />}
              </div>
              <CardDescription>
                Verifies that authentication and authorization rules are properly enforced
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAuthLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="animate-spin w-6 h-6 mr-2" />
                  <p>Running authentication and authorization tests...</p>
                </div>
              ) : authResults ? (
                <div>
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-100 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Total Tests</div>
                        <div className="text-xl font-semibold">{authResults.results.totalTests}</div>
                      </div>
                      <div className="bg-gray-100 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Passed</div>
                        <div className="text-xl font-semibold">{authResults.results.passedTests}</div>
                      </div>
                      <div className="bg-gray-100 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Warnings</div>
                        <div className="text-xl font-semibold">{authResults.results.warningTests}</div>
                      </div>
                      <div className="bg-gray-100 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Failed</div>
                        <div className="text-xl font-semibold">{authResults.results.failedTests}</div>
                      </div>
                    </div>
                    
                    {/* Filters */}
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <label className="text-xs mb-1 text-gray-500">Method</label>
                        <Select value={authMethodFilter} onValueChange={setAuthMethodFilter}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Methods</SelectItem>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex flex-col">
                        <label className="text-xs mb-1 text-gray-500">Status</label>
                        <Select value={authStatusFilter} onValueChange={setAuthStatusFilter}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="passed">Passed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex flex-col">
                        <label className="text-xs mb-1 text-gray-500">Test Type</label>
                        <Select value={authTypeFilter} onValueChange={setAuthTypeFilter}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Test Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {getUniqueAuthTestTypes().map(type => (
                              <SelectItem key={type} value={type}>
                                {type === 'public_access' ? 'Public Access' : 
                                 type === 'authenticated_access' ? 'Authenticated Access' : 
                                 'Admin Access'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Test Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Response Codes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {authResults.results.authTests.map((test, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{test.endpoint}</TableCell>
                          <TableCell>
                            <Badge variant={test.method === 'GET' ? 'outline' : 'default'}>
                              {test.method}
                            </Badge>
                          </TableCell>
                          <TableCell>{test.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {test.testType === 'public_access' ? 'Public' : 
                               test.testType === 'authenticated_access' ? 'Auth Required' : 
                               'Admin Only'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <TestStatus status={test.status} />
                          </TableCell>
                          <TableCell>
                            {test.results && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex space-x-1">
                                    <Badge variant="outline">
                                      No Auth: {test.results.noAuth}
                                    </Badge>
                                    <Badge variant="outline">
                                      User: {test.results.userAuth}
                                    </Badge>
                                    <Badge variant="outline">
                                      Admin: {test.results.adminAuth}
                                    </Badge>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{test.message}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500">No test results available. Run the test to see results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Error Handling Tab */}
        <TabsContent value="error-handling">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Error Handling Tests</CardTitle>
                {errorResults && <TestStatus status={errorResults.status} />}
              </div>
              <CardDescription>
                Verifies that API endpoints handle errors properly with appropriate status codes and error messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isErrorLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="animate-spin w-6 h-6 mr-2" />
                  <p>Running error handling tests...</p>
                </div>
              ) : errorResults ? (
                <div>
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-100 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Total Tests</div>
                        <div className="text-xl font-semibold">{errorResults.results.totalTests}</div>
                      </div>
                      <div className="bg-gray-100 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Passed</div>
                        <div className="text-xl font-semibold">{errorResults.results.passedTests}</div>
                      </div>
                      <div className="bg-gray-100 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Success Rate</div>
                        <div className="text-xl font-semibold">
                          {Math.round((errorResults.results.passedTests / errorResults.results.totalTests) * 100)}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Filters */}
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <label className="text-xs mb-1 text-gray-500">Method</label>
                        <Select value={errorMethodFilter} onValueChange={setErrorMethodFilter}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Methods</SelectItem>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex flex-col">
                        <label className="text-xs mb-1 text-gray-500">Status</label>
                        <Select value={errorStatusFilter} onValueChange={setErrorStatusFilter}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="passed">Passed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex flex-col">
                        <label className="text-xs mb-1 text-gray-500">Status Code</label>
                        <Select value={errorStatusCodeFilter} onValueChange={setErrorStatusCodeFilter}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Status Code" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Codes</SelectItem>
                            {getUniqueErrorStatusCodes().map(code => (
                              <SelectItem key={code} value={code}>{code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-2 text-sm text-gray-500">
                    Showing {getFilteredErrorTests().length} of {errorResults.results.errorTests.length} error handling tests
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expected Status</TableHead>
                        <TableHead>Actual Status</TableHead>
                        <TableHead>Standard Format</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredErrorTests().map((test, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{test.endpoint}</TableCell>
                          <TableCell>
                            <Badge variant={test.method === 'GET' ? 'outline' : 'default'}>
                              {test.method}
                            </Badge>
                          </TableCell>
                          <TableCell>{test.description}</TableCell>
                          <TableCell>
                            <TestStatus status={test.status} />
                          </TableCell>
                          <TableCell>{test.expectedStatus}</TableCell>
                          <TableCell>{test.actualStatus || '-'}</TableCell>
                          <TableCell>
                            {test.hasStandardFormat !== undefined ? (
                              test.hasStandardFormat ? 
                                <CheckCircle className="w-5 h-5 text-green-600" /> : 
                                <XCircle className="w-5 h-5 text-red-600" />
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500">No test results available. Run the test to see results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Performance Tests</CardTitle>
                {performanceResults && <TestStatus status={performanceResults.status} />}
              </div>
              <CardDescription>
                Verifies API performance by measuring response times against predefined thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPerformanceLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="animate-spin w-6 h-6 mr-2" />
                  <p>Running performance tests...</p>
                </div>
              ) : performanceResults ? (
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-gray-100 p-3 rounded-md">
                      <div className="text-sm text-gray-500">Total Tests</div>
                      <div className="text-xl font-semibold">{performanceResults.results.totalTests}</div>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-md">
                      <div className="text-sm text-gray-500">Passed</div>
                      <div className="text-xl font-semibold">{performanceResults.results.passedTests}</div>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-md">
                      <div className="text-sm text-gray-500">Warnings</div>
                      <div className="text-xl font-semibold">{performanceResults.results.warningTests}</div>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-md">
                      <div className="text-sm text-gray-500">Failed</div>
                      <div className="text-xl font-semibold">{performanceResults.results.failedTests}</div>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-md">
                      <div className="text-sm text-gray-500">Avg Response Time</div>
                      <div className="text-xl font-semibold">{performanceResults.results.averageResponseTime}ms</div>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Response Time</TableHead>
                        <TableHead>Expected Max</TableHead>
                        <TableHead>Measurements</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceResults.results.performanceTests.map((test, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{test.endpoint}</TableCell>
                          <TableCell>
                            <Badge variant={test.method === 'GET' ? 'outline' : 'default'}>
                              {test.method}
                            </Badge>
                          </TableCell>
                          <TableCell>{test.description}</TableCell>
                          <TableCell>
                            <TestStatus status={test.status} />
                          </TableCell>
                          <TableCell>
                            {test.responseTime !== undefined && (
                              <span className={
                                test.responseTime <= test.expectedMaxTime ? 'text-green-600' :
                                test.responseTime <= test.expectedMaxTime * 1.5 ? 'text-amber-600' :
                                'text-red-600'
                              }>
                                {test.responseTime}ms
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{test.expectedMaxTime}ms</TableCell>
                          <TableCell>
                            {test.measurements && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm">View</Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="p-2">
                                    <p className="text-xs font-medium mb-1">Individual Measurements:</p>
                                    <ul className="space-y-1">
                                      {test.measurements.map((measurement, i) => (
                                        <li key={i} className="text-xs">{i+1}: {measurement}ms</li>
                                      ))}
                                    </ul>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500">No test results available. Run the test to see results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DeveloperLayout>
  );
}

export default ApiTestsPage;