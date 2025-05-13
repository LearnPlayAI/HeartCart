/**
 * AdditionalInfoStep Component
 * 
 * This component handles the third step of the product creation wizard,
 * collecting additional product information like inventory, attributes, shipping, etc.
 */

import React, { useState, useEffect } from 'react';
import { useProductWizardContext } from '../context';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { 
  PackageIcon, 
  TruckIcon, 
  TagIcon, 
  ChevronDownIcon, 
  ChevronRightIcon,
  PlusIcon,
  XIcon
} from 'lucide-react';

// Form validation schema
const additionalInfoSchema = z.object({
  // Inventory
  stockLevel: z.coerce.number().min(0, 'Stock level must be 0 or greater'),
  lowStockThreshold: z.coerce.number().min(0, 'Threshold must be 0 or greater'),
  backorderEnabled: z.boolean().default(false),
  
  // Shipping
  taxable: z.boolean().default(true),
  taxClass: z.string().optional(),
  shippingRequired: z.boolean().default(true),
  shippingWeight: z.coerce.number().min(0).nullable().optional(),
  shippingLength: z.coerce.number().min(0).nullable().optional(),
  shippingWidth: z.coerce.number().min(0).nullable().optional(),
  shippingHeight: z.coerce.number().min(0).nullable().optional(),
  
  // SEO
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
});

type AdditionalInfoFormValues = z.infer<typeof additionalInfoSchema>;

