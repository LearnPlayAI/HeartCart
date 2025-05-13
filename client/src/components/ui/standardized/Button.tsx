/**
 * Standardized Button Component
 * 
 * This is a standardized button component that follows the TeeMeYou design system.
 * It implements the requirements from the standardization plan in docs/standard/standplan.md.
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';

// Define button variants using class-variance-authority
const buttonVariants = cva(
  // Base styles applied to all buttons
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary button - Hot Pink
        primary: "bg-[#FF69B4] text-white hover:bg-[#D94C97] active:bg-[#C43884]",
        
        // Secondary button - Soft Mint
        secondary: "bg-[#A8E6CF] text-[#333333] hover:bg-[#8BC9B5] active:bg-[#7AB19E]",
        
        // Outline button
        outline: "border border-[#E5E7EB] bg-transparent hover:bg-[#F8F9FA] text-[#333333]",
        
        // Ghost button
        ghost: "bg-transparent hover:bg-[#F8F9FA] text-[#333333]",
        
        // Destructive button - Error red
        destructive: "bg-[#FF6B6B] text-white hover:bg-[#E05252] active:bg-[#C83A3A]",
        
        // Success button - Green
        success: "bg-[#4CAF50] text-white hover:bg-[#3B8C3F] active:bg-[#2F7232]",
        
        // Link button
        link: "text-[#FF69B4] underline-offset-4 hover:underline bg-transparent p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 py-2",
        lg: "h-12 px-6 py-3 text-base",
        icon: "h-10 w-10 p-0", // For icon-only buttons
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  }
);

// Component props
export interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
}

/**
 * Button Component
 * 
 * @param {ButtonProps} props - Button properties
 * @returns {JSX.Element} - Rendered button
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth,
    asChild = false,
    leftIcon,
    rightIcon,
    isLoading = false,
    loadingText,
    children,
    disabled,
    ...props 
  }, ref) => {
    // If asChild is true, we render the children as the button using Slot
    const Comp = asChild ? Slot : "button";
    
    // Combine all classes using cn utility
    const buttonClasses = cn(
      buttonVariants({ variant, size, fullWidth, className })
    );
    
    // Determine if button should be disabled
    const isDisabled = disabled || isLoading;
    
    return (
      <Comp
        className={buttonClasses}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText || children}
          </>
        ) : (
          <>
            {leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  }
);

// Set display name for the component
Button.displayName = "Button";

export { Button, buttonVariants };