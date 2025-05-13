/**
 * AdditionalInfoStep Component
 * 
 * This component handles the third step of the product wizard,
 * collecting additional product information including attributes,
 * inventory settings, and shipping details.
 */

import React, { useState } from 'react';
import { useProductWizardContext } from '../context';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Plus } from 'lucide-react';

// Form validation schema
const additionalInfoSchema = z.object({
  // Inventory
  stockLevel: z.number().min(0, 'Stock level cannot be negative'),
  lowStockThreshold: z.number().min(0, 'Low stock threshold cannot be negative'),
  backorderEnabled: z.boolean().default(false),
  
  // SEO
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
  
  // Shipping
  taxable: z.boolean().default(true),
  taxClass: z.string().optional().nullable(),
  shippingRequired: z.boolean().default(true),
  shippingWeight: z.number().optional().nullable(),
  shippingDimensions: z.object({
    length: z.number().optional().nullable(),
    width: z.number().optional().nullable(),
    height: z.number().optional().nullable(),
  }),
});

type AdditionalInfoFormValues = z.infer<typeof additionalInfoSchema>;

// Attribute form validation schema
const attributeSchema = z.object({
  id: z.number(),
  value: z.union([z.string(), z.number()]).optional().nullable(),
});

type AttributeFormValues = z.infer<typeof attributeSchema>;

