/**
 * ProductWizard Component
 * 
 * This is the main container component for the product creation wizard.
 * It orchestrates all steps and manages the overall wizard state.
 */

import React from 'react';
import { useLocation } from 'wouter';
import { ProductWizardProvider, useProductWizardContext, WIZARD_STEPS } from './context';
import WizardNavigation from './WizardNavigation';
import BasicInfoStep from './steps/BasicInfoStep';
import ImageStep from './steps/ImageStep';
import AdditionalInfoStep from './steps/AdditionalInfoStep';
import ReviewAndSaveStep from './steps/ReviewAndSaveStep';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Props for the wizard
export interface ProductWizardProps {
  onCancel?: () => void;
  onComplete?: (productId: number) => void;
  showBackToProducts?: boolean;
  initialValues?: Record<string, any>;
  catalogId?: number;
}

// Inner component that uses the context
const ProductWizardInner: React.FC<ProductWizardProps> = ({
  onCancel,
  onComplete,
  showBackToProducts = true,
}) => {
  const [, setLocation] = useLocation();
  const { 
    currentStep, 
    createProduct, 
    updateProduct, 
    state: { productId },
    isSubmitting,
  } = useProductWizardContext();
  
  // Handle completion
  const handleComplete = async () => {
    let success = false;
    
    if (productId) {
      success = await updateProduct();
    } else {
      success = await createProduct();
    }
    
    if (success && onComplete) {
      onComplete(productId || 0);
    }
  };
  
  // Handle navigation back to products list
  const handleBackToProducts = () => {
    if (onCancel) {
      onCancel();
    } else {
      setLocation('/admin/products');
    }
  };
  
  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case 'basic-info':
        return <BasicInfoStep />;
      case 'images':
        return <ImageStep />;
      case 'additional-info':
        return <AdditionalInfoStep />;
      case 'review':
        return <ReviewAndSaveStep />;
      default:
        return <div>Unknown step</div>;
    }
  };
  
  return (
    <div className="product-wizard">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">
            {productId ? 'Edit Product' : 'Create New Product'}
          </h1>
          
          {showBackToProducts && (
            <Button
              variant="outline"
              onClick={handleBackToProducts}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          )}
        </div>
        
        <p className="text-muted-foreground text-lg">
          {productId 
            ? 'Update your product information using the step-by-step wizard below.' 
            : 'Create a new product using the step-by-step wizard below.'}
        </p>
      </div>
      
      {/* Wizard Navigation */}
      <WizardNavigation 
        showFinishButton={currentStep === 'review'}
        onFinishClick={handleComplete}
        loading={isSubmitting}
      />
      
      {/* Step Content */}
      <div className="my-8 py-4">
        {renderStep()}
      </div>
      
      {/* Wizard Navigation (bottom) */}
      <WizardNavigation 
        showFinishButton={currentStep === 'review'}
        onFinishClick={handleComplete}
        loading={isSubmitting}
      />
    </div>
  );
};

// Main public component
export const ProductWizard: React.FC<ProductWizardProps> = ({
  onCancel,
  onComplete,
  showBackToProducts,
  initialValues,
  catalogId,
}) => {
  return (
    <ProductWizardProvider 
      initialValues={initialValues}
      catalogId={catalogId}
      onComplete={onComplete}
    >
      <ProductWizardInner 
        onCancel={onCancel}
        onComplete={onComplete}
        showBackToProducts={showBackToProducts}
      />
    </ProductWizardProvider>
  );
};

export default ProductWizard;