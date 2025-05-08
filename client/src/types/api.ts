/**
 * Standardized API Response for TeeMeYou
 * This interface ensures consistent response structure across all API endpoints
 */
export interface StandardApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}