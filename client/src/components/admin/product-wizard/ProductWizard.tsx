/**
 * Product Wizard Main Component
 * 
 * This is the main entry point for the product wizard that combines
 * all the steps and manages the workflow.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

import { ProductWizardProvider, useProductWizard } from './context';
import { WizardStep, ProductWizardData } from './types';
import WizardContainer from './WizardContainer';
import BasicInfoStep from './steps/BasicInfoStep';
import ProductImagesStep from './steps/ProductImagesStep';
// Additional steps will be imported as they are implemented

interface ProductWizardProps {
  catalogId?: number;
  productId?: number;
}

// Internal component that uses the context
const ProductWizardContent: React.FC = () => {
  const { state } = useProductWizard();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Save product mutation
  const saveProduct = useMutation({
    mutationFn: async (data: ProductWizardData) => {
      const isUpdate = !!data.id;
      const method = isUpdate ? 'PUT' : 'POST';
      const url = isUpdate ? `/api/wizard/products/${data.id}` : '/api/wizard/products';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save product');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Show success message
      toast({
        title: "Product saved successfully",
        description: `${data.id ? 'Updated' : 'Created'} product: ${data.name}`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      if (state.catalogId) {
        queryClient.invalidateQueries({ queryKey: [`/api/catalogs/${state.catalogId}/products`] });
      }
      
      // Navigate back to products list or catalog
      if (state.catalogId) {
        navigate(`/admin/catalogs/${state.catalogId}/products`);
      } else {
        navigate('/admin/products');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving product",
        description: error.message || "There was a problem saving the product",
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const handleSave = async () => {
    try {
      // Extract the relevant data from the wizard state
      const productData = {
        ...state.productData,
        catalogId: state.catalogId,
        supplierId: state.supplierId,
      };
      
      // Call the mutation
      await saveProduct.mutateAsync(productData);
      
      return true;
    } catch (error) {
      console.error('Error saving product:', error);
      return false;
    }
  };
  
  // Render the appropriate step based on current step
  const renderStepContent = () => {
    switch (state.currentStep) {
      case WizardStep.BASIC_INFO:
        return <BasicInfoStep />;
        
      case WizardStep.PRODUCT_IMAGES:
        return <ProductImagesStep />;
        
      case WizardStep.ADDITIONAL_INFO:
        // This will be implemented later
        return <div>Additional Info Step (Coming Soon)</div>;
        
      case WizardStep.REVIEW_SAVE:
        // This will be implemented later
        return <div>Review & Save Step (Coming Soon)</div>;
        
      default:
        return <div>Unknown step</div>;
    }
  };
  
  return (
    <WizardContainer onSave={handleSave} catalogName={state.catalogId ? 'Sample Catalog' : undefined}>
      {renderStepContent()}
    </WizardContainer>
  );
};

// Main export component that provides the context
const ProductWizard: React.FC<ProductWizardProps> = ({ catalogId, productId }) => {
  const { toast } = useToast();
  const [catalogData, setCatalogData] = useState<{ id: number; name: string; supplierId: number } | null>(null);
  const [initialProductData, setInitialProductData] = useState<Partial<ProductWizardData> | null>(null);
  
  // Fetch catalog data if catalogId is provided
  const { data: catalogResponse, isLoading: isCatalogLoading } = useQuery({
    queryKey: [`/api/catalogs/${catalogId}`],
    queryFn: async () => {
      if (!catalogId) return null;
      const res = await fetch(`/api/catalogs/${catalogId}`);
      if (!res.ok) throw new Error('Failed to fetch catalog');
      return res.json();
    },
    enabled: !!catalogId
  });
  
  // Fetch product data if productId is provided
  const { data: productResponse, isLoading: isProductLoading } = useQuery({
    queryKey: [`/api/products/${productId}`],
    queryFn: async () => {
      if (!productId) return null;
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error('Failed to fetch product');
      return res.json();
    },
    enabled: !!productId
  });
  
  // Process catalog data when available
  useEffect(() => {
    if (catalogResponse?.data) {
      setCatalogData({
        id: catalogResponse.data.id,
        name: catalogResponse.data.name,
        supplierId: catalogResponse.data.supplierId
      });
    }
  }, [catalogResponse]);
  
  // Process product data when available
  useEffect(() => {
    if (productResponse?.data) {
      const product = productResponse.data;
      
      // Convert to wizard data format
      const wizardData: Partial<ProductWizardData> = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        categoryId: product.categoryId,
        price: product.price,
        costPrice: product.costPrice || 0,
        salePrice: product.salePrice || null,
        discount: product.discount || 0,
        discountLabel: product.discountLabel || '',
        minimumPrice: product.minimumPrice || 0,
        imageUrl: product.imageUrl,
        additionalImages: product.additionalImages || [],
        uploadedImages: [
          ...(product.imageUrl ? [{ url: product.imageUrl, isMain: true, order: 0 }] : []),
          ...(product.additionalImages || []).map((url, index) => ({ 
            url, 
            isMain: false, 
            order: index + 1 
          }))
        ],
        sku: product.sku || '',
        brand: product.brand || '',
        minimumOrder: product.minimumOrder || 1,
        tags: product.tags || [],
        shortDescription: product.shortDescription || '',
        isFlashDeal: product.isFlashDeal || false,
        flashDealStart: product.flashDealStart ? new Date(product.flashDealStart) : null,
        flashDealEnd: product.flashDealEnd ? new Date(product.flashDealEnd) : null,
        freeShipping: product.freeShipping || false,
        isFeatured: product.isFeatured || false,
        specialSaleText: product.specialSaleText || '',
        specialSaleStart: product.specialSaleStart ? new Date(product.specialSaleStart) : null,
        specialSaleEnd: product.specialSaleEnd ? new Date(product.specialSaleEnd) : null,
        status: product.isActive ? 'active' : 'inactive',
        // Other fields will be populated later
      };
      
      setInitialProductData(wizardData);
    }
  }, [productResponse]);
  
  // Show loading state while fetching data
  if ((catalogId && isCatalogLoading) || (productId && isProductLoading)) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Loading wizard data...</span>
      </div>
    );
  }
  
  return (
    <ProductWizardProvider 
      initialData={initialProductData || undefined} 
      catalogId={catalogData?.id} 
      supplierId={catalogData?.supplierId}
    >
      <ProductWizardContent />
    </ProductWizardProvider>
  );
};

export default ProductWizard;