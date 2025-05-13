/**
 * ReviewAndSaveStep Component
 * 
 * This component presents a summary of all product information for review
 * before saving the product. It also allows going back to previous steps
 * to make changes if needed.
 */

import React, { useState } from 'react';
import { useProductWizardContext } from '../context';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDimensions } from '../../../../utils/format';
import { truncateText } from '../../../../utils/string-utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckIcon, 
  ImageIcon, 
  Package, 
  Edit, 
  SaveIcon, 
  AlertTriangleIcon, 
  Loader2
} from 'lucide-react';
import ProductImageGallery from '../ProductImageGallery';

/**
 * Simple schema validator that checks for required fields
 */
const validateProduct = (state: any) => {
  const errors: string[] = [];
  
  // Basic Info validation
  if (!state.name) errors.push('Product name is required');
  if (!state.slug) errors.push('Product slug is required');
  if (!state.sku) errors.push('Product SKU is required');
  if (state.costPrice <= 0) errors.push('Cost price must be greater than 0');
  if (state.regularPrice <= 0) errors.push('Regular price must be greater than 0');
  
  // If sale is enabled, ensure a sale price is set
  if (state.onSale && (!state.salePrice || state.salePrice <= 0)) {
    errors.push('Sale price must be set when product is on sale');
  }
  
  // Warn if main image is not set
  if (state.imageUrls.length === 0) {
    errors.push('Product has no images - at least one is recommended');
  }
  
  return errors;
};

interface ReviewAndSaveStepProps {
  onComplete?: (product: any) => void;
}

