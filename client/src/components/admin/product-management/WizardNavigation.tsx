/**
 * Wizard Navigation Component
 * 
 * This component displays the multi-step navigation for the product wizard.
 * It shows the current step and allows navigation between steps.
 */

import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDraft, WizardStep } from './DraftContext';

interface WizardStepIndicatorProps {
  step: WizardStep;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
  isValid: boolean;
  onClick: () => void;
  stepNumber: number;
}

const WizardStepIndicator: React.FC<WizardStepIndicatorProps> = ({
  step,
  label,
  isActive,
  isCompleted,
  isValid,
  onClick,
  stepNumber
}) => {
  const stepStatus = isCompleted
    ? isValid
      ? 'complete'
      : 'invalid'
    : isActive
      ? 'active'
      : 'pending';

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all mb-2 focus:outline-none focus:ring-2 focus:ring-offset-2",
          {
            'bg-primary text-primary-foreground border-primary': isActive,
            'bg-muted text-muted-foreground border-input hover:border-primary/50': !isActive && !isCompleted,
            'bg-green-500 text-white border-green-500': isCompleted && isValid,
            'bg-destructive text-destructive-foreground border-destructive': isCompleted && !isValid,
          }
        )}
        aria-current={isActive ? 'step' : undefined}
      >
        {isCompleted ? (
          isValid ? (
            <Check className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )
        ) : (
          <span>{stepNumber}</span>
        )}
      </button>
      <span
        className={cn("text-sm font-medium", {
          'text-primary': isActive,
          'text-muted-foreground': !isActive && !isCompleted,
          'text-green-500': isCompleted && isValid,
          'text-destructive': isCompleted && !isValid,
        })}
      >
        {label}
      </span>
    </div>
  );
};

const stepConfig: Array<{ step: WizardStep; label: string }> = [
  { step: 'basic-info', label: 'Basic Info' },
  { step: 'images', label: 'Images' },
  { step: 'pricing', label: 'Pricing' },
  { step: 'attributes', label: 'Attributes' },
  { step: 'promotions', label: 'Promotions' },
  { step: 'review', label: 'Review' },
];

interface WizardNavigationProps {
  className?: string;
}

export const WizardNavigation: React.FC<WizardNavigationProps> = ({ className }) => {
  const { currentStep, setCurrentStep, isStepValid, draft } = useDraft();
  
  const handleStepClick = (step: WizardStep) => {
    setCurrentStep(step);
  };
  
  return (
    <nav className={cn("pt-4", className)}>
      <div className="flex justify-between items-center">
        {stepConfig.map(({ step, label }, index) => {
          // Check if this step is completed based on wizard progress
          const isCompleted = draft?.wizardProgress?.[step] === true;
          
          return (
            <React.Fragment key={step}>
              <WizardStepIndicator
                step={step}
                label={label}
                isActive={currentStep === step}
                isCompleted={isCompleted}
                isValid={isStepValid(step)}
                onClick={() => handleStepClick(step)}
                stepNumber={index + 1}
              />
              
              {/* Connector line between steps */}
              {index < stepConfig.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2",
                    {
                      'bg-primary': index < stepConfig.findIndex(s => s.step === currentStep),
                      'bg-muted': index >= stepConfig.findIndex(s => s.step === currentStep),
                    }
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};