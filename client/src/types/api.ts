/**
 * Standardized API response structure
 */
export interface StandardApiResponse<T, M = {}> {
  /**
   * Whether the API request was successful
   */
  success: boolean;
  
  /**
   * The data returned from the API
   */
  data?: T;
  
  /**
   * Error information if the request was not successful
   */
  error?: {
    /**
     * Error message
     */
    message: string;
    
    /**
     * Error code
     */
    code?: string;
    
    /**
     * Additional error details
     */
    details?: unknown;
  };
  
  /**
   * Metadata for pagination or additional information
   */
  meta?: {
    /**
     * Current page number
     */
    page?: number;
    
    /**
     * Number of items per page
     */
    limit?: number;
    
    /**
     * Total number of items available
     */
    total?: number;
    
    /**
     * Total number of pages available
     */
    totalPages?: number;
  } & M;
}