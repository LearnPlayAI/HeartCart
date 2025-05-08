import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { StandardApiResponse } from '@/types/api';
import { Product } from '@shared/schema';
import { useEffect } from 'react';

/**
 * Parameters for the useProducts hook
 */
export interface UseProductsParams {
  /**
   * Category ID to filter products
   */
  categoryId?: number | string | null;
  
  /**
   * Current page number for pagination
   */
  page?: number;
  
  /**
   * Number of products per page
   */
  limit?: number;
  
  /**
   * Search query to filter products
   */
  searchQuery?: string;
  
  /**
   * Sort order for products
   */
  sortBy?: string;
  
  /**
   * Whether to include inactive products
   */
  includeInactive?: boolean;
  
  /**
   * Whether to only include products on sale
   */
  onSale?: boolean;
  
  /**
   * Whether to only include products with free shipping
   */
  freeShipping?: boolean;
  
  /**
   * Filter by minimum rating
   */
  minRating?: number;
  
  /**
   * Additional query parameters
   */
  additionalParams?: Record<string, any>;
  
  /**
   * Whether the query should be enabled
   */
  enabled?: boolean;
}

/**
 * Hook for fetching products with standardized API response handling
 */
export function useProducts({
  categoryId,
  page = 1,
  limit = 20,
  searchQuery = '',
  sortBy = 'default',
  includeInactive = false,
  onSale = false,
  freeShipping = false,
  minRating = 0,
  additionalParams = {},
  enabled = true
}: UseProductsParams = {}) {
  const { toast } = useToast();
  
  // Construct query parameters
  const queryParams: Record<string, any> = {
    ...additionalParams,
    limit,
    offset: (page - 1) * limit
  };
  
  // Add optional filters if they are set
  if (searchQuery) queryParams.q = searchQuery;
  if (sortBy && sortBy !== 'default') queryParams.sort = sortBy;
  if (includeInactive) queryParams.includeInactive = true;
  if (onSale) queryParams.onSale = true;
  if (freeShipping) queryParams.freeShipping = true;
  if (minRating > 0) queryParams.minRating = minRating;
  
  // Determine the endpoint based on whether a category is specified
  const endpoint = categoryId
    ? `/api/categories/${categoryId}/products`
    : '/api/products';
  
  // Fetch products with standardized API response
  const {
    data: productsResponse,
    isLoading,
    error,
    refetch
  } = useQuery<StandardApiResponse<Product[], { total?: number, totalPages?: number }>>({
    queryKey: [endpoint, queryParams],
    enabled
  });
  
  // Standardized error handling
  useEffect(() => {
    if (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Failed to load products',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  }, [error, toast]);
  
  // Extract data from standardized response
  const products = productsResponse?.success ? productsResponse.data : [];
  const totalPages = productsResponse?.meta?.totalPages || 1;
  const total = productsResponse?.meta?.total || 0;
  
  return {
    products,
    productsResponse,
    isLoading,
    error,
    totalPages,
    total,
    refetch
  };
}

/**
 * Hook for fetching a single product by ID or slug with standardized API response handling
 */
export function useProduct(productIdOrSlug: string | number | undefined, enabled = true) {
  const { toast } = useToast();
  
  const {
    data: productResponse,
    isLoading,
    error,
    refetch
  } = useQuery<StandardApiResponse<Product>>({
    queryKey: [productIdOrSlug ? `/api/products/${productIdOrSlug}` : ''],
    enabled: !!productIdOrSlug && enabled,
  });
  
  // Standardized error handling
  useEffect(() => {
    if (error) {
      console.error('Error fetching product details:', error);
      toast({
        title: 'Failed to load product details',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  }, [error, toast]);
  
  const product = productResponse?.success ? productResponse.data : undefined;
  
  return {
    product,
    productResponse,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook for fetching related products with standardized API response handling
 */
export function useRelatedProducts(productId: number | undefined, limit = 4, enabled = true) {
  const { toast } = useToast();
  
  const {
    data: relatedProductsResponse,
    isLoading,
    error
  } = useQuery<StandardApiResponse<Product[]>>({
    queryKey: [productId ? `/api/products/${productId}/related` : '', { limit }],
    enabled: !!productId && enabled,
  });
  
  // Standardized error handling
  useEffect(() => {
    if (error) {
      console.error('Error fetching related products:', error);
      toast({
        title: 'Failed to load related products',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  }, [error, toast]);
  
  const relatedProducts = relatedProductsResponse?.success ? relatedProductsResponse.data : [];
  
  return {
    relatedProducts,
    relatedProductsResponse,
    isLoading,
    error
  };
}

/**
 * Hook for fetching featured products with standardized API response handling
 */
export function useFeaturedProducts(limit = 8) {
  const { toast } = useToast();
  
  const {
    data: featuredProductsResponse,
    isLoading,
    error
  } = useQuery<StandardApiResponse<Product[]>>({
    queryKey: ['/api/featured-products', { limit }],
  });
  
  // Standardized error handling
  useEffect(() => {
    if (error) {
      console.error('Error fetching featured products:', error);
      toast({
        title: 'Failed to load featured products',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  }, [error, toast]);
  
  const featuredProducts = featuredProductsResponse?.success ? featuredProductsResponse.data : [];
  
  return {
    featuredProducts,
    featuredProductsResponse,
    isLoading,
    error
  };
}