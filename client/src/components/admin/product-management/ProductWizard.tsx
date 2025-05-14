/**
 * Product Wizard Component
 * 
 * Main container component for the product creation/editing wizard.
 * Handles step navigation, validation, and persistence.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { debounce } from "lodash";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProductDraft } from "@shared/schema";

import { WizardNavigation, WIZARD_STEPS } from "./WizardNavigation";
import { BasicInfoStep } from "./steps/BasicInfoStep";
// Import other step components here as they are developed
// import { ImagesStep } from "./steps/ImagesStep";
// import { PricingStep } from "./steps/PricingStep";
// import { AttributesStep } from "./steps/AttributesStep";
// import { SeoStep } from "./steps/SeoStep";
// import { ReviewStep } from "./steps/ReviewStep";

interface ProductWizardProps {
  draft: ProductDraft;
  onPublish: () => void;
  onDiscard: () => void;
  isPublishing?: boolean;
  isDiscarding?: boolean;
}

export function ProductWizard({ 
  draft, 
  onPublish,
  onDiscard,
  isPublishing = false,
  isDiscarding = false,
}: ProductWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Set initial step
  const [currentStep, setCurrentStep] = useState("basic-info");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [isDraft, setIsDraft] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Current draft state tracking
  const [currentDraft, setCurrentDraft] = useState<ProductDraft>(draft);
  
  // API mutations
  const updateDraftMutation = useMutation({
    mutationFn: async (data: Partial<ProductDraft>) => {
      const response = await apiRequest('PATCH', `/api/product-drafts/${draft.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      setIsSaving(false);
      setLastSaved(new Date());
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: [`/api/product-drafts/${draft.id}`] });
    },
    onError: (error: any) => {
      setIsSaving(false);
      setErrorMessage(error.message || "Failed to save draft");
      toast({
        title: "Failed to save changes",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    }
  });

  const validateDraftMutation = useMutation({
    mutationFn: async (stepId?: string) => {
      const response = await apiRequest('POST', `/api/product-drafts/${draft.id}/validate`, {
        step: stepId
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.valid) {
        if (data.step && !completedSteps.includes(data.step)) {
          setCompletedSteps(prev => [...prev, data.step]);
        }
        
        // If we're validating all steps, update the entire completedSteps array
        if (!data.step) {
          setCompletedSteps(data.completedSteps || []);
        }
      }
      
      // Update validation errors
      setValidationErrors(data.errors || {});
    },
    onError: (error: any) => {
      toast({
        title: "Validation Error",
        description: error.message || "There was a problem validating the product",
        variant: "destructive",
      });
    }
  });

  // Fetch validation status on initial load
  useEffect(() => {
    if (draft.id) {
      validateDraftMutation.mutate();
    }
  }, [draft.id]);
  
  // Create a debounced version of the update function
  const debouncedUpdate = useCallback(
    debounce((data: Partial<ProductDraft>) => {
      setIsSaving(true);
      updateDraftMutation.mutate(data);
    }, 1000),
    [draft.id]
  );
  
  // Handle field changes
  const handleFieldChange = (field: string, value: any) => {
    // Update local state immediately for a responsive UI
    setCurrentDraft(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Debounce API call to prevent too many requests
    debouncedUpdate({ [field]: value });
  };
  
  // Handle step change
  const handleStepChange = (step: string) => {
    // Validate current step before moving to another
    validateDraftMutation.mutate(currentStep);
    
    setCurrentStep(step);
  };
  
  // Handle save complete step
  const handleSaveStep = (data: any) => {
    // Update multiple fields at once
    setCurrentDraft(prev => ({
      ...prev,
      ...data
    }));
    
    // Save to API
    setIsSaving(true);
    updateDraftMutation.mutate(data);
    
    // Validate the current step
    validateDraftMutation.mutate(currentStep);
  };
  
  // Render the current step component
  const renderStepComponent = () => {
    switch (currentStep) {
      case "basic-info":
        return (
          <BasicInfoStep
            draft={currentDraft}
            onChange={handleFieldChange}
            onSave={handleSaveStep}
            errors={validationErrors["basic-info"]}
          />
        );
      // Add other step components as they are developed
      // case "images":
      //   return (
      //     <ImagesStep
      //       draft={currentDraft}
      //       onChange={handleFieldChange}
      //       onSave={handleSaveStep}
      //       errors={validationErrors["images"]}
      //     />
      //   );
      // case "pricing":
      //   return (
      //     <PricingStep
      //       draft={currentDraft}
      //       onChange={handleFieldChange}
      //       onSave={handleSaveStep}
      //       errors={validationErrors["pricing"]}
      //     />
      //   );
      // ...and so on for other steps
      default:
        return (
          <div className="p-6 text-center">
            <p>This step is under development.</p>
            <Button 
              onClick={() => handleStepChange("basic-info")}
              variant="secondary"
              className="mt-4"
            >
              Go back to Basic Info
            </Button>
          </div>
        );
    }
  };
  
  // Calculate total number of errors across all steps
  const totalErrors = Object.values(validationErrors).reduce(
    (sum, errors) => sum + errors.length,
    0
  );
  
  return (
    <div className="space-y-6">
      {/* Error display */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      {/* Top controls */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-semibold">
            {draft.name ? `Editing: ${draft.name}` : "New Product Draft"}
          </h2>
          <div className="text-sm text-muted-foreground">
            {isSaving ? (
              <span className="flex items-center">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Saving changes...
              </span>
            ) : lastSaved ? (
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            ) : (
              <span>Draft created on {new Date(draft.createdAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={onDiscard}
            disabled={isDiscarding || isPublishing}
          >
            {isDiscarding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Discarding...
              </>
            ) : (
              "Discard Draft"
            )}
          </Button>
          
          <Button
            onClick={onPublish}
            disabled={totalErrors > 0 || isPublishing || isDiscarding}
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish Product"
            )}
          </Button>
        </div>
      </div>
      
      {/* Wizard navigation */}
      <WizardNavigation
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepChange={handleStepChange}
        validationErrors={validationErrors}
      />
      
      {/* Current step content */}
      <Card>
        <CardContent className="p-6">
          {renderStepComponent()}
        </CardContent>
      </Card>
      
      {/* Summary of validation issues */}
      {totalErrors > 0 && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold">
              {totalErrors} {totalErrors === 1 ? "issue" : "issues"} must be fixed before publishing:
            </div>
            <ul className="list-disc list-inside mt-2">
              {WIZARD_STEPS.map(step => {
                const stepErrors = validationErrors[step.id] || [];
                if (stepErrors.length === 0) return null;
                
                return (
                  <li key={step.id}>
                    <span className="font-medium">{step.label}:</span> {stepErrors.length} {stepErrors.length === 1 ? "issue" : "issues"}
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto ml-2"
                      onClick={() => handleStepChange(step.id)}
                    >
                      Go to step
                    </Button>
                  </li>
                );
              })}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}