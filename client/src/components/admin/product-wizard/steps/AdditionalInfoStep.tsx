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
import { Badge } from '@/components/ui/badge';
import { 
  PackageIcon, 
  TruckIcon, 
  TagIcon, 
  ChevronDownIcon, 
  ChevronRightIcon,
  PlusIcon,
  XIcon,
  InfoIcon
} from 'lucide-react';

// Import our attribute configuration component
import { 
  AttributeConfig, 
  type AttributeValue, 
  type ProductAttribute,
  type AttributeOption
} from '../components/AttributeConfig';

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
  const { state, setField, markStepComplete, markStepValid, addAttribute, updateAttribute, removeAttribute } = useProductWizardContext();
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
  
  // Fetch global attributes (always refetch to ensure we have latest data)
  const { data: globalAttributesData, refetch: refetchAttributes } = useQuery({
    queryKey: ['/api/attributes'],
    refetchOnMount: true,
    staleTime: 0 // Consider data stale immediately
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
  
  // Effect to refetch attributes when the active tab changes to 'attributes'
  useEffect(() => {
    if (activeTab === 'attributes') {
      // Force refetch of attributes data when on attributes tab
      refetchAttributes();
    }
  }, [activeTab, refetchAttributes]);
  
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
          value: attr.value || '',
          type: attr.type || 'text',
          required: attr.required || false
        }));
      
      if (customAttrs.length > 0) {
        setCustomAttributes(customAttrs);
      }
    }
  }, [state.attributes]);

  // Format available product attributes for our attribute configuration component
  useEffect(() => {
    if (globalAttributesData?.data && globalAttributesData.data.length > 0) {
      // Convert global attributes to the format expected by AttributePricingConfig
      const formatted = globalAttributesData.data.map(attr => ({
        id: attr.id,
        name: attr.name,
        type: attr.attributeType || 'select',
        isRequired: attr.isRequired || false,
        options: attr.options?.map(opt => ({
          id: opt.id,
          value: opt.value,
          displayValue: opt.displayValue || opt.value
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
              metadata: {}
            });
          });
        });
        
        setAttributeValues(values);
      }
    }
  }, [globalAttributesData, attributeValues.length]);
  
  // Handle attribute values changes from pricing component
  const handleAttributeValuesChange = (newValues: AttributeValue[]) => {
    console.log('AdditionalInfoStep: Attribute values changed:', newValues);
    
    // Store these values immediately in state
    setAttributeValues(newValues);
    
    // Ensure immediate update to form and context
    setTimeout(() => {
      console.log('Saving attribute values to form and context:', newValues);
      form.setValue('attributeValues', newValues);
      setField('attributeValues', newValues);
      
      // Update attributes in context as well to ensure toggles persist
      const requiredAttributeIds = newValues
        .filter(val => val.isRequired)
        .map(val => val.attributeId);
      
      console.log('Required attribute IDs:', requiredAttributeIds);
      
      // Map through all attributes and update their isRequired property
      const updatedAttributes = formattedAttributes.map(attr => ({
        ...attr,
        isRequired: requiredAttributeIds.includes(attr.id)
      }));
      
      // Update attributes in context if they're different from current
      if (JSON.stringify(updatedAttributes) !== JSON.stringify(state.attributes)) {
        console.log('Updating attributes in context:', updatedAttributes);
        setField('attributes', updatedAttributes);
      }
      
      // Extract size-based metadata like weight and dimensions
      const sizeAttribute = newValues.find(attr => 
        attr.attributeName.toLowerCase().includes('size'));
      
      if (sizeAttribute?.metadata) {
        // Update weight if provided in the metadata
        if (sizeAttribute.metadata.weight !== undefined) {
          form.setValue('weight', sizeAttribute.metadata.weight);
          setField('weight', sizeAttribute.metadata.weight);
        }
        
        // Update dimensions if provided in the metadata
        if (sizeAttribute.metadata.dimensions) {
          form.setValue('dimensions', sizeAttribute.metadata.dimensions);
          setField('dimensions', sizeAttribute.metadata.dimensions);
        }
      }
    }, 0);
  };
  
  // Initialize form with values from context
  const form = useForm<AdditionalInfoFormValues>({
    resolver: zodResolver(additionalInfoSchema),
    defaultValues: {
      // Inventory
      stockLevel: state.stockLevel,
      lowStockThreshold: state.lowStockThreshold,
      backorderEnabled: state.backorderEnabled,
      
      // Tax settings
      taxable: state.taxable,
      taxClass: state.taxClass,
      
      // Product details
      supplier: state.supplier || '',
      attributeValues: state.attributeValues || [],
      weight: state.weight || null,
      dimensions: state.dimensions || '',
      
      // SEO
      metaTitle: state.metaTitle || state.name,
      metaDescription: state.metaDescription || state.description,
      metaKeywords: state.metaKeywords,
    },
  });
  
  // Update form when editing product data is loaded
  useEffect(() => {
    if (state.productId) {
      console.log('AdditionalInfoStep: Updating form with state values for editing:', state);
      
      // Inventory
      form.setValue('stockLevel', state.stockLevel || 0);
      form.setValue('lowStockThreshold', state.lowStockThreshold || 5);
      form.setValue('backorderEnabled', state.backorderEnabled || false);
      
      // Shipping
      form.setValue('taxable', state.taxable || true);
      form.setValue('taxClass', state.taxClass || '');
      form.setValue('shippingRequired', state.shippingRequired || true);
      form.setValue('shippingWeight', state.shippingWeight || null);
      form.setValue('shippingLength', state.shippingDimensions?.length || null);
      form.setValue('shippingWidth', state.shippingDimensions?.width || null);
      form.setValue('shippingHeight', state.shippingDimensions?.height || null);
      
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
  const onSubmit = (values: AdditionalInfoFormValues) => {
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
                <InfoIcon className="h-4 w-4" />
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
                  {/* Attribute-Based Pricing Configuration */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">Attribute Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure weight, dimensions, and mark attributes as required for checkout.
                    </p>
                    
                    {formattedAttributes.length > 0 ? (
                      <AttributeConfig
                        attributes={formattedAttributes}
                        attributeValues={attributeValues}
                        onChange={handleAttributeValuesChange}
                      />
                    ) : (
                      <div className="text-center py-8 border rounded-md bg-muted/20">
                        <InfoIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">No product attributes detected</p>
                        <p className="text-sm text-muted-foreground">
                          Add attributes below or wait for the system to detect available attributes
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Product Attributes */}
                  <div className="space-y-4 pt-4 border-t mt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">Product Attributes</h3>
                        <p className="text-sm text-muted-foreground">
                          Configure product attributes like size, color, material, etc.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/admin/attributes')}
                      >
                        Manage Attributes
                      </Button>
                    </div>
                    
                    {formattedAttributes.length > 0 ? (
                      <div className="space-y-4">
                        <p className="text-sm font-medium">
                          Selected attributes determine what options customers need to select when purchasing this product.
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
                                    if (checked) {
                                      setAttributesUsed([...attributesUsed, attr.id]);
                                      // Also add to product's attributes in state
                                      addAttribute({
                                        id: attr.id,
                                        name: attr.name,
                                        value: "", // Will be set by customer
                                        isCustom: false,
                                      });
                                    } else {
                                      setAttributesUsed(attributesUsed.filter(id => id !== attr.id));
                                      // Also remove from product's attributes in state
                                      const index = state.attributes.findIndex(a => a.id === attr.id);
                                      if (index !== -1) {
                                        handleRemoveAttribute(index);
                                      }
                                    }
                                  }}
                                />
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {attr.options.length} options available
                              </p>
                              
                              {attributesUsed.includes(attr.id) && (
                                <div className="mt-3 border-t pt-3">
                                  <div className="mb-2">
                                    <span className="text-sm font-medium mb-1 block">Options for {attr.name}</span>
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
                    ) : (
                      <div className="text-center py-8 border rounded-md bg-muted/20">
                        <p className="text-muted-foreground">No attributes available</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Add global attributes first by clicking the "Manage Attributes" button
                        </p>
                      </div>
                    )}
                    
                    {/* Custom Attributes for Selected Attributes */}
                    {attributesUsed.length > 0 && (
                      <div className="mt-6 pt-6 border-t">
                        <h4 className="font-medium">Custom Attribute Values</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Add custom values for the selected attributes
                        </p>
                        
                        <div className="space-y-4">
                          {attributesUsed.map(attrId => {
                            const attr = formattedAttributes.find(a => a.id === attrId);
                            if (!attr) return null;
                            
                            // Find existing attribute instances in the state
                            const existingAttrIndex = state.attributes.findIndex(a => a.id === attr.id);
                            
                            return (
                              <div key={attr.id} className="border rounded-md p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <h5 className="font-medium">{attr.name}</h5>
                                </div>
                                
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 gap-3">
                                    <label className="text-sm font-medium">
                                      Custom Value for {attr.name}
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="text"
                                        value={existingAttrIndex !== -1 ? state.attributes[existingAttrIndex].value || '' : ''}
                                        onChange={(e) => {
                                          if (existingAttrIndex !== -1) {
                                            handleAttributeValueChange(existingAttrIndex, e.target.value);
                                          }
                                        }}
                                        placeholder={`Enter ${attr.name.toLowerCase()} values (comma separated)`}
                                      />
                                      <p className="text-xs text-muted-foreground mt-1">
                                        For multiple values, separate with commas (e.g. Red, Blue, Green)
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Custom Attributes Section */}
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-medium">Custom Attributes</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add one-time custom attributes for this product only
                      </p>
                      
                      {customAttributes.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic mb-4">No custom attributes added yet</p>
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
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={attr.value}
                                    onChange={(e) => {
                                      const updatedAttrs = [...customAttributes];
                                      updatedAttrs[index] = { ...attr, value: e.target.value };
                                      setCustomAttributes(updatedAttrs);
                                    }}
                                    placeholder="Enter value"
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground"
                                    onClick={() => {
                                      setCustomAttributes(customAttributes.filter((_, i) => i !== index));
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
                      
                      {/* Add Custom Attribute Form */}
                      {/* Display custom attributes that have been added */}
                      {customAttributes.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-2">Custom Attributes</h4>
                          <div className="space-y-2">
                            {customAttributes.map((attr, index) => (
                              <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                                <div className="flex flex-col">
                                  <div className="font-medium">
                                    {attr.name} {attr.required && <span className="text-red-500">*</span>}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Value: {attr.value} | Type: {attr.type}
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    // Find in context state and remove
                                    const attrToRemove = state.attributes.find(a => 
                                      a.isCustom && a.name === attr.name && a.value === attr.value
                                    );
                                    if (attrToRemove) {
                                      removeAttribute(attrToRemove.id);
                                    }
                                    
                                    // Remove from local state
                                    const newCustomAttrs = [...customAttributes];
                                    newCustomAttrs.splice(index, 1);
                                    setCustomAttributes(newCustomAttrs);
                                  }}
                                >
                                  <XIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
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
                              value={newCustomAttrName}
                              onChange={(e) => setNewCustomAttrName(e.target.value)}
                              placeholder="e.g. Material, Color, Style"
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
                              value={newCustomAttrValue}
                              onChange={(e) => setNewCustomAttrValue(e.target.value)}
                              placeholder="e.g. Cotton, Red, XL (separate multiple with commas)"
                              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              For multiple values, separate with commas (e.g. Red, Blue, Green)
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="attrType" className="text-sm font-medium">
                              Attribute Type
                            </label>
                            <select
                              id="attrType"
                              value={newCustomAttrType}
                              onChange={(e) => setNewCustomAttrType(e.target.value)}
                              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {["text", "number", "select", "color", "size", "date", "boolean"].map(type => (
                                <option key={type} value={type}>
                                  {type.charAt(0).toUpperCase() + type.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center mt-6">
                            <label htmlFor="attrRequired" className="text-sm font-medium mr-2">
                              Required:
                            </label>
                            <Switch
                              id="attrRequired"
                              checked={newCustomAttrRequired}
                              onCheckedChange={setNewCustomAttrRequired}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            if (newCustomAttrName.trim() && newCustomAttrValue.trim()) {
                              // Add to custom attributes
                              setCustomAttributes([
                                ...customAttributes,
                                { 
                                  name: newCustomAttrName, 
                                  value: newCustomAttrValue,
                                  type: newCustomAttrType,
                                  required: newCustomAttrRequired
                                }
                              ]);
                              
                              // Also add to product attributes through context
                              addAttribute({
                                id: Date.now(), // Temporary ID for UI purposes
                                name: newCustomAttrName.trim(),
                                value: newCustomAttrValue.trim(),
                                isCustom: true,
                                type: newCustomAttrType,
                                required: newCustomAttrRequired
                              });
                              
                              // Clear inputs
                              setNewCustomAttrName('');
                              setNewCustomAttrValue('');
                              setNewCustomAttrType('text');
                              setNewCustomAttrRequired(false);
                            }
                          }}
                          disabled={!newCustomAttrName.trim() || !newCustomAttrValue.trim()}
                          size="sm"
                          className="mt-2"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          <span>Add Attribute</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {/* SEO Tab */}
                <TabsContent value="shipping" className="space-y-6">
                  
                  {/* Product Details Section */}
                  <Collapsible
                    defaultOpen
                    className="border rounded-md overflow-hidden"
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted transition-colors">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
                          <rect width="20" height="14" x="2" y="3" rx="2" />
                          <line x1="8" x2="16" y1="21" y2="21" />
                          <line x1="12" x2="12" y1="17" y2="21" />
                        </svg>
                        <h3 className="font-medium">Product Details</h3>
                      </div>
                      <ChevronDownIcon className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 py-3 space-y-4">
                      {/* Supplier - Dynamically populated based on catalog */}
                      <FormField
                        control={form.control}
                        name="supplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplier</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Supplier name"
                                {...field}
                                value={field.value || ''}
                                readOnly
                                className="bg-muted/50"
                              />
                            </FormControl>
                            <FormDescription>
                              Name of the product supplier (automatically populated from the associated catalog)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Weight and dimensions have been removed as per requirements */}
                    </CollapsibleContent>
                  </Collapsible>
                  
                  {/* Sales & Promotions Section has been moved to its own dedicated step */}
                  
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