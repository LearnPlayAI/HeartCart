import AdminLayout from "@/components/admin/layout";
import { CorporateOrderItemForm } from "@/components/admin/CorporateOrderItemForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function AddCorporateOrderItemPage() {
  const [, setLocation] = useLocation();
  const { orderId } = useParams();

  if (!orderId) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation('/admin/corporate-orders')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Corporate Orders
            </Button>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Invalid order ID</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation(`/admin/corporate-orders/${orderId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Order Details
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-pink-600">Add Order Item</h1>
            <p className="text-muted-foreground">Add a new item to corporate order #{orderId}</p>
          </div>
        </div>

        {/* Form */}
        <CorporateOrderItemForm 
          corporateOrderId={parseInt(orderId)}
          onSuccess={() => setLocation(`/admin/corporate-orders/${orderId}`)}
          onCancel={() => setLocation(`/admin/corporate-orders/${orderId}`)}
        />
      </div>
    </AdminLayout>
  );
}