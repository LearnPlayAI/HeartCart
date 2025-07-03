/**
 * Promotion Validation Service
 * Validates cart items against promotion rules and provides user guidance
 */

import { CartItemWithDiscounts } from '@/types/cart.types';

export interface PromotionRule {
  type: 'minimum_quantity_same_promotion' | 'minimum_order_value' | 'buy_x_get_y' | 'category_mix' | 'none';
  minimumQuantity?: number;
  minimumValue?: number;
  buyQuantity?: number;
  getQuantity?: number;
  getDiscountType?: 'free' | 'percentage' | 'fixed';
  getDiscountValue?: number;
  applyToLowestPrice?: boolean;
  minimumFromEach?: number;
  totalMinimum?: number;
  requiredCategories?: number[];
  specialPricing?: {
    type: 'fixed_total' | 'extra_discount' | 'fixed_per_item';
    value: number;
  };
}

export interface Promotion {
  id: number;
  promotionName: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  promotionType: string;
  discountValue?: number;
  minimumOrderValue?: number;
  rules?: PromotionRule;
}

export interface PromotionValidationResult {
  isValid: boolean;
  canProceedToCheckout: boolean;
  messages: PromotionMessage[];
  suggestions: PromotionSuggestion[];
}

export interface PromotionMessage {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  promotionName: string;
  promotionId: number;
}

export interface PromotionSuggestion {
  type: 'add_more' | 'remove_items' | 'change_quantity' | 'select_category';
  message: string;
  actionText: string;
  data?: any;
}

export class PromotionValidator {
  /**
   * Validates cart items against all applicable promotions
   */
  static validateCart(
    cartItems: CartItemWithDiscounts[], 
    activePromotions: Promotion[]
  ): PromotionValidationResult {
    const messages: PromotionMessage[] = [];
    const suggestions: PromotionSuggestion[] = [];
    let canProceedToCheckout = true;

    // Group cart items by promotion
    const promotionGroups = this.groupItemsByPromotion(cartItems);

    // Validate each promotion group
    for (const [promotionId, items] of Array.from(promotionGroups.entries())) {
      const promotion = activePromotions.find(p => p.id === promotionId);
      if (!promotion || !promotion.rules) continue;

      const validationResult = this.validatePromotionGroup(promotion, items);
      
      messages.push(...validationResult.messages);
      suggestions.push(...validationResult.suggestions);
      
      if (!validationResult.isValid && !validationResult.canProceedToCheckout) {
        canProceedToCheckout = false;
      }
    }

    return {
      isValid: messages.every(m => m.type !== 'error'),
      canProceedToCheckout,
      messages,
      suggestions
    };
  }

