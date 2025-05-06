import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ChevronLeft } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout';
import ProductForm from '@/components/admin/product-form';
import { Button } from '@/components/ui/button';
import { Product } from '@shared/schema';

export default function ProductEditPage() {
  const [match, params] = useRoute('/admin/products/:id/edit');
  const [, navigate] = useLocation();
  const [isNewProduct, setIsNewProduct] = useState(false);
  
  // Check if we're in create mode
  useEffect(() => {
    if (window.location.pathname === '/admin/products/new') {
      setIsNewProduct(true);
    }
  }, []);
  
  // Fetch product data if editing
  const productId = params?.id && !isNewProduct ? parseInt(params.id, 10) : undefined;
  
  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['/api/products', productId],
    queryFn: async () => {
      if (!productId) return null;
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error('Failed to fetch product');
      return res.json();
    },
    enabled: !!productId,
  });
  
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/products')}
            className="mr-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <h2 className="text-2xl font-bold tracking-tight">
            {isNewProduct ? 'Add Product' : `Edit Product: ${product?.name}`}
          </h2>
        </div>
        
        <ProductForm 
          productId={productId} 
          onSuccess={() => navigate('/admin/products')}
        />
      </div>
    </AdminLayout>
  );
}