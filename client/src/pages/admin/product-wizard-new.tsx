/**
 * New Product Wizard Page
 * 
 * This page implements the new product wizard interface.
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { AdminLayout } from '@/components/admin/layout';
import ProductWizard from '@/components/admin/product-wizard/ProductWizard';
import { useQuery } from '@tanstack/react-query';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';

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
  
  // Fetch catalog info if catalogId is provided
  const { data: catalogData } = useQuery({
    queryKey: catalogId ? [`/api/catalogs/${catalogId}`] : null,
    queryFn: async () => {
      if (!catalogId) return null;
      const response = await fetch(`/api/catalogs/${catalogId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!catalogId
  });
  
  // Fetch product info if productId is provided
  const { data: productData } = useQuery({
    queryKey: productId ? [`/api/products/${productId}`] : null,
    queryFn: async () => {
      if (!productId) return null;
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!productId
  });
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            
            {/* Show Products or Catalog link depending on context */}
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
                {productId ? `Edit ${productData?.name || 'Product'}` : 'Add New Product'}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <ProductWizard 
          productId={productId}
          catalogId={catalogId}
        />
      </div>
    </AdminLayout>
  );
}