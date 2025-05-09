/**
 * Authentication Validation Utilities
 * 
 * This module provides utilities for validating authentication-related data
 * such as passwords, usernames, and other credentials.
 */

import { logger } from "../logger";

/**
 * Validates password against security requirements
 * @param password - The password to validate
 * @returns True if the password meets all requirements, false otherwise
 */
export function validatePassword(password: string): boolean {
  try {
    if (!password) {
      return false;
    }

    // Minimum length requirement (8 characters)
    if (password.length < 8) {
      return false;
    }

    // Must contain at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // Must contain at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // Must contain at least one digit
    if (!/\d/.test(password)) {
      return false;
    }

    // Must contain at least one special character
    if (!/[^A-Za-z0-9]/.test(password)) {
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error validating password format', { error });
    return false;
  }
}

/**
 * Validates email format
 * @param email - The email to validate
 * @returns True if the email format is valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  try {
    if (!email) {
      return false;
    }
    
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error validating email format', { error });
    return false;
  }
}

/**
 * Validates username format
 * @param username - The username to validate
 * @returns True if the username format is valid, false otherwise
 */
export function validateUsername(username: string): boolean {
  try {
    if (!username) {
      return false;
    }
    
    // Username must be between 3 and 20 characters
    if (username.length < 3 || username.length > 20) {
      return false;
    }
    
    // Only allow alphanumeric characters, underscore, and hyphen
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error validating username format', { error });
    return false;
  }
}

/**
 * Validates phone number format
 * @param phoneNumber - The phone number to validate
 * @returns True if the phone number format is valid, false otherwise
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  try {
    if (!phoneNumber) {
      return true; // Phone number is optional
    }
    
    // Allow only digits, spaces, parentheses, plus sign, and hyphens
    if (!/^[0-9\s()+\-]+$/.test(phoneNumber)) {
      return false;
    }
    
    // Minimum digits requirement (at least 7 digits)
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error validating phone number format', { error });
    return false;
  }
}

/**
 * Validates postal code format
 * @param postalCode - The postal code to validate
 * @returns True if the postal code format is valid, false otherwise
 */
export function validatePostalCode(postalCode: string): boolean {
  try {
    if (!postalCode) {
      return true; // Postal code is optional
    }
    
    // Basic South African postal code validation (4 digits)
    if (!/^\d{4}$/.test(postalCode)) {
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error validating postal code format', { error });
    return false;
  }
}