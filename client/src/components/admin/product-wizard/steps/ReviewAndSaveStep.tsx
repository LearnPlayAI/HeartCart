import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Check, AlertCircle } from 'lucide-react';
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  
  // Get category for display purposes
  const { data: categoryData } = useQuery({
    queryKey: ['/api/categories', draft.categoryId],
    queryFn: async () => {
      if (!draft.categoryId) return { success: true, data: null };
      const response = await apiRequest('GET', `/api/categories/${draft.categoryId}`);
      return response.json();
    },
    enabled: !!draft.categoryId
  });
  
  // Fetch validation status
  const { data: validationData, isLoading: isValidating, refetch: refetchValidation } = useQuery({
    queryKey: ['/api/product-drafts/validate', draft.id],
    queryFn: async () => {
      const response = await apiRequest('POST', `/api/product-drafts/${draft.id}/validate`);
      return response.json();
    },
    enabled: !!draft.id
  });
  
  // Use mutation for publishing
  const publishMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/product-drafts/${draft.id}/publish`);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Product Published',
          description: 'Your product has been successfully published to the store.',
          variant: 'default',
        });
        
        // Redirect to product view or product listing
        window.location.href = `/admin/products/${data.data.id}`;
      } else {
        toast({
          title: 'Publication Failed',
          description: data.error?.message || 'An error occurred during publication.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Publication Failed',
        description: error.message || 'An error occurred during publication.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsPublishing(false);
      setShowPublishDialog(false);
    }
  });
  
  // Handle publishing
  const handlePublish = async () => {
    setIsPublishing(true);
    
    try {
      // Final validation check
      const validationResponse = await apiRequest('POST', `/api/product-drafts/${draft.id}/validate`);
      const validationResult = await validationResponse.json();
      
      if (validationResult.success && validationResult.data.isValid) {
        publishMutation.mutate();
      } else {
        setValidationErrors(validationResult.data.errors || {});
        setIsPublishing(false);
        toast({
          title: 'Validation Failed',
          description: 'Please fix the validation errors before publishing.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setIsPublishing(false);
      toast({
        title: 'Validation Failed',
        description: 'An error occurred while validating the product.',
        variant: 'destructive',
      });
    }
  };
  
  // Format price display
  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return 'Not set';
    return `R ${price.toFixed(2)}`;
  };
  
  // Get validation status and publish readiness
  const isValid = validationData?.data?.isValid || false;
  const hasImages = draft.images && draft.images.length > 0;
  
  return (
    <>
      {/* Publish Confirmation Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Publish Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to publish this product to your store? After publishing, it will be visible to customers.
            </DialogDescription>
          </DialogHeader>
          
          {Object.keys(validationErrors).length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Validation Errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-2 text-sm">
                  {Object.entries(validationErrors).map(([field, errors]) => (
                    errors.map((error, index) => (
                      <li key={`${field}-${index}`}>{error}</li>
                    ))
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowPublishDialog(false)} disabled={isPublishing}>
              Cancel
            </Button>
            <Button 
              onClick={handlePublish} 
              disabled={!isValid || isPublishing || Object.keys(validationErrors).length > 0}
              className="gap-2"
            >
              {isPublishing && <Loader2 className="h-4 w-4 animate-spin" />}
              Publish Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Review & Publish</CardTitle>
              <CardDescription>
                Review your product information before publishing
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {isValidating ? (
                <Badge variant="outline" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Validating
                </Badge>
              ) : isValid ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 gap-1">
                  <Check className="h-3 w-3" />
                  Ready to Publish
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Not Ready
                </Badge>
              )}
              <Button 
                onClick={() => setShowPublishDialog(true)} 
                disabled={!isValid || isPublishing}
                className="gap-2"
              >
                {isPublishing && <Loader2 className="h-4 w-4 animate-spin" />}
                Publish Product
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={['basic-info', 'pricing', 'images']} className="w-full">
            {/* Basic Info Section */}
            <AccordionItem value="basic-info">
              <AccordionTrigger className="text-lg font-medium">
                Basic Information
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-md">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Product Name</h4>
                    <p className="text-base">{draft.name || 'Not set'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">URL Slug</h4>
                    <p className="text-base">{draft.slug || 'Not set'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                    <p className="text-base">{categoryData?.data?.name || 'Not set'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Stock Level</h4>
                    <p className="text-base">{draft.stockLevel !== undefined ? draft.stockLevel : 'Not set'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                    <p className="text-base whitespace-pre-line">{draft.description || 'No description provided'}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Pricing Section */}
            <AccordionItem value="pricing">
              <AccordionTrigger className="text-lg font-medium">
                Pricing Information
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-md">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Regular Price</h4>
                    <p className="text-base">{formatPrice(draft.regularPrice)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Sale Price</h4>
                    <p className="text-base">{formatPrice(draft.salePrice)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Cost Price</h4>
                    <p className="text-base">{formatPrice(draft.costPrice)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">On Sale</h4>
                    <p className="text-base">{draft.onSale ? 'Yes' : 'No'}</p>
                  </div>
                  {draft.onSale && draft.saleStartDate && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Sale Start Date</h4>
                      <p className="text-base">
                        {new Date(draft.saleStartDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {draft.onSale && draft.saleEndDate && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Sale End Date</h4>
                      <p className="text-base">
                        {new Date(draft.saleEndDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Images Section */}
            <AccordionItem value="images">
              <AccordionTrigger className="text-lg font-medium">
                Product Images
              </AccordionTrigger>
              <AccordionContent>
                {hasImages ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {draft.images.map((image, index) => (
                      <div key={index} className="aspect-square rounded-md overflow-hidden border">
                        <img 
                          src={image.url} 
                          alt={`Product image ${index + 1}`} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-md">
                    <p className="text-muted-foreground">No images have been added yet</p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
            
            {/* Attributes Section */}
            <AccordionItem value="attributes">
              <AccordionTrigger className="text-lg font-medium">
                Product Attributes
              </AccordionTrigger>
              <AccordionContent>
                {draft.attributes && draft.attributes.length > 0 ? (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-md">
                    {draft.attributes.map((attribute, index) => (
                      <div key={index} className="flex flex-col gap-1">
                        <h4 className="text-sm font-medium text-muted-foreground">{attribute.name}</h4>
                        <p className="text-base">{attribute.value || 'Not set'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-md">
                    <p className="text-muted-foreground">No attributes have been set</p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
            
            {/* SEO Section */}
            <AccordionItem value="seo">
              <AccordionTrigger className="text-lg font-medium">
                SEO Information
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-4 bg-muted/30 rounded-md">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Meta Title</h4>
                    <p className="text-base">{draft.metaTitle || draft.name || 'Not set'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Meta Description</h4>
                    <p className="text-base">{draft.metaDescription || 'Not set'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Meta Keywords</h4>
                    <p className="text-base">{draft.metaKeywords || 'Not set'}</p>
                  </div>
                  {draft.canonicalUrl && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Canonical URL</h4>
                      <p className="text-base">{draft.canonicalUrl}</p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </>
  );
};

export default ReviewAndSaveStep;