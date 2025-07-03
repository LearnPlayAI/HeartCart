/**
 * Promotion Validation Card Component
 * Displays promotion validation messages, tips, and requirements in the cart
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Gift, ArrowRight, XCircle } from 'lucide-react';
import { CartItemWithDiscounts } from '@/types/cart.types';
import { apiRequest } from '@/lib/queryClient';

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

interface PromotionValidationCardProps {
  cartItems: CartItemWithDiscounts[];
  onValidationChange?: (canProceed: boolean) => void;
}

export default function PromotionValidationCard({ cartItems, onValidationChange }: PromotionValidationCardProps) {
  // Validate cart items using server-side validation
  const { data: validationResponse, isLoading } = useQuery({
    queryKey: ['/api/promotions/validate-cart', cartItems.map(item => ({ id: item.productId, quantity: item.quantity }))],
    queryFn: async () => {
      const cartData = cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: item.productId,
          name: (item as any).product?.name || 'Unknown Product',
          price: Number((item as any).product?.price) || 0,
          salePrice: Number((item as any).product?.salePrice) || Number((item as any).product?.price) || 0
        }
      }));

      return await apiRequest('/api/promotions/validate-cart', {
        method: 'POST',
        body: JSON.stringify({ items: cartData }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    enabled: cartItems.length > 0,
    refetchOnWindowFocus: false,
  });

  const validationResult: ValidationResult | null = validationResponse?.success ? validationResponse.data : null;

  // Notify parent component when validation changes
  useEffect(() => {
    if (onValidationChange && validationResult) {
      onValidationChange(validationResult.canProceedToCheckout);
    }
  }, [validationResult, onValidationChange]);

  if (isLoading || !cartItems.length) {
    return null;
  }

  // Don't show the card if validation passes with no messages
  if (validationResult && validationResult.isValid && 
      !validationResult.errors.length && 
      !validationResult.warnings.length && 
      !validationResult.blockedPromotions.length) {
    return null;
  }

  const getMessageIcon = (type: 'success' | 'warning' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Gift className="h-4 w-4 text-blue-600" />;
    }
  };

  const getMessageColor = (type: 'success' | 'warning' | 'error' | 'info') => {
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

  // Prepare validation messages for display
  const validationMessages = [];
  
  if (validationResult) {
    // Add error messages
    validationResult.errors.forEach(error => {
      validationMessages.push({
        type: 'error' as const,
        message: error,
        promotionName: 'Validation Error'
      });
    });
    
    // Add warning messages
    validationResult.warnings.forEach(warning => {
      validationMessages.push({
        type: 'warning' as const,
        message: warning,
        promotionName: 'Promotion Warning'
      });
    });
    
    // Add blocked promotions
    validationResult.blockedPromotions.forEach(blocked => {
      const needed = blocked.required - blocked.current;
      validationMessages.push({
        type: 'error' as const,
        message: `${blocked.reason} Need ${needed} more items to qualify.`,
        promotionName: blocked.promotionName
      });
    });
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="h-5 w-5 text-pink-600" />
          Promotion Status
          {validationResult && !validationResult.canProceedToCheckout && (
            <Badge variant="destructive" className="text-xs">
              Checkout Blocked
            </Badge>
          )}
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
        
        {validationResult && !validationResult.canProceedToCheckout && (
          <>
            <Separator className="my-3" />
            <div className="flex items-center gap-2 text-xs text-red-600 font-medium">
              <XCircle className="h-3 w-3" />
              <span>Please resolve the issues above before proceeding to checkout.</span>
            </div>
          </>
        )}
        
        {validationResult && validationResult.canProceedToCheckout && validationMessages.some(m => m.type === 'warning') && (
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