/**
 * Attributes Step
 * 
 * This component handles the product attributes and variations,
 * allowing users to select attributes from the centralized attribute system
 * and create product-specific attribute values.
 */

import { useState, useEffect } from 'react';
import { useDraftContext } from '../DraftContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { AlertCircle, Plus, Trash2, Check, X, Settings, HelpCircle } from 'lucide-react';
import { debounce } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Attribute type definitions
type Attribute = {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  attributeType: string;
  isFilterable: boolean;
  isComparable: boolean;
  isSwatch: boolean;
  isRequired: boolean;
  displayInProductSummary: boolean;
  sortOrder: number;
  options?: AttributeOption[];
};

type AttributeOption = {
  id: number;
  attributeId: number;
  value: string;
  displayValue: string;
  sortOrder: number;
  hexColor?: string | null;
};

type ProductAttribute = {
  attributeId: number;
  attribute: {
    id: number;
    name: string;
    displayName: string;
    attributeType: string;
  };
  values: ProductAttributeValue[];
};

type ProductAttributeValue = {
  id?: number;
  value: string;
  displayValue: string;
  attributeOptionId?: number | null;
  hexColor?: string | null;
  sortOrder: number;
};

// Component props
interface AttributesStepProps {
  onNext: () => void;
}

export function AttributesStep({ onNext }: AttributesStepProps) {
  const { draft, updateDraft, saveDraft } = useDraftContext();
  const { toast } = useToast();
  const [selectedAttributeId, setSelectedAttributeId] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<AttributeOption | null>(null);
  const [customValue, setCustomValue] = useState('');
  const [customDisplayValue, setCustomDisplayValue] = useState('');
  const [customColor, setCustomColor] = useState('');
  const [isAddingAttribute, setIsAddingAttribute] = useState(false);
  
  // Auto-save with debounce
  const debouncedSave = debounce(async () => {
    try {
      await saveDraft();
    } catch (err) {
      console.error('Failed to auto-save draft:', err);
    }
  }, 1500);
  
  // Query to fetch product attributes for this draft
  const draftAttributes = useQuery({
    queryKey: ['/api/product-attributes', draft?.id],
    enabled: !!draft?.id,
  });
  
  // Query to fetch all available attributes
  const attributes = useQuery({
    queryKey: ['/api/attributes'],
  });
  
  // Query to fetch attribute options for a specific attribute
  const attributeOptions = useQuery({
    queryKey: ['/api/attribute-options', selectedAttributeId],
    enabled: !!selectedAttributeId,
  });
  
  // Mutation to add attribute to product
  const addAttributeMutation = useMutation({
    mutationFn: async (attributeId: number) => {
      return apiRequest(`/api/product-drafts/${draft?.id}/attributes`, {
        method: 'POST',
        body: JSON.stringify({ attributeId }),
      });
    },
    onSuccess: () => {
      // Refetch the product attributes
      draftAttributes.refetch();
      setSelectedAttributeId(null);
      setIsAddingAttribute(false);
      
      toast({
        title: 'Attribute Added',
        description: 'The attribute has been added to the product.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Add Attribute',
        description: error instanceof Error ? error.message : 'Could not add the attribute.',
        variant: 'destructive',
      });
    }
  });
  
  // Mutation to remove attribute from product
  const removeAttributeMutation = useMutation({
    mutationFn: async (attributeId: number) => {
      return apiRequest(`/api/product-drafts/${draft?.id}/attributes/${attributeId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Refetch the product attributes
      draftAttributes.refetch();
      
      toast({
        title: 'Attribute Removed',
        description: 'The attribute has been removed from the product.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Remove Attribute',
        description: error instanceof Error ? error.message : 'Could not remove the attribute.',
        variant: 'destructive',
      });
    }
  });
  
  // Mutation to add attribute value to product
  const addAttributeValueMutation = useMutation({
    mutationFn: async (data: { 
      attributeId: number, 
      value: string, 
      displayValue: string, 
      attributeOptionId?: number | null,
      hexColor?: string | null
    }) => {
      return apiRequest(`/api/product-drafts/${draft?.id}/attributes/${data.attributeId}/values`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      // Refetch the product attributes
      draftAttributes.refetch();
      
      // Reset form
      setSelectedOption(null);
      setCustomValue('');
      setCustomDisplayValue('');
      setCustomColor('');
      
      toast({
        title: 'Value Added',
        description: 'The attribute value has been added to the product.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Add Value',
        description: error instanceof Error ? error.message : 'Could not add the attribute value.',
        variant: 'destructive',
      });
    }
  });
  
  // Mutation to remove attribute value from product
  const removeAttributeValueMutation = useMutation({
    mutationFn: async ({ attributeId, valueId }: { attributeId: number, valueId: number }) => {
      return apiRequest(`/api/product-drafts/${draft?.id}/attributes/${attributeId}/values/${valueId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Refetch the product attributes
      draftAttributes.refetch();
      
      toast({
        title: 'Value Removed',
        description: 'The attribute value has been removed from the product.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Remove Value',
        description: error instanceof Error ? error.message : 'Could not remove the attribute value.',
        variant: 'destructive',
      });
    }
  });
  
  // Handle attribute selection
  const handleAttributeSelection = (attributeId: string) => {
    if (attributeId === '') {
      setSelectedAttributeId(null);
    } else {
      setSelectedAttributeId(parseInt(attributeId, 10));
      setSelectedOption(null);
    }
  };
  
  // Handle option selection
  const handleOptionSelection = (optionId: string) => {
    if (optionId === 'custom') {
      setSelectedOption(null);
      setCustomValue('');
      setCustomDisplayValue('');
      setCustomColor('');
    } else if (optionId !== '') {
      const option = attributeOptions.data?.find((opt: AttributeOption) => opt.id === parseInt(optionId, 10));
      if (option) {
        setSelectedOption(option);
        setCustomValue(option.value);
        setCustomDisplayValue(option.displayValue);
        setCustomColor(option.hexColor || '');
      }
    } else {
      setSelectedOption(null);
    }
  };
  
  // Add attribute to product
  const handleAddAttribute = () => {
    if (selectedAttributeId) {
      addAttributeMutation.mutate(selectedAttributeId);
    }
  };
  
  // Remove attribute from product
  const handleRemoveAttribute = (attributeId: number) => {
    removeAttributeMutation.mutate(attributeId);
  };
  
  // Add attribute value to product
  const handleAddAttributeValue = (attributeId: number) => {
    if (!customValue.trim()) {
      toast({
        title: 'Value Required',
        description: 'Please enter a value.',
        variant: 'destructive',
      });
      return;
    }
    
    addAttributeValueMutation.mutate({
      attributeId,
      value: customValue.trim(),
      displayValue: customDisplayValue.trim() || customValue.trim(),
      attributeOptionId: selectedOption?.id || null,
      hexColor: customColor.trim() || null
    });
  };
  
  // Add attribute value from predefined option
  const handleAddAttributeValueFromOption = (attributeId: number, option: AttributeOption) => {
    addAttributeValueMutation.mutate({
      attributeId,
      value: option.value,
      displayValue: option.displayValue,
      attributeOptionId: option.id,
      hexColor: option.hexColor || null
    });
  };
  
  // Remove attribute value from product
  const handleRemoveAttributeValue = (attributeId: number, valueId?: number) => {
    if (valueId) {
      removeAttributeValueMutation.mutate({ attributeId, valueId });
    }
  };
  
  // Get attribute by ID
  const getAttributeById = (attributeId: number) => {
    return attributes?.data?.find((attr: Attribute) => attr.id === attributeId);
  };
  
  // Get product attribute by ID
  const getProductAttributeById = (attributeId: number) => {
    return draftAttributes?.data?.find((attr: ProductAttribute) => attr.attributeId === attributeId);
  };
  
  // Check if an attribute is assigned to the product
  const isAttributeAssigned = (attributeId: number) => {
    if (!draftAttributes.data) return false;
    const attributeIds = draftAttributes.data.map((attr: ProductAttribute) => attr.attributeId);
    return attributeIds.includes(attributeId);
  };
  
  // Custom header rendering for attribute tables
  const renderAttributeHeader = (attribute: Attribute) => (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-lg font-medium">{attribute.displayName}</h3>
        {attribute.description && (
          <p className="text-sm text-muted-foreground">{attribute.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleRemoveAttribute(attribute.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Remove attribute</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Value
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Value for {attribute.displayName}</DialogTitle>
              <DialogDescription>
                Add a new value for this attribute.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {attribute.options && attribute.options.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="option">Predefined Option</Label>
                  <Select onValueChange={handleOptionSelection} value={selectedOption?.id?.toString() || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option or create custom" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Select option...</SelectItem>
                      <SelectItem value="custom">Custom value</SelectItem>
                      {attribute.options.map((option) => (
                        <SelectItem key={option.id} value={option.id.toString()}>
                          {option.displayValue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  placeholder="Internal value (e.g. red, xl, etc.)"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="displayValue">Display Value</Label>
                <Input
                  id="displayValue"
                  placeholder="Customer-facing value (e.g. Red, Extra Large, etc.)"
                  value={customDisplayValue}
                  onChange={(e) => setCustomDisplayValue(e.target.value)}
                />
              </div>
              
              {attribute.isSwatch && (
                <div className="space-y-2">
                  <Label htmlFor="hexColor">Color (Hex Code)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="hexColor"
                      placeholder="#RRGGBB"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                    />
                    {customColor && (
                      <div 
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: customColor }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setSelectedOption(null);
                setCustomValue('');
                setCustomDisplayValue('');
                setCustomColor('');
              }}>
                Cancel
              </Button>
              <Button onClick={() => handleAddAttributeValue(attribute.id)}>
                Add Value
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
  
  // Render the values table for an attribute
  const renderAttributeValues = (attribute: Attribute, values: ProductAttributeValue[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Display Value</TableHead>
          <TableHead>Internal Value</TableHead>
          {attribute.isSwatch && <TableHead>Color</TableHead>}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {values.length === 0 ? (
          <TableRow>
            <TableCell colSpan={attribute.isSwatch ? 4 : 3} className="text-center text-muted-foreground">
              No values added yet
            </TableCell>
          </TableRow>
        ) : (
          values.map((value, index) => (
            <TableRow key={value.id || index}>
              <TableCell>{value.displayValue}</TableCell>
              <TableCell>{value.value}</TableCell>
              {attribute.isSwatch && (
                <TableCell>
                  {value.hexColor ? (
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: value.hexColor }}
                      />
                      <span>{value.hexColor}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </TableCell>
              )}
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveAttributeValue(attribute.id, value.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Product Attributes</h2>
      <p className="text-muted-foreground">
        Add attributes to your product to define its characteristics and variations.
      </p>
      
      {/* Add Attribute Form */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow">
              <Label htmlFor="attribute">Add Attribute</Label>
              <Select 
                onValueChange={handleAttributeSelection}
                value={selectedAttributeId?.toString() || ''}
                disabled={isAddingAttribute}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an attribute to add" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Select an attribute...</SelectItem>
                  {attributes?.data?.filter((attr: Attribute) => 
                    !isAttributeAssigned(attr.id)
                  ).map((attr: Attribute) => (
                    <SelectItem key={attr.id} value={attr.id.toString()}>
                      {attr.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-shrink-0 flex items-end">
              <Button 
                onClick={handleAddAttribute}
                disabled={!selectedAttributeId || isAddingAttribute}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Attribute
              </Button>
            </div>
          </div>
          
          {/* Selected attribute preview */}
          {selectedAttributeId && getAttributeById(selectedAttributeId) && (
            <div className="mt-4 border rounded-md p-4">
              <h3 className="font-medium mb-2 flex items-center">
                {getAttributeById(selectedAttributeId)?.displayName}
                {getAttributeById(selectedAttributeId)?.isRequired && (
                  <Badge variant="outline" className="ml-2">Required</Badge>
                )}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {getAttributeById(selectedAttributeId)?.description || 'No description available.'}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge variant="secondary">
                  {getAttributeById(selectedAttributeId)?.isFilterable ? 
                    <Check className="h-3 w-3 mr-1 inline" /> : 
                    <X className="h-3 w-3 mr-1 inline" />
                  }
                  Filterable
                </Badge>
                <Badge variant="secondary">
                  {getAttributeById(selectedAttributeId)?.isComparable ? 
                    <Check className="h-3 w-3 mr-1 inline" /> : 
                    <X className="h-3 w-3 mr-1 inline" />
                  }
                  Comparable
                </Badge>
                <Badge variant="secondary">
                  {getAttributeById(selectedAttributeId)?.isSwatch ? 
                    <Check className="h-3 w-3 mr-1 inline" /> : 
                    <X className="h-3 w-3 mr-1 inline" />
                  }
                  Swatch
                </Badge>
                <Badge variant="secondary">
                  {getAttributeById(selectedAttributeId)?.displayInProductSummary ? 
                    <Check className="h-3 w-3 mr-1 inline" /> : 
                    <X className="h-3 w-3 mr-1 inline" />
                  }
                  Display in Summary
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* No Attributes Message */}
      {draftAttributes.data?.length === 0 && (
        <Alert>
          <HelpCircle className="h-4 w-4" />
          <AlertTitle>No attributes added yet</AlertTitle>
          <AlertDescription>
            Attributes help define your product's characteristics and can be used for filtering and variations. 
            Select an attribute from the dropdown above to add it to your product.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Attribute List */}
      <div className="space-y-6">
        {draftAttributes.data?.map((productAttribute: ProductAttribute) => {
          const attribute = getAttributeById(productAttribute.attributeId);
          
          if (!attribute) return null;
          
          return (
            <Card key={productAttribute.attributeId}>
              <CardContent className="pt-6">
                {renderAttributeHeader(attribute)}
                {renderAttributeValues(attribute, productAttribute.values)}
                
                {/* Pre-defined Options Quick Add */}
                {attribute.options && attribute.options.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">Quick Add from Predefined Options</div>
                    <div className="flex flex-wrap gap-2">
                      {attribute.options
                        .filter(option => 
                          !productAttribute.values.some(val => val.attributeOptionId === option.id)
                        )
                        .map(option => (
                          <Button
                            key={option.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddAttributeValueFromOption(attribute.id, option)}
                          >
                            {option.displayValue}
                            {attribute.isSwatch && option.hexColor && (
                              <div 
                                className="w-3 h-3 rounded-full ml-1"
                                style={{ backgroundColor: option.hexColor }}
                              />
                            )}
                            <Plus className="ml-1 h-3 w-3" />
                          </Button>
                        ))}
                      
                      {attribute.options.filter(option => 
                        !productAttribute.values.some(val => val.attributeOptionId === option.id)
                      ).length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          All predefined options already added
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}