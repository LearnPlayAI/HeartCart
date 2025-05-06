import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

type UseAIOptions = {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useImageBackgroundRemoval(options: UseAIOptions = {}) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const backgroundRemovalMutation = useMutation({
    mutationFn: async ({
      imageUrl,
      productImageId
    }: {
      imageUrl: string;
      productImageId?: number;
    }) => {
      setIsProcessing(true);
      const response = await apiRequest('POST', '/api/ai/remove-background', {
        imageUrl,
        productImageId
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove background');
      }
      
      return data;
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      toast({
        title: 'Background removed',
        description: 'Image processed successfully',
      });
      
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
    onError: (error: Error) => {
      setIsProcessing(false);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      
      if (options.onError) {
        options.onError(error);
      }
    },
  });

  return {
    removeBackground: backgroundRemovalMutation.mutate,
    isProcessing: isProcessing || backgroundRemovalMutation.isPending,
    backgroundRemovalError: backgroundRemovalMutation.error,
  };
}

export function useProductTagGeneration(options: UseAIOptions = {}) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const tagGenerationMutation = useMutation({
    mutationFn: async ({
      imageUrl,
      productName,
      productDescription = ''
    }: {
      imageUrl: string;
      productName: string;
      productDescription?: string;
    }) => {
      setIsProcessing(true);
      const response = await apiRequest('POST', '/api/ai/generate-tags', {
        imageUrl,
        productName,
        productDescription
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate tags');
      }
      
      return data;
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      toast({
        title: 'Tags generated',
        description: `${data.tags.length} tags generated successfully`,
      });
      
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
    onError: (error: Error) => {
      setIsProcessing(false);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      
      if (options.onError) {
        options.onError(error);
      }
    },
  });

  return {
    generateTags: tagGenerationMutation.mutate,
    isProcessing: isProcessing || tagGenerationMutation.isPending,
    tagGenerationError: tagGenerationMutation.error,
    tagGenerationData: tagGenerationMutation.data,
  };
}

export function useProductAnalysis(options: UseAIOptions = {}) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const productAnalysisMutation = useMutation({
    mutationFn: async ({
      imageUrl,
    }: {
      imageUrl: string;
    }) => {
      setIsProcessing(true);
      const response = await apiRequest('POST', '/api/ai/analyze-product', {
        imageUrl,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to analyze product');
      }
      
      return data;
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      toast({
        title: 'Product analyzed',
        description: 'Product details extracted successfully',
      });
      
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
    onError: (error: Error) => {
      setIsProcessing(false);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      
      if (options.onError) {
        options.onError(error);
      }
    },
  });

  return {
    analyzeProduct: productAnalysisMutation.mutate,
    isProcessing: isProcessing || productAnalysisMutation.isPending,
    productAnalysisError: productAnalysisMutation.error,
    productAnalysisData: productAnalysisMutation.data,
  };
}