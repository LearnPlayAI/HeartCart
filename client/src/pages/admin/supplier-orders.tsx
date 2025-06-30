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
  Eye,
  Truck,
  ChevronDown,
  ChevronRight
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

// Helper function for formatting dates
const formatDate = (dateString: string) => {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupFormData, setGroupFormData] = useState<Record<string, { supplierOrderNumber: string; supplierOrderDate: string; adminNotes: string }>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for updating group supplier order information
  const updateGroupSupplierOrderMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: number; data: { supplierOrderNumber?: string; supplierOrderDate?: string; adminNotes?: string } }) => {
      return apiRequest(`/api/admin/supplier-orders/order/${orderId}/update-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-orders'] });
      toast({
        title: "Success",
        description: "Supplier order information updated for all items in this order.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update supplier order information.",
        variant: "destructive",
      });
    },
  });

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

  // Group supplier orders by customer order number
  const groupedOrders = supplierOrders.reduce((groups: Record<string, SupplierOrder[]>, order: SupplierOrder) => {
    const orderNumber = order.customerOrder.orderNumber;
    if (!groups[orderNumber]) {
      groups[orderNumber] = [];
    }
    groups[orderNumber].push(order);
    return groups;
  }, {});

  // Toggle group expansion
  const toggleGroup = (orderNumber: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(orderNumber)) {
      newExpanded.delete(orderNumber);
    } else {
      newExpanded.add(orderNumber);
    }
    setExpandedGroups(newExpanded);
  };

  // Helper function to update group form data
  const updateGroupFormData = (orderNumber: string, field: string, value: string) => {
    setGroupFormData(prev => ({
      ...prev,
      [orderNumber]: {
        supplierOrderNumber: '',
        supplierOrderDate: '',
        adminNotes: '',
        ...prev[orderNumber],
        [field]: value
      }
    }));
  };

  // Helper function to get existing supplier order data for a group
  const getGroupSupplierData = (orders: SupplierOrder[]) => {
    const firstOrder = orders[0];
    return {
      supplierOrderNumber: firstOrder?.supplierOrderNumber || '',
      supplierOrderDate: firstOrder?.orderDate || '',
      adminNotes: firstOrder?.notes || ''
    };
  };

  // Helper function to save group supplier order information
  const saveGroupSupplierInfo = async (orderNumber: string, orders: SupplierOrder[]) => {
    const formData = groupFormData[orderNumber];
    if (!formData) return;

    const orderId = orders[0].orderId;
    const updateData = {
      ...(formData.supplierOrderNumber && { supplierOrderNumber: formData.supplierOrderNumber }),
      ...(formData.supplierOrderDate && { supplierOrderDate: formData.supplierOrderDate }),
      ...(formData.adminNotes && { adminNotes: formData.adminNotes })
    };

    if (Object.keys(updateData).length > 0) {
      updateGroupSupplierOrderMutation.mutate({ orderId, data: updateData });
    }
  };

  // Initialize all groups as expanded on first load
  if (supplierOrders.length > 0 && expandedGroups.size === 0) {
    const allOrderNumbers = Object.keys(groupedOrders);
    setExpandedGroups(new Set(allOrderNumbers));
  }

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

      {/* Supplier Orders List - Grouped by Customer Order */}
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
          Object.entries(groupedOrders).map(([orderNumber, orders]) => (
            <div key={orderNumber} className="space-y-2">
              {/* Group Header */}
              <Card className="bg-gray-50 border-l-4 border-l-pink-500">
                <CardHeader className="pb-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors rounded p-2 -m-2"
                    onClick={() => toggleGroup(orderNumber)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedGroups.has(orderNumber) ? (
                        <ChevronDown className="h-5 w-5 text-gray-600" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                      )}
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {orderNumber}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600">
                          {orders[0].customerOrder.customerName} • {orders.length} item{orders.length > 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Total Cost: {formatCurrency(orders.reduce((sum, order) => sum + parseFloat(order.totalCost || '0'), 0))}</span>
                      <Badge variant="outline" className="ml-2">
                        {formatDate(orders[0].createdAt)}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Supplier Order Information Form */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Supplier Order Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Supplier Order Number
                        </label>
                        <Input
                          type="text"
                          placeholder="Enter supplier order number"
                          value={groupFormData[orderNumber]?.supplierOrderNumber || getGroupSupplierData(orders).supplierOrderNumber}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateGroupFormData(orderNumber, 'supplierOrderNumber', e.target.value);
                          }}
                          onBlur={() => saveGroupSupplierInfo(orderNumber, orders)}
                          className="h-8"
                        />
                      </div>

                      {/* Order Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Order Date
                        </label>
                        <Input
                          type="date"
                          value={groupFormData[orderNumber]?.supplierOrderDate || getGroupSupplierData(orders).supplierOrderDate}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateGroupFormData(orderNumber, 'supplierOrderDate', e.target.value);
                          }}
                          onBlur={() => saveGroupSupplierInfo(orderNumber, orders)}
                          className="h-8"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <Input
                          type="text"
                          placeholder="Add notes..."
                          value={groupFormData[orderNumber]?.adminNotes || getGroupSupplierData(orders).adminNotes}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateGroupFormData(orderNumber, 'adminNotes', e.target.value);
                          }}
                          onBlur={() => saveGroupSupplierInfo(orderNumber, orders)}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Group Items - Collapsible */}
              {expandedGroups.has(orderNumber) && (
                <div className="ml-4 space-y-4">
                  {orders.map((order: SupplierOrder) => (
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
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      </div>
    </AdminLayout>
  );
};

export default SupplierOrders;