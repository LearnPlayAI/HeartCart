import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Package, MapPin, CreditCard, Truck, Check, Clock, User, Mail, Phone, Upload, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";

interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  productSku: string;
  productImageUrl: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedAttributes: Record<string, string | Record<string, number>> | null;
  attributeDisplayText: string | null;
  createdAt: string;
}

interface Order {
  id: number;
  userId: number;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingMethod: string;
  shippingCost: number;
  paymentMethod: string;
  paymentStatus: string;
  subtotalAmount: number;
  totalAmount: number;
  customerNotes: string | null;
  adminNotes: string | null;
  trackingNumber: string | null;
  selectedLockerId: number | null;
  lockerDetails: {
    code: string;
    name: string;
    address: string;
    provider: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: OrderItem[];
}

const getStatusIcon = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return <Clock className="h-4 w-4" />;
    case 'confirmed':
    case 'processing':
      return <Package className="h-4 w-4" />;
    case 'shipped':
      return <Truck className="h-4 w-4" />;
    case 'delivered':
      return <Check className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'confirmed':
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'shipped':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'delivered':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function OrderConfirmationPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const orderId = params.id;

  // Fetch order details using the individual order endpoint
  const { data: orderData, isLoading, error } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId,
    retry: 1
  });

  // Extract order from response - handle both nested and direct response structures
  const order = orderData?.data || orderData;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading your order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find the order you're looking for. It may have been moved or doesn't exist.
            </p>
            <Button onClick={() => navigate('/my-orders')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              View All Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/my-orders')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Orders</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div className="text-right">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                Order {order.orderNumber || 'N/A'}
              </h1>
              <p className="text-sm text-gray-600">
                {order.createdAt ? formatDate(order.createdAt) : 'Date unavailable'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* Order Status Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  {getStatusIcon(order.status)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Order Status</h2>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown'}
                  </Badge>
                  {order.paymentMethod?.toLowerCase() === 'eft' && (
                    <div className="mt-3">
                      <Button 
                        onClick={() => navigate(`/order/${order.id}`)}
                        size="sm"
                        className="bg-pink-500 hover:bg-pink-600 text-white"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Take me to EFT details
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              {order.trackingNumber && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Tracking Number</p>
                  <p className="font-mono text-sm font-medium">{order.trackingNumber}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Items ({order.items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <div key={item.id || index}>
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          {item.productImageUrl ? (
                            <img
                              src={item.productImageUrl}
                              alt={item.productName || 'Product'}
                              className="w-16 h-16 object-cover rounded-lg border"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {item.productName || 'Product Name Unavailable'}
                          </h3>
                          {item.productSku && (
                            <p className="text-sm text-gray-600">SKU: {item.productSku}</p>
                          )}
                          {/* Display selected attributes with quantity breakdown */}
                          {item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0 && (
                            <div className="text-xs text-gray-600 mt-1">
                              {Object.entries(item.selectedAttributes).map(([attributeName, value]) => {
                                return (
                                  <div key={attributeName} className="flex items-center gap-1 flex-wrap mb-1">
                                    <span className="font-medium">{attributeName}:</span>
                                    <div className="flex gap-1 flex-wrap">
                                      {typeof value === 'object' && value !== null ? (
                                        // Handle quantity-based attributes like {"Boy": 2, "Girl": 1}
                                        Object.entries(value as Record<string, number>)
                                          .filter(([, qty]) => qty > 0)
                                          .map(([optionValue, count]) => (
                                            <span 
                                              key={optionValue} 
                                              className="inline-flex items-center px-2 py-0.5 rounded bg-[#ff69b4] text-[#ffffff] text-xs"
                                            >
                                              {optionValue} x{count}
                                            </span>
                                          ))
                                      ) : (
                                        // Handle simple string values
                                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#ff69b4] text-[#ffffff] text-xs">
                                          {String(value)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {/* Fallback to display text if no structured attributes */}
                          {(!item.selectedAttributes || Object.keys(item.selectedAttributes).length === 0) && item.attributeDisplayText && (
                            <p className="text-sm text-gray-600">{item.attributeDisplayText}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm text-gray-600">
                              Qty: {item.quantity || 0}
                            </span>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">
                                R{(item.unitPrice || 0).toFixed(2)} each
                              </p>
                              <p className="font-medium text-gray-900">
                                R{(item.totalPrice || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < (order.items?.length || 0) - 1 && <Separator className="mt-4" />}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No items found for this order</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Notes */}
            {order.customerNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    Special Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">
                    "{order.customerNotes}"
                  </p>
                </CardContent>
              </Card>
            )}

            {/* PUDO Locker Details */}
            {order.shippingMethod === 'pudo' && order.lockerDetails && (
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
                        <span className="font-semibold">{order.lockerDetails.name}</span>
                        <Badge variant="secondary">{order.lockerDetails.code}</Badge>
                      </div>
                      <p className="text-gray-600 flex items-start">
                        <MapPin className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                        {order.lockerDetails.address}
                      </p>
                      <div className="flex items-center text-sm text-gray-500">
                        <Building2 className="w-4 h-4 mr-1" />
                        {order.lockerDetails.provider}
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

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>R{(order.subtotalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping:</span>
                    <span>R{(order.shippingCost || 0).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span>R{(order.totalAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {order.customerName || 'Name not provided'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {order.customerEmail || 'Email not provided'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {order.customerPhone || 'Phone not provided'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" />
                  Shipping Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {order.shippingMethod || 'Shipping method not specified'}
                  </p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{order.shippingAddress || 'Address not provided'}</p>
                    <p>
                      {order.shippingCity || 'City not provided'} {order.shippingPostalCode || ''}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-medium">
                      {order.paymentMethod || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                      {order.paymentStatus ? 
                        order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1) : 
                        'Unknown'
                      }
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/orders')}
            className="flex-1 sm:flex-none"
          >
            View All Orders
          </Button>
          <Button 
            onClick={() => navigate('/')}
            className="flex-1 sm:flex-none"
          >
            Continue Shopping
          </Button>
        </div>

      </div>
    </div>
  );
}