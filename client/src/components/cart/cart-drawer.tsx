import { useEffect } from 'react';
import { XCircle, ShoppingBag, Plus, Minus, Trash2, Tag as TagIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/use-cart';
import { formatCurrency } from '@/lib/utils';
import { Link } from 'wouter';

const CartDrawer = () => {
  const { 
    cartItems, 
    isOpen, 
    closeCart, 
    updateItemQuantity, 
    removeItem,
    cartSummary,
    isLoading
  } = useCart();
  
  // Use the cart summary data which already includes all calculations
  const { subtotal, finalTotal, totalDiscount } = cartSummary;
  const shipping = subtotal > 0 ? 85 : 0; // R85 PUDO courier shipping fee
  const total = finalTotal + shipping;
  
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
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full">
        <SheetHeader className="p-4 border-b border-gray-200 bg-[#FF69B4] text-white">
          <SheetTitle className="text-white flex justify-between items-center">
            <span>Your Cart ({cartItems.length})</span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={closeCart}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </Button>
          </SheetTitle>
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
            <div className="flex-1 overflow-y-auto p-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex py-4 border-b border-gray-200">
                  <img 
                    src={item.product.imageUrl as string || '/placeholder-product.jpg'}
                    alt={item.product.name || 'Product'}
                    className="w-20 h-20 object-cover rounded-md"
                  />
                  <div className="ml-3 flex-1">
                    <h4 className="font-medium text-sm text-gray-800 mb-1">{item.product.name}</h4>
                    <div className="text-[#FF69B4] font-bold text-sm flex items-center gap-2">
                      {item.itemPrice ? (
                        <>
                          {formatCurrency(Number(item.itemPrice))} 
                          
                          {/* Show original price if on sale */}
                          {item.product.salePrice && item.product.price > item.product.salePrice && (
                            <span className="text-gray-500 line-through text-xs">
                              {formatCurrency(item.product.price)}
                            </span>
                          )}
                        </>
                      ) : (
                        formatCurrency((item.product.salePrice || item.product.price) + (item.priceAdjustment || 0))
                      )}
                    </div>
                    
                    {/* Display selected attributes */}
                    {item.attributeSelections && Object.keys(item.attributeSelections).length > 0 && (
                      <div className="mt-1 text-xs text-gray-600">
                        {Object.entries(item.attributeSelections).map(([attributeName, value]) => (
                          <div key={attributeName} className="flex items-center gap-1 flex-wrap">
                            <span className="font-medium">{attributeName}:</span>
                            {Array.isArray(value) ? (
                              <div className="flex gap-1 flex-wrap">
                                {value.map((val, index) => (
                                  <span key={index} className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                                    {val}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">{value}</span>
                            )}
                          </div>
                        ))}
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
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">{formatCurrency(shipping)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between mb-4 text-sm font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <Button 
                className="w-full bg-[#FF69B4] hover:bg-[#FF1493] text-white"
                asChild
              >
                <Link href="/checkout">
                  <a onClick={closeCart}>Proceed to Checkout</a>
                </Link>
              </Button>
              <Button 
                variant="outline"
                className="w-full mt-2 border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4]/5"
                onClick={closeCart}
              >
                Continue Shopping
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
