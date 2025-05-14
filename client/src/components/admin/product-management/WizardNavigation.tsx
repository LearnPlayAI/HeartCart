import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/shared/icons';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { useDraft } from './DraftContext';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface Step {
  id: string;
  title: string;
  description: string;
  icon?: React.ElementType;
}

interface WizardNavigationProps {
  steps: Step[];
  currentStep: string;
  onStepChange: (stepId: string) => void;
  validateStep?: () => Promise<boolean>;
  onSaveDraft?: () => Promise<void>;
  onPublish?: () => Promise<void>;
}

export function WizardNavigation({
  steps,
  currentStep,
  onStepChange,
  validateStep,
  onSaveDraft,
  onPublish
}: WizardNavigationProps) {
  const { toast } = useToast();
  const { currentDraft, isLoading } = useDraft();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Find current step index
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const currentStepObject = steps[currentStepIndex];
  
  // Check if we can move to the next or previous step
  const canGoNext = currentStepIndex < steps.length - 1;
  const canGoPrevious = currentStepIndex > 0;

  // Handle step navigation
  const handleStepNavigation = async (direction: 'next' | 'previous' | number) => {
    // Validate current step if going to next step
    if (direction === 'next' && validateStep) {
      try {
        const isValid = await validateStep();
        if (!isValid) {
          toast({
            title: 'Validation Failed',
            description: 'Please fix the validation errors before proceeding.',
            variant: 'destructive',
          });
          return;
        }
      } catch (error) {
        console.error('Step validation error:', error);
        toast({
          title: 'Validation Error',
          description: 'An error occurred while validating the current step.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Navigate between steps
    let nextStepIndex: number;

    if (direction === 'next') {
      nextStepIndex = Math.min(currentStepIndex + 1, steps.length - 1);
    } else if (direction === 'previous') {
      nextStepIndex = Math.max(currentStepIndex - 1, 0);
    } else {
      // Direct step index
      nextStepIndex = direction;
    }

    onStepChange(steps[nextStepIndex].id);
  };

  // Handle save draft button click
  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;

    try {
      setIsSaving(true);
      await onSaveDraft();
      
      toast({
        title: 'Draft Saved',
        description: 'Your product draft has been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save your product draft. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle publish button click
  const handlePublish = async () => {
    if (!onPublish) return;

    try {
      setIsPublishing(true);
      await onPublish();
      
      // The navigation to product page is handled in the DraftContext
    } catch (error) {
      console.error('Error publishing product:', error);
      toast({
        title: 'Publishing Failed',
        description: 'Failed to publish your product. Please try again.',
        variant: 'destructive',
      });
      setIsPublishing(false);
    }
  };

  return (
    <div className="mt-6 border-t pt-6">
      {!isMobile && (
        <div className="flex mb-6">
          <div className="w-full flex items-center">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div 
                  className={cn(
                    "relative flex items-center justify-center flex-1",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleStepNavigation(index)}
                    disabled={isLoading}
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full border border-input",
                      (currentStepIndex >= index) ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground",
                      "transition-colors hover:bg-muted"
                    )}
                  >
                    {step.icon ? (
                      <step.icon className="w-4 h-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </button>
                  <span 
                    className={cn(
                      "absolute top-10 text-center text-xs font-medium",
                      (currentStepIndex >= index) ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                  
                  {index < steps.length - 1 && (
                    <div 
                      className={cn(
                        "absolute left-1/2 w-full h-[2px]",
                        (currentStepIndex > index) ? "bg-primary" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {isMobile && (
            <div className="text-sm font-medium">
              Step {currentStepIndex + 1} of {steps.length}: {currentStepObject?.title}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStepNavigation('previous')}
            disabled={!canGoPrevious || isLoading}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          {!canGoNext ? (
            <>
              <Button
                size="sm"
                onClick={handleSaveDraft}
                disabled={isSaving || isLoading || !currentDraft}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Icons.save className="w-4 h-4 mr-1" />
                    Save Draft
                  </>
                )}
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={handlePublish}
                      disabled={isPublishing || isLoading || !currentDraft}
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Publish
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Publish this product to make it live on your store</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => handleStepNavigation('next')}
              disabled={!canGoNext || isLoading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default WizardNavigation;