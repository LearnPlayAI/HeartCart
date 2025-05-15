import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import type { ProductDraft } from '../ProductWizard';

interface ReviewAndSaveStepProps {
  draft: ProductDraft;
  onSave: (data: Partial<ProductDraft>, advanceToNext?: boolean) => void;
  isLoading?: boolean;
}

export const ReviewAndSaveStep: React.FC<ReviewAndSaveStepProps> = ({ 
  draft, 
  onSave, 
  isLoading = false 
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPublishing, setIsPublishing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    step: string;
    errors: string[];
  }[]>([]);

  // Fetch category name if available
  const { data: categoryData } = useQuery({
    queryKey: ['/api/categories', draft.categoryId],
    queryFn: async () => {
      if (!draft.categoryId) return { success: true, data: null };
      const response = await apiRequest('GET', `/api/categories/${draft.categoryId}`);
      return response.json();
    },
    enabled: !!draft.categoryId
  });

  // Validate the draft before publishing
  const validateDraft = async () => {
    try {
      const response = await apiRequest('POST', `/api/product-drafts/${draft.id}/validate`, {});
      const data = await response.json();
      
      if (data.success) {
        setValidationErrors([]);
        return true;
      } else {
        setValidationErrors(data.errors || []);
        return false;
      }
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: 'Could not validate the product draft',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Publish draft mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      setIsPublishing(true);
      
      // First validate the draft
      const isValid = await validateDraft();
      if (!isValid) {
        throw new Error('Draft validation failed');
      }
      
      // If valid, proceed with publishing
      const response = await apiRequest('POST', `/api/product-drafts/${draft.id}/publish`, {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
        
        toast({
          title: 'Product Published',
          description: 'Your product has been published successfully',
        });
        
        // Redirect to the product list page after successful publish
        window.location.href = '/admin/products';
      } else {
        throw new Error(data.error?.message || 'Failed to publish product');
      }
    },
    onError: (error) => {
      toast({
        title: 'Publishing Failed',
        description: error instanceof Error ? error.message : 'Failed to publish product',
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setIsPublishing(false);
    }
  });

  // Save as draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', `/api/product-drafts/${draft.id}`, {
        draftStatus: 'saved'
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate draft queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] });
        
        toast({
          title: 'Draft Saved',
          description: 'Your product draft has been saved',
        });
      } else {
        throw new Error(data.error?.message || 'Failed to save draft');
      }
    },
    onError: (error) => {
      toast({
        title: 'Saving Failed',
        description: error instanceof Error ? error.message : 'Failed to save draft',
        variant: 'destructive'
      });
    }
  });

  // Handle draft publishing
  const handlePublish = async () => {
    publishMutation.mutate();
  };

  // Handle saving as draft
  const handleSaveAsDraft = async () => {
    saveDraftMutation.mutate();
  };

  // Get the category name
  const getCategoryName = () => {
    if (draft.category) return draft.category.name;
    if (categoryData?.success && categoryData.data) return categoryData.data.name;
    return 'None';
  };

  // Format date function
  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return 'N/A';
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Your Product</CardTitle>
          <CardDescription>
            Please review all product information before publishing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Validation errors display */}
          {validationErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive rounded-md p-4 mb-6">
              <h3 className="text-destructive font-medium mb-2 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Please fix the following issues before publishing
              </h3>
              <div className="space-y-2">
                {validationErrors.map((error, index) => (
                  <div key={index} className="pl-4 border-l-2 border-destructive">
                    <p className="font-medium">{error.step}</p>
                    <ul className="list-disc list-inside pl-2 text-sm">
                      {error.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Basic Info Section */}
          <Accordion type="single" collapsible defaultValue="basic-info" className="w-full">
            <AccordionItem value="basic-info">
              <AccordionTrigger className="font-medium">
                Basic Information
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
                  <div>
                    <Label className="text-muted-foreground">Product Name</Label>
                    <p className="font-medium">{draft.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Product Slug</Label>
                    <p className="font-medium">{draft.slug}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p className="font-medium">{getCategoryName()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="font-medium">
                      {draft.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                      {draft.isFeatured && (
                        <Badge variant="secondary" className="ml-2">Featured</Badge>
                      )}
                    </p>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm whitespace-pre-wrap">{draft.description || 'No description provided'}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Pricing Section */}
            <AccordionItem value="pricing">
              <AccordionTrigger className="font-medium">
                Pricing Information
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-2">
                  <div>
                    <Label className="text-muted-foreground">Regular Price</Label>
                    <p className="font-medium">{formatCurrency(draft.regularPrice || 0)}</p>
                  </div>
                  {draft.onSale && (
                    <div>
                      <Label className="text-muted-foreground">Sale Price</Label>
                      <p className="font-medium text-green-600">{formatCurrency(draft.salePrice || 0)}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Cost Price</Label>
                    <p className="font-medium">{formatCurrency(draft.costPrice || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">On Sale</Label>
                    <p className="font-medium">{draft.onSale ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Stock Level</Label>
                    <p className="font-medium">{draft.stockLevel !== null ? draft.stockLevel : 'Not tracked'}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Images Section */}
            <AccordionItem value="images">
              <AccordionTrigger className="font-medium">
                Images ({draft.imageUrls.length})
              </AccordionTrigger>
              <AccordionContent>
                {draft.imageUrls.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-2">
                    {draft.imageUrls.map((url, index) => (
                      <div key={index} className="relative rounded-md overflow-hidden aspect-square border">
                        <img 
                          src={url} 
                          alt={`Product image ${index + 1}`} 
                          className="object-cover w-full h-full"
                        />
                        {index === draft.mainImageIndex && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-primary">Main</Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic p-2">No images added</p>
                )}
              </AccordionContent>
            </AccordionItem>
            
            {/* Attributes Section */}
            <AccordionItem value="attributes">
              <AccordionTrigger className="font-medium">
                Attributes ({draft.attributes.length})
              </AccordionTrigger>
              <AccordionContent>
                {draft.attributes.length > 0 ? (
                  <div className="space-y-2 p-2">
                    {draft.attributes.map((attr, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2">
                        <div className="font-medium">{attr.attributeId}</div>
                        <div className="text-sm text-muted-foreground">
                          {Array.isArray(attr.value) 
                            ? attr.value.join(', ') 
                            : attr.value !== null 
                              ? String(attr.value) 
                              : 'Not set'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic p-2">No attributes added</p>
                )}
              </AccordionContent>
            </AccordionItem>
            
            {/* SEO Section */}
            <AccordionItem value="seo">
              <AccordionTrigger className="font-medium">
                SEO Information
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-2">
                  <div>
                    <Label className="text-muted-foreground">Meta Title</Label>
                    <p className="font-medium">{draft.metaTitle || draft.name || 'Not set'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Meta Description</Label>
                    <p className="text-sm">{draft.metaDescription || 'Not set'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Meta Keywords</Label>
                    <p className="text-sm">{draft.metaKeywords || 'Not set'}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Sales & Promotions Section */}
            <AccordionItem value="promotions">
              <AccordionTrigger className="font-medium">
                Sales & Promotions
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
                  {draft.discountLabel && (
                    <div>
                      <Label className="text-muted-foreground">Discount Label</Label>
                      <p className="font-medium">{draft.discountLabel}</p>
                    </div>
                  )}
                  
                  {draft.specialSaleText && (
                    <div>
                      <Label className="text-muted-foreground">Special Sale Text</Label>
                      <p className="font-medium">{draft.specialSaleText}</p>
                    </div>
                  )}
                  
                  {draft.specialSaleStart && (
                    <div>
                      <Label className="text-muted-foreground">Special Sale Period</Label>
                      <p className="font-medium">
                        {formatDate(draft.specialSaleStart)} to {formatDate(draft.specialSaleEnd)}
                      </p>
                    </div>
                  )}
                  
                  {draft.isFlashDeal && (
                    <div>
                      <Label className="text-muted-foreground">Flash Deal Ends</Label>
                      <p className="font-medium">{formatDate(draft.flashDealEnd)}</p>
                    </div>
                  )}
                  
                  {!draft.discountLabel && !draft.specialSaleText && !draft.specialSaleStart && !draft.isFlashDeal && (
                    <p className="text-muted-foreground italic">No promotions configured</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-end border-t pt-6">
          <Button
            variant="outline"
            onClick={handleSaveAsDraft}
            disabled={saveDraftMutation.isPending}
          >
            {saveDraftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save as Draft
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing || publishMutation.isPending}
            className="gap-2"
          >
            {(isPublishing || publishMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
            Publish Product
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ReviewAndSaveStep;