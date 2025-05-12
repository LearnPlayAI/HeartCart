/**
 * Contextual Help Component for Product Wizard
 * 
 * This component provides tooltips and contextual help throughout the product wizard interface.
 * It includes a reusable tooltip component and a centralized repository of help text.
 */

import { ReactNode } from 'react';
import { Info, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

// Types
interface FieldHelpProps {
  fieldId: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

interface ExtendedHelpProps {
  title: string;
  children: ReactNode;
  className?: string;
}

// Help text repository - centralized storage for all contextual help
const helpTextRepository: Record<string, {
  short: string;
  extended?: string;
}> = {
  // Basic Info Step
  'product-name': {
    short: 'Enter a descriptive name that customers will see',
    extended: 'A good product name should be clear, specific, and include key features. Aim for 5-10 words that accurately describe your product.'
  },
  'product-slug': {
    short: 'URL-friendly version of the product name',
    extended: 'The slug appears in the product URL and affects SEO. Use hyphens instead of spaces and avoid special characters.'
  },
  'product-price': {
    short: 'The regular selling price',
    extended: 'Set your regular selling price before any discounts. The system will automatically calculate margins based on your cost price.'
  },
  'product-cost-price': {
    short: 'Your cost to acquire this product',
    extended: 'This helps calculate profit margins and won\'t be visible to customers. Used for internal reporting and price recommendations.'
  },
  'product-description': {
    short: 'Detailed information about the product',
    extended: 'A comprehensive description improves SEO and conversion rates. Include key features, benefits, specifications, and usage instructions.'
  },
  
  // Images Step
  'product-images': {
    short: 'Upload high-quality product images',
    extended: 'Product images are crucial for conversion. Include multiple angles, detail shots, and images showing the product in use. The first image will be the main display image.'
  },
  'image-requirements': {
    short: 'Image size and format requirements',
    extended: 'Images should be at least 800x800px for optimal quality. Supported formats are JPG, PNG, and WebP with a maximum file size of 5MB.'
  },
  'background-removal': {
    short: 'Remove image backgrounds automatically',
    extended: 'Our AI tool can remove backgrounds to create professional product images on white or transparent backgrounds. Best results are achieved with clear contrast between product and background.'
  },
  
  // Additional Info Step
  'product-attributes': {
    short: 'Add specifications and features',
    extended: 'Attributes help customers find your products through filters and provide important details for purchasing decisions. Complete as many relevant attributes as possible.'
  },
  'attribute-suggestions': {
    short: 'Get AI-powered attribute recommendations',
    extended: 'Our system analyzes your product details and images to suggest the most relevant attributes for your product category. You can accept or modify these suggestions.'
  },
  'product-variants': {
    short: 'Create variations like size or color',
    extended: 'Variants let you offer different versions of the same product. Each variant can have its own price, SKU, and inventory level while sharing the same base information.'
  },
  
  // Review & Submit Step
  'product-review': {
    short: 'Review all information before publishing',
    extended: 'Carefully check all product details before submission. You can return to any section to make edits by clicking the Edit button.'
  },
  'publishing-options': {
    short: 'Choose when to make the product available',
    extended: 'You can publish immediately, schedule for a future date, or save as a draft to continue editing later. Published products are immediately visible to customers.'
  }
};

/**
 * Simple tooltip component for field-specific help
 */
export function FieldHelpTooltip({ 
  fieldId, 
  size = 'sm',
  position = 'top',
  className = ''
}: FieldHelpProps) {
  // Get help text from repository or use default
  const helpText = helpTextRepository[fieldId]?.short || 'Help information not available';
  
  // Size mappings
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Info className={`text-muted-foreground cursor-help ${sizeMap[size]} ${className}`} />
        </TooltipTrigger>
        <TooltipContent 
          side={position} 
          className="max-w-sm bg-popover text-popover-foreground p-3"
        >
          {helpText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Extended help component with hover card for more detailed information
 */
export function ExtendedHelpCard({ title, children, className = '' }: ExtendedHelpProps) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className={`flex items-center gap-1 text-muted-foreground cursor-help ${className}`}>
          <HelpCircle className="h-4 w-4" />
          <span className="text-sm underline underline-offset-2">Help & Tips</span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">{title}</h4>
          <div className="text-sm text-muted-foreground">
            {children}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Main contextual help component that provides field-specific help based on ID
 */
export function ContextualHelp({ fieldId, showExtended = false }: { fieldId: string, showExtended?: boolean }) {
  const helpData = helpTextRepository[fieldId];
  
  if (!helpData) {
    return null;
  }
  
  if (showExtended && helpData.extended) {
    return (
      <ExtendedHelpCard title={`About: ${fieldId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`}>
        <p>{helpData.extended}</p>
      </ExtendedHelpCard>
    );
  }
  
  return <FieldHelpTooltip fieldId={fieldId} />;
}

export default ContextualHelp;