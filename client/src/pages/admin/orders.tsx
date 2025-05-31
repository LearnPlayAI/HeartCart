import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  RefreshCw,
  DollarSign,
  AlertCircle,
  Package2,
  Grid3X3,
  List,
  FileText,
  Download,
  Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// Types matching the API response structure
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
  orderItems: OrderItem[];
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

// Helper functions
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

const getStatusConfig = (status: string) => {
  const configs = {
    pending: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Clock,
      label: "Pending"
    },
    confirmed: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: CheckCircle,
      label: "Payment Received"
    },
    processing: {
      color: "bg-purple-100 text-purple-800 border-purple-200",
      icon: Package,
      label: "Processing"
    },
    shipped: {
      color: "bg-orange-100 text-orange-800 border-orange-200",
      icon: Truck,
      label: "Shipped"
    },
    delivered: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle,
      label: "Delivered"
    },
    cancelled: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: XCircle,
      label: "Cancelled"
    }
  };
  return configs[status as keyof typeof configs] || configs.pending;
};

const getPaymentStatusConfig = (status: string) => {
  const configs = {
    pending: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Clock,
      label: "Pending"
    },
    paid: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle,
      label: "Paid"
    },
    failed: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: XCircle,
      label: "Failed"
    }
  };
  return configs[status as keyof typeof configs] || configs.pending;
};

// Order Statistics Component
function OrderStats({ orders, onFilterChange }: { orders: Order[]; onFilterChange: (filter: string) => void }) {
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
    totalPaymentsReceived: orders.filter(o => ['confirmed', 'processing', 'shipped', 'delivered'].includes(o.status)).reduce((sum, o) => sum + o.totalAmount, 0),
    totalPaymentsPending: orders.filter(o => o.status === 'pending').reduce((sum, o) => sum + o.totalAmount, 0),
    pendingPayments: orders.filter(o => o.status === 'pending').length
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Main statistics row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("all")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("pending")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("processing")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.processing}</p>
                <p className="text-xs text-muted-foreground">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("shipped")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Truck className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.shipped}</p>
                <p className="text-xs text-muted-foreground">Shipped</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("delivered")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.delivered}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("pending")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingPayments}</p>
                <p className="text-xs text-muted-foreground">Pending Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Revenue row - wider and separate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("confirmed")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalPaymentsReceived)}</p>
                <p className="text-sm text-muted-foreground">Total Payments Received</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("pending")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalPaymentsPending)}</p>
                <p className="text-sm text-muted-foreground">Total Payments Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Order Card Component
