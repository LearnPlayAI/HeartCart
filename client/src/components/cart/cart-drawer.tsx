import { useEffect, useState, useRef } from 'react';
import { XCircle, ShoppingBag, Plus, Minus, Trash2, Tag as TagIcon, X, CreditCard, AlertCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCart } from '@/hooks/use-cart';
import { useCredits } from '@/hooks/use-credits';
import { formatCurrency } from '@/lib/utils';
import { Link, useLocation } from 'wouter';
import { calculateShippingCost } from '@/utils/pricing';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import ContextualInstallPrompts from '@/components/pwa/ContextualInstallPrompts';

interface ValidationError {
  promotionId: number;
  promotionName: string;
  reason: string;
  required: number;
  current: number;
}

const CartDrawer = () => {
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  
  const { 
    cartItems, 
    isOpen, 
    closeCart, 
    updateItemQuantity, 
    removeItem,
    removeAttributeOption,
    cartSummary,
    isLoading,
    recentlyAddedItemId
  } = useCart();
  
  const { creditBalance, formattedBalance, transactions } = useCredits();
  const [location, setLocation] = useLocation();

  // Fetch cart totals with VAT calculations from server-side
  // FIXED: Added authentication check and retry logic to ensure cart totals load from database
  const { data: cartTotalsResponse, isLoading: totalsLoading } = useQuery({
    queryKey: ["/api/cart/totals"],
    enabled: cartItems.length > 0, // Only fetch totals when there are cart items
    retry: 3, // Allow retries to handle temporary issues
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache query results
  });

  const cartTotals = cartTotalsResponse?.data;

  // Validate cart items for promotion rules
  const validateCartForCheckout = async (): Promise<boolean> => {
    if (cartItems.length === 0) return true;
    
    setIsValidating(true);
    try {
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

      const response = await apiRequest('/api/promotions/validate-cart', {
        method: 'POST',
        body: JSON.stringify({ items: cartData }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Validation response:', response);
      const validationResult = response?.success ? response.data : null;
      console.log('Validation result:', validationResult);
      
      if (validationResult && !validationResult.canProceedToCheckout) {
        console.log('Validation FAILED - blocking checkout:', validationResult.blockedPromotions);
        setValidationErrors(validationResult.blockedPromotions || []);
        setShowValidationModal(true);
        return false;
      }
      
      console.log('Validation PASSED - allowing checkout');
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      // Allow checkout to proceed if validation fails due to network error
      return true;
    } finally {
      setIsValidating(false);
    }
  };

  // Handle checkout button click
  const handleCheckoutClick = async () => {
    const canProceed = await validateCartForCheckout();
    if (canProceed) {
      closeCart();
      setLocation(`/checkout${autoCreditAmount > 0 ? `?credit=${autoCreditAmount}` : ''}`);
    }
  };
  
  // Ref for auto-scrolling to highlighted item
  const cartListRef = useRef<HTMLDivElement>(null);
  
  // Fetch user orders to check for shipped orders after credits were issued
  const { data: ordersResponse } = useQuery({
    queryKey: ['/api/orders'],
    enabled: !!creditBalance // Only fetch if user has credit balance
  });
  
  const userOrders = ordersResponse?.success ? ordersResponse.data : [];
  
  // Use server-side calculated totals with VAT
  const subtotal = cartTotals?.subtotal || 0;
  const finalTotal = cartTotals?.subtotal || 0; // Before VAT
  const totalDiscount = 0; // No discounts in simplified system
  
  // Calculate shipping with exemption logic using server-side data
  const availableCredit = creditBalance?.availableCredits ? parseFloat(creditBalance.availableCredits) : 0;
  const baseShipping = cartTotals?.shippingCost || 85;
  const { shippingCost: shipping, isShippingWaived, reasonForWaiver } = calculateShippingCost(
    baseShipping,
    transactions || [],
    availableCredit,
    userOrders
  );
  
  // Use server-side total amount that includes VAT
  const cartTotal = cartTotals?.totalAmount || (finalTotal + shipping);
  
  // Automatically apply maximum available credits
  const autoCreditAmount = Math.min(availableCredit, cartTotal);
  const finalTotalAfterCredit = Math.max(0, cartTotal - autoCreditAmount);
  
  // Auto-scroll to bottom when new item is added to cart
  useEffect(() => {
    if (recentlyAddedItemId && isOpen && cartItems && cartItems.length > 0) {
      // Check if the recently added item is actually in the cart data
      const itemExists = cartItems.some(item => item.productId === recentlyAddedItemId);
      
      if (itemExists) {
        console.log('Auto-scroll triggered for item:', recentlyAddedItemId, 'Cart items count:', cartItems.length);
        
        // Wait for cart drawer to be fully open and item to be rendered in DOM
        const scrollTimer = setTimeout(() => {
          if (cartListRef.current) {
            console.log('Scrolling container found, height:', cartListRef.current.scrollHeight);
            console.log('Current scroll position:', cartListRef.current.scrollTop);
            
            // Scroll to bottom to show the newly added item
            cartListRef.current.scrollTo({
              top: cartListRef.current.scrollHeight,
              behavior: 'smooth'
            });
            console.log('Scrolled to bottom to show new item');
          } else {
            console.log('Cart list ref not found');
          }
        }, 100); // Reduced delay for faster scroll response
        
        return () => clearTimeout(scrollTimer);
      }
    }
  }, [recentlyAddedItemId, isOpen, cartItems]);

  // Close cart on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCart();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, closeCart]);
  
  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full [&>button]:hidden">
        <SheetHeader className="p-4 border-b border-gray-200 bg-[#FF69B4] text-white relative">
          <SheetTitle className="text-white">
            Your Cart ({cartSummary.itemCount})
          </SheetTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={closeCart}
            className="absolute right-4 top-4 text-white hover:text-gray-200 transition-colors p-0 h-auto w-auto"
          >
            <XCircle className="h-6 w-6" />
          </Button>
        </SheetHeader>
        
        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-gray-500">
            <ShoppingBag className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Your cart is empty</p>
            <p className="text-sm text-center mb-4">Add items to your cart to see them here.</p>
            <Button 
              onClick={closeCart}
              className="bg-[#FF69B4] hover:bg-[#FF1493] text-white"
            >
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <div ref={cartListRef} className="flex-1 overflow-y-auto p-4">
              {cartItems.map((item) => {
                const isRecentlyAdded = recentlyAddedItemId === item.productId;
                return (
                  <div 
                    key={item.id}
                    data-product-id={item.productId}
                    className={`flex py-4 border-b border-gray-200 transition-all duration-300 ${
                      isRecentlyAdded 
                        ? 'bg-green-50 border-green-200 ring-2 ring-green-300 ring-opacity-50' 
                        : ''
                    }`}
                  >
                    <img 
                      src={item.product?.imageUrl as string || '/placeholder-product.jpg'}
                      alt={item.product?.name || 'Product'}
                      className="w-20 h-20 object-cover rounded-md"
                    />
                    <div className="ml-3 flex-1">
                      <h4 className="font-medium text-sm text-gray-800 mb-1">{item.product?.name}</h4>
                    <div className="text-[#FF69B4] font-bold text-sm flex items-center gap-2">
                      {(() => {
                        // Use the stored item price which includes promotional calculations
                        const itemPrice = Number(item.itemPrice) || 0;
                        const originalPrice = Number(item.product?.price) || 0;
                        const hasDiscount = itemPrice < originalPrice;
                        
                        return (
                          <>
                            {formatCurrency(itemPrice)}
                            
                            {/* Show original price if item price is discounted */}
                            {hasDiscount && (
                              <span className="text-gray-500 line-through text-xs">
                                {formatCurrency(originalPrice)}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    
                    {/* Display selected attributes with quantity breakdown */}
                    {item.attributeSelections && Object.keys(item.attributeSelections).length > 0 && (
                      <div className="mt-1 text-xs text-gray-600">
                        {Object.entries(item.attributeSelections).map(([attributeName, value]) => {
                          // Handle both old format (string/array) and new format (quantity object)
                          const getQuantityBreakdown = (attrValue: any) => {
                            if (typeof attrValue === 'object' && !Array.isArray(attrValue)) {
                              // New format: {optionValue: quantity}
                              return attrValue;
                            } else if (Array.isArray(attrValue)) {
                              // Old format: array of values
                              const counts: Record<string, number> = {};
                              attrValue.forEach(val => {
                                counts[val] = (counts[val] || 0) + 1;
                              });
                              return counts;
                            } else {
                              // Old format: single value gets the full item quantity
                              return { [attrValue]: item.quantity };
                            }
                          };

                          const quantityBreakdown = getQuantityBreakdown(value);

                          return (
                            <div key={attributeName} className="flex items-center gap-1 flex-wrap">
                              <span className="font-medium">{attributeName}:</span>
                              <div className="flex gap-1 flex-wrap">
                                {Object.entries(quantityBreakdown).map(([optionValue, count]) => (
                                  <span key={optionValue} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#ff69b4] text-[#ffffff]">
                                    {optionValue} x{count}
                                    <button
                                      onClick={() => removeAttributeOption(item.id, attributeName, optionValue)}
                                      className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                                      title={`Remove ${optionValue}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Display discount information */}
                    {item.totalDiscount > 0 && (
                      <div className="mt-1 text-xs text-pink-600">
                        <div className="flex items-center gap-1">
                          <TagIcon className="h-3 w-3" />
                          <span className="font-medium">
                            Savings: {formatCurrency(item.totalDiscount)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center mt-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="w-7 h-7 rounded-full"
                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="mx-3 text-sm font-medium">{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="w-7 h-7 rounded-full"
                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-gray-600">Shipping</span>
                <div className="text-right">
                  {isShippingWaived ? (
                    <div>
                      <span className="line-through text-gray-400 text-xs">R85.00</span>
                      <span className="ml-2 font-medium text-green-600">FREE</span>
                      <div className="text-xs text-green-600">{reasonForWaiver}</div>
                    </div>
                  ) : (
                    <span className="font-medium">{formatCurrency(shipping)}</span>
                  )}
                </div>
              </div>
              
              {/* VAT Display - Only show when VAT is registered */}
              {cartTotals?.vatBreakdown?.vatRegistered && (
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-gray-600">VAT ({cartTotals?.vatRate || 0}%):</span>
                  <span className="font-medium">{formatCurrency(cartTotals?.vatAmount || 0)}</span>
                </div>
              )}
              
              <Separator className="my-2" />
              <div className="flex justify-between mb-2 text-sm font-bold">
                <span>Cart Total</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
              
              {/* Applied Credit Display */}
              {autoCreditAmount > 0 && (
                <>
                  <div className="flex justify-between mb-2 text-sm text-green-600">
                    <span>Store Credit Applied</span>
                    <span>-{formatCurrency(autoCreditAmount)}</span>
                  </div>
                  <Separator className="my-2" />
                </>
              )}
              
              <div className="flex justify-between mb-4 text-lg font-bold">
                <span>Final Total</span>
                <span className={autoCreditAmount > 0 ? "text-green-600" : ""}>
                  {formatCurrency(finalTotalAfterCredit)}
                </span>
              </div>
              
              <Button 
                className="w-full bg-[#FF69B4] hover:bg-[#FF1493] text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                onClick={handleCheckoutClick}
                disabled={isValidating}
              >
                {isValidating ? 'Validating...' : 'Proceed to Checkout'}
              </Button>
              <Button 
                variant="outline"
                className="w-full mt-2 border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4]/5"
                onClick={closeCart}
              >
                Continue Shopping
              </Button>
              
              {/* PWA Install Prompt for Cart Context */}
              <ContextualInstallPrompts 
                context="cart" 
                className="mt-3"
              />
            </div>
          </>
        )}
      </SheetContent>
      
      {/* Validation Error Modal */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              Promotion Requirements Not Met
            </DialogTitle>
            <DialogDescription>
              Your cart doesn't meet the requirements for the following promotions:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {validationErrors.map((error, index) => (
              <div key={index} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-semibold text-orange-800 mb-2">{error.promotionName}</h4>
                <p className="text-sm text-orange-700 mb-2">{error.reason}</p>
                <div className="text-xs text-orange-600">
                  Required: {error.required} • Current: {error.current}
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowValidationModal(false)}
              className="w-full sm:w-auto"
            >
              Continue Shopping
            </Button>
            <Button
              onClick={() => setShowValidationModal(false)}
              className="w-full sm:w-auto bg-[#FF69B4] hover:bg-[#FF1493] text-white"
            >
              Update Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};

export default CartDrawer;
