/**
 * Review Step Component
 * 
 * This component provides a final review of the product before publishing.
 * It shows a preview of the product card and provides validation feedback.
 */

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardFooter,
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  AlertCircle, 
  CheckCircle, 
  X, 
  ArrowLeft, 
  Save,
  Tag,
  Star,
  CircleDollarSign,
  Image as ImageIcon,
  LayoutList,
  Zap
} from 'lucide-react';
import { useDraft, WizardStep } from '../DraftContext';
import { cn } from '@/lib/utils';

interface ReviewStepProps {
  onPublish: () => Promise<void>;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ onPublish }) => {
  const { draft, draftLoading, isDirty, setCurrentStep } = useDraft();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Helper function to get badge color based on validation
  const getValidationBadgeColor = (isValid: boolean) => {
    return isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };
  
  // Navigate to a step when clicked
  const navigateToStep = (step: WizardStep) => {
    setCurrentStep(step);
  };
  
  // Handle publish button click
  const handlePublish = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onPublish();
    } catch (err: any) {
      console.error('Failed to publish product:', err);
      setError(err.message || 'Failed to publish product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Validation checks
  const hasBasicInfo = !!draft?.name && !!draft?.slug && !!draft?.categoryId;
  const hasImages = draft?.imageUrls && draft.imageUrls.length > 0;
  const hasPricing = !!draft?.regularPrice && draft.regularPrice > 0;
  const hasAttributes = draft?.attributes && draft.attributes.length > 0;
  
  // Combined validation
  const isValid = hasBasicInfo && hasPricing; // Images and attributes are optional
  
  // All steps with validation status
  const steps = [
    { 
      id: 'basic-info' as WizardStep, 
      name: 'Basic Information', 
      valid: hasBasicInfo,
      icon: <LayoutList className="h-4 w-4 mr-2" />,
      message: hasBasicInfo 
        ? 'Basic information is complete' 
        : 'Required: product name, slug, and category',
      requiredFields: ['Name', 'Slug', 'Category']
    },
    { 
      id: 'images' as WizardStep, 
      name: 'Product Images', 
      valid: true, // Images are optional
      icon: <ImageIcon className="h-4 w-4 mr-2" />,
      message: hasImages 
        ? `${draft?.imageUrls?.length} image(s) uploaded` 
        : 'No images uploaded (optional)'
    },
    { 
      id: 'pricing' as WizardStep, 
      name: 'Pricing', 
      valid: hasPricing,
      icon: <CircleDollarSign className="h-4 w-4 mr-2" />,
      message: hasPricing 
        ? `Regular price: $${draft?.regularPrice}` 
        : 'Required: regular price must be set'
    },
    { 
      id: 'attributes' as WizardStep, 
      name: 'Attributes', 
      valid: true, // Attributes are optional
      icon: <Tag className="h-4 w-4 mr-2" />,
      message: hasAttributes 
        ? `${draft?.attributes?.length} attribute(s) defined` 
        : 'No attributes defined (optional)'
    },
    { 
      id: 'promotions' as WizardStep, 
      name: 'Promotions', 
      valid: true, // Promotions are optional
      icon: <Zap className="h-4 w-4 mr-2" />,
      message: draft?.isFlashDeal 
        ? 'Flash deal configured' 
        : draft?.specialSaleText 
          ? 'Special sale configured' 
          : 'No promotions configured (optional)'
    }
  ];
  
  // If still loading, show skeleton
  if (draftLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-1/4 bg-muted rounded animate-pulse" />
        <div className="h-[300px] bg-muted rounded animate-pulse" />
        <div className="h-6 w-1/3 bg-muted rounded animate-pulse" />
        <div className="h-[200px] bg-muted rounded animate-pulse" />
      </div>
    );
  }
  
  if (!draft) {
    return (
      <div className="text-center p-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Draft Not Found</h3>
        <p className="text-muted-foreground mb-4">
          The product draft could not be loaded. Please try again.
        </p>
        <Button onClick={() => setCurrentStep('basic-info')}>
          Return to First Step
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Review Your Product</h3>
      
      {/* Product Preview */}
      <Tabs defaultValue="validation" className="w-full">
        <TabsList>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="preview">Product Preview</TabsTrigger>
        </TabsList>
        
        {/* Validation Tab */}
        <TabsContent value="validation" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Validation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.map((step) => (
                <div 
                  key={step.id}
                  className="flex justify-between items-center py-2 border-b last:border-b-0"
                >
                  <div className="flex items-center">
                    {step.icon}
                    <span className="font-medium">{step.name}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline"
                      className={cn(
                        "min-w-[100px] px-2 flex justify-center",
                        step.valid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      )}
                    >
                      {step.valid ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <X className="h-3 w-3 mr-1" />
                      )}
                      {step.valid ? 'Valid' : 'Invalid'}
                    </Badge>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigateToStep(step.id)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex flex-col items-start">
              <div className="text-sm text-muted-foreground mb-4">
                <p>{steps.filter(s => s.valid).length} of {steps.length} steps valid</p>
                <p className="mt-1">{isValid ? 'Product is ready to publish!' : 'Please fix the validation issues before publishing.'}</p>
              </div>
              
              {!isValid && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start w-full">
                  <AlertCircle className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Required fields missing</p>
                    <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                      {!hasBasicInfo && (
                        <li>Basic Information: Name, Slug, and Category are required</li>
                      )}
                      {!hasPricing && (
                        <li>Pricing: Regular price is required</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4 pt-4">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Product Card Preview */}
            <Card className="md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Product Card Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <div className="relative aspect-square bg-muted overflow-hidden">
                    {hasImages ? (
                      <img 
                        src={draft.imageUrls?.[draft.mainImageIndex || 0]} 
                        alt={draft.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    
                    {draft.onSale && draft.salePrice && (
                      <Badge className="absolute top-2 right-2 bg-red-600">
                        Sale
                      </Badge>
                    )}
                    
                    {draft.isFlashDeal && (
                      <Badge className="absolute top-2 left-2 bg-amber-500">
                        <Zap className="h-3 w-3 mr-1" />
                        Flash Deal
                      </Badge>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <h3 className="font-medium line-clamp-2">{draft.name || 'Product Name'}</h3>
                    
                    {draft.brand && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {draft.brand}
                      </p>
                    )}
                    
                    <div className="flex items-baseline mt-1">
                      {draft.onSale && draft.salePrice ? (
                        <>
                          <span className="text-lg font-bold mr-2">
                            ${Number(draft.salePrice).toFixed(2)}
                          </span>
                          <span className="text-sm text-muted-foreground line-through">
                            ${Number(draft.regularPrice).toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-bold">
                          ${Number(draft.regularPrice || 0).toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    {draft.isFeatured && (
                      <div className="flex items-center mt-2 text-amber-600">
                        <Star className="h-3 w-3 fill-amber-500 mr-1" />
                        <span className="text-xs">Featured Product</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Product Details Preview */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Product Details Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h2 className="text-xl font-bold">{draft.name || 'Product Name'}</h2>
                
                <div className="flex flex-wrap gap-2">
                  {draft.isFlashDeal && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                      <Zap className="h-3 w-3 mr-1" />
                      Flash Deal
                    </Badge>
                  )}
                  
                  {draft.isFeatured && (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  
                  {draft.discountLabel && (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                      {draft.discountLabel}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-baseline space-x-2">
                  {draft.onSale && draft.salePrice ? (
                    <>
                      <span className="text-2xl font-bold">
                        ${Number(draft.salePrice).toFixed(2)}
                      </span>
                      <span className="text-lg text-muted-foreground line-through">
                        ${Number(draft.regularPrice).toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold">
                      ${Number(draft.regularPrice || 0).toFixed(2)}
                    </span>
                  )}
                </div>
                
                {draft.specialSaleText && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    {draft.specialSaleText}
                  </div>
                )}
                
                <Separator />
                
                {draft.description ? (
                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-sm">{draft.description}</p>
                  </div>
                ) : (
                  <div className="text-muted-foreground italic text-sm">
                    No description provided.
                  </div>
                )}
                
                {hasAttributes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium mb-2">Specifications</h3>
                      <div className="space-y-2">
                        {/* We would need to fetch actual attribute names here */}
                        <p className="text-sm text-muted-foreground">
                          {draft.attributes?.length} attribute(s) defined
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Error message */}
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => navigateToStep('promotions')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Promotions
        </Button>
        
        <Button 
          onClick={handlePublish}
          disabled={!isValid || isSubmitting || isDirty}
          className="min-w-[160px]"
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Publishing...
            </span>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Publish Product
            </>
          )}
        </Button>
      </div>
      
      {isDirty && (
        <p className="text-center text-sm text-amber-600">
          Please save all changes before publishing.
        </p>
      )}
    </div>
  );
};

export default ReviewStep;