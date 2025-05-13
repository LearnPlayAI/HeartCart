/**
 * WizardNavigation Component
 * 
 * This component provides navigation between wizard steps,
 * with visual indicators for completed and current steps.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Circle, 
  ArrowLeft, 
  ArrowRight, 
  ChevronRight 
} from 'lucide-react';
import { WIZARD_STEPS, WizardStep, useProductWizardContext } from './context';

interface WizardNavigationProps {
  onSave?: () => Promise<void>;
  onCancel?: () => void;
  saveLabel?: string;
  showBackToProducts?: boolean;
  backToProductsUrl?: string;
}

export const WizardNavigation: React.FC<WizardNavigationProps> = ({
  onSave,
  onCancel,
  saveLabel = 'Save',
  showBackToProducts = false,
  backToProductsUrl = '/admin/products'
}) => {
  const { 
    currentStep, 
    goToStep, 
    goToNextStep, 
    goToPreviousStep,
    state,
    validateStep,
    isSubmitting,
    createProduct,
    updateProduct
  } = useProductWizardContext();
  
  // Helper function to get step status
  const getStepStatus = (step: WizardStep) => {
    if (state.completedSteps.includes(step)) {
      return 'completed';
    }
    if (step === currentStep) {
      return 'current';
    }
    return 'pending';
  };
  
  // Get human-readable step names
  const getStepName = (step: WizardStep): string => {
    switch (step) {
      case 'basic-info':
        return 'Basic Info';
      case 'images':
        return 'Images';
      case 'additional-info':
        return 'Additional Info';
      case 'review':
        return 'Review & Save';
      default:
        return step;
    }
  };
  
  // Handle next button click with validation
  const handleNext = async () => {
    const isValid = validateStep();
    if (isValid) {
      goToNextStep();
    }
  };
  
  // Handle save button click
  const handleSave = async () => {
    // If custom save handler is provided, use it
    if (onSave) {
      await onSave();
      return;
    }
    
    // Otherwise use the context's save methods
    if (state.productId) {
      // Update existing product
      await updateProduct();
    } else {
      // Create new product
      await createProduct();
    }
  };
  
  // Calculate if we're on the first or last step
  const isFirstStep = currentStep === WIZARD_STEPS[0];
  const isLastStep = currentStep === WIZARD_STEPS[WIZARD_STEPS.length - 1];
  
  return (
    <div className="wizard-navigation">
      {/* Steps indicator */}
      <div className="flex items-center justify-center mb-8 w-full">
        {WIZARD_STEPS.map((step, index) => {
          const status = getStepStatus(step);
          const isActive = status === 'current' || status === 'completed';
          
          return (
            <React.Fragment key={step}>
              {/* Step indicator */}
              <div 
                className={cn(
                  "flex flex-col items-center cursor-pointer group",
                  status === 'completed' && "text-primary",
                  status === 'current' && "text-primary",
                  status === 'pending' && "text-muted-foreground"
                )}
                onClick={() => goToStep(step)}
              >
                {/* Step circle */}
                <div className="relative">
                  {status === 'completed' ? (
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  ) : status === 'current' ? (
                    <Circle className="h-8 w-8 text-primary border-2 border-primary rounded-full" />
                  ) : (
                    <Circle className="h-8 w-8 text-muted-foreground group-hover:text-gray-400" />
                  )}
                </div>
                
                {/* Step name */}
                <span className={cn(
                  "mt-2 text-xs font-medium",
                  status === 'current' && "font-semibold"
                )}>
                  {getStepName(step)}
                </span>
              </div>
              
              {/* Connector line between steps */}
              {index < WIZARD_STEPS.length - 1 && (
                <div 
                  className={cn(
                    "w-16 h-0.5 mx-1",
                    status === 'completed' ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between py-4 border-t mt-4">
        <div className="flex gap-2">
          {/* Cancel button */}
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          
          {/* Back to products button */}
          {showBackToProducts && (
            <Button
              variant="outline"
              onClick={() => window.location.href = backToProductsUrl}
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Products
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          {/* Previous button */}
          {!isFirstStep && (
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
          )}
          
          {/* Next button */}
          {!isLastStep && (
            <Button
              variant="default"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          
          {/* Save button */}
          {isLastStep && (
            <Button
              variant="default"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : saveLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};