/**
 * DEPRECATED HOOK - NOT IN USE
 * 
 * This hook has been removed as part of the centralized attribute system refactoring.
 * Product attributes no longer affect pricing anywhere in the application.
 */

import { useToast } from "@/hooks/use-toast";

// Define empty interface for backwards compatibility
export interface PriceAdjustmentResult {
  adjustments: any[];
  totalAdjustment: number;
}

/**
 * @deprecated This hook has been removed as part of the centralized attribute system refactoring.
 */
export function useAttributeDiscounts() {
  const { toast } = useToast();

  // Return stub implementation with empty results
  return {
    // Queries - all return empty arrays
    discountRules: [],
    discountRulesLoading: false,
    refetchDiscountRules: () => Promise.resolve(),
    useProductDiscountRules: () => ({ data: [] }),
    useCategoryDiscountRules: () => ({ data: [] }),
    useCatalogDiscountRules: () => ({ data: [] }),
    useAttributeDiscountRules: () => ({ data: [] }),
    
    // Functions - all now have no effect
    calculatePriceAdjustments: async () => {
      console.warn('Price adjustments based on attributes have been removed from the application.');
      return { adjustments: [], totalAdjustment: 0 };
    },
    
    // Mutations - all now have no effect and return success responses
    createDiscountRule: { 
      mutate: () => { 
        toast({
          title: 'Feature Removed',
          description: 'Attribute pricing adjustments are no longer supported in the application.',
          variant: 'destructive',
        });
      },
      isPending: false
    },
    updateDiscountRule: {
      mutate: () => {
        toast({
          title: 'Feature Removed',
          description: 'Attribute pricing adjustments are no longer supported in the application.',
          variant: 'destructive',
        });
      },
      isPending: false
    },
    deleteDiscountRule: {
      mutate: () => {
        toast({
          title: 'Feature Removed',
          description: 'Attribute pricing adjustments are no longer supported in the application.',
          variant: 'destructive',
        });
      },
      isPending: false
    },
    
    // Error state
    error: null,
  };
}