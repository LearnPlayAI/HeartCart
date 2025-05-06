import React, { useState } from 'react';
import AdminLayout from '@/components/layout/admin-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ShoppingBag,
  Search,
  MoreHorizontal,
  Eye,
  Mail,
  Printer,
  ArrowUpDown,
  Calendar,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Package,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Order status type
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// Order detail type
interface OrderDetail {
  id: number;
  orderId: number;
  userId: number;
  username: string;
  email: string;
  orderNumber: string;
  orderDate: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'failed';
  shippingMethod: string;
  shippingStatus: string;
  shippingAddress: string;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  items: OrderItem[];
}

// Order item type
interface OrderItem {
  id: number;
  productId: number;
  name: string;
  imageUrl: string | null;
  price: number;
  quantity: number;
}

function OrdersPage() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Fetch orders from API
  const { data: orders = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/admin/orders'],
  });
  
  // Handle error
  React.useEffect(() => {
    if (error) {
      toast({
        title: 'Failed to load orders',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  // Function to view order details
  const viewOrderDetails = (order: any) => {
    // In a real application, we would fetch detailed order information here
    // For now, we'll use mock data
    
    // Construct order details from the order data
    const orderDetail: OrderDetail = {
      id: order.id,
      orderId: order.id,
      userId: order.userId,
      username: order.user?.username || 'Unknown',
      email: order.user?.email || 'Unknown',
      orderNumber: `ORD-${order.id.toString().padStart(6, '0')}`,
      orderDate: new Date(order.createdAt).toLocaleDateString(),
      status: order.status || 'pending',
      paymentMethod: order.paymentMethod || 'Credit Card',
      paymentStatus: order.paymentStatus || 'paid',
      shippingMethod: order.shippingMethod || 'Standard Shipping',
      shippingStatus: order.shippingStatus || 'Processing',
      shippingAddress: order.shippingAddress || 'Customer address',
      subtotal: order.subtotal || 0,
      shippingCost: order.shippingCost || 0,
      tax: order.tax || 0,
      total: order.total || 0,
      items: order.items || [],
    };
    
    setSelectedOrder(orderDetail);
    setIsDetailsDialogOpen(true);
  };
  
  // Get status badge
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Processing</Badge>;
      case 'shipped':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">Shipped</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Delivered</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <Package className="h-5 w-5 text-blue-500" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-purple-500" />;
      case 'delivered':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Orders</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              type="search" 
              placeholder="Search orders..." 
              className="pl-8"
            />
          </div>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Date Range
          </Button>
          <Button variant="outline">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            Sort
          </Button>
        </div>
        
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Orders</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="shipped">Shipped</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Orders</CardTitle>
                <CardDescription>
                  View and manage all customer orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <ShoppingBag className="h-12 w-12 mx-auto opacity-50" />
                    <p className="mt-2">No orders found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 text-left">Order #</th>
                          <th className="py-3 text-left">Customer</th>
                          <th className="py-3 text-left">Date</th>
                          <th className="py-3 text-right">Total</th>
                          <th className="py-3 text-center">Status</th>
                          <th className="py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr 
                            key={order.id} 
                            className="border-b hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-3 text-left font-medium">
                              {`ORD-${order.id.toString().padStart(6, '0')}`}
                            </td>
                            <td className="py-3 text-left">
                              {order.user?.username || 'Unknown'}
                            </td>
                            <td className="py-3 text-left">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-right font-medium">
                              {formatCurrency(order.total)}
                            </td>
                            <td className="py-3 text-center">
                              {getStatusBadge(order.status || 'pending')}
                            </td>
                            <td className="py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => viewOrderDetails(order)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    <span>View Details</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Printer className="mr-2 h-4 w-4" />
                                    <span>Print</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Mail className="mr-2 h-4 w-4" />
                                    <span>Email Customer</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Other tabs will be implemented similarly */}
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Orders</CardTitle>
                <CardDescription>
                  Orders awaiting payment or processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-gray-500">
                  <ShoppingBag className="h-12 w-12 mx-auto opacity-50" />
                  <p className="mt-2">Pending orders will be listed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Order details dialog */}
          <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Order Details: {selectedOrder?.orderNumber}
                </DialogTitle>
                <DialogDescription>
                  Complete information about this order.
                </DialogDescription>
              </DialogHeader>
              
              {selectedOrder && (
                <div className="mt-4 space-y-6">
                  {/* Order summary */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Customer Information</h3>
                      <div className="mt-2">
                        <p className="text-sm">{selectedOrder.username}</p>
                        <p className="text-sm">{selectedOrder.email}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Order Information</h3>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Date Placed:</span>
                          <span>{selectedOrder.orderDate}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Status:</span>
                          <span className="flex items-center">
                            {getStatusIcon(selectedOrder.status)}
                            <span className="ml-1">{selectedOrder.status}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Order items */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Order Items</h3>
                    <div className="border rounded-md">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="py-2 px-4 text-left">Product</th>
                            <th className="py-2 px-4 text-right">Price</th>
                            <th className="py-2 px-4 text-right">Quantity</th>
                            <th className="py-2 px-4 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items.map((item) => (
                            <tr key={item.id} className="border-b">
                              <td className="py-3 px-4 text-left">
                                <div className="flex items-center">
                                  {item.imageUrl && (
                                    <div className="h-10 w-10 mr-3 rounded bg-gray-100 overflow-hidden">
                                      <img 
                                        src={item.imageUrl} 
                                        alt={item.name}
                                        className="h-full w-full object-cover"
                                        onError={(e) => { 
                                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                                        }}
                                      />
                                    </div>
                                  )}
                                  <span>{item.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {formatCurrency(item.price)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {item.quantity}
                              </td>
                              <td className="py-3 px-4 text-right font-medium">
                                {formatCurrency(item.price * item.quantity)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Order summary */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between mt-1 text-sm">
                      <span>Shipping</span>
                      <span>{formatCurrency(selectedOrder.shippingCost)}</span>
                    </div>
                    <div className="flex justify-between mt-1 text-sm">
                      <span>Tax</span>
                      <span>{formatCurrency(selectedOrder.tax)}</span>
                    </div>
                    <div className="flex justify-between mt-3 text-base font-medium">
                      <span>Total</span>
                      <span>{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>
                  
                  {/* Shipping information */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Shipping Information</h3>
                    <div className="text-sm">
                      <p className="mb-1"><span className="font-medium">Method:</span> {selectedOrder.shippingMethod}</p>
                      <p className="mb-1"><span className="font-medium">Status:</span> {selectedOrder.shippingStatus}</p>
                      <p><span className="font-medium">Address:</span> {selectedOrder.shippingAddress}</p>
                    </div>
                  </div>
                  
                  {/* Payment information */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Payment Information</h3>
                    <div className="text-sm">
                      <p className="mb-1"><span className="font-medium">Method:</span> {selectedOrder.paymentMethod}</p>
                      <p>
                        <span className="font-medium">Status:</span> 
                        <Badge 
                          variant={selectedOrder.paymentStatus === 'paid' ? 'default' : 'destructive'}
                          className={selectedOrder.paymentStatus === 'paid' ? 'bg-green-500 hover:bg-green-600 ml-2' : 'ml-2'}
                        >
                          {selectedOrder.paymentStatus}
                        </Badge>
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex justify-end space-x-2 border-t pt-4">
                    <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                      Close
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex items-center"
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

export default OrdersPage;