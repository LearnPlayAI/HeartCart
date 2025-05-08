import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AttributeDiscountRule {
  id: number;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  attributeId: number;
  optionId: number | null;
  productId: number | null;
  categoryId: number | null;
  catalogId: number | null;
  minQuantity: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PriceAdjustment {
  ruleId: number;
  ruleName: string;
  discountType: string;
  discountValue: number;
  appliedValue: number;
}

interface PriceAdjustmentResult {
  adjustments: PriceAdjustment[];
  totalAdjustment: number;
}

export function useAttributeDiscounts() {
  const { toast } = useToast();
  const [error, setError] = useState<Error | null>(null);

  // Get all discount rules
  const {
    data: discountRules,
    isLoading: discountRulesLoading,
    refetch: refetchDiscountRules,
  } = useQuery({
    queryKey: ['/api/attribute-discount-rules'],
    queryFn: async () => {
      const response = await fetch('/api/attribute-discount-rules');
      if (!response.ok) {
        throw new Error('Failed to fetch attribute discount rules');
      }
      return response.json() as Promise<AttributeDiscountRule[]>;
    },
  });

  // Get discount rules by product
  const useProductDiscountRules = (productId: number | undefined) => {
    return useQuery({
      queryKey: ['/api/attribute-discount-rules/product', productId],
      queryFn: async () => {
        if (!productId) return [];
        const response = await fetch(`/api/attribute-discount-rules/product/${productId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch product discount rules');
        }
        return response.json() as Promise<AttributeDiscountRule[]>;
      },
      enabled: !!productId,
    });
  };

  // Get discount rules by category
  const useCategoryDiscountRules = (categoryId: number | undefined) => {
    return useQuery({
      queryKey: ['/api/attribute-discount-rules/category', categoryId],
      queryFn: async () => {
        if (!categoryId) return [];
        const response = await fetch(`/api/attribute-discount-rules/category/${categoryId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch category discount rules');
        }
        return response.json() as Promise<AttributeDiscountRule[]>;
      },
      enabled: !!categoryId,
    });
  };

  // Get discount rules by catalog
  const useCatalogDiscountRules = (catalogId: number | undefined) => {
    return useQuery({
      queryKey: ['/api/attribute-discount-rules/catalog', catalogId],
      queryFn: async () => {
        if (!catalogId) return [];
        const response = await fetch(`/api/attribute-discount-rules/catalog/${catalogId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch catalog discount rules');
        }
        return response.json() as Promise<AttributeDiscountRule[]>;
      },
      enabled: !!catalogId,
    });
  };

  // Get discount rules by attribute
  const useAttributeDiscountRules = (attributeId: number | undefined) => {
    return useQuery({
      queryKey: ['/api/attribute-discount-rules/attribute', attributeId],
      queryFn: async () => {
        if (!attributeId) return [];
        const response = await fetch(`/api/attribute-discount-rules/attribute/${attributeId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch attribute-specific discount rules');
        }
        return response.json() as Promise<AttributeDiscountRule[]>;
      },
      enabled: !!attributeId,
    });
  };

  // Calculate price adjustments
  const calculatePriceAdjustments = async (
    productId: number,
    selectedAttributes: Record<string, any>,
    quantity: number = 1
  ): Promise<PriceAdjustmentResult> => {
    try {
      const response = await apiRequest('POST', '/api/attribute-discount-rules/calculate', {
        productId,
        selectedAttributes,
        quantity,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate price adjustments');
      }

      return await response.json();
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(err?.message || 'Unknown error');
      setError(error);
      
      toast({
        title: 'Price Calculation Failed',
        description: error.message,
        variant: 'destructive',
      });
      
      return { adjustments: [], totalAdjustment: 0 };
    }
  };

  // Create discount rule
  const createDiscountRule = useMutation({
    mutationFn: async (rule: Omit<AttributeDiscountRule, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/attribute-discount-rules', rule);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.error || 'Failed to create discount rule');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attribute-discount-rules'] });
      toast({
        title: 'Discount Rule Created',
        description: 'The attribute discount rule has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Create Discount Rule',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update discount rule
  const updateDiscountRule = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<Omit<AttributeDiscountRule, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const response = await apiRequest('PUT', `/api/attribute-discount-rules/${id}`, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.error || 'Failed to update discount rule');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attribute-discount-rules'] });
      toast({
        title: 'Discount Rule Updated',
        description: 'The attribute discount rule has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Update Discount Rule',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete discount rule
  const deleteDiscountRule = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/attribute-discount-rules/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.error || 'Failed to delete discount rule');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attribute-discount-rules'] });
      toast({
        title: 'Discount Rule Deleted',
        description: 'The attribute discount rule has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Delete Discount Rule',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    // Queries
    discountRules,
    discountRulesLoading,
    refetchDiscountRules,
    useProductDiscountRules,
    useCategoryDiscountRules,
    useCatalogDiscountRules,
    useAttributeDiscountRules,
    
    // Functions
    calculatePriceAdjustments,
    
    // Mutations
    createDiscountRule,
    updateDiscountRule,
    deleteDiscountRule,
    
    // Error state
    error,
  };
}