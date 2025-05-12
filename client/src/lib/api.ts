/**
 * API utility functions
 * 
 * This file contains utility functions for working with the API,
 * including URL creation and request formatting.
 */

/**
 * Get the base URL for API requests
 * @returns The base URL for API requests, without trailing slash
 */
export function getApiBaseUrl(): string {
  // In development, the API is served from the same host
  if (typeof window !== 'undefined') {
    // When running in browser, use the current origin
    return window.location.origin;
  }
  // Fallback to relative URL which works in most cases
  return '';
}

/**
 * Create a full API URL
 * @param path The API path, with or without leading slash
 * @returns Full API URL
 */
export function createApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/**
 * Format an API error response
 * @param error The error object
 * @returns A formatted error message
 */
export function formatApiError(error: any): string {
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unknown error occurred';
}