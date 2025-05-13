/**
 * Contextual Help Component for Product Wizard
 * 
 * This component provides contextual help tooltips for various fields
 * in the product creation wizard.
 */

import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ContextualHelpProps {
  fieldId: string;
}

// Help content for different fields
const helpContent: Record<string, { title: string; content: string }> = {
  // Basic Info Step
  'product-name': {
    title: 'Product Name',
    content: 'Enter a clear, descriptive name that customers will recognize. Good names include key details like brand, model, and main features.'
  },
  'product-slug': {
    title: 'Product Slug',
    content: 'This creates the URL for your product page. It is automatically generated from the product name, but you can customize it if needed.'
  },
  'product-description': {
    title: 'Product Description',
    content: 'Describe your product in detail. Include features, benefits, materials, dimensions, and any other information that helps customers make a purchase decision.'
  },
  'cost-price': {
    title: 'Cost Price',
    content: 'The amount you pay to acquire or produce the product. This is used to calculate profit margins and won\'t be shown to customers.'
  },
  'markup-percentage': {
    title: 'Markup Percentage',
    content: 'The percentage added to your cost price to determine the selling price. Higher markup means more profit per sale.'
  },
  'price-info': {
    title: 'Pricing Information',
    content: 'Regular price is what customers normally pay. Sale price is optional for discounted products. The system ensures prices make sense relative to your costs.'
  },
  'sale-price': {
    title: 'Sale Price',
    content: 'An optional discounted price for promotions. If set, it will be displayed prominently with the regular price shown as a crossed-out original price.'
  },
  'sku': {
    title: 'SKU (Stock Keeping Unit)',
    content: 'A unique identifier for inventory management. Use a consistent format that helps you identify products quickly (e.g., TYPE-COLOR-SIZE).'
  },
  'stock-level': {
    title: 'Stock Level',
    content: 'The current quantity of this product available for sale. Set to 0 if out of stock or use a high number for made-to-order items.'
  },
  'minimum-order': {
    title: 'Minimum Order Quantity',
    content: 'The smallest quantity a customer can purchase in a single order. Useful for products that are only sold in multiples or bulk.'
  },
  'category': {
    title: 'Product Category',
    content: 'Categorize your product to help customers find it when browsing or filtering. Choose the most specific category that applies.'
  },
  'brand': {
    title: 'Brand',
    content: 'The manufacturer or brand name of the product. This helps with product filtering and search engine optimization.'
  },
  
  // Image Step
  'product-images': {
    title: 'Product Images',
    content: 'Upload high-quality images that showcase your product from different angles. The first image or one marked as primary will be featured prominently.'
  },
  
  // Additional Info Step
  'physical-product': {
    title: 'Physical Product',
    content: 'Indicates whether this is a physical product that requires shipping. Disable for digital products or services.'
  },
  'shipping-options': {
    title: 'Shipping Options',
    content: 'Configure how this product will be shipped to customers, including free shipping offers and delivery options.'
  },
  'product-tags': {
    title: 'Product Tags',
    content: 'Keywords that help with product discovery in search results. Use terms customers might search for to find your product.'
  },
  'flash-deal': {
    title: 'Flash Deal',
    content: 'Create urgency with a limited-time special price. Set the start/end dates and the discounted price for the promotion period.'
  },
  'product-visibility': {
    title: 'Product Visibility',
    content: 'Control whether the product is active (visible to customers) and if it should be featured on your homepage or category pages.'
  },
  'free-shipping': {
    title: 'Free Shipping',
    content: 'Offer free shipping for this product regardless of order value. This can be a strong selling point for customers.'
  },
  'product-status': {
    title: 'Product Status',
    content: 'Set whether the product is active (visible to customers) or inactive (hidden from the store but saved in your catalog).'
  },
  'featured-product': {
    title: 'Featured Product',
    content: 'Featured products appear in special sections on your homepage and category pages to increase visibility and sales.'
  },
  
  // Default help for any field not specifically defined
  'default': {
    title: 'Help',
    content: 'This field is part of your product information. Fill it out with accurate information to help customers make purchase decisions.'
  }
};

export const ContextualHelp: React.FC<ContextualHelpProps> = ({ fieldId }) => {
  // Get the help content for this field, or use default if not found
  const help = helpContent[fieldId] || helpContent.default;
  
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs p-4" side="right">
        <div className="space-y-2">
          <h4 className="font-medium">{help.title}</h4>
          <p className="text-sm text-muted-foreground">{help.content}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};