import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft,
  Edit,
  Package,
  Truck,
  FileText,
  Plus,
  DollarSign,
  Calendar,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Save,
  Trash2
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { CorporateOrderForm } from "./CorporateOrderForm";

interface CorporateOrder {
  id: number;
  orderNumber: string;
  companyName: string;
  companyAddress: string | null;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  totalItemsValue: string;
  totalPackagingCosts: string;
  totalShippingCosts: string;
  totalInvoiceAmount: string;
  adminNotes: string | null;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdByAdminId: number;
  items?: CorporateOrderItem[];
  shipments?: CorporateShipment[];
  invoiceLineItems?: CorporateInvoiceLineItem[];
}

interface CorporateOrderItem {
  id: number;
  corporateOrderId: number;
  productId: number;
  productName: string;
  productSku: string | null;
  productImageUrl: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  createdAt: string;
}

interface CorporateShipment {
  id: number;
  corporateOrderId: number;
  employeeName: string;
  employeeAddress: string;
  employeeCity: string;
  employeePostalCode: string;
  packageContents: any;
  pudoShippingCost: string;
  pudoTrackingNumber: string | null;
  shipmentStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CorporateInvoiceLineItem {
  id: number;
  corporateOrderId: number;
  description: string;
  quantity: number;
  lineItemType: string;
  unitCost: string;
  totalCost: string;
  relatedShipmentId: number | null;
  createdAt: string;
}

export function CorporateOrderDetailPage() {
  const { orderId } = useParams();
  const [, setLocation] = useLocation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch corporate order details
  const { data: orderData, isLoading } = useQuery({
    queryKey: ['/api/admin/corporate-orders', orderId],
    queryFn: () => apiRequest('GET', `/api/admin/corporate-orders/${orderId}`),
    enabled: !!orderId
  });

  const order = orderData?.order;

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ status }: { status: string }) => 
      apiRequest('PATCH', `/api/admin/corporate-orders/${orderId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/corporate-orders', orderId] });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    }
  });

  // Update payment status mutation
  const updatePaymentStatusMutation = useMutation({
    mutationFn: ({ paymentStatus, paymentMethod }: { paymentStatus: string; paymentMethod?: string }) => 
      apiRequest('PATCH', `/api/admin/corporate-orders/${orderId}/payment-status`, { 
        paymentStatus, 
        paymentMethod 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/corporate-orders', orderId] });
      toast({
        title: "Success",
        description: "Payment status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment status",
        variant: "destructive",
      });
    }
  });

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation('/admin/corporate-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation('/admin/corporate-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation('/admin/corporate-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-pink-600">{order.orderNumber}</h1>
            <p className="text-muted-foreground">{order.companyName}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Corporate Order</DialogTitle>
                <DialogDescription>
                  Update corporate order details
                </DialogDescription>
              </DialogHeader>
              <CorporateOrderForm 
                order={order}
                onSuccess={() => {
                  setIsEditDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/admin/corporate-orders', orderId] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Status Update Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant={getStatusBadgeVariant(order.status)} className="mb-2">
                {order.status}
              </Badge>
              <Select 
                value={order.status} 
                onValueChange={(value) => updateStatusMutation.mutate({ status: value })}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
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
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant={getPaymentStatusBadgeVariant(order.paymentStatus)} className="mb-2">
                {order.paymentStatus}
              </Badge>
              <Select 
                value={order.paymentStatus} 
                onValueChange={(value) => updatePaymentStatusMutation.mutate({ paymentStatus: value })}
                disabled={updatePaymentStatusMutation.isPending}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">
              {formatCurrency(parseFloat(order.totalInvoiceAmount))}
            </div>
            <p className="text-sm text-muted-foreground">
              {order.paymentMethod && `via ${order.paymentMethod}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Lines</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Company Name</Label>
                  <p className="font-medium">{order.companyName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Contact Person</Label>
                  <p className="font-medium">{order.contactPerson}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p>{order.contactEmail}</p>
                </div>
                {order.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p>{order.contactPhone}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Items Value:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(order.totalItemsValue))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Packaging Costs:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(order.totalPackagingCosts))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Costs:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(order.totalShippingCosts))}</span>
                </div>
                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-pink-600">{formatCurrency(parseFloat(order.totalInvoiceAmount))}</span>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Important Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Order Created</Label>
                  <p>{new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}</p>
                </div>
                {order.expectedDeliveryDate && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Expected Delivery</Label>
                    <p>{new Date(order.expectedDeliveryDate).toLocaleDateString()}</p>
                  </div>
                )}
                {order.actualDeliveryDate && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Actual Delivery</Label>
                    <p>{new Date(order.actualDeliveryDate).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                  <p>{new Date(order.updatedAt).toLocaleDateString()} at {new Date(order.updatedAt).toLocaleTimeString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.notes ? (
                  <p className="whitespace-pre-wrap">{order.notes}</p>
                ) : (
                  <p className="text-muted-foreground italic">No notes added</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Order Items</CardTitle>
                <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {order.items && order.items.length > 0 ? (
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {item.productImageUrl && (
                          <img 
                            src={item.productImageUrl} 
                            alt={item.productName}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div>
                          <h4 className="font-medium">{item.productName}</h4>
                          {item.productSku && (
                            <p className="text-sm text-muted-foreground">SKU: {item.productSku}</p>
                          )}
                          <p className="text-sm">Quantity: {item.quantity}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(parseFloat(item.totalPrice))}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(parseFloat(item.unitPrice))} each
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No items added to this order yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipments Tab */}
        <TabsContent value="shipments">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Shipments</CardTitle>
                <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Shipment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {order.shipments && order.shipments.length > 0 ? (
                <div className="space-y-4">
                  {order.shipments.map((shipment) => (
                    <div key={shipment.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{shipment.employeeName}</h4>
                        <Badge variant="outline">{shipment.shipmentStatus}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Address</Label>
                          <p>{shipment.employeeAddress}</p>
                          <p>{shipment.employeeCity}, {shipment.employeePostalCode}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Shipping Cost</Label>
                          <p>{formatCurrency(parseFloat(shipment.pudoShippingCost))}</p>
                          {shipment.pudoTrackingNumber && (
                            <>
                              <Label className="text-muted-foreground">Tracking Number</Label>
                              <p>{shipment.pudoTrackingNumber}</p>
                            </>
                          )}
                        </div>
                      </div>
                      {shipment.notes && (
                        <div className="mt-2 pt-2 border-t">
                          <Label className="text-muted-foreground">Notes</Label>
                          <p className="text-sm">{shipment.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No shipments created for this order yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Lines Tab */}
        <TabsContent value="invoice">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Invoice Line Items</CardTitle>
                <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {order.invoiceLineItems && order.invoiceLineItems.length > 0 ? (
                <div className="space-y-4">
                  {order.invoiceLineItems.map((lineItem) => (
                    <div key={lineItem.id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{lineItem.description}</h4>
                        <p className="text-sm text-muted-foreground">
                          Type: {lineItem.lineItemType} | Quantity: {lineItem.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(parseFloat(lineItem.totalCost))}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(parseFloat(lineItem.unitCost))} each
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No invoice line items added yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 border-l-4 border-pink-600 bg-pink-50">
                  <div className="w-2 h-2 bg-pink-600 rounded-full"></div>
                  <div>
                    <p className="font-medium">Order Created</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {order.updatedAt !== order.createdAt && (
                  <div className="flex items-center gap-4 p-4 border-l-4 border-gray-300 bg-gray-50">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <div>
                      <p className="font-medium">Order Updated</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.updatedAt).toLocaleDateString()} at {new Date(order.updatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )}

                {order.actualDeliveryDate && (
                  <div className="flex items-center gap-4 p-4 border-l-4 border-green-600 bg-green-50">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <div>
                      <p className="font-medium">Order Delivered</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.actualDeliveryDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}