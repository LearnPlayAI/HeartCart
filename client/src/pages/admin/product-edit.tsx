import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Loader2, TagsIcon } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout';
import ProductFormWizard from '@/components/admin/product-form-wizard';
import { Product } from '@shared/schema';
import { Button } from '@/components/ui/button';

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
  
  const { data: product, isLoading } = useQuery({
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
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">
            {isNewProduct ? 'Create New Product' : `Edit Product: ${product?.name}`}
          </h2>
          
          {!isNewProduct && productId && (
            <Button 
              variant="outline"
              onClick={() => navigate(`/admin/products/${productId}/attributes`)}
              disabled={!productId}
            >
              <TagsIcon className="mr-2 h-4 w-4" />
              Manage Attributes
            </Button>
          )}
        </div>
        
        <ProductFormWizard 
          productId={productId} 
          onSuccess={() => navigate('/admin/products')}
        />
      </div>
    </AdminLayout>
  );
}