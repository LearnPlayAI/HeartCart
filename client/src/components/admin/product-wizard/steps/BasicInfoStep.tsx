/**
 * BasicInfoStep Component
 * 
 * This component handles the first step of the product wizard,
 * collecting basic product information such as name, description, category, etc.
 */

import React, { useEffect, useState } from 'react';
import { useProductWizardContext } from '../context';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import axios from 'axios';
import { generateProductSku } from '@/utils/string-utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Define the form schema with validation
const basicInfoSchema = z.object({
  name: z.string().min(2, { message: 'Product name must be at least 2 characters.' }),
  slug: z.string().min(2, { message: 'Product slug must be at least 2 characters.' }),
  sku: z.string().min(2, { message: 'SKU must be at least 2 characters.' }),
  brand: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  costPrice: z.number().min(0, { message: 'Cost price must be a positive number.' }),
  markupPercentage: z.number().min(0, { message: 'Markup percentage must be a positive number.' }),
  regularPrice: z.number().min(0, { message: 'Regular price must be a positive number.' }),
  salePrice: z.number().min(0, { message: 'Sale price must be a positive number.' }).optional().nullable(),
  stockLevel: z.number().min(0, { message: 'Stock level must be a positive number.' }).default(0),
  lowStockThreshold: z.number().min(0, { message: 'Low stock threshold must be a positive number.' }).default(5),
  backorderEnabled: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isDraft: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(true),
});

// BasicInfoStep component
const BasicInfoStep: React.FC = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { 
    state, 
    updateField, 
    validateStep, 
    markStepComplete,
    currentStep,
    goToStep,
  } = useProductWizardContext();
  
  // Initialize the form with values from context
  const form = useForm<z.infer<typeof basicInfoSchema>>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: state.name || '',
      slug: state.slug || '',
      sku: state.sku || '',
      brand: state.brand || '',
      description: state.description || '',
      categoryId: state.categoryId ? String(state.categoryId) : undefined,
      costPrice: state.costPrice || 0,
      markupPercentage: state.markupPercentage || 30,
      regularPrice: state.regularPrice || 0,
      salePrice: state.salePrice || undefined,
      stockLevel: state.stockLevel || 0,
      lowStockThreshold: state.lowStockThreshold || 5,
      backorderEnabled: state.backorderEnabled || false,
      isActive: state.isActive,
      isDraft: state.isDraft,
      isFeatured: state.isFeatured,
      isNew: state.isNew,
    },
  });
  
  // Fetch categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get('/api/categories');
        if (response.data && response.data.success) {
          setCategories(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        toast({
          title: 'Error',
          description: 'Failed to load categories. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategories();
  }, [toast]);
  
  // Generate SKU based on product name and category if SKU is empty
  useEffect(() => {
    const name = form.watch('name');
    const sku = form.watch('sku');
    const categoryId = form.watch('categoryId');
    
    if (name && !sku && categoryId) {
      const category = categories.find(cat => cat.id === parseInt(categoryId));
      const categoryPrefix = category ? category.name.substring(0, 3).toUpperCase() : undefined;
      const generatedSku = generateProductSku(name, categoryPrefix);
      form.setValue('sku', generatedSku);
    }
  }, [form.watch('name'), form.watch('categoryId'), categories, form]);
  
  // Callback when form is submitted
  const onSubmit = (data: z.infer<typeof basicInfoSchema>) => {
    // Update all fields in the context
    updateField('name', data.name);
    updateField('slug', data.slug);
    updateField('sku', data.sku);
    updateField('brand', data.brand || null);
    updateField('description', data.description || null);
    updateField('categoryId', data.categoryId ? parseInt(data.categoryId) : null);
    
    if (data.categoryId) {
      const category = categories.find(cat => cat.id === parseInt(data.categoryId));
      updateField('categoryName', category?.name || null);
    }
    
    updateField('costPrice', data.costPrice);
    updateField('markupPercentage', data.markupPercentage);
    updateField('regularPrice', data.regularPrice);
    updateField('salePrice', data.salePrice || null);
    updateField('stockLevel', data.stockLevel);
    updateField('lowStockThreshold', data.lowStockThreshold);
    updateField('backorderEnabled', data.backorderEnabled);
    updateField('isActive', data.isActive);
    updateField('isDraft', data.isDraft);
    updateField('isFeatured', data.isFeatured);
    updateField('isNew', data.isNew);
    
    // Mark this step as completed
    if (validateStep(currentStep)) {
      markStepComplete(currentStep);
      goToStep('images');
    }
  };
  
  return (
    <div className="basic-info-step">
      <h2 className="text-2xl font-semibold mb-6">Basic Product Information</h2>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name of your product as it will appear to customers.
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
                    <FormLabel>SKU <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product SKU" {...field} />
                    </FormControl>
                    <FormDescription>
                      Unique identifier for inventory management. Auto-generated if left empty.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Slug */}
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Slug <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="url-friendly-product-name" {...field} />
                    </FormControl>
                    <FormDescription>
                      URL-friendly version of the product name. Auto-generated from product name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Brand */}
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter brand name" {...field} />
                    </FormControl>
                    <FormDescription>
                      The brand or manufacturer of the product.
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
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories && categories.map((category) => (
                          <SelectItem 
                            key={category.id} 
                            value={String(category.id)}
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the category this product belongs to.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter product description" 
                        className="min-h-[120px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Detailed description of the product.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="border-t pt-6 mt-6">
              <h3 className="text-xl font-semibold mb-4">Pricing & Inventory</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cost Price */}
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Price <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Your cost to acquire or manufacture the product.
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
                      <FormLabel>Markup % <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="1" 
                          placeholder="30" 
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Percentage markup over cost price.
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
                      <FormLabel>Regular Price <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Regular selling price (calculated from cost and markup).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Sale Price */}
                <FormField
                  control={form.control}
                  name="salePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale Price</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          placeholder="0.00" 
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                            field.onChange(typeof value === 'number' && isNaN(value) ? 0 : value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional discounted price (leave empty if not on sale).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Stock Level */}
                <FormField
                  control={form.control}
                  name="stockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Level</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="1" 
                          placeholder="0" 
                          {...field}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Current inventory quantity.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Low Stock Threshold */}
                <FormField
                  control={form.control}
                  name="lowStockThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Low Stock Threshold</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="1" 
                          placeholder="5" 
                          {...field}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Quantity at which to show "low stock" warning.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="mt-4 space-y-2">
                {/* Backorder Enabled */}
                <FormField
                  control={form.control}
                  name="backorderEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Allow Backorders</FormLabel>
                        <FormDescription>
                          Allow customers to order even when out of stock.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="border-t pt-6 mt-6">
              <h3 className="text-xl font-semibold mb-4">Product Status</h3>
              
              <div className="space-y-4">
                {/* Is Active */}
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Product is visible to customers.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                {/* Is Draft */}
                <FormField
                  control={form.control}
                  name="isDraft"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Draft</FormLabel>
                        <FormDescription>
                          Save as draft (not published yet).
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                {/* Is Featured */}
                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Featured</FormLabel>
                        <FormDescription>
                          Show in featured product sections.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                {/* Is New */}
                <FormField
                  control={form.control}
                  name="isNew"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>New</FormLabel>
                        <FormDescription>
                          Mark as a new product.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="border-t pt-6 mt-6">
              <Button type="submit" className="w-full md:w-auto">
                Continue to Images
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};

export default BasicInfoStep;