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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Elegant Header */}
        {catalogName && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg p-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-slate-600">Adding product to catalog:</span>
              <span className="font-semibold text-slate-800 bg-blue-100 px-3 py-1 rounded-full text-sm">
                {catalogName}
              </span>
            </div>
          </motion.div>
        )}
        
        {/* Enhanced Step Navigation */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <WizardNavigation />
        </motion.div>
        
        {/* Main Content with Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-1"></div>
            <CardContent className="p-8 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`step-${currentStep}-${animationKey}`}
                  initial={{ 
                    x: direction === 'forward' ? 50 : -50,
                    opacity: 0,
                    scale: 0.95 
                  }}
                  animate={{ 
                    x: 0, 
                    opacity: 1,
                    scale: 1 
                  }}
                  exit={{ 
                    x: direction === 'forward' ? -50 : 50,
                    opacity: 0,
                    scale: 0.95 
                  }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 25,
                    duration: 0.3
                  }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Enhanced Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-between items-center pt-6"
        >
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={!canGoPrevious || isLoading}
            className="group bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white hover:border-slate-300 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3"
          >
            <ChevronLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
            Previous
          </Button>
          
          <div className="space-x-3">
            {currentStep < WizardStep.REVIEW_SAVE ? (
              <Button
                onClick={handleNext}
                disabled={!canGoNext || isLoading}
                className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-8 py-3"
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={!canSave || isLoading}
                className="group bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-8 py-3"
              >
                <Save className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                Save Product
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default WizardContainer;