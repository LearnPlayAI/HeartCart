/**
 * Authentication Testing Utilities
 * 
 * This module provides tools for testing and validating the authentication system.
 * It's designed to be used both programmatically and via API routes for comprehensive testing.
 */

import { Request, Response } from 'express';
import { logger } from '../logger';
import { checkAuthentication } from '../auth-middleware';
import { storage } from '../storage';

// Import hash function from auth
import { hashPassword, comparePasswords } from '../auth';

/**
 * Validates that a password matches the expected format (min 6 chars, contains letter and number)
 * @param password - The password to validate
 * @returns Object containing validation result and any error messages
 */
export function validatePasswordFormat(password: string): { 
  valid: boolean; 
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check minimum length
  if (password.length < 6) {
    errors.push("Password must be at least 6 characters");
  }
  
  // Check for letter and number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (!hasLetter) {
    errors.push("Password must contain at least one letter");
  }
  
  if (!hasNumber) {
    errors.push("Password must contain at least one number");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Tests authentication session persistence by checking if user session is correctly maintained
 * @param req - Express request object with session
 * @returns Test result including status and diagnostic information
 */
export function testSessionPersistence(req: Request): {
  status: 'success' | 'failure';
  isAuthenticated: boolean;
  user: Express.User | null;
  sessionData: any;
  diagnostics: string;
} {
  const auth = checkAuthentication(req);
  const sessionData = req.session;
  
  const diagnostics = auth.isAuthenticated 
    ? `Session is active and contains user ID ${auth.userId}`
    : 'Session does not contain authenticated user';
    
  return {
    status: auth.isAuthenticated ? 'success' : 'failure',
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    sessionData,
    diagnostics
  };
}

/**
 * Validates a user's credentials without actually logging them in
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise resolving to validation result
 */
export async function validateCredentials(email: string, password: string): Promise<{
  valid: boolean;
  userId?: number;
  error?: string;
}> {
  try {
    // Find user by email
    const user = await storage.getUserByEmail(email);
    
    // User not found
    if (!user) {
      return {
        valid: false,
        error: "Invalid email or password"
      };
    }
    
    // Compare password
    const isPasswordValid = await comparePasswords(password, user.password);
    
    if (!isPasswordValid) {
      return {
        valid: false,
        error: "Invalid email or password"
      };
    }
    
    // Success
    return {
      valid: true,
      userId: user.id
    };
  } catch (error) {
    logger.error('Error validating credentials', { error, email });
    return {
      valid: false,
      error: "An error occurred while validating credentials"
    };
  }
}

/**
 * Tests the timeout mechanism for sessions
 * @param sessionData - The session data to test
 * @returns Timeout assessment result
 */
export function testSessionTimeout(sessionData: any): {
  status: 'active' | 'expired' | 'unknown';
  timeRemaining?: number;
  diagnosis: string;
} {
  if (!sessionData || !sessionData.cookie) {
    return {
      status: 'unknown',
      diagnosis: 'No valid session data found'
    };
  }
  
  const now = Date.now();
  const expires = new Date(sessionData.cookie.expires).getTime();
  
  if (isNaN(expires)) {
    return {
      status: 'unknown',
      diagnosis: 'Invalid expiration date in session'
    };
  }
  
  const timeRemaining = expires - now;
  
  if (timeRemaining <= 0) {
    return {
      status: 'expired',
      timeRemaining: 0,
      diagnosis: 'Session has expired'
    };
  }
  
  // Convert to minutes for easier reading
  const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));
  
  return {
    status: 'active',
    timeRemaining,
    diagnosis: `Session is active with ${minutesRemaining} minutes remaining`
  };
}

/**
 * Comprehensive test of the authentication system
 * @returns Test results for all authentication components
 */
