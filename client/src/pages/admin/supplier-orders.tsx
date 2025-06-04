import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  CreditCard
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
    supplierAvailable: boolean;
  };
}

const SupplierOrders = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [validationFilter, setValidationFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: supplierOrdersResponse, isLoading } = useQuery({
    queryKey: ['/api/admin/supplier-orders', statusFilter, validationFilter, searchTerm],
    queryFn: () => apiRequest(`/api/admin/supplier-orders?status=${statusFilter}&validation=${validationFilter}&search=${encodeURIComponent(searchTerm)}`),
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
        body: { status, notes },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-orders'] });
      toast({
        title: 'Status updated',
        description: 'Supplier order status has been updated',
      });
    },
    onError: () => {
      toast({
        title: 'Update failed',
        description: 'Could not update supplier order status',
        variant: 'destructive',
      });
    },
  });

  const generateCreditMutation = useMutation({
    mutationFn: (orderId: number) =>
      apiRequest(`/api/admin/supplier-orders/${orderId}/generate-credit`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-orders'] });
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
        {supplierOrders.length === 0 ? (
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
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {order.productName}
                    </CardTitle>
                    <CardDescription>
                      Order #{order.customerOrder.orderNumber} • {order.customerOrder.customerName}
                    </CardDescription>
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
                          <span className="text-muted-foreground">Unit Cost:</span>
                          <span>{formatCurrency(order.unitCost)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Total Cost:</span>
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
                            onClick={() => window.open(order.supplierUrl, '_blank')}
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Supplier
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

                        {order.status === 'unavailable' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateCreditMutation.mutate(order.id)}
                            disabled={generateCreditMutation.isPending}
                            className="w-full flex items-center gap-1"
                          >
                            <CreditCard className="h-3 w-3" />
                            Generate Customer Credit
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