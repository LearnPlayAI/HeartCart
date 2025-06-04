import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { AdminLayout } from '@/components/admin/layout';
import { Document, Page } from 'react-pdf';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
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
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Package,
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
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Package2,
  Receipt,
  MessageSquare,
} from 'lucide-react';

// Types
interface SupplierOrder {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  status: 'pending' | 'ordered' | 'unavailable' | 'received';
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplierOrderNumber?: string;
  orderDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
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
  createdAt: string;
  supplierStatus?: 'pending' | 'ordered' | 'unavailable' | 'received';
}

interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingMethod: string;
  paymentMethod: string;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  createdAt: string;
  eftPop?: string;
  customerNotes?: string;
  paymentStatus: string;
  trackingNumber?: string;
  paymentReceivedDate?: string;
  items: OrderItem[];
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
    paid: { label: 'Payment Uploaded', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Upload },
    payment_received: { label: 'Payment Received', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    failed: { label: 'Payment Failed', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  };
  return configs[paymentStatus as keyof typeof configs] || configs.pending;
};

// PDF Viewer Component
function PDFViewer({ orderId }: { orderId: number }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const pdfUrl = `/api/orders/${orderId}/proof?t=${Date.now()}`;

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
    setRetryCount(0);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF Load Error:', error);
    setLoading(false);
    setError(`Failed to load PDF: ${error.message}`);
  };

  const retryLoad = () => {
    setLoading(true);
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  const goToPrevPage = () => setPageNumber(page => Math.max(1, page - 1));
  const goToNextPage = () => setPageNumber(page => Math.min(numPages || 1, page + 1));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unable to Load PDF</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => {
            setLoading(true);
            setError(null);
            setPageNumber(1);
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* PDF Controls */}
      <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
        <div className="flex items-center space-x-2">
          <Button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            size="sm"
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm font-medium">
            Page {pageNumber} of {numPages}
          </span>
          <Button
            onClick={goToNextPage}
            disabled={pageNumber >= (numPages || 1)}
            size="sm"
            variant="outline"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={() => window.open(`/api/orders/${orderId}/proof`, '_blank')}
          size="sm"
          variant="outline"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in New Tab
        </Button>
      </div>

      {/* PDF Document */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {error ? (
          <div className="flex flex-col items-center justify-center h-96 p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load PDF</h3>
            <p className="text-sm text-red-600 text-center mb-4">{error}</p>
            <Button onClick={retryLoad} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading PDF...</p>
                </div>
              </div>
            }
          >
            {numPages && (
              <Page 
                pageNumber={pageNumber} 
                width={Math.min(window.innerWidth * 0.8, 800)}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            )}
          </Document>
        )}
      </div>
    </div>
  );
}

export default function AdminOrderDetail() {
  const [, params] = useRoute('/admin/orders/:id');
  const orderId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [trackingInput, setTrackingInput] = useState("");
  const [paymentReceivedDate, setPaymentReceivedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['/api/admin/orders', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      return response.json();
    },
    enabled: !!orderId
  });

  const { data: supplierOrdersResponse } = useQuery({
    queryKey: ['/api/admin/supplier-orders/order', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/supplier-orders/order/${orderId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch supplier orders');
      return response.json();
    },
    enabled: !!orderId
  });

  const order = response?.data;
  const supplierOrders = supplierOrdersResponse?.data || [];

  // Helper function to get supplier status for a product
  const getSupplierStatus = (productId: number) => {
    const supplierOrder = supplierOrders.find((so: SupplierOrder) => so.productId === productId);
    return supplierOrder?.status || 'pending';
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/orders/${orderId}/status`, { status });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', orderId] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', orderId] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      
    },
    onError: (error) => {
      console.error('Payment received update error:', error);
      toast({ 
        variant: "destructive",
        description: "Failed to mark payment as received" 
      });
    }
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

  if (error || !order) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The order you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Link href="/admin/orders">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Button>
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const paymentConfig = getPaymentStatusConfig(order.paymentStatus);

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-muted-foreground">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status and Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      size="sm"
                    >
                      Update
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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

                    {/* PDF Viewer */}
                    <div className="border rounded-lg p-4">
                      <h4 className="text-lg font-semibold mb-4">Payment Proof Document</h4>
                      <PDFViewer orderId={order.id} />
                    </div>
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
                {order.items && order.items.length > 0 ? (
                  order.items.map((item) => (
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
                  <div className="text-center py-8">
                    <Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No items found for this order.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Customer Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              
              <Separator />
              
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
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="h-5 w-5" />
                <span>Order Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(order.subtotalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>{formatCurrency(order.shippingCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.customerNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Customer Notes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm bg-muted p-3 rounded">{order.customerNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}