/**
 * Basic Info Step Component
 * 
 * Handles the first step of the product creation wizard, collecting
 * basic product information, pricing, and inventory details.
 */

import React, { useEffect } from 'react';
import { useProductWizardContext } from '../context';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  InfoIcon, 
  DollarSign, 
  Package2, 
  Tag, 
  BarChart,
  Loader2,
  CalendarIcon
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { slugify } from '@/utils/string-utils';
import { Separator } from '@/components/ui/separator';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const BasicInfoStep: React.FC = () => {
  const { 
    state, 
    updateField, 
    markStepComplete, 
    validateStep,
    catalogContext,
    isCatalogContextLoading
  } = useProductWizardContext();
  const { toast } = useToast();
  
  // Query for loading categories
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json().then(res => res.data);
    }
  });
  
  // Auto-generate slug when name changes
  useEffect(() => {
    if (state.name && !state.slug) {
      const generatedSlug = slugify(state.name);
      updateField('slug', generatedSlug);
    }
  }, [state.name, state.slug, updateField]);
  
  // Calculate regular price when cost price or markup changes
  useEffect(() => {
    if (state.costPrice > 0 && state.markupPercentage > 0) {
      const calculatedPrice = state.costPrice * (1 + state.markupPercentage / 100);
      
      // Round to two decimal places
      const roundedPrice = Math.round(calculatedPrice * 100) / 100;
      
      updateField('regularPrice', roundedPrice);
    }
  }, [state.costPrice, state.markupPercentage, updateField]);
  
  // Auto-validate on mount to set completedSteps correctly
  useEffect(() => {
    const isValid = validateStep('basic-info');
    
    if (isValid) {
      markStepComplete('basic-info');
    }
  }, [validateStep, markStepComplete]);
  
  // Handle text/number input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      updateField(name as keyof typeof state, parseFloat(value) || 0);
    } else {
      updateField(name as keyof typeof state, value);
    }
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (name: keyof typeof state, checked: boolean) => {
    updateField(name, checked);
  };
  
  // Handle select changes
  const handleSelectChange = (name: keyof typeof state, value: string) => {
    updateField(name, value);
  };
  
  // Handle category selection
  const handleCategoryChange = (categoryId: string) => {
    const id = parseInt(categoryId);
    const category = categories?.find(cat => cat.id === id);
    
    updateField('categoryId', id);
    updateField('categoryName', category?.name || '');
  };
  
  // Format date for display
  const formatDate = (date: string | null) => {
    if (!date) return '';
    return format(new Date(date), 'PPP');
  };
  
  return (
    <div className="product-wizard-basic-info space-y-6">
      <h2 className="text-2xl font-bold">Basic Information</h2>
      <p className="text-muted-foreground">
        Enter the basic details for your product.
      </p>
      
      {/* Product Details Section */}
      <div className="product-details">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <InfoIcon className="mr-2 h-5 w-5" />
          Product Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              name="name"
              value={state.name}
              onChange={handleInputChange}
              placeholder="Enter product name"
              required
            />
          </div>
          
          {/* Product SKU */}
          <div className="space-y-2">
            <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
            <Input
              id="sku"
              name="sku"
              value={state.sku}
              onChange={handleInputChange}
              placeholder="e.g. T-SHIRT-L-BLUE"
            />
          </div>
          
          {/* Product Slug */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="slug">URL Slug *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="cursor-help">
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      The slug is used in the product URL. It should be unique, lowercase, and contain only letters, numbers, and hyphens.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="slug"
              name="slug"
              value={state.slug}
              onChange={handleInputChange}
              placeholder="product-url-slug"
              required
            />
          </div>
          
          {/* Brand */}
          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              name="brand"
              value={state.brand}
              onChange={handleInputChange}
              placeholder="Enter brand name"
            />
            {catalogContext?.defaultBrand && (
              <p className="text-xs text-muted-foreground mt-1">
                Default brand from catalog: {catalogContext.defaultBrand}
              </p>
            )}
          </div>
          
          {/* Category */}
          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label htmlFor="categoryId">Category</Label>
            <Select
              value={state.categoryId?.toString() || ''}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger id="categoryId">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCategories ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Loading categories...</span>
                  </div>
                ) : (
                  categories?.map(category => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {catalogContext?.defaultCategory && (
              <p className="text-xs text-muted-foreground mt-1">
                Default category from catalog: {catalogContext.defaultCategory.name}
              </p>
            )}
          </div>
          
          {/* Description */}
          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={state.description}
              onChange={handleInputChange}
              placeholder="Enter product description"
              rows={5}
            />
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Pricing Section */}
      <div className="pricing">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <DollarSign className="mr-2 h-5 w-5" />
          Pricing
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cost Price */}
          <div className="space-y-2">
            <Label htmlFor="costPrice">Cost Price *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="costPrice"
                name="costPrice"
                type="number"
                value={state.costPrice || ''}
                onChange={handleInputChange}
                placeholder="0.00"
                className="pl-7"
                min={0}
                step={0.01}
                required
              />
            </div>
          </div>
          
          {/* Markup Percentage */}
          <div className="space-y-2">
            <Label htmlFor="markupPercentage">Markup Percentage *</Label>
            <div className="relative">
              <Input
                id="markupPercentage"
                name="markupPercentage"
                type="number"
                value={state.markupPercentage || ''}
                onChange={handleInputChange}
                placeholder="30"
                className="pr-7"
                min={0}
                step={1}
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
            {catalogContext?.defaultPricing?.recommendedMarkup && (
              <p className="text-xs text-muted-foreground mt-1">
                Recommended markup: {catalogContext.defaultPricing.recommendedMarkup}%
              </p>
            )}
          </div>
          
          {/* Regular Price */}
          <div className="space-y-2">
            <Label htmlFor="regularPrice">Regular Price *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="regularPrice"
                name="regularPrice"
                type="number"
                value={state.regularPrice || ''}
                onChange={handleInputChange}
                placeholder="0.00"
                className="pl-7"
                min={0}
                step={0.01}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-calculated from cost price and markup
            </p>
          </div>
          
          {/* Sale Price */}
          <div className="space-y-2">
            <Label htmlFor="salePrice">Sale Price (Optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="salePrice"
                name="salePrice"
                type="number"
                value={state.salePrice || ''}
                onChange={(e) => updateField('salePrice', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0.00"
                className="pl-7"
                min={0}
                step={0.01}
              />
            </div>
          </div>
          
          {/* Sale Start Date */}
          <div className="space-y-2">
            <Label htmlFor="saleStartDate">Sale Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  id="saleStartDate"
                  className={cn(
                    "w-full flex items-center justify-start rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                    "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {state.saleStartDate ? (
                    formatDate(state.saleStartDate)
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={state.saleStartDate ? new Date(state.saleStartDate) : undefined}
                  onSelect={(date) => 
                    updateField('saleStartDate', date ? date.toISOString() : null)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Sale End Date */}
          <div className="space-y-2">
            <Label htmlFor="saleEndDate">Sale End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  id="saleEndDate"
                  className={cn(
                    "w-full flex items-center justify-start rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                    "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {state.saleEndDate ? (
                    formatDate(state.saleEndDate)
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={state.saleEndDate ? new Date(state.saleEndDate) : undefined}
                  onSelect={(date) => 
                    updateField('saleEndDate', date ? date.toISOString() : null)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Inventory Section */}
      <div className="inventory">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Package2 className="mr-2 h-5 w-5" />
          Inventory
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stock Level */}
          <div className="space-y-2">
            <Label htmlFor="stockLevel">Stock Level *</Label>
            <Input
              id="stockLevel"
              name="stockLevel"
              type="number"
              value={state.stockLevel}
              onChange={handleInputChange}
              placeholder="10"
              min={0}
              step={1}
              required
            />
          </div>
          
          {/* Low Stock Threshold */}
          <div className="space-y-2">
            <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
            <Input
              id="lowStockThreshold"
              name="lowStockThreshold"
              type="number"
              value={state.lowStockThreshold}
              onChange={handleInputChange}
              placeholder="5"
              min={0}
              step={1}
            />
            <p className="text-xs text-muted-foreground mt-1">
              You'll be notified when stock drops below this level
            </p>
          </div>
          
          {/* Backorder Option */}
          <div className="space-y-2 flex items-center pt-8">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="backorderEnabled"
                checked={state.backorderEnabled}
                onCheckedChange={(checked) => 
                  handleCheckboxChange('backorderEnabled', checked === true)
                }
              />
              <Label htmlFor="backorderEnabled" className="cursor-pointer">
                Allow Backorders
              </Label>
            </div>
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Visibility Section */}
      <div className="visibility">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <BarChart className="mr-2 h-5 w-5" />
          Product Status
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={state.isActive}
              onCheckedChange={(checked) => 
                handleCheckboxChange('isActive', checked === true)
              }
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active (Visible to customers)
            </Label>
          </div>
          
          {/* Draft Status */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDraft"
              checked={state.isDraft}
              onCheckedChange={(checked) => 
                handleCheckboxChange('isDraft', checked === true)
              }
            />
            <Label htmlFor="isDraft" className="cursor-pointer">
              Save as Draft
            </Label>
          </div>
          
          {/* Featured */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isFeatured"
              checked={state.isFeatured}
              onCheckedChange={(checked) => 
                handleCheckboxChange('isFeatured', checked === true)
              }
            />
            <Label htmlFor="isFeatured" className="cursor-pointer">
              Featured Product
            </Label>
          </div>
          
          {/* New Tag */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isNew"
              checked={state.isNew}
              onCheckedChange={(checked) => 
                handleCheckboxChange('isNew', checked === true)
              }
            />
            <Label htmlFor="isNew" className="cursor-pointer">
              Mark as New
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoStep;