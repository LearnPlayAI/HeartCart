import AdminLayout from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Plus, Package, Truck, Building2, DollarSign, Calendar, User, Mail, Phone, Send, Trash2 } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function CorporateOrderDetailPage() {
  const [, setLocation] = useLocation();
  const { orderId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch corporate order details
  const { data: orderData, isLoading } = useQuery({
    queryKey: [`/api/admin/corporate-orders/${orderId}`],
    queryFn: () => apiRequest('GET', `/api/admin/corporate-orders/${orderId}`),
    enabled: !!orderId
  });

  const order = orderData?.order;

  // Send payment options email mutation
  const sendPaymentOptionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/admin/corporate-orders/${orderId}/send-payment-options`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment options email sent successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/corporate-orders/${orderId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send payment options email",
        variant: "destructive",
      });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest('DELETE', `/api/admin/corporate-orders/${orderId}/items/${itemId}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/corporate-orders/${orderId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation('/admin/corporate-orders')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Corporate Orders
            </Button>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation('/admin/corporate-orders')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Corporate Orders
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Order Not Found</h3>
              <p className="text-muted-foreground">
                The requested corporate order could not be found.
              </p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'default';
      case 'confirmed': return 'secondary';
      case 'processing': return 'outline';
      case 'shipped': return 'default';
      case 'delivered': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPaymentStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'destructive';
      case 'paid': return 'default';
      case 'partial': return 'secondary';
      case 'refunded': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation('/admin/corporate-orders')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Corporate Orders
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-pink-600">{order.orderNumber}</h1>
              <p className="text-muted-foreground">{order.companyName}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setLocation(`/admin/corporate-orders/${orderId}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Order
            </Button>
            {order.paymentStatus === 'pending' && (
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => sendPaymentOptionsMutation.mutate()}
                disabled={sendPaymentOptionsMutation.isPending}
              >
                {sendPaymentOptionsMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Payment Options
                  </>
                )}
              </Button>
            )}
            <Button 
              className="bg-pink-600 hover:bg-pink-700"
              onClick={() => setLocation(`/admin/corporate-orders/${orderId}/add-item`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setLocation(`/admin/corporate-orders/${orderId}/add-shipment`)}
            >
              <Truck className="h-4 w-4 mr-2" />
              Create Shipment
            </Button>
          </div>
        </div>

        {/* Order Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={getStatusBadgeVariant(order.status)}>
                  {order.status}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment:</span>
                <Badge variant={getPaymentStatusBadgeVariant(order.paymentStatus)}>
                  {order.paymentStatus}
                </Badge>
              </div>
              {order.paymentMethod && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Method:</span>
                  <span className="capitalize">{order.paymentMethod.replace('_', ' ')}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              {order.expectedDeliveryDate && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Expected:</span>
                  <span>{new Date(order.expectedDeliveryDate).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{order.contactPerson}</p>
                <p className="text-sm text-muted-foreground">Contact Person</p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{order.contactEmail}</span>
              </div>
              {order.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{order.contactPhone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Items Value:</span>
                <span>{formatCurrency(parseFloat(order.totalItemsValue))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Packaging:</span>
                <span>{formatCurrency(parseFloat(order.totalPackagingCosts))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Shipping:</span>
                <span>{formatCurrency(parseFloat(order.totalShippingCosts))}</span>
              </div>
              <hr />
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total Amount:</span>
                <span className="text-pink-600">{formatCurrency(parseFloat(order.totalAmount))}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Items Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items ({orderData?.items?.length || 0})
              </CardTitle>
              <Button 
                size="sm"
                className="bg-pink-600 hover:bg-pink-700"
                onClick={() => setLocation(`/admin/corporate-orders/${orderId}/add-item`)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {orderData?.items && orderData.items.length > 0 ? (
              <div className="space-y-4">
                {orderData.items.map((item: any, index: number) => (
                  <div key={item.id || index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          {item.productImageUrl && (
                            <img
                              src={item.productImageUrl}
                              alt={item.productName}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.productName}</h4>
                            <p className="text-sm text-gray-600">SKU: {item.productSku}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm">Qty: {item.quantity}</span>
                              <span className="text-sm">Unit: {formatCurrency(parseFloat(item.unitPrice))}</span>
                              <span className="font-medium">Total: {formatCurrency(parseFloat(item.totalPrice))}</span>
                            </div>
                            {(item.size || item.color) && (
                              <div className="flex gap-2 mt-1">
                                {item.size && <span className="text-xs bg-gray-100 px-2 py-1 rounded">Size: {item.size}</span>}
                                {item.color && <span className="text-xs bg-gray-100 px-2 py-1 rounded">Color: {item.color}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Employee Details */}
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <h5 className="font-medium text-sm text-gray-700 mb-2">Employee Details</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Name: </span>
                              <span className="font-medium">{item.employeeName}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Email: </span>
                              <span>{item.employeeEmail}</span>
                            </div>
                            {item.employeePhone && (
                              <div>
                                <span className="text-gray-600">Phone: </span>
                                <span>{item.employeePhone}</span>
                              </div>
                            )}
                            {item.employeeAddress && (
                              <div className="md:col-span-2">
                                <span className="text-gray-600">Address: </span>
                                <span>{item.employeeAddress}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteItemMutation.mutate(item.id)}
                        disabled={deleteItemMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No items added yet</p>
                <p className="text-sm">Click "Add Item" to start building this order</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipments Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipments
              </CardTitle>
              <Button 
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setLocation(`/admin/corporate-orders/${orderId}/add-shipment`)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Shipment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No shipments created yet</p>
              <p className="text-sm">Click "Create Shipment" to start organizing deliveries</p>
            </div>
          </CardContent>
        </Card>

        {/* Notes Section */}
        {order.adminNotes && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{order.adminNotes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}