/**
 * Standardized Input Component
 * 
 * This is a standardized input component that follows the TeeMeYou design system.
 * It implements the requirements from the standardization plan in docs/standard/standplan.md.
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { 
  Check, 
  X, 
  AlertCircle, 
  Eye, 
  EyeOff 
} from 'lucide-react';

// Define input variants and sizes
const inputVariants = cva(
  // Base styles applied to all inputs
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Default input style
        default: "border-[#E5E7EB] focus-visible:ring-[#FF69B4]",
        
        // Outline - similar to default but with more visible border
        outline: "border-[#D1D5DB] focus-visible:ring-[#FF69B4]",
        
        // Filled input style
        filled: "border-transparent bg-[#F8F9FA] hover:bg-[#F1F1F1] focus-visible:bg-background focus-visible:ring-[#FF69B4]",
        
        // Flushed style (bottom border only)
        flushed: "rounded-none border-x-0 border-t-0 border-b-[#E5E7EB] px-0 focus-visible:border-b-[#FF69B4] focus-visible:ring-0",
        
        // Unstyled input
        unstyled: "border-0 bg-transparent px-0 shadow-none focus-visible:ring-0",
      },
      size: {
        sm: "h-8 px-3 py-1 text-xs",
        md: "h-10 px-4 py-2 text-sm",
        lg: "h-12 px-4 py-3 text-base",
      },
      validation: {
        // No validation (default)
        none: "",
        
        // Valid state
        valid: "border-[#4CAF50] focus-visible:ring-[#4CAF50]",
        
        // Invalid state
        invalid: "border-[#FF6B6B] focus-visible:ring-[#FF6B6B]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      validation: "none",
    },
  }
);

// Component props
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  errorMessage?: string;
  helperText?: string;
}

/**
 * Input Component
 * 
 * @param {InputProps} props - Input properties
 * @returns {JSX.Element} - Rendered input
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant,
    size,
    validation,
    type = 'text',
    leftElement,
    rightElement,
    errorMessage,
    helperText,
    disabled,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    
    // Toggle password visibility
    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };
    
    // Create validation icon based on validation state
    const renderValidationIcon = () => {
      if (!validation || validation === 'none') return null;
      
      if (validation === 'valid') {
        return <Check className="h-4 w-4 text-[#4CAF50]" />;
      }
      
      if (validation === 'invalid') {
        return <X className="h-4 w-4 text-[#FF6B6B]" />;
      }
      
      return null;
    };
    
    // Determine if we need to show a password toggle
    const passwordToggle = type === 'password' && (
      <button
        type="button"
        onClick={togglePasswordVisibility}
        className="focus:outline-none"
        tabIndex={-1}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4 text-[#777777]" />
        ) : (
          <Eye className="h-4 w-4 text-[#777777]" />
        )}
      </button>
    );
    
    // Determine the actual input type based on password visibility
    const actualType = type === 'password' && showPassword ? 'text' : type;
    
    // Determine right element - use password toggle if password field,
    // otherwise use validation icon or provided rightElement
    const actualRightElement = type === 'password' 
      ? passwordToggle 
      : (rightElement || renderValidationIcon());
    
    return (
      <div className="w-full">
        <div className="relative">
          {leftElement && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              {leftElement}
            </div>
          )}
          
          <input
            ref={ref}
            type={actualType}
            disabled={disabled}
            className={cn(
              inputVariants({ variant, size, validation }),
              leftElement && "pl-10",
              actualRightElement && "pr-10",
              className
            )}
            {...props}
          />
          
          {actualRightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {actualRightElement}
            </div>
          )}
        </div>
        
        {/* Error message */}
        {validation === 'invalid' && errorMessage && (
          <div className="flex items-center mt-1 text-xs text-[#FF6B6B]">
            <AlertCircle className="h-3 w-3 mr-1" />
            <span>{errorMessage}</span>
          </div>
        )}
        
        {/* Helper text - only show if no error message is visible */}
        {helperText && validation !== 'invalid' && (
          <div className="mt-1 text-xs text-[#777777]">
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

// Set display name for the component
Input.displayName = "Input";

export { Input, inputVariants };