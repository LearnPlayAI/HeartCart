import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  Package, 
  Truck, 
  CreditCard, 
  MapPin, 
  Phone, 
  Mail,
  Calendar,
  Building2,
  Banknote
} from "lucide-react";

export default function OrderConfirmationPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const orderId = params.id;

  // Fetch order details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-4">
              We couldn't find the order you're looking for.
            </p>
            <Button onClick={() => navigate("/")}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getShippingIcon = (method: string) => {
    switch (method) {
      case "courier": return Truck;
      case "collection": return Building2;
      default: return Package;
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "card": return CreditCard;
      case "cod": return Package;
      default: return Banknote;
    }
  };

  const getShippingLabel = (method: string) => {
    switch (method) {
      case "pudo": return "PUDO Lockers";
      case "courier": return "Door-to-Door Courier";
      case "collection": return "Store Collection";
      default: return method;
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case "eft": return "EFT Bank Transfer";
      case "card": return "Credit/Debit Card";
      case "cod": return "Cash on Delivery";
      default: return method;
    }
  };

  const ShippingIcon = getShippingIcon(order.shippingMethod);
  const PaymentIcon = getPaymentIcon(order.paymentMethod);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Success Header */}
        <div className="text-center mb-8">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-3xl font-bold text-green-600 mb-2">
            Order Confirmed!
          </h1>
          <p className="text-gray-600">
            Thank you for your order. We'll send you updates via email.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Order Details */}
          <div className="space-y-6">
            
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Order Number:</span>
                    <span className="font-mono">#{order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Order Date:</span>
                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <Badge variant={order.status === "pending" ? "secondary" : "default"}>
                      {order.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total Amount:</span>
                    <span className="font-bold text-lg">R{(order.totalAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShippingIcon className="h-5 w-5" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="font-medium">{getShippingLabel(order.shippingMethod)}</div>
                  <div className="text-sm text-gray-600">
                    {order.shippingMethod === "pudo" && "Collect from nearest PUDO locker"}
                    {order.shippingMethod === "courier" && "Direct delivery to your address"}
                    {order.shippingMethod === "collection" && "Collect from our warehouse"}
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-gray-500" />
                    <div>
                      <div className="font-medium">Delivery Address</div>
                      <div className="text-sm text-gray-600">
                        {order.shippingAddress}<br />
                        {order.shippingCity}, {order.shippingProvince || 'Gauteng'}<br />
                        {order.shippingPostalCode}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PaymentIcon className="h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="font-medium">{getPaymentLabel(order.paymentMethod)}</div>
                    <div className="text-sm text-gray-600">
                      {order.paymentMethod === "eft" && "You will receive payment instructions via email"}
                      {order.paymentMethod === "card" && "Payment processed securely"}
                      {order.paymentMethod === "cod" && "Pay when you receive your order"}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>R{(order.subtotalAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping:</span>
                      <span>{order.shippingCost === 0 ? "Free" : `R${(order.shippingCost || 0).toFixed(2)}`}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>R{(order.totalAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Items & Customer Info */}
          <div className="space-y-6">
            
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{item.product?.name || item.productName}</div>
                        <div className="text-sm text-gray-600">
                          Qty: {item.quantity} × R{(item.unitPrice || 0).toFixed(2)}
                        </div>
                        {/* Show product attributes if they exist */}
                        {item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0 && (
                          <div className="mt-1 space-x-1">
                            {Object.entries(item.selectedAttributes).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}: {String(value)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="font-medium">
                        R{(item.totalPrice || item.quantity * (item.unitPrice || 0)).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{order.customerEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{order.customerPhone}</span>
                </div>
                <div className="text-sm">
                  <strong>{order.customerName}</strong>
                </div>
              </CardContent>
            </Card>

            {/* Special Instructions */}
            {order.customerNotes && (
              <Card>
                <CardHeader>
                  <CardTitle>Special Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{order.customerNotes}</p>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={() => navigate("/")} 
                className="w-full"
              >
                Continue Shopping
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate("/orders")} 
                className="w-full"
              >
                View Order History
              </Button>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• You'll receive an email confirmation shortly</p>
              <p>• We'll notify you when your order is processed and shipped</p>
              <p>• Track your order status in your account dashboard</p>
              {order.paymentMethod === "eft" && (
                <p>• Payment instructions will be sent to your email</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}