/**
 * AI Utilities
 * 
 * Provides helper functions and hooks for AI-related functionality
 * in the product management system.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useState } from 'react';

/**
 * Check if AI services are available
 */
export function useAiStatus() {
  return useQuery({
    queryKey: ['/api/ai/status'],
    queryFn: async () => {
      const response = await apiRequest('/api/ai/status');
      return response;
    },
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  });
}

/**
 * Generate product description suggestions
 */
export function useGenerateDescriptions() {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const mutation = useMutation({
    mutationFn: async (data: { 
      productName: string;
      category?: string;
      attributes?: any[];
    }) => {
      setIsGenerating(true);
      try {
        const response = await apiRequest('/api/ai/suggest-description', {
          method: 'POST',
          data,
        });
        return response;
      } finally {
        setIsGenerating(false);
      }
    },
  });
  
  return {
    generateDescriptions: mutation.mutate,
    isGenerating: isGenerating,
    descriptions: mutation.data?.descriptions || [],
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Generate SEO optimization suggestions
 */
export function useGenerateSeoSuggestions() {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const mutation = useMutation({
    mutationFn: async (data: { 
      productName: string;
      description: string;
      category?: string;
    }) => {
      setIsGenerating(true);
      try {
        const response = await apiRequest('/api/ai/optimize-seo', {
          method: 'POST',
          data,
        });
        return response;
      } finally {
        setIsGenerating(false);
      }
    },
  });
  
  return {
    generateSuggestions: mutation.mutate,
    isGenerating: isGenerating,
    results: mutation.data ? {
      keywords: mutation.data.keywords || [],
      metaTitle: mutation.data.metaTitle || '',
      metaDescription: mutation.data.metaDescription || '',
      contentSuggestions: mutation.data.contentSuggestions || [],
    } : null,
    error: mutation.error,
    reset: mutation.reset,
  };
}