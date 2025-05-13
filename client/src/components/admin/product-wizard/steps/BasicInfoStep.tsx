/**
 * BasicInfoStep Component
 * 
 * This component handles the first step of the product wizard,
 * collecting basic product information including name, SKU, pricing, etc.
 */

import React, { useState, useEffect } from 'react';
import { useProductWizardContext } from '../context';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { generateSlug, generateSku } from '@/utils/string-utils';
import * as z from 'zod';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

// Form validation schema
const basicInfoSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().min(1, 'Slug is required'),
  sku: z.string().min(1, 'SKU is required'),
  brand: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.coerce.number().nullable(),
  costPrice: z.coerce.number().min(0, 'Cost price must be at least 0'),
  markupPercentage: z.coerce.number().min(0, 'Markup percentage must be at least 0'),
  regularPrice: z.coerce.number().min(0, 'Regular price must be at least 0'),
  salePrice: z.coerce.number().nullable().optional(),
  onSale: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

// Type for form values
type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;

// Standard markups for quick selection
const STANDARD_MARKUPS = [
  { label: '15%', value: 15 },
  { label: '20%', value: 20 },
  { label: '25%', value: 25 },
  { label: '30%', value: 30 },
  { label: '40%', value: 40 },
  { label: '50%', value: 50 },
  { label: '75%', value: 75 },
  { label: '100%', value: 100 },
];

