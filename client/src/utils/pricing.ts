/**
 * Centralized pricing calculation utility
 * Ensures consistent pricing logic across all product displays and cart operations
 */

export interface PricingInfo {
  displayPrice: number;
  originalPrice: number;
  discountPercentage: number;
  hasDiscount: boolean;
  promotionPrice?: number;
  salePrice?: number;
  extraPromotionalDiscount?: number; // Extra discount percentage from sale price to promotional price
}

export interface PromotionInfo {
  promotionName: string;
  promotionDiscount: number;
  promotionDiscountType: string;
  promotionEndDate: string;
  promotionalPrice?: number | null;
}

/**
 * Calculate the final pricing for a product considering all discount layers
 * Priority: Promotional Price > Sale Price > Base Price
 */
export function calculateProductPricing(
  basePrice: number,
  salePrice?: number | null,
  promotionInfo?: PromotionInfo
): PricingInfo {
  const originalPrice = basePrice;
  let finalPrice = basePrice;
  let totalDiscountPercentage = 0;
  let extraPromotionalDiscount = 0;

  // Apply sale price if available
  if (salePrice && salePrice < basePrice) {
    finalPrice = salePrice;
    totalDiscountPercentage = ((basePrice - salePrice) / basePrice) * 100;
  }

  // Apply promotional pricing
  if (promotionInfo) {
    const priceBeforePromotion = finalPrice; // This could be base price or sale price
    
    // Priority 1: Use direct promotional price if available
    if (promotionInfo.promotionalPrice && promotionInfo.promotionalPrice > 0) {
      finalPrice = promotionInfo.promotionalPrice;
      totalDiscountPercentage = ((basePrice - finalPrice) / basePrice) * 100;
      
      // Calculate extra promotional discount from the price before promotion
      if (priceBeforePromotion > finalPrice) {
        extraPromotionalDiscount = ((priceBeforePromotion - finalPrice) / priceBeforePromotion) * 100;
      }
    } else {
      // Priority 2: Apply promotional discount calculation
      const promotionDiscount = Number(promotionInfo.promotionDiscount) || 0;
      
      if (promotionInfo.promotionDiscountType === 'percentage') {
        // Apply percentage discount to the current price (base or sale)
        const discountAmount = finalPrice * (promotionDiscount / 100);
        finalPrice = finalPrice - discountAmount;
        extraPromotionalDiscount = promotionDiscount;
        
        // Calculate total discount from original base price
        totalDiscountPercentage = ((basePrice - finalPrice) / basePrice) * 100;
      } else if (promotionInfo.promotionDiscountType === 'fixed') {
        // Apply fixed amount discount
        const newPrice = Math.max(0, finalPrice - promotionDiscount);
        if (finalPrice > newPrice) {
          extraPromotionalDiscount = ((finalPrice - newPrice) / finalPrice) * 100;
        }
        finalPrice = newPrice;
        totalDiscountPercentage = ((basePrice - finalPrice) / basePrice) * 100;
      }
    }
  }

  return {
    displayPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimal places
    originalPrice: basePrice,
    discountPercentage: Math.round(totalDiscountPercentage),
    hasDiscount: finalPrice < basePrice,
    promotionPrice: promotionInfo ? finalPrice : undefined,
    salePrice: salePrice || undefined,
    extraPromotionalDiscount: Math.round(extraPromotionalDiscount)
  };
}

/**
 * Get the cart price for a product (what should be added to cart)
 */
export function getCartPrice(
  basePrice: number,
  salePrice?: number | null,
  promotionInfo?: PromotionInfo
): number {
  const pricing = calculateProductPricing(basePrice, salePrice, promotionInfo);
  return pricing.displayPrice;
}

/**
 * Check if a promotion is still active
 */
export function isPromotionActive(promotionEndDate: string): boolean {
  const now = new Date().getTime();
  const endDate = new Date(promotionEndDate).getTime();
  return endDate > now;
}

/**
 * Calculate time remaining for a promotion
 */
export function getPromotionTimeRemaining(endDate: string) {
  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const timeLeft = end - now;
  
  if (timeLeft <= 0) return null;
  
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes };
}

/**
 * Generate promotional badge text in "EXTRA X% OFF" format
 */
export function getPromotionalBadgeText(promotionInfo: PromotionInfo): string {
  if (!promotionInfo) return "";
  
  const discount = Number(promotionInfo.promotionDiscount) || 0;
  
  if (promotionInfo.promotionDiscountType === 'percentage') {
    return `EXTRA ${Math.round(discount)}% OFF`;
  } else if (promotionInfo.promotionDiscountType === 'fixed') {
    return `EXTRA R${Math.round(discount)} OFF`;
  }
  
  // Fallback for promotional pricing without explicit discount type
  if (discount > 0) {
    return `EXTRA ${Math.round(discount)}% OFF`;
  }
  
  return "SPECIAL OFFER";
}