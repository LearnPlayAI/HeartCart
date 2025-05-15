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
import { Loader2, Plus, Search, Tag, Save, X, ChevronRight, ChevronDown } from 'lucide-react';
import type { ProductDraft } from '../ProductWizard';

// Define the attribute types
type AttributeType = 'text' | 'number' | 'boolean' | 'select' | 'multiselect';

interface Attribute {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  type: AttributeType;
  required: boolean;
  options: AttributeOption[];
  categoryIds: number[] | null;
}

interface AttributeOption {
  id: number;
  attributeId: number;
  value: string;
  label: string | null;
  sortOrder: number | null;
}

interface AttributeValue {
  attributeId: number;
  value: string | string[] | boolean | number | null;
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
  const [newAttributeData, setNewAttributeData] = useState({ name: '', type: 'text' as AttributeType, value: '' });
  const [categoryAttributes, setCategoryAttributes] = useState<Attribute[]>([]);
  const [globalAttributes, setGlobalAttributes] = useState<Attribute[]>([]);
  const [expandedSections, setExpandedSections] = useState({ category: true, global: true });

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
      setAttributeValues(draft.attributes.map(attr => ({
        attributeId: attr.attributeId,
        value: attr.value
      })));
    }
  }, [draft.attributes]);

  // Sort attributes when data is loaded 
  useEffect(() => {
    if (attributesData?.success && requiredAttributesData?.success) {
      // Get all attributes and required attribute IDs
      const allAttributes = attributesData.data || [];
      const requiredAttributeIds = new Set(
        (requiredAttributesData.data || []).map((attr: any) => attr.attributeId)
      );

      // Category-specific attributes
      const categoryAttrs = allAttributes.filter((attr: Attribute) => 
        attr.categoryIds?.includes(draft.categoryId || 0) || requiredAttributeIds.has(attr.id)
      );
      
      // Global attributes (not category-specific)
      const globalAttrs = allAttributes.filter((attr: Attribute) => 
        !attr.categoryIds || attr.categoryIds.length === 0
      );
      
      setCategoryAttributes(categoryAttrs);
      setGlobalAttributes(globalAttrs);
    }
  }, [attributesData, requiredAttributesData, draft.categoryId]);

  // Get all attributes (combined and filtered by search)
  const getAllAttributes = () => {
    const allAttributes = [...categoryAttributes, ...globalAttributes];
    
    if (!searchTerm.trim()) return allAttributes;
    
    return allAttributes.filter(attr => 
      attr.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      attr.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Handle attribute value changes
  const handleAttributeChange = (attributeId: number, value: string | string[] | boolean | number | null) => {
    const newValues = [...attributeValues];
    const existingIndex = newValues.findIndex(v => v.attributeId === attributeId);
    
    if (existingIndex >= 0) {
      newValues[existingIndex] = { attributeId, value };
    } else {
      newValues.push({ attributeId, value });
    }
    
    setAttributeValues(newValues);
  };

  // Get value for a specific attribute
  const getAttributeValue = (attributeId: number) => {
    const attrValue = attributeValues.find(v => v.attributeId === attributeId);
    return attrValue ? attrValue.value : null;
  };

  // Create new custom attribute
  const handleCreateAttribute = async () => {
    try {
      // Create a new attribute
      const createResponse = await apiRequest('POST', '/api/attributes', {
        name: newAttributeData.name,
        type: newAttributeData.type,
        required: false,
        options: newAttributeData.type === 'select' || newAttributeData.type === 'multiselect' 
          ? [{ value: newAttributeData.value, label: newAttributeData.value }] 
          : []
      });
      
      const createData = await createResponse.json();
      
      if (createData.success) {
        // Set the value for the new attribute
        const newAttr = createData.data;
        
        // Add to attribute values
        handleAttributeChange(newAttr.id, 
          newAttributeData.type === 'boolean' ? true : 
          newAttributeData.type === 'number' ? Number(newAttributeData.value) : 
          newAttributeData.type === 'multiselect' ? [newAttributeData.value] :
          newAttributeData.value
        );
        
        toast({
          title: 'Attribute Created',
          description: 'New attribute has been added to the product',
        });
        
        // Reset the form
        setNewAttributeData({ name: '', type: 'text', value: '' });
        setShowNewAttributeDialog(false);
        
        // Refresh attributes list
        await apiRequest('GET', '/api/attributes');
      } else {
        throw new Error(createData.error?.message || 'Failed to create attribute');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create attribute',
        variant: 'destructive',
      });
    }
  };

  // Save attributes
  const handleSaveAttributes = (advanceToNext: boolean = false) => {
    // Format attribute values for the API
    const formattedAttributes = attributeValues.map(attr => ({
      attributeId: attr.attributeId,
      value: attr.value
    }));
    
    onSave({ attributes: formattedAttributes }, advanceToNext);
  };

  // Check if an attribute is required
  const isAttributeRequired = (attributeId: number) => {
    if (!requiredAttributesData?.success) return false;
    
    return (requiredAttributesData.data || []).some(
      (attr: any) => attr.attributeId === attributeId
    );
  };

  // Render input field based on attribute type
  const renderAttributeInput = (attribute: Attribute) => {
    const value = getAttributeValue(attribute.id);
    const isRequired = isAttributeRequired(attribute.id);
    
    switch (attribute.type) {
      case 'text':
        return (
          <div className="space-y-2">
            <Label htmlFor={`attr-${attribute.id}`}>
              {attribute.name}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea 
              id={`attr-${attribute.id}`}
              value={value as string || ''}
              onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
              placeholder={`Enter ${attribute.name.toLowerCase()}`}
              className="resize-none"
            />
            {attribute.description && (
              <p className="text-sm text-muted-foreground">{attribute.description}</p>
            )}
          </div>
        );
        
      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={`attr-${attribute.id}`}>
              {attribute.name}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input 
              id={`attr-${attribute.id}`}
              type="number"
              value={value as number || ''}
              onChange={(e) => handleAttributeChange(attribute.id, e.target.valueAsNumber || null)}
              placeholder={`Enter ${attribute.name.toLowerCase()}`}
            />
            {attribute.description && (
              <p className="text-sm text-muted-foreground">{attribute.description}</p>
            )}
          </div>
        );
        
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={`attr-${attribute.id}`}
              checked={value as boolean || false}
              onCheckedChange={(checked) => handleAttributeChange(attribute.id, checked)}
            />
            <Label htmlFor={`attr-${attribute.id}`} className="cursor-pointer">
              {attribute.name}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {attribute.description && (
              <p className="text-sm text-muted-foreground ml-2">{attribute.description}</p>
            )}
          </div>
        );
        
      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={`attr-${attribute.id}`}>
              {attribute.name}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select 
              value={value as string || ''}
              onValueChange={(val) => handleAttributeChange(attribute.id, val)}
            >
              <SelectTrigger id={`attr-${attribute.id}`}>
                <SelectValue placeholder={`Select ${attribute.name.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {attribute.options.map((option) => (
                  <SelectItem key={option.id} value={option.value}>
                    {option.label || option.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {attribute.description && (
              <p className="text-sm text-muted-foreground">{attribute.description}</p>
            )}
          </div>
        );
        
      case 'multiselect':
        const selectedValues = (value as string[]) || [];
        return (
          <div className="space-y-2">
            <Label>
              {attribute.name}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedValues.map((val) => (
                <Badge key={val} variant="secondary" className="flex items-center gap-1">
                  {val}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => {
                      const newValues = selectedValues.filter(v => v !== val);
                      handleAttributeChange(attribute.id, newValues.length > 0 ? newValues : null);
                    }} 
                  />
                </Badge>
              ))}
            </div>
            <Select 
              value=""
              onValueChange={(val) => {
                const newValues = [...selectedValues, val];
                handleAttributeChange(attribute.id, newValues);
              }}
            >
              <SelectTrigger id={`attr-${attribute.id}`}>
                <SelectValue placeholder={`Add ${attribute.name.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {attribute.options
                  .filter(option => !selectedValues.includes(option.value))
                  .map((option) => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label || option.value}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
            {attribute.description && (
              <p className="text-sm text-muted-foreground">{attribute.description}</p>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Product Attributes</h3>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setShowNewAttributeDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Custom
          </Button>
        </div>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search attributes..."
          className="pl-10"
        />
      </div>
      
      {isLoadingAttributes || isLoadingRequired ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Loading attributes...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Category-specific attributes */}
          {draft.categoryId && categoryAttributes.length > 0 && (
            <Card>
              <CardHeader 
                className="pb-2 cursor-pointer" 
                onClick={() => setExpandedSections({...expandedSections, category: !expandedSections.category})}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-md">
                    {draft.category?.name || 'Category'} Attributes
                  </CardTitle>
                  {expandedSections.category ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>
                <CardDescription>
                  Attributes specific to this product category
                </CardDescription>
              </CardHeader>
              
              {expandedSections.category && (
                <CardContent className="pt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                  {categoryAttributes
                    .filter(attr => searchTerm === '' || 
                      attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      attr.description?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(attribute => (
                      <div key={attribute.id}>
                        {renderAttributeInput(attribute)}
                      </div>
                    ))
                  }
                  
                  {categoryAttributes.length > 0 && 
                    categoryAttributes.filter(attr => 
                      searchTerm === '' || 
                      attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      attr.description?.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length === 0 && (
                      <div className="col-span-full text-center py-4 text-muted-foreground">
                        No matching category attributes found.
                      </div>
                    )
                  }
                </CardContent>
              )}
            </Card>
          )}
          
          {/* Global attributes */}
          {globalAttributes.length > 0 && (
            <Card>
              <CardHeader 
                className="pb-2 cursor-pointer" 
                onClick={() => setExpandedSections({...expandedSections, global: !expandedSections.global})}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-md">
                    General Attributes
                  </CardTitle>
                  {expandedSections.global ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>
                <CardDescription>
                  Attributes applicable to all products
                </CardDescription>
              </CardHeader>
              
              {expandedSections.global && (
                <CardContent className="pt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                  {globalAttributes
                    .filter(attr => searchTerm === '' || 
                      attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      attr.description?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(attribute => (
                      <div key={attribute.id}>
                        {renderAttributeInput(attribute)}
                      </div>
                    ))
                  }
                  
                  {globalAttributes.length > 0 && 
                    globalAttributes.filter(attr => 
                      searchTerm === '' || 
                      attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      attr.description?.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length === 0 && (
                      <div className="col-span-full text-center py-4 text-muted-foreground">
                        No matching general attributes found.
                      </div>
                    )
                  }
                </CardContent>
              )}
            </Card>
          )}
          
          {/* If no attributes for the search term */}
          {searchTerm !== '' && getAllAttributes().length === 0 && (
            <div className="text-center py-8 border rounded-md">
              <Tag className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium mb-1">No matching attributes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                No attributes match your search term. Try a different search or create a custom attribute.
              </p>
              <Button variant="outline" onClick={() => setShowNewAttributeDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create new attribute
              </Button>
            </div>
          )}
          
          {/* If no attributes at all */}
          {!draft.categoryId && categoryAttributes.length === 0 && globalAttributes.length === 0 && searchTerm === '' && (
            <div className="text-center py-8 border rounded-md">
              <Tag className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium mb-1">No attributes defined</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {draft.categoryId 
                  ? 'No attributes have been defined for this product category yet.'
                  : 'Please select a category to see relevant attributes, or create a custom attribute.'
                }
              </p>
              <Button variant="outline" onClick={() => setShowNewAttributeDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create new attribute
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Create new attribute dialog */}
      <Dialog open={showNewAttributeDialog} onOpenChange={setShowNewAttributeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Attribute</DialogTitle>
            <DialogDescription>
              Add a new custom attribute for this product.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-attr-name">Attribute Name</Label>
              <Input 
                id="new-attr-name"
                value={newAttributeData.name}
                onChange={(e) => setNewAttributeData({...newAttributeData, name: e.target.value})}
                placeholder="e.g., Material, Size, Color"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-attr-type">Attribute Type</Label>
              <Select 
                value={newAttributeData.type}
                onValueChange={(val: AttributeType) => setNewAttributeData({...newAttributeData, type: val})}
              >
                <SelectTrigger id="new-attr-type">
                  <SelectValue placeholder="Select attribute type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Yes/No</SelectItem>
                  <SelectItem value="select">Select (Single)</SelectItem>
                  <SelectItem value="multiselect">Select (Multiple)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(newAttributeData.type === 'text' || 
              newAttributeData.type === 'number' || 
              newAttributeData.type === 'select' || 
              newAttributeData.type === 'multiselect') && (
              <div className="space-y-2">
                <Label htmlFor="new-attr-value">
                  {newAttributeData.type === 'select' || newAttributeData.type === 'multiselect' 
                    ? 'First Option Value'
                    : 'Default Value'
                  }
                </Label>
                <Input 
                  id="new-attr-value"
                  type={newAttributeData.type === 'number' ? 'number' : 'text'}
                  value={newAttributeData.value}
                  onChange={(e) => setNewAttributeData({...newAttributeData, value: e.target.value})}
                  placeholder={
                    newAttributeData.type === 'number' ? 'e.g., 100' :
                    newAttributeData.type === 'select' || newAttributeData.type === 'multiselect' ? 'e.g., Small, Red, Cotton' :
                    'Enter default value'
                  }
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAttributeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAttribute}
              disabled={!newAttributeData.name || 
                ((newAttributeData.type === 'text' || 
                  newAttributeData.type === 'number' || 
                  newAttributeData.type === 'select' || 
                  newAttributeData.type === 'multiselect') && 
                  !newAttributeData.value)
              }
            >
              Create Attribute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Save buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" type="button" onClick={() => handleSaveAttributes(false)}>
          <Save className="h-4 w-4 mr-2" />
          Save Attributes
        </Button>
        
        <Button type="button" onClick={() => handleSaveAttributes(true)} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Save & Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};