/**
 * Shared validation utility functions for the HeartCart application
 * Common validation patterns for form data and user input
 */

import { z } from "zod";
import { isValidDate } from "./date-utils";

/**
 * Email validation with regex pattern for standard email formats
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  // Use Zod for validation
  const emailSchema = z.string().email();
  const result = emailSchema.safeParse(email);
  
  return result.success;
}

/**
 * Phone number validation (South African format)
 * Accepts formats: +27xx xxx xxxx, 0xx xxx xxxx
 */
export function isValidSAPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid South African number
  // Either starts with 27 and is 11 digits
  // Or starts with 0 and is 10 digits
  return (
    (cleaned.startsWith('27') && cleaned.length === 11) ||
    (cleaned.startsWith('0') && cleaned.length === 10)
  );
}

/**
 * URL validation for standard URL formats
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  // Use Zod for validation
  const urlSchema = z.string().url();
  const result = urlSchema.safeParse(url);
  
  return result.success;
}

/**
 * ID number validation for South African ID numbers
 */
export function isValidSAID(idNumber: string | null | undefined): boolean {
  if (!idNumber) return false;
  
  // Remove all non-numeric characters
  const cleaned = idNumber.replace(/\D/g, '');
  
  // SA ID is 13 digits
  if (cleaned.length !== 13) return false;
  
  // First 6 digits represent birth date (YYMMDD)
  const year = parseInt(cleaned.substring(0, 2));
  const month = parseInt(cleaned.substring(2, 4));
  const day = parseInt(cleaned.substring(4, 6));
  
  // Basic date validation
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  // Check the checksum (Luhn algorithm)
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * (i % 2 === 0 ? 1 : 2);
  }
  const checksum = (10 - (sum % 10)) % 10;
  
  return parseInt(cleaned[12]) === checksum;
}

/**
 * Password strength validation
 * Returns an object with validation results and strength score
 */
export function validatePassword(password: string | null | undefined): {
  isValid: boolean;
  score: number;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
} {
  if (!password) {
    return {
      isValid: false,
      score: 0,
      hasMinLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecial: false
    };
  }
  
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  
  // Calculate strength score (0-5)
  let score = 0;
  if (hasMinLength) score++;
  if (hasUppercase) score++;
  if (hasLowercase) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;
  
  // Password is valid if it meets minimum requirements
  const isValid = hasMinLength && (score >= 3);
  
  return {
    isValid,
    score,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial
  };
}

/**
 * Validation for South African postal codes
 */
export function isValidPostalCode(postalCode: string | null | undefined): boolean {
  if (!postalCode) return false;
  
  // South African postal codes are 4 digits
  return /^\d{4}$/.test(postalCode);
}

/**
 * Credit card number validation using Luhn algorithm
 */
export function isValidCreditCard(cardNumber: string | null | undefined): boolean {
  if (!cardNumber) return false;
  
  // Remove all non-numeric characters
  const cleaned = cardNumber.replace(/\D/g, '');
  
  // Check if length is valid (13-19 digits)
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  
  // Luhn algorithm
  let sum = 0;
  let shouldDouble = false;
  
  // Start from the right
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i));
    
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  
  return sum % 10 === 0;
}

/**
 * Validate a string is not empty or just whitespace
 */
export function isNonEmptyString(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a value is within a specified numeric range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Validate object has all required properties
 */
export function hasRequiredProperties<T>(obj: T, requiredProps: (keyof T)[]): boolean {
  if (!obj) return false;
  
  return requiredProps.every(prop => 
    Object.prototype.hasOwnProperty.call(obj, prop) && 
    obj[prop] !== null && 
    obj[prop] !== undefined
  );
}

/**
 * Create a ZOD validation schema for common South African details
 */
export const southAfricanDetailsSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().refine(isValidSAPhoneNumber, "Invalid South African phone number"),
  postalCode: z.string().refine(isValidPostalCode, "South African postal codes must be 4 digits"),
  idNumber: z.string().optional().refine(
    val => !val || isValidSAID(val), 
    "Invalid South African ID number"
  )
});