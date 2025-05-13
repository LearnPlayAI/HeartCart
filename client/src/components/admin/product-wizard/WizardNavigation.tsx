/**
 * WizardNavigation Component
 * 
 * This component provides navigation controls for the product wizard,
 * showing steps, progress, and allowing movement between steps.
 */

import React from 'react';
import { useProductWizardContext, WIZARD_STEPS } from './context';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardNavigationProps {
  showFinishButton?: boolean;
  onFinishClick?: () => void;
  loading?: boolean;
}

const WizardNavigation: React.FC<WizardNavigationProps> = ({
  showFinishButton = false,
  onFinishClick,
  loading = false,
}) => {
  const { 
    currentStep,
    goToStep,
    canGoToStep,
    completedSteps,
    validateStep,
    markStepComplete
  } = useProductWizardContext();
  
  // Get current step index
  const currentStepIndex = WIZARD_STEPS.findIndex(step => step.id === currentStep);
  
  // Determine if can go to next or previous step
  const canGoPrevious = currentStepIndex > 0;
  const canGoNext = currentStepIndex < WIZARD_STEPS.length - 1 && validateStep(currentStep);
  
  // Handle next button click
  const handleNextClick = () => {
    if (validateStep(currentStep)) {
      markStepComplete(currentStep);
      goToStep(WIZARD_STEPS[currentStepIndex + 1].id);
    }
  };
  
  // Handle previous button click
  const handlePreviousClick = () => {
    goToStep(WIZARD_STEPS[currentStepIndex - 1].id);
  };
  
  return (
    <div className="wizard-navigation">
      {/* Steps Indicator */}
      <div className="steps-indicator mb-6">
        <div className="flex justify-between items-center">
          {WIZARD_STEPS.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = completedSteps.includes(step.id);
            const isClickable = canGoToStep(step.id);
            
            return (
              <div key={step.id} className="flex-1 relative">
                {/* Step connector (line between steps) */}
                {index > 0 && (
                  <div 
                    className={cn(
                      "absolute top-1/2 h-1 w-full -left-1/2 -translate-y-1/2 transition-colors",
                      isCompleted || (isActive && index === currentStepIndex) ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
                
                {/* Step button */}
                <div className="flex flex-col items-center">
                  <button
                    className={cn(
                      "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                      isActive 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : isCompleted 
                          ? "border-primary bg-primary text-primary-foreground" 
                          : "border-muted bg-background text-muted-foreground",
                      isClickable ? "cursor-pointer hover:scale-105" : "cursor-default"
                    )}
                    onClick={() => isClickable && goToStep(step.id)}
                    disabled={!isClickable}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </button>
                  <span 
                    className={cn(
                      "mt-2 text-sm font-medium text-center",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePreviousClick}
          disabled={!canGoPrevious || loading}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        
        {showFinishButton ? (
          <Button 
            onClick={onFinishClick}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Finish
                <Check className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNextClick}
            disabled={!canGoNext || loading}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default WizardNavigation;