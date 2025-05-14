/**
 * Product Wizard Component
 * 
 * This is the main container component for the product management wizard.
 * It manages the step navigation and renders the appropriate step component.
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardFooter,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WizardNavigation } from './WizardNavigation';
import { DraftProvider, useDraft, WizardStep } from './DraftContext';
import { cn } from '@/lib/utils';

// Import step components
const BasicInfoStep = React.lazy(() => import('./steps/BasicInfoStep'));
const ImagesStep = React.lazy(() => import('./steps/ImagesStep'));
const PricingStep = React.lazy(() => import('./steps/PricingStep'));
const AttributesStep = React.lazy(() => import('./steps/AttributesStep'));
const PromotionsStep = React.lazy(() => import('./steps/PromotionsStep'));
const ReviewStep = React.lazy(() => import('./steps/ReviewStep'));

// Wizard Inner Component (uses Draft Context)
const WizardInner: React.FC = () => {
  const { 
    currentStep, 
    setCurrentStep, 
    draft, 
    draftLoading, 
    draftError,
    publishDraft,
    isDirty,
    isSaving
  } = useDraft();
  
  const [, navigate] = useLocation();
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Handle step navigation
  const goToNextStep = () => {
    // Map of step ordering
    const stepOrder: WizardStep[] = [
      'basic-info',
      'images',
      'pricing',
      'attributes',
      'promotions',
      'review'
    ];
    
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };
  
  const goToPreviousStep = () => {
    // Map of step ordering
    const stepOrder: WizardStep[] = [
      'basic-info',
      'images',
      'pricing',
      'attributes',
      'promotions',
      'review'
    ];
    
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };
  
  // Handle publish action
  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      const result = await publishDraft();
      
      if (result) {
        // Navigate to product detail page
        navigate(`/admin/products/${result.id}`);
      }
    } catch (error) {
      console.error('Failed to publish product:', error);
    } finally {
      setIsPublishing(false);
    }
  };
  
  // Render appropriate step component
  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic-info':
        return <BasicInfoStep />;
      case 'images':
        return <ImagesStep />;
      case 'pricing':
        return <PricingStep />;
      case 'attributes':
        return <AttributesStep />;
      case 'promotions':
        return <PromotionsStep />;
      case 'review':
        return <ReviewStep onPublish={handlePublish} />;
      default:
        return <div>Unknown step</div>;
    }
  };
  
  // Loading state
  if (draftLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <p>Loading product data...</p>
        </CardContent>
      </Card>
    );
  }
  
  // Error state
  if (draftError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium mb-2">Failed to load product data</p>
          <p className="text-sm text-muted-foreground mb-4">
            {draftError.message || 'There was an error loading the product data.'}
          </p>
          <Button onClick={() => navigate('/admin/products')}>
            Return to Products
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-8">
      <WizardNavigation />
      
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>
            {draft?.originalProductId 
              ? `Edit Product: ${draft?.name || 'Unnamed Product'}`
              : 'Create New Product'}
          </CardTitle>
          <CardDescription>
            {currentStep === 'basic-info' && 'Enter the basic product information'}
            {currentStep === 'images' && 'Upload and manage product images'}
            {currentStep === 'pricing' && 'Set pricing and discount options'}
            {currentStep === 'attributes' && 'Define product attributes and specifications'}
            {currentStep === 'promotions' && 'Configure promotions and special deals'}
            {currentStep === 'review' && 'Review and publish your product'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="max-h-[calc(100vh-300px)] pr-4">
            <div className="min-h-[300px]">
              <React.Suspense fallback={
                <div className="flex items-center justify-center h-60">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              }>
                {renderStepContent()}
              </React.Suspense>
            </div>
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t p-4">
          <div className="flex items-center">
            {isSaving && (
              <span className="text-xs text-muted-foreground flex items-center mr-4">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Saving changes...
              </span>
            )}
            {isDirty && !isSaving && (
              <div className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={currentStep === 'basic-info'}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            
            {currentStep !== 'review' ? (
              <Button onClick={goToNextStep}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handlePublish} 
                disabled={isPublishing}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Publish Product
                  </>
                )}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

// Main Wizard Component with Context Provider
interface ProductWizardProps {
  draftId?: number;
  productId?: number;
  className?: string;
}

export const ProductWizard: React.FC<ProductWizardProps> = ({ 
  draftId,
  productId,
  className
}) => {
  return (
    <div className={cn("container mx-auto py-6", className)}>
      <DraftProvider draftId={draftId} productId={productId}>
        <WizardInner />
      </DraftProvider>
    </div>
  );
};