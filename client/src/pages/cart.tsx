import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { calculateProductPricing, getPromotionalBadgeText } from "@/utils/pricing";
import { calculateVAT, formatVATAmount, formatVATRate } from "@shared/vat-utils";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Calculator,
  Package,
  CreditCard,
  ArrowRight
} from "lucide-react";

export default function CartPage() {
  console.log('🛒 CART PAGE COMPONENT STARTED');
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch cart items
  const { data: cartResponse, isLoading: cartLoading, refetch } = useQuery({
    queryKey: ["/api/cart"],
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch active promotions for pricing
  const { data: promotionsResponse } = useQuery({
    queryKey: ["/api/promotions/active-with-products"],
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch VAT settings for order calculation and display
  const { data: vatRateSettings, isLoading: vatRateLoading, error: vatRateError } = useQuery({
    queryKey: ['/api/admin/settings/vatRate'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: vatRegisteredSettings, isLoading: vatRegisteredLoading, error: vatRegisteredError } = useQuery({
    queryKey: ['/api/admin/settings/vatRegistered'],
    staleTime: 5 * 60 * 1000,
  });

  const cartItems = cartResponse?.data || [];
  const activePromotions = promotionsResponse?.data || [];

  // Create promotion map
  const promotionMap = new Map();
  activePromotions.forEach((promotion: any) => {
    if (promotion.products) {
      promotion.products.forEach((pp: any) => {
        promotionMap.set(pp.productId, {
          promotionName: promotion.promotionName,
          promotionDiscount: promotion.discountValue ? promotion.discountValue.toString() : '0',
          promotionEndDate: promotion.endDate,
          promotionalPrice: pp.promotionalPrice ? parseFloat(pp.promotionalPrice) : null
        });
      });
    }
  });

  // Calculate subtotal with promotions
  const subtotal = Array.isArray(cartItems) ? cartItems.reduce((sum: number, item: any) => {
    let currentPrice = 0;
    if (item.product) {
      const promotionInfo = promotionMap.get(item.product.id) || null;
      const pricing = calculateProductPricing(
        item.product.price || 0,
        item.product.salePrice,
        promotionInfo
      );
      currentPrice = pricing.displayPrice;
    } else {
      currentPrice = parseFloat(item.itemPrice || 0);
    }
    
    const quantity = item.quantity || 0;
    return sum + (currentPrice * quantity);
  }, 0) : 0;

  const shippingCost = 85; // Standard PUDO shipping

  const isEmpty = !cartItems || cartItems.length === 0;

  if (cartLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Loading cart...</div>
        </div>
      </div>
    );
  }

  // FORCED DEBUG - This MUST appear in console
  console.log('CART PAGE LOADED - CHECKING VAT');
  
  // Get VAT settings from API response
  let vatRate = 0;
  let vatRegistered = false;
  let vatCalculation = null;
  
  try {
    console.log('========== VAT DEBUG CART ==========');
    
    vatRate = parseFloat(vatRateSettings?.data?.settingValue || '0');
    vatRegistered = vatRegisteredSettings?.data?.settingValue === 'true';
    
    console.log('VAT Debug Cart:', {
      cartItemsLength: cartItems?.length,
      vatRateSettings: vatRateSettings?.data,
      vatRegisteredSettings: vatRegisteredSettings?.data,
      vatRateLoading,
      vatRegisteredLoading,
      vatRateError,
      vatRegisteredError,
      vatRate,
      vatRegistered,
      subtotal,
      shippingCost
    });

    // Calculate VAT using shared utilities
    vatCalculation = calculateVAT({
      subtotal: subtotal,
      shippingCost: shippingCost,
      vatRate: vatRate
    });

    console.log('VAT Calculation Result:', vatCalculation);
    console.log('========== END VAT DEBUG ==========');
    
  } catch (error) {
    console.error('VAT CALCULATION ERROR:', error);
    // Fallback calculation if VAT function fails
    vatCalculation = {
      subtotal: subtotal,
      shippingCost: shippingCost,
      vatableAmount: subtotal + shippingCost,
      vatRate: vatRate,
      vatAmount: (subtotal + shippingCost) * (vatRate / 100),
      totalAmount: subtotal + shippingCost + ((subtotal + shippingCost) * (vatRate / 100))
    };
    console.log('FALLBACK VAT Calculation:', vatCalculation);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Helmet>
        <title>Shopping Cart - TeeMeYou</title>
        <meta name="description" content="Review your cart items and proceed to checkout with secure payment options" />
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-8 w-8 text-pink-600" />
            Shopping Cart
          </h1>
          <p className="text-muted-foreground mt-2">
            Review your items and proceed to checkout
          </p>
        </div>

        {isEmpty ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
              <p className="text-gray-600 mb-6">Start shopping to add items to your cart</p>
              <Button onClick={() => setLocation('/products')}>
                Browse Products
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item: any) => {
                const promotionInfo = item.product ? promotionMap.get(item.product.id) : null;
                const pricing = item.product ? calculateProductPricing(
                  item.product.price || 0,
                  item.product.salePrice,
                  promotionInfo
                ) : null;
                
                return (
                  <Card key={item.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Product Image */}
                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {item.product?.imageUrl ? (
                            <img 
                              src={`/api/files/${item.product.imageUrl}`}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        
                        {/* Product Details */}
                        <div className="flex-1">
                          <h3 className="font-medium">{item.product?.name || 'Product'}</h3>
                          
                          {/* Pricing */}
                          <div className="mt-2">
                            {pricing ? (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-pink-600">
                                  R{pricing.displayPrice.toFixed(2)}
                                </span>
                                {pricing.hasDiscount && (
                                  <span className="text-sm text-gray-500 line-through">
                                    R{pricing.originalPrice.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-lg font-bold text-pink-600">
                                R{parseFloat(item.itemPrice || 0).toFixed(2)}
                              </span>
                            )}
                          </div>
                          
                          {/* Promotional Badge */}
                          {promotionInfo && (
                            <Badge 
                              variant="secondary" 
                              className="bg-red-100 text-red-700 text-xs mt-1"
                            >
                              {getPromotionalBadgeText(promotionInfo)}
                            </Badge>
                          )}
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-sm text-gray-600">Qty:</span>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button size="sm" variant="outline" className="ml-4">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Item Total */}
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            R{((pricing?.displayPrice || parseFloat(item.itemPrice || 0)) * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pricing Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal ({cartItems.length} items):</span>
                      <span>R{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping:</span>
                      <span>R{shippingCost.toFixed(2)}</span>
                    </div>
                    
                    {/* VAT Line Item - Always show for transparency */}
                    <div className="flex justify-between text-sm items-center">
                      <div className="flex items-center gap-1">
                        <Calculator className="h-3 w-3 text-orange-500" />
                        <span>VAT ({formatVATRate(vatRate)}):</span>
                      </div>
                      <span>{formatVATAmount(vatCalculation.vatAmount)}</span>
                    </div>
                    
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>R{vatCalculation.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* VAT Information */}
                  {vatRegistered && (
                    <div className="text-xs text-gray-500 bg-orange-50 p-2 rounded">
                      VAT included in total price
                    </div>
                  )}

                  <Separator />
                  
                  {/* Checkout Button */}
                  <Button 
                    size="lg" 
                    className="w-full"
                    onClick={() => setLocation('/checkout')}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Proceed to Checkout
                  </Button>
                  
                  {/* Continue Shopping */}
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setLocation('/products')}
                  >
                    Continue Shopping
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}