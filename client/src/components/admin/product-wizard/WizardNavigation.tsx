/**
 * Product Wizard Navigation Component
 * 
 * This component handles the step navigation in the product wizard,
 * showing progress indicators and allowing navigation between steps.
 */

import React from 'react';
import { useProductWizard, getStepConfig, canNavigateToStep } from './context';
import { WizardStep, WizardActionType } from './types';
import { cn } from '@/lib/utils';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';

interface WizardNavigationProps {
  className?: string;
}

export const WizardNavigation: React.FC<WizardNavigationProps> = ({ className }) => {
  const { state, dispatch } = useProductWizard();
  const steps = getStepConfig();
  
  const handleStepClick = (stepId: WizardStep) => {
    // Only navigate if we're allowed to
    if (canNavigateToStep(state, stepId)) {
      dispatch({
        type: WizardActionType.SET_STEP,
        payload: stepId
      });
    }
  };
  
  // Determine step status for each step
  const getStepStatus = (stepId: WizardStep): 'current' | 'completed' | 'upcoming' | 'invalid' => {
    const currentStepIndex = steps.findIndex(s => s.id === state.currentStep);
    const targetStepIndex = steps.findIndex(s => s.id === stepId);
    
    if (stepId === state.currentStep) {
      return 'current';
    }
    
    if (targetStepIndex < currentStepIndex) {
      return 'completed';
    }
    
    // Check if there are any validation errors for steps we've visited
    const hasValidationErrors = Object.keys(state.validationErrors).length > 0;
    if (targetStepIndex <= currentStepIndex && hasValidationErrors) {
      return 'invalid';
    }
    
    return 'upcoming';
  };
  
  return (
    <nav className={cn("mb-6", className)}>
      <ol className="flex flex-wrap space-x-2 md:space-x-4">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(step.id);
          const isDisabled = !canNavigateToStep(state, step.id);
          
          return (
            <li key={step.id} className="flex-1 min-w-[100px]">
              <button
                type="button"
                onClick={() => handleStepClick(step.id)}
                disabled={isDisabled}
                className={cn(
                  "w-full group flex flex-col border rounded-md p-3 transition-colors",
                  stepStatus === 'current' && "border-pink-500 bg-pink-50 dark:bg-pink-900/10",
                  stepStatus === 'completed' && "border-green-500/30 bg-green-50 dark:bg-green-900/10",
                  stepStatus === 'invalid' && "border-red-500/30 bg-red-50 dark:bg-red-900/10",
                  stepStatus === 'upcoming' && "border-gray-200 dark:border-gray-800",
                  isDisabled && "opacity-60 cursor-not-allowed"
                )}
              >
                <div className="flex items-center mb-1">
                  <div className="flex items-center justify-center w-6 h-6 mr-2">
                    {stepStatus === 'current' && (
                      <Circle className="w-5 h-5 text-pink-500" />
                    )}
                    {stepStatus === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {stepStatus === 'invalid' && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    {stepStatus === 'upcoming' && (
                      <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                  <span className="text-xs font-medium">
                    Step {index + 1}
                  </span>
                </div>
                <span className={cn(
                  "text-sm",
                  stepStatus === 'current' && "text-pink-600 dark:text-pink-400 font-medium",
                  stepStatus === 'completed' && "text-green-600 dark:text-green-400",
                  stepStatus === 'invalid' && "text-red-600 dark:text-red-400",
                  stepStatus === 'upcoming' && "text-muted-foreground"
                )}>
                  {step.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden md:block">
                  {step.description}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default WizardNavigation;