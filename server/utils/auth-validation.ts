/**
 * Authentication Validation Utilities
 * 
 * This module provides centralized utilities for validating authentication credentials,
 * password strength, and user access throughout the application.
 */

import { z } from "zod";
import { logger } from "../logger";

// Minimum requirements for password security
const MIN_PASSWORD_LENGTH = 8;
const REQUIRES_UPPERCASE = true;
const REQUIRES_LOWERCASE = true;
const REQUIRES_NUMBER = true;
const REQUIRES_SPECIAL = true;

/**
 * Validate if credentials are non-empty and properly formatted
 * @param username - The username or email to validate
 * @param password - The password to validate
 * @returns Object containing validation result and any error message
 */
export function validateCredentialFields(username: string, password: string): { 
  valid: boolean; 
  error?: string; 
} {
  // Check for empty or whitespace-only values
  if (!username || username.trim() === '') {
    return {
      valid: false,
      error: "Username/email is required"
    };
  }
  
  if (!password || password.trim() === '') {
    return {
      valid: false,
      error: "Password is required"
    };
  }
  
  // Email format validation
  if (username.includes('@')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
      return {
        valid: false,
        error: "Invalid email format"
      };
    }
  }
  
  return { valid: true };
}

/**
 * Validate password strength according to security requirements
 * @param password - The password to validate
 * @returns Boolean indicating if password meets requirements
 */
export function validatePassword(password: string): boolean {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return false;
  }
  
  // Check for required character types
  const hasUppercase = REQUIRES_UPPERCASE ? /[A-Z]/.test(password) : true;
  const hasLowercase = REQUIRES_LOWERCASE ? /[a-z]/.test(password) : true;
  const hasNumber = REQUIRES_NUMBER ? /[0-9]/.test(password) : true;
  const hasSpecial = REQUIRES_SPECIAL ? /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) : true;
  
  return hasUppercase && hasLowercase && hasNumber && hasSpecial;
}

/**
 * Get detailed password validation results with specific feedback
 * @param password - The password to validate
 * @returns Object with validation results and specific feedback
 */
export function getPasswordValidationDetails(password: string): {
  valid: boolean;
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  feedback: string[];
} {
  const length = password?.length >= MIN_PASSWORD_LENGTH;
  const uppercase = REQUIRES_UPPERCASE ? /[A-Z]/.test(password || '') : true;
  const lowercase = REQUIRES_LOWERCASE ? /[a-z]/.test(password || '') : true;
  const number = REQUIRES_NUMBER ? /[0-9]/.test(password || '') : true;
  const special = REQUIRES_SPECIAL ? /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password || '') : true;
  
  const valid = length && uppercase && lowercase && number && special;
  
  const feedback = [];
  if (!length) feedback.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  if (!uppercase && REQUIRES_UPPERCASE) feedback.push('Password must include at least one uppercase letter');
  if (!lowercase && REQUIRES_LOWERCASE) feedback.push('Password must include at least one lowercase letter');
  if (!number && REQUIRES_NUMBER) feedback.push('Password must include at least one number');
  if (!special && REQUIRES_SPECIAL) feedback.push('Password must include at least one special character');
  
  return {
    valid,
    length,
    uppercase,
    lowercase,
    number,
    special,
    feedback
  };
}

/**
 * Schema for login credentials validation using Zod
 */
export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

/**
 * Schema for user registration with comprehensive validation
 */
export const registrationSchema = z.object({
  username: z.string().trim().min(3, "Display name must be at least 3 characters").max(30, "Display name must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_\s]+$/, "Display name can only contain letters, numbers, spaces, and underscores"),
  email: z.string().trim().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .refine(password => REQUIRES_UPPERCASE ? /[A-Z]/.test(password) : true, {
      message: "Password must include at least one uppercase letter"
    })
    .refine(password => REQUIRES_LOWERCASE ? /[a-z]/.test(password) : true, {
      message: "Password must include at least one lowercase letter"
    })
    .refine(password => REQUIRES_NUMBER ? /[0-9]/.test(password) : true, {
      message: "Password must include at least one number"
    })
    .refine(password => REQUIRES_SPECIAL ? /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) : true, {
      message: "Password must include at least one special character"
    }),
  confirmPassword: z.string().min(1, "Confirm password is required"),
  fullName: z.string().optional(),
  repCode: z.string().trim().optional().transform(val => val === "" ? undefined : val), // Optional sales rep code, convert empty string to undefined
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  })
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

/**
 * Schema for password reset requests
 */
export const passwordResetRequestSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Invalid email format")
});

/**
 * Schema for password reset confirmation
 */
export const passwordResetSchema = z.object({
  resetToken: z.string().min(1, "Reset token is required"),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .refine(password => REQUIRES_UPPERCASE ? /[A-Z]/.test(password) : true, {
      message: "Password must include at least one uppercase letter"
    })
    .refine(password => REQUIRES_LOWERCASE ? /[a-z]/.test(password) : true, {
      message: "Password must include at least one lowercase letter"
    })
    .refine(password => REQUIRES_NUMBER ? /[0-9]/.test(password) : true, {
      message: "Password must include at least one number"
    })
    .refine(password => REQUIRES_SPECIAL ? /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) : true, {
      message: "Password must include at least one special character"
    }),
  confirmPassword: z.string().min(1, "Confirm password is required")
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

/**
 * Log authentication attempts for security monitoring
 */
export function logAuthAttempt(eventType: 'login' | 'register' | 'password-reset' | 'logout', 
                              success: boolean, 
                              context: Record<string, any>): void {
  if (success) {
    logger.info(`Authentication event: ${eventType} successful`, context);
  } else {
    logger.warn(`Authentication event: ${eventType} failed`, context);
  }
}