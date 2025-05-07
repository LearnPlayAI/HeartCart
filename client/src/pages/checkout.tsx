import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  LucideIcon, 
  Truck, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

// Schema for checkout form
const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().min(10, 'Valid phone number is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  postalCode: z.string().min(4, 'Valid postal code is required'),
  paymentMethod: z.enum(['credit-card', 'eft', 'cash']),
  shippingMethod: z.enum(['standard', 'express']),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

// Payment method option type
type PaymentOption = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
};

// Shipping method option type
type ShippingOption = {
  id: string;
  name: string;
  price: number;
  description: string;
  estimatedDelivery: string;
};

const CheckoutPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  
  const {
    cartItems,
    calculateSubtotal,
    clearCart
  } = useCart();
  
  // Get user profile if logged in
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
  });
  
  // Form definition
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || '',
      address: user?.address || '',
      city: user?.city || '',
      postalCode: user?.postalCode || '',
      paymentMethod: 'credit-card',
      shippingMethod: 'standard',
    },
  });
  
  // Payment methods
  const paymentMethods: PaymentOption[] = [
    {
      id: 'credit-card',
      name: 'Credit Card',
      description: 'Pay securely with your credit card',
      icon: CreditCard,
    },
    {
      id: 'eft',
      name: 'EFT Payment',
      description: 'Electronic funds transfer',
      icon: CreditCard,
    },
    {
      id: 'cash',
      name: 'Cash on Delivery',
      description: 'Pay when you receive your order',
      icon: CreditCard,
    },
  ];
  
  // Shipping methods
  const shippingMethods: ShippingOption[] = [
    {
      id: 'standard',
      name: 'Standard Delivery',
      price: 50,
      description: 'Standard delivery to your doorstep',
      estimatedDelivery: '3-5 business days',
    },
    {
      id: 'express',
      name: 'Express Delivery',
      price: 100,
      description: 'Get your order faster',
      estimatedDelivery: '1-2 business days',
    },
  ];
  
  // Calculate subtotal
  const subtotal = calculateSubtotal();
  
  // Get selected shipping method price
  const selectedShippingMethod = form.watch('shippingMethod');
  const shippingCost = shippingMethods.find(
    method => method.id === selectedShippingMethod
  )?.price || 50;
  
  // Calculate total
  const total = subtotal + shippingCost;
  
  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: CheckoutFormValues) => {
      // Prepare order data
      const orderData = {
        order: {
          totalAmount: total,
          shippingAddress: `${data.address}, ${data.city}, ${data.postalCode}`,
          shippingMethod: data.shippingMethod,
          paymentMethod: data.paymentMethod,
          status: 'pending',
        },
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: (item.product.salePrice || item.product.price) + (item.priceAdjustment || 0),
          // Include attribute information for the order item
          combinationId: item.combinationId || null,
          combinationHash: item.combinationHash || null,
          selectedAttributes: item.selectedAttributes || {},
          priceAdjustment: item.priceAdjustment || 0,
        })),
      };
      
      const response = await apiRequest('POST', '/api/orders', orderData);
      return response.json();
    },
    onSuccess: (data) => {
      setOrderId(data.id);
      setOrderComplete(true);
      clearCart();
      
      toast({
        title: "Order placed successfully!",
        description: `Your order #${data.id} has been received.`,
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to place order",
        description: "There was an error processing your order. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: CheckoutFormValues) => {
    if (cartItems.length === 0) {
      toast({
        title: "Your cart is empty",
        description: "Add items to your cart before checking out.",
        variant: "destructive",
      });
      return;
    }
    
    createOrderMutation.mutate(data);
  };
  
  // If cart is empty, show message
  if (cartItems.length === 0 && !orderComplete) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-yellow-500" />
              <h1 className="text-2xl font-bold text-gray-900">Your Cart is Empty</h1>
            </div>
            <p className="mb-4">You don't have any items in your cart to checkout.</p>
            <Button asChild>
              <a href="/">Continue Shopping</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If order is complete, show confirmation
  if (orderComplete && orderId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex flex-col items-center mb-6">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900">Order Confirmed!</h1>
              <p className="text-gray-600 mt-2">
                Your order #{orderId} has been placed successfully.
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="font-medium">A confirmation email has been sent to your email address.</p>
              <p className="text-sm text-gray-500 mt-2">
                You can check the status of your order anytime in your account dashboard.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <a href="/">Continue Shopping</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/profile">View Your Orders</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <>
      <Helmet>
        <title>Checkout - TEE ME YOU</title>
        <meta name="description" content="Complete your purchase. Fast, secure checkout for your South African products." />
      </Helmet>
      
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>
                      We'll use this information to contact you about your order.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="your@email.com" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+27 12 345 6789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Shipping Address</CardTitle>
                    <CardDescription>
                      Enter where you want your order delivered.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="Cape Town" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="8001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Shipping Method</CardTitle>
                    <CardDescription>
                      Select your preferred delivery option.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="shippingMethod"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <div className="space-y-2">
                            {shippingMethods.map((method) => (
                              <div
                                key={method.id}
                                className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${
                                  field.value === method.id
                                    ? 'border-[#FF69B4] bg-[#FF69B4]/5'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => form.setValue('shippingMethod', method.id as any)}
                              >
                                <div className="flex items-center">
                                  <div className={`w-4 h-4 rounded-full mr-3 ${
                                    field.value === method.id
                                      ? 'bg-[#FF69B4]'
                                      : 'border border-gray-300'
                                  }`}></div>
                                  <div>
                                    <h4 className="font-medium">{method.name}</h4>
                                    <p className="text-sm text-gray-500">{method.description}</p>
                                    <p className="text-sm text-gray-500">{method.estimatedDelivery}</p>
                                  </div>
                                </div>
                                <div className="font-medium">{formatCurrency(method.price)}</div>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                    <CardDescription>
                      Select your preferred payment method.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="credit-card" onValueChange={(value) => form.setValue('paymentMethod', value as any)}>
                      <TabsList className="grid grid-cols-3 mb-4">
                        {paymentMethods.map((method) => (
                          <TabsTrigger key={method.id} value={method.id}>
                            {method.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      
                      {paymentMethods.map((method) => (
                        <TabsContent key={method.id} value={method.id}>
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center mb-4">
                              <method.icon className="h-5 w-5 mr-2 text-[#FF69B4]" />
                              <h3 className="font-medium">{method.name}</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">{method.description}</p>
                            
                            {method.id === 'credit-card' && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Card Number</label>
                                    <Input placeholder="1234 5678 9012 3456" disabled />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Name on Card</label>
                                    <Input placeholder="John Doe" disabled />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Expiry Date</label>
                                    <Input placeholder="MM/YY" disabled />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1">CVV</label>
                                    <Input placeholder="123" disabled />
                                  </div>
                                </div>
                                <p className="text-sm text-gray-500 italic">
                                  Note: This is a demo app. No actual payment will be processed.
                                </p>
                              </div>
                            )}
                            
                            {method.id === 'eft' && (
                              <div>
                                <p className="text-sm text-gray-600">
                                  Bank: TEE ME YOU Bank<br />
                                  Account Number: 1234567890<br />
                                  Branch Code: 123456<br />
                                  Reference: Your order number will be generated after checkout
                                </p>
                              </div>
                            )}
                            
                            {method.id === 'cash' && (
                              <p className="text-sm text-gray-600">
                                You'll pay in cash when your order is delivered to your doorstep.
                              </p>
                            )}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                </Card>
                
                <Button 
                  type="submit" 
                  className="w-full bg-[#FF69B4] hover:bg-[#FF1493] text-white"
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? 'Processing...' : 'Place Order'}
                </Button>
              </form>
            </Form>
          </div>
          
          {/* Order Summary */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-start py-2">
                      <img 
                        src={item.product.imageUrl} 
                        alt={item.product.name} 
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <div className="ml-3 flex-1">
                        <h4 className="text-sm font-medium">{item.product.name}</h4>
                        
                        {/* Selected attributes */}
                        {item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0 && (
                          <div className="mt-1 mb-1">
                            {Object.entries(item.selectedAttributes as Record<string, string>).map(([key, value], index) => (
                              <div key={index} className="flex text-xs text-gray-600">
                                <span className="font-medium mr-1">{key}:</span>
                                <span>{value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Global attributes */}
                        {item.globalAttributes && item.globalAttributes.length > 0 && (
                          <div className="mt-1 mb-1">
                            {item.globalAttributes.map((attr, index) => (
                              <div key={index} className="flex text-xs text-gray-600">
                                <span className="font-medium mr-1">{attr.displayName || attr.name}:</span>
                                <span>{attr.displayValue || attr.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center mt-1">
                          <span className="text-sm text-[#FF69B4] font-medium">
                            {formatCurrency((item.product.salePrice || item.product.price) + (item.priceAdjustment || 0))}
                          </span>
                          <span className="text-xs text-gray-500 mx-2">×</span>
                          <span className="text-sm">{item.quantity}</span>
                        </div>
                      </div>
                      <div className="font-medium">
                        {formatCurrency(((item.product.salePrice || item.product.price) + (item.priceAdjustment || 0)) * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                {/* Price Calculations */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span>{formatCurrency(shippingCost)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <div className="text-sm text-gray-500 w-full">
                  <div className="flex items-center justify-center text-[#FF69B4]">
                    <Truck className="h-4 w-4 mr-2" />
                    <span>Free shipping on orders over R1000</span>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default CheckoutPage;
