import { useEffect, useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Copy, Building2, MapPin, Clock, Phone, Package, Mail, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface OrderData {
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    province: string;
    postalCode: string;
  };
  shippingMethod: string;
  shippingCost: number;
  paymentMethod: string;
  specialInstructions?: string;
  orderItems: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
    productAttributes?: Record<string, any>;
  }>;
  subtotal: number;
  total: number;
  creditUsed: number;
  selectedLockerId?: number;
  lockerDetails?: {
    code: string;
    name: string;
    address: string;
    provider: string;
  };
}

interface Product {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  salePrice?: number;
}

export default function PaymentConfirmation() {
  const [, navigate] = useLocation();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch products data for the order items
  const productIds = orderData?.orderItems.map(item => item.productId) || [];
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products', 'batch', productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const promises = productIds.map(async (id) => {
        const response = await apiRequest('GET', `/api/products/${id}`);
        return response.data;
      });
      const results = await Promise.all(promises);
      return results;
    },
    enabled: productIds.length > 0
  });

  useEffect(() => {
    // Get order data from sessionStorage
    const savedOrderData = sessionStorage.getItem('pendingOrder');
    if (savedOrderData) {
      const parsed = JSON.parse(savedOrderData);
      setOrderData(parsed);
      
      // Generate reference number in format TMY-(incrementing number)-(dd)(MM)(YYYY)
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const incrementingNumber = Math.floor(Math.random() * 9000) + 1000; // 4-digit random number
      const ref = `TMY-${incrementingNumber}-${day}${month}${year}`;
      setReferenceNumber(ref);
    } else {
      // Redirect to checkout if no order data
      navigate('/checkout');
    }
  }, [navigate]);

  // Create order mutation (when user confirms payment)
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: OrderData) => {
      const response = await apiRequest('POST', '/api/orders', orderData);
      return response;
    },
    onSuccess: (result) => {
      // Clear pending order data
      sessionStorage.removeItem('pendingOrder');
      
      // Clear cart and refresh queries
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      
      
      // Navigate to order confirmation
      navigate(`/order-confirmation/${result.data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Order Creation Failed",
        description: error.message || "Failed to create order. Please try again.",
        variant: "destructive"
      });
    }
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    
  };

  const handleConfirmPayment = () => {
    if (orderData) {
      // Add payment reference number to order data
      const orderWithPaymentRef = {
        ...orderData,
        paymentReferenceNumber: referenceNumber,
        paymentStatus: 'paid' // Set status to indicate payment proof was uploaded
      };
      createOrderMutation.mutate(orderWithPaymentRef);
    }
  };

  if (!orderData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Loading...</h2>
            <p className="text-gray-600">Preparing your payment details</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-green-500 mr-3" />
          <h1 className="text-3xl font-bold">Payment Instructions</h1>
        </div>
        <p className="text-gray-600">
          Complete your payment using the bank details below to secure your order
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Payment Instructions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Bank Transfer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Bank</label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-lg">Capitec Business</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard('Capitec Business', 'Bank name')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Account Name</label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-lg">Tee Me You</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard('Tee Me You', 'Account name')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Account Type</label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-lg">Transact</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard('Transact', 'Account type')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Account Number</label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-lg">1053816278</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard('1053816278', 'Account number')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div>
                  <label className="text-sm font-medium text-yellow-800">Reference Number</label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-lg text-yellow-900 font-bold">{referenceNumber}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(referenceNumber, 'Reference number')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-yellow-700 mt-2">
                    ⚠️ <strong>Important:</strong> Use this reference number for your payment to ensure proper processing
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Payment Instructions:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Transfer the exact amount: <strong>R{orderData.total.toFixed(2)}</strong></li>
                  <li>2. Use the reference number: <strong>{referenceNumber}</strong></li>
                  <li>3. Send proof of payment to: <strong>sales@teemeyou.shop</strong></li>
                  <li>4. Click "I've Made Payment" below to create your order</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* PUDO Locker Details */}
          {orderData.lockerDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  PUDO Locker Collection Point
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{orderData.lockerDetails.name}</span>
                      <Badge variant="secondary">{orderData.lockerDetails.code}</Badge>
                    </div>
                    <p className="text-gray-600 flex items-start">
                      <MapPin className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                      {orderData.lockerDetails.address}
                    </p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Building2 className="w-4 h-4 mr-1" />
                      {orderData.lockerDetails.provider}
                    </div>
                  </div>
                  
                  {/* Collection Tips */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                      <Mail className="w-4 h-4 mr-1" />
                      Collection Information
                    </h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>• PUDO tracking information will be sent to your email</p>
                      <p>• Track your order status in "My Orders" (accessible from the user menu)</p>
                      <p>• Bring your ID and collection code when picking up</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {orderData.orderItems.map((item, index) => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {product?.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Image</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2">
                          {product?.name || `Product ${item.productId}`}
                        </h4>
                        {product?.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              R{(item.unitPrice * item.quantity).toFixed(2)}
                            </div>
                            {item.quantity > 1 && (
                              <div className="text-xs text-gray-500">
                                R{item.unitPrice.toFixed(2)} each
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R{orderData.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping ({orderData.shippingMethod.toUpperCase()}):</span>
                  <span>R{orderData.shippingCost.toFixed(2)}</span>
                </div>
                {orderData.creditUsed > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Credits Used:</span>
                    <span>-R{orderData.creditUsed.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>R{orderData.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">
                  {orderData.customerInfo.firstName} {orderData.customerInfo.lastName}
                </span>
              </div>
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-gray-500" />
                {orderData.customerInfo.phone}
              </div>
              <div className="text-sm text-gray-600">
                {orderData.shippingAddress.addressLine1}
                {orderData.shippingAddress.addressLine2 && `, ${orderData.shippingAddress.addressLine2}`}
                <br />
                {orderData.shippingAddress.city}, {orderData.shippingAddress.province} {orderData.shippingAddress.postalCode}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleConfirmPayment}
              disabled={createOrderMutation.isPending}
              className="w-full"
              size="lg"
            >
              {createOrderMutation.isPending ? "Creating Order..." : "I've Made Payment - Create Order"}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => navigate('/checkout')}
              className="w-full"
            >
              Back to Checkout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}