import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Check, AlertCircle, Clock, Eye, FileCheck, FilePen, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProductDraft } from '../ProductWizard';

// Status types for product drafts
type ProductDraftStatus = 'draft' | 'in_review' | 'ready_to_publish' | 'published' | 'rejected';

interface StatusOption {
  value: ProductDraftStatus;
  label: string;
  icon?: React.ReactNode;
  description: string;
}

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
  const [, navigate] = useLocation();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [reviewNote, setReviewNote] = useState('');
  const [activeTab, setActiveTab] = useState('review');
  const [selectedStatus, setSelectedStatus] = useState<ProductDraftStatus>('draft');
  
  // Rating and review count state
  const [rating, setRating] = useState<number>((draft as any).rating || 0);
  const [reviewCount, setReviewCount] = useState<number>((draft as any).reviewCount || 0);
  
  // Status options for the workflow
  const statusOptions: StatusOption[] = [
    { 
      value: 'draft', 
      label: 'Draft', 
      icon: <FilePen className="h-4 w-4" />,
      description: 'Product is being edited and is not ready for review'
    },
    { 
      value: 'in_review', 
      label: 'In Review', 
      icon: <Eye className="h-4 w-4" />,
      description: 'Product is awaiting approval from a manager'
    },
    { 
      value: 'ready_to_publish', 
      label: 'Ready to Publish', 
      icon: <FileCheck className="h-4 w-4" />,
      description: 'Product has been approved and is ready to go live'
    },
    { 
      value: 'published', 
      label: 'Published', 
      icon: <Check className="h-4 w-4" />,
      description: 'Product is live on the store'
    },
    { 
      value: 'rejected', 
      label: 'Rejected', 
      icon: <AlertCircle className="h-4 w-4" />,
      description: 'Product needs more work before it can be published'
    }
  ];
  
  // Get all categories and find the one that matches
  const { data: allCategoriesData } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/categories');
    }
  });

  // Find the specific category
  const categoryData = allCategoriesData?.success && draft.categoryId 
    ? { 
        success: true, 
        data: allCategoriesData.data.find((cat: any) => cat.id === draft.categoryId) 
      }
    : { success: true, data: null };
  
  // Fetch validation status
  const { data: validationData, isLoading: isValidating, refetch: refetchValidation } = useQuery({
    queryKey: ['/api/product-drafts/validate', draft.id],
    queryFn: async () => {
      return await apiRequest('POST', `/api/product-drafts/${draft.id}/validate`);
    },
    enabled: !!draft.id
  });
  
  // Use mutation for status updates
  const updateStatusMutation = useMutation({
    mutationFn: async (updateData: { status: ProductDraftStatus, note?: string }) => {
      return await apiRequest('PATCH', `/api/product-drafts/${draft.id}/status`, updateData);
    },
    onSuccess: (data) => {
      if (data.success) {
        
        
        // Invalidate all relevant queries to trigger UI refresh
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts', draft.id] });
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/drafts'] });
        
        // IMPORTANT: Refetch validation when status changes to ensure publish button state is correct
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts/validate', draft.id] });
        setTimeout(() => {
          refetchValidation();
        }, 100);
        
        // Force invalidate the draft dashboard queries specifically
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] });
        queryClient.refetchQueries({ queryKey: ['/api/product-drafts'] });
        
        // Also trigger a refetch of the current component's data if passed in as a prop
        if (typeof onSave === 'function') {
          // Force a re-render by calling onSave with current data
          onSave({}, false); // This will trigger the parent to refetch
        }
        
        // Clear review note after successful update
        setReviewNote('');
      } else {
        toast({
          title: 'Status Update Failed',
          description: data.error?.message || 'An error occurred while updating the status.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Status Update Failed',
        description: error.message || 'An error occurred while updating the status.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsUpdatingStatus(false);
      setShowStatusDialog(false);
    }
  });

  // Use mutation for publishing
  const publishMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/product-drafts/${draft.id}/publish`);
    },
    onSuccess: (data) => {
      if (data.success) {
        
        
        // Invalidate all queries immediately to update UI
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts', draft.id] });
        queryClient.refetchQueries({ queryKey: ['/api/product-drafts'] });
        
        // Update the status to published WITHOUT redirecting away from this page
        updateStatusMutation.mutate({ 
          status: 'published' 
        }, {
          // Override the onSuccess handler to avoid duplicate status update toasts
          onSuccess: () => {
            // Additional cache invalidation after status update
            queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] });
            queryClient.refetchQueries({ queryKey: ['/api/product-drafts'] });
            
            // Navigate to product management page with published tab active
            setTimeout(() => {
              // Navigate using router instead of forcing page reload
              navigate(`/admin/product-management?tab=published`);
            }, 1000);
          },
          onError: () => {
            // If status update fails, still redirect but show a warning
            toast({
              title: 'Partial Success',
              description: 'Product was published but status update failed. You may need to refresh.',
              variant: 'warning',
            });
            
            setTimeout(() => {
              navigate(`/admin/product-management?tab=published`);
            }, 1000);
          }
        });
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
  
  // Handle status change
  const handleStatusChange = (newStatus: ProductDraftStatus) => {
    setIsUpdatingStatus(true);
    
    // If changing to 'ready_to_publish' or 'published', validate first
    if (newStatus === 'ready_to_publish' || newStatus === 'published') {
      // Validation will be handled in the dialog confirmation
      setShowStatusDialog(true);
    } else {
      // For other statuses, just update
      updateStatusMutation.mutate({ 
        status: newStatus,
        note: reviewNote 
      });
    }
  };
  
  // Handle dialog confirmation of status change
  const confirmStatusChange = (newStatus: ProductDraftStatus) => {
    updateStatusMutation.mutate({ 
      status: newStatus,
      note: reviewNote 
    });
  };

  // Handle publishing
  const handlePublish = async () => {
    setIsPublishing(true);
    publishMutation.mutate();
  };
  
  // Format price display - handles both number and string values
  const formatPrice = (price: number | string | null | undefined) => {
    if (price === null || price === undefined) return 'Not set';
    
    // Convert string prices to numbers
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // Check if conversion was successful and it's a valid number
    if (isNaN(numericPrice)) return 'Not set';
    
    return `R ${numericPrice.toFixed(2)}`;
  };
  
  // Get validation status and publish readiness
  const isValid = validationData?.data?.isValid || false;
  const hasImages = draft.imageUrls && draft.imageUrls.length > 0;
  
  // Debug: Log validation status to help troubleshoot
  console.log('Validation Data:', validationData);
  console.log('Is Valid:', isValid);
  console.log('Draft Status:', draft.draftStatus);
  
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
              disabled={isPublishing}
              className="gap-2"
            >
              {isPublishing && <Loader2 className="h-4 w-4 animate-spin" />}
              Publish Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Change Product Status</DialogTitle>
            <DialogDescription>
              Update the status of this product draft and add any notes for the review process.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Select New Status</h4>
              <Select
                onValueChange={(value) => {
                  setSelectedStatus(value as ProductDraftStatus);
                  setReviewNote(value === 'ready_to_publish' ? 'Product is ready to be published' : '');
                }}
                defaultValue={draft.draftStatus || 'draft'}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {statusOptions.find(o => o.value === (draft.draftStatus || 'draft'))?.description}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Review Notes</h4>
              <Textarea
                placeholder="Add any notes about this status change..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowStatusDialog(false)} 
              disabled={isUpdatingStatus}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => updateStatusMutation.mutate({ 
                status: selectedStatus,
                note: reviewNote
              })}
              disabled={isUpdatingStatus}
              className="gap-2"
            >
              {isUpdatingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
              {`Set as ${statusOptions.find(o => o.value === selectedStatus)?.label || 'Draft'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <CardTitle>Review & Publish</CardTitle>
              <CardDescription>
                Review your product information before publishing
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`gap-1 ${
                    draft.draftStatus === 'published' 
                      ? 'bg-green-50 text-green-700 border-green-300' 
                      : draft.draftStatus === 'ready_to_publish' 
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : draft.draftStatus === 'in_review'
                      ? 'bg-purple-50 text-purple-700 border-purple-300'
                      : draft.draftStatus === 'rejected'
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : 'bg-amber-50 text-amber-700 border-amber-300'
                  }`}
                >
                  {draft.draftStatus === 'published' ? (
                    <Check className="h-3 w-3" />
                  ) : draft.draftStatus === 'ready_to_publish' ? (
                    <FileCheck className="h-3 w-3" />
                  ) : draft.draftStatus === 'in_review' ? (
                    <Eye className="h-3 w-3" />
                  ) : draft.draftStatus === 'rejected' ? (
                    <AlertCircle className="h-3 w-3" />
                  ) : (
                    <FilePen className="h-3 w-3" />
                  )}
                  {statusOptions.find(o => o.value === (draft.draftStatus || 'draft'))?.label || 'Draft'}
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowStatusDialog(true)}
                  className="text-xs h-8"
                >
                  Change Status
                </Button>
              </div>
              <Button 
                onClick={() => setShowPublishDialog(true)} 
                disabled={isPublishing}
                className="gap-2"
              >
                {isPublishing && <Loader2 className="h-4 w-4 animate-spin" />}
                Publish Product
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="review">Product Review</TabsTrigger>
              <TabsTrigger value="workflow">Publishing Workflow</TabsTrigger>
            </TabsList>
            
            <TabsContent value="review" className="space-y-4">
              <Accordion type="multiple" defaultValue={['basic-info', 'pricing', 'images', 'rating-reviews']} className="w-full">
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
                        {draft.imageUrls.map((imageUrl, index) => (
                          <div key={index} className="aspect-square rounded-md overflow-hidden border">
                            <img 
                              src={imageUrl} 
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
                            <h4 className="text-sm font-medium text-muted-foreground">{attribute.attributeId}</h4>
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
                
                {/* Rating & Reviews Section */}
                <AccordionItem value="rating-reviews">
                  <AccordionTrigger className="text-lg font-medium">
                    Product Rating & Reviews
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 p-4 bg-muted/30 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Star Rating */}
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Star Rating</Label>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => {
                                    const newRating = star === rating ? 0 : star;
                                    setRating(newRating);
                                    onSave({ rating: newRating });
                                  }}
                                  className={`p-1 transition-colors rounded ${
                                    star <= rating 
                                      ? 'text-yellow-500 hover:text-yellow-600' 
                                      : 'text-gray-300 hover:text-yellow-400'
                                  }`}
                                >
                                  <Star 
                                    className="h-6 w-6" 
                                    fill={star <= rating ? 'currentColor' : 'none'}
                                  />
                                </button>
                              ))}
                              <span className="ml-2 text-sm text-muted-foreground">
                                {rating > 0 ? `${rating} star${rating !== 1 ? 's' : ''}` : 'No rating'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Set the initial star rating to make your product appear established
                            </p>
                          </div>
                        </div>
                        
                        {/* Review Count */}
                        <div className="space-y-3">
                          <Label htmlFor="reviewCount" className="text-sm font-medium">Number of Reviews</Label>
                          <div className="space-y-2">
                            <Input
                              id="reviewCount"
                              type="number"
                              min="0"
                              max="9999"
                              value={reviewCount}
                              onChange={(e) => {
                                const newCount = parseInt(e.target.value) || 0;
                                setReviewCount(newCount);
                                onSave({ review_count: newCount });
                              }}
                              placeholder="0"
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                              Set the initial review count to build customer confidence
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Preview */}
                      {(rating > 0 || reviewCount > 0) && (
                        <div className="pt-4 border-t">
                          <Label className="text-sm font-medium text-muted-foreground">Preview</Label>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm">
                              {rating > 0 && (
                                <span className="font-medium">{rating.toFixed(1)}</span>
                              )}
                              {reviewCount > 0 && (
                                <span className="text-muted-foreground ml-1">
                                  ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>
            
            <TabsContent value="workflow" className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-medium">Current Status</h3>
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-3 h-3 rounded-full ${
                          draft.draftStatus === 'published' 
                            ? 'bg-green-500' 
                            : draft.draftStatus === 'ready_to_publish' 
                            ? 'bg-blue-500'
                            : draft.draftStatus === 'in_review'
                            ? 'bg-purple-500'
                            : draft.draftStatus === 'rejected'
                            ? 'bg-red-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      <span className="font-medium">
                        {statusOptions.find(o => o.value === (draft.draftStatus || 'draft'))?.label || 'Draft'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {statusOptions.find(o => o.value === (draft.draftStatus || 'draft'))?.description}
                    </p>
                  </div>
                  
                  <div className="relative mt-4 pb-2">
                    <div className="absolute left-4 top-0 h-full w-px bg-muted-foreground/20"></div>
                    <ol className="relative space-y-8">
                      {statusOptions.map((option, index) => {
                        const isCurrentStatus = option.value === (draft.draftStatus || 'draft');
                        const isPastStatus = statusOptions.findIndex(o => o.value === (draft.draftStatus || 'draft')) > index;
                        
                        return (
                          <li key={option.value} className="relative pl-10">
                            <div className={`absolute left-1 top-1.5 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border ${
                              isCurrentStatus 
                                ? 'bg-primary border-primary text-primary-foreground' 
                                : isPastStatus
                                ? 'bg-primary/20 border-primary/20 text-primary'
                                : 'bg-muted border-muted-foreground/20'
                            }`}>
                              {isPastStatus ? (
                                <Check className="h-3 w-3" />
                              ) : isCurrentStatus ? (
                                <div className="h-2 w-2 rounded-full bg-current" />
                              ) : (
                                <div className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {option.icon}
                                <h4 className={`text-base font-medium ${isCurrentStatus ? 'text-primary' : ''}`}>
                                  {option.label}
                                </h4>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {option.description}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                  
                  <div className="flex justify-between mt-6 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowStatusDialog(true)}
                      className="gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      Change Status
                    </Button>
                    
                    <Button 
                      onClick={() => setShowPublishDialog(true)} 
                      size="sm"
                      disabled={isPublishing}
                      className="gap-2"
                    >
                      {isPublishing && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Check className="h-4 w-4" />
                      Publish Product
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
};

export default ReviewAndSaveStep;