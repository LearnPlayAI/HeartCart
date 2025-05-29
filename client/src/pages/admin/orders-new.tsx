import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  MapPin,
  User,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  Filter,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Types based on the new schema
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
  customerNotes?: string;
  adminNotes?: string;
  trackingNumber?: string;
  createdAt: string;
  orderItems?: OrderItem[];
}

interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  productSku?: string;
  productImageUrl?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedAttributes: Record<string, any>;
  attributeDisplayText?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR'
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
};

const statusIcons = {
  pending: Clock,
  confirmed: CheckCircle,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle
};

const paymentStatusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800"
};

function OrderDetails({ order }: { order: Order }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      return await apiRequest(`/api/admin/orders/${orderId}/status`, 'PATCH', { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({ description: "Order status updated successfully" });
    },
    onError: () => {
      toast({ 
        variant: "destructive",
        description: "Failed to update order status" 
      });
    }
  });

  const updateTrackingMutation = useMutation({
    mutationFn: async ({ orderId, trackingNumber }: { orderId: number; trackingNumber: string }) => {
      return await apiRequest(`/api/admin/orders/${orderId}/tracking`, 'PATCH', { trackingNumber });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({ description: "Tracking number updated successfully" });
    },
    onError: () => {
      toast({ 
        variant: "destructive",
        description: "Failed to update tracking number" 
      });
    }
  });

  const [trackingInput, setTrackingInput] = useState(order.trackingNumber || "");

  const StatusIcon = statusIcons[order.status as keyof typeof statusIcons] || Clock;

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">Order {order.orderNumber}</h3>
          <p className="text-sm text-muted-foreground">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon className="h-4 w-4" />
          <Select
            defaultValue={order.status}
            onValueChange={(value) => 
              updateStatusMutation.mutate({ orderId: order.id, status: value })
            }
            disabled={updateStatusMutation.isPending}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="customer">Customer</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
        </TabsList>

        {/* Order Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.orderItems && order.orderItems.length > 0 ? (
                  order.orderItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                        {item.productImageUrl ? (
                          <img
                            src={item.productImageUrl}
                            alt={item.productName}
                            className="h-full w-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.productName}</h4>
                        {item.productSku && (
                          <p className="text-sm text-muted-foreground">SKU: {item.productSku}</p>
                        )}
                        {item.attributeDisplayText && (
                          <p className="text-sm text-muted-foreground">{item.attributeDisplayText}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Qty: {item.quantity}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(item.unitPrice)} each</p>
                        <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No items found for this order
                  </div>
                )}
                
                <Separator />
                
                {/* Order Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(order.subtotalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>{formatCurrency(order.shippingCost)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Tab */}
        <TabsContent value="customer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{order.customerName}</p>
                    <p className="text-sm text-muted-foreground">Customer Name</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{order.customerEmail}</p>
                    <p className="text-sm text-muted-foreground">Email Address</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{order.customerPhone}</p>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{order.paymentMethod}</span>
                      <Badge className={paymentStatusColors[order.paymentStatus as keyof typeof paymentStatusColors]}>
                        {order.paymentStatus}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Payment</p>
                  </div>
                </div>
              </div>
              
              {order.customerNotes && (
                <div>
                  <h4 className="font-medium mb-2">Customer Notes</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {order.customerNotes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Tab */}
        <TabsContent value="shipping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="font-medium">Delivery Address</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>{order.shippingAddress}</p>
                      <p>{order.shippingCity}, {order.shippingPostalCode}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium capitalize">{order.shippingMethod}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(order.shippingCost)}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Tracking Information</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter tracking number"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                  />
                  <Button
                    onClick={() => updateTrackingMutation.mutate({ 
                      orderId: order.id, 
                      trackingNumber: trackingInput 
                    })}
                    disabled={updateTrackingMutation.isPending}
                  >
                    Update
                  </Button>
                </div>
                {order.trackingNumber && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Current: {order.trackingNumber}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['/api/admin/orders'],
    queryFn: () => apiRequest('/api/admin/orders')
  });

  const filteredOrders = orders?.filter((order: Order) => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || order.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  }) || [];

  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter((o: Order) => o.status === 'pending').length || 0,
    processing: orders?.filter((o: Order) => ['confirmed', 'processing'].includes(o.status)).length || 0,
    shipped: orders?.filter((o: Order) => o.status === 'shipped').length || 0,
    delivered: orders?.filter((o: Order) => o.status === 'delivered').length || 0
  };

  if (error) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Orders</h1>
          </div>
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-lg font-medium">Failed to load orders</p>
                <p className="text-muted-foreground">Please try again later</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold">Orders</h1>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Shipped</p>
                <p className="text-2xl font-bold text-orange-600">{stats.shipped}</p>
              </div>
              <Truck className="h-8 w-8 text-orange-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders, customers, or order numbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Order Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="divide-y">
                {filteredOrders.map((order: Order) => {
                  const StatusIcon = statusIcons[order.status as keyof typeof statusIcons] || Clock;
                  
                  return (
                    <div key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{order.orderNumber}</h3>
                            <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {order.status}
                            </Badge>
                            <Badge className={paymentStatusColors[order.paymentStatus as keyof typeof paymentStatusColors]}>
                              {order.paymentStatus}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="truncate">{order.customerName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(order.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
                            </div>
                          </div>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh]">
                            <DialogHeader>
                              <DialogTitle>Order Details</DialogTitle>
                              <DialogDescription>
                                View and manage order information
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[calc(90vh-120px)]">
                              {selectedOrder && <OrderDetails order={selectedOrder} />}
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No orders found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || paymentFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Orders will appear here when customers place them"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}