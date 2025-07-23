import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2,
  Mail,
  Phone,
  Package
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CorporateOrder {
  id: number;
  orderNumber: string;
  companyName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string | null;
  totalInvoiceAmount: string;
  paymentStatus: string;
  status: string;
  items: Array<{
    id: number;
    productName: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    employeeName: string;
  }>;
}

export default function CorporatePaymentPage() {
  const { corporateOrderId } = useParams<{ corporateOrderId: string }>();
  const [location] = useLocation();
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  // Parse status from URL query params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const status = urlParams.get('status');
    if (status) {
      setPaymentStatus(status);
    }
  }, [location]);

  // Fetch corporate order details
  const { data: order, isLoading: orderLoading, error: orderError } = useQuery<CorporateOrder>({
    queryKey: [`/api/admin/corporate-orders/${corporateOrderId}`],
    enabled: !!corporateOrderId,
  });

  // Create Yoco checkout session
  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/payments/corporate/${corporateOrderId}/card/checkout`);
      return response;
    },
    onSuccess: (data) => {
      // Redirect to Yoco checkout page
      window.location.href = data.redirectUrl;
    },
  });

  if (orderLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-2" />
            <CardTitle className="text-red-600">Order Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-center">
              The corporate order could not be found or you don't have permission to access it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment success state
  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <CardTitle className="text-green-600">Payment Successful!</CardTitle>
            <CardDescription>
              Your payment has been processed successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Order Number:</p>
              <p className="font-semibold text-lg">{order.orderNumber}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Amount Paid:</p>
              <p className="font-bold text-xl text-green-600">
                {formatCurrency(parseFloat(order.totalInvoiceAmount))}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Thank you for your payment! You will receive a confirmation email shortly. 
                Our team will process your order and coordinate delivery to your employees.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment failed state
  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-2" />
            <CardTitle className="text-red-600">Payment Failed</CardTitle>
            <CardDescription>
              There was an issue processing your payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                Your payment could not be processed. Please try again or contact us at sales@heartcart.shop for assistance.
              </p>
            </div>
            <Button 
              onClick={() => setPaymentStatus(null)}
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment cancelled state
  if (paymentStatus === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Clock className="h-12 w-12 text-orange-600 mx-auto mb-2" />
            <CardTitle className="text-orange-600">Payment Cancelled</CardTitle>
            <CardDescription>
              You cancelled the payment process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                Your payment was cancelled. You can try again when you're ready, or contact us for alternative payment options.
              </p>
            </div>
            <Button 
              onClick={() => setPaymentStatus(null)}
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAmount = parseFloat(order.totalInvoiceAmount);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Corporate Order Payment</h1>
          <p className="text-gray-600">
            Secure payment for order {order.orderNumber}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Order Details */}
          <div className="space-y-6">
            
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold">{order.companyName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{order.contactEmail}</span>
                </div>
                {order.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{order.contactPhone}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Contact Person:</p>
                  <p className="font-medium">{order.contactPerson}</p>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Items ({order.items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-gray-600">For: {item.employeeName}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(parseFloat(item.totalPrice))}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount:</span>
                    <span className="text-pink-600">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Section */}
          <div className="space-y-6">
            
            {/* Payment Status */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                    {order.paymentStatus === 'paid' ? 'Paid' : 'Pending Payment'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Payment Options */}
            {order.paymentStatus !== 'paid' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Secure Card Payment
                  </CardTitle>
                  <CardDescription>
                    Pay securely with your credit or debit card
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium mb-2">Secure Payment</p>
                    <p className="text-sm text-green-700">
                      Your payment is processed securely through Yoco. Your card details are never stored on our servers.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="font-semibold">Amount to Pay:</p>
                    <p className="text-2xl font-bold text-pink-600">{formatCurrency(totalAmount)}</p>
                  </div>
                  
                  <Button 
                    onClick={() => createCheckoutMutation.mutate()}
                    disabled={createCheckoutMutation.isPending}
                    className="w-full bg-pink-600 hover:bg-pink-700"
                    size="lg"
                  >
                    {createCheckoutMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay Now
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Alternative Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle>Alternative Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  You can also pay via bank transfer (EFT). Banking details were provided in your payment options email.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Need help?</strong> Contact us at sales@heartcart.shop for assistance with payment options.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}