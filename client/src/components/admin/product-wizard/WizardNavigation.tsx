/**
 * Wizard Navigation Component
 * 
 * This component provides the navigation steps bar for the product wizard,
 * showing progress and allowing step navigation.
 */

import { useProductWizardContext, WizardStep } from './context';
import { cn } from '@/lib/utils';
import { 
  Check, 
  ClipboardList, 
  Image, 
  FileText, 
  Save,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Define step icons and labels
const stepInfo: Record<WizardStep, { 
  label: string; 
  icon: React.ReactNode;
  description: string;
}> = {
  'basic-info': {
    label: 'Basic Info',
    icon: <ClipboardList className="h-5 w-5" />,
    description: 'Product name, description, pricing'
  },
  'images': {
    label: 'Images',
    icon: <Image className="h-5 w-5" />,
    description: 'Product photos and gallery'
  },
  'additional-info': {
    label: 'Additional Info',
    icon: <FileText className="h-5 w-5" />,
    description: 'Specifications, shipping, visibility'
  },
  'review': {
    label: 'Review & Save',
    icon: <Save className="h-5 w-5" />,
    description: 'Final review and publish'
  }
};

interface WizardNavigationProps {
  steps: readonly WizardStep[];
}

export const WizardNavigation: React.FC<WizardNavigationProps> = ({ steps }) => {
  const { 
    currentStep, 
    goToStep, 
    state, 
    isValid, 
    isSubmitting 
  } = useProductWizardContext();
  
  // Check if a step is completed
  const isStepCompleted = (step: WizardStep): boolean => {
    return state.completedSteps.includes(step);
  };
  
  // Check if a step can be navigated to
  const canNavigateToStep = (step: WizardStep): boolean => {
    const stepIndex = steps.indexOf(step);
    const currentIndex = steps.indexOf(currentStep);
    
    // Always allow navigation to previous steps
    if (stepIndex < currentIndex) {
      return true;
    }
    
    // Allow navigation to the next step if current step is valid
    if (stepIndex === currentIndex + 1) {
      return isValid(currentStep);
    }
    
    // For other steps, check if all previous steps are completed
    return steps.slice(0, stepIndex).every(prevStep => isStepCompleted(prevStep));
  };
  
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex-1 w-full">
        <nav aria-label="Progress" className="w-full">
          <ol className="grid grid-cols-1 sm:grid-cols-4 gap-y-6 sm:gap-x-4">
            {steps.map((step, index) => {
              const isActive = step === currentStep;
              const isCompleted = isStepCompleted(step);
              const canNavigate = canNavigateToStep(step) && !isSubmitting;
              
              return (
                <li key={step} className="relative flex items-start">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full flex flex-col items-center sm:items-start text-center sm:text-left p-3 rounded-lg gap-1.5 transition-colors",
                      isActive && "bg-primary/10 text-primary",
                      isCompleted && !isActive && "text-primary",
                      !canNavigate && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => canNavigate && goToStep(step)}
                    disabled={!canNavigate}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border",
                        isActive ? "bg-primary text-primary-foreground border-primary" :
                        isCompleted ? "bg-primary/20 text-primary border-primary/20" :
                        "bg-muted border-muted-foreground/30"
                      )}>
                        {isCompleted ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>
                      <span className="font-medium">
                        {stepInfo[step].label}
                      </span>
                    </div>
                    <span className="pl-10 text-xs text-muted-foreground hidden sm:block">
                      {stepInfo[step].description}
                    </span>
                  </Button>
                  
                  {/* Step validity indicator */}
                  {isCompleted && !isValid(step) && (
                    <div className="absolute left-3 top-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                  )}
                  
                  {/* Connecting line between steps (hidden on mobile) */}
                  {index < steps.length - 1 && (
                    <div className="hidden sm:block absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-muted" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
};