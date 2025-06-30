import { useState } from 'react';
import React from 'react';
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
  Eye,
  Truck,
  User,
  ShoppingCart
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
  groupSupplierOrderNumber?: string;
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

interface GroupedSupplierOrder {
  orderId: number;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  orderStatus: string;
  items: SupplierOrder[];
  totalCost: number;
  hasMixedStatuses: boolean;
  groupSupplierOrderNumber?: string;
}

const SupplierOrders = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [validationFilter, setValidationFilter] = useState<string>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [batchSupplierOrderNumber, setBatchSupplierOrderNumber] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);
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

  // Remove duplicate declaration

  // Group orders by customer order
  const groupedOrders: GroupedSupplierOrder[] = React.useMemo(() => {
    const supplierOrders = supplierOrdersResponse?.success ? supplierOrdersResponse.data : [];
    if (!supplierOrders || supplierOrders.length === 0) return [];
    
    const grouped = supplierOrders.reduce((acc: { [key: number]: GroupedSupplierOrder }, order: SupplierOrder) => {
      const orderId = order.orderId;
      
      if (!acc[orderId]) {
        acc[orderId] = {
          orderId,
          orderNumber: order.customerOrder?.orderNumber || `Order ${orderId}`,
          customerName: order.customerOrder?.customerName || 'Unknown Customer',
          orderDate: order.customerOrder?.createdAt || order.createdAt,
          orderStatus: order.customerOrder?.status || 'pending',
          items: [],
          totalCost: 0,
          hasMixedStatuses: false,
          groupSupplierOrderNumber: order.groupSupplierOrderNumber
        };
      }
      
      acc[orderId].items.push(order);
      acc[orderId].totalCost += parseFloat(order.totalCost.toString());
      
      return acc;
    }, {});
    
    // Check for mixed statuses and set group supplier order number
    Object.values(grouped).forEach(group => {
      const statuses = [...new Set(group.items.map(item => item.status))];
      group.hasMixedStatuses = statuses.length > 1;
      
      // Use the first non-empty group supplier order number
      const groupOrderNumber = group.items.find(item => item.groupSupplierOrderNumber)?.groupSupplierOrderNumber;
      if (groupOrderNumber) {
        group.groupSupplierOrderNumber = groupOrderNumber;
      }
    });
    
    return Object.values(grouped).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [supplierOrdersResponse]);

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

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<SupplierOrder> }) =>
      apiRequest(`/api/admin/supplier-orders/${id}`, {
        method: 'PATCH',
        data: updates,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-orders'] });
      toast({
        title: 'Order updated',
        description: 'Supplier order has been updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Update failed',
        description: 'Could not update supplier order',
        variant: 'destructive',
      });
    },
  });

  const batchUpdateMutation = useMutation({
    mutationFn: ({ orderIds, updates }: { orderIds: number[]; updates: Partial<SupplierOrder> }) =>
      apiRequest('/api/admin/supplier-orders/batch-update', {
        method: 'PATCH',
        data: { orderIds, updates },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-orders'] });
      toast({
        title: 'Orders updated',
        description: 'All selected orders have been updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Batch update failed',
        description: 'Could not update the selected orders',
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
      case 'shipped':
        return <Truck className="h-4 w-4" />;
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
      case 'shipped':
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
          groupedOrders.map((group: GroupedSupplierOrder) => (
            <Card key={group.orderId} className="overflow-hidden border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Order Header Info */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-blue-100 rounded-md border flex items-center justify-center">
                        <Package className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Link href={`/admin/orders/${group.orderId}`}>
                          <Button variant="link" size="sm" className="h-auto p-0 text-blue-600 hover:text-blue-800 text-lg font-bold">
                            {group.orderNumber}
                          </Button>
                        </Link>
                        {group.hasMixedStatuses && (
                          <Badge variant="outline" className="text-xs">
                            Mixed Status
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {group.customerName} • {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                      </CardDescription>
                      <div className="text-sm text-muted-foreground">
                        Order Date: {formatDate(group.orderDate)} • Total: {formatCurrency(group.totalCost)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.groupSupplierOrderNumber && (
                      <div className="text-sm text-muted-foreground">
                        Group Order: <span className="font-mono">{group.groupSupplierOrderNumber}</span>
                      </div>
                    )}
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {group.orderStatus}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Group Supplier Order Number Input */}
                {group.items.length > 1 && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">
                          Group Supplier Order Number (for ordering all items together)
                        </label>
                        <Input
                          placeholder="Enter supplier order number..."
                          value={group.groupSupplierOrderNumber || ''}
                          onChange={(e) => {
                            const orderIds = group.items.map(item => item.id);
                            batchUpdateMutation.mutate({
                              orderIds,
                              updates: { groupSupplierOrderNumber: e.target.value }
                            });
                          }}
                          className="max-w-md"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const orderIds = group.items.map(item => item.id);
                          batchUpdateMutation.mutate({
                            orderIds,
                            updates: { 
                              status: 'ordered',
                              orderDate: new Date().toISOString()
                            }
                          });
                        }}
                        disabled={!group.groupSupplierOrderNumber || batchUpdateMutation.isPending}
                        className="flex items-center gap-2 ml-4"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Mark All as Ordered
                      </Button>
                    </div>
                  </div>
                )}

                {/* Items in this group */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Items in this Order ({group.items.length})
                  </h4>
                  
                  {group.items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Product Details */}
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <img
                                src={item.product.imageUrl || '/placeholder-product.jpg'}
                                alt={item.productName}
                                className="w-16 h-16 object-cover rounded-md border"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-product.jpg';
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <h5 className="font-medium">{item.productName}</h5>
                              {item.product.sku && (
                                <div className="text-xs text-muted-foreground font-mono">
                                  SKU: {item.product.sku}
                                </div>
                              )}
                              <Badge variant={getStatusVariant(item.status)} className="flex items-center gap-1 w-fit">
                                {getStatusIcon(item.status)}
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Quantity:</span>
                              <span>{item.quantity}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Unit Cost:</span>
                              <span>{formatCurrency(item.unitCost)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>Total Cost:</span>
                              <span>{formatCurrency(item.totalCost)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Supplier Details */}
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-medium mb-2 text-sm">Supplier Information</h5>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">URL Validation:</span>
                                {getValidationIcon(item.urlValidationStatus)}
                                <span className="text-xs capitalize">{item.urlValidationStatus}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(getProductUrl(item), '_blank')}
                                  className="flex items-center gap-1 text-xs h-7"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View Product
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => validateUrlMutation.mutate(item.id)}
                                  disabled={validateUrlMutation.isPending}
                                  className="flex items-center gap-1 text-xs h-7"
                                >
                                  <RefreshCw className={`h-3 w-3 ${validateUrlMutation.isPending ? 'animate-spin' : ''}`} />
                                  Validate URL
                                </Button>
                              </div>
                              {item.supplierOrderNumber && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Supplier Order #:</span>
                                  <span className="ml-1 font-mono">{item.supplierOrderNumber}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {item.notes && (
                            <div>
                              <h5 className="font-medium mb-2 text-sm">Notes</h5>
                              <p className="text-xs text-muted-foreground">{item.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Individual Item Actions */}
                        <div className="space-y-2">
                          <h5 className="font-medium mb-2 text-sm">Individual Actions</h5>
                          <div className="space-y-2">
                            <Input
                              placeholder="Individual supplier order number..."
                              value={item.supplierOrderNumber || ''}
                              onChange={(e) => {
                                updateOrderMutation.mutate({
                                  id: item.id,
                                  updates: { supplierOrderNumber: e.target.value }
                                });
                              }}
                              className="text-xs h-8"
                            />
                            
                            <Select 
                              value={item.status} 
                              onValueChange={(value) => {
                                updateOrderMutation.mutate({
                                  id: item.id,
                                  updates: { status: value as any }
                                });
                              }}
                            >
                              <SelectTrigger className="text-xs h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="ordered">Ordered</SelectItem>
                                <SelectItem value="unavailable">Unavailable</SelectItem>
                                <SelectItem value="received">Received</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
};

// Helper functions that were referenced but need to be defined
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'pending': return 'outline';
    case 'ordered': return 'default';
    case 'unavailable': return 'destructive';
    case 'received': return 'secondary';
    default: return 'outline';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return <Clock className="h-3 w-3" />;
    case 'ordered': return <Package className="h-3 w-3" />;
    case 'unavailable': return <XCircle className="h-3 w-3" />;
    case 'received': return <CheckCircle className="h-3 w-3" />;
    default: return <Clock className="h-3 w-3" />;
  }
};

const getValidationIcon = (status: string) => {
  switch (status) {
    case 'valid': return <CheckCircle className="h-3 w-3 text-green-500" />;
    case 'invalid': return <XCircle className="h-3 w-3 text-red-500" />;
    case 'pending': return <Clock className="h-3 w-3 text-yellow-500" />;
    default: return <AlertTriangle className="h-3 w-3 text-gray-500" />;
  }
};

const getProductUrl = (order: SupplierOrder) => {
  return order.product.actualSupplierUrl || order.supplierUrl || '#';
};

export default SupplierOrders;

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