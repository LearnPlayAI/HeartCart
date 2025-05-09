import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import AdminLayout from '@/components/admin/admin-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

// Utility function to run password validation test
async function testPasswordValidation(password: string) {
  try {
    const response = await apiRequest(
      'POST', 
      '/api/auth-test/validate-password', 
      { password }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to test password validation');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Password validation test error:', error);
    throw error;
  }
}

// Function to run comprehensive auth system tests
async function runSystemTests() {
  try {
    const response = await apiRequest('GET', '/api/auth-test/system-tests');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to run system tests');
    }
    
    return await response.json();
  } catch (error) {
    console.error('System tests error:', error);
    throw error;
  }
}

// Function to test session persistence
async function testSessionPersistence() {
  try {
    const response = await apiRequest('GET', '/api/auth-test/session-persistence');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to test session persistence');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Session persistence test error:', error);
    throw error;
  }
}

// Function to test session timeout
async function testSessionTimeout() {
  try {
    const response = await apiRequest('GET', '/api/auth-test/session-timeout');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to test session timeout');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Session timeout test error:', error);
    throw error;
  }
}

// Function to test local auth without admin privileges
async function runLocalTest() {
  try {
    const response = await fetch('/api/auth-test/local');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to run local test');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Local test error:', error);
    throw error;
  }
}

