/**
 * Server-side Promotion Validation Service
 * Validates cart items against active promotion requirements
 */

import { storage } from './storage';
import { logger } from './logger';

interface CartItem {
  productId: number;
  quantity: number;
  product?: {
    id: number;
    name: string;
    price: number;
    salePrice?: number;
    categoryIds?: number[];
  };
}

interface ValidationResult {
  isValid: boolean;
  canProceedToCheckout: boolean;
  errors: string[];
  warnings: string[];
  blockedPromotions: Array<{
    promotionId: number;
    promotionName: string;
    reason: string;
    required: number;
    current: number;
  }>;
}

export class PromotionValidationService {
  /**
   * Validates cart items against all active promotions
   */
  static async validateCartForCheckout(cartItems: CartItem[]): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      canProceedToCheckout: true,
      errors: [],
      warnings: [],
      blockedPromotions: []
    };

    try {
      // Get all active promotions 
      const activePromotions = await storage.getActivePromotions();
      
      if (!activePromotions || activePromotions.length === 0) {
        logger.debug('No active promotions found');
        return result;
      }

      // Get products for each promotion
      const promotionsWithProducts = [];
      for (let i = 0; i < activePromotions.length; i++) {
        const promotion = activePromotions[i];
        const products = await storage.getPromotionProducts(promotion.id);
        promotionsWithProducts.push({
          ...promotion,
          products: products
        });
      }

      // Group cart items by promotion
      const promotionGroups = this.groupCartItemsByPromotion(cartItems, promotionsWithProducts);

      // Validate each promotion group  
      const promotionEntries = Array.from(promotionGroups.entries());
      for (let i = 0; i < promotionEntries.length; i++) {
        const [promotionId, items] = promotionEntries[i];
        const promotion = promotionsWithProducts.find(p => p.id === promotionId);
        if (!promotion) continue;

        const validationResult = this.validatePromotionGroup(promotion, items);
        
        if (!validationResult.isValid) {
          result.isValid = false;
          result.canProceedToCheckout = false;
          
          result.blockedPromotions.push({
            promotionId: promotion.id,
            promotionName: promotion.promotionName,
            reason: validationResult.reason,
            required: validationResult.required,
            current: validationResult.current
          });

          result.errors.push(
            `${promotion.promotionName}: ${validationResult.reason}. ` +
            `You have ${validationResult.current} items but need ${validationResult.required}.`
          );
        }
      }

      logger.info('Cart validation completed', {
        isValid: result.isValid,
        canProceedToCheckout: result.canProceedToCheckout,
        errorCount: result.errors.length,
        blockedPromotions: result.blockedPromotions.length
      });

      return result;

    } catch (error) {
      logger.error('Error validating cart for checkout', error);
      // On error, allow checkout to proceed (fail safe)
      return {
        isValid: true,
        canProceedToCheckout: true,
        errors: [],
        warnings: ['Promotion validation temporarily unavailable'],
        blockedPromotions: []
      };
    }
  }

  /**
   * Groups cart items by their promotion ID
   */
  private static groupCartItemsByPromotion(cartItems: CartItem[], promotions: any[]): Map<number, CartItem[]> {
    const groups = new Map<number, CartItem[]>();

    for (const item of cartItems) {
      // Find which promotion this item belongs to
      const promotion = promotions.find(p => 
        p.products && p.products.some((pp: any) => pp.productId === item.productId)
      );

      if (promotion) {
        if (!groups.has(promotion.id)) {
          groups.set(promotion.id, []);
        }
        groups.get(promotion.id)!.push(item);
      }
    }

    return groups;
  }

  /**
   * Validates a specific promotion group
   */
  private static validatePromotionGroup(promotion: any, items: CartItem[]): {
    isValid: boolean;
    reason: string;
    required: number;
    current: number;
  } {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    // Parse promotion rules
    let rules: any = {};
    if (promotion.rules) {
      try {
        rules = typeof promotion.rules === 'string' ? JSON.parse(promotion.rules) : promotion.rules;
      } catch (e) {
        logger.warn('Failed to parse promotion rules', { promotionId: promotion.id, rules: promotion.rules });
      }
    }

    // Validate based on promotion type
    switch (promotion.promotionType) {
      case 'buy_x_get_y':
        const buyQuantity = rules.buyQuantity || 2;
        if (totalQuantity < buyQuantity) {
          return {
            isValid: false,
            reason: `Requires ${buyQuantity} items`,
            required: buyQuantity,
            current: totalQuantity
          };
        }
        break;

      case 'quantity_discount':
        const minimumQuantity = rules.minimumQuantity || 2;
        if (totalQuantity < minimumQuantity) {
          return {
            isValid: false,
            reason: `Requires ${minimumQuantity} items`,
            required: minimumQuantity,
            current: totalQuantity
          };
        }
        break;

      case 'category_mix':
        // For category mix, need at least one item from required categories
        const requiredCategories = rules.requiredCategories || [];
        if (requiredCategories.length > 0) {
          const itemCategories = new Set();
          items.forEach(item => {
            if (item.product?.categoryIds) {
              item.product.categoryIds.forEach(catId => itemCategories.add(catId));
            }
          });
          
          const hasRequiredCategories = requiredCategories.some((catId: number) => itemCategories.has(catId));
          if (!hasRequiredCategories) {
            return {
              isValid: false,
              reason: 'Requires items from specific categories',
              required: requiredCategories.length,
              current: itemCategories.size
            };
          }
        }
        break;

      default:
        // For unknown promotion types, assume they're valid
        break;
    }

    return {
      isValid: true,
      reason: '',
      required: 0,
      current: totalQuantity
    };
  }
}