  /**
   * Validates a specific promotion group
   */
  private static validatePromotionGroup(
    promotion: Promotion, 
    items: CartItemWithDiscounts[]
  ): PromotionValidationResult {
    const messages: PromotionMessage[] = [];
    const suggestions: PromotionSuggestion[] = [];
    
    if (!promotion.rules || promotion.rules.type === 'none') {
      return { isValid: true, canProceedToCheckout: true, messages, suggestions };
    }

    const rule = promotion.rules;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum, item) => {
      const price = typeof item.itemPrice === 'string' ? parseFloat(item.itemPrice) : (item.itemPrice || 0);
      return sum + (item.quantity * price);
    }, 0);

    switch (rule.type) {
      case 'minimum_quantity_same_promotion':
        return this.validateMinimumQuantity(promotion, items, totalQuantity, rule);
      
      case 'minimum_order_value':
        return this.validateMinimumOrderValue(promotion, totalValue, rule);
      
      case 'buy_x_get_y':
        return this.validateBuyXGetY(promotion, items, totalQuantity, rule);
      
      case 'category_mix':
        return this.validateCategoryMix(promotion, items, rule);
      
      default:
        return { isValid: true, canProceedToCheckout: true, messages, suggestions };
    }
  }

  /**
   * Validates minimum quantity rule
   */
  private static validateMinimumQuantity(
    promotion: Promotion,
    items: CartItemWithDiscounts[],
    totalQuantity: number,
    rule: PromotionRule
  ): PromotionValidationResult {
    const messages: PromotionMessage[] = [];
    const suggestions: PromotionSuggestion[] = [];
    const minQuantity = rule.minimumQuantity || 2;

    if (totalQuantity < minQuantity) {
      const needed = minQuantity - totalQuantity;
      messages.push({
        type: 'warning',
        message: `Add ${needed} more item${needed > 1 ? 's' : ''} to qualify for "${promotion.promotionName}"`,
        promotionName: promotion.promotionName,
        promotionId: promotion.id
      });

      suggestions.push({
        type: 'add_more',
        message: `You need ${minQuantity} items total for this promotion (currently have ${totalQuantity})`,
        actionText: `Add ${needed} More Item${needed > 1 ? 's' : ''}`,
        data: { promotionId: promotion.id, needed, minQuantity }
      });

      return { 
        isValid: false, 
        canProceedToCheckout: false, 
        messages, 
        suggestions 
      };
    }

    messages.push({
      type: 'success',
      message: `"${promotion.promotionName}" promotion applied! ${totalQuantity} items qualify.`,
      promotionName: promotion.promotionName,
      promotionId: promotion.id
    });

    return { isValid: true, canProceedToCheckout: true, messages, suggestions };
  }

  /**
   * Validates minimum order value rule
   */
  private static validateMinimumOrderValue(
    promotion: Promotion,
    totalValue: number,
    rule: PromotionRule
  ): PromotionValidationResult {
    const messages: PromotionMessage[] = [];
    const suggestions: PromotionSuggestion[] = [];
    const minValue = rule.minimumValue || 100;

    if (totalValue < minValue) {
      const needed = minValue - totalValue;
      messages.push({
        type: 'warning',
        message: `Spend R${needed.toFixed(2)} more to qualify for "${promotion.promotionName}"`,
        promotionName: promotion.promotionName,
        promotionId: promotion.id
      });

      suggestions.push({
        type: 'add_more',
        message: `Minimum order value R${minValue.toFixed(2)} required (currently R${totalValue.toFixed(2)})`,
        actionText: `Add R${needed.toFixed(2)} More`,
        data: { promotionId: promotion.id, needed: needed.toFixed(2), minValue: minValue.toFixed(2) }
      });

      return { 
        isValid: false, 
        canProceedToCheckout: true, // Can still checkout, just won't get discount
        messages, 
        suggestions 
      };
    }

    messages.push({
      type: 'success',
      message: `"${promotion.promotionName}" promotion applied! Order value: R${totalValue.toFixed(2)}`,
      promotionName: promotion.promotionName,
      promotionId: promotion.id
    });

    return { isValid: true, canProceedToCheckout: true, messages, suggestions };
  }

  /**
   * Validates buy X get Y rule
   */
  private static validateBuyXGetY(
    promotion: Promotion,
    items: CartItemWithDiscounts[],
    totalQuantity: number,
    rule: PromotionRule
  ): PromotionValidationResult {
    const messages: PromotionMessage[] = [];
    const suggestions: PromotionSuggestion[] = [];
    const buyQuantity = rule.buyQuantity || 2;
    const getQuantity = rule.getQuantity || 1;
    const totalRequired = buyQuantity + getQuantity;

    if (totalQuantity < totalRequired) {
      const needed = totalRequired - totalQuantity;
      messages.push({
        type: 'warning',
        message: `Add ${needed} more item${needed > 1 ? 's' : ''} to qualify for "Buy ${buyQuantity} Get ${getQuantity}" promotion`,
        promotionName: promotion.promotionName,
        promotionId: promotion.id
      });

      suggestions.push({
        type: 'add_more',
        message: `You need ${totalRequired} items total for Buy ${buyQuantity} Get ${getQuantity} (currently have ${totalQuantity})`,
        actionText: `Add ${needed} More Item${needed > 1 ? 's' : ''}`,
        data: { promotionId: promotion.id, needed, totalRequired, buyQuantity, getQuantity }
      });

      return { 
        isValid: false, 
        canProceedToCheckout: false, 
        messages, 
        suggestions 
      };
    }

    const completeSets = Math.floor(totalQuantity / totalRequired);
    const freeItems = completeSets * getQuantity;
    
    messages.push({
      type: 'success',
      message: `"${promotion.promotionName}" applied! You get ${freeItems} free item${freeItems > 1 ? 's' : ''}`,
      promotionName: promotion.promotionName,
      promotionId: promotion.id
    });

    return { isValid: true, canProceedToCheckout: true, messages, suggestions };
  }

  /**
   * Validates category mix rule
   */
  private static validateCategoryMix(
    promotion: Promotion,
    items: CartItemWithDiscounts[],
    rule: PromotionRule
  ): PromotionValidationResult {
    const messages: PromotionMessage[] = [];
    const suggestions: PromotionSuggestion[] = [];
    const minimumFromEach = rule.minimumFromEach || 1;
    const totalMinimum = rule.totalMinimum || 2;
    const requiredCategories = rule.requiredCategories || [];

    // This would need product category information to fully validate
    // For now, return a placeholder validation
    messages.push({
      type: 'info',
      message: `"${promotion.promotionName}" requires items from multiple categories`,
      promotionName: promotion.promotionName,
      promotionId: promotion.id
    });

    return { isValid: true, canProceedToCheckout: true, messages, suggestions };
  }

  /**
   * Groups cart items by their promotion ID
   */
  private static groupItemsByPromotion(cartItems: CartItemWithDiscounts[]): Map<number, CartItemWithDiscounts[]> {
    const groups = new Map<number, CartItemWithDiscounts[]>();

    for (const item of cartItems) {
      // Check for promotion info in various places
      const promotionId = 
        (item as any).promotionId || 
        (item.product as any)?.promotionId || 
        (item as any).product?.promotionInfo?.promotionId;
      
      if (promotionId) {
        if (!groups.has(promotionId)) {
          groups.set(promotionId, []);
        }
        groups.get(promotionId)!.push(item);
      }
    }

    return groups;
  }

  /**
   * Generates user-friendly tips for meeting promotion requirements
   */
  static generatePromotionTips(
    promotions: Promotion[],
    cartItems: CartItemWithDiscounts[]
  ): string[] {
    const tips: string[] = [];

    for (const promotion of promotions) {
      if (!promotion.rules || promotion.rules.type === 'none') continue;

      const rule = promotion.rules;
      
      switch (rule.type) {
        case 'minimum_quantity_same_promotion':
          const minQty = rule.minimumQuantity || 2;
          tips.push(`💡 Add ${minQty} items from "${promotion.promotionName}" to get the special pricing!`);
          break;
        
        case 'buy_x_get_y':
          const buyQty = rule.buyQuantity || 2;
          const getQty = rule.getQuantity || 1;
          tips.push(`💡 Buy ${buyQty} items and get ${getQty} free in "${promotion.promotionName}"!`);
          break;
        
        case 'minimum_order_value':
          const minValue = rule.minimumValue || 100;
          tips.push(`💡 Spend R${minValue.toFixed(2)} or more to qualify for "${promotion.promotionName}"!`);
          break;
      }
    }

    return tips;
  }
}