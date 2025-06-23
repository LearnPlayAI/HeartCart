import { useEffect, useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Copy, Building2, MapPin, Clock, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

export default function PaymentConfirmation() {
  const [, navigate] = useLocation();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Get order data from sessionStorage
    const savedOrderData = sessionStorage.getItem('pendingOrder');
    if (savedOrderData) {
      const parsed = JSON.parse(savedOrderData);
      setOrderData(parsed);
      
      // Generate reference number
      const ref = `TMY${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
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
      return response.json();
    },
    onSuccess: (result) => {
      // Clear pending order data
      sessionStorage.removeItem('pendingOrder');
      
      // Clear cart and refresh queries
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      toast({
        title: "Order Created Successfully",
        description: "Your order has been created and is awaiting payment verification.",
        variant: "default"
      });
      
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
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
      variant: "default"
    });
  };

  const handleConfirmPayment = () => {
    if (orderData) {
      createOrderMutation.mutate(orderData);
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
                <label className="text-sm font-medium text-gray-600">Bank Name</label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-lg">Standard Bank</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard('Standard Bank', 'Bank name')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Account Name</label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-lg">TEE ME YOU (PTY) LTD</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard('TEE ME YOU (PTY) LTD', 'Account name')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Account Number</label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-lg">123456789</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard('123456789', 'Account number')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Branch Code</label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-lg">051001</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard('051001', 'Branch code')}
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
                  <li>3. Send proof of payment to: <strong>orders@teemeyou.shop</strong></li>
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
                  <MapPin className="w-5 h-5 mr-2" />
                  Collection Point
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{orderData.lockerDetails.name}</span>
                    <Badge variant="secondary">{orderData.lockerDetails.code}</Badge>
                  </div>
                  <p className="text-gray-600">{orderData.lockerDetails.address}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <Building2 className="w-4 h-4 mr-1" />
                    {orderData.lockerDetails.provider}
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
              <div className="space-y-3">
                {orderData.orderItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">Product {item.productId}</span>
                      <span className="text-gray-500 ml-2">x{item.quantity}</span>
                    </div>
                    <span>R{(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
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