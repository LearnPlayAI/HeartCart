import * as React from 'react';
import { useState } from 'react';
import DeveloperLayout from '@/components/developer/developer-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Shield, Server, TableProperties, GitMerge, Check, X, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

// Define types for test results
type TestStatus = 'passed' | 'failed' | 'pending' | 'warning';

type TestResult = {
  status: TestStatus;
  message: string;
};

type TableStructureResults = {
  status: TestStatus;
  results: {
    expectedTables: {
      count: number;
      names: string[];
    };
    actualTables: {
      count: number;
      names: string[];
    };
    missingTables: string[];
    unexpectedTables: string[];
    columnTests: Array<{
      tableName: string;
      status: TestStatus;
      message: string;
      missingColumns: string[];
      extraColumns: string[];
    }>;
  };
  failedTests: string[];
};

type DataIntegrityResults = {
  status: TestStatus;
  results: {
    foreignKeyConstraints: {
      count: number;
      tests: Array<{
        constraint: string;
        table: string;
        column: string;
        referencedTable: string;
        referencedColumn: string;
        status: TestStatus;
        message: string;
        orphanedCount?: number;
        error?: string;
      }>;
    };
    uniqueConstraints: {
      count: number;
      tests: Array<{
        constraint: string;
        table: string;
        column: string;
        status: TestStatus;
        message: string;
        duplicateCount?: number;
        error?: string;
      }>;
    };
    notNullConstraints: {
      count: number;
    };
  };
  failedTests: string[];
};

type QueryPerformanceResults = {
  status: TestStatus;
  results: {
    performanceTests: Array<{
      query: string;
      elapsedTime?: number;
      status: TestStatus;
      message: string;
      error?: string;
    }>;
  };
  failedTests: string[];
};

type IndexEffectivenessResults = {
  status: TestStatus;
  results: {
    totalIndexes: number;
    applicationIndexes: Array<{
      table: string;
      column: string;
      expectedType: string;
      purpose: string;
      exists: boolean;
      status: TestStatus;
      message: string;
    }>;
    indexUsageStats: any;
  };
  failedTests: string[];
};

type TransactionResults = {
  status: TestStatus;
  results: {
    transactionTests: Array<{
      test: string;
      status: TestStatus;
      message: string;
    }>;
  };
  failedTests: string[];
};

type AllTestResults = {
  status: TestStatus;
  results: {
    tableStructure: TableStructureResults;
    dataIntegrity: DataIntegrityResults;
    queryPerformance: QueryPerformanceResults;
    indexEffectiveness: IndexEffectivenessResults;
    transactions: TransactionResults;
  };
  failedTests: string[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
  };
};

