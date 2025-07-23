import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Package, 
  Building2,
  DollarSign,
  Truck,
  Calendar
} from "lucide-react";
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

interface CorporateOrder {
  id: number;
  orderNumber: string;
  companyName: string;
  companyAddress: string | null;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string | null;
  orderDescription: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  totalItemsValue: string;
  totalPackagingCosts: string;
  totalShippingCosts: string;
  totalInvoiceAmount: string;
  invoiceGenerated: boolean;
  invoicePath: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  createdByAdminId: number;
}

export function CorporateOrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [orderToDelete, setOrderToDelete] = useState<CorporateOrder | null>(null);
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch corporate orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['/api/admin/corporate-orders'],
    queryFn: () => apiRequest('GET', '/api/admin/corporate-orders')
  });

  const orders = ordersData?.orders || [];

  // Filter orders based on search term
  const filteredOrders = orders.filter((order: CorporateOrder) =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Delete corporate order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: number) => 
      apiRequest('DELETE', `/api/admin/corporate-orders/${orderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/corporate-orders'] });
      toast({
        title: "Success",
        description: "Corporate order deleted successfully",
      });
      setOrderToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete corporate order",
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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Corporate Orders</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Corporate Orders</h1>
          <p className="text-muted-foreground">
            Manage bulk orders for corporate clients
          </p>
        </div>
        
        <Button 
          className="bg-pink-600 hover:bg-pink-700"
          onClick={() => setLocation('/admin/corporate-orders/create')}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Corporate Order
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders by number, company, contact name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOrders.map((order: CorporateOrder) => (
          <Card key={order.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-semibold text-pink-600">
                    {order.orderNumber}
                  </CardTitle>
                  <CardDescription className="font-medium">
                    {order.companyName}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={getStatusBadgeVariant(order.status)}>
                    {order.status}
                  </Badge>
                  <Badge variant={getPaymentStatusBadgeVariant(order.paymentStatus)}>
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Contact Information */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{order.contactPerson}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {order.contactEmail}
                </div>
                {order.contactPhone && (
                  <div className="text-sm text-muted-foreground">
                    {order.contactPhone}
                  </div>
                )}
              </div>

              {/* Financial Information */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Items Value:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(order.totalItemsValue))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Amount:</span>
                  <span className="font-bold text-lg text-pink-600">
                    {formatCurrency(parseFloat(order.totalInvoiceAmount))}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/admin/corporate-orders/${order.id}`)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/admin/corporate-orders/${order.id}/edit`)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrderToDelete(order)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Corporate Orders Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "No orders match your search criteria." : "Create your first corporate order to get started."}
            </p>
            {!searchTerm && (
              <Button 
                className="bg-pink-600 hover:bg-pink-700"
                onClick={() => setLocation('/admin/corporate-orders/create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Corporate Order
              </Button>
            )}
          </CardContent>
        </Card>
      )}



      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!orderToDelete} 
        onOpenChange={(open) => !open && setOrderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Corporate Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order {orderToDelete?.orderNumber}? 
              This action cannot be undone and will remove all associated items, 
              shipments, and invoice line items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => orderToDelete && deleteOrderMutation.mutate(orderToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteOrderMutation.isPending}
            >
              {deleteOrderMutation.isPending ? "Deleting..." : "Delete Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}