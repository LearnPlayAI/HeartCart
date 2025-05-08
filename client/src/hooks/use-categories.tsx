import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { StandardApiResponse } from '@/types/api';
import { Category } from '@shared/schema';
import { useEffect } from 'react';

/**
 * Parameters for useCategories hook
 */
export interface UseCategoriesParams {
  /**
   * Whether to include inactive categories
   */
  includeInactive?: boolean;
  
  /**
   * Whether to only include main categories
   */
  mainOnly?: boolean;
  
  /**
   * Whether to include children in the response
   */
  withChildren?: boolean;
  
  /**
   * Parent category ID to filter by
   */
  parentId?: number | null;
  
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
 * Hook for fetching categories with standardized API response handling
 */
export function useCategories({
  includeInactive = false,
  mainOnly = false,
  withChildren = false,
  parentId,
  additionalParams = {},
  enabled = true
}: UseCategoriesParams = {}) {
  const { toast } = useToast();
  
  // Construct query parameters
  const queryParams: Record<string, any> = {
    ...additionalParams
  };
  
  // Add optional filters if they are set
  if (includeInactive) queryParams.includeInactive = true;
  if (parentId !== undefined) queryParams.parentId = parentId;
  
  // Determine the endpoint based on the options
  let endpoint = '/api/categories';
  if (mainOnly && withChildren) {
    endpoint = '/api/categories/main/with-children';
  } else if (mainOnly) {
    endpoint = '/api/categories/main';
  } else if (withChildren) {
    endpoint = '/api/categories/with-children';
  }
  
  // Fetch categories with standardized API response
  const {
    data: categoriesResponse,
    isLoading,
    error,
    refetch
  } = useQuery<StandardApiResponse<Category[]>>({
    queryKey: [endpoint, queryParams],
    enabled
  });
  
  // Standardized error handling
  useEffect(() => {
    if (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Failed to load categories',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  }, [error, toast]);
  
  // Extract data from standardized response
  const categories = categoriesResponse?.success ? categoriesResponse.data : [];
  
  return {
    categories,
    categoriesResponse,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook for fetching a single category by ID with standardized API response handling
 */
export function useCategory(categoryId: number | string | undefined, enabled = true) {
  const { toast } = useToast();
  
  const {
    data: categoryResponse,
    isLoading,
    error,
    refetch
  } = useQuery<StandardApiResponse<Category>>({
    queryKey: [categoryId ? `/api/categories/${categoryId}` : ''],
    enabled: !!categoryId && enabled,
  });
  
  // Standardized error handling
  useEffect(() => {
    if (error) {
      console.error('Error fetching category details:', error);
      toast({
        title: 'Failed to load category details',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  }, [error, toast]);
  
  const category = categoryResponse?.success ? categoryResponse.data : undefined;
  
  return {
    category,
    categoryResponse,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook for fetching category attributes with standardized API response handling
 */
export function useCategoryAttributes(categoryId: number | string | undefined, enabled = true) {
  const { toast } = useToast();
  
  const {
    data: attributesResponse,
    isLoading,
    error,
    refetch
  } = useQuery<StandardApiResponse<any[]>>({
    queryKey: [categoryId ? `/api/categories/${categoryId}/attributes` : ''],
    enabled: !!categoryId && enabled,
  });
  
  // Standardized error handling
  useEffect(() => {
    if (error) {
      console.error('Error fetching category attributes:', error);
      toast({
        title: 'Failed to load category attributes',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  }, [error, toast]);
  
  const attributes = attributesResponse?.success ? attributesResponse.data : [];
  
  return {
    attributes,
    attributesResponse,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook for fetching filterable attributes for a category with standardized API response handling
 */
export function useFilterableAttributes(categoryId: number | string | undefined, enabled = true) {
  const { toast } = useToast();
  
  // Determine endpoint based on whether categoryId is provided
  const endpoint = categoryId 
    ? `/api/categories/${categoryId}/filterable-attributes`
    : '/api/products/filterable-attributes';
  
  const {
    data: filterableAttributesResponse,
    isLoading,
    error,
    refetch
  } = useQuery<StandardApiResponse<any[]>>({
    queryKey: [endpoint],
    enabled: enabled,
  });
  
  // Standardized error handling
  useEffect(() => {
    if (error) {
      console.error('Error fetching filterable attributes:', error);
      toast({
        title: 'Failed to load filterable attributes',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  }, [error, toast]);
  
  const filterableAttributes = filterableAttributesResponse?.success ? filterableAttributesResponse.data : [];
  
  return {
    filterableAttributes,
    filterableAttributesResponse,
    isLoading,
    error,
    refetch
  };
}