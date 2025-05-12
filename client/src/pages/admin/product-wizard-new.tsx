/**
 * New Product Wizard Page
 * 
 * This page implements the new product wizard interface.
 */

import React from 'react';
import { useLocation, useRoute } from 'wouter';
import { AdminLayout } from '@/components/admin/layout';
import ProductWizard from '@/components/admin/product-wizard/ProductWizard';

export default function ProductWizardPage() {
  // Match route parameters
  const [, params] = useRoute<{ id?: string }>('/admin/products/wizard/:id?');
  const [isFromCatalog, catalogParams] = useRoute<{ catalogId: string }>('/admin/catalogs/:catalogId/products/wizard');
  
  // Get query parameters
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const queryCatalogId = searchParams.get('catalogId');
  
  // Determine if we're editing an existing product or creating a new one
  const productId = params?.id ? parseInt(params.id) : undefined;
  
  // Determine if we're in a catalog context
  const catalogId = isFromCatalog 
    ? parseInt(catalogParams.catalogId) 
    : queryCatalogId 
      ? parseInt(queryCatalogId) 
      : undefined;
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <ProductWizard 
          productId={productId}
          catalogId={catalogId}
        />
      </div>
    </AdminLayout>
  );
}