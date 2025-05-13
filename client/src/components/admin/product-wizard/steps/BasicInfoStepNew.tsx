/**
 * BasicInfoStep Component (Standardized Version)
 * 
 * This component is a redesigned version of the basic info step using
 * standardized UI components to ensure consistent styling with the
 * TeeMeYou design system.
 */

import React, { useEffect } from 'react';
import { useProductWizardContext } from '../context';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateSlug, generateSku } from '../../../../utils/string-utils';
import { useTheme } from '@/styles/ThemeProvider';

// Import standardized components
import { Input } from '@/components/ui/standardized/Input';
import { Select } from '@/components/ui/standardized/Select';
import { Button } from '@/components/ui/standardized/Button';
import { FormControlWrapper } from '@/components/ui/standardized/FormControlWrapper';

// Import existing components we're still using
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { PlusCircleIcon, MinusCircleIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Form validation schema
const basicInfoSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters'),
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  description: z.string().optional(),
  brand: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  costPrice: z.coerce.number().min(0.01, 'Cost price must be greater than 0'),
  markupPercentage: z.coerce.number().min(0, 'Markup must be at least 0%'),
  regularPrice: z.coerce.number().min(0.01, 'Regular price must be greater than 0'),
  onSale: z.boolean().default(false),
  salePrice: z.coerce.number().min(0).optional(),
});

type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;

