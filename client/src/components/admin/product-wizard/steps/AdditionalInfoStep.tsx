/**
 * AdditionalInfoStep Component
 * 
 * This component handles the third step of the product creation wizard,
 * collecting additional product information like inventory, attributes, SEO, etc.
 * 
 * Updated to work with the centralized attribute system.
 */

import React, { useState, useEffect } from 'react';
import { useProductWizardContext } from '../context';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  PackageIcon, 
  TagIcon, 
  ChevronDownIcon, 
  ChevronRightIcon,
  PlusIcon,
  XIcon,
  InfoIcon,
  SearchIcon,
  GlobeIcon
} from 'lucide-react';

// Import our attribute configuration component
import { 
  AttributeConfig, 
  type AttributeValue, 
  type ProductAttribute,
  type AttributeOption
} from '../components/AttributeConfig';
import { useToast } from '@/hooks/use-toast';

// Form validation schema
const additionalInfoSchema = z.object({
  // Inventory
  stockLevel: z.coerce.number().min(0, 'Stock level must be 0 or greater'),
  lowStockThreshold: z.coerce.number().min(0, 'Threshold must be 0 or greater'),
  backorderEnabled: z.boolean().default(false),
  
  // Tax settings
  taxable: z.boolean().default(true),
  taxClass: z.string().optional(),
  
  // Product details
  supplier: z.string().optional(),
  attributeValues: z.array(z.any()).optional(), // For attribute metadata like weight, dimensions
  weight: z.coerce.number().min(0).nullable().optional(),
  dimensions: z.string().optional(),
  
  // SEO
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
});

type AdditionalInfoFormValues = z.infer<typeof additionalInfoSchema>;

