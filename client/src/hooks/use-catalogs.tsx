import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export type Catalog = {
  id: number;
  name: string;
  description: string | null;
  supplierId: number | null;
  createdAt: string;
  updatedAt: string;
};

export const catalogSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  description: z.string().nullable(),
  supplierId: z.number().nullable()
});

export function useCatalogs() {
  const { toast } = useToast();

  // Get all catalogs
  const result = useQuery<Catalog[]>({
    queryKey: ["/api/catalogs"],
    queryFn: getQueryFn()
  });

  // Get catalog by ID
  const getCatalog = (id: number) => useQuery<Catalog>({
    queryKey: ["/api/catalogs", id],
    queryFn: getQueryFn({ queryKey: ["/api/catalogs", id] }),
    enabled: !!id
  });

  // Get catalogs by supplier ID
  const getCatalogsBySupplier = (supplierId: number) => useQuery<Catalog[]>({
    queryKey: ["/api/suppliers", supplierId, "catalogs"],
    queryFn: getQueryFn({ queryKey: ["/api/suppliers", supplierId, "catalogs"] }),
    enabled: !!supplierId
  });

  // Create a new catalog
  const createCatalog = useMutation({
    mutationFn: async (data: z.infer<typeof catalogSchema>) => {
      const response = await apiRequest("POST", "/api/catalogs", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalogs"] });
      toast({
        title: "Success",
        description: "Catalog created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create catalog: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update a catalog
  const updateCatalog = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof catalogSchema> }) => {
      const response = await apiRequest("PUT", `/api/catalogs/${id}`, data);
      return await response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalogs", variables.id] });
      if (variables.data.supplierId) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/suppliers", variables.data.supplierId, "catalogs"]
        });
      }
      toast({
        title: "Success",
        description: "Catalog updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update catalog: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete a catalog
  const deleteCatalog = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/catalogs/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalogs"] });
      toast({
        title: "Success",
        description: "Catalog deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete catalog: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  return {
    getAllCatalogs,
    getCatalog,
    getCatalogsBySupplier,
    createCatalog,
    updateCatalog,
    deleteCatalog
  };
}