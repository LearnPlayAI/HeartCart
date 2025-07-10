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

  // Fetch cart totals with VAT calculations from server-side
  const { data: cartTotalsResponse, isLoading: totalsLoading, error: totalsError } = useQuery({
    queryKey: ["/api/cart/totals"],
    staleTime: 0,
    gcTime: 0,
  });

  const cartItems = cartResponse?.data || [];

  const isEmpty = !cartItems || cartItems.length === 0;

  // Get server-side calculated totals
  const cartTotals = cartTotalsResponse?.data;

  if (cartLoading || totalsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Loading cart...</div>
        </div>
      </div>
    );
  }

  // Server-side VAT calculation debug
  console.log('🛒 CART PAGE COMPONENT STARTED');
  console.log('========== SERVER-SIDE VAT DEBUG CART ==========');
  console.log('Cart Totals from Server:', cartTotals);
  console.log('Cart Items Length:', cartItems?.length);
  console.log('========== END SERVER-SIDE VAT DEBUG ==========');

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
                // Use stored itemPrice instead of recalculating current promotional pricing
                // This preserves the promotional price that was valid when item was added to cart
                const storedPrice = parseFloat(item.itemPrice || 0);
                const originalPrice = item.product?.price || 0;
                const hasStoredDiscount = storedPrice < originalPrice;
                
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
                          
                          {/* Pricing - Use stored promotional price */}
                          <div className="mt-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-pink-600">
                                R{storedPrice.toFixed(2)}
                              </span>
                              {hasStoredDiscount && (
                                <span className="text-sm text-gray-500 line-through">
                                  R{originalPrice.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Promotional Badge - Show discount percentage if stored price is lower */}
                          {hasStoredDiscount && (
                            <Badge 
                              variant="secondary" 
                              className="bg-red-100 text-red-700 text-xs mt-1"
                            >
                              {Math.round(((originalPrice - storedPrice) / originalPrice) * 100)}% OFF
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
                        
                        {/* Item Total - Use stored promotional price */}
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            R{(storedPrice * item.quantity).toFixed(2)}
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
                      <span>Subtotal ({cartTotals?.itemCount || 0} items):</span>
                      <span>R{cartTotals ? cartTotals.subtotal.toFixed(2) : '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping:</span>
                      <span>R{cartTotals ? cartTotals.shippingCost.toFixed(2) : '85.00'}</span>
                    </div>
                    
                    {/* Server-side VAT Line Item - Only show when VAT is registered */}
                    {cartTotals?.vatBreakdown?.vatRegistered && (
                      <div className="flex justify-between text-sm items-center">
                        <div className="flex items-center gap-1">
                          <Calculator className="h-3 w-3 text-orange-500" />
                          <span>VAT ({cartTotals ? cartTotals.vatRate : 0}%):</span>
                        </div>
                        <span>R{cartTotals ? cartTotals.vatAmount.toFixed(2) : '0.00'}</span>
                      </div>
                    )}
                    
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>R{cartTotals ? cartTotals.totalAmount.toFixed(2) : '85.00'}</span>
                    </div>
                  </div>

                  {/* VAT Information */}
                  {cartTotals?.vatBreakdown?.vatRegistered && (
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