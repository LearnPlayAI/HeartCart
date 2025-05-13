/**
 * Standardized Select Component
 * 
 * This is a standardized select component that follows the TeeMeYou design system.
 * It implements the requirements from the standardization plan in docs/standard/standplan.md.
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { AlertCircle, Check, ChevronDown } from 'lucide-react';

// Base select styles
const selectContainerVariants = cva(
  "relative block w-full",
  {
    variants: {
      size: {
        sm: "",
        md: "",
        lg: "",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

// Select trigger variants
const selectTriggerVariants = cva(
  "flex items-center justify-between w-full rounded-md border bg-background text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Default select style
        default: "border-[#E5E7EB] hover:border-[#D1D5DB] focus:border-[#FF69B4] focus:ring-2 focus:ring-[#FF69B4]",
        
        // Outline - similar to default but with more visible border
        outline: "border-[#D1D5DB] hover:border-[#B8BDC7] focus:border-[#FF69B4] focus:ring-2 focus:ring-[#FF69B4]",
        
        // Filled select style
        filled: "border-transparent bg-[#F8F9FA] hover:bg-[#F1F1F1] focus:bg-background focus:ring-2 focus:ring-[#FF69B4]",
        
        // Flushed style (bottom border only)
        flushed: "rounded-none border-x-0 border-t-0 border-b-[#E5E7EB] px-0 hover:border-b-[#D1D5DB] focus:border-b-[#FF69B4] focus:ring-0",
        
        // Unstyled select
        unstyled: "border-0 bg-transparent px-0 shadow-none focus:ring-0",
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
        valid: "border-[#4CAF50] focus:ring-[#4CAF50]",
        
        // Invalid state
        invalid: "border-[#FF6B6B] focus:ring-[#FF6B6B]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      validation: "none",
    },
  }
);

// Content variants
const selectContentVariants = cva(
  "relative z-50 max-h-60 min-w-[8rem] overflow-hidden rounded-md border bg-white text-sm shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  {
    variants: {
      variant: {
        default: "border-[#E5E7EB]",
        outline: "border-[#D1D5DB]",
        filled: "border-[#E5E7EB]",
        flushed: "border-[#E5E7EB]",
        unstyled: "border-transparent shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Option variants
const selectOptionVariants = cva(
  "relative flex w-full cursor-default select-none items-center py-1.5 px-3 outline-none",
  {
    variants: {
      focused: {
        true: "bg-[#FFE6F0] text-[#333333] data-[disabled]:opacity-50 data-[disabled]:pointer-events-none",
        false: "",
      },
      disabled: {
        true: "opacity-50 pointer-events-none",
        false: "",
      },
      selected: {
        true: "bg-[#FFE6F0] font-medium text-[#FF69B4]",
        false: "",
      },
    },
    defaultVariants: {
      focused: false,
      disabled: false,
      selected: false,
    },
  }
);

// Props for the main Select component
export interface SelectProps 
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof selectTriggerVariants> {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  label?: string;
  errorMessage?: string;
  helperText?: string;
  placeholder?: string;
}

/**
 * Select Component
 * 
 * A standardized select component that follows the TeeMeYou design system.
 * 
 * @param {SelectProps} props - Select properties
 * @returns {JSX.Element} - Rendered select
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({
    className,
    variant,
    size,
    validation,
    options,
    label,
    errorMessage,
    helperText,
    placeholder = "Select an option",
    disabled,
    value,
    onChange,
    ...props
  }, ref) => {
    // Generate a unique ID for the select
    const id = React.useId();
    
    return (
      <div className={cn(selectContainerVariants({ size }), className)}>
        {/* Optional label */}
        {label && (
          <label
            htmlFor={id}
            className={cn(
              "block text-sm font-medium mb-1.5",
              validation === 'invalid' && "text-[#FF6B6B]",
              disabled && "opacity-50"
            )}
          >
            {label}
          </label>
        )}
        
        {/* Select element with styled wrapper */}
        <div className="relative">
          <div className={cn(selectTriggerVariants({ variant, size, validation }))}>
            <select
              id={id}
              ref={ref}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              disabled={disabled}
              value={value}
              onChange={onChange}
              {...props}
            >
              {placeholder && (
                <option value="" disabled>
                  {placeholder}
                </option>
              )}
              {options.map((option) => (
                <option 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </select>
            
            {/* Visual representation of the select */}
            <span className="block truncate">
              {value 
                ? options.find(option => option.value === value)?.label || placeholder
                : placeholder
              }
            </span>
            
            {/* Dropdown indicator */}
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown className="h-4 w-4 text-[#777777]" />
            </span>
          </div>
        </div>
        
        {/* Validation - error message */}
        {validation === 'invalid' && errorMessage && (
          <div className="flex items-center mt-1.5 text-xs text-[#FF6B6B]">
            <AlertCircle className="h-3 w-3 mr-1" />
            <span>{errorMessage}</span>
          </div>
        )}
        
        {/* Helper text - only show if no error message is visible */}
        {helperText && validation !== 'invalid' && (
          <div className="mt-1.5 text-xs text-[#777777]">
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

// Set display name for the component
Select.displayName = "Select";

export { 
  Select,
  selectTriggerVariants,
  selectContentVariants,
  selectOptionVariants,
};