function AuthTestDashboard() {
  const { toast } = useToast();
  const [testPassword, setTestPassword] = useState('TestPass123');
  const [tab, setTab] = useState('overview');
  
  // Local test that doesn't require admin authentication
  const { 
    data: localTestData,
    isLoading: localTestLoading,
    error: localTestError,
    refetch: refetchLocalTest
  } = useQuery({ 
    queryKey: ['/api/auth-test/local'],
    queryFn: () => runLocalTest(),
    enabled: true
  });
  
  // User count (requires admin authentication)
  const { 
    data: userCountData,
    isLoading: userCountLoading,
    error: userCountError,
    refetch: refetchUserCount
  } = useQuery({ 
    queryKey: ['/api/auth-test/user-count'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth-test/user-count');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get user count');
      }
      return await response.json();
    }
  });
  
  // Test password validation
  const handleTestPassword = async () => {
    try {
      const result = await testPasswordValidation(testPassword);
      toast({
        title: result.data.valid ? 'Password Valid' : 'Password Invalid',
        description: result.data.valid 
          ? 'The password meets all requirements' 
          : `Invalid password: ${result.data.errors.join(', ')}`,
        variant: result.data.valid ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };
  
  // Run system tests
  const [systemTestResults, setSystemTestResults] = useState<any>(null);
  const [systemTestsLoading, setSystemTestsLoading] = useState(false);
  
  const handleRunSystemTests = async () => {
    setSystemTestsLoading(true);
    try {
      const result = await runSystemTests();
      setSystemTestResults(result.data);
      toast({
        title: `System Tests ${result.data.status === 'passed' ? 'Passed' : 'Failed'}`,
        description: `${result.data.failedTests.length} failed tests out of 4 total tests`,
        variant: result.data.status === 'passed' ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'System Tests Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setSystemTestsLoading(false);
    }
  };
  
  // Test session persistence
  const [sessionPersistenceResults, setSessionPersistenceResults] = useState<any>(null);
  const [sessionPersistenceLoading, setSessionPersistenceLoading] = useState(false);
  
  const handleTestSessionPersistence = async () => {
    setSessionPersistenceLoading(true);
    try {
      const result = await testSessionPersistence();
      setSessionPersistenceResults(result.data);
      toast({
        title: `Session Persistence ${result.data.status === 'success' ? 'Good' : 'Issue Detected'}`,
        description: result.data.diagnostics,
        variant: result.data.status === 'success' ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Session Test Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setSessionPersistenceLoading(false);
    }
  };
  
  // Test session timeout
  const [sessionTimeoutResults, setSessionTimeoutResults] = useState<any>(null);
  const [sessionTimeoutLoading, setSessionTimeoutLoading] = useState(false);
  
  const handleTestSessionTimeout = async () => {
    setSessionTimeoutLoading(true);
    try {
      const result = await testSessionTimeout();
      setSessionTimeoutResults(result.data);
      toast({
        title: `Session Status: ${result.data.status}`,
        description: result.data.diagnosis,
        variant: result.data.status === 'active' ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Session Timeout Test Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setSessionTimeoutLoading(false);
    }
  };
  
  return (
    <AdminLayout title="Authentication Testing Dashboard">
      <div className="container mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="session">Session Tests</TabsTrigger>
            <TabsTrigger value="password">Password Tests</TabsTrigger>
            <TabsTrigger value="system">System Tests</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Authentication System Status</CardTitle>
                  <CardDescription>
                    Overall authentication system health check
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Local tests available:</span>
                      {localTestLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : localTestError ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : (
                        <Badge variant="default">Accessible</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Admin tests available:</span>
                      {userCountLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : userCountError ? (
                        <Badge variant="destructive">Not Available</Badge>
                      ) : (
                        <Badge variant="default">Accessible</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Session store:</span>
                      {localTestLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : localTestError ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : localTestData?.data.details.session.sessionStoreAvailable ? (
                        <Badge variant="default">Connected</Badge>
                      ) : (
                        <Badge variant="warning">Not Available</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Password validation:</span>
                      {localTestLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : localTestError ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : localTestData?.data.result ? (
                        <Badge variant="default">Working</Badge>
                      ) : (
                        <Badge variant="destructive">Not Working</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Total users:</span>
                      {userCountLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : userCountError ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : (
                        <span className="font-medium">{userCountData?.data?.count || 'N/A'}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => {
                    refetchLocalTest();
                    refetchUserCount();
                  }} className="w-full">
                    Refresh Status
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Local Authentication Test Results</CardTitle>
                  <CardDescription>
                    Tests that don't require admin authentication
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {localTestLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : localTestError ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error Running Local Tests</AlertTitle>
                      <AlertDescription>
                        {localTestError instanceof Error 
                          ? localTestError.message 
                          : 'An unknown error occurred'}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium">Password Validation</h3>
                        <div className="mt-1">
                          <div className="flex items-center">
                            <span className="text-sm text-muted-foreground">Strong Password:</span>
                            <span className="ml-auto flex items-center">
                              {localTestData?.data.details.strongPassword.valid ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 mr-1" />
                              )}
                              {localTestData?.data.details.strongPassword.valid ? 'Valid' : 'Invalid'}
                            </span>
                          </div>
                          <div className="flex items-center mt-1">
                            <span className="text-sm text-muted-foreground">Weak Password:</span>
                            <span className="ml-auto flex items-center">
                              {!localTestData?.data.details.weakPassword.valid ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 mr-1" />
                              )}
                              {!localTestData?.data.details.weakPassword.valid ? 'Correctly Rejected' : 'Incorrectly Accepted'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium">Session Store</h3>
                        <div className="mt-1">
                          <div className="flex items-center">
                            <span className="text-sm text-muted-foreground">Available:</span>
                            <span className="ml-auto flex items-center">
                              {localTestData?.data.details.session.sessionStoreAvailable ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 mr-1" />
                              )}
                              {localTestData?.data.details.session.sessionStoreAvailable ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium">Test Status</h3>
                        <div className="mt-1">
                          <div className="flex items-center">
                            <span className="text-sm text-muted-foreground">Overall Result:</span>
                            <span className="ml-auto flex items-center">
                              {localTestData?.data.result ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 mr-1" />
                              )}
                              {localTestData?.data.result ? 'Passed' : 'Failed'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => refetchLocalTest()} 
                    disabled={localTestLoading}
                    className="w-full"
                  >
                    {localTestLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running Tests...
                      </>
                    ) : (
                      'Run Local Tests'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          {/* Session Tests Tab */}
          <TabsContent value="session">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Session Persistence Test</CardTitle>
                  <CardDescription>
                    Verify that user session data is properly maintained
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sessionPersistenceLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : !sessionPersistenceResults ? (
                    <div className="py-8 text-center text-muted-foreground">
                      Run the test to see results
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium">Authentication Status</h3>
                        <div className="mt-1 flex items-center">
                          <span className="text-sm text-muted-foreground">User Authenticated:</span>
                          <span className="ml-auto flex items-center">
                            {sessionPersistenceResults.isAuthenticated ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 mr-1" />
                            )}
                            {sessionPersistenceResults.isAuthenticated ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                      
                      {sessionPersistenceResults.user && (
                        <div>
                          <h3 className="text-sm font-medium">User Information</h3>
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center">
                              <span className="text-sm text-muted-foreground">ID:</span>
                              <span className="ml-auto">{sessionPersistenceResults.user.id}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-sm text-muted-foreground">Username:</span>
                              <span className="ml-auto">{sessionPersistenceResults.user.username}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-sm text-muted-foreground">Role:</span>
                              <span className="ml-auto">{sessionPersistenceResults.user.role}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <h3 className="text-sm font-medium">Diagnostics</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {sessionPersistenceResults.diagnostics}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleTestSessionPersistence} 
                    disabled={sessionPersistenceLoading}
                    className="w-full"
                  >
                    {sessionPersistenceLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test Session Persistence'
                    )}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Session Timeout Test</CardTitle>
                  <CardDescription>
                    Verify that session timeout mechanisms are working correctly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sessionTimeoutLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : !sessionTimeoutResults ? (
                    <div className="py-8 text-center text-muted-foreground">
                      Run the test to see results
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium">Session Status</h3>
                        <div className="mt-1 flex items-center">
                          <span className="text-sm text-muted-foreground">Current Status:</span>
                          <span className="ml-auto">
                            <Badge 
                              variant={
                                sessionTimeoutResults.status === 'active' 
                                  ? 'default' 
                                  : sessionTimeoutResults.status === 'expired' 
                                    ? 'destructive' 
                                    : 'outline'
                              }
                            >
                              {sessionTimeoutResults.status.charAt(0).toUpperCase() + 
                               sessionTimeoutResults.status.slice(1)}
                            </Badge>
                          </span>
                        </div>
                      </div>
                      
                      {sessionTimeoutResults.timeRemaining !== undefined && (
                        <div>
                          <h3 className="text-sm font-medium">Time Remaining</h3>
                          <div className="mt-1">
                            <p className="text-sm text-muted-foreground">
                              {sessionTimeoutResults.timeRemaining > 0 
                                ? `${Math.floor(sessionTimeoutResults.timeRemaining / (1000 * 60))} minutes` 
                                : 'Expired'}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <h3 className="text-sm font-medium">Diagnosis</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {sessionTimeoutResults.diagnosis}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleTestSessionTimeout} 
                    disabled={sessionTimeoutLoading}
                    className="w-full"
                  >
                    {sessionTimeoutLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test Session Timeout'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          {/* Password Tests Tab */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Password Validation Test</CardTitle>
                <CardDescription>
                  Test password validation rules (min 6 chars, contains letter & number)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                    <label htmlFor="testPassword" className="text-sm font-medium">
                      Password to Test
                    </label>
                    <input
                      id="testPassword"
                      value={testPassword}
                      onChange={(e) => setTestPassword(e.target.value)}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter a password to test against validation rules
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Validation Rules</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-center">
                        <span>• Password must be at least 6 characters</span>
                      </li>
                      <li className="flex items-center">
                        <span>• Password must contain at least one letter</span>
                      </li>
                      <li className="flex items-center">
                        <span>• Password must contain at least one number</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleTestPassword} className="w-full">
                  Test Password
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* System Tests Tab */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>Authentication System Tests</CardTitle>
                <CardDescription>
                  Run comprehensive tests of the entire authentication system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {systemTestsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !systemTestResults ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Run the system tests to see results
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Overall Status:</span>
                      <Badge 
                        variant={systemTestResults.status === 'passed' ? 'default' : 'destructive'}
                      >
                        {systemTestResults.status === 'passed' ? 'Passed' : 'Failed'}
                      </Badge>
                    </div>
                    
                    <Table>
                      <TableCaption>Authentication System Test Results</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Test Component</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(systemTestResults.results).map(([key, value]: [string, any]) => (
                          <TableRow key={key}>
                            <TableCell className="font-medium">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={value.status === 'passed' ? 'default' : 'destructive'}
                              >
                                {value.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{value.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {systemTestResults.failedTests.length > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Failed Tests</AlertTitle>
                        <AlertDescription>
                          The following tests failed: {systemTestResults.failedTests.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleRunSystemTests} 
                  disabled={systemTestsLoading}
                  className="w-full"
                >
                  {systemTestsLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running Tests...
                    </>
                  ) : (
                    'Run System Tests'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

export default AuthTestDashboard;