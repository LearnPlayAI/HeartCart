/**
 * Hook for validating cart items against promotion rules
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { PromotionValidator, type PromotionValidationResult, type Promotion } from '@/lib/promotion-validation';
import { CartItemWithDiscounts } from '@/types/cart.types';

interface UsePromotionValidationProps {
  cartItems: CartItemWithDiscounts[];
  enabled?: boolean;
}

export function usePromotionValidation({ cartItems, enabled = true }: UsePromotionValidationProps) {
  // Fetch active promotions
  const { data: promotionsResponse, isLoading } = useQuery<StandardApiResponse<Promotion[]>>({
    queryKey: ['/api/promotions/active-with-products'],
    enabled,
  });

  const activePromotions = promotionsResponse?.success ? promotionsResponse.data : [];

  // Validate cart against promotions
  const validationResult: PromotionValidationResult = useMemo(() => {
    if (!enabled || isLoading || !activePromotions.length) {
      return {
        isValid: true,
        canProceedToCheckout: true,
        messages: [],
        suggestions: []
      };
    }

    return PromotionValidator.validateCart(cartItems, activePromotions);
  }, [cartItems, activePromotions, enabled, isLoading]);

  // Generate promotion tips
  const promotionTips = useMemo(() => {
    if (!enabled || isLoading || !activePromotions.length) {
      return [];
    }

    return PromotionValidator.generatePromotionTips(activePromotions, cartItems);
  }, [activePromotions, cartItems, enabled, isLoading]);

  // Get promotions that apply to current cart items
  const applicablePromotions = useMemo(() => {
    if (!enabled || isLoading || !activePromotions.length) {
      return [];
    }

    const cartProductIds = cartItems.map(item => item.productId);
    return activePromotions.filter(promotion => {
      // For now, assume all active promotions are applicable
      // This could be enhanced to check which products are actually in each promotion
      return promotion.isActive;
    });
  }, [activePromotions, cartItems, enabled, isLoading]);

  return {
    validationResult,
    promotionTips,
    applicablePromotions,
    isLoading,
    hasPromotions: activePromotions.length > 0
  };
}