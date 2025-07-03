import React from 'react';
import { useParams } from 'wouter';
import { ProductForm } from './ProductForm';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const EditProduct: React.FC = () => {
  // Get product ID from URL
  const params = useParams();
  const productId = params.id ? parseInt(params.id) : undefined;
  
  // Fetch product data - we only need the basic product info for the title
  // The actual form data will be loaded from existing product draft or created as new draft
  const { data: productData, isLoading, isError } = useQuery({
    queryKey: ['/api/products', productId],
    queryFn: async () => {
      if (!productId) return null;
      const response = await apiRequest('GET', `/api/products/${productId}`);
      return response.json();
    },
    enabled: !!productId,
  });

  // Check if a draft exists or create one based on the original product
  const { data: draftData, isLoading: isDraftLoading } = useQuery({
    queryKey: ['/api/product-drafts/for-product', productId],
    queryFn: async () => {
      if (!productId) return null;
      
      // First check if a draft already exists for this product
      try {
        // We use the POST endpoint which will either:
        // 1. Return an existing draft if one exists, or
        // 2. Create a new draft prefilled with the product data and return that
        
        // We need to determine which endpoint format to use based on our routes
        // For /api/product-drafts in product-draft-routes.ts, we send only the originalProductId
        const response = await apiRequest('POST', '/api/product-drafts', {
          originalProductId: productId
        });
        
        // If the response doesn't have the expected data structure, it might be because
        // we're hitting the wrong endpoint or route implementation
        
        return response;
      } catch (error) {
        console.error('Error getting/creating product draft:', error);
        return null;
      }
    },
    enabled: !!productId,
  });
  
  // Loading state
  if (isLoading || isDraftLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Loading product data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Error state
  if (isError || !productId || !productData?.success) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-bold mb-2">Product Not Found</h3>
            <p className="text-center text-muted-foreground mb-6">
              We couldn't find the product you're looking for.
            </p>
            <Button 
              variant="default" 
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Get product name for the title
  const productName = productData?.data?.name || 'Product';
  
  // If we have a valid draft, pass its ID to the ProductForm
  const draftId = draftData?.success ? draftData.data?.id : null;
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Edit Product: {productName}</h1>
      <ProductForm 
        editMode={true} 
        productId={productId}
        initialDraftId={draftId}
      />
    </div>
  );
};