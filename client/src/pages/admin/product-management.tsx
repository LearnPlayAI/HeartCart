/**
 * Product Management Page
 * 
 * This page serves as the entry point for the new product management system.
 * It supports both creating new products and editing existing ones.
 */

import React from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/layout';
import { ProductWizard } from '@/components/admin/product-management';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ProductManagementPage() {
  // Get product ID and catalog ID from URL if editing
  const [matchEdit, paramsEdit] = useRoute<{ id: string }>('/admin/products/manage/:id');
  const [matchCreate] = useRoute('/admin/products/manage');
  const [matchCatalog, paramsCatalog] = useRoute<{ catalogId: string }>('/admin/catalogs/:catalogId/products/manage');
  const [matchCatalogEdit, paramsCatalogEdit] = useRoute<{ catalogId: string, id: string }>('/admin/catalogs/:catalogId/products/manage/:id');
  
  // Determine mode and IDs
  const isEditMode = matchEdit || matchCatalogEdit;
  const productId = isEditMode ? parseInt(matchCatalogEdit ? paramsCatalogEdit.id : paramsEdit.id) : undefined;
  const catalogId = matchCatalog ? parseInt(paramsCatalog.catalogId) : 
                   matchCatalogEdit ? parseInt(paramsCatalogEdit.catalogId) : undefined;
  
  // Fetch data based on IDs
  const { data: productData } = useQuery({
    queryKey: ['/api/products', productId],
    queryFn: async () => {
      if (!productId) return null;
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.success ? data.data : null;
    },
    enabled: !!productId
  });
  
  const { data: catalogData } = useQuery({
    queryKey: ['/api/catalogs', catalogId],
    queryFn: async () => {
      if (!catalogId) return null;
      const response = await fetch(`/api/catalogs/${catalogId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.success ? data.data : null;
    },
    enabled: !!catalogId
  });
  
  const [, navigate] = useLocation();
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        {/* Header with Breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                
                {catalogId ? (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/admin/catalogs">Catalogs</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink href={`/admin/catalogs/${catalogId}/products`}>
                        {catalogData?.name || 'Catalog Products'}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                ) : (
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/admin/products">Products</BreadcrumbLink>
                  </BreadcrumbItem>
                )}
                
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink>
                    {isEditMode 
                      ? `Edit ${productData?.name || 'Product'}` 
                      : 'Create New Product'}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            
            <h1 className="text-2xl font-bold mt-2">
              {isEditMode 
                ? `Edit Product: ${productData?.name || ''}` 
                : 'Create New Product'}
            </h1>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (catalogId) {
                navigate(`/admin/catalogs/${catalogId}/products`);
              } else {
                navigate('/admin/products');
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {catalogId ? 'Catalog' : 'Products'}
          </Button>
        </div>
        
        {/* Product Wizard */}
        <ProductWizard 
          productId={productId}
        />
      </div>
    </AdminLayout>
  );
}