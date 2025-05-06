import { useState } from 'react';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

export interface ProductAnalysisData {
  suggestedName?: string;
  suggestedDescription?: string;
  suggestedCategory?: string;
  suggestedBrand?: string;
  suggestedTags?: string[];
  suggestedCostPrice?: number;
  suggestedPrice?: number;
}

export interface PriceSuggestionData {
  suggestedPrice: number;
  markupPercentage: number;
  markupSource: string;
}

interface UseProductAnalysisOptions {
  onSuccess?: (data: ProductAnalysisData) => void;
  onError?: (error: Error) => void;
}

export function useProductAnalysis({ onSuccess, onError }: UseProductAnalysisOptions = {}) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [productAnalysisData, setProductAnalysisData] = useState<ProductAnalysisData | null>(null);

  const analyzeProduct = async ({ imageUrl, productName }: { imageUrl: string; productName: string }) => {
    try {
      setIsProcessing(true);
      setError(null);

      if (!productName) {
        throw new Error('Product name is required for analysis');
      }

      const response = await apiRequest('POST', '/api/ai/analyze-product', { imageUrl, productName });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze product');
      }

      const data = await response.json();
      setProductAnalysisData(data);
      
      if (onSuccess) {
        onSuccess(data);
      }

      return data;
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(err?.message || 'Unknown error');
      setError(error);
      
      toast({
        title: 'AI Analysis Failed',
        description: error.message,
        variant: 'destructive',
      });
      
      if (onError) {
        onError(error);
      }
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const removeBackground = async ({ imageUrl }: { imageUrl: string }) => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await apiRequest('POST', '/api/ai/remove-background', { imageUrl });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove background');
      }

      const data = await response.json();
      return data.processedImageUrl;
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(err?.message || 'Unknown error');
      setError(error);
      
      toast({
        title: 'Background Removal Failed',
        description: error.message,
        variant: 'destructive',
      });
      
      if (onError) {
        onError(error);
      }
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const generateTags = async ({ imageUrl, productInfo }: { imageUrl: string; productInfo?: { name: string; description: string } }) => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await apiRequest('POST', '/api/ai/generate-tags', { imageUrl, productInfo });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate tags');
      }

      const data = await response.json();
      return data.tags;
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(err?.message || 'Unknown error');
      setError(error);
      
      toast({
        title: 'Tag Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
      
      if (onError) {
        onError(error);
      }
      
      return [];
    } finally {
      setIsProcessing(false);
    }
  };

  const suggestPrice = async ({ 
    costPrice, 
    productName, 
    categoryName, 
    categoryId 
  }: { 
    costPrice: number; 
    productName: string; 
    categoryName?: string; 
    categoryId?: number 
  }) => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await apiRequest('POST', '/api/ai/suggest-price', { 
        costPrice, 
        productName, 
        categoryName, 
        categoryId 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to suggest price');
      }

      const data = await response.json();
      
      // Return the entire price suggestion data instead of just the price
      return {
        suggestedPrice: data.suggestedPrice as number,
        markupPercentage: data.markupPercentage as number,
        markupSource: data.markupSource as string
      };
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(err?.message || 'Unknown error');
      setError(error);
      
      toast({
        title: 'Price Suggestion Failed',
        description: error.message,
        variant: 'destructive',
      });
      
      if (onError) {
        onError(error);
      }
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    analyzeProduct,
    removeBackground,
    generateTags,
    suggestPrice,
    isProcessing,
    error,
    productAnalysisData,
  };
}