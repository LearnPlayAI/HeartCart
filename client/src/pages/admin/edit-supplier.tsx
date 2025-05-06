import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { SupplierForm } from "@/components/admin/supplier-form";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Supplier = {
  id: number;
  name: string;
  email: string;
  phone: string;
  contactName: string; // Changed from contactPerson to match database schema
  address?: string;
  notes?: string; // Changed from description to match database schema
  website?: string;
  isActive: boolean;
};

export default function EditSupplier() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const supplierId = params.id;

  // Fetch supplier details
  const { data: supplier, isLoading } = useQuery<Supplier>({
    queryKey: [`/api/suppliers/${supplierId}`],
    enabled: !!supplierId,
  });

  // Update supplier mutation
  const { mutate: updateSupplier, isPending } = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/suppliers/${supplierId}`, data);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update supplier");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Supplier updated",
        description: "The supplier has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: [`/api/suppliers/${supplierId}`] });
      setLocation("/admin/suppliers");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update supplier",
        variant: "destructive",
      });
    },
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Supplier</h1>
          <p className="text-muted-foreground">
            Update supplier information
          </p>
        </div>
        <Link href="/admin/suppliers">
          <Button variant="outline" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Suppliers
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {supplier ? supplier.name : "Loading supplier..."}
          </CardTitle>
          <CardDescription>
            Edit the supplier details below. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
            </div>
          ) : supplier ? (
            <SupplierForm 
              initialData={supplier}
              onSubmit={(data) => updateSupplier(data)}
              isLoading={isPending}
            />
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                Supplier not found. Please check the URL and try again.
              </p>
              <Link href="/admin/suppliers">
                <Button className="mt-4">Go to Suppliers List</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}