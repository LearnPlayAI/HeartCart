import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { CatalogForm } from "@/components/admin/catalog-form";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AddCatalog() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Create catalog mutation
  const { mutate: createCatalog, isPending } = useMutation({
    mutationFn: async (data: any) => {
      // Pre-process the data to ensure dates are properly formatted
      const processedData = {
        ...data,
        // Format dates as ISO strings or null
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null
      };
      
      const response = await apiRequest("POST", "/api/catalogs", processedData);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create catalog");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Catalog created",
        description: "The catalog has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/catalogs"] });
      setLocation("/admin/catalogs");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create catalog",
        variant: "destructive",
      });
    },
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add New Catalog</h1>
          <p className="text-muted-foreground">
            Create a new product catalog in the system
          </p>
        </div>
        <Link href="/admin/catalogs">
          <Button variant="outline" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Catalogs
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalog Information</CardTitle>
          <CardDescription>
            Enter the catalog details below. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CatalogForm 
            onSubmit={(data) => createCatalog(data)}
            isLoading={isPending}
          />
        </CardContent>
      </Card>
    </AdminLayout>
  );
}