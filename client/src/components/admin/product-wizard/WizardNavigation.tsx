/**
 * WizardNavigation Component
 * 
 * This component provides navigation controls for the product wizard,
 * including step indicators, next/previous buttons, and validation checks.
 */

import React from 'react';
import { useProductWizardContext, WizardStep } from './context';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CheckIcon, 
  XIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  AlertCircleIcon, 
  LoaderIcon
} from 'lucide-react';

// Possible step statuses
type StepStatus = 'complete' | 'current' | 'upcoming' | 'error';

interface WizardNavigationProps {
  onComplete?: () => void;
}

export function WizardNavigation({ onComplete }: WizardNavigationProps) {
  const {
    state,
    setCurrentStep,
    nextStep,
    previousStep,
    validateCurrentStep,
    isStepComplete,
    isStepValid
  } = useProductWizardContext();
  
  // Define the steps in the wizard
  const steps: { id: WizardStep; label: string }[] = [
    { id: 'basic-info', label: 'Basic Info' },
    { id: 'images', label: 'Images' },
    { id: 'additional-info', label: 'Additional Info' },
    { id: 'seo', label: 'SEO' },
    { id: 'sales-promotions', label: 'Sales & Promotions' },
    { id: 'review', label: 'Review & Save' }
  ];
  
  // Get status icon for a step
  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'complete':
        return <CheckIcon className="h-4 w-4" />;
      case 'current':
        return <LoaderIcon className="h-4 w-4 animate-spin" />;
      case 'error':
        return <AlertCircleIcon className="h-4 w-4" />;
      case 'upcoming':
        return null;
    }
  };
  
  // Handle clicking on a step
  const handleStepClick = (step: WizardStep) => {
    // Allow navigation to any step, regardless of validation status
    // This enables jumping directly to any wizard step as requested by the user
    setCurrentStep(step);
  };
  
  // Handle next button click
  const handleNext = () => {
    // Validate current step
    const isValid = validateCurrentStep();
    if (isValid) {
      nextStep();
    }
  };
  
  // Handle previous button click
  const handlePrevious = () => {
    previousStep();
  };
  
  // Determine status for a step
  const getStepStatus = (stepId: WizardStep): StepStatus => {
    if (stepId === state.currentStep) return 'current';
    
    // Check completion status
    if (isStepComplete(stepId)) {
      return isStepValid(stepId) ? 'complete' : 'error';
    }
    
    return 'upcoming';
  };
  
  return (
    <div className="space-y-6">
      {/* Step Indicator - Mobile Optimized */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 pb-2">
        <div className="flex justify-between items-center min-w-[500px] sm:min-w-0">
          <TooltipProvider>
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              // Make all steps clickable, regardless of status
              const isClickable = true;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  {index > 0 && (
                    <div 
                      className={`flex-1 h-1 mx-1 sm:mx-2 rounded ${
                        status === 'upcoming' ? 'bg-muted' : 'bg-primary/60'
                      }`}
                    />
                  )}
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        disabled={!isClickable}
                        onClick={() => isClickable && handleStepClick(step.id)}
                        className={`relative flex flex-col items-center group ${
                          !isClickable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                        }`}
                      >
                        <div 
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border ${
                            status === 'current' 
                              ? 'bg-primary text-primary-foreground border-primary' 
                              : status === 'complete' 
                              ? 'bg-pink-200 text-pink-700 border-pink-400' 
                              : status === 'error'
                              ? 'bg-destructive/10 text-destructive border-destructive'
                              : 'bg-muted text-muted-foreground border-muted-foreground/30'
                          }`}
                        >
                          {getStatusIcon(status) || (index + 1)}
                        </div>
                        {/* Only show labels on larger screens */}
                        <span 
                          className={`mt-1 sm:mt-2 text-xs sm:text-sm hidden sm:inline ${
                            status === 'current' 
                              ? 'font-medium text-primary'
                              : status === 'complete'
                              ? 'font-medium text-pink-600'
                              : status === 'error'
                              ? 'font-medium text-destructive'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {step.label}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs sm:text-sm">
                        <p className="font-semibold">{step.label}</p>
                        <p>
                          {status === 'error' 
                            ? 'Step has validation errors'
                            : status === 'complete' 
                            ? 'Step complete'
                            : status === 'current' 
                            ? 'Current step'
                            : 'Click to navigate'
                          }
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </TooltipProvider>
        </div>
      </div>
      
      {/* Navigation Buttons - Mobile Optimized */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={steps[0].id === state.currentStep}
          size="sm"
          // Adjust button size for mobile/desktop
          className="h-9 px-3 sm:h-10 sm:px-4 gap-1"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        
        {state.currentStep !== 'review' ? (
          <Button
            onClick={handleNext}
            // Adjust button size for mobile/desktop
            className="h-9 px-3 sm:h-10 sm:px-4 gap-1"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="inline sm:hidden">Next</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => {
              // First validate the step
              const isValid = validateCurrentStep();
              if (isValid && onComplete) {
                // Only call onComplete if validation passes
                onComplete();
              }
            }}
            variant="default"
            // Adjust button size for mobile/desktop
            className="h-9 px-3 sm:h-10 sm:px-4 gap-1"
          >
            <span>Complete</span>
            <CheckIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}