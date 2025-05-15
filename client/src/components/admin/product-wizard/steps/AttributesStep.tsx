import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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

interface AttributeOption {
  id: number;
  attributeId: number;
  value: string;
  displayValue: string;
  metadata?: any;
  sortOrder?: number;
}

interface AttributeValue {
  attributeId: number;
  value: string | string[] | boolean | number | null;
  attributeName?: string;
  displayName?: string;
  attributeType?: string;
  options?: AttributeOption[];
  selectedOptions?: number[];
  textValue?: string | null;
}

interface AttributesStepProps {
  draft: ProductDraft;
  onSave: (data: Partial<ProductDraft>, advanceToNext?: boolean) => void;
  isLoading?: boolean;
}

export const AttributesStep: React.FC<AttributesStepProps> = ({ draft, onSave, isLoading = false }) => {
  const { toast } = useToast();
  const [attributeValues, setAttributeValues] = useState<AttributeValue[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewAttributeDialog, setShowNewAttributeDialog] = useState(false);
  const [newAttributeData, setNewAttributeData] = useState({ 
    name: '', 
    displayName: '',
    description: '',
    type: 'text' as AttributeType, 
    value: '',
    isRequired: false,
    isFilterable: false 
  });
  const [attributeView, setAttributeView] = useState<'list' | 'grid'>('grid');
  const [attributeFilter, setAttributeFilter] = useState<'all' | 'required' | 'configured'>('all');
  const [expandedSections, setExpandedSections] = useState({ category: true, global: true });
  const [activeTab, setActiveTab] = useState('attributes');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  
  // Tags management
  const [productTags, setProductTags] = useState<string[]>(draft.tags || []);
  const [aiTagSuggestions, setAiTagSuggestions] = useState<string[]>([]);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [aiTagError, setAiTagError] = useState<string | null>(null);
  const [customTag, setCustomTag] = useState('');
  
  // AI Tag Generation Functions
  const generateAITags = async () => {
    if (!draft.name) {
      setAiTagError("Product name is required to generate tags");
      return;
    }
    
    setIsGeneratingTags(true);
    setAiTagError(null);
    
    try {
      const response = await apiRequest("POST", "/api/generate-tags", {
        productName: draft.name,
        productDescription: draft.description || "",
        categoryName: draft.category?.name || "",
        imageUrls: draft.imageUrls || []
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          // Set some tags as active and some as suggestions
          const allTags = result.data.tags || [];
          
          // Get the first 5 tags as active
          const activeTags = allTags.slice(0, 5);
          
          // Get the remaining tags as suggestions
          const suggestions = allTags.slice(5);
          
          setProductTags(activeTags);
          setAiTagSuggestions(suggestions);
          
          // Save the tags to the draft
          handleSaveTags(activeTags);
        } else {
          setAiTagError(result.error || "Failed to generate tags");
        }
      } else {
        setAiTagError("Server error when generating tags");
      }
    } catch (error) {
      setAiTagError("Error generating tags: " + (error as Error).message);
    } finally {
      setIsGeneratingTags(false);
    }
  };
  
  const addCustomTag = () => {
    if (customTag.trim() === "") return;
    
    const newTags = [...productTags, customTag.trim()];
    setProductTags(newTags);
    setCustomTag("");
    
    // Save the tags to the draft
    handleSaveTags(newTags);
  };
  
  const removeTag = (index: number) => {
    const newTags = [...productTags];
    newTags.splice(index, 1);
    setProductTags(newTags);
    
    // Save the tags to the draft
    handleSaveTags(newTags);
  };
  
  const addSuggestedTag = (tag: string) => {
    if (productTags.includes(tag)) return;
    
    const newTags = [...productTags, tag];
    
    // Remove from suggestions
    const newSuggestions = aiTagSuggestions.filter(t => t !== tag);
    
    setProductTags(newTags);
    setAiTagSuggestions(newSuggestions);
    
    // Save the tags to the draft
    handleSaveTags(newTags);
  };
  
  const handleSaveTags = (tags: string[]) => {
    // Save tags to the draft with debouncing (we're updating directly)
    onSave({ tags });
  };

  // Fetch all attributes
  const { data: attributesData, isLoading: isLoadingAttributes } = useQuery({
    queryKey: ['/api/attributes'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/attributes');
      return response.json();
    },
  });

  // Fetch required attributes for this category if one is selected
  const { data: requiredAttributesData, isLoading: isLoadingRequired } = useQuery({
    queryKey: ['/api/categories/required-attributes', draft.categoryId],
    queryFn: async () => {
      if (!draft.categoryId) return { success: true, data: [] };
      const response = await apiRequest('GET', `/api/categories/${draft.categoryId}/required-attributes`);
      return response.json();
    },
    enabled: !!draft.categoryId,
  });

  // Initialize attribute values from the draft
  useEffect(() => {
    if (draft.attributes && draft.attributes.length > 0) {
      // Simple format
      const simpleValues = draft.attributes.map(attr => ({
        attributeId: attr.attributeId,
        value: attr.value
      }));
      
      // Enhanced format (if available)
      if (draft.attributesData && draft.attributesData.length > 0) {
        const enhancedValues = draft.attributesData.map(attr => {
          // Ensure options have attributeId to match AttributeOption interface
          const formattedOptions = attr.options ? 
            attr.options.map(opt => ({
              ...opt,
              attributeId: attr.attributeId // Add missing attributeId
            })) : 
            [];
            
          return {
            attributeId: attr.attributeId,
            attributeName: attr.attributeName,
            displayName: attr.displayName,
            attributeType: attr.attributeType,
            value: null, // Will be populated from the simple attributes
            options: formattedOptions,
            selectedOptions: attr.selectedOptions,
            textValue: attr.textValue
          };
        });
        
        // Merge the simple values with enhanced data
        const mergedValues = enhancedValues.map(enhanced => {
          const simple = simpleValues.find(s => s.attributeId === enhanced.attributeId);
          return {
            ...enhanced,
            value: simple?.value || null
          };
        });
        
        setAttributeValues(mergedValues);
      } else {
        setAttributeValues(simpleValues);
      }
    }
  }, [draft.attributes, draft.attributesData]);

  // Get all attributes from the API data
  const getAllAttributes = (): Attribute[] => {
    if (!attributesData?.success) return [];
    
    const allAttributes = attributesData.data || [];
    const requiredAttrIds = new Set(
      requiredAttributesData?.success && requiredAttributesData?.data ? 
        (requiredAttributesData.data || []).map((attr: any) => attr.attributeId) : 
        []
    );
    
    // Filter by search term
    let filteredAttrs = allAttributes.filter((attr: Attribute) => 
      !searchTerm.trim() || 
      attr.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      attr.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      attr.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Apply additional filters
    if (attributeFilter === 'required') {
      filteredAttrs = filteredAttrs.filter((attr: Attribute) => 
        requiredAttrIds.has(attr.id) || attr.isRequired
      );
    } else if (attributeFilter === 'configured') {
      const configuredIds = new Set(attributeValues.map(v => v.attributeId));
      filteredAttrs = filteredAttrs.filter((attr: Attribute) => 
        configuredIds.has(attr.id)
      );
    }
    
    return filteredAttrs;
  };

  // Handle attribute value changes
  const handleAttributeChange = (attributeId: number, value: string | string[] | boolean | number | null) => {
    const newValues = [...attributeValues];
    const existingIndex = newValues.findIndex(v => v.attributeId === attributeId);
    
    if (existingIndex >= 0) {
      newValues[existingIndex] = { 
        ...newValues[existingIndex],
        value 
      };
    } else {
      // Find attribute details from API data
      const attribute = getAllAttributes().find(a => a.id === attributeId);
      if (attribute) {
        // Ensure options have attributeId to match AttributeOption interface
        const formattedOptions = attribute.options ? 
          attribute.options.map(opt => ({
            ...opt,
            attributeId: attributeId // Ensure attributeId is included
          })) : 
          [];
          
        newValues.push({ 
          attributeId, 
          value,
          attributeName: attribute.name,
          displayName: attribute.displayName,
          attributeType: attribute.attributeType,
          options: formattedOptions
        });
      } else {
        newValues.push({ attributeId, value });
      }
    }
    
    setAttributeValues(newValues);
    
    // Clear validation errors for this attribute
    if (validationErrors[`attribute-${attributeId}`]) {
      const newErrors = { ...validationErrors };
      delete newErrors[`attribute-${attributeId}`];
      setValidationErrors(newErrors);
    }
  };

  // Handle option selection for the enhanced attributes
  const handleOptionSelection = (attributeId: number, optionId: number, isSelected: boolean) => {
    const newValues = [...attributeValues];
    const existingIndex = newValues.findIndex(v => v.attributeId === attributeId);
    
    if (existingIndex >= 0) {
      const currentSelectedOptions = newValues[existingIndex].selectedOptions || [];
      
      if (isSelected) {
        newValues[existingIndex].selectedOptions = [...currentSelectedOptions, optionId];
      } else {
        newValues[existingIndex].selectedOptions = currentSelectedOptions.filter(id => id !== optionId);
      }
      
      // Also update the simple value format for backward compatibility
      const attribute = getAllAttributes().find(a => a.id === attributeId);
      if (attribute) {
        const selectedOptions = newValues[existingIndex].selectedOptions || [];
        const optionValues = selectedOptions
          .map(optId => attribute.options.find(opt => opt.id === optId)?.value)
          .filter(Boolean) as string[];
        
        newValues[existingIndex].value = attribute.attributeType === 'multiselect' ? 
          optionValues : 
          optionValues[0] || null;
      }
    } else {
      // Add new selection
      const attribute = getAllAttributes().find(a => a.id === attributeId);
      if (attribute) {
        const selectedOptions = [optionId];
        const optionValues = selectedOptions
          .map(optId => attribute.options.find(opt => opt.id === optId)?.value)
          .filter(Boolean) as string[];
        
        // Ensure options have attributeId to match AttributeOption interface
        const formattedOptions = attribute.options ? 
          attribute.options.map(opt => ({
            ...opt,
            attributeId: attributeId // Ensure attributeId is included
          })) : 
          [];
        
        newValues.push({
          attributeId,
          value: attribute.attributeType === 'multiselect' ? optionValues : optionValues[0] || null,
          attributeName: attribute.name,
          displayName: attribute.displayName,
          attributeType: attribute.attributeType,
          options: formattedOptions,
          selectedOptions
        });
      }
    }
    
    setAttributeValues(newValues);
    
    // Clear validation errors for this attribute
    if (validationErrors[`attribute-${attributeId}`]) {
      const newErrors = { ...validationErrors };
      delete newErrors[`attribute-${attributeId}`];
      setValidationErrors(newErrors);
    }
  };

  // Handle text value changes for the enhanced attributes
  const handleTextValueChange = (attributeId: number, textValue: string) => {
    const newValues = [...attributeValues];
    const existingIndex = newValues.findIndex(v => v.attributeId === attributeId);
    
    if (existingIndex >= 0) {
      newValues[existingIndex].textValue = textValue;
      // Also update simple value for backward compatibility
      newValues[existingIndex].value = textValue;
    } else {
      // Add new text value
      const attribute = getAllAttributes().find(a => a.id === attributeId);
      if (attribute) {
        // Ensure options have attributeId to match AttributeOption interface
        const formattedOptions = attribute.options ? 
          attribute.options.map(opt => ({
            ...opt,
            attributeId: attributeId // Ensure attributeId is included
          })) : 
          [];
          
        newValues.push({
          attributeId,
          value: textValue,
          textValue,
          attributeName: attribute.name,
          displayName: attribute.displayName,
          attributeType: attribute.attributeType,
          options: formattedOptions
        });
      }
    }
    
    setAttributeValues(newValues);
    
    // Clear validation errors for this attribute
    if (validationErrors[`attribute-${attributeId}`]) {
      const newErrors = { ...validationErrors };
      delete newErrors[`attribute-${attributeId}`];
      setValidationErrors(newErrors);
    }
  };

  // Get value for a specific attribute
  const getAttributeValue = (attributeId: number) => {
    const attrValue = attributeValues.find(v => v.attributeId === attributeId);
    return attrValue ? attrValue.value : null;
  };

  // Get selected options for a specific attribute
  const getSelectedOptions = (attributeId: number): number[] => {
    const attrValue = attributeValues.find(v => v.attributeId === attributeId);
    return attrValue?.selectedOptions || [];
  };

  // Get text value for a specific attribute
  const getTextValue = (attributeId: number): string => {
    const attrValue = attributeValues.find(v => v.attributeId === attributeId);
    return attrValue?.textValue || '';
  };

  // Create new custom attribute
  const handleCreateAttribute = async () => {
    setIsSubmitting(true);
    
    try {
      // Create a new attribute
      const createResponse = await apiRequest('POST', '/api/attributes', {
        name: newAttributeData.name,
        displayName: newAttributeData.displayName || newAttributeData.name,
        description: newAttributeData.description,
        attributeType: newAttributeData.type,
        isRequired: newAttributeData.isRequired,
        isFilterable: newAttributeData.isFilterable,
        options: newAttributeData.type === 'select' || newAttributeData.type === 'multiselect' || newAttributeData.type === 'color'
          ? [{ 
              value: newAttributeData.value, 
              displayValue: newAttributeData.value,
              metadata: newAttributeData.type === 'color' ? { colorCode: newAttributeData.value } : undefined
            }] 
          : []
      });
      
      const createData = await createResponse.json();
      
      if (createData.success) {
        // Set the value for the new attribute
        const newAttr = createData.data;
        
        // Add to attribute values
        const value = 
          newAttributeData.type === 'boolean' ? true : 
          newAttributeData.type === 'number' ? Number(newAttributeData.value) : 
          newAttributeData.type === 'multiselect' ? [newAttributeData.value] :
          newAttributeData.value;
          
        // Add with enhanced data
        handleAttributeChange(newAttr.id, value);
        
        toast({
          title: 'Attribute Created',
          description: 'New attribute has been added to the product',
        });
        
        // Reset the form
        setNewAttributeData({ 
          name: '', 
          displayName: '',
          description: '',
          type: 'text', 
          value: '',
          isRequired: false,
          isFilterable: false
        });
        setShowNewAttributeDialog(false);
      } else {
        throw new Error(createData.error?.message || 'Failed to create attribute');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create attribute',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validate attributes before saving
  const validateAttributes = (): boolean => {
    const errors: Record<string, string[]> = {};
    let isValid = true;
    
    // Get required attributes
    const requiredAttrIds = new Set(
      requiredAttributesData?.success && requiredAttributesData?.data ? 
        (requiredAttributesData.data || []).map((attr: any) => attr.attributeId) : 
        []
    );
    
    // Check all required attributes
    getAllAttributes().forEach(attr => {
      const isRequired = requiredAttrIds.has(attr.id) || attr.isRequired;
      if (isRequired) {
        const value = getAttributeValue(attr.id);
        const selectedOptions = getSelectedOptions(attr.id);
        const textValue = getTextValue(attr.id);
        
        // Check if the attribute has a value
        if (
          (value === null || value === '' || (Array.isArray(value) && value.length === 0)) &&
          (selectedOptions.length === 0) &&
          (!textValue || textValue.trim() === '')
        ) {
          errors[`attribute-${attr.id}`] = [`${attr.displayName} is required`];
          isValid = false;
        }
      }
    });
    
    setValidationErrors(errors);
    return isValid;
  };

  // Save attributes
  const handleSaveAttributes = (advanceToNext: boolean = false) => {
    if (!validateAttributes()) {
      toast({
        title: 'Validation Failed',
        description: 'Please fill in all required attributes',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Format attribute values for the API
      const formattedAttributes = attributeValues.map(attr => {
        // Convert any non-string, non-array values to strings to match ProductDraft interface
        let value = attr.value;
        if (value !== null && typeof value !== 'string' && !Array.isArray(value)) {
          value = String(value);
        }
        
        return {
          attributeId: attr.attributeId,
          value: value
        };
      });
      
      // Format enhanced attribute data
      const attributesData = attributeValues.map(attr => {
        const attribute = getAllAttributes().find(a => a.id === attr.attributeId);
        
        // Ensure options include the attributeId property to match AttributeOption interface
        const formattedOptions = attribute?.options ? 
          attribute.options.map(opt => ({
            ...opt,
            attributeId: attr.attributeId // Ensure attributeId is included
          })) : 
          [];
        
        return {
          attributeId: attr.attributeId,
          attributeName: attr.attributeName || attribute?.name || '',
          displayName: attr.displayName || attribute?.displayName || '',
          attributeType: attr.attributeType || attribute?.attributeType || 'text',
          isRequired: attribute?.isRequired || false,
          options: formattedOptions,
          selectedOptions: attr.selectedOptions || [],
          textValue: attr.textValue || null
        };
      });
      
      onSave({ 
        attributes: formattedAttributes,
        attributesData
      }, advanceToNext);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if an attribute is required
  const isAttributeRequired = (attributeId: number) => {
    if (!requiredAttributesData?.success || !requiredAttributesData?.data) return false;
    
    return (requiredAttributesData.data || []).some(
      (attr: any) => attr.attributeId === attributeId
    ) || getAllAttributes().find(attr => attr.id === attributeId)?.isRequired || false;
  };

  // Render enhanced attribute input based on attribute type
  const renderEnhancedAttributeInput = (attribute: Attribute) => {
    const isRequired = isAttributeRequired(attribute.id);
    const hasError = !!validationErrors[`attribute-${attribute.id}`];
    const selectedOptions = getSelectedOptions(attribute.id);
    const textValue = getTextValue(attribute.id);
    
    switch (attribute.attributeType) {
      case 'text':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={`attr-${attribute.id}`} className={hasError ? 'text-red-500' : ''}>
                {attribute.displayName}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{attribute.description || `Enter text for ${attribute.displayName}`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea 
              id={`attr-${attribute.id}`}
              value={textValue}
              onChange={(e) => handleTextValueChange(attribute.id, e.target.value)}
              placeholder={`Enter ${attribute.displayName.toLowerCase()}`}
              className={`resize-none ${hasError ? 'border-red-500' : ''}`}
            />
            {hasError && (
              <p className="text-sm text-red-500">{validationErrors[`attribute-${attribute.id}`][0]}</p>
            )}
          </div>
        );
        
      case 'number':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={`attr-${attribute.id}`} className={hasError ? 'text-red-500' : ''}>
                {attribute.displayName}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{attribute.description || `Enter a number for ${attribute.displayName}`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input 
              id={`attr-${attribute.id}`}
              type="number"
              value={textValue}
              onChange={(e) => handleTextValueChange(attribute.id, e.target.value)}
              placeholder={`Enter ${attribute.displayName.toLowerCase()}`}
              className={hasError ? 'border-red-500' : ''}
            />
            {hasError && (
              <p className="text-sm text-red-500">{validationErrors[`attribute-${attribute.id}`][0]}</p>
            )}
          </div>
        );
        
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={`attr-${attribute.id}`}
              checked={!!getAttributeValue(attribute.id)}
              onCheckedChange={(checked) => handleAttributeChange(attribute.id, checked)}
            />
            <Label 
              htmlFor={`attr-${attribute.id}`} 
              className={`cursor-pointer ${hasError ? 'text-red-500' : ''}`}
            >
              {attribute.displayName}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{attribute.description || `Toggle ${attribute.displayName}`}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {hasError && (
              <p className="text-sm text-red-500">{validationErrors[`attribute-${attribute.id}`][0]}</p>
            )}
          </div>
        );
        
      case 'select':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={`attr-${attribute.id}`} className={hasError ? 'text-red-500' : ''}>
                {attribute.displayName}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{attribute.description || `Select a value for ${attribute.displayName}`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select 
              value={selectedOptions[0]?.toString() || ''}
              onValueChange={(val) => handleOptionSelection(attribute.id, parseInt(val), true)}
            >
              <SelectTrigger 
                id={`attr-${attribute.id}`}
                className={hasError ? 'border-red-500' : ''}
              >
                <SelectValue placeholder={`Select ${attribute.displayName.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {attribute.options.map((option) => (
                  <SelectItem key={option.id} value={option.id.toString()}>
                    {option.displayValue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && (
              <p className="text-sm text-red-500">{validationErrors[`attribute-${attribute.id}`][0]}</p>
            )}
          </div>
        );
        
      case 'multiselect':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className={hasError ? 'text-red-500' : ''}>
                {attribute.displayName}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{attribute.description || `Select options for ${attribute.displayName}`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedOptions.map((optionId) => {
                const option = attribute.options.find(opt => opt.id === optionId);
                return option ? (
                  <Badge key={optionId} variant="secondary" className="flex items-center gap-1">
                    {option.displayValue}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleOptionSelection(attribute.id, optionId, false)}
                    />
                  </Badge>
                ) : null;
              })}
            </div>
            <Select 
              value=""
              onValueChange={(val) => handleOptionSelection(attribute.id, parseInt(val), true)}
            >
              <SelectTrigger 
                id={`attr-${attribute.id}`}
                className={hasError ? 'border-red-500' : ''}
              >
                <SelectValue placeholder={`Add ${attribute.displayName.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {attribute.options
                  .filter(option => !selectedOptions.includes(option.id))
                  .map((option) => (
                    <SelectItem key={option.id} value={option.id.toString()}>
                      {option.displayValue}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
            {hasError && (
              <p className="text-sm text-red-500">{validationErrors[`attribute-${attribute.id}`][0]}</p>
            )}
          </div>
        );
        
      case 'color':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className={hasError ? 'text-red-500' : ''}>
                {attribute.displayName}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{attribute.description || `Select colors for ${attribute.displayName}`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex flex-wrap gap-3 mb-3">
              {attribute.options.map((option) => {
                const colorCode = option.metadata?.colorCode || '#CCCCCC';
                const isSelected = selectedOptions.includes(option.id);
                return (
                  <div 
                    key={option.id} 
                    className={`
                      w-8 h-8 rounded-full cursor-pointer border-2 flex items-center justify-center
                      ${isSelected ? 'border-primary' : 'border-gray-200'}
                    `}
                    style={{ backgroundColor: colorCode }}
                    onClick={() => handleOptionSelection(attribute.id, option.id, !isSelected)}
                    title={option.displayValue}
                  >
                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                );
              })}
            </div>
            {hasError && (
              <p className="text-sm text-red-500">{validationErrors[`attribute-${attribute.id}`][0]}</p>
            )}
          </div>
        );
        
      case 'date':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={`attr-${attribute.id}`} className={hasError ? 'text-red-500' : ''}>
                {attribute.displayName}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{attribute.description || `Select a date for ${attribute.displayName}`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input 
              id={`attr-${attribute.id}`}
              type="date"
              value={textValue}
              onChange={(e) => handleTextValueChange(attribute.id, e.target.value)}
              className={hasError ? 'border-red-500' : ''}
            />
            {hasError && (
              <p className="text-sm text-red-500">{validationErrors[`attribute-${attribute.id}`][0]}</p>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };
  
  // Render attribute cards or list items
  const renderAttributeItem = (attribute: Attribute) => {
    const isRequired = isAttributeRequired(attribute.id);
    
    if (attributeView === 'grid') {
      return (
        <Card key={attribute.id} className={`overflow-hidden ${validationErrors[`attribute-${attribute.id}`] ? 'border-red-500' : ''}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-md flex items-center gap-2">
                {attribute.displayName}
                {isRequired && <Badge variant="destructive" className="ml-1 text-xs">Required</Badge>}
                {attribute.isFilterable && <Badge variant="outline" className="ml-1 text-xs">Filterable</Badge>}
              </CardTitle>
            </div>
            {attribute.description && (
              <CardDescription>{attribute.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {renderEnhancedAttributeInput(attribute)}
          </CardContent>
        </Card>
      );
    } else {
      return (
        <div key={attribute.id} className={`border-b py-3 ${validationErrors[`attribute-${attribute.id}`] ? 'border-red-500 bg-red-50 p-2 rounded' : ''}`}>
          <div className="flex md:items-center justify-between flex-col md:flex-row gap-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{attribute.displayName}</h4>
              {isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
              {attribute.isFilterable && <Badge variant="outline" className="text-xs">Filterable</Badge>}
              {attribute.description && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{attribute.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="w-full md:w-1/2">
              {renderEnhancedAttributeInput(attribute)}
            </div>
          </div>
        </div>
      );
    }
  };

  // Render the attribute management content
  const renderAttributesContent = () => {
    const allAttributes = getAllAttributes();
    
    if (isLoadingAttributes || isLoadingRequired) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Loading attributes...</span>
        </div>
      );
    }
    
    if (allAttributes.length === 0) {
      return (
        <div className="text-center p-8 border rounded-md">
          <Tag className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <h4 className="text-lg font-medium">No Attributes Found</h4>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 
              `No attributes matching "${searchTerm}"` : 
              draft.categoryId ? 
                "This category doesn't have any attributes yet." : 
                "Please select a category first or add custom attributes."
            }
          </p>
          <Button variant="outline" onClick={() => setShowNewAttributeDialog(true)}>
            Add Custom Attribute
          </Button>
        </div>
      );
    }
    
    return attributeView === 'grid' ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allAttributes.map(renderAttributeItem)}
      </div>
    ) : (
      <div className="space-y-1">
        {allAttributes.map(renderAttributeItem)}
      </div>
    );
  };

  // Render attribute statistics and summary
  const renderAttributeSummary = () => {
    const attributes = getAllAttributes();
    const requiredAttributes = attributes.filter(attr => isAttributeRequired(attr.id));
    const configuredAttributes = attributeValues.filter(value => {
      const hasValue = value.value !== null && value.value !== '' && 
                       (!Array.isArray(value.value) || value.value.length > 0);
      const hasSelectedOptions = value.selectedOptions && value.selectedOptions.length > 0;
      const hasTextValue = value.textValue && value.textValue.trim() !== '';
      
      return hasValue || hasSelectedOptions || hasTextValue;
    });
    
    const requiredConfigured = requiredAttributes.filter(attr => 
      configuredAttributes.some(val => val.attributeId === attr.id)
    );
    
    const requiredProgress = requiredAttributes.length > 0 
      ? Math.round((requiredConfigured.length / requiredAttributes.length) * 100) 
      : 100;
    
    return (
      <div className="p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-2">Attribute Progress</h4>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm">Required Attributes</span>
              <span className="text-sm font-medium">{requiredConfigured.length}/{requiredAttributes.length}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${requiredProgress === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                style={{ width: `${requiredProgress}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm">Total Attributes</span>
              <span className="text-sm font-medium">{configuredAttributes.length}/{attributes.length}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${attributes.length > 0 ? (configuredAttributes.length / attributes.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          
          {requiredAttributes.length > 0 && requiredProgress < 100 && (
            <div className="flex items-start mt-3 bg-amber-50 p-2 rounded border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                Some required attributes haven't been configured yet. Complete them before proceeding to the next step.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h3 className="text-lg font-medium">Product Attributes</h3>
          <p className="text-muted-foreground text-sm">Define the attributes and specifications of your product</p>
        </div>
        <Button variant="outline" onClick={() => setShowNewAttributeDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Attribute
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="attributes" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search attributes..."
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <ToggleGroup type="single" value={attributeFilter} onValueChange={(value) => value && setAttributeFilter(value as any)}>
                <ToggleGroupItem value="all" size="sm">All</ToggleGroupItem>
                <ToggleGroupItem value="required" size="sm">Required</ToggleGroupItem>
                <ToggleGroupItem value="configured" size="sm">Configured</ToggleGroupItem>
              </ToggleGroup>
              
              <Separator orientation="vertical" className="h-6" />
              
              <ToggleGroup type="single" value={attributeView} onValueChange={(value) => value && setAttributeView(value as any)}>
                <ToggleGroupItem value="grid" size="sm" className="px-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>
                </ToggleGroupItem>
                <ToggleGroupItem value="list" size="sm" className="px-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          
          <ScrollArea className="h-[500px] pr-4">
            {renderAttributesContent()}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="tags" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>AI Tag Suggestions</CardTitle>
                  <CardDescription>Generate tags based on product data</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={generateAITags}
                  disabled={isGeneratingTags || !draft.name}
                >
                  {isGeneratingTags ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3.5 w-3.5" />
                      <span>Generate Tags</span>
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {productTags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="px-3 py-1 flex items-center gap-1 group hover:bg-secondary"
                    >
                      <span>{tag}</span>
                      <X 
                        className="h-3 w-3 text-muted-foreground cursor-pointer opacity-70 group-hover:opacity-100" 
                        onClick={() => removeTag(index)}
                      />
                    </Badge>
                  ))}
                  {productTags.length === 0 && (
                    <div className="text-muted-foreground text-sm flex gap-2 items-center">
                      <Tag size={16} />
                      <span>No tags yet. Click "Generate Tags" to create AI-powered tags</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Add custom tag"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customTag.trim() !== '') {
                          addCustomTag();
                          e.preventDefault();
                        }
                      }}
                    />
                  </div>
                  <Button 
                    onClick={addCustomTag} 
                    variant="secondary" 
                    size="sm"
                    disabled={customTag.trim() === ''}
                  >
                    Add
                  </Button>
                </div>
                
                {aiTagError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm flex gap-2 items-start">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{aiTagError}</span>
                  </div>
                )}
                
                {aiTagSuggestions.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="text-sm font-medium">Additional Suggestions</h4>
                    <div className="flex flex-wrap gap-2">
                      {aiTagSuggestions.map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="px-3 py-1 cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => addSuggestedTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="summary" className="space-y-6">
          {renderAttributeSummary()}
          
          <div className="space-y-4">
            <h4 className="font-medium">Configured Attributes</h4>
            {attributeValues.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 font-medium text-sm grid grid-cols-3">
                  <div>Attribute</div>
                  <div>Type</div>
                  <div>Value</div>
                </div>
                <div className="divide-y">
                  {attributeValues
                    .filter(attr => {
                      const hasValue = attr.value !== null && attr.value !== '' && 
                                       (!Array.isArray(attr.value) || attr.value.length > 0);
                      const hasSelectedOptions = attr.selectedOptions && attr.selectedOptions.length > 0;
                      const hasTextValue = attr.textValue && attr.textValue.trim() !== '';
                      
                      return hasValue || hasSelectedOptions || hasTextValue;
                    })
                    .map(attr => {
                      const attribute = getAllAttributes().find(a => a.id === attr.attributeId);
                      let displayValue = '';
                      
                      if (attr.selectedOptions && attr.selectedOptions.length > 0) {
                        displayValue = attr.selectedOptions
                          .map(optId => attribute?.options.find(opt => opt.id === optId)?.displayValue)
                          .filter(Boolean)
                          .join(', ');
                      } else if (attr.textValue) {
                        displayValue = attr.textValue;
                      } else if (attr.value !== null) {
                        if (typeof attr.value === 'boolean') {
                          displayValue = attr.value ? 'Yes' : 'No';
                        } else if (Array.isArray(attr.value)) {
                          displayValue = attr.value.join(', ');
                        } else {
                          displayValue = String(attr.value);
                        }
                      }
                      
                      return (
                        <div key={attr.attributeId} className="px-4 py-3 grid grid-cols-3 text-sm">
                          <div className="font-medium">{attribute?.displayName || attr.displayName || `Attribute #${attr.attributeId}`}</div>
                          <div>{attribute?.attributeType || attr.attributeType || 'text'}</div>
                          <div className="truncate">{displayValue}</div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            ) : (
              <div className="text-center p-8 border rounded-md">
                <p className="text-muted-foreground">No attributes have been configured yet</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Dialog for adding custom attribute */}
      <Dialog open={showNewAttributeDialog} onOpenChange={setShowNewAttributeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Custom Attribute</DialogTitle>
            <DialogDescription>
              Create a new attribute for this product. You can reuse it for other products later.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="attribute-name">Internal Name</Label>
                <Input
                  id="attribute-name"
                  value={newAttributeData.name}
                  onChange={(e) => setNewAttributeData({...newAttributeData, name: e.target.value})}
                  placeholder="e.g. color, size, material"
                />
                <p className="text-xs text-muted-foreground">Used for system identification</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="attribute-display-name">Display Name</Label>
                <Input
                  id="attribute-display-name"
                  value={newAttributeData.displayName}
                  onChange={(e) => setNewAttributeData({...newAttributeData, displayName: e.target.value})}
                  placeholder="e.g. Color, Size, Material"
                />
                <p className="text-xs text-muted-foreground">Shown to customers</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="attribute-description">Description (Optional)</Label>
              <Textarea
                id="attribute-description"
                value={newAttributeData.description}
                onChange={(e) => setNewAttributeData({...newAttributeData, description: e.target.value})}
                placeholder="Describe what this attribute represents"
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">Helps explain this attribute's purpose</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="attribute-type">Attribute Type</Label>
              <Select
                value={newAttributeData.type}
                onValueChange={(val) => setNewAttributeData({...newAttributeData, type: val as AttributeType})}
              >
                <SelectTrigger id="attribute-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Yes/No</SelectItem>
                  <SelectItem value="select">Single Choice</SelectItem>
                  <SelectItem value="multiselect">Multiple Choice</SelectItem>
                  <SelectItem value="color">Color</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Determines the input type for this attribute</p>
            </div>
            
            {(newAttributeData.type === 'text' || newAttributeData.type === 'number' || 
             newAttributeData.type === 'select' || newAttributeData.type === 'multiselect' ||
             newAttributeData.type === 'color') && (
              <div className="space-y-2">
                <Label htmlFor="attribute-value">
                  {newAttributeData.type === 'select' || newAttributeData.type === 'multiselect' || newAttributeData.type === 'color'
                    ? 'First Option Value' 
                    : 'Default Value'}
                </Label>
                <Input
                  id="attribute-value"
                  type={newAttributeData.type === 'number' ? 'number' : newAttributeData.type === 'color' ? 'color' : 'text'}
                  value={newAttributeData.value}
                  onChange={(e) => setNewAttributeData({...newAttributeData, value: e.target.value})}
                  placeholder={
                    newAttributeData.type === 'select' || newAttributeData.type === 'multiselect'
                      ? 'e.g. Red, Large, Cotton'
                      : 'Enter default value'
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {newAttributeData.type === 'select' || newAttributeData.type === 'multiselect' || newAttributeData.type === 'color'
                    ? 'You can add more options later' 
                    : 'Initial value for this attribute'}
                </p>
              </div>
            )}
            
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="attribute-required"
                  checked={newAttributeData.isRequired}
                  onCheckedChange={(checked) => setNewAttributeData({...newAttributeData, isRequired: !!checked})}
                />
                <Label htmlFor="attribute-required">Required</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="attribute-filterable"
                  checked={newAttributeData.isFilterable}
                  onCheckedChange={(checked) => setNewAttributeData({...newAttributeData, isFilterable: !!checked})}
                />
                <Label htmlFor="attribute-filterable">Filterable</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAttributeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAttribute}
              disabled={isSubmitting || !newAttributeData.name || (
                (newAttributeData.type === 'text' || 
                 newAttributeData.type === 'number' || 
                 newAttributeData.type === 'select' || 
                 newAttributeData.type === 'multiselect' ||
                 newAttributeData.type === 'color') && 
                !newAttributeData.value
              )}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Attribute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Action buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div>
          <p className="text-sm text-muted-foreground">
            {attributeValues.filter(attr => {
              const hasValue = attr.value !== null && attr.value !== '' && 
                               (!Array.isArray(attr.value) || attr.value.length > 0);
              const hasSelectedOptions = attr.selectedOptions && attr.selectedOptions.length > 0;
              const hasTextValue = attr.textValue && attr.textValue.trim() !== '';
              
              return hasValue || hasSelectedOptions || hasTextValue;
            }).length} attribute{attributeValues.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleSaveAttributes(false)}
            disabled={isLoading || isSubmitting}
          >
            {(isLoading || isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
          <Button 
            onClick={() => handleSaveAttributes(true)}
            disabled={isLoading || isSubmitting}
          >
            {(isLoading || isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Next
          </Button>
        </div>
      </div>
    </div>
  );
};