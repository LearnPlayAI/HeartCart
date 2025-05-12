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
import AdditionalInfoStep from './steps/AdditionalInfoStep';
import ReviewSaveStep from './steps/ReviewSaveStep';

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
      const url = isUpdate ? `/api/products/${data.id}` : '/api/products/wizard';
      
      console.log('Making request to:', url, 'with method:', method);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Server response error:', error);
        
        if (error.details?.body) {
          // Extract validation errors from the response
          const validationErrors = Object.entries(error.details.body)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ');
          throw new Error(`Validation error: ${validationErrors}`);
        }
        
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
      console.error('Error saving product:', error);
      
      // Check if it's a validation error with detailed information
      let errorMessage = error.message || "There was a problem saving the product";
      let errorDetails = "";
      
      if (errorMessage.includes('Validation error:')) {
        // Parse validation error details from the message
        const validationPart = errorMessage.split('Validation error:')[1].trim();
        
        // Format in a readable way for the toast notification
        errorMessage = "Please fix the following fields:";
        errorDetails = validationPart
          .split(', ')
          .map(item => `• ${item.split(':')[0]}: ${item.split(':')[1]}`)
          .join('\n');
      } else if (errorMessage.includes('validation')) {
        // Fallback for general validation messages
        errorMessage = "Please fix the following validation errors:";
        errorDetails = "• Make sure product has a name and valid slug\n" +
          "• Ensure catalog is selected\n" +
          "• Check that stock value is set\n" +
          "• Verify that sale dates are in correct format";
      }
      
      toast({
        title: "Error saving product",
        description: errorMessage + (errorDetails ? "\n\n" + errorDetails : ""),
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const handleSave = async () => {
    try {
      // Create a properly formatted slug if not present
      const slug = state.productData.slug || 
        (state.productData.name ? 
          state.productData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 
          `product-${Date.now()}`);
      
      // Extract and format the data from the wizard state
      const productData = {
        ...state.productData,
        slug,
        stock: state.productData.stock || 0, // Default stock value to fix validation
        catalogId: state.catalogId,
        supplierId: state.supplierId,
        // Convert Date objects to ISO strings for server validation
        specialSaleStart: state.productData.specialSaleStart ? 
          state.productData.specialSaleStart.toISOString() : null,
        specialSaleEnd: state.productData.specialSaleEnd ? 
          state.productData.specialSaleEnd.toISOString() : null,
        flashDealStart: state.productData.flashDealStart ? 
          state.productData.flashDealStart.toISOString() : null,
        flashDealEnd: state.productData.flashDealEnd ? 
          state.productData.flashDealEnd.toISOString() : null
      };
      
      // Debug the submission data to verify all required fields are present
      console.log('Submitting product data:', {
        name: productData.name,
        slug: productData.slug,
        catalogId: productData.catalogId,
        stock: productData.stock,
        specialSaleStart: productData.specialSaleStart,
        specialSaleEnd: productData.specialSaleEnd
      });
      
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
        return <AdditionalInfoStep />;
        
      case WizardStep.REVIEW_SAVE:
        return <ReviewSaveStep />;
        
      default:
        return <div>Unknown step</div>;
    }
  };
  
  // Get catalog name if available
  const { data: catalogNameData } = useQuery({
    queryKey: ['/api/catalogs', state.catalogId],
    queryFn: async () => {
      if (!state.catalogId) return null;
      const res = await fetch(`/api/catalogs/${state.catalogId}`);
      if (!res.ok) throw new Error('Failed to fetch catalog');
      return res.json();
    },
    enabled: !!state.catalogId
  });
  
  const catalogName = catalogNameData?.data?.name;
  
  return (
    <WizardContainer onSave={handleSave} catalogName={catalogName}>
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