export function BasicInfoStep() {
  const { state, updateField, markStepComplete, markStepInProgress } = useProductWizardContext();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isAutoSlugEnabled, setIsAutoSlugEnabled] = useState(true);
  const [isAutoSkuEnabled, setIsAutoSkuEnabled] = useState(true);
  const [isAutoPriceEnabled, setIsAutoPriceEnabled] = useState(true);
  
  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });
  
  // Initialize form with values from context
  const form = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: state.name,
      slug: state.slug,
      sku: state.sku,
      brand: state.brand,
      description: state.description,
      categoryId: state.categoryId,
      costPrice: state.costPrice,
      markupPercentage: state.markupPercentage,
      regularPrice: state.regularPrice,
      salePrice: state.salePrice,
      onSale: state.onSale,
      isActive: state.isActive,
      isFeatured: state.isFeatured,
    },
  });
  
  // Auto-generate slug when name changes
  useEffect(() => {
    if (isAutoSlugEnabled && form.watch('name')) {
      const generatedSlug = generateSlug(form.watch('name'));
      form.setValue('slug', generatedSlug);
    }
  }, [form.watch('name'), isAutoSlugEnabled, form]);
  
  // Auto-generate SKU when name changes
  useEffect(() => {
    if (isAutoSkuEnabled && form.watch('name')) {
      const generatedSku = generateSku(form.watch('name'));
      form.setValue('sku', generatedSku);
    }
  }, [form.watch('name'), isAutoSkuEnabled, form]);
  
  // Calculate regular price based on cost price and markup
  useEffect(() => {
    if (isAutoPriceEnabled) {
      const costPrice = parseFloat(form.watch('costPrice').toString()) || 0;
      const markupPercentage = parseFloat(form.watch('markupPercentage').toString()) || 0;
      
      // Calculate regular price
      const regularPrice = costPrice * (1 + markupPercentage / 100);
      form.setValue('regularPrice', parseFloat(regularPrice.toFixed(2)));
    }
  }, [form.watch('costPrice'), form.watch('markupPercentage'), isAutoPriceEnabled, form]);
  
  // Update sale price when regular price or onSale changes
  useEffect(() => {
    if (!form.watch('onSale')) {
      form.setValue('salePrice', null);
    }
  }, [form.watch('onSale'), form]);
  
  // Mark step as in progress when form values change
  useEffect(() => {
    markStepInProgress('basic-info');
  }, [
    form.watch('name'),
    form.watch('slug'),
    form.watch('sku'),
    form.watch('description'),
    form.watch('categoryId'),
    form.watch('costPrice'),
    form.watch('regularPrice'),
    form.watch('salePrice'),
    markStepInProgress
  ]);
  
  // Handle form submission
  const onSubmit = (values: BasicInfoFormValues) => {
    // Update context with form values
    Object.entries(values).forEach(([key, value]) => {
      updateField(key as keyof typeof state, value);
    });
    
    // Mark step as complete
    markStepComplete('basic-info');
    
    toast({
      title: 'Basic information saved',
      description: 'Continue to the next step to upload product images.',
    });
  };
  
  // Handle setting markup percentage
  const handleSetMarkup = (percentage: number) => {
    form.setValue('markupPercentage', percentage);
  };
  
  return (
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Product Information</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter the basic details of your product.
                    </p>
                    
                    <Separator />
                    
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter product name" {...field} />
                          </FormControl>
                          <FormDescription>
                            The name of your product as it will appear on your site
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>URL Slug</FormLabel>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-muted-foreground">Auto-generate</span>
                                <Switch
                                  checked={isAutoSlugEnabled}
                                  onCheckedChange={setIsAutoSlugEnabled}
                                  size="sm"
                                />
                              </div>
                            </div>
                            <FormControl>
                              <Input 
                                placeholder="product-url-slug" 
                                {...field}
                                readOnly={isAutoSlugEnabled}
                              />
                            </FormControl>
                            <FormDescription>
                              Used in product URLs for SEO
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>SKU</FormLabel>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-muted-foreground">Auto-generate</span>
                                <Switch
                                  checked={isAutoSkuEnabled}
                                  onCheckedChange={setIsAutoSkuEnabled}
                                  size="sm"
                                />
                              </div>
                            </div>
                            <FormControl>
                              <Input 
                                placeholder="PROD123" 
                                {...field}
                                readOnly={isAutoSkuEnabled}
                              />
                            </FormControl>
                            <FormDescription>
                              Stock Keeping Unit, unique product identifier
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand</FormLabel>
                          <FormControl>
                            <Input placeholder="Product brand or manufacturer" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormDescription>
                            The manufacturer or brand of the product
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {categories.map((category: any) => (
                                <SelectItem 
                                  key={category.id} 
                                  value={category.id.toString()}
                                >
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The category this product belongs to
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter product description" 
                              className="min-h-[120px]"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Detailed description of the product
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Product Status</h3>
                    <p className="text-sm text-muted-foreground">
                      Control the visibility and status of your product
                    </p>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Active Product
                              </FormLabel>
                              <FormDescription>
                                Product will be visible on your store
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
                      
                      <FormField
                        control={form.control}
                        name="isFeatured"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Featured Product
                              </FormLabel>
                              <FormDescription>
                                Highlight this product on your homepage
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="pricing" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Product Pricing</h3>
                    <p className="text-sm text-muted-foreground">
                      Set your cost price, markup, and selling prices
                    </p>
                    
                    <Separator />
                    
                    <FormField
                      control={form.control}
                      name="costPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost Price</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.01" 
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Your cost to acquire this product
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="markupPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Markup Percentage</FormLabel>
                            <div className="flex items-center space-x-2">
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.1" 
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(parseFloat(e.target.value) || 0);
                                  }}
                                />
                              </FormControl>
                              <span className="text-muted-foreground">%</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {STANDARD_MARKUPS.map((markup) => (
                                <Badge
                                  key={markup.value}
                                  variant={field.value === markup.value ? "default" : "outline"}
                                  className="cursor-pointer"
                                  onClick={() => handleSetMarkup(markup.value)}
                                >
                                  {markup.label}
                                </Badge>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex flex-col space-y-2 justify-end">
                        <div className="text-sm font-medium">Price Calculation</div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">Auto-calculate prices</span>
                          <Switch
                            checked={isAutoPriceEnabled}
                            onCheckedChange={setIsAutoPriceEnabled}
                            size="sm"
                          />
                        </div>
                        <div className="text-sm text-muted-foreground pt-1">
                          <p>Cost: {formatCurrency(form.watch('costPrice'))}</p>
                          <p>+ Markup: {form.watch('markupPercentage')}%</p>
                          <Separator className="my-2" />
                          <p className="font-medium">
                            = Price: {formatCurrency(form.watch('regularPrice'))}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="regularPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Regular Price</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.01" 
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0);
                              }}
                              readOnly={isAutoPriceEnabled}
                              className={isAutoPriceEnabled ? "bg-gray-50" : ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Regular selling price of the product
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="onSale"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              On Sale
                            </FormLabel>
                            <FormDescription>
                              Product is currently on sale
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
                    
                    {form.watch('onSale') && (
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
                                {...field}
                                value={field.value === null ? '' : field.value}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Discounted selling price
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <div className="flex justify-end">
              <Button type="submit" className="w-32">Save & Continue</Button>
            </div>
          </form>
        </Form>
      </Tabs>
    </div>
  );
}