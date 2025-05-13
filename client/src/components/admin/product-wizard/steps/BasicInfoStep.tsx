/**
 * BasicInfoStep Component
 * 
 * This component handles the first step of the product creation wizard,
 * collecting basic product information like name, description, pricing, etc.
 */

import React, { useEffect } from 'react';
import { useProductWizardContext } from '../context';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateSlug, generateSku } from '../../../../utils/string-utils';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
      <h3 className="text-2xl font-semibold mb-4 text-[#FF69B4]">Basic Product Information</h3>
      <Card className="bg-white border border-[#E5E7EB] shadow-sm">
        <CardContent className="pt-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="general" className="data-[state=active]:bg-[#FF69B4] data-[state=active]:text-white">General Info</TabsTrigger>
              <TabsTrigger value="pricing" className="data-[state=active]:bg-[#FF69B4] data-[state=active]:text-white">Pricing</TabsTrigger>
            </TabsList>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <TabsContent value="general" className="space-y-6">
                  {/* Product Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex">Product Name <span className="text-[#FF6B6B] ml-1">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter product name"
                            {...field}
                            onChange={handleNameChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* URL Slug */}
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex">URL Slug <span className="text-[#FF6B6B] ml-1">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="product-url-slug"
                            className="border-[#E5E7EB] focus-visible:ring-[#FF69B4]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-[#777777]">
                          The URL-friendly identifier for this product
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* SKU */}
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex">SKU <span className="text-[#FF6B6B] ml-1">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="PROD123"
                            className="border-[#E5E7EB] focus-visible:ring-[#FF69B4]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-[#777777]">
                          Stock Keeping Unit - unique identifier for inventory
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Brand */}
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#333333]">Brand</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Brand name (optional)"
                              className="border-[#E5E7EB] focus-visible:ring-[#FF69B4]"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription className="text-[#777777]">
                            Manufacturer or company name
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Category */}
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#333333]">Category</FormLabel>
                          <Select
                            value={field.value?.toString() || "none"}
                            onValueChange={(value) => {
                              // Convert "none" to null, otherwise convert string ID to number
                              const categoryId = value === "none" ? null : parseInt(value, 10);
                              field.onChange(categoryId);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="border-[#E5E7EB] focus-visible:ring-[#FF69B4]">
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="border-[#E5E7EB]">
                              <SelectItem value="none" className="focus:bg-[#FFE6F0]">None</SelectItem>
                              {categoriesList && categoriesList.length > 0 
                                ? categoriesList.map((category: any) => (
                                    <SelectItem
                                      key={category.id}
                                      value={category.id.toString()}
                                      className="focus:bg-[#FFE6F0]"
                                    >
                                      {category.name}
                                    </SelectItem>
                                  ))
                                : <SelectItem value="no-categories" className="focus:bg-[#FFE6F0]">No categories available</SelectItem>
                              }
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-[#777777]">
                            Product classification for organization
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
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
                            className="min-h-32 border-[#E5E7EB] focus-visible:ring-[#FF69B4]"
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
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Active</FormLabel>
                            <FormDescription>
                              Product will be visible in store
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
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
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Featured</FormLabel>
                            <FormDescription>
                              Show product in featured sections
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
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
                      <FormItem>
                        <FormLabel className="flex">Cost Price <span className="text-[#FF6B6B] ml-1">*</span></FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-[#777777]">R</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="pl-7 border-[#E5E7EB] focus-visible:ring-[#FF69B4]"
                              placeholder="0.00"
                              {...field}
                              onChange={handleCostPriceChange}
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-[#777777]">
                          The price you pay for the product
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Markup Percentage */}
                  <FormField
                    control={form.control}
                    name="markupPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Markup Percentage</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-[#E5E7EB] hover:bg-[#FFE6F0] hover:text-[#FF69B4] hover:border-[#FF69B4]"
                              onClick={() => adjustMarkup(-5)}
                            >
                              <MinusCircleIcon className="h-4 w-4" />
                            </Button>
                            <div className="relative flex-1">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                className="pr-7 border-[#E5E7EB] focus-visible:ring-[#FF69B4]"
                                placeholder="0"
                                {...field}
                                onChange={handleMarkupChange}
                              />
                              <span className="absolute right-3 top-2.5 text-[#777777]">%</span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-[#E5E7EB] hover:bg-[#FFE6F0] hover:text-[#FF69B4] hover:border-[#FF69B4]"
                              onClick={() => adjustMarkup(5)}
                            >
                              <PlusCircleIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription className="text-[#777777]">
                          Percentage added to cost price
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Regular Price */}
                  <FormField
                    control={form.control}
                    name="regularPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex">Regular Price <span className="text-[#FF6B6B] ml-1">*</span></FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-[#777777]">R</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="pl-7 border-[#E5E7EB] focus-visible:ring-[#FF69B4]"
                              placeholder="0.00"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-[#777777]">
                          The standard selling price
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* On Sale Toggle */}
                  <FormField
                    control={form.control}
                    name="onSale"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] p-4">
                        <div className="space-y-0.5">
                          <FormLabel>On Sale</FormLabel>
                          <FormDescription className="text-[#777777]">
                            Apply a discounted price
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
                  
                  {/* Sale Price (only show if on sale) */}
                  {watchOnSale && (
                    <FormField
                      control={form.control}
                      name="salePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex">Sale Price <span className="text-[#FF6B6B] ml-1">*</span></FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-[#777777]">R</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className="pl-7 border-[#E5E7EB] focus-visible:ring-[#FF69B4]"
                                placeholder="0.00"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormDescription className="text-[#777777]">
                            The discounted selling price
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {/* Price Summary */}
                  {watchCostPrice > 0 && (
                    <div className="mt-4 p-4 border border-[#E5E7EB] rounded-md bg-[#F8F9FA] shadow-sm">
                      <h4 className="font-medium mb-2 text-[#FF69B4]">Pricing Summary</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#555555]">Cost Price:</span>
                          <span className="text-[#555555]">R{(parseFloat(watchCostPrice) || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#555555]">Markup ({watchMarkupPercentage || 0}%):</span>
                          <span className="text-[#555555]">R{((parseFloat(watchCostPrice) || 0) * ((parseFloat(watchMarkupPercentage) || 0) / 100)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium text-[#D94C97]">
                          <span>Regular Price:</span>
                          <span>R{parseFloat(form.getValues('regularPrice') || 0).toFixed(2)}</span>
                        </div>
                        {watchOnSale && (
                          <>
                            <div className="flex justify-between text-[#FF6B6B]">
                              <span>Discount:</span>
                              <span>-{Math.round((1 - (parseFloat(form.getValues('salePrice') || 0) / parseFloat(form.getValues('regularPrice') || 1))) * 100)}%</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span className="text-[#555555]">Sale Price:</span>
                              <span className="text-[#4CAF50]">R{parseFloat(form.getValues('salePrice') || 0).toFixed(2)}</span>
                            </div>
                          </>
                        )}
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