function OrderCard({ order, onViewDetails }: { order: Order; onViewDetails: (order: Order) => void }) {
  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm text-blue-600">#{order.orderNumber}</h3>
              <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
            </div>
            <div className="flex items-end">
              <Badge className={`${statusConfig.color} border text-xs`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          {/* Customer Info */}
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{order.customerName}</p>
              <p className="text-xs text-muted-foreground truncate">{order.customerEmail}</p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Package2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {order.orderItems?.length || 0} item{(order.orderItems?.length || 0) !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{formatCurrency(order.totalAmount)}</p>
              {order.shippingMethod && (
                <p className="text-xs text-muted-foreground capitalize">{order.shippingMethod}</p>
              )}
            </div>
          </div>

          {/* Action Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(order)}
            className="w-full"
          >
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Order Details Dialog Component
function OrderDetailsDialog({ order, open, onOpenChange }: { 
  order: Order | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [trackingInput, setTrackingInput] = useState("");
  const [paymentReceivedDate, setPaymentReceivedDate] = useState(new Date().toISOString().split('T')[0]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/orders/${orderId}/status`, { status });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
    },
    onError: (error) => {
      console.error('Status update error:', error);
      toast({ 
        variant: "destructive",
        description: "Failed to update order status" 
      });
    }
  });

  const updateTrackingMutation = useMutation({
    mutationFn: async ({ orderId, trackingNumber }: { orderId: number; trackingNumber: string }) => {
      return await apiRequest('PATCH', `/api/admin/orders/${orderId}/tracking`, { trackingNumber });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      setTrackingInput("");
    },
    onError: () => {
      toast({ 
        variant: "destructive",
        description: "Failed to update tracking number" 
      });
    }
  });

  const markPaymentReceivedMutation = useMutation({
    mutationFn: async ({ orderId, paymentReceivedDate }: { orderId: number; paymentReceivedDate: string }) => {
      const response = await apiRequest('POST', `/api/orders/${orderId}/admin/payment-received`, { paymentReceivedDate });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({ 
        description: "Payment marked as received and order moved to processing" 
      });
    },
    onError: (error) => {
      console.error('Payment received update error:', error);
      toast({ 
        variant: "destructive",
        description: "Failed to mark payment as received" 
      });
    }
  });

  if (!order) return null;

  const statusConfig = getStatusConfig(order.status);
  const paymentConfig = getPaymentStatusConfig(order.paymentStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Order #{order.orderNumber}</span>
          </DialogTitle>
          <DialogDescription>
            Order placed on {formatDate(order.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6 p-1">
            {/* Status and Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Badge className={`${statusConfig.color} border`}>
                      <statusConfig.icon className="h-4 w-4 mr-1" />
                      {statusConfig.label}
                    </Badge>
                    <Badge className={`${paymentConfig.color} border`}>
                      <paymentConfig.icon className="h-4 w-4 mr-1" />
                      {paymentConfig.label}
                    </Badge>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Update Status:</label>
                    <Select
                      value={order.status}
                      onValueChange={(status) => updateStatusMutation.mutate({ orderId: order.id, status })}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Payment Received</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tracking Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.trackingNumber && (
                    <div>
                      <label className="text-sm font-medium">Current Tracking Number:</label>
                      <p className="text-sm bg-muted p-2 rounded mt-1">{order.trackingNumber}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium">Update Tracking Number:</label>
                    <div className="flex space-x-2 mt-1">
                      <Input
                        placeholder="Enter tracking number"
                        value={trackingInput}
                        onChange={(e) => setTrackingInput(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => updateTrackingMutation.mutate({ 
                          orderId: order.id, 
                          trackingNumber: trackingInput 
                        })}
                        disabled={updateTrackingMutation.isPending || !trackingInput.trim()}
                      >
                        Update
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* EFT Payment Proof Management */}
              {order.paymentMethod?.toLowerCase() === 'eft' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5" />
                      <span>EFT Payment Management</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Payment Status:</p>
                        <Badge variant={order.paymentStatus === 'payment_received' ? 'default' : 'secondary'}>
                          {order.paymentStatus === 'payment_received' ? 'Payment Received' : 
                           order.paymentStatus === 'paid' ? 'Payment Uploaded' :
                           order.paymentStatus === 'pending' ? 'Awaiting Payment' : 
                           order.paymentStatus || 'Unknown'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Order Status:</p>
                        <Badge className={getStatusConfig(order.status).color}>
                          {getStatusConfig(order.status).label}
                        </Badge>
                      </div>
                    </div>

                    {order.paymentReceivedDate && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-800">Payment Received On:</p>
                        <p className="text-sm text-blue-600">
                          {new Date(order.paymentReceivedDate).toLocaleDateString('en-ZA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}

                    {order.eftPop ? (
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <FileText className="h-5 w-5 text-green-600 mr-2" />
                              <div>
                                <p className="font-medium text-green-800">
                                  Proof of Payment Uploaded
                                </p>
                                <p className="text-sm text-green-600">
                                  Customer has uploaded their payment proof
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => window.open(`/api/orders/${order.id}/proof`, '_blank')}
                              size="sm"
                              variant="outline"
                              className="border-green-300 text-green-700 hover:bg-green-100"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              View PDF
                            </Button>
                          </div>
                        </div>

                        {order.paymentStatus === 'paid' && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="space-y-3">
                              <div className="flex items-center">
                                <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
                                <p className="font-medium text-orange-800">
                                  Action Required: Mark Payment as Received
                                </p>
                              </div>
                              <p className="text-sm text-orange-600">
                                After reviewing the proof of payment, set the date payment was received to move order to processing.
                              </p>
                              <div className="flex items-center space-x-3">
                                <Input
                                  type="date"
                                  value={paymentReceivedDate}
                                  onChange={(e) => setPaymentReceivedDate(e.target.value)}
                                  className="flex-1"
                                />
                                <Button
                                  onClick={() => markPaymentReceivedMutation.mutate({ 
                                    orderId: order.id, 
                                    paymentReceivedDate 
                                  })}
                                  disabled={markPaymentReceivedMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark as Received
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <Upload className="h-5 w-5 text-yellow-600 mr-2" />
                          <div>
                            <p className="font-medium text-yellow-800">
                              No Proof of Payment
                            </p>
                            <p className="text-sm text-yellow-600">
                              Customer has not yet uploaded payment proof
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Customer Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-sm text-muted-foreground">Customer Name</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{order.customerEmail}</p>
                        <p className="text-sm text-muted-foreground">Email Address</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{order.customerPhone}</p>
                        <p className="text-sm text-muted-foreground">Phone Number</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="font-medium">{order.shippingAddress}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.shippingCity}, {order.shippingPostalCode}
                        </p>
                        <p className="text-sm text-muted-foreground">Shipping Address</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium capitalize">{order.shippingMethod}</p>
                        <p className="text-sm text-muted-foreground">Shipping Method</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium capitalize">{order.paymentMethod}</p>
                        <p className="text-sm text-muted-foreground">Payment Method</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package2 className="h-5 w-5" />
                  <span>Order Items</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.orderItems && order.orderItems.length > 0 ? (
                    order.orderItems.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
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
                          <h4 className="font-medium">{item.productName}</h4>
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
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {(order.customerNotes || order.adminNotes) && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.customerNotes && (
                    <div>
                      <label className="text-sm font-medium">Customer Notes:</label>
                      <p className="text-sm bg-muted p-3 rounded mt-1">{order.customerNotes}</p>
                    </div>
                  )}
                  {order.adminNotes && (
                    <div>
                      <label className="text-sm font-medium">Admin Notes:</label>
                      <p className="text-sm bg-muted p-3 rounded mt-1">{order.adminNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// PDF Viewer Component
function PDFViewer({ orderNumber, orderId, isOpen, onClose }: { 
  orderNumber: string; 
  orderId: number; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    setLoading(false);
    setError('Failed to load PDF. Please try again.');
    console.error('PDF loading error:', error);
  };

  const goToPrevPage = () => setPageNumber(page => Math.max(1, page - 1));
  const goToNextPage = () => setPageNumber(page => Math.min(numPages || 1, page + 1));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Proof of Payment - Order {orderNumber}</DialogTitle>
          <DialogDescription>
            Review the customer's payment proof document
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading PDF...</span>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center h-64 text-center">
              <div>
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            </div>
          )}
          
          {!loading && !error && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-muted p-2 rounded">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goToPrevPage} 
                  disabled={pageNumber <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pageNumber} of {numPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goToNextPage} 
                  disabled={pageNumber >= (numPages || 1)}
                >
                  Next
                </Button>
              </div>
              
              <ScrollArea className="h-[600px] border rounded">
                <div className="flex justify-center p-4">
                  <Document
                    file={`/api/orders/${orderId}/proof`}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading=""
                  >
                    <Page 
                      pageNumber={pageNumber}
                      width={600}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export default function AdminOrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedOrderForPdf, setSelectedOrderForPdf] = useState<Order | null>(null);

  const { data: ordersResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/admin/orders'],
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });

  const orders: Order[] = ordersResponse?.data || [];

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    // Special logic for payment filter: map payment filter to order status
    let matchesPayment = true;
    if (paymentFilter !== "all") {
      if (paymentFilter === "paid") {
        matchesPayment = order.status === "confirmed";
      } else if (paymentFilter === "pending") {
        matchesPayment = order.status === "pending";
      } else {
        matchesPayment = order.paymentStatus === paymentFilter;
      }
    }

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const handleStatisticFilter = (filterValue: string) => {
    setStatusFilter(filterValue);
    // Clear search and payment filters when using statistic filtering for cleaner experience
    setSearchTerm("");
    setPaymentFilter("all");
  };

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Orders</h3>
              <p className="text-muted-foreground mb-4">
                Failed to load orders. Please try again.
              </p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold">Orders Management</h1>
            <p className="text-muted-foreground">
              Manage and track all customer orders
            </p>
          </div>
          
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Statistics */}
        <OrderStats orders={orders} onFilterChange={handleStatisticFilter} />

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by order number, customer name, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "cards" | "table")}>
                <ToggleGroupItem value="cards" aria-label="Card view">
                  <Grid3X3 className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="table" aria-label="Table view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardContent>
        </Card>

        {/* Orders Display */}
        {isLoading ? (
          viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                      <div className="h-8 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(6)].map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell><div className="h-4 bg-muted rounded w-20"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded w-32"></div></TableCell>
                        <TableCell><div className="h-6 bg-muted rounded w-16"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded w-16"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded w-20"></div></TableCell>
                        <TableCell><div className="h-8 bg-muted rounded w-8"></div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        ) : filteredOrders.length > 0 ? (
          viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{order.orderNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              {order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customerName}</div>
                            <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                            {order.customerPhone && (
                              <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={`${getStatusConfig(order.status).color} border`}
                          >
                            {getStatusConfig(order.status).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={order.paymentMethod === "eft" ? "secondary" : "default"}
                            className="text-xs"
                          >
                            {order.paymentMethod?.toUpperCase() || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" || paymentFilter !== "all"
                  ? "No orders match your current filters."
                  : "No orders have been placed yet."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order Details Dialog */}
        <OrderDetailsDialog
          order={selectedOrder}
          open={showDetails}
          onOpenChange={setShowDetails}
        />
      </div>
    </AdminLayout>
  );
}