/**
 * Wizard Navigation
 * 
 * This component provides the navigation buttons for a multi-step wizard
 * including back, next, and side navigation.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDraftContext } from './DraftContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  CircleAlert,
  Save,
  Loader2
} from 'lucide-react';

// Wizard step item type
interface WizardStepItem {
  id: string;
  label: string;
  isCompleted?: boolean;
  isRequired?: boolean;
  hasErrors?: boolean;
}

// Component props
interface WizardNavigationProps {
  steps: WizardStepItem[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onPublish?: () => void;
  isSaving?: boolean;
  showPublish?: boolean;
}

export function WizardNavigation({
  steps,
  currentStep,
  onStepChange,
  onPublish,
  isSaving = false,
  showPublish = false,
}: WizardNavigationProps) {
  const { saveDraft, publishDraft, loading } = useDraftContext();
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Handle step change
  const handleStepChange = (step: number) => {
    if (step >= 0 && step < steps.length) {
      onStepChange(step);
    }
  };
  
  // Handle publish action
  const handlePublish = async () => {
    if (onPublish) {
      setIsPublishing(true);
      try {
        await onPublish();
      } finally {
        setIsPublishing(false);
      }
    } else {
      setIsPublishing(true);
      try {
        await publishDraft();
      } finally {
        setIsPublishing(false);
      }
    }
  };
  
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Side navigation */}
      <Card className="p-4 w-full md:w-60 flex-shrink-0">
        <nav aria-label="Wizard steps">
          <ol className="space-y-1">
            {steps.map((step, index) => (
              <li key={step.id}>
                <Button
                  variant={currentStep === index ? 'default' : 'ghost'}
                  className="w-full justify-start gap-2"
                  onClick={() => handleStepChange(index)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 flex items-center justify-center">
                      {step.hasErrors ? (
                        <CircleAlert className="h-4 w-4 text-destructive" />
                      ) : step.isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-sm">{index + 1}</span>
                      )}
                    </div>
                    <span className="text-sm">{step.label}</span>
                    {step.isRequired && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </div>
                </Button>
              </li>
            ))}
          </ol>
          
          {showPublish && (
            <div className="mt-6">
              <Button
                className="w-full"
                onClick={handlePublish}
                disabled={loading || isPublishing}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>Publish Product</>
                )}
              </Button>
            </div>
          )}
        </nav>
      </Card>
      
      {/* Bottom navigation */}
      <div className="flex-grow">
        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={() => handleStepChange(currentStep - 1)}
            disabled={currentStep === 0 || loading || isSaving}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => saveDraft()}
              disabled={loading || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={() => handleStepChange(currentStep + 1)}
                disabled={loading || isSaving}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : showPublish ? (
              <Button
                onClick={handlePublish}
                disabled={loading || isPublishing}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>Publish Product</>
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}