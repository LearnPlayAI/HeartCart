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

  // Define the function to create a new attribute option
  const handleCreateAttributeOption = async () => {
    if (!currentAttributeId || !newOptionData.value) {
      return;
    }

    try {
      setIsCreatingOption(true);
      const currentAttribute = allAttributes.find(attr => attr.id === currentAttributeId);
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
          // Add to local cache
          const attribute = attributesCache[currentAttributeId];
          if (attribute) {
            attribute.options = [...(attribute.options || []), newOption.data];
            setAttributesCache({...attributesCache});
          }
          
          // Clear form, close dialog
          setNewOptionData({ value: '', displayValue: '' });
          setIsAddingOption(false);
          
          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: [`/api/attributes/${currentAttributeId}/options`] });
          
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
  const [activeTab, setActiveTab] = useState<string>('required');

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
      console.log(`Fetching options for attribute ID: ${attributeId}`);
      
      // Manual fetch instead of using a hook
      console.log(`Manual refetch of options for attribute:`, attributeId);
      apiRequest('GET', `/api/attributes/${attributeId}/options`)
        .then(res => res.json())
        .then(data => {
          console.log(`Options direct fetch response:`, data);
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
    
    // Clear validation error for this attribute if it exists
    if (validationErrors[attributeId]) {
      const newErrors = {...validationErrors};
      delete newErrors[attributeId];
      setValidationErrors(newErrors);
    }
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
        ?.map(optId => safelyFindOption(getAllAttributes().find(a => a.id === attributeId), optId)?.value)
        .filter(Boolean)
        .join(', ');
    } else {
      // Find attribute details
      const attribute = getAllAttributes().find(a => a.id === attributeId);
      if (attribute) {
        // Get the display string for the selected value(s)
        const selectedValues = [optionId].map(optId => 
          safelyFindOption(attribute, optId)?.value)
          .filter(Boolean)
          .join(', ');
        
        // Ensure options have attributeId to match AttributeOption interface
        const formattedOptions = safelyMapOptions(attribute, attributeId);
          
        newValues.push({
          attributeId,
          attributeName: attribute.name,
          displayName: attribute.displayName,
          attributeType: attribute.attributeType,
          value: selectedValues,
          selectedOptions: [optionId],
          options: formattedOptions
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

  // Get selected options for an attribute
  const getSelectedOptions = (attributeId: number): number[] => {
    const attrValue = attributeValues.find(v => v.attributeId === attributeId);
    return attrValue?.selectedOptions || [];
  };

  // Check if all required attributes have values
  const validateRequiredAttributes = (): boolean => {
    const requiredAttributes = getRequiredAttributes();
    const newErrors: Record<number, string> = {};
    let isValid = true;
    
    requiredAttributes.forEach(attributeId => {
      const attribute = getAllAttributes().find(a => a.id === attributeId);
      const attributeValue = attributeValues.find(v => v.attributeId === attributeId);
      
      // Skip if attribute not found (shouldn't happen)
      if (!attribute) return;
      
      const hasValue = attributeValue && (
        (typeof attributeValue.value === 'string' && attributeValue.value.trim() !== '') ||
        typeof attributeValue.value === 'number' ||
        typeof attributeValue.value === 'boolean' ||
        (Array.isArray(attributeValue.value) && attributeValue.value.length > 0) ||
        (Array.isArray(attributeValue.selectedOptions) && attributeValue.selectedOptions.length > 0)
      );
      
      if (!hasValue) {
        newErrors[attributeId] = `${attribute.displayName} is required`;
        isValid = false;
      }
    });
    
    setValidationErrors(newErrors);
    return isValid;
  };

  // Save the attribute values to the draft
  const handleSave = (advanceToNext: boolean = false) => {
    // Validate required attributes
    if (!validateRequiredAttributes()) {
      toast({
        title: "Missing required attributes",
        description: "Please provide values for all required attributes",
        variant: "destructive"
      });
      return;
    }
    
    // Create a simplified format for storage
    const simplifiedAttributes = attributeValues.map(attr => ({
      attributeId: attr.attributeId,
      value: attr.value
    }));
    
    // Save both the simplified and enhanced versions
    onSave({
      attributes: simplifiedAttributes,
      attributesData: attributeValues
    }, advanceToNext);
  };

  // Toggle showing additional info for an attribute
  const toggleAttributeInfo = (attributeId: number) => {
    setShowAttributeInfo(prev => ({
      ...prev,
      [attributeId]: !prev[attributeId]
    }));
  };

  // Filter attributes based on user's search and selected tab
  const getFilteredAttributes = () => {
    const allAttributes = getAllAttributes();
    const requiredAttributeIds = getRequiredAttributes();
    
    let filteredAttrs = allAttributes;
    
    // Filter by category tab
    if (activeTab === 'required') {
      filteredAttrs = filteredAttrs.filter(attr => requiredAttributeIds.includes(attr.id));
    } else if (activeTab === 'optional') {
      filteredAttrs = filteredAttrs.filter(attr => !requiredAttributeIds.includes(attr.id));
    }
    
    // Filter by attribute type if specified
    if (attributeTypeFilter !== 'all') {
      filteredAttrs = filteredAttrs.filter(attr => attr.attributeType === attributeTypeFilter);
    }
    
    // Filter by search text
    if (attributeFilter) {
      const searchLower = attributeFilter.toLowerCase();
      filteredAttrs = filteredAttrs.filter(attr => 
        attr.displayName.toLowerCase().includes(searchLower) || 
        attr.name.toLowerCase().includes(searchLower) ||
        (attr.description && attr.description.toLowerCase().includes(searchLower))
      );
    }
    
    return filteredAttrs;
  };

  // Render an enhanced attribute input based on its type
  const renderEnhancedAttributeInput = (attribute: Attribute) => {
    const attributeId = attribute.id;
    const attributeValue = attributeValues.find(v => v.attributeId === attributeId);
    const currentValue = attributeValue?.value || '';
    
    switch (attribute.attributeType) {
      case 'text':
        return (
          <div className="space-y-2">
            <Textarea 
              id={`attribute-${attributeId}`}
              value={currentValue as string || ''}
              onChange={(e) => handleAttributeChange(attributeId, e.target.value)}
              placeholder={`Enter ${attribute.displayName.toLowerCase()}`}
              className="min-h-24"
            />
          </div>
        );
        
      case 'number':
        return (
          <div className="space-y-2">
            <Input 
              id={`attribute-${attributeId}`}
              type="number"
              value={currentValue as string || ''}
              onChange={(e) => handleAttributeChange(attributeId, e.target.value ? Number(e.target.value) : null)}
              placeholder={`Enter ${attribute.displayName.toLowerCase()}`}
            />
          </div>
        );
        
      case 'boolean':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id={`attribute-${attributeId}`}
                checked={(currentValue as boolean) || false}
                onCheckedChange={(checked) => handleAttributeChange(attributeId, checked)}
              />
              <Label htmlFor={`attribute-${attributeId}`} className="text-sm text-gray-600">
                {(currentValue as boolean) ? 'Yes' : 'No'}
              </Label>
            </div>
          </div>
        );
        
      case 'select':
      case 'multiselect':
        const options = safelyMapOptions(attribute, attributeId);
        const selectedOptions = getSelectedOptions(attributeId);
        
        return (
          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <div className="text-sm font-medium text-gray-600 mb-2">
                Available options to customers:
              </div>
              
              {options.length === 0 ? (
                <div className="text-sm text-gray-500 italic">
                  No options defined for this attribute
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {options.map(option => (
                    <div key={option.id} className="flex items-center space-x-2 border rounded-md p-2">
                      <Checkbox
                        id={`option-${option.id}`}
                        checked={selectedOptions.includes(option.id)}
                        onCheckedChange={(checked) => 
                          handleOptionSelect(attributeId, option.id, !!checked)
                        }
                      />
                      <Label 
                        htmlFor={`option-${option.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {option.displayValue}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 flex items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentAttributeId(attributeId);
                    setNewOptionData({ value: '', displayValue: '' });
                    setIsAddingOption(true);
                  }}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Option
                </Button>
              </div>
              
              {selectedOptions.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-600 mb-2">
                    Selected options summary:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedOptions.map((optionId) => {
                      const option = safelyFindOption(attribute, optionId);
                      return option ? (
                        <Badge key={option.id} variant="outline">
                          {option.displayValue}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'color':
        return (
          <div className="space-y-2">
            <Input 
              id={`attribute-${attributeId}`}
              type="color"
              value={(currentValue as string) || '#000000'}
              onChange={(e) => handleAttributeChange(attributeId, e.target.value)}
              className="h-10 w-full"
            />
          </div>
        );
        
      case 'date':
        return (
          <div className="space-y-2">
            <Input 
              id={`attribute-${attributeId}`}
              type="date"
              value={(currentValue as string) || ''}
              onChange={(e) => handleAttributeChange(attributeId, e.target.value)}
            />
          </div>
        );
        
      default:
        return (
          <div className="space-y-2">
            <Input 
              id={`attribute-${attributeId}`}
              value={(currentValue as string) || ''}
              onChange={(e) => handleAttributeChange(attributeId, e.target.value)}
              placeholder={`Enter ${attribute.displayName.toLowerCase()}`}
            />
          </div>
        );
    }
  };

  // Render an attribute item with label, input, and validation
  const renderAttributeItem = (attribute: Attribute) => {
    const attributeId = attribute.id;
    const isRequired = getRequiredAttributes().includes(attributeId);
    const hasError = !!validationErrors[attributeId];
    const isExpanded = showAttributeInfo[attributeId] || false;
    const attributeValue = attributeValues.find(v => v.attributeId === attributeId);
    const selectedOptions = attributeValue?.selectedOptions || [];
        
    return (
      <div 
        key={attributeId}
        className={`border rounded-lg p-4 mb-4 ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-start">
            <div>
              <Label 
                htmlFor={`attribute-${attributeId}`}
                className="text-base font-medium"
              >
                {attribute.displayName}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              
              <div className="flex items-center mt-1 text-sm text-gray-500">
                <span className="text-xs text-gray-400 mr-2">{attribute.name}</span>
                <Badge variant="outline" className="mr-2">
                  {attribute.attributeType}
                </Badge>
                {attribute.isFilterable && (
                  <Badge variant="outline" className="bg-blue-50">
                    filterable
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toggleAttributeInfo(attributeId)}
              className="p-1"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {isExpanded && attribute.description && (
          <div className="mb-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
            {attribute.description}
          </div>
        )}
        
        {renderEnhancedAttributeInput(attribute)}
        
        {hasError && (
          <div className="mt-2 text-sm text-red-600 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1" />
            {validationErrors[attributeId]}
          </div>
        )}
        
        {/* Value summary - shows what's been selected for reference */}
        {attributeValue && (attribute.attributeType === 'select' || attribute.attributeType === 'multiselect') && selectedOptions.length > 0 && (
          <div className="mt-3 text-xs text-gray-500">
            Selected: {selectedOptions
              .map(optId => safelyFindOption(attribute, optId)?.displayValue)
              .filter(Boolean)
              .join(', ')}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Product Attributes</h2>
        <p className="text-sm text-gray-500 mb-4">
          Attributes define the properties and specifications of a product. These values help with filtering, searching, and provide important information to customers.
        </p>
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2 w-full max-w-sm">
            <div className="relative w-full">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <Input 
                placeholder="Search attributes..." 
                value={attributeFilter}
                onChange={(e) => setAttributeFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={attributeTypeFilter} onValueChange={setAttributeTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="multiselect">Multi-select</SelectItem>
                <SelectItem value="color">Color</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Tabs defaultValue="required" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="required">Required Attributes</TabsTrigger>
            <TabsTrigger value="optional">Optional Attributes</TabsTrigger>
            <TabsTrigger value="all">All Attributes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="required" className="space-y-4">
            {isLoadingAttributes || isLoadingRequiredAttributes ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : getFilteredAttributes().length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-lg">
                <div className="text-gray-500">
                  {attributeFilter ? (
                    <>No attributes match your search</>
                  ) : (
                    <>No required attributes for this category</>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {getFilteredAttributes().map(attribute => renderAttributeItem(attribute))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="optional" className="space-y-4">
            {isLoadingAttributes || isLoadingRequiredAttributes ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : getFilteredAttributes().length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-lg">
                <div className="text-gray-500">
                  {attributeFilter ? (
                    <>No attributes match your search</>
                  ) : (
                    <>No optional attributes available</>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {getFilteredAttributes().map(attribute => renderAttributeItem(attribute))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="all" className="space-y-4">
            {isLoadingAttributes ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : getFilteredAttributes().length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-lg">
                <div className="text-gray-500">
                  {attributeFilter ? (
                    <>No attributes match your search</>
                  ) : (
                    <>No attributes available</>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {getFilteredAttributes().map(attribute => renderAttributeItem(attribute))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="flex justify-between pt-4 border-t">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => handleSave(false)}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save
            </>
          )}
        </Button>
        
        <Button 
          type="button"
          onClick={() => handleSave(true)}
          disabled={isLoading}
        >
          Continue
        </Button>
      </div>
      
      {/* Add New Option Dialog */}
      <Dialog open={isAddingOption} onOpenChange={setIsAddingOption}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Attribute Option</DialogTitle>
            <DialogDescription>
              Create a new option for attribute: {getAllAttributes().find(a => a.id === currentAttributeId)?.displayName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">
                Value
              </Label>
              <Input
                id="value"
                value={newOptionData.value}
                onChange={(e) => setNewOptionData({ ...newOptionData, value: e.target.value })}
                className="col-span-3"
                placeholder="Internal value (e.g. xl)"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="displayValue" className="text-right">
                Display Value
              </Label>
              <Input
                id="displayValue"
                value={newOptionData.displayValue}
                onChange={(e) => setNewOptionData({ ...newOptionData, displayValue: e.target.value })}
                className="col-span-3"
                placeholder="Customer-facing value (e.g. Extra Large)"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsAddingOption(false)}
            >
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