/**
 * Wizard Navigation Component
 * 
 * Provides step navigation UI for the product creation wizard,
 * showing progress and enabling navigation between steps.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronRightIcon, ChevronLeftIcon, CheckIcon, CircleIcon } from 'lucide-react';
import { useProductWizardContext, WizardStep, WIZARD_STEPS } from './context';

interface StepIndicatorProps {
  step: WizardStep;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
  disabled: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  step,
  index,
  isActive,
  isCompleted,
  onClick,
  disabled
}) => {
  return (
    <div className="flex flex-1 items-center">
      <div className="relative flex flex-col items-center flex-1">
        {/* Connector Line */}
        {index > 0 && (
          <div 
            className={cn(
              "absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 -translate-x-1/2",
              isCompleted ? "bg-primary" : "bg-border"
            )}
          />
        )}
        
        {/* Step Button */}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
            isActive 
              ? "border-primary bg-primary text-primary-foreground" 
              : isCompleted
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground",
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          )}
        >
          {isCompleted ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <span className="text-sm">{index + 1}</span>
          )}
        </button>
        
        {/* Step Label */}
        <span 
          className={cn(
            "mt-2 text-xs sm:text-sm",
            isActive 
              ? "font-medium text-foreground" 
              : isCompleted
                ? "font-medium text-primary"
                : "text-muted-foreground"
          )}
        >
          {step.label}
        </span>
      </div>
    </div>
  );
};

interface WizardNavigationProps {
  showBackButton?: boolean;
  showNextButton?: boolean;
  showFinishButton?: boolean;
  onBackClick?: () => void;
  onNextClick?: () => void;
  onFinishClick?: () => void;
  loading?: boolean;
}

const WizardNavigation: React.FC<WizardNavigationProps> = ({
  showBackButton = true,
  showNextButton = true,
  showFinishButton = false,
  onBackClick,
  onNextClick,
  onFinishClick,
  loading = false,
}) => {
  const { 
    currentStep,
    completedSteps,
    goToStep,
    canGoToStep
  } = useProductWizardContext();
  
  // Find the current step index
  const currentStepIndex = WIZARD_STEPS.findIndex(step => step.id === currentStep);
  
  // Handle navigation to step
  const handleStepClick = (stepId: string) => {
    if (canGoToStep(stepId)) {
      goToStep(stepId);
    }
  };
  
  // Handle next button click
  const handleNextClick = () => {
    if (currentStepIndex < WIZARD_STEPS.length - 1) {
      const nextStep = WIZARD_STEPS[currentStepIndex + 1];
      if (canGoToStep(nextStep.id)) {
        goToStep(nextStep.id);
      }
    }
    
    if (onNextClick) {
      onNextClick();
    }
  };
  
  // Handle back button click
  const handleBackClick = () => {
    if (currentStepIndex > 0) {
      const prevStep = WIZARD_STEPS[currentStepIndex - 1];
      goToStep(prevStep.id);
    }
    
    if (onBackClick) {
      onBackClick();
    }
  };
  
  return (
    <div className="wizard-navigation">
      {/* Steps Indicator */}
      <div className="mb-8">
        <div className="flex justify-between">
          {WIZARD_STEPS.map((step, index) => (
            <StepIndicator
              key={step.id}
              step={step}
              index={index}
              isActive={currentStep === step.id}
              isCompleted={completedSteps.includes(step.id)}
              onClick={() => handleStepClick(step.id)}
              disabled={!canGoToStep(step.id)}
            />
          ))}
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <div>
          {showBackButton && currentStepIndex > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBackClick}
              disabled={loading}
            >
              <ChevronLeftIcon className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
        </div>
        
        <div>
          {showNextButton && currentStepIndex < WIZARD_STEPS.length - 1 && (
            <Button
              type="button"
              onClick={handleNextClick}
              disabled={!completedSteps.includes(currentStep) || loading}
            >
              Next
              <ChevronRightIcon className="ml-2 h-4 w-4" />
            </Button>
          )}
          
          {showFinishButton && currentStepIndex === WIZARD_STEPS.length - 1 && (
            <Button
              type="button"
              onClick={onFinishClick}
              disabled={!completedSteps.includes(currentStep) || loading}
            >
              {loading ? "Saving..." : "Finish"}
              {!loading && <CheckIcon className="ml-2 h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WizardNavigation;