/**
 * Basic Product Information Step
 * 
 * This component implements Step 1 of the product wizard,
 * collecting basic information like title, description, category, and pricing.
 * Includes contextual help tooltips for user guidance.
 */

import React, { useEffect } from 'react';
import { useProductWizard } from '../context';
import { WizardActionType } from '../types';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import slugify from 'slugify';
import { ContextualHelp, ExtendedHelpCard } from '../contextual-help';

// Form components no longer needed since we're using basic HTML
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BasicInfoStepProps {
  className?: string;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ className }) => {
  const { state, dispatch } = useProductWizard();
  const { productData, catalogId } = state;
  
  // Fetch categories
  const { data: categoriesResponse, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    }
  });
  
  const categories = categoriesResponse?.data || [];
  
  // Always auto-generate slug when name changes
  useEffect(() => {
    if (productData.name) {
      // Generate a base slug from the product name
      let generatedSlug = slugify(productData.name, {
        lower: true,
        strict: true
      });
      
      // Ensure minimum length and add timestamp for uniqueness if needed
      if (generatedSlug.length < 3) {
        generatedSlug = `product-${Date.now()}`;
      } else {
        // Add random suffix for uniqueness
        const timestamp = Date.now().toString(36).slice(-4);
        generatedSlug = `${generatedSlug}-${timestamp}`;
      }
      
      // Limit length to avoid excessively long slugs
      if (generatedSlug.length > 50) {
        generatedSlug = generatedSlug.substring(0, 50);
      }
      
      handleFieldChange('slug', generatedSlug);
    } else {
      // If no name, generate a random slug
      const timestamp = Date.now();
      handleFieldChange('slug', `product-${timestamp}`);
    }
  }, [productData.name]);

  // Enhanced field change handler with auto-calculation and data filling
  const handleFieldChange = (field: string, value: any) => {
    // For numeric fields, convert the value
    if (['price', 'costPrice', 'salePrice', 'discount', 'minimumPrice'].includes(field)) {
      value = value === '' ? 0 : Number(value);
    }
    
    // Create payload with the changed field
    const payload: Record<string, any> = { [field]: value };
    
    // Auto-calculate related fields
    if (field === 'price') {
      // If regular price changes:
      
      // 1. If cost price is not set, suggest cost price at 70% of regular price
      if (!productData.costPrice) {
        payload.costPrice = Math.round((value * 0.7) * 100) / 100; // 70% of price, rounded to 2 decimals
      }
      
      // 2. If minimum price is not set, suggest minimum price at 90% of regular price
      if (!productData.minimumPrice) {
        payload.minimumPrice = Math.round((value * 0.9) * 100) / 100; // 90% of price
      }
      
      // 3. Update discount percentage if sale price exists
      if (productData.salePrice && productData.salePrice > 0 && value > 0) {
        const discountPercent = Math.round(((value - productData.salePrice) / value) * 100);
        if (discountPercent > 0) {
          payload.discount = discountPercent;
        }
      }
    } 
    else if (field === 'salePrice') {
      // If sale price changes and regular price exists, calculate discount
      if (productData.price && productData.price > 0 && value > 0) {
        const discountPercent = Math.round(((productData.price - value) / productData.price) * 100);
        if (discountPercent > 0) {
          payload.discount = discountPercent;
        }
      }
    }
    else if (field === 'discount') {
      // If discount changes and regular price exists, calculate sale price
      if (productData.price && productData.price > 0 && value > 0) {
        const calculatedSalePrice = Math.round((productData.price * (100 - value) / 100) * 100) / 100;
        payload.salePrice = calculatedSalePrice;
      }
    }
    
    dispatch({
      type: WizardActionType.UPDATE_PRODUCT_DATA,
      payload: payload
    });
  };
  
  if (isCategoriesLoading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2">Loading categories...</span>
      </div>
    );
  }
  
  return (
    <div className={className}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Basic Product Information</h2>
        <p className="text-muted-foreground">
          Enter the essential details about your product to get started.
        </p>
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Core Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Name */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Product Name</label>
                <ContextualHelp fieldId="product-name" />
              </div>
              <Input
                placeholder="Enter product name"
                value={productData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                A clear, descriptive name for your product
              </p>
            </div>
            
            {/* Product Slug - Read-only field */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Product Slug</label>
                <ContextualHelp fieldId="product-slug" />
              </div>
              <Input
                placeholder="product-url-slug"
                value={productData.slug}
                readOnly
                disabled
                className="bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-sm text-muted-foreground">
                Used for the product URL (automatically generated from name for uniqueness)
              </p>
              <ExtendedHelpCard title="About Product Slugs" className="mt-2">
                <p className="mb-2">Product slugs are automatically generated from the product name for uniqueness and SEO best practices.</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Includes a unique identifier to prevent conflicts</li>
                  <li>Special characters are automatically removed</li>
                  <li>No manual editing needed - changes when product name changes</li>
                </ul>
              </ExtendedHelpCard>
            </div>
            
            {/* Category Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={productData.categoryId?.toString() || ''}
                onValueChange={(value) => handleFieldChange('categoryId', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose the most relevant category for your product
              </p>
            </div>
            
            {/* Product Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Describe your product in detail..."
                rows={6}
                value={productData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                A complete description of the product, features, and benefits
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Pricing Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cost Price */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cost Price (R)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={productData.costPrice || ''}
                onChange={(e) => handleFieldChange('costPrice', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Your cost to acquire this product
                {productData.price && productData.costPrice === Math.round((productData.price * 0.7) * 100) / 100 && 
                  <span className="ml-1 text-blue-600">(Auto-suggested based on price)</span>
                }
              </p>
            </div>
            
            {/* Regular Price */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Regular Price (R)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={productData.price || ''}
                onChange={(e) => handleFieldChange('price', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Regular selling price
              </p>
            </div>
            
            {/* Sale Price */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sale Price (R)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={productData.salePrice || ''}
                onChange={(e) => handleFieldChange('salePrice', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Optional discounted price (leave empty if not on sale)
                {productData.price && productData.discount && productData.salePrice === Math.round((productData.price * (100 - productData.discount) / 100) * 100) / 100 && 
                  <span className="ml-1 text-blue-600">(Auto-calculated from discount)</span>
                }
              </p>
            </div>
            
            {/* Minimum Price */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Price (R)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={productData.minimumPrice || ''}
                onChange={(e) => handleFieldChange('minimumPrice', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Minimum allowed selling price
                {productData.price && productData.minimumPrice === Math.round((productData.price * 0.9) * 100) / 100 && 
                  <span className="ml-1 text-blue-600">(Auto-suggested based on price)</span>
                }
              </p>
            </div>
            
            {/* Discount Percentage */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Discount Percentage (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={productData.discount || ''}
                onChange={(e) => handleFieldChange('discount', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Percentage discount to display (0-100)
              </p>
            </div>
            
            {/* Discount Label */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Discount Label</label>
              <Input
                placeholder="e.g., Summer Sale, Black Friday"
                value={productData.discountLabel || ''}
                onChange={(e) => handleFieldChange('discountLabel', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Label to show for this discount (e.g. "Black Friday Deal")
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BasicInfoStep;