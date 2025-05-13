/**
 * Basic Info Step Component for Product Wizard
 * 
 * This component handles the first step of the product creation process,
 * focusing on the essential product information.
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProductWizardContext } from '../context';
import { ContextualHelp } from '../contextual-help';
import { ArrowRightCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export const BasicInfoStep = () => {
  const { 
    state, 
    updateState, 
    goToNextStep,
    validateStep,
    errors,
    catalogContext,
    isCatalogContextLoading
  } = useProductWizardContext();
  
  // Fetch categories for dropdown
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      return data.data;
    },
  });

  // Calculate regular price based on cost price and markup
  const calculateRegularPrice = (costPrice: number, markup: number) => {
    if (costPrice > 0 && markup > 0) {
      // Calculate price with markup and round to 2 decimal places
      return Math.round((costPrice * (1 + markup / 100)) * 100) / 100;
    }
    return 0;
  };

  // Common markup percentages for quick selection
  const markupOptions = [20, 30, 40, 50, 60, 70, 80, 100];

  // Handle form submission to go to next step
  const handleContinue = () => {
    if (validateStep('basic-info')) {
      goToNextStep();
    }
  };

  // Handle custom markup input
  const handleMarkupChange = (value: string) => {
    const markup = parseFloat(value);
    if (!isNaN(markup)) {
      updateState({ markupPercentage: markup });
      
      // Update regular price if cost price exists
      if (state.costPrice > 0) {
        const calculatedPrice = calculateRegularPrice(state.costPrice, markup);
        updateState({ regularPrice: calculatedPrice });
      }
    }
  };

  // Handle cost price change
  const handleCostPriceChange = (value: string) => {
    const costPrice = parseFloat(value);
    if (!isNaN(costPrice)) {
      updateState({ costPrice });
      
      // Update regular price based on markup
      if (state.markupPercentage > 0) {
        const calculatedPrice = calculateRegularPrice(costPrice, state.markupPercentage);
        updateState({ regularPrice: calculatedPrice });
      }
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Basic Product Information</h2>
        <p className="text-muted-foreground">
          Enter the core details about your product. Fields marked with an asterisk (*) are required.
        </p>
        {catalogContext && (
          <div className="mt-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              From Catalog: {state.catalogName || 'Loading...'}
            </Badge>
            {state.supplierName && (
              <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                Supplier: {state.supplierName}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Product name and slug */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="product-name" className="required">Product Name</Label>
              <ContextualHelp fieldId="product-name" />
            </div>
            <Input
              id="product-name"
              value={state.name}
              onChange={(e) => updateState({ name: e.target.value })}
              placeholder="Enter product name"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="product-slug" className="required">Product Slug</Label>
              <ContextualHelp fieldId="product-slug" />
            </div>
            <Input
              id="product-slug"
              value={state.slug}
              onChange={(e) => updateState({ slug: e.target.value })}
              placeholder="product-url-slug"
              className={errors.slug ? 'border-red-500' : ''}
            />
            {errors.slug && <p className="text-sm text-red-500">{errors.slug}</p>}
            <p className="text-xs text-muted-foreground">
              Auto-generated from product name, but can be edited
            </p>
          </div>
        </div>
        
        {/* Product description */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="product-description">Product Description</Label>
            <ContextualHelp fieldId="product-description" />
          </div>
          <Textarea
            id="product-description"
            value={state.description}
            onChange={(e) => updateState({ description: e.target.value })}
            placeholder="Describe your product with details that help customers make purchasing decisions"
            className="min-h-[120px]"
          />
        </div>
        
        {/* Pricing section */}
        <div>
          <h3 className="text-lg font-medium mb-4">Pricing</h3>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="cost-price" className="required">Cost Price</Label>
                <ContextualHelp fieldId="cost-price" />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">R</span>
                <Input
                  id="cost-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={state.costPrice || ''}
                  onChange={(e) => handleCostPriceChange(e.target.value)}
                  placeholder="0.00"
                  className={`pl-8 ${errors.costPrice ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.costPrice && <p className="text-sm text-red-500">{errors.costPrice}</p>}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="markup-percentage" className="required">Markup Percentage</Label>
                <ContextualHelp fieldId="markup-percentage" />
              </div>
              <div className="relative">
                <Input
                  id="markup-percentage"
                  type="number"
                  step="1"
                  min="0"
                  value={state.markupPercentage || ''}
                  onChange={(e) => handleMarkupChange(e.target.value)}
                  placeholder="40"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">%</span>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {markupOptions.map((markup) => (
                  <Button
                    key={markup}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={state.markupPercentage === markup ? 'bg-primary/10' : ''}
                    onClick={() => handleMarkupChange(markup.toString())}
                  >
                    {markup}%
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 mt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="regular-price" className="required">Regular Price</Label>
                <ContextualHelp fieldId="price-info" />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">R</span>
                <Input
                  id="regular-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={state.regularPrice || ''}
                  onChange={(e) => updateState({ regularPrice: parseFloat(e.target.value) })}
                  placeholder="0.00"
                  className={`pl-8 ${errors.regularPrice ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.regularPrice && <p className="text-sm text-red-500">{errors.regularPrice}</p>}
              <p className="text-xs text-muted-foreground">
                Auto-calculated from cost price and markup
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="sale-price">Sale Price (Optional)</Label>
                <ContextualHelp fieldId="sale-price" />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">R</span>
                <Input
                  id="sale-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={state.salePrice || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateState({ salePrice: value ? parseFloat(value) : undefined });
                  }}
                  placeholder="0.00"
                  className={`pl-8 ${errors.salePrice ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.salePrice && <p className="text-sm text-red-500">{errors.salePrice}</p>}
            </div>
          </div>
        </div>
        
        {/* Inventory section */}
        <div>
          <h3 className="text-lg font-medium mb-4">Inventory</h3>
          
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
                <ContextualHelp fieldId="sku" />
              </div>
              <Input
                id="sku"
                value={state.sku}
                onChange={(e) => updateState({ sku: e.target.value })}
                placeholder="SKU123"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="stock-level">Stock Level</Label>
                <ContextualHelp fieldId="stock-level" />
              </div>
              <Input
                id="stock-level"
                type="number"
                min="0"
                step="1"
                value={state.stockLevel || ''}
                onChange={(e) => updateState({ stockLevel: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="min-order-qty">Minimum Order Quantity</Label>
                <ContextualHelp fieldId="minimum-order" />
              </div>
              <Input
                id="min-order-qty"
                type="number"
                min="1"
                step="1"
                value={state.minOrderQty || ''}
                onChange={(e) => updateState({ minOrderQty: parseInt(e.target.value) || 1 })}
                placeholder="1"
              />
            </div>
          </div>
        </div>
        
        {/* Categorization section */}
        <div>
          <h3 className="text-lg font-medium mb-4">Categorization</h3>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="category">Product Category</Label>
                <ContextualHelp fieldId="category" />
              </div>
              <Select
                value={state.categoryId?.toString() || ''}
                onValueChange={(value) => {
                  const categoryId = parseInt(value);
                  const category = categories?.find(c => c.id === categoryId);
                  updateState({ 
                    categoryId,
                    categoryName: category?.name || ''
                  });
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="brand">Brand (Optional)</Label>
                <ContextualHelp fieldId="brand" />
              </div>
              <Input
                id="brand"
                value={state.brand || ''}
                onChange={(e) => updateState({ brand: e.target.value })}
                placeholder="Enter brand name"
              />
            </div>
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Navigation buttons */}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleContinue}
          className="flex items-center gap-2"
        >
          <span>Continue to Images</span>
          <ArrowRightCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default BasicInfoStep;