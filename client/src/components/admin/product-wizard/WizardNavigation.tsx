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
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-8">
      {/* Header with step information */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Product Creation Wizard
        </h2>
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
          <span className="bg-blue-100 px-3 py-1 rounded-full font-medium text-blue-800">
            Step {steps.findIndex(step => step.id === state.currentStep) + 1} of {steps.length}
          </span>
          <span>•</span>
          <span>{steps.find(step => step.id === state.currentStep)?.label}</span>
        </div>
      </div>

      {/* Enhanced Step Indicator */}
      <div className="relative">
        {/* Background line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-slate-200 rounded-full"></div>
        
        {/* Progress line */}
        <div 
          className="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
          style={{ 
            width: `${((steps.findIndex(step => step.id === state.currentStep)) / (steps.length - 1)) * 100}%` 
          }}
        />

        <div className="relative overflow-x-auto">
          <div className="flex justify-between items-start min-w-[800px] lg:min-w-0 px-4">
            <TooltipProvider>
              {steps.map((step, index) => {
                const status = getStepStatus(step.id);
                const isClickable = true;
                const isCurrent = status === 'current';
                const isComplete = status === 'complete';
                const isError = status === 'error';
                
                return (
                  <div key={step.id} className="flex flex-col items-center relative">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          disabled={!isClickable}
                          onClick={() => isClickable && handleStepClick(step.id)}
                          className={`
                            relative z-10 flex flex-col items-center group transition-all duration-300 p-2 rounded-2xl
                            ${!isClickable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}
                            ${isCurrent ? 'bg-blue-50' : 'hover:bg-slate-50'}
                          `}
                        >
                          {/* Step Circle */}
                          <div 
                            className={`
                              w-12 h-12 rounded-full flex items-center justify-center border-3 transition-all duration-300 mb-3 relative
                              ${isCurrent 
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-lg scale-110' 
                                : isComplete 
                                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-transparent shadow-md' 
                                : isError
                                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white border-transparent shadow-md'
                                : 'bg-white text-slate-600 border-slate-300 shadow-sm group-hover:border-slate-400 group-hover:shadow-md'
                              }
                            `}
                          >
                            {isCurrent && (
                              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full opacity-20 animate-pulse"></div>
                            )}
                            
                            {getStatusIcon(status) || (
                              <span className="font-bold text-base relative z-10">
                                {index + 1}
                              </span>
                            )}
                          </div>
                          
                          {/* Step Label */}
                          <div className="text-center max-w-20">
                            <span 
                              className={`
                                text-sm font-semibold leading-tight transition-colors duration-300 block
                                ${isCurrent 
                                  ? 'text-blue-700'
                                  : isComplete
                                  ? 'text-emerald-700'
                                  : isError
                                  ? 'text-red-700'
                                  : 'text-slate-600 group-hover:text-slate-800'
                                }
                              `}
                            >
                              {step.label}
                            </span>
                            
                            {/* Status badge */}
                            <div className="mt-1">
                              {isCurrent && (
                                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                              )}
                              {isComplete && (
                                <span className="text-xs text-emerald-600 font-medium">Complete</span>
                              )}
                              {isError && (
                                <span className="text-xs text-red-600 font-medium">Error</span>
                              )}
                            </div>
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        className="bg-slate-900 text-white border-slate-700 shadow-xl max-w-xs"
                        side="bottom"
                        sideOffset={10}
                      >
                        <div className="space-y-2">
                          <p className="font-semibold text-white">{step.label}</p>
                          <p className="text-slate-300 text-sm">
                            {isError 
                              ? 'This step has validation errors. Click to review and fix them.'
                              : isComplete 
                              ? 'This step has been completed successfully.'
                              : isCurrent 
                              ? 'You are currently working on this step.'
                              : 'Click to jump to this step.'
                            }
                          </p>
                          {!isCurrent && (
                            <p className="text-xs text-slate-400">
                              Click to navigate
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-800">Progress Overview</h3>
            <p className="text-sm text-slate-600">
              {steps.filter(step => getStepStatus(step.id) === 'complete').length} of {steps.length} steps completed
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(((steps.findIndex(step => step.id === state.currentStep) + 1) / steps.length) * 100)}%
              </div>
              <div className="text-xs text-slate-600">Complete</div>
            </div>
            
            {/* Circular progress */}
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-slate-200"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - ((steps.findIndex(step => step.id === state.currentStep) + 1) / steps.length))}`}
                  className="text-blue-500 transition-all duration-700 ease-out"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}