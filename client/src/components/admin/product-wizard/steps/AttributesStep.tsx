import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Search, Tag, Save, X, ChevronRight, ChevronDown, Info, AlertTriangle, Wand2 } from 'lucide-react';
import type { ProductDraft } from '../ProductWizard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// Define the attribute types
type AttributeType = 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'color' | 'date';

// Define the attribute structure
interface Attribute {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  attributeType: AttributeType;
  isRequired: boolean;
  isFilterable: boolean;
  isComparable: boolean;
  validationRules?: any;
  options: AttributeOption[];
  sortOrder?: number;
}

// Define the attribute option structure
interface AttributeOption {
  id: number;
  attributeId: number;
  value: string;
  displayValue: string;
  metadata?: any;
  sortOrder?: number;
}

// Define the attribute value structure for both input and output
interface AttributeValue {
  attributeId: number;
  value: string | string[] | boolean | number | null;
  attributeName?: string;
  displayName?: string;
  attributeType?: string;
  options?: AttributeOption[];
  selectedOptions?: number[];
  textValue?: string | null;
  isRequired?: boolean; // Whether this attribute is required for customers
  isAppliedToProduct?: boolean; // Whether this attribute is applied to this product
}

// Define the props for the AttributesStep component
interface AttributesStepProps {
  draft: ProductDraft;
  onSave: (data: Partial<ProductDraft>, advanceToNext?: boolean) => void;
  isLoading?: boolean;
}

