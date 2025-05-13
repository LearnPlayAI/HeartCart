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
    // Only allow navigation to steps that are complete or the current one
    const currentStepIndex = steps.findIndex(s => s.id === state.currentStep);
    const targetStepIndex = steps.findIndex(s => s.id === step);
    
    // Check current step validation before allowing to move forward
    if (targetStepIndex > currentStepIndex) {
      const isValid = validateCurrentStep();
      if (!isValid) return;
    }
    
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
      {/* Step Indicator */}
      <div className="wizard-stepnav">
        <TooltipProvider>
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            const isClickable = status !== 'upcoming';
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                {index > 0 && (
                  <div 
                    className={`wizard-stepnav-line ${
                      status === 'upcoming' 
                        ? 'incomplete' 
                        : status === 'current'
                        ? 'active'
                        : 'completed'
                    }`}
                  />
                )}
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={!isClickable}
                      onClick={() => isClickable && handleStepClick(step.id)}
                      className={`wizard-stepnav-item ${
                        !isClickable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      }`}
                    >
                      <div 
                        className={`wizard-stepnav-number ${
                          status === 'current' 
                            ? 'active' 
                            : status === 'complete' 
                            ? 'completed' 
                            : status === 'error'
                            ? 'bg-destructive/10 text-destructive border border-destructive'
                            : 'incomplete'
                        }`}
                      >
                        {getStatusIcon(status) || (index + 1)}
                      </div>
                      <span 
                        className={`wizard-stepnav-label ${
                          status === 'current' 
                            ? 'text-primary'
                            : status === 'error'
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {status === 'error' 
                      ? 'Step has validation errors'
                      : status === 'complete' 
                      ? 'Step complete'
                      : status === 'current' 
                      ? 'Current step'
                      : 'Complete previous steps first'
                    }
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </TooltipProvider>
      </div>
      
      {/* Navigation Buttons */}
      <div className="wizard-buttons">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={steps[0].id === state.currentStep}
          className="wizard-button-back gap-1"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span>Previous</span>
        </Button>
        
        {state.currentStep !== 'review' ? (
          <Button
            onClick={handleNext}
            className="wizard-button-next gap-1"
          >
            <span>Next</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={onComplete}
            variant="default"
            className="wizard-button-submit gap-1"
          >
            <span>Complete</span>
            <CheckIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}