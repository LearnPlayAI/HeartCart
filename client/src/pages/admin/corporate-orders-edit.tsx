import AdminLayout from "@/components/admin/layout";
import { CorporateOrderForm } from "@/components/admin/CorporateOrderForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Package } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function EditCorporateOrderPage() {
  const [, setLocation] = useLocation();
  const { orderId } = useParams();

  // Fetch corporate order details
  const { data: orderData, isLoading } = useQuery({
    queryKey: ['/api/admin/corporate-orders', orderId],
    queryFn: () => apiRequest('GET', `/api/admin/corporate-orders/${orderId}`),
    enabled: !!orderId
  });

  const order = orderData?.order;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation('/admin/corporate-orders')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Corporate Orders
            </Button>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation('/admin/corporate-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Corporate Orders
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-pink-600">Edit Corporate Order</h1>
            <p className="text-muted-foreground">
              Editing {order.orderNumber} - {order.companyName}
            </p>
          </div>
        </div>

        {/* Form */}
        <CorporateOrderForm 
          order={order}
          onSuccess={() => setLocation(`/admin/corporate-orders/${orderId}`)}
        />
      </div>
    </AdminLayout>
  );
}