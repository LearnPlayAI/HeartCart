import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, Truck, CreditCard, CalendarCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useDateFormat } from '@/hooks/use-date-format';

interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  combinationId: number | null;
  selectedAttributes: Record<string, string> | null;
  priceAdjustment: number | null;
  product: {
    id: number;
    name: string;
    imageUrl: string;
    price: number;
    salePrice: number | null;
  };
  attributeDetails?: {
    combination: any;
    attributes: Record<string, string>;
    categoryAttributes: Array<{
      id: number;
      name: string;
      required: boolean;
      displayOrder: number;
    }>;
  };
}

interface Order {
  id: number;
  userId: number;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  shippingMethod: string;
  paymentMethod: string;
  trackingNumber: string | null;
  createdAt: string;
  items: OrderItem[];
}

// Status badge styles based on status
const getStatusStyle = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'processing': 'bg-blue-100 text-blue-800',
    'shipped': 'bg-purple-100 text-purple-800',
    'delivered': 'bg-green-100 text-green-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800',
  };
  
  return statusMap[status] || 'bg-gray-100 text-gray-800';
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const orderId = parseInt(id);
  
  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ['/api/orders', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }
      return response.json();
    },
    enabled: !isNaN(orderId),
  });
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex items-start space-x-4">
                    <Skeleton className="h-16 w-16 rounded-md" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center pt-6">
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              We couldn't find the order you're looking for. It may have been removed or you may have followed an invalid link.
            </p>
            <Button asChild>
              <a href="/profile">Back to Orders</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const { formatDate } = useDateFormat();
  const orderDate = formatDate(order.createdAt);
  
  // Format status for display (capitalize first letter)
  const formattedStatus = order.status.charAt(0).toUpperCase() + order.status.slice(1);
  
  return (
    <>
      <Helmet>
        <title>Order #{order.id} - TEE ME YOU</title>
        <meta name="description" content={`View details for your order #${order.id} placed on ${orderDate}`} />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/profile">Your Account</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>Order #{order.id}</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="flex flex-col gap-6">
          {/* Order Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Order #{order.id}</h1>
              <p className="text-muted-foreground">Placed on {orderDate}</p>
            </div>
            <Badge className={`text-sm px-3 py-1 ${getStatusStyle(order.status)}`}>
              {formattedStatus}
            </Badge>
          </div>
          
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>Review your order details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">Delivery Information</h3>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-start mb-2">
                      <Package className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />
                      <div>
                        <p className="font-medium">Shipping Method</p>
                        <p className="text-sm text-gray-600">{order.shippingMethod}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Truck className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />
                      <div>
                        <p className="font-medium">Delivery Address</p>
                        <p className="text-sm text-gray-600">{order.shippingAddress}</p>
                      </div>
                    </div>
                    {order.trackingNumber && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-md text-sm">
                        <span className="font-medium">Tracking #:</span> {order.trackingNumber}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Payment Information</h3>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-start mb-2">
                      <CreditCard className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />
                      <div>
                        <p className="font-medium">Payment Method</p>
                        <p className="text-sm text-gray-600">{order.paymentMethod}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CalendarCheck className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />
                      <div>
                        <p className="font-medium">Payment Date</p>
                        <p className="text-sm text-gray-600">{orderDate}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>
                {order.items.length} {order.items.length === 1 ? 'item' : 'items'} in your order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <img 
                      src={item.product.imageUrl} 
                      alt={item.product.name} 
                      className="w-20 h-20 object-cover rounded-md border border-gray-200"
                    />
                    <div className="ml-4 flex-1">
                      <h4 className="font-medium">{item.product.name}</h4>
                      
                      {/* Display selected attributes with better styling */}
                      {(item.selectedAttributes || (item.attributeDetails?.attributes)) && (
                        <div className="mt-1 mb-2">
                          {Object.entries(item.selectedAttributes || item.attributeDetails?.attributes || {}).map(([key, value], index) => {
                            // Try to get the formal attribute name from attributeDetails if available
                            let attributeName = key;
                            if (item.attributeDetails?.categoryAttributes) {
                              const matchingAttr = item.attributeDetails.categoryAttributes.find(
                                attr => attr.id.toString() === key || attr.name === key
                              );
                              if (matchingAttr) {
                                attributeName = matchingAttr.name;
                              }
                            }
                            
                            return (
                              <div key={index} className="flex items-center mt-1">
                                <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded-md mr-2">
                                  {attributeName}:
                                </span>
                                <span className="text-xs text-gray-600">{value}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      <div className="flex items-baseline mt-1">
                        <span className="text-sm text-[#FF69B4] font-medium mr-3">
                          {formatCurrency(item.price)}
                        </span>
                        <span className="text-xs text-gray-500">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                      
                      {/* Show price adjustment if any */}
                      {item.priceAdjustment && item.priceAdjustment !== 0 && (
                        <div className="text-xs text-gray-600 mt-1">
                          Incl. {formatCurrency(item.priceAdjustment)} adjustment
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Order Total */}
              <div className="border-t border-gray-200 mt-6 pt-4">
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span className="text-[#FF69B4]">{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Action Buttons */}
          <div className="flex justify-between mt-4">
            <Button variant="outline" asChild>
              <a href="/profile">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </a>
            </Button>
            
            <Button variant="outline" asChild>
              <a href="/" className="text-[#FF69B4]">
                Continue Shopping
              </a>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}