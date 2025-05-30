import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { SupplierForm } from "@/components/admin/supplier-form";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AddSupplier() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Create supplier mutation
  const { mutate: createSupplier, isPending } = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/suppliers", data);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create supplier");
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to create supplier");
      }
      
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/suppliers" 
      });
      toast({
        title: "Success",
        description: result.message || "Supplier created successfully",
      });
      setLocation("/admin/suppliers");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create supplier",
        variant: "destructive",
      });
    },
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add New Supplier</h1>
          <p className="text-muted-foreground">
            Create a new supplier record in the system
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
          <CardTitle>Supplier Information</CardTitle>
          <CardDescription>
            Enter the supplier details below. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupplierForm 
            onSubmit={(data) => createSupplier(data)}
            isLoading={isPending}
          />
        </CardContent>
      </Card>
    </AdminLayout>
  );
}