export function AdditionalInfoStep() {
  const { 
    state, 
    setField, 
    markStepComplete, 
    markStepValid, 
    addAttribute, 
    updateAttribute, 
    removeAttribute,
    nextStep,
    prevStep,
    toggleAttribute,
    updateAttributeOptions,
    updateAttributeTextValue
  } = useProductWizardContext();
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingOptions, setIsFetchingOptions] = useState(false);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('inventory');
  const [attributeNameInput, setAttributeNameInput] = useState('');
  const [attributeValueInput, setAttributeValueInput] = useState('');
  const [attributesUsed, setAttributesUsed] = useState<number[]>([]);
  const [newCustomAttrName, setNewCustomAttrName] = useState('');
  const [newCustomAttrValue, setNewCustomAttrValue] = useState('');
  const [newCustomAttrType, setNewCustomAttrType] = useState('text');
  const [newCustomAttrRequired, setNewCustomAttrRequired] = useState(false);
  const [customAttributes, setCustomAttributes] = useState<{
    name: string, 
    value: string, 
    type: string,
    required: boolean
  }[]>([]);
  const [, navigate] = useLocation();
  
  // Fetch global attributes only once when the component mounts
  const { data: globalAttributesData } = useQuery({
    queryKey: ['/api/attributes'],
    queryFn: async () => {
      try {
        // Direct API call with fetch to avoid any potential issues with wrapper
        console.log('Fetching global attributes directly');
        const response = await fetch('/api/attributes');
        if (!response.ok) {
          throw new Error(`Failed to fetch attributes: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Global attributes direct fetch response:', data);
        return data;
      } catch (err) {
        console.error('Error fetching global attributes:', err);
        throw err;
      }
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity // Keep the data cached and never consider it stale
  });
  
  // Format global attributes for our component
  const attributeDefinitions = React.useMemo(() => {
    if (globalAttributesData?.data) {
      return globalAttributesData.data;
    }
    return [];
  }, [globalAttributesData]);
  
  // Fetch suppliers list
  const { data: suppliers = [] } = useQuery({
    queryKey: ['/api/suppliers'],
  });
  
  // Fetch catalog supplier information if we have a catalogId
  const { data: catalogData } = useQuery({
    queryKey: ['/api/catalogs', state.catalogId],
    enabled: !!state.catalogId, // Only run query if catalogId exists
  });
  
  // Format product attributes from global attributes
  const productAttributes = React.useMemo(() => {
    if (globalAttributesData?.data) {
      return globalAttributesData.data;
    }
    return [];
  }, [globalAttributesData]);
  
  // Format attributes for our attribute configuration component
  const [formattedAttributes, setFormattedAttributes] = useState<ProductAttribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<AttributeValue[]>([]);
  
  // Auto-populate supplier information from catalog when available
  useEffect(() => {
    if (catalogData?.data && state.catalogId) {
      const catalog = catalogData.data;
      if (catalog.supplierId && catalog.supplierName) {
        // Update the supplier in the state
        setField('supplier', catalog.supplierName);
        // Reset form with new supplier value
        form.setValue('supplier', catalog.supplierName);
      }
    }
  }, [catalogData, state.catalogId, setField]);
  
  // Initialize attribute values from the state
  useEffect(() => {
    // If we have attribute values in the state, use those
    if (state.attributeValues && state.attributeValues.length > 0) {
      setAttributeValues(state.attributeValues);
    }
  }, [state.attributeValues]);
  
  // Initialize attributesUsed from existing product data when editing
  useEffect(() => {
    if (state.attributes && state.attributes.length > 0) {
      // Get the attribute IDs that aren't custom attributes
      const usedAttributeIds = state.attributes
        .filter(attr => !attr.isCustom)
        .map(attr => attr.id);
      
      setAttributesUsed(usedAttributeIds);
      
      // Also initialize custom attributes if any
      const customAttrs = state.attributes
        .filter(attr => attr.isCustom)
        .map(attr => ({
          name: attr.name,
          value: attr.textValue || '', // Use textValue for centralized system
          type: attr.attributeType || 'text',
          required: attr.isRequired || false
        }));
      
      if (customAttrs.length > 0) {
        setCustomAttributes(customAttrs);
      }
    }
  }, [state.attributes]);

  // Format available product attributes for our attribute configuration component
  // Using the centralized attribute system
  useEffect(() => {
    if (globalAttributesData?.data && globalAttributesData.data.length > 0) {
      // Convert global attributes to the format expected by AttributeConfig
      // This takes Attribute objects from our centralized system and formats them
      const formatted = globalAttributesData.data.map(attr => ({
        id: attr.id,
        name: attr.name,
        type: attr.attributeType || 'select',
        isRequired: attr.isRequired || false,
        displayInProductSummary: attr.displayInProductSummary || false,
        isFilterable: attr.isFilterable || false,
        isSwatch: attr.isSwatch || false,
        options: attr.options?.map(opt => ({
          id: opt.id,
          value: opt.value,
          displayValue: opt.displayValue || opt.value,
          metadata: opt.metadata || {}
        })) || []
      }));
      
      setFormattedAttributes(formatted);
      
      // Initialize attribute values if not already set
      if (attributeValues.length === 0 && formatted.length > 0) {
        const values: AttributeValue[] = [];
        
        // Create initial attribute values from all options
        formatted.forEach(attr => {
          attr.options.forEach(opt => {
            values.push({
              id: `${attr.id}-${opt.id}`,
              attributeId: attr.id,
              attributeName: attr.name,
              value: opt.value,
              displayValue: opt.displayValue,
              isRequired: attr.isRequired,
              sortOrder: 0,
              metadata: opt.metadata || {}
            });
          });
        });
        
        setAttributeValues(values);
      }
    }
  }, [globalAttributesData, attributeValues.length]);
  
  // Initialize attributesUsed from product's attributes when component loads
  useEffect(() => {
    if (state.attributes && state.attributes.length > 0) {
      // Extract attribute IDs from state attributes and update attributesUsed
      const usedAttributeIds = state.attributes
        .filter(attr => !attr.isCustom)
        .map(attr => attr.id);
      setAttributesUsed(usedAttributeIds);
      console.log('Initializing attributesUsed from state:', usedAttributeIds);
    }
  }, [state.attributes]);

  // Handle attribute values changes from pricing component
  const handleAttributeValuesChange = (newValues: AttributeValue[]) => {
    console.log('AdditionalInfoStep: Attribute values changed:', newValues);
    
    // Store these values in local state for the current step session
    setAttributeValues(newValues);
    
    // Update the form value without updating the context immediately
    form.setValue('attributeValues', newValues);
    
    // Extract required attribute information
    const requiredAttributeIds = newValues
      .filter(val => val.isRequired)
      .map(val => val.attributeId);
    
    // Update local state for formatted attributes 
    const updatedAttributes = formattedAttributes.map(attr => ({
      ...attr,
      isRequired: requiredAttributeIds.includes(attr.id)
    }));
    
    // Only update formatted attributes in local state
    setFormattedAttributes(updatedAttributes);
    
    // Extract size-based metadata like weight and dimensions
    const sizeAttribute = newValues.find(attr => 
      attr.attributeName.toLowerCase().includes('size'));
    
    if (sizeAttribute?.metadata) {
      // Update weight if provided in the metadata
      if (sizeAttribute.metadata.weight !== undefined) {
        form.setValue('weight', sizeAttribute.metadata.weight);
      }
      
      // Update dimensions if provided in the metadata
      if (sizeAttribute.metadata.dimensions) {
        form.setValue('dimensions', sizeAttribute.metadata.dimensions);
      }
    }
  };
  
  // Initialize form with values from context
  const form = useForm<AdditionalInfoFormValues>({
    resolver: zodResolver(additionalInfoSchema),
    defaultValues: {
      // Inventory
      stockLevel: state.stockLevel || 0,
      lowStockThreshold: state.lowStockThreshold || 5,
      backorderEnabled: state.backorderEnabled || false,
      
      // Tax settings
      taxable: state.taxable ?? true,
      taxClass: state.taxClass || 'standard',
      
      // Product details
      supplier: state.supplier || '',
      attributeValues: state.attributeValues || [],
      weight: state.weight || null,
      dimensions: state.dimensions || '',
      
      // SEO
      metaTitle: state.metaTitle || state.name || '',
      metaDescription: state.metaDescription || state.description || '',
      metaKeywords: state.metaKeywords || '',
    },
  });
  
  // Save button state
  const [isSaving, setIsSaving] = useState(false);
  
  // Update form when editing product data is loaded
  useEffect(() => {
    if (state.productId) {
      console.log('AdditionalInfoStep: Updating form with state values for editing:', state);
      
      // Inventory
      form.setValue('stockLevel', state.stockLevel || 0);
      form.setValue('lowStockThreshold', state.lowStockThreshold || 5);
      form.setValue('backorderEnabled', state.backorderEnabled || false);
      
      // Tax settings
      form.setValue('taxable', state.taxable || true);
      form.setValue('taxClass', state.taxClass || '');
      
      // Product details
      form.setValue('supplier', state.supplier || '');
      form.setValue('weight', state.weight || null);
      form.setValue('dimensions', state.dimensions || '');
      
      // SEO
      form.setValue('metaTitle', state.metaTitle || state.name || '');
      form.setValue('metaDescription', state.metaDescription || state.description || '');
      form.setValue('metaKeywords', state.metaKeywords || '');
    }
  }, [state.productId, form, state]);
  
  // Handle form submission
  const onSubmit = async (values: AdditionalInfoFormValues) => {
    setIsSaving(true);
    try {
      // Update state with form values
      setField('stockLevel', values.stockLevel);
      setField('lowStockThreshold', values.lowStockThreshold);
      setField('backorderEnabled', values.backorderEnabled);
      
      setField('taxable', values.taxable);
      setField('taxClass', values.taxClass);
      
      // Product details
      setField('supplier', values.supplier);
      setField('weight', values.weight);
      setField('dimensions', values.dimensions);
      
      // SEO fields
      setField('metaTitle', values.metaTitle);
      setField('metaDescription', values.metaDescription);
      setField('metaKeywords', values.metaKeywords);
      
      // Mark step as complete and valid
      markStepComplete('additional-info');
      markStepValid('additional-info', true);
      
      // If this is an edit operation, save the data to the server
      if (state.productId) {
        try {
          // Send a PATCH request to save the current data
          const response = await fetch(`/api/products/${state.productId}/wizard-step`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              step: 'additional-info',
              data: {
                stockLevel: values.stockLevel,
                lowStockThreshold: values.lowStockThreshold,
                backorderEnabled: values.backorderEnabled,
                taxable: values.taxable,
                taxClass: values.taxClass,
                supplier: values.supplier,
                weight: values.weight,
                dimensions: values.dimensions,
                metaTitle: values.metaTitle,
                metaDescription: values.metaDescription,
                metaKeywords: values.metaKeywords,
                attributes: state.attributes
              }
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to save data');
          }
          
          toast({
            title: "Step saved",
            description: "Step data saved to the database",
          });
        } catch (error) {
          console.error('Error saving step data:', error);
          toast({
            title: "Error saving step",
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  // Only save when the component unmounts or the user clicks next
  useEffect(() => {
    return () => {
      // Save all form values to context when the component unmounts
      const values = form.getValues();
      onSubmit(values);
    };
  }, [form, onSubmit]);
  
  // Handle updating an attribute value
  const handleAttributeValueChange = (index: number, value: string) => {
    const attribute = { ...state.attributes[index], textValue: value };
    updateAttribute(index, attribute);
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
              <TabsTrigger value="seo" className="flex items-center gap-1">
                <GlobeIcon className="h-4 w-4" />
                <span>SEO</span>
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
                            Trigger alerts when stock falls below this level
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {/* Backorder Option */}
                    <FormField
                      control={form.control}
                      name="backorderEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Allow Backorders</FormLabel>
                            <FormDescription>
                              Allow customers to purchase products that are out of stock
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
                  
                  {/* Supplier Info */}
                  <div className="space-y-4 pt-4 border-t mt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">Supplier Information</h3>
                        <p className="text-sm text-muted-foreground">
                          This information is for internal reference only
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                      <FormField
                        control={form.control}
                        name="supplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplier</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                readOnly={!!state.catalogId} // Make read-only if populated from catalog
                                className={state.catalogId ? 'bg-muted cursor-not-allowed' : ''}
                              />
                            </FormControl>
                            <FormDescription>
                              {state.catalogId 
                                ? 'Supplier automatically set from selected catalog' 
                                : 'Enter the supplier name for this product'}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Tax Settings */}
                  <div className="space-y-4 pt-4 border-t mt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">Tax Settings</h3>
                        <p className="text-sm text-muted-foreground">
                          Configure taxation for this product
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                      <FormField
                        control={form.control}
                        name="taxable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Taxable Product</FormLabel>
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
                      
                      {form.watch('taxable') && (
                        <FormField
                          control={form.control}
                          name="taxClass"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax Class</FormLabel>
                              <FormControl>
                                <select 
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  {...field}
                                >
                                  <option value="standard">Standard Rate</option>
                                  <option value="reduced">Reduced Rate</option>
                                  <option value="zero">Zero Rate</option>
                                </select>
                              </FormControl>
                              <FormDescription>
                                Select the appropriate tax class for this product
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                {/* Attributes Tab */}
                <TabsContent value="attributes" className="space-y-6">
                  {/* Product Attribute Configuration */}
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">Product Attributes</h3>
                        <p className="text-sm text-muted-foreground">
                          Select which attributes customers will see when viewing or purchasing this product
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/admin/global-attributes')}
                      >
                        Manage Global Attributes
                      </Button>
                    </div>
                    
                    {formattedAttributes.length > 0 ? (
                      <div className="space-y-6">
                        {/* Section to select which attributes apply to this product */}
                        <div className="space-y-4">
                          <p className="text-sm font-medium">
                            Select which attributes are available for this product. These determine the options customers need to select.
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {formattedAttributes.map((attr) => (
                              <div 
                                key={attr.id} 
                                className={`border rounded-md p-4 shadow-sm ${attributesUsed.includes(attr.id) ? 'border-primary/30 bg-primary/5' : ''}`}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium">{attr.name}</span>
                                  <Switch 
                                    checked={attributesUsed.includes(attr.id)}
                                    onCheckedChange={(checked) => {
                                      console.log(`Toggle attribute ${attr.name} (ID: ${attr.id}) to: ${checked}`);
                                      
                                      if (checked) {
                                        // Update local state
                                        setAttributesUsed(prev => [...prev, attr.id]);
                                        
                                        // Add to product's attributes in context
                                        // Using the centralized attribute system format
                                        addAttribute({
                                          id: attr.id,
                                          name: attr.name,
                                          isCustom: false,
                                          isRequired: attr.isRequired || false,
                                          attributeType: attr.type || 'select',
                                          displayInProductSummary: attr.displayInProductSummary || false,
                                          selectedOptions: [], // Will be populated during checkout
                                          // Empty textValue since this will be populated by customer
                                          textValue: "",
                                          sortOrder: 0
                                        });
                                        
                                        console.log(`Added attribute ${attr.name} to product attributes`);
                                      } else {
                                        // Update local state
                                        setAttributesUsed(prev => prev.filter(id => id !== attr.id));
                                        
                                        // Find and remove from product's attributes in context
                                        const index = state.attributes.findIndex(a => a.id === attr.id);
                                        if (index !== -1) {
                                          removeAttribute(index);
                                          console.log(`Removed attribute ${attr.name} from product attributes at index ${index}`);
                                        } else {
                                          console.warn(`Could not find attribute ${attr.name} in product attributes to remove`);
                                        }
                                      }
                                    }}
                                  />
                                </div>
                                
                                {/* Attribute type and options count */}
                                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-2">
                                  <Badge variant="secondary" className="text-xs">
                                    Type: {attr.type || 'select'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {attr.options.length} options
                                  </Badge>
                                </div>
                                
                                {/* Display checkbox for requiring the attribute */}
                                {attributesUsed.includes(attr.id) && (
                                  <div className="mt-3 border-t pt-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center">
                                        <Checkbox 
                                          id={`required-${attr.id}`}
                                          checked={(() => {
                                            const existingAttr = state.attributes.find(a => a.id === attr.id);
                                            return existingAttr?.isRequired || false;
                                          })()}
                                          onCheckedChange={(checked) => {
                                            // Find the attribute in the state
                                            const attrIndex = state.attributes.findIndex(a => a.id === attr.id);
                                            if (attrIndex !== -1) {
                                              // Update the attribute
                                              const updatedAttr = {
                                                ...state.attributes[attrIndex],
                                                isRequired: !!checked
                                              };
                                              updateAttribute(attrIndex, updatedAttr);
                                            }
                                          }}
                                        />
                                        <label htmlFor={`required-${attr.id}`} className="ml-2 text-sm">
                                          Required for checkout
                                        </label>
                                      </div>
                                      
                                      <div className="flex items-center">
                                        <Checkbox 
                                          id={`display-${attr.id}`}
                                          checked={(() => {
                                            const existingAttr = state.attributes.find(a => a.id === attr.id);
                                            return existingAttr?.displayInProductSummary || false;
                                          })()}
                                          onCheckedChange={(checked) => {
                                            // Find the attribute in the state
                                            const attrIndex = state.attributes.findIndex(a => a.id === attr.id);
                                            if (attrIndex !== -1) {
                                              // Update the attribute
                                              const updatedAttr = {
                                                ...state.attributes[attrIndex],
                                                displayInProductSummary: !!checked
                                              };
                                              updateAttribute(attrIndex, updatedAttr);
                                            }
                                          }}
                                        />
                                        <label htmlFor={`display-${attr.id}`} className="ml-2 text-sm">
                                          Show in product summary
                                        </label>
                                      </div>
                                    </div>
                                    
                                    {/* Display available options */}
                                    <div className="mt-3">
                                      <span className="text-sm font-medium mb-1 block">Available options:</span>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {attr.options.map(option => (
                                          <Badge 
                                            key={option.id} 
                                            variant="outline"
                                            className="px-3 py-1 text-xs"
                                          >
                                            {option.displayValue}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Attribute configuration for dimensions and weight */}
                        {attributesUsed.length > 0 && (
                          <div className="mt-6 pt-6 border-t">
                            <h4 className="font-medium">Attribute Configuration</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                              Configure additional information for attributes when applicable
                            </p>
                            
                            <AttributeConfig
                              attributes={formattedAttributes.filter(attr => attributesUsed.includes(attr.id))}
                              attributeValues={attributeValues}
                              onChange={handleAttributeValuesChange}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-md bg-muted/20">
                        <InfoIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">No product attributes available</p>
                        <p className="text-sm text-muted-foreground">
                          Click "Manage Global Attributes" to add attributes to the system
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Custom Attributes Section */}
                  <div className="space-y-4 pt-6 border-t mt-8">
                    <div>
                      <h3 className="text-lg font-medium">Custom Product Attributes</h3>
                      <p className="text-sm text-muted-foreground">
                        Add one-time custom attributes for this product only
                      </p>
                    </div>
                    
                    {customAttributes.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic mb-2">No custom attributes added yet</p>
                    ) : (
                      <div className="space-y-3 mb-4">
                        {customAttributes.map((attr, index) => (
                          <div 
                            key={index} 
                            className="flex items-center gap-2 border rounded-md p-3"
                          >
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <span className="text-sm font-semibold">{attr.name}</span>
                                <div className="flex items-center mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {attr.type || 'text'}
                                  </Badge>
                                  {attr.required && (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type={attr.type === 'number' ? 'number' : 'text'}
                                  value={attr.value}
                                  onChange={(e) => {
                                    const updatedAttrs = [...customAttributes];
                                    updatedAttrs[index] = { ...attr, value: e.target.value };
                                    setCustomAttributes(updatedAttrs);
                                    
                                    // Also update in context
                                    const attrIndex = state.attributes.findIndex(a => 
                                      a.isCustom && a.name === attr.name
                                    );
                                    
                                    if (attrIndex !== -1) {
                                      const updatedAttr = {
                                        ...state.attributes[attrIndex],
                                        textValue: e.target.value
                                      };
                                      updateAttribute(attrIndex, updatedAttr);
                                    }
                                  }}
                                  placeholder="Enter value"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Remove custom attribute from array
                                    const updatedAttrs = [...customAttributes];
                                    updatedAttrs.splice(index, 1);
                                    setCustomAttributes(updatedAttrs);
                                    
                                    // Also find and remove from product attributes in context if it exists
                                    const attrIndex = state.attributes.findIndex(a => 
                                      a.isCustom && a.name === attr.name
                                    );
                                    
                                    if (attrIndex !== -1) {
                                      removeAttribute(attrIndex);
                                    }
                                  }}
                                >
                                  <XIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="border rounded-md p-4">
                      <h5 className="font-medium mb-3">Add New Custom Attribute</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Attribute Name</label>
                          <Input
                            type="text"
                            value={newCustomAttrName}
                            onChange={(e) => setNewCustomAttrName(e.target.value)}
                            placeholder="e.g. Material, Pattern, etc."
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Attribute Value</label>
                          <Input
                            type="text"
                            value={newCustomAttrValue}
                            onChange={(e) => setNewCustomAttrValue(e.target.value)}
                            placeholder="e.g. Cotton, Striped, etc."
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center mb-3">
                        <div className="flex items-center mr-4">
                          <input
                            id="attr-type-text"
                            type="radio"
                            checked={newCustomAttrType === 'text'}
                            onChange={() => setNewCustomAttrType('text')}
                            className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                          />
                          <label htmlFor="attr-type-text" className="ml-2 text-sm">Text</label>
                        </div>
                        <div className="flex items-center mr-4">
                          <input
                            id="attr-type-number"
                            type="radio"
                            checked={newCustomAttrType === 'number'}
                            onChange={() => setNewCustomAttrType('number')}
                            className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                          />
                          <label htmlFor="attr-type-number" className="ml-2 text-sm">Number</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="attr-required"
                            type="checkbox"
                            checked={newCustomAttrRequired}
                            onChange={(e) => setNewCustomAttrRequired(e.target.checked)}
                            className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <label htmlFor="attr-required" className="ml-2 text-sm">Required</label>
                        </div>
                      </div>
                      
                      <Button
                        type="button"
                        onClick={() => {
                          if (!newCustomAttrName.trim()) {
                            toast({
                              title: "Attribute name is required",
                              description: "Please enter a name for the custom attribute",
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          // Add to local state
                          const newAttr = {
                            name: newCustomAttrName.trim(),
                            value: newCustomAttrValue.trim(),
                            type: newCustomAttrType,
                            required: newCustomAttrRequired
                          };
                          
                          setCustomAttributes(prev => [...prev, newAttr]);
                          
                          // Add to product attributes in context
                          // Using centralized attribute system structure
                          addAttribute({
                            id: -Date.now(), // Use negative timestamp as temporary ID for custom attrs
                            name: newCustomAttrName.trim(),
                            isCustom: true,
                            attributeType: newCustomAttrType,
                            isRequired: newCustomAttrRequired,
                            displayInProductSummary: true,
                            // Store the value directly in textValue
                            textValue: newCustomAttrValue.trim(),
                            selectedOptions: [],
                            sortOrder: 0
                          });
                          
                          // Reset inputs
                          setNewCustomAttrName('');
                          setNewCustomAttrValue('');
                          setNewCustomAttrType('text');
                          setNewCustomAttrRequired(false);
                        }}
                      >
                        Add Custom Attribute
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                {/* SEO Tab */}
                <TabsContent value="seo" className="space-y-6">
                  
                  {/* Product Details Section */}
                  <Collapsible
                    defaultOpen
                    className="border rounded-md overflow-hidden"
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted/30">
                      <h3 className="text-lg font-medium">Search Engine Optimization</h3>
                      <ChevronDownIcon className="h-5 w-5" />
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="p-4 pt-2 space-y-6">
                      <p className="text-sm text-muted-foreground">
                        Optimize your product for search engines to improve visibility
                      </p>
                      
                      <div className="grid grid-cols-1 gap-6">
                        <FormField
                          control={form.control}
                          name="metaTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Meta Title</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Product title for search engines"
                                />
                              </FormControl>
                              <FormDescription>
                                The title that appears in search engine results (defaults to product name)
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
                                  {...field}
                                  placeholder="Brief description for search engines"
                                  rows={3}
                                />
                              </FormControl>
                              <FormDescription>
                                A short description that appears in search results (defaults to product description)
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
                                  {...field}
                                  placeholder="keyword1, keyword2, keyword3"
                                />
                              </FormControl>
                              <FormDescription>
                                Comma-separated keywords relevant to this product
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Weight and Dimensions - moved here from Shipping tab */}
                  <Collapsible
                    defaultOpen
                    className="border rounded-md overflow-hidden"
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted/30">
                      <h3 className="text-lg font-medium">Weight & Dimensions</h3>
                      <ChevronDownIcon className="h-5 w-5" />
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="p-4 pt-2 space-y-6">
                      <p className="text-sm text-muted-foreground">
                        Provide physical characteristics of the product
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight (kg)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...field}
                                  value={field.value === null ? '' : field.value}
                                  onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormDescription>
                                Product weight in kilograms
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="dimensions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dimensions</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="L x W x H cm"
                                />
                              </FormControl>
                              <FormDescription>
                                Product dimensions in centimeters (e.g., 10 x 5 x 2 cm)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </TabsContent>
                
                {/* Navigation and Save buttons */}
                <div className="flex justify-between mt-8 px-2 pb-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => prevStep()}
                    disabled={isLoading || isSaving}
                  >
                    Back
                  </Button>
                  
                  <div className="flex space-x-3">
                    <Button 
                      type="button" 
                      variant="secondary"
                      onClick={form.handleSubmit(onSubmit)}
                      disabled={isLoading || isFetchingOptions || isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="default" 
                      onClick={() => {
                        form.handleSubmit(onSubmit)();
                        if (!form.formState.isValid) return;
                        nextStep();
                      }}
                      disabled={isLoading || isFetchingOptions || isSaving}
                    >
                      {isLoading ? 'Loading...' : 'Next'}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}