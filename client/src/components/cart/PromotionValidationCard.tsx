/**
 * Promotion Validation Card Component
 * Displays promotion validation messages, tips, and requirements in the cart
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, ShoppingCart, Gift, ArrowRight } from 'lucide-react';
import { CartItemWithDiscounts } from '@/types/cart.types';

interface PromotionData {
  id: number;
  promotionName: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  promotionType: string;
  discountValue?: number;
  minimumOrderValue?: number;
  rules?: {
    type: string;
    minimumQuantity?: number;
    minimumValue?: number;
    buyQuantity?: number;
    getQuantity?: number;
  };
}

interface PromotionValidationCardProps {
  cartItems: CartItemWithDiscounts[];
}

export default function PromotionValidationCard({ cartItems }: PromotionValidationCardProps) {
  const [validationMessages, setValidationMessages] = useState<Array<{
    type: 'success' | 'warning' | 'error' | 'info';
    promotionName: string;
    message: string;
  }>>([]);

  // Fetch active promotions
  const { data: promotionsResponse, isLoading } = useQuery({
    queryKey: ['/api/promotions/active-with-products'],
    enabled: cartItems.length > 0,
    refetchOnWindowFocus: false,
  });

  const activePromotions = promotionsResponse?.success ? promotionsResponse.data : [];

  useEffect(() => {
    if (!cartItems.length || !activePromotions.length) {
      setValidationMessages([]);
      return;
    }

    const messages: Array<{
      type: 'success' | 'warning' | 'error' | 'info';
      promotionName: string;
      message: string;
    }> = [];

    // Group cart items by promotion
    const promotionGroups = new Map<number, CartItemWithDiscounts[]>();
    cartItems.forEach(item => {
      const product = (item as any).product;
      const promotionId = product?.promotionId || (product as any)?.promotionInfo?.promotionId;
      
      if (promotionId) {
        if (!promotionGroups.has(promotionId)) {
          promotionGroups.set(promotionId, []);
        }
        promotionGroups.get(promotionId)!.push(item);
      }
    });

    // Validate each promotion group
    for (const [promotionId, items] of Array.from(promotionGroups.entries())) {
      const promotion = activePromotions.find((p: PromotionData) => p.id === promotionId);
      if (!promotion) continue;

      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = items.reduce((sum, item) => {
        const price = Number(item.itemPrice) || 0;
        return sum + (price * item.quantity);
      }, 0);

      // Validate based on promotion type
      if (promotion.promotionType === 'bogo' && promotion.rules) {
        const rule = promotion.rules;
        if (rule.type === 'minimum_quantity_same_promotion' && rule.minimumQuantity) {
          if (totalQuantity >= rule.minimumQuantity) {
            messages.push({
              type: 'success',
              promotionName: promotion.promotionName,
              message: `Great! You qualify for "${promotion.promotionName}" with ${totalQuantity} items.`
            });
          } else {
            const needed = rule.minimumQuantity - totalQuantity;
            messages.push({
              type: 'warning',
              promotionName: promotion.promotionName,
              message: `Add ${needed} more item${needed > 1 ? 's' : ''} from this promotion to qualify for "${promotion.promotionName}".`
            });
          }
        }

        if (rule.type === 'buy_x_get_y' && rule.buyQuantity) {
          const setsQualified = Math.floor(totalQuantity / rule.buyQuantity);
          if (setsQualified > 0) {
            messages.push({
              type: 'success',
              promotionName: promotion.promotionName,
              message: `You qualify for ${setsQualified} free item${setsQualified > 1 ? 's' : ''} with "${promotion.promotionName}".`
            });
          } else {
            const needed = rule.buyQuantity - totalQuantity;
            messages.push({
              type: 'info',
              promotionName: promotion.promotionName,
              message: `Add ${needed} more item${needed > 1 ? 's' : ''} to get a free item with "${promotion.promotionName}".`
            });
          }
        }
      }

      // Check minimum order value
      if (promotion.minimumOrderValue && totalValue < promotion.minimumOrderValue) {
        const needed = promotion.minimumOrderValue - totalValue;
        messages.push({
          type: 'warning',
          promotionName: promotion.promotionName,
          message: `Spend R${needed.toFixed(2)} more to qualify for "${promotion.promotionName}".`
        });
      }
    }

    setValidationMessages(messages);
  }, [cartItems, activePromotions]);

  if (isLoading || !cartItems.length || !validationMessages.length) {
    return null;
  }

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Gift className="h-4 w-4 text-blue-600" />;
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="h-5 w-5 text-pink-600" />
          Promotion Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {validationMessages.map((message, index) => (
          <Alert key={index} className={getMessageColor(message.type)}>
            <div className="flex items-start gap-3">
              {getMessageIcon(message.type)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {message.promotionName}
                  </Badge>
                </div>
                <AlertDescription className="text-sm text-gray-700">
                  {message.message}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ))}
        
        {validationMessages.some(m => m.type === 'warning' || m.type === 'info') && (
          <>
            <Separator className="my-3" />
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <ArrowRight className="h-3 w-3" />
              <span>Continue shopping to unlock more savings!</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}