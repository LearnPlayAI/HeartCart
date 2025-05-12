/**
 * Wizard Container Component
 * 
 * This component provides the container for the product wizard steps
 * with navigation and action buttons.
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useProductWizard, getStepConfig, canNavigateToStep, isStepValid } from './context';
import { WizardStep, WizardActionType } from './types';
import WizardNavigation from './WizardNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';

interface WizardContainerProps {
  children: ReactNode;
  onSave: () => Promise<boolean>;
  catalogName?: string;
}

const WizardContainer: React.FC<WizardContainerProps> = ({ 
  children, 
  onSave,
  catalogName
}) => {
  const { state, dispatch } = useProductWizard();
  const { currentStep, productData, isFormDirty, isLoading } = state;
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [animationKey, setAnimationKey] = useState<number>(0);
  
  // We're now using the built-in Save button in the bottom navigation
  // No need for custom event handling
  
  // Handle moving to the next step
  const handleNext = () => {
    const nextStep = currentStep + 1;
    if (nextStep <= WizardStep.REVIEW_SAVE && isStepValid(currentStep, productData)) {
      setDirection('forward');
      setAnimationKey(prevKey => prevKey + 1);
      dispatch({
        type: WizardActionType.SET_STEP,
        payload: nextStep
      });
    }
  };
  
  // Handle moving to the previous step
  const handlePrevious = () => {
    const prevStep = currentStep - 1;
    if (prevStep >= WizardStep.BASIC_INFO) {
      setDirection('backward');
      setAnimationKey(prevKey => prevKey + 1);
      dispatch({
        type: WizardActionType.SET_STEP,
        payload: prevStep
      });
    }
  };
  
  // Handle saving the product
  const handleSave = async () => {
    // Validate all steps before saving
    for (let step = WizardStep.BASIC_INFO; step <= WizardStep.ADDITIONAL_INFO; step++) {
      if (!isStepValid(step, productData)) {
        dispatch({
          type: WizardActionType.SET_STEP,
          payload: step
        });
        return;
      }
    }
    
    const success = await onSave();
    
    if (success) {
      // Reset wizard state on successful save
      dispatch({
        type: WizardActionType.RESET_WIZARD
      });
    }
  };
  
  // Check if we can navigate to the next step
  const canGoNext = currentStep < WizardStep.REVIEW_SAVE && 
                    isStepValid(currentStep, productData);
  
  // Check if we can navigate to the previous step
  const canGoPrevious = currentStep > WizardStep.BASIC_INFO;
  
  // Check if we can save (last step or at any step with all required data)
  const canSave = (currentStep === WizardStep.REVIEW_SAVE) || 
                  (isFormDirty && Array.from(
                    { length: WizardStep.ADDITIONAL_INFO + 1 }, 
                    (_, i) => isStepValid(i, productData)
                  ).every(Boolean));
  
  return (
    <div className="space-y-6">
      {/* Header info */}
      {catalogName && (
        <div className="text-sm text-muted-foreground">
          <span>Adding product to catalog: </span>
          <span className="font-medium">{catalogName}</span>
        </div>
      )}
      
      {/* Step navigation */}
      <WizardNavigation />
      
      {/* Main content area */}
      <Card>
        <CardContent className="pt-6 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`step-${currentStep}-${animationKey}`}
              initial={{ 
                x: direction === 'forward' ? 300 : -300,
                opacity: 0 
              }}
              animate={{ 
                x: 0, 
                opacity: 1 
              }}
              exit={{ 
                x: direction === 'forward' ? -300 : 300,
                opacity: 0 
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30 
              }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
      
      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={!canGoPrevious || isLoading}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        
        <div className="space-x-2">
          {currentStep < WizardStep.REVIEW_SAVE ? (
            <Button
              onClick={handleNext}
              disabled={!canGoNext || isLoading}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={!canSave || isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Product
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WizardContainer;