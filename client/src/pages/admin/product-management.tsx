/**
 * Product Management Page
 * 
 * This page serves as the entry point for the new product management system.
 * It supports both creating new products and editing existing ones.
 */

import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

import { AdminLayout } from "@/components/admin/layout";
import { Card, CardContent } from "@/components/ui/card";
import { ProductWizard } from "@/components/admin/product-management/ProductWizard";
import { useToast } from "@/hooks/use-toast";

export default function ProductManagementPage() {
  const { id, catalogId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State to store the draft ID once created/loaded
  const [draftId, setDraftId] = useState<number | null>(null);
  
  // Get or create a product draft
  const { data: draft, isLoading: isDraftLoading, error: draftError } = useQuery({
    queryKey: ['product-draft', id, catalogId],
    queryFn: async () => {
      // If we have a product ID, create a draft from that product
      if (id) {
        const response = await apiRequest('POST', '/api/product-drafts', {
          originalProductId: parseInt(id)
        });
        return response.data;
      }
      
      // If we're creating from a catalog, create a draft with the catalog ID
      if (catalogId) {
        const response = await apiRequest('POST', '/api/product-drafts', {
          catalogId: parseInt(catalogId)
        });
        return response.data;
      }
      
      // Otherwise, create a blank draft
      const response = await apiRequest('POST', '/api/product-drafts', {});
      return response.data;
    },
    refetchOnWindowFocus: false,
    enabled: !draftId, // Only run if we don't have a draft ID yet
  });
  
  // When we get a draft, set the ID
  useEffect(() => {
    if (draft && !draftId) {
      setDraftId(draft.id);
    }
  }, [draft, draftId]);
  
  // If we already have a draft ID, fetch that draft
  const { data: existingDraft, isLoading: isExistingDraftLoading } = useQuery({
    queryKey: ['product-draft-detail', draftId],
    queryFn: async () => {
      if (!draftId) return null;
      const response = await apiRequest('GET', `/api/product-drafts/${draftId}`);
      return response.data;
    },
    enabled: !!draftId,
    refetchOnWindowFocus: false
  });
  
  // Publish draft mutation
  const publishDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      const response = await apiRequest('POST', `/api/product-drafts/${draftId}/publish`);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Product published successfully",
        description: "Your product is now live in the store.",
        variant: "success"
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-products'] });
      
      // Redirect to the products page
      navigate('/admin/products');
    },
    onError: (error) => {
      console.error("Error publishing product:", error);
      toast({
        title: "Failed to publish product",
        description: "There was an error publishing your product. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      const response = await apiRequest('DELETE', `/api/product-drafts/${draftId}`);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Draft discarded",
        description: "Your draft has been discarded.",
      });
      
      // Redirect to the products page
      navigate('/admin/products');
    },
    onError: (error) => {
      console.error("Error deleting draft:", error);
      toast({
        title: "Failed to discard draft",
        description: "There was an error discarding your draft. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // If there's an error loading the draft
  if (draftError) {
    return (
      <AdminLayout>
        <Card className="mx-auto max-w-4xl mt-4">
          <CardContent className="p-6">
            <div className="text-center py-10">
              <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Product</h2>
              <p className="text-muted-foreground mb-4">
                There was a problem loading the product information. Please try again.
              </p>
              <button 
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
                onClick={() => navigate(catalogId ? `/admin/catalogs/${catalogId}/products` : '/admin/products')}
              >
                Return to Products
              </button>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }
  
  // Loading state
  if (isDraftLoading || isExistingDraftLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              {id ? "Loading product data..." : "Preparing new product form..."}
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  // Get the active draft data
  const activeDraft = existingDraft || draft;
  
  if (!activeDraft) {
    return (
      <AdminLayout>
        <Card className="mx-auto max-w-4xl mt-4">
          <CardContent className="p-6">
            <div className="text-center py-10">
              <h2 className="text-xl font-semibold text-destructive mb-2">No Product Data</h2>
              <p className="text-muted-foreground mb-4">
                Unable to load or create product data. Please try again.
              </p>
              <button 
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
                onClick={() => navigate(catalogId ? `/admin/catalogs/${catalogId}/products` : '/admin/products')}
              >
                Return to Products
              </button>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  // Handlers for publish and discard
  const handlePublish = () => {
    if (activeDraft.id) {
      publishDraftMutation.mutate(activeDraft.id);
    }
  };
  
  const handleDiscard = () => {
    if (activeDraft.id) {
      if (confirm("Are you sure you want to discard this draft? This action cannot be undone.")) {
        deleteDraftMutation.mutate(activeDraft.id);
      }
    }
  };
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-6">
          {id ? "Edit Product" : "Create New Product"}
        </h1>
        
        {/* Product Wizard */}
        <ProductWizard 
          draft={activeDraft} 
          onPublish={handlePublish}
          onDiscard={handleDiscard}
          isPublishing={publishDraftMutation.isPending}
          isDiscarding={deleteDraftMutation.isPending}
        />
      </div>
    </AdminLayout>
  );
}