export function AdditionalInfoStep() {
  const { state, setField, markStepComplete, markStepValid, addAttribute, updateAttribute, removeAttribute } = useProductWizardContext();
  const [activeTab, setActiveTab] = useState('inventory');
  const [attributeNameInput, setAttributeNameInput] = useState('');
  const [attributeValueInput, setAttributeValueInput] = useState('');
  
  // Fetch attribute definitions
  const { data: attributeDefinitions = [] } = useQuery({
    queryKey: ['/api/attributes/definitions'],
  });
  
  // Initialize form with values from context
  const form = useForm<AdditionalInfoFormValues>({
    resolver: zodResolver(additionalInfoSchema),
    defaultValues: {
      // Inventory
      stockLevel: state.stockLevel,
      lowStockThreshold: state.lowStockThreshold,
      backorderEnabled: state.backorderEnabled,
      
      // Shipping
      taxable: state.taxable,
      taxClass: state.taxClass,
      shippingRequired: state.shippingRequired,
      shippingWeight: state.shippingWeight,
      shippingLength: state.shippingDimensions.length,
      shippingWidth: state.shippingDimensions.width,
      shippingHeight: state.shippingDimensions.height,
      
      // SEO
      metaTitle: state.metaTitle || state.name,
      metaDescription: state.metaDescription || state.description,
      metaKeywords: state.metaKeywords,
    },
  });
  
  // Handle form submission
  const onSubmit = (values: AdditionalInfoFormValues) => {
    // Update state with form values
    setField('stockLevel', values.stockLevel);
    setField('lowStockThreshold', values.lowStockThreshold);
    setField('backorderEnabled', values.backorderEnabled);
    
    setField('taxable', values.taxable);
    setField('taxClass', values.taxClass);
    setField('shippingRequired', values.shippingRequired);
    setField('shippingWeight', values.shippingWeight);
    setField('shippingDimensions', {
      length: values.shippingLength,
      width: values.shippingWidth,
      height: values.shippingHeight,
    });
    
    setField('metaTitle', values.metaTitle);
    setField('metaDescription', values.metaDescription);
    setField('metaKeywords', values.metaKeywords);
    
    // Mark step as complete and valid
    markStepComplete('additional-info');
    markStepValid('additional-info', true);
  };
  
  // Auto-save form values to context when they change
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (type === 'change') {
        onSubmit(form.getValues());
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onSubmit]);
  
  // Handle adding a custom attribute
  const handleAddAttribute = () => {
    if (!attributeNameInput.trim()) return;
    
    // Add attribute to state
    addAttribute({
      id: Date.now(), // Temporary ID for UI purposes
      name: attributeNameInput.trim(),
      value: attributeValueInput.trim(),
      isCustom: true,
    });
    
    // Clear inputs
    setAttributeNameInput('');
    setAttributeValueInput('');
  };
  
  // Handle updating an attribute value
  const handleAttributeValueChange = (index: number, value: string) => {
    const attribute = { ...state.attributes[index], value };
    updateAttribute(index, attribute);
  };
  
  // Handle removing an attribute
  const handleRemoveAttribute = (index: number) => {
    removeAttribute(index);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="inventory" className="flex items-center gap-1">
                <PackageIcon className="h-4 w-4" />
                <span>Inventory</span>
              </TabsTrigger>
              <TabsTrigger value="attributes" className="flex items-center gap-1">
                <TagIcon className="h-4 w-4" />
                <span>Attributes</span>
              </TabsTrigger>
              <TabsTrigger value="shipping" className="flex items-center gap-1">
                <TruckIcon className="h-4 w-4" />
                <span>Shipping & SEO</span>
              </TabsTrigger>
            </TabsList>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Inventory Tab */}
                <TabsContent value="inventory" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Current available quantity
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
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Trigger alerts when stock reaches this level
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Backorder Enabled */}
                  <FormField
                    control={form.control}
                    name="backorderEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Allow Backorders</FormLabel>
                          <FormDescription>
                            Customers can order even when out of stock
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
                </TabsContent>
                
                {/* Attributes Tab */}
                <TabsContent value="attributes" className="space-y-6">
                  {/* Custom Attributes */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Product Attributes</h3>
                    <p className="text-sm text-muted-foreground">
                      Add custom attributes to provide additional product details like size, color, material, etc.
                    </p>
                    
                    {/* Current Attributes */}
                    {state.attributes.length > 0 ? (
                      <div className="space-y-3">
                        {state.attributes.map((attr, index) => (
                          <div 
                            key={attr.id || index} 
                            className="flex items-center gap-2 border rounded-md p-3"
                          >
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <span className="text-sm font-semibold">{attr.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={attr.value || ''}
                                  onChange={(e) => handleAttributeValueChange(index, e.target.value)}
                                  placeholder="Enter value"
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground"
                                  onClick={() => handleRemoveAttribute(index)}
                                >
                                  <XIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-md bg-muted/20">
                        <TagIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">No attributes added yet</p>
                        <p className="text-sm text-muted-foreground">
                          Attributes help customers find and understand your product
                        </p>
                      </div>
                    )}
                    
                    {/* Add Attribute Form */}
                    <div className="border rounded-md p-4 space-y-4">
                      <h4 className="font-medium">Add Custom Attribute</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="attrName" className="text-sm font-medium">
                            Attribute Name
                          </label>
                          <input
                            id="attrName"
                            type="text"
                            value={attributeNameInput}
                            onChange={(e) => setAttributeNameInput(e.target.value)}
                            placeholder="e.g. Material, Color, Size"
                            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label htmlFor="attrValue" className="text-sm font-medium">
                            Attribute Value
                          </label>
                          <input
                            id="attrValue"
                            type="text"
                            value={attributeValueInput}
                            onChange={(e) => setAttributeValueInput(e.target.value)}
                            placeholder="e.g. Cotton, Red, XL"
                            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddAttribute}
                        disabled={!attributeNameInput.trim()}
                        size="sm"
                        className="mt-2"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        <span>Add Attribute</span>
                      </Button>
                    </div>
                    
                  </div>
                </TabsContent>
                
                {/* Shipping & SEO Tab */}
                <TabsContent value="shipping" className="space-y-6">
                  <Collapsible
                    defaultOpen
                    className="border rounded-md overflow-hidden"
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted transition-colors">
                      <div className="flex items-center">
                        <TruckIcon className="h-5 w-5 mr-2" />
                        <h3 className="font-medium">Shipping Information</h3>
                      </div>
                      <ChevronDownIcon className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 py-3 space-y-4">
                      {/* Shipping Required */}
                      <FormField
                        control={form.control}
                        name="shippingRequired"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Requires Shipping</FormLabel>
                              <FormDescription>
                                Turn off for digital/virtual products
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
                      
                      {form.watch('shippingRequired') && (
                        <>
                          {/* Shipping Weight */}
                          <FormField
                            control={form.control}
                            name="shippingWeight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Weight (kg)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...field}
                                    value={field.value === null ? '' : field.value}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                      field.onChange(val);
                                    }}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Product weight for shipping calculations
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Shipping Dimensions */}
                          <div className="grid grid-cols-3 gap-3">
                            <FormField
                              control={form.control}
                              name="shippingLength"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Length (cm)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      placeholder="0.0"
                                      {...field}
                                      value={field.value === null ? '' : field.value}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                        field.onChange(val);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="shippingWidth"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Width (cm)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      placeholder="0.0"
                                      {...field}
                                      value={field.value === null ? '' : field.value}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                        field.onChange(val);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="shippingHeight"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Height (cm)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      placeholder="0.0"
                                      {...field}
                                      value={field.value === null ? '' : field.value}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                        field.onChange(val);
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
                      
                      {/* Tax Info */}
                      <FormField
                        control={form.control}
                        name="taxable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Taxable</FormLabel>
                              <FormDescription>
                                Apply tax to this product
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
                      
                      {/* Tax Class (only if taxable) */}
                      {form.watch('taxable') && (
                        <FormField
                          control={form.control}
                          name="taxClass"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax Class</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Standard"
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormDescription>
                                Leave empty for standard tax rates
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                  
                  <Collapsible
                    defaultOpen
                    className="border rounded-md overflow-hidden"
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted transition-colors">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        <h3 className="font-medium">SEO Information</h3>
                      </div>
                      <ChevronDownIcon className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 py-3 space-y-4">
                      {/* Meta Title */}
                      <FormField
                        control={form.control}
                        name="metaTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Meta Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Product page title"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormDescription>
                              Leave empty to use product name
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Meta Description */}
                      <FormField
                        control={form.control}
                        name="metaDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Meta Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Brief product description for search engines"
                                className="min-h-20"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormDescription>
                              Leave empty to use product description
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Meta Keywords */}
                      <FormField
                        control={form.control}
                        name="metaKeywords"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Meta Keywords</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="keyword1, keyword2, keyword3"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormDescription>
                              Comma-separated list of keywords
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </TabsContent>
              </form>
            </Form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}