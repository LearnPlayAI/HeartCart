import { useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Loader2, InfoIcon } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Redirector to New Product Wizard
 * 
 * This page automatically redirects to the new product wizard interface.
 * The old product edit page has been deprecated in favor of the new wizard.
 */
export default function ProductEditPage() {
  const [match, params] = useRoute('/admin/products/:id/edit');
  const [, navigate] = useLocation();
  
  // Get query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const catalogIdParam = searchParams.get('catalogId');
  const catalogId = catalogIdParam ? parseInt(catalogIdParam, 10) : undefined;
  
  // Get the product ID if we're in edit mode
  const productId = params?.id ? parseInt(params.id, 10) : undefined;
  const isNewProduct = window.location.pathname === '/admin/products/new';
  
  // Redirect to the new wizard page with appropriate parameters
  useEffect(() => {
    let redirectTimer: NodeJS.Timeout;
    
    if (isNewProduct) {
      // Creating a new product
      const redirectUrl = catalogId 
        ? `/admin/catalogs/${catalogId}/products/wizard` 
        : '/admin/products/wizard';
      
      redirectTimer = setTimeout(() => navigate(redirectUrl), 2000);
    } else if (productId) {
      // Editing an existing product
      const redirectUrl = `/admin/products/wizard/${productId}${catalogId ? `?catalogId=${catalogId}` : ''}`;
      redirectTimer = setTimeout(() => navigate(redirectUrl), 2000);
    } else {
      // Fallback to products page if no parameters
      redirectTimer = setTimeout(() => navigate('/admin/products'), 2000);
    }
    
    return () => clearTimeout(redirectTimer);
  }, [isNewProduct, productId, catalogId, navigate]);
  
  return (
    <AdminLayout>
      <div className="flex flex-col space-y-6 items-center justify-center h-full py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        
        <Alert className="max-w-xl">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Redirecting to new Product Wizard</AlertTitle>
          <AlertDescription>
            The product editing page has been upgraded to a new wizard interface.
            You'll be redirected automatically in a moment...
          </AlertDescription>
        </Alert>
      </div>
    </AdminLayout>
  );
}