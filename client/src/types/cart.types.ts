import { CartItem } from "@shared/schema";

/**
 * Represents a price adjustment from an attribute discount rule.
 * This is used when calculating product price adjustments based on selected attributes.
 */
export interface PriceAdjustment {
  ruleId: number;
  ruleName: string;
  discountType: string;   // 'percentage' or 'fixed'
  discountValue: number;  // The original discount value (percentage or amount)
  appliedValue: number;   // The calculated monetary value after applying the discount
}

/**
 * Aggregate result of all price adjustments applied to a product or cart item.
 */
export interface PriceAdjustmentResult {
  adjustments: PriceAdjustment[];
  totalAdjustment: number;
}

/**
 * Extended CartItem type that includes discount-related fields.
 * This is the fully serialized version including all discount calculations.
 * 
 * Implementation Strategy:
 * - Discount data is persisted in the database along with the cart item
 * - All price calculations are performed on the server-side
 * - The client displays the final prices and breakdown of discounts
 */
export interface CartItemWithDiscounts extends CartItem {
  discountData: PriceAdjustment[] | null;
  totalDiscount: number;
  itemPrice: number | null;
  
  // Helper properties (calculated client-side)
  finalPrice?: number;      // Calculated final price after all adjustments and discounts
  originalPrice?: number;   // The original product price before any adjustments or discounts
}

/**
 * Cart summary information including count, subtotal, and discount totals.
 */
export interface CartSummary {
  itemCount: number;
  subtotal: number;
  totalDiscount: number;
  finalTotal: number;
}