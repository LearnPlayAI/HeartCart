import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CreditCard, 
  Truck, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Building2,
  Banknote,
  Package
} from "lucide-react";

// Enhanced checkout form schema with comprehensive validation
const checkoutSchema = z.object({
  // Customer Information
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  
  // Shipping Address
  addressLine1: z.string().min(5, "Please enter a complete address"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "Please enter a valid city"),
  province: z.string().min(2, "Please select a province"),
  postalCode: z.string().min(4, "Please enter a valid postal code"),
  
  // Shipping Method
  shippingMethod: z.enum(["pudo"], {
    required_error: "Please select a shipping method"
  }),
  
  // Payment Method
  paymentMethod: z.enum(["eft"], {
    required_error: "Please select a payment method"
  }),
  
  // Special Instructions
  specialInstructions: z.string().optional(),
  
  // Save preferences
  saveDetails: z.boolean().default(false)
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

// South African provinces
const provinces = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "Northern Cape", "North West", "Western Cape"
];

// Shipping options with detailed information
const shippingOptions = [
  {
    id: "pudo",
    name: "PUDO Lockers",
    description: "Collect from nearest PUDO locker",
    price: 85,
    estimatedDays: "2-3 business days",
    icon: Package
  }
];

// Payment options
const paymentOptions = [
  {
    id: "eft",
    name: "EFT Bank Transfer",
    description: "Pay via electronic funds transfer",
    icon: Banknote
  }
];

export default function CheckoutPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch current user details
  const { data: user } = useQuery({
    queryKey: ["/api/user"]
  });

  // Fetch cart items with fresh data
  const { data: cartResponse, isLoading: cartLoading, refetch: refetchCart } = useQuery({
    queryKey: ["/api/cart"],
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the results (updated for TanStack Query v5)
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true // Refetch when window gets focus
  });

  // Extract cart items from the response
  const cartItems = cartResponse?.data || [];

  // Calculate totals
  const subtotal = Array.isArray(cartItems) ? cartItems.reduce((sum: number, item: any) => {
    const itemPrice = parseFloat(item.itemPrice || 0);
    const quantity = item.quantity || 0;
    return sum + (itemPrice * quantity);
  }, 0) : 0;

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      province: "",
      postalCode: "",
      shippingMethod: "pudo",
      paymentMethod: "eft",
      specialInstructions: "",
      saveDetails: false
    }
  });

  // Force cart refetch on component mount
  useEffect(() => {
    refetchCart();
  }, [refetchCart]);

  // Pre-populate form with user data if available
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        addressLine1: user.addressLine1 || "",
        addressLine2: user.addressLine2 || "",
        city: user.city || "",
        province: user.province || "",
        postalCode: user.postalCode || "",
        shippingMethod: "pudo",
        paymentMethod: "eft",
        specialInstructions: "",
        saveDetails: false
      });
    }
  }, [user, form]);

  const selectedShippingMethod = form.watch("shippingMethod");
  const selectedPaymentMethod = form.watch("paymentMethod");
  
  const shippingCost = shippingOptions.find(option => 
    option.id === selectedShippingMethod)?.price || 0;
  
  const total = subtotal + shippingCost;

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify(orderData)
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Order Created Successfully!",
        description: `Order #${data.orderNumber} has been placed.`
      });
      
      // Clear cart and redirect to order confirmation
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      navigate(`/order-confirmation/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to create order. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      return apiRequest("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify(profileData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
  });

  const onSubmit = async (data: CheckoutFormData) => {
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your cart before checkout.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Save user details if requested
      if (data.saveDetails && user) {
        await updateProfileMutation.mutateAsync({
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          province: data.province,
          postalCode: data.postalCode
        });
      }

      // Prepare order data with product attributes
      const orderItems = cartItems.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: parseFloat(item.itemPrice || 0),
        // Include product attributes for items that have them
        productAttributes: item.attributeSelections || {}
      }));

      const orderData = {
        customerInfo: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone
        },
        shippingAddress: {
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          province: data.province,
          postalCode: data.postalCode
        },
        shippingMethod: data.shippingMethod,
        shippingCost,
        paymentMethod: data.paymentMethod,
        specialInstructions: data.specialInstructions,
        orderItems,
        subtotal,
        total
      };

      console.log("Submitting order data:", orderData);
      const result = await createOrderMutation.mutateAsync(orderData);
      console.log("Order creation result:", result);
      
      toast({
        title: "Order Placed Successfully!",
        description: "Your order has been submitted and you will receive a confirmation email shortly.",
      });
      
      // Navigate to order confirmation
      navigate(`/order-confirmation/${result.orderId || result.id}`);
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "An error occurred while placing your order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (cartLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-4">Add some items to your cart before checkout.</p>
            <Button onClick={() => navigate("/")}>Continue Shopping</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <p className="text-gray-600">Complete your order details below</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      {...form.register("firstName")}
                      placeholder="Enter your first name"
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      {...form.register("lastName")}
                      placeholder="Enter your last name"
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    placeholder="Enter your email"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    {...form.register("phone")}
                    placeholder="Enter your phone number"
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="addressLine1">Address Line 1</Label>
                  <Input
                    id="addressLine1"
                    {...form.register("addressLine1")}
                    placeholder="Street address"
                  />
                  {form.formState.errors.addressLine1 && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.addressLine1.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                  <Input
                    id="addressLine2"
                    {...form.register("addressLine2")}
                    placeholder="Apartment, suite, etc."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      {...form.register("city")}
                      placeholder="Enter city"
                    />
                    {form.formState.errors.city && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.city.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="province">Province</Label>
                    <select
                      id="province"
                      {...form.register("province")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select Province</option>
                      {provinces.map(province => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.province && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.province.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      {...form.register("postalCode")}
                      placeholder="Enter postal code"
                    />
                    {form.formState.errors.postalCode && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.postalCode.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipping Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedShippingMethod}
                  onValueChange={(value) => form.setValue("shippingMethod", value as any)}
                >
                  {shippingOptions.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <option.icon className="h-5 w-5 text-gray-500" />
                            <div>
                              <div className="font-medium">{option.name}</div>
                              <div className="text-sm text-gray-600">{option.description}</div>
                              <div className="text-sm text-gray-500">{option.estimatedDays}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {option.price === 0 ? "Free" : `R${option.price}`}
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedPaymentMethod}
                  onValueChange={(value) => form.setValue("paymentMethod", value as any)}
                >
                  {paymentOptions.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <option.icon className="h-5 w-5 text-gray-500" />
                          <div>
                            <div className="font-medium">{option.name}</div>
                            <div className="text-sm text-gray-600">{option.description}</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Special Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Special Instructions</CardTitle>
                <CardDescription>
                  Any special delivery instructions or notes for your order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  {...form.register("specialInstructions")}
                  placeholder="Enter any special instructions for your order..."
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Save Details Option */}
            {user && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="saveDetails"
                      {...form.register("saveDetails")}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="saveDetails" className="text-sm">
                      Save these details to my profile for future orders
                    </Label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isProcessing || createOrderMutation.isPending}
            >
              {isProcessing ? "Processing Order..." : `Place Order - R${total.toFixed(2)}`}
            </Button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cart Items */}
              <div className="space-y-4">
                {Array.isArray(cartItems) && cartItems.map((item: any) => (
                  <div key={item.id} className="flex items-center space-x-3 pb-4 border-b last:border-b-0">
                    {/* Product Image */}
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                      {item.product?.imageUrl ? (
                        <img 
                          src={item.product.imageUrl} 
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No image</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm leading-tight mb-1">
                        {item.product?.name || 'Product'}
                      </div>
                      <div className="text-xs text-gray-600 mb-1">Qty: {item.quantity}</div>
                      
                      {/* Show product attributes if they exist */}
                      {item.attributeSelections && Object.keys(item.attributeSelections).length > 0 && (
                        <div className="text-xs text-gray-500">
                          {Object.entries(item.attributeSelections).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="mr-1 text-xs py-0 px-1 h-4">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Price */}
                    <div className="text-right">
                      <div className="text-sm font-semibold text-primary">
                        R{(parseFloat(item.itemPrice || 0) * item.quantity).toFixed(2)}
                      </div>
                      {item.quantity > 1 && (
                        <div className="text-xs text-gray-500">
                          R{parseFloat(item.itemPrice || 0).toFixed(2)} each
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Pricing Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>R{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping:</span>
                  <span>{shippingCost === 0 ? "Free" : `R${shippingCost.toFixed(2)}`}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>R{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Selected Options Summary */}
              <div className="text-xs text-gray-600 space-y-1">
                <div>
                  Shipping: {shippingOptions.find(o => o.id === selectedShippingMethod)?.name}
                </div>
                <div>
                  Payment: {paymentOptions.find(o => o.id === selectedPaymentMethod)?.name}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}