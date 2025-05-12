/**
 * Wizard Navigation Component
 * 
 * This component provides navigation through the steps of the product wizard.
 */

import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { useProductWizard, getStepConfig, canNavigateToStep } from './context';
import { WizardStep, WizardActionType } from './types';

interface WizardNavigationProps {
  className?: string;
}

const WizardNavigation: React.FC<WizardNavigationProps> = ({ className }) => {
  const { state, dispatch } = useProductWizard();
  const { currentStep, productData } = state;
  
  // Generate all steps
  const steps = [
    WizardStep.BASIC_INFO,
    WizardStep.PRODUCT_IMAGES,
    WizardStep.ADDITIONAL_INFO,
    WizardStep.REVIEW_SAVE
  ];
  
  const handleStepClick = (step: WizardStep) => {
    if (canNavigateToStep(currentStep, step, productData)) {
      dispatch({
        type: WizardActionType.SET_STEP,
        payload: step
      });
    }
  };
  
  return (
    <nav className={`mb-8 ${className || ''}`}>
      <ol className="flex items-center w-full text-sm font-medium text-center text-gray-500 dark:text-gray-400 sm:text-base">
        {steps.map((step, index) => {
          const stepConfig = getStepConfig(step);
          const isActive = currentStep === step;
          const isCompleted = step < currentStep;
          const canNavigate = canNavigateToStep(currentStep, step, productData);
          
          // Determine classes based on step state
          const stepItemClasses = `flex md:w-full items-center ${
            isActive 
              ? 'text-primary font-medium' 
              : isCompleted 
                ? 'text-primary' 
                : 'text-gray-500'
          } ${index !== steps.length - 1 ? 'after:content-[""] after:w-full after:h-1 after:border-b after:border-gray-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10' : ''}`;
          
          const stepNumberClasses = `flex items-center justify-center w-8 h-8 mr-2 ${
            isActive 
              ? 'border-2 border-primary text-primary' 
              : isCompleted 
                ? 'bg-primary text-white' 
                : 'border border-gray-300 text-gray-500'
          } rounded-full shrink-0`;
          
          return (
            <li key={step} className={stepItemClasses}>
              <button 
                onClick={() => handleStepClick(step)}
                disabled={!canNavigate}
                className={`flex items-center ${canNavigate ? 'cursor-pointer hover:text-primary hover:underline' : 'cursor-not-allowed opacity-60'}`}
              >
                <span className={stepNumberClasses}>
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step + 1
                  )}
                </span>
                <span className="hidden md:inline-flex">{stepConfig.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      
      <div className="mt-3 flex justify-between text-sm text-gray-500">
        <div>{getStepConfig(currentStep).label}</div>
        <div className="italic">{getStepConfig(currentStep).description}</div>
      </div>
    </nav>
  );
};

export default WizardNavigation;