export function ReviewAndSaveStep({ onComplete }: ReviewAndSaveStepProps = {}) {
  const { 
    state, 
    markStepComplete, 
    setCurrentStep, 
    resetWizard,
    clearProductDraft
  } = useProductWizardContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);
  
  // Fetch categories for display
  const { data: categoriesResponse } = useQuery({
    queryKey: ['/api/categories'],
  });
  
  // Query catalogs
  const { data: catalogsResponse } = useQuery({
    queryKey: ['/api/catalogs'],
    enabled: true,
  });
  
  // Extract categories from the API response
  const categories = categoriesResponse && categoriesResponse.data && Array.isArray(categoriesResponse.data) 
    ? categoriesResponse.data 
    : [];
  
  // Get category name
  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return 'None';
    const category = categories.find((cat: any) => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  };
  
  // Validate product data
  const validationErrors = validateProduct(state);
  const hasErrors = validationErrors.length > 0;
  
  // Mutation for creating a product
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      // Set submitting state
      setIsSubmitting(true);
      setSavingError(null);
      
      try {
        // API request to create product
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productData),
        });
        
        // Handle API errors
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to create product');
        }
        
        // Get created product data
        const productResult = await response.json();
        
        // Move any temporary images to their final location
        if (state.imageUrls.length > 0 && state.imageObjectKeys.length > 0) {
          try {
            console.log('Moving temporary product images to final location');
            
            // Get category name
            const categoryName = getCategoryName(state.categoryId);
            
            // Find provider name based on catalog
            const provider = state.catalogId && catalogsResponse?.data 
              ? catalogsResponse.data.find((cat: any) => cat.id === state.catalogId)
              : null;
              
            const supplierName = (provider?.supplierName || 'default');
            const catalogName = (state.catalogName || provider?.name || 'default');
            
            // Send a single request with all image keys
            try {
              // Move all images from temp storage to final product location
              const moveResponse = await fetch('/api/files/products/images/move', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  sourceKeys: state.imageObjectKeys, // Send as array to match server expectation
                  productId: productResult.data.id,
                  productName: state.name,
                  categoryId: state.categoryId,
                  catalogId: state.catalogId
                }),
              });
              
              if (!moveResponse.ok) {
                const errorData = await moveResponse.json();
                console.error('Failed to move images:', errorData);
                setSavingError(prev => 
                  prev ? `${prev}. Images may not have been properly saved.` : 
                  'Product images may not have been properly saved. Product data was saved successfully.'
                );
              } else {
                console.log('Successfully moved all product images');
              }
            } catch (moveError) {
              console.error('Error moving images:', moveError);
              setSavingError(prev => 
                prev ? `${prev}. Error moving images.` : 
                'Error moving images. Product data was saved successfully.'
              );
            }
          } catch (imageError) {
            console.error('Error processing images:', imageError);
            setSavingError(prev => 
              prev ? `${prev}. Error processing images.` : 
              'Error processing images. Product data was saved successfully but images could not be processed.'
            );
          }
        }
        
        // Return created product data
        return productResult;
      } catch (error) {
        if (error instanceof Error) {
          setSavingError(error.message);
        } else {
          setSavingError('An unknown error occurred');
        }
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: (data) => {
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      if (state.catalogId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/catalogs', state.catalogId, 'products'] 
        });
      }
      
      // Mark step complete
      markStepComplete('review');
      
      // Clear any saved draft since the product was created successfully
      clearProductDraft();
      
      // Reset wizard state for a new product
      resetWizard();
      
      // Show success toast
      toast({
        title: 'Product created',
        description: `${state.name} has been created successfully`,
        variant: 'default',
      });
      
      // Call the onComplete callback if provided (for wizard navigation)
      if (onComplete) {
        onComplete(data);
      }
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Failed to create product',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Handle save product
  const handleSaveProduct = async () => {
    try {
      // Clear any previous errors
      setSavingError(null);
      setIsSubmitting(true);
      
      // Prepare product data for API - ensure numeric values for price fields
      const productData = {
        name: state.name,
        slug: state.slug,
        sku: state.sku,
        brand: state.brand || null,
        description: state.description || null,
        categoryId: Number(state.categoryId),
        price: Number(state.regularPrice), // Required field in schema
        costPrice: Number(state.costPrice),
        regularPrice: Number(state.regularPrice),
        salePrice: state.onSale ? Number(state.salePrice) : null,
        markupPercentage: Number(state.markupPercentage),
        isActive: state.isActive,
        isFeatured: state.isFeatured,
        
        // Inventory
        stockLevel: Number(state.stockLevel || 0),
        lowStockThreshold: Number(state.lowStockThreshold || 0),
        backorderEnabled: Boolean(state.backorderEnabled),
        
        // Images
        imageUrls: state.imageUrls,
        imageObjectKeys: state.imageObjectKeys,
        mainImageIndex: Number(state.mainImageIndex),
        
        // SEO
        metaTitle: state.metaTitle || state.name, // Use product name as fallback
        metaDescription: state.metaDescription || state.description || null,
        metaKeywords: state.metaKeywords || '',
        
        // Shipping
        taxable: Boolean(state.taxable),
        taxClass: state.taxClass || '',
        shippingRequired: Boolean(state.shippingRequired),
        shippingWeight: state.shippingWeight ? Number(state.shippingWeight) : null,
        shippingDimensions: state.shippingDimensions,
        
        // Add missing fields
        supplier: state.supplier || null,
        weight: state.weight ? Number(state.weight) : null,
        dimensions: state.dimensions || null,
        
        // Sales and promotions
        discount_label: state.discountLabel || null,
        special_sale_text: state.specialSaleText || null,
        special_sale_start: state.specialSaleStart || null,
        special_sale_end: state.specialSaleEnd || null,
        
        // Attributes
        attributes: state.attributes || [],
        
        // Catalog context
        catalogId: state.catalogId ? Number(state.catalogId) : null,
      };
      
      // Log the product data for debugging
      console.log('Submitting product data:', productData);
      
      // Submit data
      await createProductMutation.mutateAsync(productData);
      
      // Success! Toast is handled by the mutation's onSuccess callback
    } catch (error) {
      console.error('Product creation error:', error);
      if (error instanceof Error) {
        setSavingError(`Failed to create product: ${error.message}`);
      } else {
        setSavingError('Failed to create product due to an unknown error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle navigate to step
  const handleNavigateToStep = (step: string) => {
    setCurrentStep(step as any);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review Product Information</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review all product details before saving. You can go back to any step to make changes.
          </p>
        </CardHeader>
        <CardContent>
          {/* Validation Errors */}
          {hasErrors && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertTitle>Validation Errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-2">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Basic Info Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => handleNavigateToStep('basic-info')}
              >
                <Edit className="h-3 w-3" />
                <span>Edit</span>
              </Button>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Product Name</Label>
                <p className="font-medium">{state.name || 'Not specified'}</p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-muted-foreground">SKU</Label>
                <p className="font-medium">{state.sku || 'Not specified'}</p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-muted-foreground">URL Slug</Label>
                <p className="font-medium">{state.slug || 'Not specified'}</p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-muted-foreground">Brand</Label>
                <p className="font-medium">{state.brand || 'Not specified'}</p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-muted-foreground">Category</Label>
                <p className="font-medium">{getCategoryName(state.categoryId)}</p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-muted-foreground">Status</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={state.isActive ? "default" : "outline"}>
                    {state.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {state.isFeatured && (
                    <Badge variant="secondary">Featured</Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-1 col-span-2">
                <Label className="text-muted-foreground">Description</Label>
                <p className="font-medium whitespace-pre-wrap">
                  {state.description || 'No description provided'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Pricing Section */}
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Pricing</h3>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => handleNavigateToStep('basic-info')}
              >
                <Edit className="h-3 w-3" />
                <span>Edit</span>
              </Button>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Cost Price</Label>
                <p className="font-medium">{formatCurrency(state.costPrice)}</p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-muted-foreground">Markup</Label>
                <p className="font-medium">{state.markupPercentage}%</p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-muted-foreground">Regular Price</Label>
                <p className="font-medium">{formatCurrency(state.regularPrice)}</p>
              </div>
              
              {state.onSale && (
                <>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Sale Price</Label>
                    <p className="font-medium">{formatCurrency(state.salePrice)}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Discount</Label>
                    <Badge variant="destructive" className="font-medium">
                      {state.salePrice && state.regularPrice 
                        ? `${Math.round((1 - state.salePrice / state.regularPrice) * 100)}% OFF` 
                        : 'N/A'
                      }
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Images Section */}
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Images</h3>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => handleNavigateToStep('images')}
              >
                <Edit className="h-3 w-3" />
                <span>Edit</span>
              </Button>
            </div>
            
            <Separator />
            
            {/* Use our standardized ProductImageGallery component */}
            <ProductImageGallery 
              images={state.imageUrls.map((url, index) => ({
                url,
                index,
                isMain: index === state.mainImageIndex
              }))}
              mainImageIndex={state.mainImageIndex}
              columns={4}
              showBadges={true}
              layout="grid"
              aspectRatio="square"
              emptyState={
                <div className="text-center py-8 border rounded-md bg-muted/20">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">No images uploaded</p>
                </div>
              }
              className="mb-4"
            />
            
            {state.imageUrls.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {state.imageUrls.length} image{state.imageUrls.length !== 1 ? 's' : ''} uploaded
              </p>
            )}
          </div>
          
          {/* Inventory Section */}
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Inventory</h3>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => handleNavigateToStep('additional-info')}
              >
                <Edit className="h-3 w-3" />
                <span>Edit</span>
              </Button>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Stock Level</Label>
                <p className="font-medium">{state.stockLevel}</p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-muted-foreground">Low Stock Threshold</Label>
                <p className="font-medium">{state.lowStockThreshold}</p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-muted-foreground">Backorders</Label>
                <Badge variant={state.backorderEnabled ? "default" : "outline"}>
                  {state.backorderEnabled ? 'Allowed' : 'Not Allowed'}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Attributes Section */}
          {state.attributes.length > 0 && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Attributes</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={() => handleNavigateToStep('additional-info')}
                >
                  <Edit className="h-3 w-3" />
                  <span>Edit</span>
                </Button>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.attributes.map((attr: any) => (
                  <div key={attr.id} className="flex items-start gap-2 p-3 rounded-md border">
                    <div className="w-1/3 font-medium">{attr.name}:</div>
                    <div className="flex-1">{attr.value || 'Not specified'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Shipping Section */}
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Shipping & Tax</h3>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => handleNavigateToStep('additional-info')}
              >
                <Edit className="h-3 w-3" />
                <span>Edit</span>
              </Button>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Requires Shipping</Label>
                <Badge variant={state.shippingRequired ? "default" : "outline"}>
                  {state.shippingRequired ? 'Yes' : 'No'}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <Label className="text-muted-foreground">Taxable</Label>
                <Badge variant={state.taxable ? "default" : "outline"}>
                  {state.taxable ? 'Yes' : 'No'}
                </Badge>
              </div>
              
              {state.taxable && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Tax Class</Label>
                  <p className="font-medium">{state.taxClass || 'Standard'}</p>
                </div>
              )}
              
              {state.shippingRequired && (
                <>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Weight</Label>
                    <p className="font-medium">
                      {state.shippingWeight ? `${state.shippingWeight} kg` : 'Not specified'}
                    </p>
                  </div>
                  
                  <div className="space-y-1 col-span-2">
                    <Label className="text-muted-foreground">Dimensions (L × W × H)</Label>
                    <p className="font-medium">
                      {state.shippingDimensions.length && state.shippingDimensions.width && state.shippingDimensions.height
                        ? formatDimensions(
                            state.shippingDimensions.length,
                            state.shippingDimensions.width,
                            state.shippingDimensions.height
                          )
                        : 'Not specified'
                      }
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* SEO Section */}
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">SEO Information</h3>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => handleNavigateToStep('additional-info')}
              >
                <Edit className="h-3 w-3" />
                <span>Edit</span>
              </Button>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 gap-y-6">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Meta Title</Label>
                <p className="font-medium">{state.metaTitle || state.name || 'Not specified'}</p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-muted-foreground">Meta Description</Label>
                <p className="font-medium">{state.metaDescription || truncateText(state.description || '', 150) || 'Not specified'}</p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-muted-foreground">Meta Keywords</Label>
                <p className="font-medium">{state.metaKeywords || 'Not specified'}</p>
              </div>
            </div>
          </div>
          
          {/* Catalog Context */}
          {state.catalogId && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Catalog Information</h3>
              </div>
              
              <Separator />
              
              <div className="p-4 border rounded-md bg-muted/10">
                <p className="text-sm">
                  This product will be added to the <strong>{state.catalogName || 'Selected'}</strong> catalog.
                </p>
              </div>
            </div>
          )}
          
          {/* Saving Error */}
          {savingError && (
            <Alert variant="destructive" className="mt-8">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertTitle>Error Saving Product</AlertTitle>
              <AlertDescription>
                {savingError}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Save Button */}
          <div className="mt-8 flex justify-end gap-4">
            <Button 
              variant="default"
              size="lg"
              className="w-full md:w-auto"
              onClick={handleSaveProduct}
              disabled={isSubmitting || (hasErrors && validationErrors.some(err => !err.includes('recommended')))}
              data-save-product-button
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  <span>Save Product</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}