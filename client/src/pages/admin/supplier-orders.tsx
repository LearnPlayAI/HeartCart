import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  AlertTriangle, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  RefreshCw,
  Filter,
  Search,
  Calendar,
  CreditCard,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { AdminLayout } from '@/components/admin/layout';

interface SupplierOrder {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  supplierUrl: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  status: 'pending' | 'ordered' | 'unavailable' | 'received';
  supplierOrderNumber?: string;
  orderDate?: string;
  expectedDelivery?: string;
  notes?: string;
  urlValidationStatus: 'pending' | 'valid' | 'invalid';
  urlLastChecked?: string;
  createdAt: string;
  updatedAt?: string;
  customerUnitPrice: number;
  hasCreditGenerated?: boolean; // Track if credit has been generated
  customerOrder: {
    id: number;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
  };
  product: {
    id: number;
    name: string;
    imageUrl?: string;
    price?: number;
    sku?: string;
    supplierAvailable: boolean;
    actualSupplierUrl?: string;
  };
}

const SupplierOrders = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [validationFilter, setValidationFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: supplierOrdersResponse, isLoading, error } = useQuery({
    queryKey: ['/api/admin/supplier-orders', statusFilter, validationFilter, searchTerm],
    queryFn: async () => {
      console.log('Query function executing...');
      const url = `/api/admin/supplier-orders?status=${statusFilter}&validation=${validationFilter}&search=${encodeURIComponent(searchTerm)}`;
      console.log('Fetching URL:', url);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Raw API response:', data);
      console.log('Data success flag:', data.success);
      console.log('Data array:', data.data);
      console.log('Data array length:', data.data?.length);
      return data;
    },
    staleTime: 0, // Force fresh data
    gcTime: 0, // Disable caching (v5 syntax)
  });

  const validateUrlMutation = useMutation({
    mutationFn: (orderId: number) => 
      apiRequest(`/api/admin/supplier-orders/${orderId}/validate-url`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-orders'] });
      toast({
        title: 'URL validation updated',
        description: 'Supplier URL validation status has been updated',
      });
    },
    onError: () => {
      toast({
        title: 'Validation failed',
        description: 'Could not validate supplier URL',
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status, notes }: { orderId: number; status: string; notes?: string }) =>
      apiRequest(`/api/admin/supplier-orders/${orderId}/status`, {
        method: 'PATCH',
        data: { status, notes },
      }),
    onMutate: async ({ orderId, status }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['/api/admin/supplier-orders'] });

      // Snapshot the previous value
      const previousOrders = queryClient.getQueryData(['/api/admin/supplier-orders']);

      // Optimistically update to the new value
      queryClient.setQueryData(['/api/admin/supplier-orders'], (old: any) => {
        if (!old?.success || !old?.data) return old;
        
        return {
          ...old,
          data: old.data.map((order: SupplierOrder) =>
            order.id === orderId ? { ...order, status } : order
          ),
        };
      });

      // Return a context object with the snapshotted value
      return { previousOrders };
    },
    onSuccess: (data, variables) => {
      // Force cache refresh with more aggressive invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-orders'] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/supplier-orders'] });
      
      // If status was set to unavailable, invalidate credit queries to update balance
      if (variables.status === 'unavailable') {
        queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/credits/transactions'] });
        queryClient.refetchQueries({ queryKey: ['/api/credits/balance'] });
        queryClient.refetchQueries({ queryKey: ['/api/credits/transactions'] });
      }
      
      toast({
        title: 'Status updated',
        description: variables.status === 'unavailable' 
          ? 'Product marked unavailable. Customer credit has been generated.'
          : 'Supplier order status has been updated',
      });
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousOrders) {
        queryClient.setQueryData(['/api/admin/supplier-orders'], context.previousOrders);
      }
      toast({
        title: 'Update failed',
        description: 'Could not update supplier order status',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after mutation settles (success or error)
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-orders'] });
    },
  });

  const generateCreditMutation = useMutation({
    mutationFn: (orderId: number) =>
      apiRequest(`/api/admin/supplier-orders/${orderId}/generate-credit`, { method: 'POST' }),
    onSuccess: () => {
      // Invalidate supplier orders to update hasCreditGenerated status
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-orders'] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/supplier-orders'] });
      
      // Invalidate credit balance queries to update header display
      queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
      queryClient.refetchQueries({ queryKey: ['/api/credits/balance'] });
      
      toast({
        title: 'Credit generated',
        description: 'Customer credit has been generated for unavailable item',
      });
    },
    onError: () => {
      toast({
        title: 'Credit generation failed',
        description: 'Could not generate customer credit',
        variant: 'destructive',
      });
    },
  });

  const supplierOrders = supplierOrdersResponse?.success ? supplierOrdersResponse.data : [];
  
  // Debug logging
  console.log('Supplier orders response:', supplierOrdersResponse);
  console.log('Supplier orders array:', supplierOrders);
  console.log('Array length:', supplierOrders?.length);
  console.log('Is loading:', isLoading);
  console.log('Has error:', error);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'ordered':
        return <Package className="h-4 w-4" />;
      case 'received':
        return <CheckCircle className="h-4 w-4" />;
      case 'unavailable':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'ordered':
        return 'default';
      case 'received':
        return 'default';
      case 'unavailable':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getValidationIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  // Map supplier ID to actual supplier URL
  const getSupplierUrl = (supplierUrlOrId: string) => {
    // If it's already a full URL, return it
    if (supplierUrlOrId.startsWith('http://') || supplierUrlOrId.startsWith('https://')) {
      return supplierUrlOrId;
    }
    
    // Map supplier IDs to their actual URLs
    const supplierMapping: Record<string, string> = {
      '1': 'https://dmcwholesale.co.za',
      '2': 'https://dmcwholesale.co.za',
      '3': 'https://supplier3.co.za',
      // Add more supplier mappings as needed
    };
    
    return supplierMapping[supplierUrlOrId] || `https://supplier${supplierUrlOrId}.co.za`;
  };

  // Get the specific product URL on the supplier website
  const getProductUrl = (order: SupplierOrder) => {
    // First, check if we have the actual product URL from database
    if (order.product.actualSupplierUrl && order.product.actualSupplierUrl.startsWith('http')) {
      return order.product.actualSupplierUrl;
    }
    
    // If supplierUrl is already a full URL, use it directly
    if (order.supplierUrl && order.supplierUrl.startsWith('http')) {
      return order.supplierUrl;
    }
    
    // Fallback to constructed URL if we only have supplier ID
    const baseUrl = getSupplierUrl(order.supplierUrl);
    const sku = order.product.sku;
    
    // If we have a SKU, construct the product-specific URL
    if (sku) {
      // For DMC Wholesale, use their search functionality with SKU
      if (baseUrl.includes('dmcwholesale.co.za')) {
        return `${baseUrl}/search?q=${encodeURIComponent(sku)}`;
      }
      
      // For other suppliers, append SKU to search
      return `${baseUrl}/search?q=${encodeURIComponent(sku)}`;
    }
    
    // Final fallback to supplier homepage
    return baseUrl;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Supplier Order Management</h1>
            <p className="text-muted-foreground">
              Manage supplier orders and handle unavailable items with customer credits
            </p>
          </div>
        </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Order number, product, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">URL Validation</label>
              <Select value={validationFilter} onValueChange={setValidationFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Validation States</SelectItem>
                  <SelectItem value="valid">Valid URLs</SelectItem>
                  <SelectItem value="invalid">Invalid URLs</SelectItem>
                  <SelectItem value="pending">Pending Validation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('all');
                  setValidationFilter('all');
                  setSearchTerm('');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500">Loading supplier orders...</p>
            </CardContent>
          </Card>
        ) : supplierOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No supplier orders found</h3>
              <p className="text-gray-500">
                No supplier orders match your current filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          supplierOrders.map((order: SupplierOrder) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={order.product.imageUrl || '/placeholder-product.jpg'}
                        alt={order.productName}
                        className="w-16 h-16 object-cover rounded-md border"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-product.jpg';
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {order.productName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Link href={`/admin/orders/${order.orderId}`}>
                          <Button variant="link" size="sm" className="h-auto p-0 text-blue-600 hover:text-blue-800">
                            Order #{order.customerOrder.orderNumber}
                          </Button>
                        </Link>
                        • {order.customerOrder.customerName}
                      </CardDescription>
                      {order.product.sku && (
                        <div className="text-xs text-muted-foreground font-mono">
                          SKU: {order.product.sku}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(order.status)} className="flex items-center gap-1">
                      {getStatusIcon(order.status)}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Order Details */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Order Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Quantity:</span>
                          <span>{order.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Unit Cost (TMY):</span>
                          <span>{formatCurrency(order.unitCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Customer Price:</span>
                          <span>{formatCurrency(order.customerUnitPrice)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Total Cost (TMY):</span>
                          <span>{formatCurrency(order.totalCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created:</span>
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Information */}
                    <div>
                      <h4 className="font-medium mb-2">Customer</h4>
                      <div className="space-y-1 text-sm">
                        <div>{order.customerOrder.customerName}</div>
                        <div className="text-muted-foreground">{order.customerOrder.customerEmail}</div>
                      </div>
                    </div>
                  </div>

                  {/* Supplier Details */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Supplier Information</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">URL Validation:</span>
                          {getValidationIcon(order.urlValidationStatus)}
                          <span className="text-sm capitalize">{order.urlValidationStatus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(getProductUrl(order), '_blank')}
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Product
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => validateUrlMutation.mutate(order.id)}
                            disabled={validateUrlMutation.isPending}
                            className="flex items-center gap-1"
                          >
                            <RefreshCw className={`h-3 w-3 ${validateUrlMutation.isPending ? 'animate-spin' : ''}`} />
                            Validate URL
                          </Button>
                        </div>
                        {order.supplierOrderNumber && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Supplier Order #:</span>
                            <span className="ml-1">{order.supplierOrderNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {order.notes && (
                      <div>
                        <h4 className="font-medium mb-2">Notes</h4>
                        <p className="text-sm text-muted-foreground">{order.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Actions</h4>
                      <div className="space-y-2">
                        {/* View Order Button */}
                        <Link href={`/admin/orders/${order.orderId}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            View Order Details
                          </Button>
                        </Link>
                        {order.status === 'pending' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ 
                                orderId: order.id, 
                                status: 'ordered',
                                notes: 'Order placed with supplier'
                              })}
                              disabled={updateStatusMutation.isPending}
                              className="w-full flex items-center gap-1"
                            >
                              <Package className="h-3 w-3" />
                              Mark as Ordered
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ 
                                orderId: order.id, 
                                status: 'unavailable',
                                notes: 'Item unavailable from supplier'
                              })}
                              disabled={updateStatusMutation.isPending}
                              className="w-full flex items-center gap-1"
                            >
                              <XCircle className="h-3 w-3" />
                              Mark Unavailable
                            </Button>
                          </>
                        )}

                        {order.status === 'ordered' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ 
                              orderId: order.id, 
                              status: 'received',
                              notes: 'Item received from supplier'
                            })}
                            disabled={updateStatusMutation.isPending}
                            className="w-full flex items-center gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Mark as Received
                          </Button>
                        )}

                        {order.status === 'received' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ 
                              orderId: order.id, 
                              status: 'shipped',
                              notes: 'Item shipped to customer'
                            })}
                            disabled={updateStatusMutation.isPending}
                            className="w-full flex items-center gap-1"
                          >
                            <Truck className="h-3 w-3" />
                            Mark as Shipped
                          </Button>
                        )}

                        {order.status === 'unavailable' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateCreditMutation.mutate(order.id)}
                            disabled={generateCreditMutation.isPending || order.hasCreditGenerated}
                            className="w-full flex items-center gap-1"
                          >
                            <CreditCard className="h-3 w-3" />
                            {order.hasCreditGenerated ? 'Credit Already Generated' : 'Generate Customer Credit'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {order.expectedDelivery && (
                      <div>
                        <h4 className="font-medium mb-2">Expected Delivery</h4>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {formatDate(order.expectedDelivery)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </div>
    </AdminLayout>
  );
};

export default SupplierOrders;