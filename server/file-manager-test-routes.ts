/**
 * File Manager Testing Routes
 * 
 * This module adds routes for testing and validating the file management system.
 * These routes execute tests against the REAL file storage layer, using EXISTING storage methods
 * and interfaces. We test ACTUAL application functionality and code paths.
 */

import { Express, Request, Response, NextFunction } from 'express';
import { isAuthenticated, isAdmin } from './auth-middleware';
import { sendSuccess, sendError } from './api-response';
import { logger } from './logger';
import { enhancedObjectStorage, logClientAPIMethods } from './objectstore-enhanced';
import path from 'path';
import { sanitizeFilename, generateUniqueFilename } from '../shared/utils/file-utils';

type TestStatus = 'passed' | 'failed' | 'pending' | 'warning';

/**
 * Helper function to create a standardized test result
 */
function createTestResult(status: TestStatus, message: string, details?: any) {
  return {
    status,
    message,
    details: details || null,
    timestamp: new Date().toISOString()
  };
}

/**
 * Register all file manager testing routes
 * @param app - Express application instance
 */
export function registerFileManagerTestRoutes(app: Express): void {
  // Only register these routes in development mode
  if (process.env.NODE_ENV !== 'development') {
    logger.info('File manager test routes not registered in production mode');
    return;
  }
  
  logger.info('Registering file manager testing routes');
  
  // Custom admin check middleware
  const fileTestAdminCheck = (req: Request, res: Response, next: NextFunction) => {
    // Check if user exists and has admin role
    const user = req.user as any;
    if (user && user.role === 'admin') {
      logger.debug('File test admin check passed', { 
        userId: user.id,
        path: req.path,
        method: req.method
      });
      return next();
    } else {
      logger.warn('Unauthorized access attempt to file test', {
        path: req.path,
        method: req.method,
        userId: user?.id || 'unauthenticated'
      });
      return sendError(res, 'Unauthorized access', 403, 'UNAUTHORIZED');
    }
  };

  /**
   * API Method Availability Test
   */
  app.get('/api/file-test/api-methods', fileTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.debug('Testing file API methods');
      
      const results = [];
      
      // Test client availability
      let clientAvailable = false;
      try {
        await enhancedObjectStorage.initialize();
        clientAvailable = true;
        results.push(createTestResult('passed', 'Object storage client initialized successfully'));
      } catch (error) {
        results.push(createTestResult('failed', 'Failed to initialize object storage client', { error: String(error) }));
      }
      
      // Only continue if client is available
      if (clientAvailable) {
        // Log methods for inspection
        await logClientAPIMethods();
        results.push(createTestResult('passed', 'API methods logged to console for inspection'));
        
        // Test basic operations availability
        const operations = [
          { name: 'getAvailableBuckets', method: () => enhancedObjectStorage.getAvailableBuckets() },
          { name: 'getCurrentBucket', method: () => enhancedObjectStorage.getCurrentBucket() },
          { name: 'listRootFolders', method: () => enhancedObjectStorage.listRootFolders() },
          { name: 'fileExists', method: () => enhancedObjectStorage.fileExists('test.txt') }
        ];
        
        for (const op of operations) {
          try {
            await op.method();
            results.push(createTestResult('passed', `Operation '${op.name}' is available`));
          } catch (error) {
            results.push(createTestResult('failed', `Operation '${op.name}' failed`, { error: String(error) }));
          }
        }
      }
      
      // Overall test result
      const overallStatus = results.some(r => r.status === 'failed') ? 'failed' : 'passed';
      
      return sendSuccess(res, {
        status: overallStatus,
        message: 'API method availability test completed',
        results
      });
    } catch (error: any) {
      logger.error('Error testing file API methods', { error });
      return sendError(res, 
        'Failed to test file API methods', 
        500, 
        'FILE_API_TEST_ERROR', 
        { message: error.message }
      );
    }
  });

  /**
   * Bucket Access Test
   */
  app.get('/api/file-test/buckets', fileTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.debug('Testing bucket access');
      
      const results = [];
      
      await enhancedObjectStorage.initialize();
      
      // Get available buckets
      const buckets = enhancedObjectStorage.getAvailableBuckets();
      results.push(createTestResult('passed', 'Retrieved available buckets', { buckets }));
      
      // Test each bucket
      for (const bucket of buckets) {
        try {
          // Switch to bucket
          enhancedObjectStorage.setBucket(bucket);
          
          // Test listing root folders
          const folders = await enhancedObjectStorage.listRootFolders();
          results.push(createTestResult('passed', `Accessed bucket '${bucket}' successfully`, { folderCount: folders.length }));
        } catch (error) {
          results.push(createTestResult('failed', `Failed to access bucket '${bucket}'`, { error: String(error) }));
        }
      }
      
      // Overall test result
      const overallStatus = results.some(r => r.status === 'failed') ? 'failed' : 'passed';
      
      return sendSuccess(res, {
        status: overallStatus,
        message: 'Bucket access test completed',
        results
      });
    } catch (error: any) {
      logger.error('Error testing bucket access', { error });
      return sendError(res, 
        'Failed to test bucket access', 
        500, 
        'BUCKET_TEST_ERROR', 
        { message: error.message }
      );
    }
  });

  /**
   * File Operations Test
   */
  app.get('/api/file-test/operations', fileTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.debug('Testing file operations');
      
      const results = [];
      
      await enhancedObjectStorage.initialize();
      
      // Create a test directory with timestamp to avoid conflicts
      const timestamp = Date.now();
      const testDir = `test-${timestamp}`;
      
      // Test file creation
      const testContent = Buffer.from(`Test file content created at ${new Date().toISOString()}`);
      const testFileName = `test-file-${timestamp}.txt`;
      const testFilePath = `${testDir}/${testFileName}`;
      
      try {
        // Create directory marker
        await enhancedObjectStorage.putFile(`${testDir}/.folder`, Buffer.from('Test folder'), {
          contentType: 'text/plain'
        });
        results.push(createTestResult('passed', `Created test directory '${testDir}'`));
        
        // Create test file
        await enhancedObjectStorage.putFile(testFilePath, testContent, {
          contentType: 'text/plain'
        });
        results.push(createTestResult('passed', `Created test file '${testFilePath}'`));
        
        // Test file exists
        const exists = await enhancedObjectStorage.fileExists(testFilePath);
        if (exists) {
          results.push(createTestResult('passed', `File existence check passed for '${testFilePath}'`));
        } else {
          results.push(createTestResult('failed', `File existence check failed for '${testFilePath}'`));
        }
        
        // Test get file content
        const retrievedContent = await enhancedObjectStorage.getFile(testFilePath);
        if (retrievedContent && retrievedContent.toString() === testContent.toString()) {
          results.push(createTestResult('passed', `File content retrieval passed for '${testFilePath}'`));
        } else {
          results.push(createTestResult('failed', `File content retrieval failed for '${testFilePath}'`));
        }
        
        // Test get file metadata
        const metadata = await enhancedObjectStorage.getFileMetadata(testFilePath);
        if (metadata) {
          results.push(createTestResult('passed', `File metadata retrieval passed for '${testFilePath}'`, metadata));
        } else {
          results.push(createTestResult('failed', `File metadata retrieval failed for '${testFilePath}'`));
        }
        
        // Test file listing
        const files = await enhancedObjectStorage.listFiles(testDir);
        if (files.includes(testFileName)) {
          results.push(createTestResult('passed', `File listing passed for directory '${testDir}'`));
        } else {
          results.push(createTestResult('failed', `File listing failed for directory '${testDir}'`));
        }
        
        // Test file deletion
        const deleted = await enhancedObjectStorage.deleteFile(testFilePath);
        if (deleted) {
          results.push(createTestResult('passed', `File deletion passed for '${testFilePath}'`));
        } else {
          results.push(createTestResult('failed', `File deletion failed for '${testFilePath}'`));
        }
        
        // Clean up by deleting marker file
        await enhancedObjectStorage.deleteFile(`${testDir}/.folder`);
      } catch (error) {
        results.push(createTestResult('failed', 'File operations failed', { error: String(error) }));
      }
      
      // Overall test result
      const overallStatus = results.some(r => r.status === 'failed') ? 'failed' : 'passed';
      
      return sendSuccess(res, {
        status: overallStatus,
        message: 'File operations test completed',
        results
      });
    } catch (error: any) {
      logger.error('Error testing file operations', { error });
      return sendError(res, 
        'Failed to test file operations', 
        500, 
        'FILE_OPS_TEST_ERROR', 
        { message: error.message }
      );
    }
  });

  /**
   * Filename Utilities Test
   */
  app.get('/api/file-test/filename-utils', fileTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.debug('Testing filename utilities');
      
      const results = [];
      
      // Test sanitization of filenames
      const filenameTests = [
        { input: 'normal.jpg', expected: 'normal.jpg' },
        { input: 'file with spaces.jpg', expected: 'file-with-spaces.jpg' },
        { input: 'file_with_underscores.jpg', expected: 'file_with_underscores.jpg' },
        { input: 'file-with-special-chars-#$%.jpg', expected: 'file-with-special-chars--.jpg' },
        { input: 'ñandú-español.jpg', expected: 'nandu-espanol.jpg' },
        { input: '../path/traversal/attempt.jpg', expected: 'path-traversal-attempt.jpg' }
      ];
      
      for (const test of filenameTests) {
        const sanitized = sanitizeFilename(test.input);
        if (sanitized === test.expected) {
          results.push(createTestResult('passed', `Sanitized '${test.input}' to '${sanitized}' correctly`));
        } else {
          results.push(createTestResult('failed', `Sanitized '${test.input}' to '${sanitized}' instead of expected '${test.expected}'`));
        }
      }
      
      // Test unique filename generation
      const uniqueTests = [
        'test.jpg',
        'another-test.png',
        'document.pdf'
      ];
      
      for (const filename of uniqueTests) {
        const unique = generateUniqueFilename(filename);
        // Should contain timestamp or UUID
        if (unique !== filename && unique.includes(path.extname(filename))) {
          results.push(createTestResult('passed', `Generated unique filename '${unique}' from '${filename}'`));
        } else {
          results.push(createTestResult('failed', `Failed to generate proper unique filename from '${filename}'`));
        }
      }
      
      // Overall test result
      const overallStatus = results.some(r => r.status === 'failed') ? 'failed' : 'passed';
      
      return sendSuccess(res, {
        status: overallStatus,
        message: 'Filename utilities test completed',
        results
      });
    } catch (error: any) {
      logger.error('Error testing filename utilities', { error });
      return sendError(res, 
        'Failed to test filename utilities', 
        500, 
        'FILENAME_UTILS_TEST_ERROR', 
        { message: error.message }
      );
    }
  });

  /**
   * Run All File System Tests
   */
  app.get('/api/file-test/run-all', fileTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.debug('Running all file system tests');
      
      // Run all tests sequentially and collect results
      const endpoints = [
        '/api/file-test/api-methods',
        '/api/file-test/buckets',
        '/api/file-test/operations',
        '/api/file-test/filename-utils'
      ];
      
      const testResults = {};
      
      for (const endpoint of endpoints) {
        // Get the test name from the endpoint
        const testName = endpoint.split('/').pop();
        
        try {
          // Manually call the handler for each test
          let result;
          switch (endpoint) {
            case '/api/file-test/api-methods':
              result = await new Promise((resolve) => {
                app._router.handle(
                  { method: 'GET', url: endpoint, path: endpoint, query: {}, user: req.user } as any,
                  { json: resolve } as any,
                  () => {}
                );
              });
              break;
            case '/api/file-test/buckets':
              result = await new Promise((resolve) => {
                app._router.handle(
                  { method: 'GET', url: endpoint, path: endpoint, query: {}, user: req.user } as any,
                  { json: resolve } as any,
                  () => {}
                );
              });
              break;
            case '/api/file-test/operations':
              result = await new Promise((resolve) => {
                app._router.handle(
                  { method: 'GET', url: endpoint, path: endpoint, query: {}, user: req.user } as any,
                  { json: resolve } as any,
                  () => {}
                );
              });
              break;
            case '/api/file-test/filename-utils':
              result = await new Promise((resolve) => {
                app._router.handle(
                  { method: 'GET', url: endpoint, path: endpoint, query: {}, user: req.user } as any,
                  { json: resolve } as any,
                  () => {}
                );
              });
              break;
          }
          
          testResults[testName] = {
            endpoint,
            status: result.success ? 'passed' : 'failed',
            data: result.data
          };
        } catch (error) {
          testResults[testName] = {
            endpoint,
            status: 'failed',
            error: String(error)
          };
        }
      }
      
      // Determine overall status
      const overallStatus = Object.values(testResults).some(
        (result: any) => result.status === 'failed'
      ) ? 'failed' : 'passed';
      
      return sendSuccess(res, {
        status: overallStatus,
        message: 'All file system tests completed',
        tests: testResults
      });
    } catch (error: any) {
      logger.error('Error running all file tests', { error });
      return sendError(res, 
        'Failed to run all file tests', 
        500, 
        'FILE_TEST_ALL_ERROR', 
        { message: error.message }
      );
    }
  });
}