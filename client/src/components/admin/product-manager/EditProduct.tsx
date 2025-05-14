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
  
  // Fetch product data
  const { data: productData, isLoading, isError } = useQuery({
    queryKey: ['/api/products', productId],
    queryFn: async () => {
      if (!productId) return null;
      const response = await apiRequest('GET', `/api/products/${productId}`);
      return response.json();
    },
    enabled: !!productId,
  });
  
  // Loading state
  if (isLoading) {
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
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Edit Product: {productName}</h1>
      <ProductForm editMode={true} productId={productId} />
    </div>
  );
};