export const AttributesStep: React.FC<AttributesStepProps> = ({ draft, onSave, isLoading = false }) => {
  // Helper function to safely check if an attribute has options and map them
  const safelyMapOptions = (attribute: any, attributeId: number) => {
    if (!attribute) return [];
    if (!attribute.options) return [];
    if (!Array.isArray(attribute.options)) return [];
    
    return attribute.options.map((opt: any) => ({
      ...opt,
      attributeId: attributeId
    }));
  };
  
  // Helper function to safely get an option from attribute options
  const safelyFindOption = (attribute: any, optionId: number) => {
    if (!attribute) return null;
    if (!attribute.options) return null;
    if (!Array.isArray(attribute.options)) return null;
    
    return attribute.options.find((opt: any) => opt.id === optionId) || null;
  };
  
  // Helper function to safely convert selected option IDs to their values
  const safelyMapOptionIdsToValues = (attribute: any, optionIds: number[]) => {
    if (!attribute) return [];
    if (!attribute.options) return [];
    if (!Array.isArray(attribute.options)) return [];
    if (!optionIds) return [];
    if (!Array.isArray(optionIds)) return [];
    
    return optionIds.map(optId => {
      const option = attribute.options.find((opt: any) => opt.id === optId);
      return option ? option.value : null;
    }).filter(Boolean);
  };

  // State management
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [attributeValues, setAttributeValues] = useState<AttributeValue[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});
  const [attributesCache, setAttributesCache] = useState<Record<number, Attribute>>({});
  const [isAddingOption, setIsAddingOption] = useState<boolean>(false);
  const [newOptionData, setNewOptionData] = useState<{value: string, displayValue: string}>({ value: '', displayValue: '' });
  const [isCreatingOption, setIsCreatingOption] = useState<boolean>(false);
  const [currentAttributeId, setCurrentAttributeId] = useState<number | null>(null);
  const [showAttributeInfo, setShowAttributeInfo] = useState<Record<number, boolean>>({});
  const [attributeFilter, setAttributeFilter] = useState<string>('');
  const [attributeTypeFilter, setAttributeTypeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('applied');
  const [isManagingOptions, setIsManagingOptions] = useState<boolean>(false);

  // Query to get all attributes
  const { data: attributesData, isLoading: isLoadingAttributes } = useQuery({
    queryKey: ['/api/attributes'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query to get required attributes for the category
  const { data: requiredAttributesData, isLoading: isLoadingRequiredAttributes } = useQuery({
    queryKey: ['/api/categories', draft.categoryId, 'required-attributes'],
    queryFn: () => 
      apiRequest('GET', `/api/categories/${draft.categoryId}/required-attributes`)
        .then(res => res.json()),
    enabled: !!draft.categoryId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Load attribute options directly, not as a hook
  const loadAttributeOptions = (attributeId: number) => {
    if (!attributeId || attributesCache[attributeId]?.options) {
      return;
    }
    
    const attribute = getAllAttributes().find(a => a.id === attributeId);
    if (attribute) {
      console.log(`Preloading options for attribute: ${attribute.displayName} (${attributeId})`);
      
      // Manual fetch instead of using a hook
      apiRequest('GET', `/api/attributes/${attributeId}/options`)
        .then(res => res.json())
        .then(data => {
          if (data?.success && data?.data) {
            setAttributesCache(prev => ({
              ...prev,
              [attributeId]: {
                ...prev[attributeId],
                options: data.data
              }
            }));
          }
        })
        .catch(error => {
          console.error(`Error fetching options for attribute ${attributeId}:`, error);
        });
    }
  };

  // Define preloadOptions as alias for loadAttributeOptions for compatibility
  const preloadOptions = loadAttributeOptions;

  // Function to get all attributes, including those in cache
  const getAllAttributes = (): Attribute[] => {
    if (!attributesData?.success || !attributesData?.data) {
      return [];
    }
    
    return attributesData.data.map((attr: Attribute) => ({
      ...attr,
      options: attributesCache[attr.id]?.options || []
    }));
  };
  
  // Function to get attributes that are applied to this product
  const getAppliedAttributes = (): AttributeValue[] => {
    return attributeValues.filter(attr => attr.isAppliedToProduct);
  };
  
  // Function to get attributes that are not applied to this product
  const getUnappliedAttributes = (): AttributeValue[] => {
    return attributeValues.filter(attr => !attr.isAppliedToProduct);
  };

  // Function to get required attributes for the category
  const getRequiredAttributes = (): number[] => {
    if (!requiredAttributesData?.success || !requiredAttributesData?.data) {
      return [];
    }
    
    return requiredAttributesData.data.map((attr: any) => attr.attributeId);
  };

  // Initialize attribute values from the draft
  useEffect(() => {
    // First, get all available attributes to initialize the complete list
    const allAvailableAttributes = getAllAttributes().map(attr => ({
      attributeId: attr.id,
      attributeName: attr.name,
      displayName: attr.displayName,
      attributeType: attr.attributeType,
      value: null,
      textValue: null,
      selectedOptions: [],
      options: attr.options || [],
      isRequired: attr.isRequired || false, // Use the attribute's default isRequired setting
      isAppliedToProduct: false // Default to false - not applied to this product
    }));
    
    // If the draft has attributes, overlay their values
    if (draft.attributes && draft.attributes.length > 0) {
      // Simple format
      const simpleValues = draft.attributes.map(attr => ({
        attributeId: attr.attributeId,
        value: attr.value,
        isAppliedToProduct: true, // Mark as applied since it's in the draft.attributes
        isRequired: attr.isRequired || false
      }));
      
      // Enhanced format (if available)
      if (draft.attributesData && draft.attributesData.length > 0) {
        const enhancedValues = draft.attributesData.map(attr => {
          // Ensure options have attributeId to match AttributeOption interface
          const formattedOptions = safelyMapOptions(attr, attr.attributeId);
            
          return {
            attributeId: attr.attributeId,
            attributeName: attr.attributeName,
            displayName: attr.displayName,
            attributeType: attr.attributeType,
            value: attr.value,
            textValue: attr.textValue,
            selectedOptions: attr.selectedOptions || [],
            options: formattedOptions,
            isRequired: attr.isRequired || false,
            isAppliedToProduct: true // Mark as applied since it's in draft.attributesData
          };
        });
        
        // Merge the enhanced values with all available attributes
        // This ensures we have a complete list, including those not yet applied to the product
        const mergedAttributes = allAvailableAttributes.map(attr => {
          const existingAttr = enhancedValues.find(ea => ea.attributeId === attr.attributeId);
          return existingAttr || attr;
        });
        
        setAttributeValues(mergedAttributes);
      } else {
        // Merge simple values with all available attributes
        const mergedAttributes = allAvailableAttributes.map(attr => {
          const existingAttr = simpleValues.find(sa => sa.attributeId === attr.attributeId);
          if (existingAttr) {
            return { ...attr, ...existingAttr };
          }
          return attr;
        });
        
        setAttributeValues(mergedAttributes);
      }
      
      // Pre-load options for attributes with values
      draft.attributes.forEach(async (attr) => {
        const attribute = getAllAttributes().find(a => a.id === attr.attributeId);
        if (attribute && (attribute.attributeType === 'select' || attribute.attributeType === 'multiselect')) {
          preloadOptions(attr.attributeId);
        }
      });
    } else {
      // No attributes in draft, just use all available attributes with default flags
      setAttributeValues(allAvailableAttributes);
    }
  }, [draft.attributes, draft.attributesData, attributesData]);

  // Handle attribute value changes
  const handleAttributeChange = (attributeId: number, value: string | string[] | boolean | number | null) => {
    const newValues = [...attributeValues];
    const existingIndex = newValues.findIndex(v => v.attributeId === attributeId);
    
    if (existingIndex >= 0) {
      newValues[existingIndex] = { 
        ...newValues[existingIndex],
        value, 
        isAppliedToProduct: true // If setting a value, make sure it's marked as applied
      };
    } else {
      // Find attribute details from API data
      const attribute = getAllAttributes().find(a => a.id === attributeId);
      if (attribute) {
        // Ensure options have attributeId to match AttributeOption interface
        const formattedOptions = safelyMapOptions(attribute, attributeId);
          
        newValues.push({ 
          attributeId, 
          attributeName: attribute.name,
          displayName: attribute.displayName,
          attributeType: attribute.attributeType,
          value,
          options: formattedOptions,
          isAppliedToProduct: true, // New attribute values are automatically applied
          isRequired: attribute.isRequired || false // Default to attribute's global setting
        });
      }
    }
    
    setAttributeValues(newValues);
    
    // Clear validation error for this attribute if it exists
    if (validationErrors[attributeId]) {
      const newErrors = {...validationErrors};
      delete newErrors[attributeId];
      setValidationErrors(newErrors);
    }
  };
  
  // Toggle whether an attribute is applied to this product
  const toggleAttributeApplied = (attributeId: number, isApplied: boolean) => {
    const newValues = [...attributeValues];
    const existingIndex = newValues.findIndex(v => v.attributeId === attributeId);
    
    if (existingIndex >= 0) {
      // If we're removing an attribute and it was required, un-require it
      const isRequired = isApplied ? newValues[existingIndex].isRequired : false;
      
      newValues[existingIndex] = { 
        ...newValues[existingIndex],
        isAppliedToProduct: isApplied,
        isRequired
      };
    } else {
      // Find attribute details from API data
      const attribute = getAllAttributes().find(a => a.id === attributeId);
      
      if (attribute) {
        // Ensure options have attributeId to match AttributeOption interface
        const formattedOptions = safelyMapOptions(attribute, attributeId);
        
        newValues.push({
          attributeId,
          attributeName: attribute.name,
          displayName: attribute.displayName,
          attributeType: attribute.attributeType,
          value: null,
          options: formattedOptions,
          isAppliedToProduct: isApplied,
          isRequired: false // Default to not required when adding new
        });
      }
    }
    
    setAttributeValues(newValues);
  };
  
  // Toggle whether an attribute is required for customers
  const toggleAttributeRequired = (attributeId: number, isRequired: boolean) => {
    const newValues = [...attributeValues];
    const existingIndex = newValues.findIndex(v => v.attributeId === attributeId);
    
    if (existingIndex >= 0) {
      // If we're making an attribute required, ensure it's applied
      const isApplied = isRequired ? true : newValues[existingIndex].isAppliedToProduct;
      
      newValues[existingIndex] = { 
        ...newValues[existingIndex],
        isRequired,
        isAppliedToProduct: isApplied
      };
    } else {
      // Find attribute details from API data
      const attribute = getAllAttributes().find(a => a.id === attributeId);
      
      if (attribute) {
        // Ensure options have attributeId to match AttributeOption interface
        const formattedOptions = safelyMapOptions(attribute, attributeId);
        
        newValues.push({
          attributeId,
          attributeName: attribute.name,
          displayName: attribute.displayName,
          attributeType: attribute.attributeType,
          value: null,
          options: formattedOptions,
          isAppliedToProduct: isRequired, // If required, it must be applied
          isRequired
        });
      }
    }
    
    setAttributeValues(newValues);
  };

  // Handle option selection for multiselect attributes (admin makes multiple options available to customer)
  const handleOptionSelect = (attributeId: number, optionId: number, isSelected: boolean) => {
    const newValues = [...attributeValues];
    const existingIndex = newValues.findIndex(v => v.attributeId === attributeId);
    
    if (existingIndex >= 0) {
      const currentSelectedOptions = newValues[existingIndex].selectedOptions || [];
      
      if (isSelected) {
        newValues[existingIndex].selectedOptions = [...currentSelectedOptions, optionId];
      } else {
        newValues[existingIndex].selectedOptions = currentSelectedOptions.filter(id => id !== optionId);
      }
      
      // For customer-facing display, we store the selected values in comma-separated string 
      // when admin selects multiple options to make available to customers
      newValues[existingIndex].value = newValues[existingIndex].selectedOptions
        .map(optId => {
          const attr = getAllAttributes().find(a => a.id === attributeId);
          if (!attr) return null;
          
          const option = safelyFindOption(attr, optId);
          return option ? option.value : null;
        })
        .filter(Boolean)
        .join(',');
        
      // Mark attribute as applied if we're selecting options
      if (isSelected) {
        newValues[existingIndex].isAppliedToProduct = true;
      }
    }
    
    setAttributeValues(newValues);
    
    // Clear validation error for this attribute if it exists
    if (validationErrors[attributeId]) {
      const newErrors = {...validationErrors};
      delete newErrors[attributeId];
      setValidationErrors(newErrors);
    }
  };

  // Define the function to create a new attribute option
  const handleCreateAttributeOption = async () => {
    if (!currentAttributeId || !newOptionData.value) {
      return;
    }

    try {
      setIsCreatingOption(true);
      const currentAttribute = getAllAttributes().find(attr => attr.id === currentAttributeId);
      if (!currentAttribute) {
        return;
      }

      const option = {
        attributeId: currentAttributeId,
        value: newOptionData.value,
        displayValue: newOptionData.displayValue || newOptionData.value,
        sortOrder: (currentAttribute.options?.length || 0),
      };

      const response = await apiRequest(
        'POST',
        `/api/attributes/${currentAttributeId}/options`,
        option
      );

      if (response.ok) {
        const newOption = await response.json();
        if (newOption.success && newOption.data) {
          // Update the attributesCache with a fresh copy to avoid reference issues
          const updatedCache = {...attributesCache};
          if (!updatedCache[currentAttributeId]) {
            updatedCache[currentAttributeId] = {
              ...currentAttribute,
              options: []
            };
          }
          
          updatedCache[currentAttributeId].options = [
            ...(updatedCache[currentAttributeId].options || []),
            newOption.data
          ];
          setAttributesCache(updatedCache);
          
          // Update attributeValues to make sure the UI reflects the new option
          setAttributeValues(prevValues => {
            return prevValues.map(attrValue => {
              if (attrValue.attributeId === currentAttributeId) {
                return {
                  ...attrValue,
                  options: [...(attrValue.options || []), newOption.data]
                };
              }
              return attrValue;
            });
          });
          
          // Clear form, close dialog
          setNewOptionData({ value: '', displayValue: '' });
          setIsAddingOption(false);
          
          // Invalidate related queries to ensure fresh data on next load
          queryClient.invalidateQueries({ queryKey: [`/api/attributes/${currentAttributeId}/options`] });
          
          // Force refresh all attributes data to ensure consistency
          queryClient.invalidateQueries({ queryKey: ['/api/attributes'] });
          
          // Show success message
          toast({
            title: "Option created",
            description: `Added "${newOption.data.displayValue}" option to ${currentAttribute.displayName}`,
          });
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create option');
      }
    } catch (error) {
      console.error("Error creating option:", error);
      toast({
        title: "Error creating option",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreatingOption(false);
    }
  };

  // Handle the save action
  const handleSave = (advanceToNext: boolean = false) => {
    // Validate each attribute
    const errors: Record<number, string> = {};
    
    getAppliedAttributes().forEach(attr => {
      // Skip validation if the attribute is not applied to this product
      if (!attr.isAppliedToProduct) return;
      
      // Required fields must have a value
      if (attr.isRequired && (!attr.value || attr.value === '')) {
        errors[attr.attributeId] = `${attr.displayName} is required`;
      }
      
      // Select/multiselect attributes must have selected options only if they're applied to the product
      // AND marked as required for customers
      if (attr.isAppliedToProduct && attr.isRequired && 
          (attr.attributeType === 'select' || attr.attributeType === 'multiselect') && 
          (!attr.selectedOptions || attr.selectedOptions.length === 0)) {
        errors[attr.attributeId] = `Please select at least one option for ${attr.displayName}`;
      }
    });
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving",
        variant: "destructive"
      });
      return;
    }
    
    // Format and save attributes
    const attributes = getAppliedAttributes().map(attr => ({
      attributeId: attr.attributeId,
      value: attr.value,
      isRequired: attr.isRequired || false
    }));
    
    onSave({ 
      attributes,
      attributesData: getAppliedAttributes()
    }, advanceToNext);
  };

  // Render an individual attribute input field based on its type
  const renderAttributeInput = (attribute: AttributeValue) => {
    const attributeId = attribute.attributeId;
    const attrDetails = getAllAttributes().find(a => a.id === attributeId);
    const type = attribute.attributeType || (attrDetails?.attributeType || 'text');
    
    // If this is a select or multiselect attribute but options aren't loaded yet,
    // fetch them now
    if ((type === 'select' || type === 'multiselect') && 
        (!attribute.options || attribute.options.length === 0)) {
      preloadOptions(attributeId);
    }
    
    switch (type) {
      case 'text':
        return (
          <Input
            id={`attribute-${attributeId}`}
            value={attribute.value as string || ''}
            onChange={(e) => handleAttributeChange(attributeId, e.target.value)}
            placeholder={`Enter ${attribute.displayName}`}
            className={validationErrors[attributeId] ? "border-red-500" : ""}
          />
        );
        
      case 'number':
        return (
          <Input
            id={`attribute-${attributeId}`}
            type="number"
            value={attribute.value as string || ''}
            onChange={(e) => handleAttributeChange(attributeId, e.target.value)}
            placeholder={`Enter ${attribute.displayName}`}
            className={validationErrors[attributeId] ? "border-red-500" : ""}
          />
        );
        
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={`attribute-${attributeId}`}
              checked={!!attribute.value}
              onCheckedChange={(checked) => handleAttributeChange(attributeId, checked)}
            />
            <Label htmlFor={`attribute-${attributeId}`}>
              {attribute.value ? "Yes" : "No"}
            </Label>
          </div>
        );
        
      case 'select':
        return (
          <div>
            <Select
              value={attribute.value as string || ''}
              onValueChange={(value) => handleAttributeChange(attributeId, value)}
            >
              <SelectTrigger className={validationErrors[attributeId] ? "border-red-500" : ""}>
                <SelectValue placeholder={`Select ${attribute.displayName}`} />
              </SelectTrigger>
              <SelectContent>
                {/* Only show options that have been selected by the admin for this product */}
                {(attribute.options || [])
                  .filter(option => {
                    // If no selected options, show all
                    if (!attribute.selectedOptions || attribute.selectedOptions.length === 0) {
                      return true;
                    }
                    // Only show options selected by the admin
                    return attribute.selectedOptions.includes(option.id);
                  })
                  .map(option => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.displayValue}
                    </SelectItem>
                  ))}
                {((attribute.options || []).length === 0) && (
                  <div className="p-2 text-center text-gray-500">
                    <span>No options available</span>
                  </div>
                )}
              </SelectContent>
            </Select>
            
            {/* Quick add option button */}
            <div className="mt-1 text-right">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setCurrentAttributeId(attributeId);
                  setNewOptionData({ value: '', displayValue: '' });
                  setIsAddingOption(true);
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                <span className="text-xs">Add Option</span>
              </Button>
            </div>
          </div>
        );
        
      case 'multiselect':
        // For multiselect, we use checkboxes to let the admin select multiple options
        // that will be available to the customer. The customer will then select one option
        // from these available options.
        return (
          <div className="space-y-2">
            <Label className="mb-1 inline-block">
              Available options to customers:
            </Label>
            <div className="space-y-2 border rounded-md p-2 bg-muted/20">
              {(attribute.options || []).length === 0 ? (
                <div className="text-center text-gray-500 py-2">
                  <span>No options available yet</span>
                </div>
              ) : (
                (attribute.options || []).map(option => {
                  const isSelected = attribute.selectedOptions?.includes(option.id) || false;
                  return (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`option-${option.id}`} 
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          handleOptionSelect(attributeId, option.id, checked === true);
                        }}
                      />
                      <Label 
                        htmlFor={`option-${option.id}`}
                        className={`font-normal ${isSelected ? 'text-primary' : ''}`}
                      >
                        {option.displayValue}
                      </Label>
                    </div>
                  );
                })
              )}
            </div>
            
            {validationErrors[attributeId] && (
              <p className="text-red-500 text-sm mt-1">{validationErrors[attributeId]}</p>
            )}
            
            {/* Quick add option button */}
            <div className="mt-1 text-right">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setCurrentAttributeId(attributeId);
                  setNewOptionData({ value: '', displayValue: '' });
                  setIsAddingOption(true);
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                <span className="text-xs">Add Option</span>
              </Button>
            </div>
            
            {/* Selected options summary */}
            {attribute.selectedOptions && attribute.selectedOptions.length > 0 && (
              <div className="mt-2 bg-muted/10 p-2 rounded">
                <p className="text-sm text-muted-foreground font-medium">
                  Selected options: {attribute.selectedOptions
                    .map(optId => {
                      const option = safelyFindOption(attrDetails, optId);
                      return option ? option.displayValue : null;
                    })
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            )}
          </div>
        );
        
      default:
        return (
          <Input
            id={`attribute-${attributeId}`}
            value={attribute.value as string || ''}
            onChange={(e) => handleAttributeChange(attributeId, e.target.value)}
            placeholder={`Enter ${attribute.displayName}`}
            className={validationErrors[attributeId] ? "border-red-500" : ""}
          />
        );
    }
  };

  // Render an attribute list item with the input control
  const renderAttributeItem = (attribute: AttributeValue) => {
    const requiredForCategory = getRequiredAttributes().includes(attribute.attributeId);
    const hasError = !!validationErrors[attribute.attributeId];
    const infoVisible = showAttributeInfo[attribute.attributeId] || false;
    
    return (
      <div 
        key={attribute.attributeId} 
        className={`border rounded-lg p-4 mb-4 transition-all ${
          hasError ? 'border-red-500 shadow-sm bg-red-50/20' : 
          attribute.isAppliedToProduct ? 'border-primary/30 shadow-sm' : 'border-gray-200'
        }`}
      >
        <div className="flex flex-col space-y-2">
          {/* Attribute header with name and controls */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-medium">{attribute.displayName}</h3>
                
                {/* Badge indicating if it's required by the category */}
                {requiredForCategory && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          Required for category
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This attribute is required for products in this category</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {/* Show Manage Options button for select/multiselect attributes */}
                {(attribute.attributeType === 'select' || attribute.attributeType === 'multiselect') && (
                  <Dialog open={currentAttributeId === attribute.attributeId && isManagingOptions} onOpenChange={(open) => {
                    if (!open) {
                      setIsManagingOptions(false);
                      setCurrentAttributeId(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={`ml-2 ${attribute.isRequired && (!attribute.selectedOptions || attribute.selectedOptions.length === 0) ? 'border-amber-500 bg-amber-50 hover:bg-amber-100' : ''}`}
                        onClick={() => {
                          setCurrentAttributeId(attribute.attributeId);
                          setIsManagingOptions(true);
                          // Make sure options are loaded
                          if ((attribute.options || []).length === 0) {
                            preloadOptions(attribute.attributeId);
                          }
                        }}
                      >
                        <span className="text-xs">
                          {attribute.isRequired && (!attribute.selectedOptions || attribute.selectedOptions.length === 0) 
                            ? 'Select Options (Required)' 
                            : (attribute.selectedOptions && attribute.selectedOptions.length > 0) 
                              ? `${attribute.selectedOptions.length} Options Selected`
                              : 'Manage Options'}
                        </span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Manage {attribute.displayName} Options</DialogTitle>
                        <DialogDescription>
                          Select which options will be available to customers for this product.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="max-h-[400px] overflow-y-auto py-4">
                        {(attribute.options || []).length === 0 ? (
                          <div className="text-center text-gray-500 py-2">
                            <span>No options available yet</span>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(attribute.options || []).map(option => {
                              const isSelected = attribute.selectedOptions?.includes(option.id) || false;
                              return (
                                <div key={option.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/20">
                                  <Checkbox 
                                    id={`dialog-option-${option.id}`} 
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      handleOptionSelect(attribute.attributeId, option.id, checked === true);
                                    }}
                                  />
                                  <Label 
                                    htmlFor={`dialog-option-${option.id}`}
                                    className={`font-normal flex-grow cursor-pointer ${isSelected ? 'text-primary font-medium' : ''}`}
                                  >
                                    {option.displayValue}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setCurrentAttributeId(attribute.attributeId);
                            setNewOptionData({ value: '', displayValue: '' });
                            setIsAddingOption(true);
                            setIsManagingOptions(false);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          <span className="text-xs">Add New Option</span>
                        </Button>
                        <Button onClick={() => {
                          setIsManagingOptions(false);
                          setCurrentAttributeId(null);
                        }}>Done</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                
                {/* Info toggle button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 rounded-full"
                  onClick={() => setShowAttributeInfo({
                    ...showAttributeInfo,
                    [attribute.attributeId]: !infoVisible
                  })}
                >
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              
              {/* Attribute info section (collapsible) */}
              {infoVisible && (
                <div className="mt-2 p-2 bg-muted/20 rounded-md text-sm">
                  <p><strong>Name:</strong> {attribute.attributeName}</p>
                  {attribute.attributeType && (
                    <p><strong>Type:</strong> {attribute.attributeType}</p>
                  )}
                  <p><strong>Applied to product:</strong> {attribute.isAppliedToProduct ? 'Yes' : 'No'}</p>
                  <p><strong>Required for customers:</strong> {attribute.isRequired ? 'Yes' : 'No'}</p>
                </div>
              )}
            </div>
            
            {/* Attribute controls */}
            <div className="flex items-center space-x-2">
              {/* Apply to Product toggle */}
              <div className="flex flex-col items-end space-y-1">
                <div className="flex items-center space-x-2">
                  <Label htmlFor={`apply-${attribute.attributeId}`} className="text-sm">
                    Apply to product
                  </Label>
                  <Switch
                    id={`apply-${attribute.attributeId}`}
                    checked={attribute.isAppliedToProduct}
                    onCheckedChange={(checked) => toggleAttributeApplied(attribute.attributeId, checked)}
                    disabled={requiredForCategory} // Can't disable category-required attributes
                  />
                </div>
                
                {/* Required for Customers toggle (only visible if applied to product) */}
                {attribute.isAppliedToProduct && (
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`required-${attribute.attributeId}`} className="text-sm">
                      Required for customers
                    </Label>
                    <Switch
                      id={`required-${attribute.attributeId}`}
                      checked={attribute.isRequired}
                      onCheckedChange={(checked) => toggleAttributeRequired(attribute.attributeId, checked)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Always show the input controls for select/multiselect to allow option selection */}
          <div className="mt-2">
            {/* For attributes that are not select/multiselect, only show input when applied */}
            {(attribute.attributeType === 'select' || attribute.attributeType === 'multiselect' || attribute.isAppliedToProduct) && 
              renderAttributeInput(attribute)
            }
            
            {/* Error message */}
            {hasError && (
              <p className="text-red-500 text-sm mt-1">{validationErrors[attribute.attributeId]}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Main render return
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Product Attributes</h2>
        <p className="text-sm text-gray-500 mb-4">
          Attributes define the properties and specifications of a product. These values help with filtering, searching, and provide important information to customers.
        </p>
        
        {/* Filter and controls */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2 w-full max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter attributes..."
                className="pl-8"
                value={attributeFilter}
                onChange={(e) => setAttributeFilter(e.target.value)}
              />
            </div>
            <Select
              value={attributeTypeFilter}
              onValueChange={setAttributeTypeFilter}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="multiselect">Multi-select</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Tabs for Applied/Available attributes */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid grid-cols-2 w-[300px]">
            <TabsTrigger value="applied">
              Applied Attributes <Badge variant="outline" className="ml-2 bg-primary/10">{getAppliedAttributes().length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="available">
              Available <Badge variant="outline" className="ml-2">{getUnappliedAttributes().length}</Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="applied" className="mt-4">
            <div className="space-y-2">
              {getAppliedAttributes().length === 0 ? (
                <div className="text-center p-8 border border-dashed rounded-lg">
                  <p className="text-muted-foreground">No attributes applied to this product yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Switch to the "Available" tab to add attributes</p>
                </div>
              ) : (
                getAppliedAttributes()
                  .filter(attr => 
                    attributeTypeFilter === 'all' || attr.attributeType === attributeTypeFilter
                  )
                  .filter(attr => 
                    !attributeFilter || 
                    attr.displayName?.toLowerCase().includes(attributeFilter.toLowerCase()) ||
                    attr.attributeName?.toLowerCase().includes(attributeFilter.toLowerCase())
                  )
                  .map(attr => renderAttributeItem(attr))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="available" className="mt-4">
            <div className="space-y-2">
              {getUnappliedAttributes().length === 0 ? (
                <div className="text-center p-8 border border-dashed rounded-lg">
                  <p className="text-muted-foreground">All available attributes are already applied to this product</p>
                </div>
              ) : (
                getUnappliedAttributes()
                  .filter(attr => 
                    attributeTypeFilter === 'all' || attr.attributeType === attributeTypeFilter
                  )
                  .filter(attr => 
                    !attributeFilter || 
                    attr.displayName?.toLowerCase().includes(attributeFilter.toLowerCase()) ||
                    attr.attributeName?.toLowerCase().includes(attributeFilter.toLowerCase())
                  )
                  .map(attr => renderAttributeItem(attr))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Save buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => handleSave(false)}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save
        </Button>
        <Button 
          type="button" 
          onClick={() => handleSave(true)}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /></>}
          Save & Continue
        </Button>
      </div>
      
      {/* Option creation dialog */}
      <Dialog open={isAddingOption} onOpenChange={setIsAddingOption}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Option</DialogTitle>
            <DialogDescription>
              Create a new option for this attribute
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="option-value">Value</Label>
              <Input
                id="option-value"
                placeholder="Enter option value (e.g. 'red')"
                value={newOptionData.value}
                onChange={(e) => setNewOptionData({
                  ...newOptionData,
                  value: e.target.value,
                  displayValue: newOptionData.displayValue || e.target.value
                })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="option-display-value">Display Label</Label>
              <Input
                id="option-display-value"
                placeholder="Enter display label (e.g. 'Ruby Red')"
                value={newOptionData.displayValue}
                onChange={(e) => setNewOptionData({
                  ...newOptionData,
                  displayValue: e.target.value
                })}
              />
              <p className="text-sm text-muted-foreground">
                This is what customers will see. If empty, the value will be used.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingOption(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleCreateAttributeOption}
              disabled={isCreatingOption || !newOptionData.value}
            >
              {isCreatingOption ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>Create Option</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};