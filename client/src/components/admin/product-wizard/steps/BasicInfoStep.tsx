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

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
  
  // Auto-generate slug when name changes
  useEffect(() => {
    if (productData.name && !productData.slug) {
      const generatedSlug = slugify(productData.name, {
        lower: true,
        strict: true
      });
      handleFieldChange('slug', generatedSlug);
    }
  }, [productData.name]);

  const handleFieldChange = (field: string, value: any) => {
    // For numeric fields, convert the value
    if (['price', 'costPrice', 'salePrice', 'discount', 'minimumPrice'].includes(field)) {
      value = value === '' ? 0 : Number(value);
    }
    
    dispatch({
      type: WizardActionType.UPDATE_PRODUCT_DATA,
      payload: { [field]: value }
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
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>Product Name</FormLabel>
                <ContextualHelp fieldId="product-name" />
              </div>
              <FormControl>
                <Input
                  placeholder="Enter product name"
                  value={productData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                />
              </FormControl>
              <FormDescription>
                A clear, descriptive name for your product
              </FormDescription>
            </FormItem>
            
            {/* Product Slug */}
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>Product Slug</FormLabel>
                <ContextualHelp fieldId="product-slug" />
              </div>
              <FormControl>
                <Input
                  placeholder="product-url-slug"
                  value={productData.slug}
                  onChange={(e) => handleFieldChange('slug', e.target.value)}
                />
              </FormControl>
              <FormDescription>
                Used for the product URL (auto-generated from name)
              </FormDescription>
              <ExtendedHelpCard title="URL Slug Tips" className="mt-2">
                <p className="mb-2">A good slug improves SEO and creates clean URLs.</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Use hyphens instead of spaces</li>
                  <li>Avoid special characters</li>
                  <li>Keep it short but descriptive</li>
                </ul>
              </ExtendedHelpCard>
            </FormItem>
            
            {/* Category Selection */}
            <FormItem>
              <FormLabel>Category</FormLabel>
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
              <FormDescription>
                Choose the most relevant category for your product
              </FormDescription>
            </FormItem>
            
            {/* Product Description */}
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your product in detail..."
                  rows={6}
                  value={productData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                />
              </FormControl>
              <FormDescription>
                A complete description of the product, features, and benefits
              </FormDescription>
            </FormItem>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Pricing Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cost Price */}
            <FormItem>
              <FormLabel>Cost Price (R)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={productData.costPrice || ''}
                  onChange={(e) => handleFieldChange('costPrice', e.target.value)}
                />
              </FormControl>
              <FormDescription>
                Your cost to acquire this product
              </FormDescription>
            </FormItem>
            
            {/* Regular Price */}
            <FormItem>
              <FormLabel>Regular Price (R)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={productData.price || ''}
                  onChange={(e) => handleFieldChange('price', e.target.value)}
                />
              </FormControl>
              <FormDescription>
                Regular selling price
              </FormDescription>
            </FormItem>
            
            {/* Sale Price */}
            <FormItem>
              <FormLabel>Sale Price (R)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={productData.salePrice || ''}
                  onChange={(e) => handleFieldChange('salePrice', e.target.value)}
                />
              </FormControl>
              <FormDescription>
                Optional discounted price (leave empty if not on sale)
              </FormDescription>
            </FormItem>
            
            {/* Minimum Price */}
            <FormItem>
              <FormLabel>Minimum Price (R)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={productData.minimumPrice || ''}
                  onChange={(e) => handleFieldChange('minimumPrice', e.target.value)}
                />
              </FormControl>
              <FormDescription>
                Minimum allowed selling price
              </FormDescription>
            </FormItem>
            
            {/* Discount Percentage */}
            <FormItem>
              <FormLabel>Discount Percentage (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={productData.discount || ''}
                  onChange={(e) => handleFieldChange('discount', e.target.value)}
                />
              </FormControl>
              <FormDescription>
                Percentage discount to display (0-100)
              </FormDescription>
            </FormItem>
            
            {/* Discount Label */}
            <FormItem>
              <FormLabel>Discount Label</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Summer Sale, Black Friday"
                  value={productData.discountLabel || ''}
                  onChange={(e) => handleFieldChange('discountLabel', e.target.value)}
                />
              </FormControl>
              <FormDescription>
                Label to show for this discount (e.g. "Black Friday Deal")
              </FormDescription>
            </FormItem>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BasicInfoStep;