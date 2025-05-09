import * as React from 'react';
import { useState, useEffect } from 'react';
import DeveloperLayout from '@/components/developer/developer-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Check, X, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";

type TestResult = {
  status: 'passed' | 'failed' | 'pending';
  message: string;
};

type ValidationTestResults = {
  status: 'passed' | 'failed' | 'pending';
  results: {
    complexityRules?: TestResult;
    lengthRequirements?: TestResult;
    specialCharacters?: TestResult;
    commonPasswords?: TestResult;
    digitRequirement?: TestResult;
    validPassword?: TestResult;
    // Add new properties from real tests
    minLength?: TestResult;
    hasUpperCase?: TestResult;
    hasLowerCase?: TestResult;
    hasDigit?: TestResult;
    hasSpecial?: TestResult;
  };
  failedTests: string[];
};

type CredentialTestResults = {
  status: 'passed' | 'failed' | 'pending';
  results: {
    validLogin: TestResult;
    invalidUsername: TestResult;
    invalidPassword: TestResult;
    emptyCredentials: TestResult;
  };
  failedTests: string[];
};

type SessionTestResults = {
  status: 'passed' | 'failed' | 'pending';
  results: {
    persistenceTest: TestResult;
    refreshTest: TestResult;
    timeoutTest: TestResult;
    logoutTest: TestResult;
  };
  failedTests: string[];
};

type SystemTestResults = {
  status: 'passed' | 'failed' | 'pending';
  results: {
    passwordValidation: TestResult;
    passwordHashing: TestResult;
    userRetrieval: TestResult;
    sessionExpiry: TestResult;
  };
  failedTests: string[];
};

function AuthTestsPage() {
  const { toast } = useToast();
  const [selectedTest, setSelectedTest] = useState<string>('validation');

  // Password validation test
  const {
    data: validationResults,
    isLoading: isValidationLoading,
    error: validationError,
    refetch: refetchValidation,
  } = useQuery<ValidationTestResults>({
    queryKey: ['/api/auth-test/validate-password'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: selectedTest === 'validation',
  });

  // Credential verification test
  const {
    data: credentialResults,
    isLoading: isCredentialLoading,
    error: credentialError,
    refetch: refetchCredentials,
  } = useQuery<CredentialTestResults>({
    queryKey: ['/api/auth-test/validate-credentials'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: selectedTest === 'credentials',
  });

  // Session management test
  const {
    data: sessionResults,
    isLoading: isSessionLoading,
    error: sessionError,
    refetch: refetchSession,
  } = useQuery<SessionTestResults>({
    queryKey: ['/api/auth-test/session-persistence'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: selectedTest === 'session',
  });

  // System tests
  const {
    data: systemResults,
    isLoading: isSystemLoading,
    error: systemError,
    refetch: refetchSystem,
  } = useQuery<SystemTestResults>({
    queryKey: ['/api/auth-test/system-tests'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: selectedTest === 'system',
  });

  // Run all tests mutation
  const runAllTestsMutation = useMutation({
    mutationFn: async () => {
      // Run all tests in parallel and get responses
      const [
        validationResponse, 
        credentialResponse, 
        sessionResponse, 
        systemResponse
      ] = await Promise.all([
        apiRequest('POST', '/api/auth-test/validate-password', {
          password: 'TestPassword123!', // Test password with good complexity
        }),
        apiRequest('POST', '/api/auth-test/validate-credentials', {
          email: 'test@example.com',
          password: 'TestPassword123!',
        }),
        apiRequest('POST', '/api/auth-test/session-persistence'),
        apiRequest('POST', '/api/auth-test/system-tests'),
      ]);
      
      // Parse all responses and extract data property if present
      const processResponse = async (response: Response) => {
        const json = await response.json();
        return json.success && 'data' in json ? json.data : json;
      };
      
      const validationData = await processResponse(validationResponse);
      const credentialData = await processResponse(credentialResponse);
      const sessionData = await processResponse(sessionResponse);
      const systemData = await processResponse(systemResponse);
      
      return {
        validationData,
        credentialData,
        sessionData,
        systemData
      };
    },
    onSuccess: (data) => {
      // Update query cache directly instead of refetching
      queryClient.setQueryData(['/api/auth-test/validate-password'], data.validationData);
      queryClient.setQueryData(['/api/auth-test/validate-credentials'], data.credentialData);
      queryClient.setQueryData(['/api/auth-test/session-persistence'], data.sessionData);
      queryClient.setQueryData(['/api/auth-test/system-tests'], data.systemData);
      
      // Also refresh user count
      refetchUserCount();
      
      toast({
        title: 'All tests completed',
        description: 'Authentication tests have been run successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Test Error',
        description: `Failed to run tests: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // User count query with auto-refresh
  const { data: userCountResponse, refetch: refetchUserCount } = useQuery<{ success: boolean, data: { count: number } }>({
    queryKey: ['/api/auth-test/user-count'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0, // Always refetch the latest count
  });
  
  // Extract just the count data from the standard response format
  const userCount = userCountResponse?.success ? userCountResponse.data : undefined;
  
  // Refresh user count when page loads
  React.useEffect(() => {
    refetchUserCount();
  }, [refetchUserCount]);

  // Individual test mutations
  const validationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth-test/validate-password', {
        password: 'TestPassword123!',
      });
      const responseJson = await response.json();
      return responseJson.success && 'data' in responseJson ? responseJson.data : responseJson;
    },
    onSuccess: (data) => {
      // Update the validation results directly instead of refetching
      queryClient.setQueryData(['/api/auth-test/validate-password'], data);
      toast({
        title: 'Validation Tests Completed',
        description: 'Password validation tests run successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Test Error',
        description: `Failed to run validation tests: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const credentialMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth-test/validate-credentials', {
        email: 'test@example.com',
        password: 'TestPassword123!',
      });
      const responseJson = await response.json();
      return responseJson.success && 'data' in responseJson ? responseJson.data : responseJson;
    },
    onSuccess: (data) => {
      // Update the credential results directly instead of refetching
      queryClient.setQueryData(['/api/auth-test/validate-credentials'], data);
      toast({
        title: 'Credential Tests Completed',
        description: 'Credential verification tests run successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Test Error',
        description: `Failed to run credential tests: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const sessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth-test/session-persistence');
      const responseJson = await response.json();
      return responseJson.success && 'data' in responseJson ? responseJson.data : responseJson;
    },
    onSuccess: (data) => {
      // Update the session results directly instead of refetching
      queryClient.setQueryData(['/api/auth-test/session-persistence'], data);
      toast({
        title: 'Session Tests Completed',
        description: 'Session management tests run successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Test Error',
        description: `Failed to run session tests: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const systemMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth-test/system-tests');
      const responseJson = await response.json();
      return responseJson.success && 'data' in responseJson ? responseJson.data : responseJson;
    },
    onSuccess: (data) => {
      // Update the system results directly instead of refetching
      queryClient.setQueryData(['/api/auth-test/system-tests'], data);
      toast({
        title: 'System Tests Completed',
        description: 'System authentication tests run successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Test Error',
        description: `Failed to run system tests: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Test status component
  const TestStatus = ({ status }: { status: 'passed' | 'failed' | 'pending' }) => {
    if (status === 'passed') {
      return <div className="flex items-center text-green-600"><Check className="w-5 h-5 mr-1" /> Passed</div>;
    } else if (status === 'failed') {
      return <div className="flex items-center text-red-600"><X className="w-5 h-5 mr-1" /> Failed</div>;
    } else {
      return <div className="flex items-center text-amber-600"><AlertTriangle className="w-5 h-5 mr-1" /> Pending</div>;
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

  return (
    <DeveloperLayout 
      title="Authentication Tests" 
      subtitle="Comprehensive tests for authentication, session management, and security"
    >
      <div className="mb-6 flex justify-between items-center">
        <div>
          <div className="flex items-center">
            <ShieldCheck className="w-6 h-6 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold">Authentication System Tests</h2>
          </div>
          <p className="text-gray-500 mt-1">
            Verify user authentication, session management, and security measures
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            disabled={runAllTestsMutation.isPending} 
            onClick={runAllTests}
          >
            {runAllTestsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run All Tests
          </Button>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-md mb-6 flex flex-wrap gap-4">
        <div className="bg-white p-3 rounded-md shadow-sm">
          <div className="text-sm text-gray-500">Registered Users</div>
          <div className="text-2xl font-semibold">{userCount && userCount.count ? userCount.count : 0}</div>
        </div>
        <div className="bg-white p-3 rounded-md shadow-sm">
          <div className="text-sm text-gray-500">System Status</div>
          <div className="text-lg font-medium text-green-600 flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            Operational
          </div>
        </div>
        <div className="bg-white p-3 rounded-md shadow-sm">
          <div className="text-sm text-gray-500">Test Coverage</div>
          <div className="text-xl font-semibold">12 Tests</div>
        </div>
      </div>

      <Tabs defaultValue="validation" onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="validation">Password Validation</TabsTrigger>
          <TabsTrigger value="credentials">Credential Verification</TabsTrigger>
          <TabsTrigger value="session">Session Management</TabsTrigger>
          <TabsTrigger value="system">System Tests</TabsTrigger>
        </TabsList>

        {/* Password Validation Tests */}
        <TabsContent value="validation">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Complexity Rules</CardTitle>
                <CardDescription>
                  Test password complexity requirement enforcement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isValidationLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  </div>
                ) : validationError ? (
                  <div className="text-red-600 py-2">Error: {(validationError as Error).message}</div>
                ) : validationResults && validationResults.results ? (
                  <div className="space-y-3">
                    {/* Check for legacy properties first */}
                    {validationResults.results.complexityRules && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Complexity Rules</span>
                        <TestStatus status={validationResults.results.complexityRules.status} />
                      </div>
                    )}
                    {validationResults.results.lengthRequirements && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Length Requirements</span>
                        <TestStatus status={validationResults.results.lengthRequirements.status} />
                      </div>
                    )}
                    {validationResults.results.specialCharacters && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Special Characters</span>
                        <TestStatus status={validationResults.results.specialCharacters.status} />
                      </div>
                    )}
                    {validationResults.results.commonPasswords && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Common Passwords</span>
                        <TestStatus status={validationResults.results.commonPasswords.status} />
                      </div>
                    )}
                    
                    {/* New properties from real validation tests */}
                    {validationResults.results.minLength && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Minimum Length (8 chars)</span>
                        <TestStatus status={validationResults.results.minLength.status} />
                      </div>
                    )}
                    {validationResults.results.hasUpperCase && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Uppercase Letter</span>
                        <TestStatus status={validationResults.results.hasUpperCase.status} />
                      </div>
                    )}
                    {validationResults.results.hasLowerCase && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Lowercase Letter</span>
                        <TestStatus status={validationResults.results.hasLowerCase.status} />
                      </div>
                    )}
                    {validationResults.results.hasDigit && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Numeric Digit</span>
                        <TestStatus status={validationResults.results.hasDigit.status} />
                      </div>
                    )}
                    {validationResults.results.hasSpecial && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Special Character</span>
                        <TestStatus status={validationResults.results.hasSpecial.status} />
                      </div>
                    )}
                    {validationResults.results.validPassword && (
                      <div className="flex justify-between items-center p-2 border-b font-semibold">
                        <span>Valid Password</span>
                        <TestStatus status={validationResults.results.validPassword.status} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 py-2">No test results available</div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => validationMutation.mutate()} 
                  disabled={isValidationLoading || validationMutation.isPending} 
                  variant="outline" 
                  className="w-full"
                >
                  {(isValidationLoading || validationMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Run Tests
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  Detailed results of password validation tests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isValidationLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  </div>
                ) : validationError ? (
                  <div className="text-red-600 py-2">Error: {(validationError as Error).message}</div>
                ) : validationResults ? (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-medium mb-2 flex items-center">
                        <TestStatus status={validationResults.status} />
                        <span className="ml-2">Overall Result</span>
                      </h3>
                      <p className="text-sm text-gray-500">
                        {validationResults.status === 'passed' 
                          ? 'All password validation tests passed successfully' 
                          : validationResults.failedTests && `${validationResults.failedTests.length} validation tests failed`}
                      </p>
                    </div>
                    {validationResults.status === 'failed' && validationResults.failedTests && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <h4 className="text-sm font-medium text-red-800 mb-1">Failed Tests:</h4>
                        <ul className="list-disc list-inside text-sm text-red-700">
                          {validationResults.failedTests.map((test, i) => (
                            <li key={i}>{test}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 py-2">No test results available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Credential Verification Tests */}
        <TabsContent value="credentials">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Credential Verification</CardTitle>
                <CardDescription>
                  Test login credential validation and security
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isCredentialLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  </div>
                ) : credentialError ? (
                  <div className="text-red-600 py-2">Error: {(credentialError as Error).message}</div>
                ) : credentialResults && credentialResults.results ? (
                  <div className="space-y-3">
                    {credentialResults.results.validLogin && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Valid Login</span>
                        <TestStatus status={credentialResults.results.validLogin.status} />
                      </div>
                    )}
                    {credentialResults.results.invalidUsername && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Invalid Username</span>
                        <TestStatus status={credentialResults.results.invalidUsername.status} />
                      </div>
                    )}
                    {credentialResults.results.invalidPassword && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Invalid Password</span>
                        <TestStatus status={credentialResults.results.invalidPassword.status} />
                      </div>
                    )}
                    {credentialResults.results.emptyCredentials && (
                      <div className="flex justify-between items-center p-2">
                        <span>Empty Credentials</span>
                        <TestStatus status={credentialResults.results.emptyCredentials.status} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 py-2">No test results available</div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => credentialMutation.mutate()} 
                  disabled={isCredentialLoading || credentialMutation.isPending} 
                  variant="outline" 
                  className="w-full"
                >
                  {(isCredentialLoading || credentialMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Run Tests
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  Detailed results of credential verification tests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isCredentialLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  </div>
                ) : credentialError ? (
                  <div className="text-red-600 py-2">Error: {(credentialError as Error).message}</div>
                ) : credentialResults ? (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-medium mb-2 flex items-center">
                        <TestStatus status={credentialResults.status} />
                        <span className="ml-2">Overall Result</span>
                      </h3>
                      <p className="text-sm text-gray-500">
                        {credentialResults.status === 'passed' 
                          ? 'All credential verification tests passed successfully' 
                          : credentialResults.failedTests && `${credentialResults.failedTests.length} verification tests failed`}
                      </p>
                    </div>
                    {credentialResults.status === 'failed' && credentialResults.failedTests && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <h4 className="text-sm font-medium text-red-800 mb-1">Failed Tests:</h4>
                        <ul className="list-disc list-inside text-sm text-red-700">
                          {credentialResults.failedTests.map((test, i) => (
                            <li key={i}>{test}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 py-2">No test results available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Session Management Tests */}
        <TabsContent value="session">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Management</CardTitle>
                <CardDescription>
                  Test session persistence, timeout, and security
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSessionLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  </div>
                ) : sessionError ? (
                  <div className="text-red-600 py-2">Error: {(sessionError as Error).message}</div>
                ) : sessionResults && sessionResults.results ? (
                  <div className="space-y-3">
                    {sessionResults.results.persistenceTest && sessionResults.results.persistenceTest.status && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Session Persistence</span>
                        <TestStatus status={sessionResults.results.persistenceTest.status} />
                      </div>
                    )}
                    {sessionResults.results.refreshTest && sessionResults.results.refreshTest.status && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Session Refresh</span>
                        <TestStatus status={sessionResults.results.refreshTest.status} />
                      </div>
                    )}
                    {sessionResults.results.timeoutTest && sessionResults.results.timeoutTest.status && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Session Timeout</span>
                        <TestStatus status={sessionResults.results.timeoutTest.status} />
                      </div>
                    )}
                    {sessionResults.results.logoutTest && sessionResults.results.logoutTest.status && (
                      <div className="flex justify-between items-center p-2">
                        <span>Logout Functionality</span>
                        <TestStatus status={sessionResults.results.logoutTest.status} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 py-2">No test results available</div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => sessionMutation.mutate()} 
                  disabled={isSessionLoading || sessionMutation.isPending} 
                  variant="outline" 
                  className="w-full"
                >
                  {(isSessionLoading || sessionMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Run Tests
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  Detailed results of session management tests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSessionLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  </div>
                ) : sessionError ? (
                  <div className="text-red-600 py-2">Error: {(sessionError as Error).message}</div>
                ) : sessionResults ? (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-medium mb-2 flex items-center">
                        <TestStatus status={sessionResults.status} />
                        <span className="ml-2">Overall Result</span>
                      </h3>
                      <p className="text-sm text-gray-500">
                        {sessionResults.status === 'passed' 
                          ? 'All session management tests passed successfully' 
                          : sessionResults.failedTests && `${sessionResults.failedTests.length} session tests failed`}
                      </p>
                    </div>
                    {sessionResults.status === 'failed' && sessionResults.failedTests && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <h4 className="text-sm font-medium text-red-800 mb-1">Failed Tests:</h4>
                        <ul className="list-disc list-inside text-sm text-red-700">
                          {sessionResults.failedTests.map((test, i) => (
                            <li key={i}>{test}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 py-2">No test results available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Tests */}
        <TabsContent value="system">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Tests</CardTitle>
                <CardDescription>
                  Test overall authentication system functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSystemLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  </div>
                ) : systemError ? (
                  <div className="text-red-600 py-2">Error: {(systemError as Error).message}</div>
                ) : systemResults && systemResults.results ? (
                  <div className="space-y-3">
                    {systemResults.results.passwordValidation && systemResults.results.passwordValidation.status && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Password Validation</span>
                        <TestStatus status={systemResults.results.passwordValidation.status} />
                      </div>
                    )}
                    {systemResults.results.passwordHashing && systemResults.results.passwordHashing.status && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>Password Hashing</span>
                        <TestStatus status={systemResults.results.passwordHashing.status} />
                      </div>
                    )}
                    {systemResults.results.userRetrieval && systemResults.results.userRetrieval.status && (
                      <div className="flex justify-between items-center p-2 border-b">
                        <span>User Retrieval</span>
                        <TestStatus status={systemResults.results.userRetrieval.status} />
                      </div>
                    )}
                    {systemResults.results.sessionExpiry && systemResults.results.sessionExpiry.status && (
                      <div className="flex justify-between items-center p-2">
                        <span>Session Expiry</span>
                        <TestStatus status={systemResults.results.sessionExpiry.status} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 py-2">No test results available</div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => systemMutation.mutate()} 
                  disabled={isSystemLoading || systemMutation.isPending} 
                  variant="outline" 
                  className="w-full"
                >
                  {(isSystemLoading || systemMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Run Tests
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  Detailed results of system-wide authentication tests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSystemLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  </div>
                ) : systemError ? (
                  <div className="text-red-600 py-2">Error: {(systemError as Error).message}</div>
                ) : systemResults ? (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-medium mb-2 flex items-center">
                        <TestStatus status={systemResults.status} />
                        <span className="ml-2">Overall Result</span>
                      </h3>
                      <p className="text-sm text-gray-500">
                        {systemResults.status === 'passed' 
                          ? 'All system authentication tests passed successfully' 
                          : systemResults.failedTests && `${systemResults.failedTests.length} system tests failed`}
                      </p>
                    </div>
                    {systemResults.status === 'failed' && systemResults.failedTests && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <h4 className="text-sm font-medium text-red-800 mb-1">Failed Tests:</h4>
                        <ul className="list-disc list-inside text-sm text-red-700">
                          {systemResults.failedTests.map((test, i) => (
                            <li key={i}>{test}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 py-2">No test results available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DeveloperLayout>
  );
}

export default AuthTestsPage;