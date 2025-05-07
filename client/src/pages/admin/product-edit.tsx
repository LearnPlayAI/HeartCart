import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Loader2, TagsIcon, ArrowLeft } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout';
import ProductFormWizard from '@/components/admin/product-form-wizard';
import { Product, Catalog } from '@shared/schema';
import { Button } from '@/components/ui/button';

export default function ProductEditPage() {
  const [match, params] = useRoute('/admin/products/:id/edit');
  const [, navigate] = useLocation();
  const [isNewProduct, setIsNewProduct] = useState(false);
  
  // Get query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const catalogIdParam = searchParams.get('catalogId');
  const catalogId = catalogIdParam ? parseInt(catalogIdParam, 10) : undefined;
  
  // Check if we're in create mode
  useEffect(() => {
    if (window.location.pathname === '/admin/products/new') {
      setIsNewProduct(true);
    }
  }, []);
  
  // Fetch product data if editing
  const productId = params?.id && !isNewProduct ? parseInt(params.id, 10) : undefined;
  
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['/api/products', productId],
    queryFn: async () => {
      if (!productId) return null;
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error('Failed to fetch product');
      return res.json();
    },
    enabled: !!productId,
  });
  
  // Fetch catalog data if creating from catalog context
  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ['/api/catalogs', catalogId],
    queryFn: async () => {
      if (!catalogId) return null;
      const res = await fetch(`/api/catalogs/${catalogId}`);
      if (!res.ok) throw new Error('Failed to fetch catalog');
      return res.json() as Promise<Catalog>;
    },
    enabled: !!catalogId && isNewProduct,
  });
  
  const isLoading = productLoading || (catalogLoading && !!catalogId);
  
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }
  
  const handleSuccessfulSave = () => {
    // If product was created from catalog context, return to catalog products page
    if (catalogId && isNewProduct) {
      navigate(`/admin/catalogs/${catalogId}/products`);
    } else {
      navigate('/admin/products');
    }
  };
  
  return (
    <AdminLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            {/* Show catalog context if applicable */}
            {catalog && isNewProduct && (
              <div className="flex flex-col">
                <div className="flex items-center mb-2">
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="h-8 p-0 mr-2" 
                    onClick={() => navigate(`/admin/catalogs/${catalogId}/products`)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Catalog
                  </Button>
                </div>
                <p className="text-muted-foreground mb-2">
                  Creating new product in <span className="font-medium">{catalog.name}</span> catalog
                </p>
              </div>
            )}
            <h2 className="text-2xl font-bold tracking-tight">
              {isNewProduct ? 'Create New Product' : `Edit Product: ${product?.name}`}
            </h2>
          </div>
          
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
          catalogId={catalogId} 
          onSuccess={handleSuccessfulSave}
        />
      </div>
    </AdminLayout>
  );
}