export async function runAuthSystemTests(): Promise<{
  status: 'passed' | 'failed';
  results: {
    sessionStore: { status: 'passed' | 'failed'; message: string; };
    passwordHashing: { status: 'passed' | 'failed'; message: string; };
    userRetrieval: { status: 'passed' | 'failed'; message: string; };
    sessionExpiry: { status: 'passed' | 'failed'; message: string; };
  };
  failedTests: string[];
}> {
  const results = {
    sessionStore: { status: 'failed' as 'passed' | 'failed', message: '' },
    passwordHashing: { status: 'failed' as 'passed' | 'failed', message: '' },
    userRetrieval: { status: 'failed' as 'passed' | 'failed', message: '' },
    sessionExpiry: { status: 'failed' as 'passed' | 'failed', message: '' }
  };
  
  const failedTests: string[] = [];
  
  // Test session store connectivity
  try {
    if (storage.sessionStore) {
      results.sessionStore = { 
        status: 'passed', 
        message: 'Session store is properly configured and connected' 
      };
    } else {
      results.sessionStore = { 
        status: 'failed', 
        message: 'Session store is not properly configured' 
      };
      failedTests.push('sessionStore');
    }
  } catch (error) {
    results.sessionStore = { 
      status: 'failed', 
      message: `Session store test failed: ${error instanceof Error ? error.message : String(error)}` 
    };
    failedTests.push('sessionStore');
  }
  
  // Test password hashing and verification
  try {
    const testPassword = "Test123";
    const hashedPassword = await hashPassword(testPassword);
    const passwordMatches = await comparePasswords(testPassword, hashedPassword);
    
    if (passwordMatches) {
      results.passwordHashing = { 
        status: 'passed', 
        message: 'Password hashing and verification works correctly' 
      };
    } else {
      results.passwordHashing = { 
        status: 'failed', 
        message: 'Password hashing test failed: verification did not match' 
      };
      failedTests.push('passwordHashing');
    }
  } catch (error) {
    results.passwordHashing = { 
      status: 'failed', 
      message: `Password hashing test failed: ${error instanceof Error ? error.message : String(error)}` 
    };
    failedTests.push('passwordHashing');
  }
  
  // Test user retrieval system
  try {
    // Get count of users to verify database access
    const userCount = await storage.getUserCount();
    
    if (typeof userCount === 'number') {
      results.userRetrieval = { 
        status: 'passed', 
        message: `User retrieval system working. Total users: ${userCount}` 
      };
    } else {
      results.userRetrieval = { 
        status: 'failed', 
        message: 'User retrieval test failed: could not count users' 
      };
      failedTests.push('userRetrieval');
    }
  } catch (error) {
    results.userRetrieval = { 
      status: 'failed', 
      message: `User retrieval test failed: ${error instanceof Error ? error.message : String(error)}` 
    };
    failedTests.push('userRetrieval');
  }
  
  // Test session expiry settings
  try {
    const mockSession = {
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        expires: new Date(Date.now() + (24 * 60 * 60 * 1000))
      }
    };
    
    const timeoutTest = testSessionTimeout(mockSession);
    
    if (timeoutTest.status === 'active') {
      results.sessionExpiry = { 
        status: 'passed', 
        message: 'Session expiry mechanism is functioning correctly' 
      };
    } else {
      results.sessionExpiry = { 
        status: 'failed', 
        message: `Session expiry test failed: ${timeoutTest.diagnosis}` 
      };
      failedTests.push('sessionExpiry');
    }
  } catch (error) {
    results.sessionExpiry = { 
      status: 'failed', 
      message: `Session expiry test failed: ${error instanceof Error ? error.message : String(error)}` 
    };
    failedTests.push('sessionExpiry');
  }
  
  return {
    status: failedTests.length === 0 ? 'passed' : 'failed',
    results,
    failedTests
  };
}

/**
 * Local Testing Client - This is used only for local testing of the authentication system
 * Can be exposed via a route that's only available in development mode for admin testing
 */
export async function executeLocalTest(): Promise<{
  testName: string,
  result: boolean,
  details: any
}> {
  // Test the password validation functionality
  const testPassword = "TestPass123";
  const weakPassword = "password";
  
  const passwordValidationResult = validatePasswordFormat(testPassword);
  const weakPasswordValidationResult = validatePasswordFormat(weakPassword);
  
  // Test session functionality available in this environment
  let sessionTestResult = {};
  try {
    // Get the number of users from storage
    const userCount = await storage.getUserCount();
    sessionTestResult = {
      userCount,
      sessionStoreAvailable: !!storage.sessionStore
    };
  } catch (error) {
    sessionTestResult = { error: 'Could not test session storage' };
  }
  
  return {
    testName: 'Local Authentication System Test',
    result: passwordValidationResult.valid && !weakPasswordValidationResult.valid,
    details: {
      strongPassword: passwordValidationResult,
      weakPassword: weakPasswordValidationResult,
      session: sessionTestResult
    }
  };
}