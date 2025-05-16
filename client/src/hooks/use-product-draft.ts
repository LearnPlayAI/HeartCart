
import { useState } from 'react';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

export function useProductDraft() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const createDraftFromProduct = async (productId: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', `/api/product-drafts/from-product/${productId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create draft');
      }
      
      toast({
        title: 'Success',
        description: 'Product draft created successfully',
      });
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create draft';
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createDraftFromProduct,
    isLoading,
    error
  };
}

