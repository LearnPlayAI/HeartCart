/**
 * Product Wizard Navigation Component
 * 
 * Provides the step-based navigation for the product wizard,
 * showing progress and allowing users to switch between completed steps.
 */

import React from "react";
import { AlertTriangle, CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

// Define the wizard steps
export const WIZARD_STEPS = [
  {
    id: "basic-info",
    label: "Basic Info",
    description: "Name, Category, Description",
  },
  {
    id: "images",
    label: "Images",
    description: "Upload & Manage Product Images",
  },
  {
    id: "pricing",
    label: "Pricing",
    description: "Regular & Sale Pricing",
  },
  {
    id: "attributes",
    label: "Attributes",
    description: "Size, Color, etc.",
  },
  {
    id: "seo",
    label: "SEO",
    description: "Meta Title, Description, etc.",
  },
  {
    id: "review",
    label: "Review",
    description: "Review & Publish",
  },
];

interface WizardNavigationProps {
  currentStep: string;
  completedSteps: string[];
  onStepChange: (step: string) => void;
  validationErrors?: Record<string, string[]>;
}

export function WizardNavigation({ 
  currentStep, 
  completedSteps, 
  onStepChange,
  validationErrors = {},
}: WizardNavigationProps) {
  
  // Function to check if a step is accessible
  const isStepAccessible = (stepId: string) => {
    // The current step is always accessible
    if (stepId === currentStep) return true;
    
    // Completed steps are accessible
    if (completedSteps.includes(stepId)) return true;
    
    // Find the index of the step in the WIZARD_STEPS array
    const stepIndex = WIZARD_STEPS.findIndex(step => step.id === stepId);
    const currentIndex = WIZARD_STEPS.findIndex(step => step.id === currentStep);
    
    // The previous step is always accessible from the current step
    if (stepIndex === currentIndex - 1) return true;
    
    // The next step is accessible if the current step is completed
    if (stepIndex === currentIndex + 1 && completedSteps.includes(currentStep)) return true;
    
    return false;
  };
  
  // Function to get the status of a step
  const getStepStatus = (stepId: string) => {
    // If the step has validation errors
    if (validationErrors[stepId] && validationErrors[stepId].length > 0) {
      return "error";
    }
    
    // If the step is completed
    if (completedSteps.includes(stepId)) {
      return "completed";
    }
    
    // If the step is the current step
    if (stepId === currentStep) {
      return "current";
    }
    
    // If the step is accessible but not current or completed
    if (isStepAccessible(stepId)) {
      return "accessible";
    }
    
    // Otherwise, the step is locked
    return "locked";
  };
  
  // Handler for step navigation clicks
  const handleStepClick = (stepId: string) => {
    if (isStepAccessible(stepId)) {
      onStepChange(stepId);
    }
  };
  
  return (
    <div className="mb-8 relative">
      {/* Top progress bar (visible on mobile) */}
      <div className="md:hidden mb-4">
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${
                (completedSteps.length / (WIZARD_STEPS.length - 1)) * 100
              }%`,
            }}
          />
        </div>
      </div>
      
      {/* Step navigation */}
      <ol className="flex flex-col md:flex-row md:space-x-3 space-y-3 md:space-y-0">
        {WIZARD_STEPS.map((step, i) => {
          const status = getStepStatus(step.id);
          
          return (
            <li 
              key={step.id} 
              className="relative"
              style={{ flex: `1 0 ${100 / WIZARD_STEPS.length}%` }}
            >
              {/* Connector line (for desktop) */}
              {i > 0 && (
                <div 
                  className="hidden md:block absolute h-0.5 bg-muted -left-3 top-5 transform -translate-y-1/2" 
                  style={{ width: "calc(100% + 12px)" }}
                />
              )}
              
              {/* Step button */}
              <button
                type="button"
                onClick={() => handleStepClick(step.id)}
                disabled={status === "locked"}
                className={cn(
                  "w-full flex items-center p-3 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md",
                  status === "locked" && "opacity-50 cursor-not-allowed",
                  status === "current" && "bg-muted",
                  status === "error" && "bg-destructive/10",
                  (status === "completed" || status === "accessible") &&
                    "hover:bg-muted/50 transition-colors"
                )}
              >
                {/* Step indicator/icon */}
                <div className="z-10 mr-3 flex-shrink-0">
                  {status === "error" ? (
                    <div className="rounded-full bg-destructive text-destructive-foreground p-1 w-8 h-8 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                  ) : status === "completed" ? (
                    <div className="rounded-full bg-primary text-primary-foreground p-1 w-8 h-8 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  ) : status === "current" ? (
                    <div className="rounded-full border-2 border-primary bg-background p-1 w-8 h-8 flex items-center justify-center">
                      <Circle className="h-5 w-5 fill-primary text-primary" />
                    </div>
                  ) : (
                    <div className="rounded-full border border-muted-foreground p-1 w-8 h-8 flex items-center justify-center">
                      <span className="text-muted-foreground">{i + 1}</span>
                    </div>
                  )}
                </div>
                
                {/* Step label and description */}
                <div className="text-left">
                  <div className="font-medium">{step.label}</div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
              </button>
              
              {/* Error indicator */}
              {validationErrors[step.id] && validationErrors[step.id].length > 0 && (
                <div className="mt-1 rounded-sm bg-destructive/10 text-destructive p-2 text-xs">
                  <ul className="list-disc list-inside">
                    {validationErrors[step.id].slice(0, 2).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {validationErrors[step.id].length > 2 && (
                      <li>{validationErrors[step.id].length - 2} more issues...</li>
                    )}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}