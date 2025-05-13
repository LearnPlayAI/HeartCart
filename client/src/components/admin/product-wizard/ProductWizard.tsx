/**
 * ProductWizard Component
 * 
 * The main component that orchestrates the product creation wizard.
 * It handles the step navigation and coordinating the wizard context.
 */

import React, { useCallback } from 'react';
import { useLocation } from 'wouter';
import { ProductWizardProvider, useProductWizardContext } from './context';
import { WizardNavigation } from './WizardNavigation';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { ImageStep } from './steps/ImageStep';
import { AdditionalInfoStep } from './steps/AdditionalInfoStep';
import { SalesPromotionsStep } from './steps/SalesPromotionsStep';
import { ReviewAndSaveStep } from './steps/ReviewAndSaveStep';
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';

interface ProductWizardProps {
  catalogId?: number;
  catalogName?: string;
  onComplete?: (product: any) => void;
  onCancel?: () => void;
}

// Internal Wizard wrapper that has access to context
function ProductWizardContent({
  onComplete,
  onCancel
}: Omit<ProductWizardProps, 'catalogId' | 'catalogName'>) {
  const { state, resetWizard } = useProductWizardContext();
  const [, setLocation] = useLocation();
  
  // Handle completion of the wizard
  const handleComplete = useCallback(() => {
    // Call the product save function in the ReviewAndSaveStep component
    const reviewStep = document.querySelector('[data-save-product-button]');
    if (reviewStep) {
      // Simulate a click on the save button in the ReviewAndSaveStep
      // Cast to HTMLButtonElement to fix TypeScript error
      (reviewStep as HTMLButtonElement).click();
      // The onComplete callback will be called by the mutation's onSuccess handler
    } else if (onComplete) {
      // Fallback if we can't find the save button
      onComplete(state);
    } else {
      // Default completion behavior if no handler is provided
      setLocation('/admin/products');
    }
  }, [onComplete, setLocation, state]);
  
  // Handle cancellation of the wizard
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      // Default cancellation behavior if no handler is provided
      resetWizard();
      setLocation('/admin/products');
    }
  }, [onCancel, resetWizard, setLocation]);
  
  // Render the appropriate step based on the current step in context
  const renderStep = (step: string) => {
    switch (step) {
      case 'basic-info':
        return <BasicInfoStep />;
      case 'images':
        return <ImageStep />;
      case 'additional-info':
        return <AdditionalInfoStep />;
      case 'sales-promotions':
        return <SalesPromotionsStep />;
      case 'review':
        return <ReviewAndSaveStep />;
      default:
        return <BasicInfoStep />;
    }
  };
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          {state.productId
            ? 'Edit Product'
            : state.catalogName 
              ? `Add Product to ${state.catalogName}` 
              : 'Add New Product'
          }
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="rounded-full"
          aria-label="Cancel"
        >
          <XIcon className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="space-y-8">
        <WizardNavigation onComplete={handleComplete} />
        
        <div className="mt-8 pb-8">
          {renderStep(state.currentStep)}
        </div>
      </div>
    </div>
  );
}

// Main export component with Provider
export function ProductWizard({ 
  catalogId,
  catalogName,
  productId,
  onComplete,
  onCancel
}: ProductWizardProps & { productId?: number }) {
  // Initial state overrides
  const initialState = {
    catalogId,
    catalogName,
    productId
  };
  
  return (
    <ProductWizardProvider initialState={initialState}>
      <ProductWizardContent
        onComplete={onComplete}
        onCancel={onCancel}
      />
    </ProductWizardProvider>
  );
}