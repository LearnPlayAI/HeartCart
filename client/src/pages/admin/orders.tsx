import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AdminLayout } from '@/components/admin/layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  Eye,
  LayoutGrid,
  Table as TableIcon,
  User,
  Mail,
  Phone,
  MapPin,
  Truck,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileText,
  Upload,
} from 'lucide-react';

// Types
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
  createdAt: string;
  product?: {
    id: number;
    name: string;
    imageUrl: string;
    price: number;
    salePrice?: number;
  };
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
  customerNotes?: string;
  adminNotes?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  eftPop?: string;
  paymentReceivedDate?: string;
  orderItems: OrderItem[];
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR'
  }).format(amount);
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
};

const getStatusConfig = (status: string) => {
  const configs = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    confirmed: { label: 'Payment Received', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
    processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Package },
    shipped: { label: 'Shipped', color: 'bg-green-100 text-green-800 border-green-200', icon: Truck },
    delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  };
  return configs[status as keyof typeof configs] || configs.pending;
};

const getPaymentStatusConfig = (paymentStatus: string) => {
  const configs = {
    pending: { label: 'Awaiting Payment', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    paid: { label: 'Payment Made', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Upload },
    payment_received: { label: 'Payment Received', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    failed: { label: 'Payment Failed', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  };
  return configs[paymentStatus as keyof typeof configs] || configs.pending;
};

// Order Statistics Component
function OrderStats({ orders, onFilterChange }: { orders: Order[]; onFilterChange: (filter: string) => void }) {
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const statCards = [
    { key: 'all', label: 'Total Orders', value: stats.total, color: 'bg-slate-100 text-slate-800 border-slate-200' },
    { key: 'pending', label: 'Pending', value: stats.pending, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { key: 'confirmed', label: 'Payment Received', value: stats.confirmed, color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { key: 'processing', label: 'Processing', value: stats.processing, color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { key: 'shipped', label: 'Shipped', value: stats.shipped, color: 'bg-green-100 text-green-800 border-green-200' },
    { key: 'delivered', label: 'Delivered', value: stats.delivered, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { key: 'cancelled', label: 'Cancelled', value: stats.cancelled, color: 'bg-red-100 text-red-800 border-red-200' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {statCards.map((stat) => (
        <Card 
          key={stat.key} 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onFilterChange(stat.key)}
        >
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className={`text-xs font-medium px-2 py-1 rounded-full ${stat.color}`}>
                {stat.label}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Order Card Component
function OrderCard({ order, onStatusUpdate }: { order: Order; onStatusUpdate: (orderId: number, status: string) => void }) {
  const statusConfig = getStatusConfig(order.status);
  const paymentConfig = getPaymentStatusConfig(order.paymentStatus);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Order #{order.orderNumber}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Badge className={`${statusConfig.color} border`}>
              <statusConfig.icon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
            <Badge className={`${paymentConfig.color} border`}>
              <paymentConfig.icon className="h-3 w-3 mr-1" />
              {paymentConfig.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{order.customerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{order.customerEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{order.customerPhone}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <div>{order.shippingAddress}</div>
                <div className="text-muted-foreground">
                  {order.shippingCity}, {order.shippingPostalCode}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{order.shippingMethod}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{order.paymentMethod}</span>
            </div>
          </div>
        </div>

        {/* EFT Payment Indicator */}
        {order.paymentMethod?.toLowerCase() === 'eft' && order.eftPop && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center">
              <FileText className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-800">
                Proof of Payment Uploaded
              </span>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {(order.orderItems || []).length} item(s)
            </span>
            <span className="font-semibold">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
          {order.trackingNumber && (
            <div className="text-sm text-muted-foreground mt-1">
              Tracking: {order.trackingNumber}
            </div>
          )}
        </div>

        {/* Status Update Section */}
        <div className="border-t pt-4 space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Update Status:</label>
            <Select
              value={order.status}
              onValueChange={(status) => onStatusUpdate(order.id, status)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="payment_received">Payment Received</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-2">
          <Link href={`/admin/orders/${order.id}`}>
            <Button size="sm" className="bg-[#ff1493] text-[#ffffff] hover:bg-[#ff1493]/90">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Order Table Component
function OrderTable({ orders, onStatusUpdate }: { orders: Order[]; onStatusUpdate: (orderId: number, status: string) => void }) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const paymentConfig = getPaymentStatusConfig(order.paymentStatus);
            
            return (
              <TableRow key={order.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">#{order.orderNumber}</div>
                    {order.trackingNumber && (
                      <div className="text-xs text-muted-foreground">
                        Track: {order.trackingNumber}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Badge className={`${statusConfig.color} border`}>
                      <statusConfig.icon className="h-3 w-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                    <Select
                      value={order.status}
                      onValueChange={(status) => onStatusUpdate(order.id, status)}
                    >
                      <SelectTrigger className="w-full h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="payment_received">Payment Received</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge className={`${paymentConfig.color} border`}>
                      <paymentConfig.icon className="h-3 w-3 mr-1" />
                      {paymentConfig.label}
                    </Badge>
                    {order.paymentMethod?.toLowerCase() === 'eft' && order.eftPop && (
                      <div className="flex items-center text-xs text-green-600">
                        <FileText className="h-3 w-3 mr-1" />
                        PDF Uploaded
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(order.totalAmount)}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(order.createdAt)}
                </TableCell>
                <TableCell>
                  <Link href={`/admin/orders/${order.id}`}>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

// Main Orders Page Component
export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const { toast } = useToast();

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/orders'],
    enabled: true,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data for long
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when reconnecting to network
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/orders/${orderId}/status`, { status });
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch orders list to update statistics and order display
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: "Order Updated",
        description: "Order status has been successfully updated.",
      });
    },
    onError: (error: any) => {
      console.error('Status update error:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update order status. Please try again.",
      });
    }
  });

  const orders = response?.data || [];
  
  // Handle status update
  const handleStatusUpdate = (orderId: number, status: string) => {
    updateStatusMutation.mutate({ orderId, status });
  };
  
  const filteredOrders = orders.filter((order: Order) => {
    if (statusFilter === "all") return true;
    return order.status === statusFilter;
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">View and manage customer orders</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={viewMode} onValueChange={(value: "cards" | "table") => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cards">
                <div className="flex items-center">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Cards
                </div>
              </SelectItem>
              <SelectItem value="table">
                <div className="flex items-center">
                  <TableIcon className="h-4 w-4 mr-2" />
                  Table
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <OrderStats orders={filteredOrders} onFilterChange={setStatusFilter} />

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
            <p className="text-muted-foreground text-center">
              {statusFilter === "all" 
                ? "No orders have been placed yet." 
                : `No orders found with status: ${statusFilter}`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {viewMode === "cards" ? (
            <div className="grid gap-6">
              {filteredOrders.map((order: Order) => (
                <OrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />
              ))}
            </div>
          ) : (
            <OrderTable orders={filteredOrders} onStatusUpdate={handleStatusUpdate} />
          )}
        </div>
      )}
      </div>
    </AdminLayout>
  );
}