export function BasicInfoStep() {
  // Get theme context
  const { colors } = useTheme();
  
  const { state, setField, markStepComplete, markStepValid, generateDefaults, updatePrices } = useProductWizardContext();
  
  // Fetch categories
  const { data: categoriesResponse, isLoading: categoriesLoading, isError: categoriesError } = useQuery({
    queryKey: ['/api/categories'],
  });
  
  // Extract categories from the API response (handles the success response format {data: [...categories]})
  // Filter to only show ACTIVE categories
  const categoriesList = categoriesResponse && categoriesResponse.data && Array.isArray(categoriesResponse.data) 
    ? categoriesResponse.data.filter((category: any) => category.isActive === true)
    : [];
  
  // Format categories for our standardized Select component
  const categoryOptions = [
    { value: 'none', label: 'None' }
  ];
  
  if (categoriesList && categoriesList.length > 0) {
    categoriesList.forEach((category: any) => {
      categoryOptions.push({
        value: category.id.toString(),
        label: category.name
      });
    });
  } else {
    categoryOptions.push({ 
      value: 'no-categories', 
      label: 'No categories available',
      disabled: true
    });
  }
  
  // Initialize form with values from context
  const form = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: state.name,
      slug: state.slug,
      sku: state.sku,
      description: state.description,
      brand: state.brand,
      categoryId: state.categoryId ? String(state.categoryId) : undefined,
      isActive: state.isActive,
      isFeatured: state.isFeatured,
      costPrice: state.costPrice || 0,
      markupPercentage: state.markupPercentage,
      regularPrice: state.regularPrice || 0,
      onSale: state.onSale,
      salePrice: state.salePrice || 0,
    },
  });
  
  // Handle form submission
  const onSubmit = (values: BasicInfoFormValues) => {
    // Update state with form values
    setField('name', values.name);
    setField('slug', values.slug);
    setField('sku', values.sku);
    setField('description', values.description);
    setField('brand', values.brand);
    setField('categoryId', values.categoryId && values.categoryId !== 'none' ? parseInt(values.categoryId) : null);
    setField('isActive', values.isActive);
    setField('isFeatured', values.isFeatured);
    setField('costPrice', values.costPrice);
    setField('markupPercentage', values.markupPercentage);
    setField('regularPrice', values.regularPrice);
    setField('onSale', values.onSale);
    setField('salePrice', values.onSale ? values.salePrice : null);
    
    // Also update metaTitle if not already set
    if (!state.metaTitle) {
      setField('metaTitle', values.name);
    }
    
    // Mark step as complete and valid
    markStepComplete('basic-info');
    markStepValid('basic-info', true);
  };
  
  // Auto-generate slug when name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    form.setValue('name', name);
    
    if (name && (!form.getValues('slug') || form.getValues('slug') === generateSlug(form.getValues('name')))) {
      const slug = generateSlug(name);
      form.setValue('slug', slug);
    }
    
    if (name && (!form.getValues('sku') || form.getValues('sku') === generateSku(form.getValues('name')))) {
      const sku = generateSku(name);
      form.setValue('sku', sku);
    }
  };
  
  // Update regular price when cost price or markup changes
  const calculateRegularPrice = () => {
    const costPrice = form.getValues('costPrice');
    const markupPercentage = form.getValues('markupPercentage');
    
    if (costPrice > 0) {
      const regularPrice = Math.ceil(costPrice * (1 + markupPercentage / 100));
      form.setValue('regularPrice', regularPrice);
      
      // If on sale, adjust sale price to maintain same discount percentage
      const onSale = form.getValues('onSale');
      if (onSale) {
        const currentRegularPrice = form.getValues('regularPrice');
        const currentSalePrice = form.getValues('salePrice') || 0;
        const currentDiscount = currentRegularPrice > 0 ? 1 - (currentSalePrice / currentRegularPrice) : 0;
        
        const newSalePrice = Math.ceil(regularPrice * (1 - currentDiscount));
        form.setValue('salePrice', newSalePrice);
      }
    }
  };
  
  // Handle cost price change
  const handleCostPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('costPrice', parseFloat(e.target.value) || 0);
    calculateRegularPrice();
  };
  
  // Handle markup percentage change
  const handleMarkupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('markupPercentage', parseFloat(e.target.value) || 0);
    calculateRegularPrice();
  };
  
  // Adjust markup percentage
  const adjustMarkup = (amount: number) => {
    const currentMarkup = form.getValues('markupPercentage');
    const newMarkup = Math.max(0, currentMarkup + amount);
    form.setValue('markupPercentage', newMarkup);
    calculateRegularPrice();
  };
  
  // Toggle sale status
  const handleSaleToggle = (checked: boolean) => {
    form.setValue('onSale', checked);
    
    if (checked && !form.getValues('salePrice')) {
      // Default sale price to 90% of regular price if not set
      const regularPrice = form.getValues('regularPrice');
      const salePrice = Math.ceil(regularPrice * 0.9);
      form.setValue('salePrice', salePrice);
    }
  };
  
  // Watch for changes to update form state
  const watchName = form.watch('name');
  const watchCostPrice = form.watch('costPrice');
  const watchMarkupPercentage = form.watch('markupPercentage');
  const watchOnSale = form.watch('onSale');
  
  // Auto-save form values to context when they change
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (type === 'change') {
        onSubmit(form.getValues());
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onSubmit]);
  
  return (
    <div className="wizard-step">
      <h3 className="text-2xl font-semibold mb-4" style={{ color: colors.primary }}>Basic Product Information</h3>
      <Card className="bg-white border border-[#E5E7EB] shadow-sm">
        <CardContent className="pt-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger 
                value="general" 
                className="data-[state=active]:text-white"
                style={{ 
                  ["--tw-bg-opacity" as any]: "1",
                  ["--tw-text-opacity" as any]: "1",
                  backgroundColor: `data-[state=active]:${colors.primary}`, 
                }}
              >
                General Info
              </TabsTrigger>
              <TabsTrigger 
                value="pricing" 
                className="data-[state=active]:text-white"
                style={{ 
                  ["--tw-bg-opacity" as any]: "1",
                  ["--tw-text-opacity" as any]: "1",
                  backgroundColor: `data-[state=active]:${colors.primary}`, 
                }}
              >
                Pricing
              </TabsTrigger>
            </TabsList>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <TabsContent value="general" className="space-y-6">
                  {/* Product Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormControlWrapper 
                        label="Product Name" 
                        required={true}
                        error={form.formState.errors.name?.message}
                      >
                        <Input
                          placeholder="Enter product name"
                          {...field}
                          onChange={handleNameChange}
                          validation={form.formState.errors.name ? 'invalid' : undefined}
                          errorMessage={form.formState.errors.name?.message}
                        />
                      </FormControlWrapper>
                    )}
                  />
                  
                  {/* URL Slug */}
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormControlWrapper 
                        label="URL Slug" 
                        required={true}
                        error={form.formState.errors.slug?.message}
                        helperText="The URL-friendly identifier for this product"
                      >
                        <Input
                          placeholder="product-url-slug"
                          {...field}
                          validation={form.formState.errors.slug ? 'invalid' : undefined}
                          errorMessage={form.formState.errors.slug?.message}
                        />
                      </FormControlWrapper>
                    )}
                  />
                  
                  {/* SKU */}
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormControlWrapper 
                        label="SKU" 
                        required={true}
                        error={form.formState.errors.sku?.message}
                        helperText="Stock Keeping Unit - unique identifier for inventory"
                      >
                        <Input
                          placeholder="PROD123"
                          {...field}
                          validation={form.formState.errors.sku ? 'invalid' : undefined}
                          errorMessage={form.formState.errors.sku?.message}
                        />
                      </FormControlWrapper>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Brand */}
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormControlWrapper 
                          label="Brand" 
                          error={form.formState.errors.brand?.message}
                          helperText="Manufacturer or company name"
                        >
                          <Input
                            placeholder="Brand name (optional)"
                            {...field}
                            value={field.value || ''}
                            validation={form.formState.errors.brand ? 'invalid' : undefined}
                            errorMessage={form.formState.errors.brand?.message}
                          />
                        </FormControlWrapper>
                      )}
                    />
                    
                    {/* Category */}
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormControlWrapper 
                          label="Category" 
                          error={form.formState.errors.categoryId?.message}
                          helperText="Product classification for organization"
                        >
                          <Select
                            options={categoryOptions}
                            value={field.value?.toString() || "none"}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Convert "none" to null, otherwise convert string ID to number
                              const categoryId = value === "none" ? null : parseInt(value, 10);
                              field.onChange(categoryId);
                            }}
                            placeholder="Select a category"
                            validation={form.formState.errors.categoryId ? 'invalid' : undefined}
                            errorMessage={form.formState.errors.categoryId?.message}
                          />
                        </FormControlWrapper>
                      )}
                    />
                  </div>
                  
                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#333333]">Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter product description (optional)"
                            className="min-h-32 border-[#E5E7EB]"
                            style={{
                              "&:focus-visible": {
                                outline: "none",
                                borderColor: colors.primary,
                                boxShadow: `0 0 0 2px ${colors.primaryLight}`
                              }
                            }}
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription className="text-[#777777]">
                          Detailed information about the product's features and benefits
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator className="my-4" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Active Status */}
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 border-[#E5E7EB]">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base text-[#333333]">Active Status</FormLabel>
                            <FormDescription className="text-[#777777]">
                              Make this product visible in the store
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-[#FF69B4]"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {/* Featured Status */}
                    <FormField
                      control={form.control}
                      name="isFeatured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 border-[#E5E7EB]">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base text-[#333333]">Featured Product</FormLabel>
                            <FormDescription className="text-[#777777]">
                              Showcase this product on the homepage
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-[#FF69B4]"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="pricing" className="space-y-6">
                  {/* Cost Price */}
                  <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormControlWrapper 
                        label="Cost Price" 
                        required={true}
                        error={form.formState.errors.costPrice?.message}
                        helperText="Your purchase cost for this product"
                      >
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={handleCostPriceChange}
                          validation={form.formState.errors.costPrice ? 'invalid' : undefined}
                          errorMessage={form.formState.errors.costPrice?.message}
                          leftElement={<span className="text-gray-500">R</span>}
                        />
                      </FormControlWrapper>
                    )}
                  />
                  
                  {/* Markup Percentage */}
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name="markupPercentage"
                        render={({ field }) => (
                          <FormControlWrapper 
                            label="Markup Percentage" 
                            required={true}
                            error={form.formState.errors.markupPercentage?.message}
                            helperText="Percentage added to cost to determine price"
                          >
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              {...field}
                              onChange={handleMarkupChange}
                              validation={form.formState.errors.markupPercentage ? 'invalid' : undefined}
                              errorMessage={form.formState.errors.markupPercentage?.message}
                              rightElement={<span className="text-gray-500">%</span>}
                            />
                          </FormControlWrapper>
                        )}
                      />
                    </div>
                    
                    <div className="flex gap-1">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => adjustMarkup(-5)}
                        leftIcon={<MinusCircleIcon className="h-4 w-4" />}
                      >
                        5%
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => adjustMarkup(5)}
                        leftIcon={<PlusCircleIcon className="h-4 w-4" />}
                      >
                        5%
                      </Button>
                    </div>
                  </div>
                  
                  {/* Regular Price */}
                  <FormField
                    control={form.control}
                    name="regularPrice"
                    render={({ field }) => (
                      <FormControlWrapper 
                        label="Regular Price" 
                        required={true}
                        error={form.formState.errors.regularPrice?.message}
                        helperText="The normal selling price for this product"
                      >
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          disabled
                          {...field}
                          validation={form.formState.errors.regularPrice ? 'invalid' : undefined}
                          errorMessage={form.formState.errors.regularPrice?.message}
                          leftElement={<span className="text-gray-500">R</span>}
                        />
                      </FormControlWrapper>
                    )}
                  />
                  
                  {/* On Sale Switch */}
                  <FormField
                    control={form.control}
                    name="onSale"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 border-[#E5E7EB]">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base text-[#333333]">On Sale</FormLabel>
                          <FormDescription className="text-[#777777]">
                            Apply a special discount to this product
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={handleSaleToggle}
                            className="data-[state=checked]:bg-[#FF69B4]"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {/* Sale Price - Only visible if onSale is true */}
                  {watchOnSale && (
                    <FormField
                      control={form.control}
                      name="salePrice"
                      render={({ field }) => (
                        <FormControlWrapper 
                          label="Sale Price" 
                          required={true}
                          error={form.formState.errors.salePrice?.message}
                          helperText="The discounted price for this product"
                        >
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            validation={form.formState.errors.salePrice ? 'invalid' : undefined}
                            errorMessage={form.formState.errors.salePrice?.message}
                            leftElement={<span className="text-gray-500">R</span>}
                          />
                        </FormControlWrapper>
                      )}
                    />
                  )}
                  
                  {/* Display discount percentage if on sale */}
                  {watchOnSale && watchCostPrice > 0 && (
                    <div className="p-4 bg-[#FFE6F0] rounded-lg">
                      <p className="text-[#333333] font-medium">Profit Margin Calculation</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-[#777777]">Cost Price:</span>
                          <span className="ml-2 font-medium">R {watchCostPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[#777777]">Regular Price:</span>
                          <span className="ml-2 font-medium">R {form.getValues('regularPrice').toFixed(2)}</span>
                        </div>
                        {watchOnSale && (
                          <>
                            <div>
                              <span className="text-[#777777]">Sale Price:</span>
                              <span className="ml-2 font-medium">R {form.getValues('salePrice').toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-[#777777]">Discount:</span>
                              <span className="ml-2 font-medium text-[#FF6B6B]">
                                {Math.round((1 - (form.getValues('salePrice') / form.getValues('regularPrice'))) * 100)}%
                              </span>
                            </div>
                          </>
                        )}
                        <div>
                          <span className="text-[#777777]">Profit Margin:</span>
                          <span className="ml-2 font-medium text-[#4CAF50]">
                            {Math.round((((watchOnSale ? form.getValues('salePrice') : form.getValues('regularPrice')) - watchCostPrice) / watchCostPrice) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </form>
            </Form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}