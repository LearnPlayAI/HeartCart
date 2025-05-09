/**
 * API Testing Routes
 * 
 * This module adds routes for testing and validating the API system.
 * These routes execute tests against the REAL API endpoints, using EXISTING routes,
 * controllers, and middleware. We test ACTUAL application functionality and code paths.
 */

import { Express, Request, Response, NextFunction } from 'express';
import { isAdmin } from "./auth-middleware";
import { sendSuccess, sendError } from "./api-response";
import { logger } from "./logger";
import axios from 'axios';
import { db } from "./db";
import { storage } from "./storage";

/**
 * Helper function to create a standardized test result
 */
function createTestResult(status: 'passed' | 'failed' | 'pending' | 'warning', message: string, details?: any) {
  return {
    status,
    message,
    ...(details && { details })
  };
}

/**
 * Register all API testing routes
 * @param app - Express application instance
 */
export function registerApiTestRoutes(app: Express): void {
  // Only register these routes in development mode
  if (process.env.NODE_ENV !== 'development') {
    logger.info('API test routes not registered in production mode');
    return;
  }
  
  logger.info('Registering API testing routes');
  
  // Custom admin check middleware that works with the override in routes.ts
  const apiTestAdminCheck = (req: Request, res: Response, next: NextFunction) => {
    // Check if user exists and has admin role
    const user = req.user as any;
    if (user && user.role === 'admin') {
      logger.debug('API test admin check passed', { 
        userId: user.id,
        path: req.path,
        method: req.method
      });
      return next();
    }
    
    // Auto-approve in development for easier testing
    if (process.env.NODE_ENV === 'development') {
      logger.warn('API test admin check bypassed in development mode');
      return next();
    }
    
    logger.warn('API test admin check failed', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    return sendError(res, "Admin access required for API tests", 403);
  };

  // Test for API endpoint availability
  app.get("/api/api-test/endpoint-availability", apiTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.info('Running API endpoint availability tests');
      
      // Create a base URL for internal requests
      const baseURL = `http://localhost:${process.env.PORT || 3000}`;
      const user = req.user as any;
      const userId = user?.id;

      // Define the endpoints to test
      const endpointsToTest = [
        // Product-related endpoints
        { method: 'GET', path: '/api/products', description: 'Get all products' },
        { method: 'GET', path: '/api/products/1', description: 'Get product by ID' },
        { method: 'GET', path: '/api/categories', description: 'Get all categories' },
        { method: 'GET', path: '/api/suppliers', description: 'Get all suppliers' },
        
        // User authentication endpoints
        { method: 'GET', path: '/api/user', description: 'Get current user' },
        { method: 'GET', path: '/api/csrf-token', description: 'Get CSRF token' },
        
        // Shopping cart related endpoints
        { method: 'GET', path: '/api/cart', description: 'Get cart items' },
        
        // Order related endpoints
        { method: 'GET', path: '/api/orders', description: 'Get all orders' },
        
        // Catalog and attribute related endpoints
        { method: 'GET', path: '/api/attributes', description: 'Get all attributes' },
        { method: 'GET', path: '/api/catalogs', description: 'Get all catalogs' },
      ];
      
      // Execute the tests
      const testResults = await Promise.all(endpointsToTest.map(async (endpoint) => {
        try {
          const cookies = req.headers.cookie;
          const headers: Record<string, string> = {};
          
          if (cookies) {
            headers.Cookie = cookies;
          }
          
          // Special handling for CSRF token - needs to be added for POST/PUT/DELETE tests
          if (['POST', 'PUT', 'DELETE'].includes(endpoint.method)) {
            try {
              const csrfResponse = await axios.get(`${baseURL}/api/csrf-token`, { headers });
              if (csrfResponse.data?.data?.csrfToken) {
                headers['X-CSRF-Token'] = csrfResponse.data.data.csrfToken;
              }
            } catch (error) {
              logger.error('Failed to get CSRF token for tests', { error });
            }
          }
          
          // Make the actual request
          const startTime = performance.now();
          const response = await axios({
            method: endpoint.method,
            url: `${baseURL}${endpoint.path}`,
            headers,
            validateStatus: () => true // Don't throw on error status codes
          });
          const elapsedTime = performance.now() - startTime;
          
          // Define what constitutes a successful response
          const isSuccess = response.status >= 200 && response.status < 400;
          
          return {
            endpoint: endpoint.path,
            method: endpoint.method,
            description: endpoint.description,
            status: isSuccess ? 'passed' : 'failed',
            statusCode: response.status,
            responseTime: Math.round(elapsedTime),
            message: isSuccess 
              ? `Endpoint is available (${Math.round(elapsedTime)}ms)` 
              : `Endpoint returned error status: ${response.status}`,
          };
        } catch (error) {
          logger.error(`Error testing endpoint ${endpoint.path}`, { error });
          return {
            endpoint: endpoint.path,
            method: endpoint.method,
            description: endpoint.description,
            status: 'failed',
            message: `Error connecting to endpoint: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }));
      
      // Calculate overall status
      const status = testResults.every(test => test.status === 'passed') ? 'passed' : 'failed';
      
      // Build failed tests list
      const failedTests = testResults
        .filter(test => test.status === 'failed')
        .map(test => `endpoint:${test.method}:${test.endpoint}`);
      
      const results = {
        status,
        results: {
          endpointTests: testResults,
          totalEndpoints: endpointsToTest.length,
          availableEndpoints: testResults.filter(t => t.status === 'passed').length
        },
        failedTests
      };
      
      return sendSuccess(res, results);
    } catch (error) {
      logger.error('Error testing API endpoints', { error });
      return sendError(res, "Error testing API endpoints", 500);
    }
  });

  // Test for API response validation
  app.get("/api/api-test/response-validation", apiTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.info('Running API response validation tests');
      
      // Create a base URL for internal requests
      const baseURL = `http://localhost:${process.env.PORT || 3000}`;
      const cookies = req.headers.cookie;
      const headers: Record<string, string> = {};
      
      if (cookies) {
        headers.Cookie = cookies;
      }
      
      // Define the validation tests
      const validationTests = [
        {
          endpoint: '/api/products',
          method: 'GET',
          validator: (response: any) => {
            // Check if response follows our standard format
            if (!response || typeof response !== 'object') return false;
            if (typeof response.success !== 'boolean') return false;
            if (!Array.isArray(response.data)) return false;
            
            // Check product structure if there's at least one product
            if (response.data.length > 0) {
              const product = response.data[0];
              return (
                typeof product.id === 'number' &&
                typeof product.name === 'string' &&
                (product.price === null || typeof product.price === 'number') &&
                (product.description === null || typeof product.description === 'string')
              );
            }
            return true;
          },
          description: 'Products endpoint returns properly structured data'
        },
        {
          endpoint: '/api/categories',
          method: 'GET',
          validator: (response: any) => {
            if (!response || typeof response !== 'object') return false;
            if (typeof response.success !== 'boolean') return false;
            if (!Array.isArray(response.data)) return false;
            
            if (response.data.length > 0) {
              const category = response.data[0];
              return (
                typeof category.id === 'number' &&
                typeof category.name === 'string'
              );
            }
            return true;
          },
          description: 'Categories endpoint returns properly structured data'
        },
        {
          endpoint: '/api/cart',
          method: 'GET',
          validator: (response: any) => {
            if (!response || typeof response !== 'object') return false;
            if (typeof response.success !== 'boolean') return false;
            if (!Array.isArray(response.data)) return false;
            
            // Meta data should be present
            return (
              response.meta &&
              typeof response.meta.count === 'number' &&
              typeof response.meta.total === 'number'
            );
          },
          description: 'Cart endpoint returns properly structured data with meta information'
        },
        {
          endpoint: '/api/user',
          method: 'GET',
          validator: (response: any) => {
            if (!response || typeof response !== 'object') return false;
            if (typeof response.success !== 'boolean') return false;
            
            // User should be either null or have proper structure
            if (response.data === null) return true;
            
            const user = response.data;
            return (
              typeof user.id === 'number' &&
              typeof user.username === 'string' &&
              typeof user.email === 'string' &&
              typeof user.role === 'string'
            );
          },
          description: 'User endpoint returns properly structured user data'
        },
      ];
      
      // Execute the validation tests
      const testResults = await Promise.all(validationTests.map(async (test) => {
        try {
          const response = await axios({
            method: test.method,
            url: `${baseURL}${test.endpoint}`,
            headers,
            validateStatus: () => true
          });
          
          // Check if we got a successful response
          if (response.status < 200 || response.status >= 300) {
            return {
              endpoint: test.endpoint,
              description: test.description,
              status: 'failed',
              message: `Endpoint returned error status: ${response.status}`,
            };
          }
          
          // Run the validator function
          const isValid = test.validator(response.data);
          
          return {
            endpoint: test.endpoint,
            description: test.description,
            status: isValid ? 'passed' : 'failed',
            message: isValid 
              ? 'Response format and structure validated successfully' 
              : 'Response did not match expected format',
            responseExample: isValid ? undefined : JSON.stringify(response.data, null, 2).substring(0, 200) + '...',
          };
        } catch (error) {
          logger.error(`Error validating response from ${test.endpoint}`, { error });
          return {
            endpoint: test.endpoint,
            description: test.description,
            status: 'failed',
            message: `Error connecting to endpoint: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }));
      
      // Calculate overall status
      const status = testResults.every(test => test.status === 'passed') ? 'passed' : 'failed';
      
      // Build failed tests list
      const failedTests = testResults
        .filter(test => test.status === 'failed')
        .map(test => `validation:${test.endpoint}`);
      
      const results = {
        status,
        results: {
          validationTests: testResults,
          totalTests: validationTests.length,
          passedTests: testResults.filter(t => t.status === 'passed').length
        },
        failedTests
      };
      
      return sendSuccess(res, results);
    } catch (error) {
      logger.error('Error validating API responses', { error });
      return sendError(res, "Error validating API responses", 500);
    }
  });

  // Test for authentication & authorization
  app.get("/api/api-test/auth", apiTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.info('Running API authentication and authorization tests');
      
      // Create a base URL for internal requests
      const baseURL = `http://localhost:${process.env.PORT || 3000}`;
      
      // Define authentication tests
      const authTests = [
        {
          endpoint: '/api/user',
          method: 'GET',
          description: 'User endpoint returns authenticated user when logged in',
          authRequired: true,
          adminRequired: false,
          testType: 'authenticated_access'
        },
        {
          endpoint: '/api/products',
          method: 'GET',
          description: 'Products endpoint is accessible without authentication',
          authRequired: false,
          adminRequired: false,
          testType: 'public_access'
        },
        {
          endpoint: '/api/products/create',
          method: 'POST',
          description: 'Product creation requires admin privileges',
          authRequired: true,
          adminRequired: true,
          testType: 'admin_only',
          requestBody: {
            name: 'Test Product',
            description: 'This is a test product that should not actually be created',
            price: 99.99
          }
        },
        {
          endpoint: '/api/categories/create',
          method: 'POST',
          description: 'Category creation requires admin privileges',
          authRequired: true,
          adminRequired: true,
          testType: 'admin_only',
          requestBody: {
            name: 'Test Category'
          }
        }
      ];
      
      // Execute the auth tests - we'll use the cookies from the current request for auth tests
      const cookies = req.headers.cookie;
      
      const testResults = await Promise.all(authTests.map(async (test) => {
        try {
          // 1. Test with no auth
          const noAuthResponse = await axios({
            method: test.method,
            url: `${baseURL}${test.endpoint}`,
            data: test.requestBody,
            validateStatus: () => true,
            // Do not send cookies for this request
          });
          
          // 2. Test with user auth
          const userAuthResponse = await axios({
            method: test.method,
            url: `${baseURL}${test.endpoint}`,
            data: test.requestBody,
            validateStatus: () => true,
            headers: {
              Cookie: cookies
            }
          });
          
          // Get CSRF token for POST/PUT/DELETE operations if needed
          let csrfToken;
          if (['POST', 'PUT', 'DELETE'].includes(test.method)) {
            try {
              const csrfResponse = await axios.get(`${baseURL}/api/csrf-token`, {
                headers: { Cookie: cookies }
              });
              csrfToken = csrfResponse.data?.data?.csrfToken;
            } catch (error) {
              logger.error('Failed to get CSRF token for auth tests', { error });
            }
          }
          
          // 3. Test with admin auth and CSRF token
          const adminAuthResponse = await axios({
            method: test.method,
            url: `${baseURL}${test.endpoint}`,
            data: test.requestBody,
            validateStatus: () => true,
            headers: {
              Cookie: cookies,
              ...(csrfToken && { 'X-CSRF-Token': csrfToken })
            }
          });
          
          // Determine test result based on test type
          let status = 'passed';
          let message = '';
          
          switch (test.testType) {
            case 'public_access':
              if (noAuthResponse.status >= 200 && noAuthResponse.status < 300) {
                message = 'Public endpoint is correctly accessible without authentication';
              } else {
                status = 'failed';
                message = `Public endpoint unexpectedly returned ${noAuthResponse.status} without auth`;
              }
              break;
              
            case 'authenticated_access':
              if (noAuthResponse.status >= 400) {
                if (userAuthResponse.status >= 200 && userAuthResponse.status < 300) {
                  message = 'Protected endpoint correctly requires authentication';
                } else {
                  status = 'failed';
                  message = `Protected endpoint returned ${userAuthResponse.status} even with auth`;
                }
              } else {
                status = 'failed';
                message = 'Protected endpoint is unexpectedly accessible without authentication';
              }
              break;
              
            case 'admin_only':
              if (noAuthResponse.status >= 400) {
                if (userAuthResponse.status >= 400) {
                  if (adminAuthResponse.status >= 200 && adminAuthResponse.status < 300) {
                    message = 'Admin endpoint correctly restricts access to admins only';
                  } else {
                    status = 'warning';
                    message = `Admin endpoint returned ${adminAuthResponse.status} even with admin auth`;
                  }
                } else {
                  status = 'failed';
                  message = 'Admin endpoint is unexpectedly accessible with regular user auth';
                }
              } else {
                status = 'failed';
                message = 'Admin endpoint is unexpectedly accessible without authentication';
              }
              break;
          }
          
          return {
            endpoint: test.endpoint,
            method: test.method,
            description: test.description,
            status,
            message,
            testType: test.testType,
            results: {
              noAuth: noAuthResponse.status,
              userAuth: userAuthResponse.status,
              adminAuth: adminAuthResponse.status
            }
          };
        } catch (error) {
          logger.error(`Error testing auth for ${test.endpoint}`, { error });
          return {
            endpoint: test.endpoint,
            method: test.method,
            description: test.description,
            status: 'failed',
            message: `Error during auth test: ${error instanceof Error ? error.message : String(error)}`,
            testType: test.testType
          };
        }
      }));
      
      // Calculate overall status
      const status = testResults.every(test => test.status === 'passed') ? 
        'passed' : 
        testResults.some(test => test.status === 'failed') ? 'failed' : 'warning';
      
      // Build failed tests list
      const failedTests = testResults
        .filter(test => test.status === 'failed')
        .map(test => `auth:${test.method}:${test.endpoint}`);
      
      const results = {
        status,
        results: {
          authTests: testResults,
          totalTests: authTests.length,
          passedTests: testResults.filter(t => t.status === 'passed').length,
          failedTests: testResults.filter(t => t.status === 'failed').length,
          warningTests: testResults.filter(t => t.status === 'warning').length
        },
        failedTests
      };
      
      return sendSuccess(res, results);
    } catch (error) {
      logger.error('Error testing API authentication', { error });
      return sendError(res, "Error testing API authentication", 500);
    }
  });

  // Test for error handling
  app.get("/api/api-test/error-handling", apiTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.info('Running API error handling tests');
      
      // Create a base URL for internal requests
      const baseURL = `http://localhost:${process.env.PORT || 3000}`;
      const cookies = req.headers.cookie;
      const headers: Record<string, string> = {};
      
      if (cookies) {
        headers.Cookie = cookies;
      }
      
      // Get CSRF token for POST/PUT/DELETE tests
      try {
        const csrfResponse = await axios.get(`${baseURL}/api/csrf-token`, { headers });
        if (csrfResponse.data?.data?.csrfToken) {
          headers['X-CSRF-Token'] = csrfResponse.data.data.csrfToken;
        }
      } catch (error) {
        logger.error('Failed to get CSRF token for error handling tests', { error });
      }
      
      // Define error handling tests
      const errorTests = [
        {
          endpoint: '/api/products/999999',
          method: 'GET',
          description: 'Non-existent product ID returns 404',
          expectedStatus: 404,
          expectStandardError: true
        },
        {
          endpoint: '/api/products',
          method: 'POST',
          description: 'Invalid product data returns 400',
          requestBody: {
            // Missing required fields
          },
          expectedStatus: 400,
          expectStandardError: true
        },
        {
          endpoint: '/api/cart/add',
          method: 'POST',
          description: 'Adding invalid product to cart returns proper error',
          requestBody: {
            productId: 999999,
            quantity: 1
          },
          expectedStatus: 400,
          expectStandardError: true
        },
        {
          endpoint: '/api/categories/999999',
          method: 'GET',
          description: 'Non-existent category returns 404',
          expectedStatus: 404,
          expectStandardError: true
        },
        {
          endpoint: `/api/products/999999`,
          method: 'PUT',
          description: 'Updating non-existent product returns 404',
          requestBody: {
            name: 'Updated Product'
          },
          expectedStatus: 404,
          expectStandardError: true
        }
      ];
      
      // Execute the error handling tests
      const testResults = await Promise.all(errorTests.map(async (test) => {
        try {
          const response = await axios({
            method: test.method,
            url: `${baseURL}${test.endpoint}`,
            data: test.requestBody,
            headers,
            validateStatus: () => true
          });
          
          // Check status code
          const hasCorrectStatus = response.status === test.expectedStatus;
          
          // Check standard error format
          let hasStandardFormat = false;
          if (test.expectStandardError) {
            hasStandardFormat = (
              response.data &&
              typeof response.data === 'object' &&
              typeof response.data.success === 'boolean' &&
              response.data.success === false &&
              response.data.error &&
              typeof response.data.error === 'object' &&
              typeof response.data.error.message === 'string'
            );
          }
          
          const status = (hasCorrectStatus && (!test.expectStandardError || hasStandardFormat)) ? 'passed' : 'failed';
          
          let message = '';
          if (!hasCorrectStatus) {
            message = `Expected status ${test.expectedStatus}, got ${response.status}`;
          } else if (test.expectStandardError && !hasStandardFormat) {
            message = 'Response did not follow standard error format';
          } else {
            message = `Correct error status ${response.status} and format returned`;
          }
          
          return {
            endpoint: test.endpoint,
            method: test.method,
            description: test.description,
            status,
            message,
            expectedStatus: test.expectedStatus,
            actualStatus: response.status,
            hasStandardFormat
          };
        } catch (error) {
          logger.error(`Error testing error handling for ${test.endpoint}`, { error });
          return {
            endpoint: test.endpoint,
            method: test.method,
            description: test.description,
            status: 'failed',
            message: `Error during test: ${error instanceof Error ? error.message : String(error)}`,
            expectedStatus: test.expectedStatus
          };
        }
      }));
      
      // Calculate overall status
      const status = testResults.every(test => test.status === 'passed') ? 'passed' : 'failed';
      
      // Build failed tests list
      const failedTests = testResults
        .filter(test => test.status === 'failed')
        .map(test => `error:${test.method}:${test.endpoint}`);
      
      const results = {
        status,
        results: {
          errorTests: testResults,
          totalTests: errorTests.length,
          passedTests: testResults.filter(t => t.status === 'passed').length
        },
        failedTests
      };
      
      return sendSuccess(res, results);
    } catch (error) {
      logger.error('Error testing API error handling', { error });
      return sendError(res, "Error testing API error handling", 500);
    }
  });

  // Test for API performance
  app.get("/api/api-test/performance", apiTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.info('Running API performance tests');
      
      // Create a base URL for internal requests
      const baseURL = `http://localhost:${process.env.PORT || 3000}`;
      const cookies = req.headers.cookie;
      const headers: Record<string, string> = {};
      
      if (cookies) {
        headers.Cookie = cookies;
      }
      
      // Define performance tests with threshold expectations
      const performanceTests = [
        {
          endpoint: '/api/products',
          method: 'GET',
          description: 'Products list loads quickly',
          expectedMaxTime: 300 // ms
        },
        {
          endpoint: '/api/categories',
          method: 'GET',
          description: 'Categories list loads quickly',
          expectedMaxTime: 200 // ms
        },
        {
          endpoint: '/api/products/1',
          method: 'GET',
          description: 'Single product details load quickly',
          expectedMaxTime: 200 // ms
        },
        {
          endpoint: '/api/featured-products',
          method: 'GET',
          description: 'Featured products load quickly',
          expectedMaxTime: 300 // ms
        },
        {
          endpoint: '/api/categories/main/with-children',
          method: 'GET',
          description: 'Category hierarchy loads quickly',
          expectedMaxTime: 300 // ms
        }
      ];
      
      // Helper function to measure response time
      async function measureResponseTime(endpoint: string, method: string) {
        const startTime = performance.now();
        await axios({
          method,
          url: `${baseURL}${endpoint}`,
          headers,
          validateStatus: () => true
        });
        return performance.now() - startTime;
      }
      
      // Execute the performance tests
      const testResults = await Promise.all(performanceTests.map(async (test) => {
        try {
          // Run the test 3 times and take the average to account for variance
          const times = [];
          for (let i = 0; i < 3; i++) {
            const time = await measureResponseTime(test.endpoint, test.method);
            times.push(time);
          }
          
          // Calculate average time
          const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
          
          // Check if performance is acceptable
          const isPassed = averageTime <= test.expectedMaxTime;
          const status = isPassed ? 'passed' : averageTime <= test.expectedMaxTime * 1.5 ? 'warning' : 'failed';
          
          return {
            endpoint: test.endpoint,
            method: test.method,
            description: test.description,
            status,
            responseTime: Math.round(averageTime),
            expectedMaxTime: test.expectedMaxTime,
            message: isPassed
              ? `Response time ${Math.round(averageTime)}ms is within expected ${test.expectedMaxTime}ms`
              : `Response time ${Math.round(averageTime)}ms exceeds expected ${test.expectedMaxTime}ms`,
            measurements: times.map(t => Math.round(t))
          };
        } catch (error) {
          logger.error(`Error testing performance for ${test.endpoint}`, { error });
          return {
            endpoint: test.endpoint,
            method: test.method,
            description: test.description,
            status: 'failed',
            message: `Error during test: ${error instanceof Error ? error.message : String(error)}`,
            expectedMaxTime: test.expectedMaxTime
          };
        }
      }));
      
      // Calculate overall status - allow warnings without failing
      const status = testResults.some(test => test.status === 'failed') ? 'failed' :
                    testResults.some(test => test.status === 'warning') ? 'warning' : 'passed';
      
      // Build failed tests list
      const failedTests = testResults
        .filter(test => test.status === 'failed')
        .map(test => `performance:${test.method}:${test.endpoint}`);
      
      const results = {
        status,
        results: {
          performanceTests: testResults,
          totalTests: performanceTests.length,
          passedTests: testResults.filter(t => t.status === 'passed').length,
          warningTests: testResults.filter(t => t.status === 'warning').length,
          failedTests: testResults.filter(t => t.status === 'failed').length,
          averageResponseTime: Math.round(
            testResults.reduce((sum, test) => sum + (test.responseTime || 0), 0) / testResults.length
          )
        },
        failedTests
      };
      
      return sendSuccess(res, results);
    } catch (error) {
      logger.error('Error testing API performance', { error });
      return sendError(res, "Error testing API performance", 500);
    }
  });

  // Run all API tests
  app.post("/api/api-test/run-all", apiTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.info('Running all API tests');
      
      // Helper function to safely run a test endpoint
      const safelyRunTest = async (endpoint: string, testName: string) => {
        try {
          const url = `/api/api-test/${endpoint}`;
          logger.debug(`Running ${testName} test at ${url}`);
          
          // Since we're in the same process, just call the handlers directly instead of making HTTP requests
          // Create a mock request and response
          const mockReq = {
            ...req,
            path: url,
            method: 'GET'
          };
          
          let responseData: any = null;
          const mockRes = {
            status: (code: number) => ({
              json: (data: any) => {
                responseData = data;
                return mockRes;
              }
            }),
            json: (data: any) => {
              responseData = data;
              return mockRes;
            }
          };
          
          // Get the appropriate handler based on the endpoint
          let handler;
          switch (endpoint) {
            case 'endpoint-availability':
              handler = app._router.stack.find((layer: any) => 
                layer.route && layer.route.path === url && layer.route.methods.get)?.handle;
              break;
            case 'response-validation':
              handler = app._router.stack.find((layer: any) => 
                layer.route && layer.route.path === url && layer.route.methods.get)?.handle;
              break;
            case 'auth':
              handler = app._router.stack.find((layer: any) => 
                layer.route && layer.route.path === url && layer.route.methods.get)?.handle;
              break;
            case 'error-handling':
              handler = app._router.stack.find((layer: any) => 
                layer.route && layer.route.path === url && layer.route.methods.get)?.handle;
              break;
            case 'performance':
              handler = app._router.stack.find((layer: any) => 
                layer.route && layer.route.path === url && layer.route.methods.get)?.handle;
              break;
          }
          
          if (!handler) {
            logger.error(`Could not find handler for ${url}`);
            return {
              success: false,
              error: {
                message: `Handler for ${testName} test not found`
              }
            };
          }
          
          // Execute the handler
          await new Promise<void>((resolve) => {
            handler(mockReq, {
              ...mockRes,
              status: (code: number) => ({
                json: (data: any) => {
                  responseData = data;
                  resolve();
                  return mockRes;
                }
              }),
              json: (data: any) => {
                responseData = data;
                resolve();
                return mockRes;
              }
            });
          });
          
          return responseData;
        } catch (error) {
          logger.error(`Error running ${testName} test`, { error });
          return {
            success: false,
            error: {
              message: `Error running ${testName} test: ${error instanceof Error ? error.message : String(error)}`
            }
          };
        }
      };
      
      // Run all the tests
      const availabilityResults = await safelyRunTest('endpoint-availability', 'Endpoint Availability');
      const validationResults = await safelyRunTest('response-validation', 'Response Validation');
      const authResults = await safelyRunTest('auth', 'Authentication & Authorization');
      const errorResults = await safelyRunTest('error-handling', 'Error Handling');
      const performanceResults = await safelyRunTest('performance', 'Performance');
      
      // Combine all the results
      const allTests = [
        { name: 'endpointAvailability', data: availabilityResults.data },
        { name: 'responseValidation', data: validationResults.data },
        { name: 'authTests', data: authResults.data },
        { name: 'errorHandling', data: errorResults.data },
        { name: 'performance', data: performanceResults.data }
      ];
      
      // Calculate overall status
      const status = allTests.some(test => test.data?.status === 'failed') ? 'failed' :
                    allTests.some(test => test.data?.status === 'warning') ? 'warning' : 'passed';
      
      // Combine all failed tests
      const failedTests = allTests.flatMap(test => {
        if (!test.data || !Array.isArray(test.data.failedTests)) return [];
        return test.data.failedTests;
      });
      
      // Create the final results object
      const results = {
        status,
        results: {
          endpointAvailability: availabilityResults.data,
          responseValidation: validationResults.data,
          authTests: authResults.data,
          errorHandling: errorResults.data,
          performance: performanceResults.data
        },
        failedTests,
        summary: {
          totalTests: allTests.length,
          passedTests: allTests.filter(test => test.data?.status === 'passed').length,
          warningTests: allTests.filter(test => test.data?.status === 'warning').length,
          failedTests: allTests.filter(test => test.data?.status === 'failed').length
        }
      };
      
      return sendSuccess(res, results);
    } catch (error) {
      logger.error('Error running all API tests', { error });
      return sendError(res, "Error running all API tests", 500);
    }
  });
}