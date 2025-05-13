/**
 * Standardized FormControlWrapper Component
 * 
 * This component provides a consistent wrapper for form controls with
 * standardized layout, labels, error messages, and helper text.
 * It follows the TeeMeYou design system and standardization plan.
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { AlertCircle, Info } from 'lucide-react';

// Define wrapper variants for different layout needs
const formControlWrapperVariants = cva(
  "w-full",
  {
    variants: {
      layout: {
        // Default stacked layout (label above input)
        stacked: "",
        
        // Horizontal layout (label beside input)
        horizontal: "flex flex-row items-start gap-4",
        
        // Compact layout (smaller spacing)
        compact: "space-y-1",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      layout: "stacked",
      fullWidth: true,
    },
  }
);

// Props for the FormControlWrapper
export interface FormControlWrapperProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formControlWrapperVariants> {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  labelClassName?: string;
}

/**
 * FormControlWrapper Component
 * 
 * @param {FormControlWrapperProps} props - Component properties
 * @returns {JSX.Element} - Rendered form control wrapper
 */
const FormControlWrapper = React.forwardRef<HTMLDivElement, FormControlWrapperProps>(
  ({
    className,
    layout,
    fullWidth,
    label,
    htmlFor,
    required = false,
    error,
    helperText,
    labelClassName,
    children,
    ...props
  }, ref) => {
    // Generate a unique ID for the input if none is provided
    const id = React.useId();
    const inputId = htmlFor || id;
    
    // Determine if we're in an error state
    const hasError = Boolean(error);
    
    // Determine label styles based on layout and error state
    const getLabelStyles = () => {
      return cn(
        "block text-sm font-medium",
        hasError ? "text-[#FF6B6B]" : "text-[#333333]",
        layout === "horizontal" ? "w-1/3 pt-2.5" : "mb-1.5",
        labelClassName
      );
    };
    
    // Determine input area styles based on layout
    const getInputAreaStyles = () => {
      return cn(
        layout === "horizontal" ? "flex-1" : "w-full"
      );
    };
    
    return (
      <div
        ref={ref}
        className={cn(formControlWrapperVariants({ layout, fullWidth }), className)}
        {...props}
      >
        {/* Label */}
        {label && (
          <label htmlFor={inputId} className={getLabelStyles()}>
            {label}
            {required && <span className="text-[#FF6B6B] ml-1">*</span>}
          </label>
        )}
        
        {/* Input area */}
        <div className={getInputAreaStyles()}>
          {/* Main children (usually form elements) */}
          {children}
          
          {/* Error message */}
          {hasError && (
            <div className="flex items-center mt-1.5 text-xs text-[#FF6B6B]">
              <AlertCircle className="h-3 w-3 mr-1 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {/* Helper text - only show if no error is visible */}
          {helperText && !hasError && (
            <div className="flex items-start mt-1.5 text-xs text-[#777777]">
              <Info className="h-3 w-3 mr-1 mt-0.5 shrink-0" />
              <span>{helperText}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

// Set display name for the component
FormControlWrapper.displayName = "FormControlWrapper";

export { FormControlWrapper, formControlWrapperVariants };