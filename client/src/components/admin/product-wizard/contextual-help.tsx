/**
 * Contextual Help Components for Product Wizard
 * 
 * This module provides standardized help components for the product wizard,
 * including tooltips, help cards, and extended information panels.
 */

import React, { useState } from 'react';
import {
  Info,
  HelpCircle,
  X
} from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';

// Help text content for different fields
const helpTexts: Record<string, string> = {
  'product-name': 'Enter a descriptive name that clearly identifies your product. Good names include key details like color, material, or size.',
  'product-slug': 'The product slug is used in the URL for your product page. It\'s automatically generated from the product name.',
  'product-description': 'Provide a detailed description of your product including features, specifications, and benefits. More detailed descriptions tend to convert better.',
  'price-info': 'Set your regular selling price. This should reflect the standard non-discounted price of your product.',
  'cost-price': 'Your cost to acquire or produce this item. This is used to calculate profit margins and is not shown to customers.',
  'markup-percentage': 'The percentage added to your cost price to determine the regular selling price. Industry standard is 40-100% depending on category.',
  'sale-price': 'Optional discounted price when running special offers or promotions. Leave empty if the product is not on sale.',
  'minimum-price': 'The lowest price this product can be sold for. This prevents excessive discounting that might harm your brand value or profit margins.',
  'sku': 'Stock Keeping Unit - a unique identifier for tracking inventory. Use a consistent format for all your products.',
  'stock-level': 'The current quantity of this product available for purchase. Set to 0 if out of stock.',
  'minimum-order': 'The minimum quantity that customers must purchase in a single order. Default is 1.',
  'brand': 'The manufacturer or brand name of the product. Leave empty if it\'s your own branded product.',
  'product-tags': 'Keywords that help customers find your product through search. Good tags improve visibility and sales.',
  'main-image': 'The primary image that appears in listings and at the top of the product page. Should clearly show the whole product.',
  'additional-images': 'Extra images showing different angles, details, or use cases. Quality images from multiple angles increase conversion rates.',
  'special-sale': 'Configure time-limited special offer promotions with start and end dates.',
  'flash-deal': 'Limited-time flash deals with countdown timer to create urgency. Only active during the specified period.',
  'free-shipping': 'Offer free shipping for this product. This can help increase conversion rates.',
  'featured-product': 'Highlight this product on your homepage and category pages to increase visibility.',
  'category': 'Select the most appropriate category for your product. This affects where customers will find it in your store.',
};

interface ContextualHelpProps {
  fieldId: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * Simple tooltip-based contextual help for form fields
 */
export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  fieldId,
  position = 'top',
  className = '',
}) => {
  const helpText = helpTexts[fieldId] || 'Help information not available';

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button 
            type="button" 
            className={`inline-flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded-full ${className}`}
            aria-label="Show help information"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={position} className="max-w-xs">
          <p className="text-sm">{helpText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface ExtendedHelpCardProps {
  title: string;
  className?: string;
  children: React.ReactNode;
  dismissable?: boolean;
}

/**
 * Extended help card for more detailed information
 */
export const ExtendedHelpCard: React.FC<ExtendedHelpCardProps> = ({
  title,
  className = '',
  children,
  dismissable = false,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <Card className={`bg-blue-50 border-blue-200 ${className}`}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
            <Info className="h-4 w-4 mr-2 text-blue-600" />
            {title}
          </CardTitle>
          {dismissable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-100"
              onClick={() => setIsVisible(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="py-2 px-4 text-sm text-blue-800">
        {children}
      </CardContent>
    </Card>
  );
};