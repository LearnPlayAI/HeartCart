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
  ShoppingCart,
  Building2,
  Download,
  Copy,
  Check,
  Plus,
  RotateCcw
} from 'lucide-react';
import OrderStatusTimeline from '@/components/OrderStatusTimeline';


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
  actualShippingCost?: number;
  tax: number;
  total: number;
  createdAt: string;
  eftPop?: string;
  customerNotes?: string;
  paymentStatus: string;
  trackingNumber?: string;
  paymentReceivedDate?: string;
  supplierOrderNumber?: string;
  supplierOrderDate?: string;
  adminNotes?: string;
  items: OrderItem[];
  // PUDO Locker Information
  selectedLockerId?: number;
  selectedLockerCode?: string;
  selectedLockerName?: string;
  selectedLockerAddress?: string;
  pudoLocker?: {
    id: number;
    code: string;
    name: string;
    address: string;
    provider: string;
    latitude: string;
    longitude: string;
    openingHours: Array<{
      day: string;
      open_time: string;
      close_time: string;
      isStoreOpen: string;
    }>;
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
    confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
    payment_received: { label: 'Payment Received', color: 'bg-green-100 text-green-800 border-green-200', icon: CreditCard },
    processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Package },
    shipped: { label: 'Shipped', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Truck },
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
  
  // Form state for supplier order information
  const [supplierOrderNumber, setSupplierOrderNumber] = useState("");
  const [supplierOrderDate, setSupplierOrderDate] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [actualShippingCost, setActualShippingCost] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Custom line items state
  const [lineItemType, setLineItemType] = useState<'packaging' | 'shipping' | 'misc'>('packaging');
  const [customPrice, setCustomPrice] = useState('');
  const [isAddingLineItem, setIsAddingLineItem] = useState(false);

  // Force cache invalidation on component mount to ensure fresh data
  useEffect(() => {
    if (orderId) {
      queryClient.removeQueries({ queryKey: ['/api/admin/orders', orderId] });
      queryClient.removeQueries({ queryKey: ['/api/admin/supplier-orders', orderId] });
    }
  }, [queryClient, orderId]);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      let copyText = text;
      
      // Special handling for phone numbers - only copy last 9 digits
      if (fieldName === 'Phone Number') {
        // Remove any non-digit characters and get last 9 digits
        const digitsOnly = text.replace(/\D/g, '');
        copyText = digitsOnly.slice(-9);
      }
      
      await navigator.clipboard.writeText(copyText);
      setCopiedField(fieldName);
      toast({
        title: "Copied to clipboard",
        description: `${fieldName} copied successfully`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        description: "Failed to copy to clipboard",
      });
    }
  };

  // Copyable field component
  const CopyableField = ({ label, value, fieldName }: { label: string; value: string; fieldName: string }) => (
    <div>
      <label className="text-sm font-medium text-gray-600">{label}</label>
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-gray-800 flex-1">
          {value || 'Not provided'}
        </p>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(value, fieldName)}
            className="h-6 w-6 p-0 hover:bg-gray-100"
          >
            {copiedField === fieldName ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3 text-gray-500" />
            )}
          </Button>
        )}
      </div>
    </div>
  );

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['/api/admin/orders', orderId],
    queryFn: async () => {
      return await apiRequest('GET', `/api/admin/orders/${orderId}`);
    },
    enabled: !!orderId
  });

  const { data: supplierOrdersResponse } = useQuery({
    queryKey: ['/api/admin/supplier-orders/order', orderId],
    queryFn: async () => {
      return await apiRequest('GET', `/api/admin/supplier-orders/order/${orderId}`);
    },
    enabled: !!orderId
  });

  const order = response?.data;
  const supplierOrders = supplierOrdersResponse?.data || [];
  
  // Hydrate form fields with existing order data
  useEffect(() => {
    if (order) {
      setActualShippingCost(order.actualShippingCost?.toString() || "60");
    }
  }, [order]);

  useEffect(() => {
    if (supplierOrders && supplierOrders.length > 0) {
      // Use data from the first supplier order for the group-level fields
      const firstSupplierOrder = supplierOrders[0];
      setSupplierOrderNumber(firstSupplierOrder.supplierOrderNumber || "");
      setSupplierOrderDate(firstSupplierOrder.orderDate || "");
      setAdminNotes(firstSupplierOrder.notes || "");
    }
  }, [supplierOrders]);

  // Helper function to get supplier status for a product
  const getSupplierStatus = (productId: number) => {
    const supplierOrder = supplierOrders.find((so: SupplierOrder) => so.productId === productId);
    return supplierOrder?.status || 'pending';
  };

  // Supplier status badge component
  const SupplierStatusBadge = ({ status }: { status: 'pending' | 'ordered' | 'shipped' | 'unavailable' | 'received' }) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      ordered: { color: 'bg-blue-100 text-blue-800', icon: ShoppingCart, label: 'Ordered' },
      shipped: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Shipped' },
      received: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Received' },
      unavailable: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Unavailable' }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </div>
    );
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      return await apiRequest('PATCH', `/api/admin/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders', orderId, 'status-history'] });
    },
    onError: (error) => {
      console.error('Status update error:', error);
      toast({ 
        variant: "destructive",
        description: "Failed to update order status" 
      });
    }
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ orderId, paymentStatus }: { orderId: number; paymentStatus: string }) => {
      return await apiRequest('PATCH', `/api/admin/orders/${orderId}/payment-status`, { paymentStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders', orderId, 'status-history'] });
      
    },
    onError: (error) => {
      console.error('Payment status update error:', error);
      toast({ 
        variant: "destructive",
        description: "Failed to update payment status" 
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

  // Update supplier order information mutation
  const updateSupplierOrderMutation = useMutation({
    mutationFn: async ({ orderId, supplierOrderNumber, supplierOrderDate, adminNotes }: { 
      orderId: number; 
      supplierOrderNumber: string; 
      supplierOrderDate: string; 
      adminNotes: string; 
    }) => {
      return await apiRequest('POST', `/api/admin/supplier-orders/order/${orderId}/update-group`, {
        supplierOrderNumber,
        supplierOrderDate,
        adminNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-orders/order', orderId] });
      toast({ 
        title: "Success",
        description: "Supplier order information updated successfully" 
      });
    },
    onError: () => {
      toast({ 
        variant: "destructive",
        description: "Failed to update supplier order information" 
      });
    }
  });

  // Update actual shipping cost mutation
  const updateShippingCostMutation = useMutation({
    mutationFn: async ({ orderId, actualShippingCost }: { orderId: number; actualShippingCost: number }) => {
      return await apiRequest('PATCH', `/api/admin/orders/${orderId}/actual-shipping-cost`, { actualShippingCost });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/financial-summary'] });
      toast({ 
        title: "Success",
        description: "Shipping cost updated successfully" 
      });
    },
    onError: () => {
      toast({ 
        variant: "destructive",
        description: "Failed to update shipping cost" 
      });
    }
  });

  const markPaymentReceivedMutation = useMutation({
    mutationFn: async ({ orderId, paymentReceivedDate }: { orderId: number; paymentReceivedDate: string }) => {
      return await apiRequest('POST', `/api/orders/${orderId}/admin/payment-received`, { paymentReceivedDate });
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

  // Invoice download function
  const downloadInvoice = async () => {
    if (!order) {
      console.log('Admin download: Order object is null');
      return;
    }
    
    console.log('Starting admin invoice download for order:', order.id);
    
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/invoice`, {
        method: 'GET',
        credentials: 'include',
      });

      console.log('Admin download response:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: "You don't have permission to download this invoice.",
            variant: "destructive",
          });
        } else if (response.status === 404) {
          toast({
            title: "Invoice Not Available",
            description: "No invoice is available for this order yet.",
            variant: "destructive",
          });
        } else {
          const errorText = await response.text();
          console.error('Admin download error:', errorText);
          throw new Error(`Failed to download invoice: ${response.status}`);
        }
        return;
      }

      // Create blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Generate invoice mutation for card payments
  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/orders/${order?.id}/generate-invoice`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to generate invoice: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Use the response status message if JSON parsing fails
        }
        throw new Error(errorMessage);
      }

      return response;
    },
    onSuccess: () => {
      toast({
        title: "Invoice Generated",
        description: "Invoice has been successfully generated for this order.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/orders/${orderId}`] });
    },
    onError: (error) => {
      toast({
        title: "Invoice Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Custom line item mutation
  const addLineItemMutation = useMutation({
    mutationFn: async ({ lineItemType, customPrice }: { lineItemType: 'packaging' | 'shipping' | 'misc', customPrice: number }) => {
      return await apiRequest('POST', `/api/admin/orders/${orderId}/line-items`, { lineItemType, customPrice });
    },
    onSuccess: () => {
      toast({
        title: "Line Item Added",
        description: "Custom line item has been successfully added to the order.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', orderId] });
      setCustomPrice('');
      setIsAddingLineItem(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Line Item",
        description: error.message || "An error occurred while adding the line item.",
        variant: "destructive",
      });
    },
  });

  // Invoice regeneration mutation
  const regenerateInvoiceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/admin/orders/${orderId}/regenerate-invoice`);
    },
    onSuccess: () => {
      toast({
        title: "Invoice Regenerated",
        description: "Invoice has been successfully regenerated with all current order items.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', orderId] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Regenerate Invoice",
        description: error.message || "An error occurred while regenerating the invoice.",
        variant: "destructive",
      });
    },
  });

  // Handle adding custom line item
  const handleAddLineItem = () => {
    const price = parseFloat(customPrice);
    if (!price || price <= 0 || price > 99999.99) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price between R0.01 and R99,999.99",
        variant: "destructive",
      });
      return;
    }
    addLineItemMutation.mutate({ lineItemType, customPrice: price });
  };

  // Proof of Payment download function
  const downloadProofOfPayment = async () => {
    if (!order || !order.eftPop) {
      toast({
        title: "No Proof of Payment",
        description: "No proof of payment file is available for this order.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Extract the file path from the proof of payment URL
      const filePath = order.eftPop.replace('/api/files/', '');
      
      const response = await fetch(`/api/files/${filePath}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "File Not Found",
            description: "The proof of payment file could not be found.",
            variant: "destructive",
          });
        } else {
          throw new Error(`Failed to download proof of payment: ${response.status}`);
        }
        return;
      }

      // Create blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `Proof-of-Payment-${order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Proof of payment download has started.",
      });
      
    } catch (error) {
      console.error('Proof of payment download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download proof of payment. Please try again.",
        variant: "destructive",
      });
    }
  };

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem 
                        value="processing" 
                        disabled={order.paymentStatus !== 'payment_received'}
                      >
                        Processing
                      </SelectItem>
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
                <CardTitle className="text-lg">Payment Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Update Payment Status:</label>
                  <Select
                    value={order.paymentStatus}
                    onValueChange={(paymentStatus) => updatePaymentStatusMutation.mutate({ orderId: order.id, paymentStatus })}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                      <SelectItem value="payment_received">Payment Received</SelectItem>
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

          {/* Supplier Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Supplier Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Supplier Order Number:</label>
                  <Input
                    placeholder="Enter supplier order number"
                    value={supplierOrderNumber}
                    onChange={(e) => setSupplierOrderNumber(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Order Date:</label>
                  <Input
                    type="date"
                    value={supplierOrderDate}
                    onChange={(e) => setSupplierOrderDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Notes:</label>
                  <textarea
                    placeholder="Enter additional notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="mt-1 w-full p-2 border border-gray-300 rounded-md resize-none"
                    rows={3}
                  />
                </div>
                
                <Button
                  onClick={() => updateSupplierOrderMutation.mutate({ 
                    orderId: order.id, 
                    supplierOrderNumber,
                    supplierOrderDate,
                    adminNotes
                  })}
                  disabled={updateSupplierOrderMutation.isPending}
                  size="sm"
                  className="w-full"
                >
                  {updateSupplierOrderMutation.isPending ? "Saving..." : "Save Supplier Order Info"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shipping Cost</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Customer Shipping Cost:</label>
                  <div className="bg-gray-50 p-2 rounded mt-1">
                    <span className="text-sm font-medium">{formatCurrency(order.shippingCost)}</span>
                    <span className="text-xs text-gray-500 ml-2">(Fixed rate)</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Actual Shipping Cost:</label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      type="number"
                      placeholder="Enter actual cost"
                      value={actualShippingCost}
                      onChange={(e) => setActualShippingCost(e.target.value)}
                      className="flex-1"
                      min="0"
                      step="0.01"
                    />
                    <Button
                      onClick={() => updateShippingCostMutation.mutate({ 
                        orderId: order.id, 
                        actualShippingCost: parseFloat(actualShippingCost) || 0
                      })}
                      disabled={updateShippingCostMutation.isPending || !actualShippingCost}
                      size="sm"
                    >
                      {updateShippingCostMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  <p>This cost is used for profit calculations and doesn't affect customer payments.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Credit Payment Indicator - Show when order is fully paid with credits */}
          {order.creditUsed > 0 && order.remainingBalance === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Credit Payment</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <p className="font-medium text-green-800">
                        Order Fully Paid with Credits
                      </p>
                    </div>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>Credit Used: R{order.creditUsed.toFixed(2)}</p>
                      <p>Remaining Balance: R{order.remainingBalance.toFixed(2)}</p>
                      <p className="text-xs mt-2 text-green-600">
                        No additional payment required. Order is ready for processing.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* EFT Payment Proof Management - Only show if order requires actual EFT payment */}
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
                       order.paymentStatus === 'paid' ? 'Payment Made' :
                       order.paymentStatus === 'pending' ? 'Awaiting Payment' : 
                       order.paymentStatus || 'Unknown'}
                    </Badge>
                  </div>
                  
                  {/* Download Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Proof of Payment Download Button */}
                    {order.eftPop && (
                      <Button 
                        onClick={downloadProofOfPayment}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download POP
                      </Button>
                    )}
                    
                    {/* Invoice Download Button - only show if invoice exists */}
                    {(order.paymentStatus === 'payment_received' || order.status === 'payment received') && order.invoicePath && (
                      <Button 
                        onClick={downloadInvoice}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Invoice
                      </Button>
                    )}
                    
                    {/* Generate Invoice Button - only for card payments without invoice */}
                    {order.paymentMethod === 'card' && 
                     (order.paymentStatus === 'payment_received' || order.status === 'payment received') && 
                     !order.invoicePath && (
                      <Button 
                        onClick={() => generateInvoiceMutation.mutate()}
                        disabled={generateInvoiceMutation.isPending}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-[#FF69B4] border-[#FF69B4] hover:bg-[#FF69B4] hover:text-white"
                      >
                        {generateInvoiceMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                        Generate Invoice
                      </Button>
                    )}
                    
                    {/* Regenerate Invoice Button */}
                    {(order.paymentStatus === 'payment_received' || order.status === 'payment received') && order.invoicePath && (
                      <Button 
                        onClick={() => regenerateInvoiceMutation.mutate()}
                        disabled={regenerateInvoiceMutation.isPending}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-orange-600 border-orange-600 hover:bg-orange-600 hover:text-white"
                      >
                        {regenerateInvoiceMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        Regenerate Invoice
                      </Button>
                    )}
                  </div>
                </div>

                {/* Customer & Payment Information */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Payment Information
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CopyableField label="Customer Name" value={order.customerName} fieldName="Customer Name" />
                      <CopyableField label="Email Address" value={order.customerEmail} fieldName="Email Address" />
                      <CopyableField label="Phone Number" value={order.customerPhone} fieldName="Phone Number" />
                      <div>
                        <label className="text-sm font-medium text-gray-600">Payment Amount</label>
                        <p className="text-sm font-semibold text-gray-800">
                          R {order.totalAmount ? Number(order.totalAmount).toFixed(2) : '0.00'}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <label className="text-sm font-medium text-gray-600">Payment Reference Number</label>
                      <p className="text-lg font-bold text-[#FF69B4] bg-white px-3 py-2 rounded border mt-1">
                        {order.paymentReferenceNumber || 'Not generated'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Use this reference to check your bank account for payment verification
                      </p>
                    </div>
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
              </CardContent>
            </Card>
          )}

          {/* YoCo Payments - Only show for card payments */}
          {order.paymentMethod?.toLowerCase() === 'card' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>YoCo Payments</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Payment Status:</p>
                    <Badge variant="default" className="bg-green-600">
                      Payment Received
                    </Badge>
                  </div>
                  
                  {/* Download/Generate Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Invoice Download Button - only show if invoice exists */}
                    {order.invoicePath && (
                      <Button 
                        onClick={downloadInvoice}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Invoice
                      </Button>
                    )}
                    
                    {/* Generate Invoice Button - only for card payments without invoice */}
                    {order.paymentMethod === 'card' && !order.invoicePath && (
                      <Button 
                        onClick={() => generateInvoiceMutation.mutate()}
                        disabled={generateInvoiceMutation.isPending}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-[#FF69B4] border-[#FF69B4] hover:bg-[#FF69B4] hover:text-white"
                      >
                        {generateInvoiceMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                        Generate Invoice
                      </Button>
                    )}
                  </div>
                </div>

                {/* Customer & Payment Information */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Payment Information
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CopyableField label="Customer Name" value={order.customerName} fieldName="Customer Name" />
                      <CopyableField label="Email Address" value={order.customerEmail} fieldName="Email Address" />
                      <CopyableField label="Phone Number" value={order.customerPhone} fieldName="Phone Number" />
                      <div>
                        <label className="text-sm font-medium text-gray-600">Payment Amount</label>
                        <p className="text-sm font-semibold text-gray-800">
                          R {order.totalAmount ? Number(order.totalAmount).toFixed(2) : '0.00'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* YoCo Transaction Details */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    YoCo Transaction Details
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-blue-600">YoCo Checkout ID</label>
                        <p className="text-sm font-semibold text-blue-800 font-mono">
                          {order.yocoCheckoutId || 'Not available'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-blue-600">YoCo Payment ID</label>
                        <p className="text-sm font-semibold text-blue-800 font-mono">
                          {order.yocoPaymentId || 'Not available'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {order.paymentReceivedDate && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-green-800">Card Payment Received On:</p>
                        <p className="text-sm text-green-600">
                          {new Date(order.paymentReceivedDate).toLocaleDateString('en-ZA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Africa/Johannesburg'
                          })} SAST
                        </p>
                      </div>
                      
                      {/* Card Payment Invoice Actions */}
                      <div className="flex items-center gap-2">
                        {/* Invoice Download Button */}
                        {order.invoicePath && (
                          <Button 
                            onClick={downloadInvoice}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download Invoice
                          </Button>
                        )}
                        
                        {/* Generate Invoice Button - if no invoice exists */}
                        {!order.invoicePath && (
                          <Button 
                            onClick={() => generateInvoiceMutation.mutate()}
                            disabled={generateInvoiceMutation.isPending}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 text-[#FF69B4] border-[#FF69B4] hover:bg-[#FF69B4] hover:text-white"
                          >
                            {generateInvoiceMutation.isPending ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                            Generate Invoice
                          </Button>
                        )}
                        
                        {/* Regenerate Invoice Button */}
                        {order.invoicePath && (
                          <Button 
                            onClick={() => regenerateInvoiceMutation.mutate()}
                            disabled={regenerateInvoiceMutation.isPending}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 text-orange-600 border-orange-600 hover:bg-orange-600 hover:text-white"
                          >
                            {regenerateInvoiceMutation.isPending ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            Regenerate Invoice
                          </Button>
                        )}
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
                        
                        {/* Supplier Status Badge */}
                        {(() => {
                          const supplierStatus = supplierOrders?.find(so => so.productId === item.productId)?.status;
                          if (!supplierStatus) return null;
                          
                          const statusConfig = {
                            pending: { 
                              icon: Clock, 
                              color: 'text-yellow-600 bg-yellow-100', 
                              label: 'Pending Order' 
                            },
                            ordered: { 
                              icon: ShoppingCart, 
                              color: 'text-blue-600 bg-blue-100', 
                              label: 'Ordered' 
                            },
                            shipped: { 
                              icon: CheckCircle, 
                              color: 'text-green-600 bg-green-100', 
                              label: 'Shipped' 
                            },
                            received: { 
                              icon: CheckCircle, 
                              color: 'text-green-600 bg-green-100', 
                              label: 'Received' 
                            },
                            unavailable: { 
                              icon: XCircle, 
                              color: 'text-red-600 bg-red-100', 
                              label: 'Unavailable' 
                            }
                          };
                          
                          const config = statusConfig[supplierStatus as keyof typeof statusConfig];
                          if (!config) return null;
                          
                          const IconComponent = config.icon;
                          
                          return (
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${config.color}`}>
                              <IconComponent className="h-3 w-3 mr-1" />
                              {config.label}
                            </div>
                          );
                        })()}
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

          {/* Custom Line Items Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Package2 className="h-5 w-5" />
                  <span>Custom Line Items</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingLineItem(!isAddingLineItem)}
                  disabled={addLineItemMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${addLineItemMutation.isPending ? 'animate-spin' : ''}`} />
                  Add Line Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAddingLineItem && (
                <div className="space-y-4 p-4 bg-muted rounded-lg mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Line Item Type</label>
                      <Select value={lineItemType} onValueChange={(value: 'packaging' | 'shipping' | 'misc') => setLineItemType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="packaging">Additional Packaging</SelectItem>
                          <SelectItem value="shipping">Additional Shipping</SelectItem>
                          <SelectItem value="misc">Miscellaneous Costs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Custom Price (R)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="99999.99"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Actions</label>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleAddLineItem}
                          disabled={addLineItemMutation.isPending || !customPrice}
                          size="sm"
                        >
                          {addLineItemMutation.isPending ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Add
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAddingLineItem(false);
                            setCustomPrice('');
                          }}
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                Use this section to add additional charges to the order such as extra packaging, additional shipping costs, or miscellaneous fees. These items will be included in invoice regeneration.
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
                    <p className="font-medium">
                      {order.shippingMethod === 'pudo-locker' 
                        ? 'PUDO Lockers (R85)' 
                        : order.shippingMethod === 'pudo-door' 
                        ? 'PUDO to your Door (R119)' 
                        : order.shippingMethod}
                    </p>
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

          {/* PUDO Locker Information */}
          {order.shippingMethod === 'pudo-locker' && (order.lockerDetails || order.pudoLocker) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>PUDO Delivery Locker</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Delivery Location</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Send this order to the PUDO locker below for customer pickup
                  </p>
                </div>
                
                <div className="space-y-4">
                  {/* Locker Name and Code */}
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Locker Name & Code</p>
                    <div className="flex items-center space-x-2">
                      <div className="bg-blue-100 px-2 py-1 rounded text-sm font-medium text-blue-800">
                        {(order.lockerDetails?.code || order.pudoLocker?.code)}
                      </div>
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium flex-1">{(order.lockerDetails?.name || order.pudoLocker?.name)}</span>
                        {(order.lockerDetails?.name || order.pudoLocker?.name) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard((order.lockerDetails?.name || order.pudoLocker?.name), 'PUDO Locker Name')}
                            className="h-6 w-6 p-0 hover:bg-gray-100"
                          >
                            {copiedField === 'PUDO Locker Name' ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-gray-500" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Address</p>
                    <p className="text-gray-900">{(order.lockerDetails?.address || order.pudoLocker?.address)}</p>
                  </div>

                  {/* Provider */}
                  {(order.lockerDetails?.provider || order.pudoLocker?.provider) && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Provider</p>
                      <p className="text-gray-900 capitalize">{(order.lockerDetails?.provider || order.pudoLocker?.provider)}</p>
                    </div>
                  )}

                  {/* Opening Hours */}
                  {(order.lockerDetails?.openingHours || order.pudoLocker?.openingHours) && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Opening Hours</p>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="grid grid-cols-1 gap-1">
                          {(order.lockerDetails?.openingHours || order.pudoLocker?.openingHours || []).map((hours: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="font-medium capitalize">{hours.day}:</span>
                              <span className="text-gray-600">
                                {hours.isStoreOpen === 'Open' || hours.isStoreOpen === '1'
                                  ? `${hours.open_time?.substring(0, 5)} - ${hours.close_time?.substring(0, 5)}`
                                  : 'Closed'
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Google Maps Link */}
                  {(order.lockerDetails?.latitude && order.lockerDetails?.longitude) && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Location</p>
                      <a
                        href={`https://www.google.com/maps?q=${order.lockerDetails.latitude},${order.lockerDetails.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                      >
                        <MapPin className="h-4 w-4" />
                        <span>View Location on Google Maps</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
                {order.vatAmount > 0 && (
                  <div className="flex justify-between">
                    <span>VAT ({order.vatRate}%):</span>
                    <span>{formatCurrency(order.vatAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Status Timeline */}
          <OrderStatusTimeline 
            orderId={order.id}
            currentStatus={order.status}
            currentPaymentStatus={order.paymentStatus}
          />

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