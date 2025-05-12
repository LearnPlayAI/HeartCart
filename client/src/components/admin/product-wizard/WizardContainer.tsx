/**
 * Product Wizard Container Component
 * 
 * This component provides the layout container for the product wizard,
 * handling the display of navigation, step content, and action buttons.
 */

import React, { ReactNode } from 'react';
import { useProductWizard, getStepConfig, canNavigateToStep, isStepValid } from './context';
import { WizardStep, WizardActionType } from './types';
import WizardNavigation from './WizardNavigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WizardContainerProps {
  children: ReactNode;
  onSave: () => Promise<boolean>;
  catalogName?: string;
  className?: string;
}

export const WizardContainer: React.FC<WizardContainerProps> = ({
  children,
  onSave,
  catalogName,
  className
}) => {
  const { state, dispatch } = useProductWizard();
  const steps = getStepConfig();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Get current step index
  const currentStepIndex = steps.findIndex(step => step.id === state.currentStep);
  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  
  // Navigation handlers
  const handlePrevious = () => {
    if (!isFirstStep) {
      dispatch({
        type: WizardActionType.SET_STEP,
        payload: steps[currentStepIndex - 1].id
      });
    }
  };
  
  const handleNext = async () => {
    if (isLastStep) {
      return;
    }
    
    // Validate current step before proceeding
    if (isStepValid(state, state.currentStep)) {
      dispatch({
        type: WizardActionType.SET_STEP,
        payload: steps[currentStepIndex + 1].id
      });
    } else {
      toast({
        title: "Validation Error",
        description: `Please complete all required fields in the ${currentStep.label} step`,
        variant: "destructive"
      });
    }
  };
  
  const handleSave = async () => {
    try {
      dispatch({ type: WizardActionType.SET_SUBMITTING, payload: true });
      
      // Validate all steps
      const allStepsValid = steps.every(step => isStepValid(state, step.id));
      
      if (!allStepsValid) {
        toast({
          title: "Validation Error",
          description: "Please complete all required fields in all steps before saving",
          variant: "destructive"
        });
        return;
      }
      
      // Call the provided save handler
      const success = await onSave();
      
      if (success) {
        toast({
          title: "Success!",
          description: "Product saved successfully",
        });
        
        // Reset the form
        dispatch({ type: WizardActionType.RESET_WIZARD });
        
        // Navigate back to products list or catalog
        if (state.catalogId) {
          navigate(`/admin/catalogs/${state.catalogId}/products`);
        } else {
          navigate('/admin/products');
        }
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: "Failed to save product. Please try again.",
        variant: "destructive"
      });
    } finally {
      dispatch({ type: WizardActionType.SET_SUBMITTING, payload: false });
    }
  };
  
  const handleCancel = () => {
    // Navigate back to products list or catalog
    if (state.catalogId) {
      navigate(`/admin/catalogs/${state.catalogId}/products`);
    } else {
      navigate('/admin/products');
    }
  };
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Add New Product</CardTitle>
            {catalogName && (
              <CardDescription>
                Adding product to <span className="font-medium">{catalogName}</span> catalog
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={state.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={state.isSubmitting}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {state.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Product
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Step navigation */}
        <WizardNavigation />
        
        {/* Step content */}
        <div className="min-h-[400px] bg-white dark:bg-gray-950 rounded-md p-4">
          {children}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t p-4 bg-slate-50 dark:bg-slate-900">
        {!isFirstStep && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={handlePrevious}
            disabled={state.isSubmitting}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
        )}
        
        {isFirstStep && (
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={state.isSubmitting}
          >
            Cancel
          </Button>
        )}
        
        <div className="flex-1" />
        
        {!isLastStep ? (
          <Button 
            type="button" 
            onClick={handleNext}
            disabled={state.isSubmitting || !isStepValid(state, state.currentStep)}
            className="bg-pink-600 hover:bg-pink-700"
          >
            Continue
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSave}
            disabled={state.isSubmitting}
            className="bg-pink-600 hover:bg-pink-700"
          >
            {state.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Product
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default WizardContainer;