export function AdditionalInfoStep() {
  const { state, updateField, markStepComplete } = useProductWizardContext();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('inventory');
  
  // Fetch attributes
  const { data: attributes = [] } = useQuery({
    queryKey: ['/api/attributes'],
  });
  
  // Fetch tax classes
  const { data: taxClasses = [] } = useQuery({
    queryKey: ['/api/tax-classes'],
  });
  
  // Initialize form with values from context
  const form = useForm<AdditionalInfoFormValues>({
    resolver: zodResolver(additionalInfoSchema),
    defaultValues: {
      stockLevel: state.stockLevel,
      lowStockThreshold: state.lowStockThreshold,
      backorderEnabled: state.backorderEnabled,
      metaTitle: state.metaTitle,
      metaDescription: state.metaDescription,
      metaKeywords: state.metaKeywords,
      taxable: state.taxable,
      taxClass: state.taxClass,
      shippingRequired: state.shippingRequired,
      shippingWeight: state.shippingWeight,
      shippingDimensions: {
        length: state.shippingDimensions.length,
        width: state.shippingDimensions.width,
        height: state.shippingDimensions.height,
      },
    },
  });
  
  // Handle form submission
  const onSubmit = (values: AdditionalInfoFormValues) => {
    // Update main form values
    Object.entries(values).forEach(([key, value]) => {
      if (key !== 'shippingDimensions') {
        updateField(key as keyof typeof state, value);
      }
    });
    
    // Handle shipping dimensions separately
    updateField('shippingDimensions', values.shippingDimensions);
    
    // Mark step as complete
    markStepComplete('additional-info');
    
    toast({
      title: 'Additional information saved',
      description: 'Continue to the final step to review and save the product.',
    });
  };
  
  // Handle adding an attribute
  const addAttribute = (attributeId: number, attributeName: string) => {
    // Check if attribute already exists
    const attributeExists = state.attributes.some(attr => attr.id === attributeId);
    
    if (attributeExists) {
      toast({
        title: 'Attribute already added',
        description: 'This attribute is already in the list.',
        variant: 'warning',
      });
      return;
    }
    
    // Add the attribute
    const newAttribute = {
      id: attributeId,
      name: attributeName,
      value: null
    };
    
    updateField('attributes', [...state.attributes, newAttribute]);
    
    toast({
      title: 'Attribute added',
      description: `${attributeName} has been added to the product.`,
    });
  };
  
  // Handle removing an attribute
  const removeAttribute = (attributeId: number) => {
    const updatedAttributes = state.attributes.filter(attr => attr.id !== attributeId);
    updateField('attributes', updatedAttributes);
    
    toast({
      title: 'Attribute removed',
      description: 'Attribute has been removed from the product.',
    });
  };
  
  // Handle updating an attribute value
  const updateAttributeValue = (attributeId: number, value: string | number | null) => {
    const updatedAttributes = state.attributes.map(attr => {
      if (attr.id === attributeId) {
        return { ...attr, value };
      }
      return attr;
    });
    
    updateField('attributes', updatedAttributes);
  };
  
  return (
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="seo-shipping">SEO & Shipping</TabsTrigger>
        </TabsList>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <TabsContent value="inventory" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Inventory Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage stock levels and inventory options for this product.
                    </p>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              Current quantity in stock
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
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
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              Quantity at which to trigger low stock alerts
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="backorderEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Allow Backorders</FormLabel>
                            <FormDescription>
                              Allow customers to purchase this product when out of stock
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
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="attributes" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Product Attributes</h3>
                      <Select
                        onValueChange={(value) => {
                          const [id, name] = value.split('|');
                          addAttribute(parseInt(id), name);
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Add attribute" />
                        </SelectTrigger>
                        <SelectContent>
                          {attributes.map((attr: any) => (
                            <SelectItem 
                              key={attr.id} 
                              value={`${attr.id}|${attr.name}`}
                            >
                              {attr.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Add and configure product attributes like color, size, material, etc.
                    </p>
                    
                    <Separator />
                    
                    {state.attributes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No attributes added yet.</p>
                        <p className="text-sm mt-1">Use the dropdown above to add attributes.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {state.attributes.map((attribute) => (
                          <div 
                            key={attribute.id} 
                            className="flex items-start justify-between gap-4 border rounded-md p-4"
                          >
                            <div className="min-w-[160px]">
                              <h4 className="font-medium">{attribute.name}</h4>
                            </div>
                            <div className="flex-grow">
                              <Input 
                                placeholder={`Enter ${attribute.name.toLowerCase()} value`}
                                value={attribute.value as string || ''}
                                onChange={(e) => updateAttributeValue(attribute.id, e.target.value)}
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAttribute(attribute.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="seo-shipping" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">SEO Information</h3>
                    <p className="text-sm text-muted-foreground">
                      Optimize product visibility in search engines with SEO details.
                    </p>
                    
                    <Separator />
                    
                    <FormField
                      control={form.control}
                      name="metaTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meta Title</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Custom page title for search engines" 
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Recommended length: 50-60 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="metaDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meta Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Short description for search engines" 
                              className="resize-none"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Recommended length: 150-160 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="metaKeywords"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meta Keywords</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Comma-separated keywords" 
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Example: t-shirt, cotton, apparel
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
                    <h3 className="text-lg font-medium">Shipping & Tax</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure shipping and tax settings for this product.
                    </p>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="taxable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Taxable</FormLabel>
                              <FormDescription>
                                Apply taxes to this product
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
                        name="shippingRequired"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Physical Product</FormLabel>
                              <FormDescription>
                                Requires shipping
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
                    
                    {form.watch('taxable') && (
                      <FormField
                        control={form.control}
                        name="taxClass"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax Class</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ''}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select tax class" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="standard">Standard Rate</SelectItem>
                                <SelectItem value="reduced">Reduced Rate</SelectItem>
                                <SelectItem value="zero">Zero Rate</SelectItem>
                                {taxClasses.map((taxClass: any) => (
                                  <SelectItem key={taxClass.id} value={taxClass.code}>
                                    {taxClass.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Tax classification for this product
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {form.watch('shippingRequired') && (
                      <>
                        <FormField
                          control={form.control}
                          name="shippingWeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight (kg)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  min="0" 
                                  placeholder="0.00" 
                                  {...field}
                                  value={field.value === null ? '' : field.value}
                                  onChange={(e) => {
                                    const value = e.target.value === '' 
                                      ? null 
                                      : parseFloat(e.target.value);
                                    field.onChange(value);
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                Product weight in kilograms
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="shippingDimensions.length"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Length (cm)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.1" 
                                    min="0" 
                                    placeholder="0.0" 
                                    {...field}
                                    value={field.value === null ? '' : field.value}
                                    onChange={(e) => {
                                      const value = e.target.value === '' 
                                        ? null 
                                        : parseFloat(e.target.value);
                                      field.onChange(value);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="shippingDimensions.width"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Width (cm)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.1" 
                                    min="0" 
                                    placeholder="0.0" 
                                    {...field}
                                    value={field.value === null ? '' : field.value}
                                    onChange={(e) => {
                                      const value = e.target.value === '' 
                                        ? null 
                                        : parseFloat(e.target.value);
                                      field.onChange(value);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="shippingDimensions.height"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Height (cm)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.1" 
                                    min="0" 
                                    placeholder="0.0" 
                                    {...field}
                                    value={field.value === null ? '' : field.value}
                                    onChange={(e) => {
                                      const value = e.target.value === '' 
                                        ? null 
                                        : parseFloat(e.target.value);
                                      field.onChange(value);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
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