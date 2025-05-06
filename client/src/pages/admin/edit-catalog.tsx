import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { CatalogForm } from "@/components/admin/catalog-form";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Catalog = {
  id: number;
  name: string;
  supplierId: number; // Changed from string to number to match form schema
  description: string;
  isActive: boolean;
  startDate: Date;
  endDate: Date | null;
  defaultMarkupPercentage: number; // Changed from markupPercentage to defaultMarkupPercentage
  freeShipping: boolean;
};

export default function EditCatalog() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const catalogId = params.id;

  // Fetch catalog details
  const { data: catalog, isLoading } = useQuery<Catalog>({
    queryKey: [`/api/catalogs/${catalogId}`],
    enabled: !!catalogId,
  });

  // Update catalog mutation
  const { mutate: updateCatalog, isPending } = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/catalogs/${catalogId}`, data);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update catalog");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Catalog updated",
        description: "The catalog has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/catalogs"] });
      queryClient.invalidateQueries({ queryKey: [`/api/catalogs/${catalogId}`] });
      setLocation("/admin/catalogs");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update catalog",
        variant: "destructive",
      });
    },
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Catalog</h1>
          <p className="text-muted-foreground">
            Update catalog information
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
          <CardTitle>
            {catalog ? catalog.name : "Loading catalog..."}
          </CardTitle>
          <CardDescription>
            Edit the catalog details below. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
            </div>
          ) : catalog ? (
            <CatalogForm 
              initialData={catalog}
              onSubmit={(data) => updateCatalog(data)}
              isLoading={isPending}
            />
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                Catalog not found. Please check the URL and try again.
              </p>
              <Link href="/admin/catalogs">
                <Button className="mt-4">Go to Catalogs List</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}