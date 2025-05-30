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
  LoaderIcon,
  TagIcon
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
    { id: 'attributes', label: 'Attributes' },
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
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg p-6 space-y-6">
      {/* Enhanced Step Indicator */}
      <div className="overflow-x-auto -mx-2 px-2 pb-2">
        <div className="flex justify-between items-center min-w-[600px] sm:min-w-0">
          <TooltipProvider>
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              const isClickable = true;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  {index > 0 && (
                    <div className="flex-1 h-0.5 mx-2 sm:mx-3 relative">
                      <div className="absolute inset-0 bg-slate-200 rounded-full"></div>
                      <div 
                        className={`absolute inset-0 rounded-full transition-all duration-500 ${
                          status === 'upcoming' ? 'w-0 bg-slate-200' : 'w-full bg-gradient-to-r from-blue-500 to-purple-500'
                        }`}
                      />
                    </div>
                  )}
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        disabled={!isClickable}
                        onClick={() => isClickable && handleStepClick(step.id)}
                        className={`relative flex flex-col items-center group transition-all duration-300 ${
                          !isClickable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'
                        }`}
                      >
                        <div 
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-lg ${
                            status === 'current' 
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-blue-400 shadow-blue-200' 
                              : status === 'complete' 
                              ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-emerald-400 shadow-emerald-200' 
                              : status === 'error'
                              ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white border-red-400 shadow-red-200'
                              : 'bg-white text-slate-500 border-slate-300 shadow-slate-100 group-hover:bg-slate-50 group-hover:border-slate-400'
                          }`}
                        >
                          {getStatusIcon(status) || (
                            <span className="font-semibold text-sm sm:text-base">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        
                        {/* Enhanced labels with better spacing */}
                        <span 
                          className={`mt-2 sm:mt-3 text-xs sm:text-sm font-medium text-center leading-tight transition-colors duration-300 ${
                            status === 'current' 
                              ? 'text-blue-700'
                              : status === 'complete'
                              ? 'text-emerald-700'
                              : status === 'error'
                              ? 'text-red-700'
                              : 'text-slate-600 group-hover:text-slate-800'
                          }`}
                        >
                          {step.label}
                        </span>
                        
                        {/* Status indicator dot */}
                        {status === 'current' && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse border-2 border-white"></div>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white/90 backdrop-blur-sm border border-white/20 shadow-lg">
                      <div className="text-sm">
                        <p className="font-semibold text-slate-800">{step.label}</p>
                        <p className="text-slate-600">
                          {status === 'error' 
                            ? 'Step has validation errors - click to review'
                            : status === 'complete' 
                            ? 'Step completed successfully'
                            : status === 'current' 
                            ? 'Currently working on this step'
                            : 'Click to navigate to this step'
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
      
      {/* Progress Bar */}
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-in-out"
          style={{ 
            width: `${((steps.findIndex(step => step.id === state.currentStep) + 1) / steps.length) * 100}%` 
          }}
        />
      </div>
      
      {/* Step counter */}
      <div className="text-center">
        <span className="text-sm text-slate-600 font-medium">
          Step {steps.findIndex(step => step.id === state.currentStep) + 1} of {steps.length}
        </span>
      </div>
    </div>
  );
}