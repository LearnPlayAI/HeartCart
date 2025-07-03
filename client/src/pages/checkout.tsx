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
import { calculateProductPricing, getPromotionalBadgeText, calculateShippingCost } from "@/utils/pricing";
import { useCredits } from "@/hooks/use-credits";
import PudoLockerPicker from "@/components/PudoLockerPicker";
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
import ContextualInstallPrompts from "@/components/pwa/ContextualInstallPrompts";
import PromotionValidationCard from "@/components/cart/PromotionValidationCard";

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
  const [selectedLocker, setSelectedLocker] = useState(null);
  const [savePreferredTrigger, setSavePreferredTrigger] = useState(false);
  const [canProceedToCheckout, setCanProceedToCheckout] = useState(true);
  const { creditBalance, formattedBalance, balanceLoading, transactions } = useCredits();

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

  // Fetch active promotions to apply promotional pricing - no cache for real-time pricing
  const { data: promotionsResponse } = useQuery({
    queryKey: ["/api/promotions/active-with-products"],
    staleTime: 0, // No cache - always fetch fresh promotional data
    gcTime: 0, // Don't keep in cache when component unmounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });

  // Fetch user orders to check for shipped orders after credits were issued
  const { data: ordersResponse } = useQuery({
    queryKey: ['/api/orders'],
    enabled: !!creditBalance // Only fetch if user has credit balance
  });

  // Invalidate preferred locker cache when checkout page loads to ensure fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/user/preferred-locker"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  }, [queryClient]);

  // Extract cart items from the response
  const cartItems = cartResponse?.data || [];
  const activePromotions = promotionsResponse?.data || [];
  const userOrders = ordersResponse?.success ? ordersResponse.data : [];

  // Create a map of product IDs to their promotional information
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

  // Calculate totals using unified promotional pricing system
  const subtotal = Array.isArray(cartItems) ? cartItems.reduce((sum: number, item: any) => {
    let currentPrice = 0;
    if (item.product) {
      // Get promotional information for this product
      const promotionInfo = promotionMap.get(item.product.id) || null;
      
      // Use unified promotional pricing system with correct function signature
      const pricing = calculateProductPricing(
        item.product.price || 0,
        item.product.salePrice,
        promotionInfo
      );
      currentPrice = pricing.displayPrice;
    } else {
      // Fallback to stored itemPrice if no product data
      currentPrice = parseFloat(item.itemPrice || 0);
    }
    
    const quantity = item.quantity || 0;
    return sum + (currentPrice * quantity);
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
      saveDetails: true
    }
  });

  // Force cart refetch on component mount
  useEffect(() => {
    refetchCart();
  }, [refetchCart]);

  // Pre-populate form with user data if available
  useEffect(() => {
    if (user?.data) {
      // Split fullName into firstName and lastName
      const userData = user.data;
      console.log("User data for form hydration:", userData);
      const nameParts = (userData.fullName || "").trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      form.reset({
        firstName,
        lastName,
        email: userData.email || "",
        phone: userData.phoneNumber || "",
        addressLine1: userData.address || "",
        addressLine2: "",
        city: userData.city || "",
        province: userData.province || "",
        postalCode: userData.postalCode || "",
        shippingMethod: "pudo",
        paymentMethod: "eft",
        specialInstructions: "",
        saveDetails: true
      });
    }
  }, [user, form]);

  const selectedShippingMethod = form.watch("shippingMethod");
  const selectedPaymentMethod = form.watch("paymentMethod");
  
  // Calculate automatic credit application
  const availableCredit = creditBalance?.availableCredits ? parseFloat(creditBalance.availableCredits) : 0;
  
  // Calculate shipping cost with exemption logic
  const baseShippingCost = shippingOptions.find(option => 
    option.id === selectedShippingMethod)?.price || 0;
  
  const { shippingCost, isShippingWaived, reasonForWaiver } = calculateShippingCost(
    baseShippingCost,
    transactions || [],
    availableCredit,
    userOrders
  );
  const safeShippingCost = shippingCost || 0;
  const orderTotal = subtotal + safeShippingCost;
  const autoCreditAmount = Math.min(availableCredit, orderTotal);
  const finalTotal = Math.max(0, orderTotal - autoCreditAmount);

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const response = await apiRequest("PATCH", "/api/user/profile", profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
  });

  // Create payment session mutation (step 1)
  const createPaymentSessionMutation = useMutation({
    mutationFn: async (orderData: any) => {
      console.log("Creating payment session with data:", orderData);
      
      const response = await fetch("/api/payment/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Payment session creation failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Payment session created:", result);
      return result;
    },
    onError: (error: any) => {
      console.error("Payment session error:", error);
      toast({
        title: "Payment Session Failed",
        description: error.message || "Failed to create payment session",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  });

  // Confirm payment and create order mutation (step 2)
  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ sessionId, paymentMethod }: { sessionId: string, paymentMethod: string }) => {
      console.log("Confirming payment with sessionId:", sessionId);
      
      const response = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          sessionId,
          paymentProof: {
            method: paymentMethod,
            transactionReference: "",
            amount: finalTotal
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Payment confirmation failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Payment confirmed and order created:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Order creation successful:", data);
      // Clear cart and invalidate orders
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      // Navigate to order confirmation
      navigate(`/order-confirmation/${data.data?.id || data.id}`);
    },
    onError: (error: any) => {
      console.error("Payment confirmation error:", error);
      toast({
        title: "Order Failed",
        description: error.message || "Failed to create order",
        variant: "destructive"
      });
      setIsProcessing(false);
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

    // Validate promotion requirements before checkout
    if (!canProceedToCheckout) {
      toast({
        title: "Promotion Requirements Not Met",
        description: "Please resolve promotion requirements before proceeding to checkout.",
        variant: "destructive"
      });
      return;
    }

    // Validate PUDO locker selection for PUDO shipping
    if (data.shippingMethod === "pudo" && !selectedLocker) {
      toast({
        title: "Locker Required",
        description: "Please select a PUDO locker for pickup.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Save preferred locker selection during checkout
      if (selectedLocker) {
        console.log("Triggering save preferred locker during checkout");
        setSavePreferredTrigger(true);
        // Small delay to allow the save to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        setSavePreferredTrigger(false);
      }

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
        shippingCost: safeShippingCost,
        paymentMethod: data.paymentMethod,
        specialInstructions: data.specialInstructions,
        orderItems,
        subtotal,
        total: finalTotal,
        creditUsed: autoCreditAmount,
        selectedLockerId: selectedLocker?.id,
        lockerDetails: selectedLocker ? {
          code: selectedLocker.code,
          name: selectedLocker.name,
          address: selectedLocker.address,
          provider: selectedLocker.provider
        } : null
      };

      console.log("Creating order directly for bank transfer:", orderData);
      
      // For bank transfer payments, create order directly and redirect to payment page
      if (data.paymentMethod === "eft") {
        // Store order data in sessionStorage for payment page
        sessionStorage.setItem('pendingOrder', JSON.stringify(orderData));
        
        // Navigate to payment instructions page
        navigate('/payment-confirmation');
        return;
      }
      
      // For other payment methods (future), use payment session approach
      const sessionResult = await createPaymentSessionMutation.mutateAsync(orderData);
      
      if (sessionResult.success && sessionResult.data?.sessionId) {
        await confirmPaymentMutation.mutateAsync({
          sessionId: sessionResult.data.sessionId,
          paymentMethod: data.paymentMethod
        });
      } else {
        throw new Error("Failed to create payment session");
      }
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

            {/* PUDO Locker Selection */}
            {selectedShippingMethod === "pudo" && (
              <PudoLockerPicker
                selectedLockerId={selectedLocker?.id}
                onLockerSelect={setSelectedLocker}
                customerProvince={user?.province || form.watch("province")}
                customerCity={user?.city || form.watch("city")}
                savePreferredTrigger={savePreferredTrigger}
              />
            )}

            {/* Credit Application */}
            {creditBalance > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    Apply Store Credit
                  </CardTitle>
                  <CardDescription>
                    Available balance: {formattedBalance}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="creditAmount">Credit Amount to Apply</Label>
                      <Input
                        id="creditAmount"
                        type="number"
                        min="0"
                        max={maxCreditAmount}
                        step="0.01"
                        value={applyCreditAmount}
                        onChange={(e) => setApplyCreditAmount(Math.min(parseFloat(e.target.value) || 0, maxCreditAmount))}
                        placeholder="0.00"
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        Maximum: R{maxCreditAmount.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setApplyCreditAmount(maxCreditAmount)}
                      disabled={maxCreditAmount === 0}
                    >
                      Apply Maximum Credit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

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
              disabled={isProcessing || createPaymentSessionMutation.isPending || confirmPaymentMutation.isPending || !canProceedToCheckout}
            >
              {isProcessing 
                ? "Processing Order..." 
                : !canProceedToCheckout 
                  ? "Resolve Promotion Requirements" 
                  : `Place Order - R${finalTotal.toFixed(2)}`}
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
                      
                      {/* Show product attributes with quantity breakdown */}
                      {item.attributeSelections && Object.keys(item.attributeSelections).length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
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
                              <div key={attributeName} className="flex items-center gap-1 flex-wrap mb-1">
                                <span className="font-medium">{attributeName}:</span>
                                <div className="flex gap-1 flex-wrap">
                                  {Object.entries(quantityBreakdown).map(([optionValue, count]) => (
                                    <Badge 
                                      key={optionValue} 
                                      className="bg-[#ff69b4] text-[#ffffff] text-xs py-0 px-2 h-5"
                                    >
                                      {optionValue} x{count}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    {/* Price */}
                    <div className="text-right">
                      <div className="text-sm font-semibold text-primary">
                        R{(() => {
                          // Use unified promotional pricing system with promotional info from map
                          if (item.product) {
                            const promotionInfo = promotionMap.get(item.product.id) || null;
                            const pricing = calculateProductPricing(
                              item.product.price || 0,
                              item.product.salePrice,
                              promotionInfo
                            );
                            return (pricing.displayPrice * item.quantity).toFixed(2);
                          } else {
                            // Fallback to itemPrice if no product data
                            const currentPrice = parseFloat(item.itemPrice || 0);
                            return (currentPrice * item.quantity).toFixed(2);
                          }
                        })()}
                      </div>
                      {item.quantity > 1 && (
                        <div className="text-xs text-gray-500">
                          R{(() => {
                            if (item.product) {
                              const promotionInfo = promotionMap.get(item.product.id) || null;
                              const pricing = calculateProductPricing(
                                item.product.price || 0,
                                item.product.salePrice,
                                promotionInfo
                              );
                              return pricing.displayPrice.toFixed(2);
                            } else {
                              return parseFloat(item.itemPrice || 0).toFixed(2);
                            }
                          })()} each
                        </div>
                      )}
                      
                      {/* Show promotional badge if applicable */}
                      {item.product && promotionMap.get(item.product.id) && (
                        <div className="mt-1">
                          <Badge 
                            variant="secondary" 
                            className="bg-red-100 text-red-700 text-xs py-0 px-1 h-4"
                          >
                            {getPromotionalBadgeText(promotionMap.get(item.product.id))}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Promotion Validation */}
              <PromotionValidationCard 
                cartItems={cartItems} 
                onValidationChange={setCanProceedToCheckout}
              />

              {/* Auto Credit Application Display */}
              {autoCreditAmount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Credit Auto-Applied: R{autoCreditAmount.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Available: R{availableCredit.toFixed(2)} • Maximum applied automatically
                  </p>
                </div>
              )}

              <Separator />

              {/* Pricing Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>R{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping:</span>
                  <div className="text-right">
                    {isShippingWaived ? (
                      <div>
                        <span className="line-through text-gray-400 text-xs">R85.00</span>
                        <span className="ml-2 font-medium text-green-600">FREE</span>
                        <div className="text-xs text-green-600">{reasonForWaiver}</div>
                      </div>
                    ) : (
                      <span>{safeShippingCost === 0 ? "Free" : `R${safeShippingCost.toFixed(2)}`}</span>
                    )}
                  </div>
                </div>
                {autoCreditAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Credit Applied:</span>
                    <span>-R{autoCreditAmount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span className={autoCreditAmount > 0 ? "text-green-600" : ""}>
                    R{finalTotal.toFixed(2)}
                  </span>
                </div>
                {autoCreditAmount > 0 && (
                  <div className="text-xs text-gray-600">
                    Original total: R{(subtotal + shippingCost).toFixed(2)}
                  </div>
                )}
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
          
          {/* PWA Install Prompt for Checkout Context */}
          <ContextualInstallPrompts 
            context="checkout" 
            className="mt-6"
          />
        </div>
      </div>
    </div>
  );
}