/**
 * Promotion Rules Service
 * Handles validation and processing of flexible promotion rules
 */

// Rule type definitions
export interface PromotionRule {
  type: 'minimum_quantity_same_promotion' | 'minimum_order_value' | 'buy_x_get_y' | 'category_mix';
  [key: string]: any;
}

export interface MinimumQuantityRule extends PromotionRule {
  type: 'minimum_quantity_same_promotion';
  minimumQuantity: number;
  specialPricing?: {
    type: 'fixed_total' | 'extra_discount' | 'fixed_per_item';
    value: number;
  };
}

export interface CartItem {
  productId: number;
  quantity: number;
  price: number;
  promotionId?: number;
  promotionName?: string;
}

export interface RuleValidationResult {
  isValid: boolean;
  message?: string;
  violationType?: 'insufficient_quantity' | 'wrong_promotion' | 'minimum_not_met';
  requiredAction?: string;
  specialPricing?: {
    newTotal?: number;
    discount?: number;
    perItemPrice?: number;
  };
}

export class PromotionRulesService {
  
  /**
   * Validates cart items against all active promotion rules
   */
  static validateCart(cartItems: CartItem[], activePromotions: any[]): RuleValidationResult[] {
    const results: RuleValidationResult[] = [];
    
    for (const promotion of activePromotions) {
      if (promotion.rules) {
        const result = this.validatePromotionRule(cartItems, promotion);
        if (!result.isValid) {
          results.push(result);
        }
      }
    }
    
    return results;
  }
  
  /**
   * Validates cart items against a specific promotion rule
   */
  static validatePromotionRule(cartItems: CartItem[], promotion: any): RuleValidationResult {
    if (!promotion.rules) {
      return { isValid: true };
    }
    
    const rule = promotion.rules as PromotionRule;
    
    switch (rule.type) {
      case 'minimum_quantity_same_promotion':
        return this.validateMinimumQuantityRule(cartItems, promotion, rule as MinimumQuantityRule);
      
      case 'minimum_order_value':
        return this.validateMinimumOrderValue(cartItems, promotion, rule);
      
      default:
        return { isValid: true };
    }
  }
  
  /**
   * Validates minimum quantity rule for same promotion items
   */
  private static validateMinimumQuantityRule(
    cartItems: CartItem[], 
    promotion: any, 
    rule: MinimumQuantityRule
  ): RuleValidationResult {
    
    // Find cart items that belong to this promotion
    const promotionItems = cartItems.filter(item => item.promotionId === promotion.id);
    
    // Calculate total quantity for this promotion
    const totalQuantity = promotionItems.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalQuantity < rule.minimumQuantity) {
      const needed = rule.minimumQuantity - totalQuantity;
      return {
        isValid: false,
        message: `Add ${needed} more item${needed > 1 ? 's' : ''} from "${promotion.promotionName}" to unlock special pricing`,
        violationType: 'insufficient_quantity',
        requiredAction: `Add ${needed} more items from this promotion`
      };
    }
    
    // Rule is satisfied - calculate special pricing if defined
    if (rule.specialPricing) {
      const specialPricing = this.calculateSpecialPricing(promotionItems, rule.specialPricing);
      return {
        isValid: true,
        specialPricing
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Validates minimum order value rule
   */
  private static validateMinimumOrderValue(
    cartItems: CartItem[], 
    promotion: any, 
    rule: any
  ): RuleValidationResult {
    
    const totalValue = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const minimumValue = promotion.minimumOrderValue || rule.minimumValue || 0;
    
    if (totalValue < minimumValue) {
      const needed = minimumValue - totalValue;
      return {
        isValid: false,
        message: `Add R${needed.toFixed(2)} more to your order to qualify for this promotion`,
        violationType: 'minimum_not_met',
        requiredAction: `Add R${needed.toFixed(2)} more to cart`
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Calculates special pricing when rules are met
   */
  private static calculateSpecialPricing(items: CartItem[], pricingRule: any) {
    const currentTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    switch (pricingRule.type) {
      case 'fixed_total':
        return {
          newTotal: pricingRule.value,
          discount: currentTotal - pricingRule.value
        };
      
      case 'extra_discount':
        const discountAmount = currentTotal * (pricingRule.value / 100);
        return {
          newTotal: currentTotal - discountAmount,
          discount: discountAmount
        };
      
      case 'fixed_per_item':
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        return {
          newTotal: pricingRule.value * totalQuantity,
          perItemPrice: pricingRule.value,
          discount: currentTotal - (pricingRule.value * totalQuantity)
        };
      
      default:
        return {};
    }
  }
  
  /**
   * Gets user-friendly message for cart with rule violations
   */
  static getCartViolationMessage(violations: RuleValidationResult[]): string {
    if (violations.length === 0) return '';
    
    if (violations.length === 1) {
      return violations[0].message || 'Please check your cart items';
    }
    
    return `You have ${violations.length} promotion requirements to meet. Check individual promotions for details.`;
  }
  
  /**
   * Checks if cart can proceed to checkout (no rule violations)
   */
  static canProceedToCheckout(cartItems: CartItem[], activePromotions: any[]): boolean {
    const violations = this.validateCart(cartItems, activePromotions);
    return violations.length === 0;
  }
}