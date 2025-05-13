/**
 * ProductWizard Component
 * 
 * This is the main container component for the product creation wizard.
 * It orchestrates all steps and manages the overall wizard state.
 */

import React from 'react';
import { ProductWizardProvider } from './context';
import { WizardNavigation } from './WizardNavigation';
import BasicInfoStep from './steps/BasicInfoStep';
import ImageStep from './steps/ImageStep';
import AdditionalInfoStep from './steps/AdditionalInfoStep';
import ReviewAndSaveStep from './steps/ReviewAndSaveStep';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useProductWizardContext } from './context';

// Wrap with context to check current step
const WizardStepRenderer: React.FC = () => {
  const { currentStep } = useProductWizardContext();
  
  // Render the appropriate step based on the current step
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

export interface ProductWizardProps {
  onCancel?: () => void;
  onComplete?: (productId: number) => void;
  showBackToProducts?: boolean;
  initialValues?: Record<string, any>;
  catalogId?: number;
}

export const ProductWizard: React.FC<ProductWizardProps> = ({
  onCancel,
  onComplete,
  showBackToProducts = false,
  initialValues = {},
  catalogId
}) => {
  // Create a custom save handler that will call onComplete if provided
  const handleSave = async () => {
    // The save operation is handled by the context
    // We just need to provide any additional callback logic here
  };
  
  return (
    <ProductWizardProvider
      initialState={initialValues}
      catalogId={catalogId}
    >
      <div className="product-wizard-container">
        <Card className="product-wizard-card">
          <CardContent className="pt-6">
            {/* Wizard step content */}
            <div className="wizard-step-content mb-8">
              <WizardStepRenderer />
            </div>
            
            {/* Wizard navigation */}
            <WizardNavigation
              onCancel={onCancel}
              onSave={onComplete ? handleSave : undefined}
              showBackToProducts={showBackToProducts}
              saveLabel={initialValues?.productId ? 'Update Product' : 'Create Product'}
            />
          </CardContent>
        </Card>
      </div>
    </ProductWizardProvider>
  );
};