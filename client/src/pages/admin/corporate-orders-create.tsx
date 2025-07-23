import AdminLayout from "@/components/admin/layout";
import { CorporateOrderForm } from "@/components/admin/CorporateOrderForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function CreateCorporateOrderPage() {
  const [, setLocation] = useLocation();

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
            <h1 className="text-2xl sm:text-3xl font-bold text-pink-600">Create New Corporate Order</h1>
            <p className="text-muted-foreground">Create a new bulk order for a corporate client</p>
          </div>
        </div>

        {/* Form */}
        <CorporateOrderForm 
          onSuccess={() => setLocation('/admin/corporate-orders')}
        />
      </div>
    </AdminLayout>
  );
}