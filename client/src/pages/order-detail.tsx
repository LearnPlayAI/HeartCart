import React, { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { formatCurrency } from "@/lib/utils";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft,
  Package, 
  Calendar,
  CreditCard,
  Truck,
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  Package2,
  User,
  FileText,
  Copy,
  ExternalLink,
  Building2,
  Upload,
  FileCheck,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Order interface matching our camelCase schema
interface OrderType {
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
  createdAt: string;
  updatedAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  items?: OrderItemType[];
}

// Order item interface
interface OrderItemType {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  productSku: string;
  productImageUrl: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedAttributes: Record<string, string> | null;
  attributeDisplayText: string | null;
  createdAt: string;
}

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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

// Status icon mapping
const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return <Clock className="h-5 w-5" />;
    case 'processing':
      return <Package2 className="h-5 w-5" />;
    case 'shipped':
      return <Truck className="h-5 w-5" />;
    case 'delivered':
      return <CheckCircle className="h-5 w-5" />;
    default:
      return <Package className="h-5 w-5" />;
  }
};

// Format date function
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const OrderDetail: React.FC = () => {
  const params = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orderId = params.id ? parseInt(params.id) : null;

  // State for file upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [proofOfPayment, setProofOfPayment] = useState<string | null>(null);

  // Fetch order data
  const { 
    data: orderResponse, 
    isLoading, 
    isError 
  } = useQuery<{success: boolean; data: OrderType}>({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId,
  });

  const order = orderResponse?.success ? orderResponse.data : null;

  // Copy to clipboard function
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      
    });
  };

  // Proof of payment upload mutation
  const uploadProofMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('proofOfPayment', file);
      
      const response = await fetch(`/api/orders/${orderId}/upload-proof`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload proof of payment');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setProofOfPayment(data.url);
      
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark order as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark order as paid');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
      
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file only",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 100);

    try {
      await uploadProofMutation.mutateAsync(file);
      setUploadProgress(100);
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF69B4]"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Order not found</h2>
          <p className="text-gray-600 mb-6">The order you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => navigate('/profile')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Order #{order.orderNumber} - TEE ME YOU</title>
        <meta name="description" content={`View details for order #${order.orderNumber} at TEE ME YOU.`} />
      </Helmet>
      
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/my-orders')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Order #{order.orderNumber}</h1>
              <p className="text-gray-600">Placed on {formatDate(order.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`border text-lg px-4 py-2 ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                <span className="ml-2 capitalize">{order.status}</span>
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Order Items
                </CardTitle>
                <CardDescription>
                  {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''} in this order
                </CardDescription>
              </CardHeader>
              <CardContent>
                {order.items && order.items.length > 0 ? (
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          {item.productImageUrl ? (
                            <img 
                              src={item.productImageUrl} 
                              alt={item.productName}
                              className="w-16 h-16 object-cover rounded-md border"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-100 rounded-md border flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-1">{item.productName}</h3>
                          {item.productSku && (
                            <p className="text-sm text-gray-500 mb-2">SKU: {item.productSku}</p>
                          )}
                          
                          {/* Attributes */}
                          {item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0 && (
                            <div className="mb-2">
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(item.selectedAttributes).map(([key, value]) => (
                                  <Badge key={key} variant="secondary" className="text-xs">
                                    {key}: {value}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>Qty: {item.quantity}</span>
                              <span>Unit Price: {formatCurrency(item.unitPrice)}</span>
                            </div>
                            <div className="font-semibold text-lg text-[#FF69B4]">
                              {formatCurrency(item.totalPrice)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No items found for this order</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Notes */}
            {order.customerNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Special Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{order.customerNotes}</p>
                </CardContent>
              </Card>
            )}

            {/* EFT Payment Instructions */}
            {order.paymentMethod === 'eft' && order.paymentStatus !== 'paid' && (
              <Card className="border-[#FF69B4] border-2">
                <CardHeader>
                  <CardTitle className="flex items-center text-[#FF69B4]">
                    <Building2 className="h-5 w-5 mr-2" />
                    EFT Payment Instructions
                  </CardTitle>
                  <CardDescription>
                    Complete your payment using the banking details below
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Banking Details */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Bank</label>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">Standard Bank</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard('Standard Bank', 'Bank name')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Branch</label>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">Northgate</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard('Northgate', 'Branch name')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Account Type</label>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">Cheque</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard('Cheque', 'Account type')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Account Number</label>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">4023252158</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard('4023252158', 'Account number')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-yellow-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Reference Number</p>
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-bold text-yellow-900">{order.orderNumber}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(order.orderNumber, 'Reference number')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-yellow-700 mt-1">
                            IMPORTANT: Use this order number as your reference
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Upload Proof of Payment */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Proof of Payment
                    </h4>
                    
                    {!proofOfPayment ? (
                      <div className="space-y-3">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                            className="hidden"
                            id="proof-upload"
                          />
                          <label htmlFor="proof-upload" className="cursor-pointer">
                            <div className="space-y-2">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                              <p className="text-sm text-gray-600">
                                Click to upload proof of payment (PDF only)
                              </p>
                              <p className="text-xs text-gray-500">
                                Maximum file size: 10MB
                              </p>
                            </div>
                          </label>
                        </div>
                        
                        {isUploading && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Uploading...</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <Progress value={uploadProgress} className="h-2" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <FileCheck className="h-5 w-5 text-green-600 mr-2" />
                            <div className="flex-1">
                              <p className="font-medium text-green-800">
                                Proof of payment uploaded successfully
                              </p>
                              <p className="text-sm text-green-600">
                                Your payment will be verified within 24 hours
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => markAsPaidMutation.mutate()}
                          disabled={markAsPaidMutation.isPending}
                          className="w-full bg-[#FF69B4] hover:bg-[#FF1493]"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          {markAsPaidMutation.isPending ? 'Updating...' : 'Mark Order as Paid'}
                        </Button>
                      </div>
                    )}
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
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{formatCurrency(order.shippingCost)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-[#FF69B4]">{formatCurrency(order.totalAmount)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{order.customerName}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{order.customerEmail}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{order.customerPhone}</span>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="h-5 w-5 mr-2" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 mr-2 text-gray-500 mt-1" />
                  <div>
                    <p>{order.shippingAddress}</p>
                    <p>{order.shippingCity}, {order.shippingPostalCode}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Truck className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{order.shippingMethod}</span>
                </div>
                {order.trackingNumber && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm">Tracking: {order.trackingNumber}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(order.trackingNumber!, 'Tracking number')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Method</span>
                  <span className="capitalize">{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <Badge 
                    variant={order.paymentStatus === 'paid' || order.status === 'payment received' ? 'default' : 'secondary'}
                    className={`capitalize ${(order.paymentStatus === 'paid' || order.status === 'payment received') ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  >
                    {order.status === 'payment received' ? 'Payment Received' : order.paymentStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Order Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => copyToClipboard(order.orderNumber, 'Order number')}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Order Number
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open('mailto:support@teemeyou.com?subject=Order%20Support&body=Order%20Number:%20' + order.orderNumber, '_blank')}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderDetail;