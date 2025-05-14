/**
 * AI Utilities
 * 
 * Provides helper functions and hooks for AI-related functionality
 * in the product management system.
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

/**
 * Check if AI services are available
 */
export function useAiStatus() {
  return useQuery({
    queryKey: ['/api/ai/status'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/ai/status');
        return response.data;
      } catch (error) {
        console.error("Error checking AI status:", error);
        return { available: false };
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}

/**
 * Generate product description suggestions
 */
export function useGenerateDescriptions() {
  return useMutation({
    mutationFn: async ({ 
      productName, 
      category, 
      attributes 
    }: { 
      productName: string; 
      category?: string;
      attributes?: any[];
    }) => {
      const response = await apiRequest('POST', '/api/ai/suggest-description', {
        productName,
        category,
        attributes
      });
      return response.data;
    }
  });
}

/**
 * Generate SEO optimization suggestions
 */
export function useGenerateSeoSuggestions() {
  return useMutation({
    mutationFn: async ({ 
      productName, 
      description, 
      category 
    }: { 
      productName: string; 
      description: string;
      category?: string;
    }) => {
      const response = await apiRequest('POST', '/api/ai/optimize-seo', {
        productName,
        description,
        category
      });
      return response.data;
    }
  });
}