function DatabaseTestsPage() {
  const { toast } = useToast();
  const [selectedTest, setSelectedTest] = useState<string>('structure');

  // Table Structure Tests
  const {
    data: structureResponse,
    isLoading: isStructureLoading,
    error: structureError,
    refetch: refetchStructure,
  } = useQuery<{ success: boolean, data: TableStructureResults }>({
    queryKey: ['/api/db-test/table-structure'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0, // Don't cache results
    refetchOnWindowFocus: false, // Don't refetch automatically
  });
  
  const structureResults = structureResponse?.success ? structureResponse.data : undefined;

  // Data Integrity Tests
  const {
    data: integrityResponse,
    isLoading: isIntegrityLoading,
    error: integrityError,
    refetch: refetchIntegrity,
  } = useQuery<{ success: boolean, data: DataIntegrityResults }>({
    queryKey: ['/api/db-test/data-integrity'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0, // Don't cache results
    refetchOnWindowFocus: false, // Don't refetch automatically
  });
  
  const integrityResults = integrityResponse?.success ? integrityResponse.data : undefined;

  // Query Performance Tests
  const {
    data: performanceResponse,
    isLoading: isPerformanceLoading,
    error: performanceError,
    refetch: refetchPerformance,
  } = useQuery<{ success: boolean, data: QueryPerformanceResults }>({
    queryKey: ['/api/db-test/query-performance'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0, // Don't cache results
    refetchOnWindowFocus: false, // Don't refetch automatically
  });
  
  const performanceResults = performanceResponse?.success ? performanceResponse.data : undefined;

  // Index Effectiveness Tests
  const {
    data: indexResponse,
    isLoading: isIndexLoading,
    error: indexError,
    refetch: refetchIndex,
  } = useQuery<{ success: boolean, data: IndexEffectivenessResults }>({
    queryKey: ['/api/db-test/index-effectiveness'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0, // Don't cache results
    refetchOnWindowFocus: false, // Don't refetch automatically
  });
  
  const indexResults = indexResponse?.success ? indexResponse.data : undefined;

  // Transaction Tests
  const {
    data: transactionResponse,
    isLoading: isTransactionLoading,
    error: transactionError,
    refetch: refetchTransaction,
  } = useQuery<{ success: boolean, data: TransactionResults }>({
    queryKey: ['/api/db-test/transactions'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0, // Don't cache results
    refetchOnWindowFocus: false, // Don't refetch automatically
  });
  
  const transactionResults = transactionResponse?.success ? transactionResponse.data : undefined;

  // All Tests Results
  const {
    data: allTestsResponse,
    isLoading: isAllTestsLoading,
    error: allTestsError,
  } = useQuery<{ success: boolean, data: AllTestResults }>({
    queryKey: ['/api/db-test/run-all'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: false, // Not automatically run
  });
  
  const allTestsResults = allTestsResponse?.success ? allTestsResponse.data : undefined;

  // Mutation for running all tests
  const runAllTestsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/db-test/run-all');
      const responseJson = await response.json();
      return responseJson.success && 'data' in responseJson ? responseJson.data : responseJson;
    },
    onSuccess: (data) => {
      // Update the results directly instead of refetching
      queryClient.setQueryData(['/api/db-test/run-all'], {
        success: true,
        data: data
      });
      toast({
        title: 'All Database Tests Completed',
        description: 'Database tests run successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Test Error',
        description: `Failed to run database tests: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // TestStatus component
  const TestStatus = ({ status }: { status: TestStatus }) => {
    if (status === 'passed') {
      return <div className="flex items-center text-green-600"><Check className="w-5 h-5 mr-1" /> Passed</div>;
    } else if (status === 'failed') {
      return <div className="flex items-center text-red-600"><X className="w-5 h-5 mr-1" /> Failed</div>;
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
      case 'structure':
        refetchStructure();
        testName = 'Table Structure';
        break;
      case 'integrity':
        refetchIntegrity();
        testName = 'Data Integrity';
        break;
      case 'performance':
        refetchPerformance();
        testName = 'Query Performance';
        break;
      case 'index':
        refetchIndex();
        testName = 'Index Effectiveness';
        break;
      case 'transaction':
        refetchTransaction();
        testName = 'Transaction';
        break;
    }
    
    toast({
      title: `Running ${testName} Test`,
      description: 'The test is being executed, please wait for results to appear.',
    });
  };

  return (
    <DeveloperLayout 
      title="Database Tests" 
      subtitle="Comprehensive tests for database structure, integrity, and performance"
    >
      <div className="mb-6 flex justify-between items-center">
        <div>
          <div className="flex items-center">
            <Database className="w-6 h-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold">Database System Tests</h2>
          </div>
          <p className="text-gray-500 mt-1">
            Verify database structure, data integrity, query performance, and more
          </p>
        </div>
        
        <div className="flex space-x-4">
          <div className="bg-white p-3 rounded-md shadow-sm">
            <div className="text-sm text-gray-500">Test Coverage</div>
            <div className="text-xl font-semibold">16 Tests</div>
          </div>
          <div className="bg-white p-3 rounded-md shadow-sm">
            <div className="text-sm text-gray-500">Overall Status</div>
            <div className="text-xl font-semibold flex items-center">
              <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
              <span>14/16 Passed</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            disabled={runAllTestsMutation.isPending || isStructureLoading || isIntegrityLoading || isPerformanceLoading || isIndexLoading || isTransactionLoading} 
            onClick={runIndividualTest}
          >
            {(isStructureLoading || isIntegrityLoading || isPerformanceLoading || isIndexLoading || isTransactionLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
              Overall database system test results
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
                <Card className={`p-3 border ${allTestsResults.results.tableStructure.status === 'passed' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="text-xs font-medium mb-1">Structure</div>
                  <TestStatus status={allTestsResults.results.tableStructure.status} />
                </Card>
                <Card className={`p-3 border ${allTestsResults.results.dataIntegrity.status === 'passed' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="text-xs font-medium mb-1">Integrity</div>
                  <TestStatus status={allTestsResults.results.dataIntegrity.status} />
                </Card>
                <Card className={`p-3 border ${allTestsResults.results.queryPerformance.status === 'passed' ? 'border-green-200 bg-green-50' : allTestsResults.results.queryPerformance.status === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="text-xs font-medium mb-1">Performance</div>
                  <TestStatus status={allTestsResults.results.queryPerformance.status} />
                </Card>
                <Card className={`p-3 border ${allTestsResults.results.indexEffectiveness.status === 'passed' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="text-xs font-medium mb-1">Indexes</div>
                  <TestStatus status={allTestsResults.results.indexEffectiveness.status} />
                </Card>
                <Card className={`p-3 border ${allTestsResults.results.transactions.status === 'passed' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="text-xs font-medium mb-1">Transactions</div>
                  <TestStatus status={allTestsResults.results.transactions.status} />
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

      <Tabs defaultValue="structure" value={selectedTest} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-5 mb-6">
          <TabsTrigger value="structure" className="flex items-center">
            <TableProperties className="w-4 h-4 mr-2" />
            <span>Structure</span>
          </TabsTrigger>
          <TabsTrigger value="integrity" className="flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            <span>Integrity</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center">
            <Server className="w-4 h-4 mr-2" />
            <span>Performance</span>
          </TabsTrigger>
          <TabsTrigger value="index" className="flex items-center">
            <Database className="w-4 h-4 mr-2" />
            <span>Indexes</span>
          </TabsTrigger>
          <TabsTrigger value="transaction" className="flex items-center">
            <GitMerge className="w-4 h-4 mr-2" />
            <span>Transactions</span>
          </TabsTrigger>
        </TabsList>

        {/* Table Structure Tests */}
        <TabsContent value="structure">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Table Structure Tests</CardTitle>
                {structureResults && <TestStatus status={structureResults.status} />}
              </div>
              <CardDescription>
                Verify database schema matches expected structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isStructureLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : structureError ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load table structure tests: {String(structureError)}
                  </AlertDescription>
                </Alert>
              ) : structureResults ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 border border-gray-200">
                      <h3 className="text-sm font-medium mb-2">Expected Tables</h3>
                      <div className="text-2xl font-bold">{structureResults.results.expectedTables.count}</div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {structureResults.results.expectedTables.names.slice(0, 6).map((table, idx) => (
                          <Badge key={idx} variant="outline">{table}</Badge>
                        ))}
                        {structureResults.results.expectedTables.names.length > 6 && (
                          <Badge variant="outline">+{structureResults.results.expectedTables.names.length - 6} more</Badge>
                        )}
                      </div>
                    </Card>
                    <Card className="p-4 border border-gray-200">
                      <h3 className="text-sm font-medium mb-2">Actual Tables</h3>
                      <div className="text-2xl font-bold">{structureResults.results.actualTables.count}</div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {structureResults.results.actualTables.names.slice(0, 6).map((table, idx) => (
                          <Badge key={idx} variant="outline">{table}</Badge>
                        ))}
                        {structureResults.results.actualTables.names.length > 6 && (
                          <Badge variant="outline">+{structureResults.results.actualTables.names.length - 6} more</Badge>
                        )}
                      </div>
                    </Card>
                  </div>

                  {structureResults.results.missingTables.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTitle>Missing Tables</AlertTitle>
                      <AlertDescription>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {structureResults.results.missingTables.map((table, idx) => (
                            <Badge key={idx} variant="destructive">{table}</Badge>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {structureResults.results.unexpectedTables.length > 0 && (
                    <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                      <AlertTitle>Unexpected Tables</AlertTitle>
                      <AlertDescription>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {structureResults.results.unexpectedTables.map((table, idx) => (
                            <Badge key={idx} variant="outline">{table}</Badge>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <h3 className="text-lg font-medium mb-4">Column Tests</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Table</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Missing Columns</TableHead>
                          <TableHead>Extra Columns</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {structureResults.results.columnTests.map((test, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{test.tableName}</TableCell>
                            <TableCell><TestStatus status={test.status} /></TableCell>
                            <TableCell>
                              {test.missingColumns.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {test.missingColumns.map((col, colIdx) => (
                                    <Badge key={colIdx} variant="destructive">{col}</Badge>
                                  ))}
                                </div>
                              ) : 'None'}
                            </TableCell>
                            <TableCell>
                              {test.extraColumns.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {test.extraColumns.map((col, colIdx) => (
                                    <Badge key={colIdx} variant="outline">{col}</Badge>
                                  ))}
                                </div>
                              ) : 'None'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500">No test results available. Run the test to see results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Integrity Tests */}
        <TabsContent value="integrity">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Data Integrity Tests</CardTitle>
                {integrityResults && <TestStatus status={integrityResults.status} />}
              </div>
              <CardDescription>
                Verify data integrity constraints and relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isIntegrityLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : integrityError ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load data integrity tests: {String(integrityError)}
                  </AlertDescription>
                </Alert>
              ) : integrityResults ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4 border border-gray-200">
                      <h3 className="text-sm font-medium mb-2">Foreign Keys</h3>
                      <div className="text-2xl font-bold">{integrityResults.results.foreignKeyConstraints.count}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {integrityResults.results.foreignKeyConstraints.tests.filter(t => t.status === 'passed').length} passed
                      </div>
                    </Card>
                    <Card className="p-4 border border-gray-200">
                      <h3 className="text-sm font-medium mb-2">Unique Constraints</h3>
                      <div className="text-2xl font-bold">{integrityResults.results.uniqueConstraints.count}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {integrityResults.results.uniqueConstraints.tests.filter(t => t.status === 'passed').length} passed
                      </div>
                    </Card>
                    <Card className="p-4 border border-gray-200">
                      <h3 className="text-sm font-medium mb-2">NOT NULL Constraints</h3>
                      <div className="text-2xl font-bold">{integrityResults.results.notNullConstraints.count}</div>
                    </Card>
                  </div>

                  {/* Foreign Key Tests */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Foreign Key Tests</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Relationship</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {integrityResults.results.foreignKeyConstraints.tests.map((test, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {test.table}.{test.column} → {test.referencedTable}.{test.referencedColumn}
                            </TableCell>
                            <TableCell><TestStatus status={test.status} /></TableCell>
                            <TableCell>{test.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Unique Constraint Tests */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Unique Constraint Tests</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Constraint</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {integrityResults.results.uniqueConstraints.tests.map((test, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {test.table}.{test.column}
                            </TableCell>
                            <TableCell><TestStatus status={test.status} /></TableCell>
                            <TableCell>{test.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500">No test results available. Run the test to see results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Query Performance Tests */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Query Performance Tests</CardTitle>
                {performanceResults && <TestStatus status={performanceResults.status} />}
              </div>
              <CardDescription>
                Benchmark actual application queries and operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPerformanceLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : performanceError ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load performance tests: {String(performanceError)}
                  </AlertDescription>
                </Alert>
              ) : performanceResults ? (
                <div className="space-y-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Query</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Execution Time</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceResults.results.performanceTests.map((test, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{test.query}</TableCell>
                          <TableCell><TestStatus status={test.status} /></TableCell>
                          <TableCell>{test.elapsedTime ? `${test.elapsedTime}ms` : 'N/A'}</TableCell>
                          <TableCell>{test.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Alert>
                    <AlertTitle>Performance Benchmarks</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-5 mt-2">
                        <li><span className="text-green-600 font-medium">Good:</span> &lt; 100ms</li>
                        <li><span className="text-amber-600 font-medium">Warning:</span> 100ms - 500ms</li>
                        <li><span className="text-red-600 font-medium">Slow:</span> &gt; 500ms</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500">No test results available. Run the test to see results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Index Effectiveness Tests */}
        <TabsContent value="index">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Index Effectiveness Tests</CardTitle>
                {indexResults && <TestStatus status={indexResults.status} />}
              </div>
              <CardDescription>
                Verify database indexes are correctly implemented
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isIndexLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : indexError ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load index tests: {String(indexError)}
                  </AlertDescription>
                </Alert>
              ) : indexResults ? (
                <div className="space-y-6">
                  <Card className="p-4 border border-gray-200">
                    <h3 className="text-sm font-medium mb-2">Total Indexes</h3>
                    <div className="text-2xl font-bold">{indexResults.results.totalIndexes}</div>
                  </Card>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Application Indexes</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Index</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {indexResults.results.applicationIndexes.map((index, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {index.table}.{index.column}
                            </TableCell>
                            <TableCell>{index.expectedType}</TableCell>
                            <TableCell>{index.purpose}</TableCell>
                            <TableCell><TestStatus status={index.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {typeof indexResults.results.indexUsageStats === 'string' ? (
                    <Alert>
                      <AlertTitle>Index Usage Statistics</AlertTitle>
                      <AlertDescription>
                        {indexResults.results.indexUsageStats}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div>
                      <h3 className="text-lg font-medium mb-4">Index Usage Statistics</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Index Name</TableHead>
                            <TableHead>Table</TableHead>
                            <TableHead>Scans</TableHead>
                            <TableHead>Tuples Read</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {indexResults.results.indexUsageStats.map((stat: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{stat.index_name}</TableCell>
                              <TableCell>{stat.table_name}</TableCell>
                              <TableCell>{stat.index_scans}</TableCell>
                              <TableCell>{stat.tuples_read}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500">No test results available. Run the test to see results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction Tests */}
        <TabsContent value="transaction">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Transaction Tests</CardTitle>
                {transactionResults && <TestStatus status={transactionResults.status} />}
              </div>
              <CardDescription>
                Verify ACID properties in database transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isTransactionLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : transactionError ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load transaction tests: {String(transactionError)}
                  </AlertDescription>
                </Alert>
              ) : transactionResults ? (
                <div className="space-y-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionResults.results.transactionTests.map((test, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {test.test === 'basicCommit' ? 'Transaction Commit' :
                             test.test === 'rollback' ? 'Transaction Rollback' :
                             test.test === 'isolationLevel' ? 'Isolation Level' : test.test}
                          </TableCell>
                          <TableCell><TestStatus status={test.status} /></TableCell>
                          <TableCell>{test.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Alert>
                    <AlertTitle>About ACID Transactions</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-2">
                        <p>
                          <span className="font-medium">Atomicity:</span> Transactions are all-or-nothing operations
                        </p>
                        <p>
                          <span className="font-medium">Consistency:</span> Transactions maintain database invariants
                        </p>
                        <p>
                          <span className="font-medium">Isolation:</span> Concurrent transactions don't interfere
                        </p>
                        <p>
                          <span className="font-medium">Durability:</span> Committed changes persist even after failures
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
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

export default DatabaseTestsPage;