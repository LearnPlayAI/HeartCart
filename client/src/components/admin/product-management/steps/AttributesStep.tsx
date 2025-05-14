/**
 * Attributes Step Component
 * 
 * This component manages product attributes, integrates with the central attribute system,
 * and allows creating custom attribute options/values during product creation/editing.
 */

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusCircle, 
  Loader2, 
  X, 
  ChevronDown, 
  Check,
  Filter,
  PlusSquare,
  Tag
} from 'lucide-react';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useDraft } from '../DraftContext';
import { debounce, cn } from '@/lib/utils';

// Types for attributes
interface AttributeOption {
  id: number;
  attributeId: number;
  value: string;
  displayOrder?: number;
}

interface Attribute {
  id: number;
  name: string;
  description?: string;
  options: AttributeOption[];
}

interface ProductAttribute {
  attributeId: number;
  optionIds: number[];
  isCustomValue?: boolean;
  customValue?: string;
  isRequired?: boolean;
}

const AttributesStep: React.FC = () => {
  const { draft, draftLoading, updateDraftStep } = useDraft();
  const queryClient = useQueryClient();
  
  // State for selected attributes
  const [productAttributes, setProductAttributes] = useState<ProductAttribute[]>([]);
  const [newCustomOptionValue, setNewCustomOptionValue] = useState('');
  const [newCustomOptionAttributeId, setNewCustomOptionAttributeId] = useState<number | null>(null);
  const [isAddingCustomOption, setIsAddingCustomOption] = useState(false);
  
  // Fetch all available attributes
  const { data: attributes, isLoading: attributesLoading } = useQuery({
    queryKey: ['/api/attributes'],
    queryFn: async () => {
      const response = await fetch('/api/attributes');
      if (!response.ok) {
        throw new Error('Failed to fetch attributes');
      }
      const data = await response.json();
      return data.success ? data.data : [];
    },
  });
  
  // Mutation for creating a custom attribute option
  const { mutateAsync: createCustomOption, isPending: isCreatingCustomOption } = useMutation({
    mutationFn: async ({ attributeId, value }: { attributeId: number, value: string }) => {
      const response = await fetch(`/api/attributes/${attributeId}/options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create custom option');
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    },
    onSuccess: (newOption) => {
      if (newOption) {
        // Invalidate the attributes query to refetch with the new option
        queryClient.invalidateQueries({ queryKey: ['/api/attributes'] });
        
        // Add the new option to the selected attribute's options
        const updatedAttributes = productAttributes.map(attr => {
          if (attr.attributeId === newOption.attributeId) {
            return {
              ...attr,
              optionIds: [...attr.optionIds, newOption.id],
            };
          }
          return attr;
        });
        
        setProductAttributes(updatedAttributes);
        setNewCustomOptionValue('');
        setNewCustomOptionAttributeId(null);
        setIsAddingCustomOption(false);
      }
    },
  });
  
  // Initialize product attributes from draft data
  useEffect(() => {
    if (draft?.attributes && !draftLoading) {
      setProductAttributes(draft.attributes as ProductAttribute[]);
    }
  }, [draft, draftLoading]);
  
  // Save product attributes to draft
  const saveAttributes = debounce(async (attributes: ProductAttribute[]) => {
    await updateDraftStep('attributes', { attributes });
  }, 500);
  
  // Handle adding a new attribute
  const handleAddAttribute = (attributeId: number) => {
    // Check if attribute is already added
    if (productAttributes.some(attr => attr.attributeId === attributeId)) {
      return;
    }
    
    // Add attribute with empty option IDs
    const newAttributes = [
      ...productAttributes,
      { attributeId, optionIds: [], isRequired: false }
    ];
    
    setProductAttributes(newAttributes);
    saveAttributes(newAttributes);
  };
  
  // Handle removing an attribute
  const handleRemoveAttribute = (attributeId: number) => {
    const newAttributes = productAttributes.filter(
      attr => attr.attributeId !== attributeId
    );
    
    setProductAttributes(newAttributes);
    saveAttributes(newAttributes);
  };
  
  // Handle toggling an option for an attribute
  const handleToggleOption = (attributeId: number, optionId: number) => {
    const newAttributes = productAttributes.map(attr => {
      if (attr.attributeId === attributeId) {
        // If option is already selected, remove it
        if (attr.optionIds.includes(optionId)) {
          return {
            ...attr,
            optionIds: attr.optionIds.filter(id => id !== optionId),
          };
        }
        // Otherwise add it
        return {
          ...attr,
          optionIds: [...attr.optionIds, optionId],
        };
      }
      return attr;
    });
    
    setProductAttributes(newAttributes);
    saveAttributes(newAttributes);
  };
  
  // Handle toggling whether an attribute is required
  const handleToggleRequired = (attributeId: number) => {
    const newAttributes = productAttributes.map(attr => {
      if (attr.attributeId === attributeId) {
        return {
          ...attr,
          isRequired: !attr.isRequired,
        };
      }
      return attr;
    });
    
    setProductAttributes(newAttributes);
    saveAttributes(newAttributes);
  };
  
  // Handle creating a custom option
  const handleCreateCustomOption = async () => {
    if (!newCustomOptionAttributeId || !newCustomOptionValue.trim()) {
      return;
    }
    
    try {
      await createCustomOption({ 
        attributeId: newCustomOptionAttributeId, 
        value: newCustomOptionValue.trim() 
      });
    } catch (error) {
      console.error('Failed to create custom option:', error);
    }
  };
  
  // Get attribute by ID
  const getAttributeById = (id: number): Attribute | undefined => {
    return attributes?.find((attr: Attribute) => attr.id === id);
  };
  
  // Check if an attribute has any selected options
  const hasSelectedOptions = (attributeId: number): boolean => {
    const attr = productAttributes.find(a => a.attributeId === attributeId);
    return attr ? attr.optionIds.length > 0 : false;
  };
  
  // Get selected options for an attribute
  const getSelectedOptions = (attributeId: number): number[] => {
    const attr = productAttributes.find(a => a.attributeId === attributeId);
    return attr ? attr.optionIds : [];
  };
  
  // Check if an attribute is required
  const isAttributeRequired = (attributeId: number): boolean => {
    const attr = productAttributes.find(a => a.attributeId === attributeId);
    return attr ? !!attr.isRequired : false;
  };
  
  if (draftLoading || attributesLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center">
          <Tag className="h-5 w-5 mr-2" />
          Product Attributes
        </h3>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Attribute
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <ScrollArea className="h-80">
              <div className="space-y-2 p-2">
                <h4 className="font-medium mb-2">Available Attributes</h4>
                {attributes?.map((attribute: Attribute) => {
                  const isAdded = productAttributes.some(
                    attr => attr.attributeId === attribute.id
                  );
                  
                  return (
                    <div 
                      key={attribute.id}
                      className="flex items-center justify-between py-2 border-b"
                    >
                      <div>
                        <p className="font-medium">{attribute.name}</p>
                        {attribute.description && (
                          <p className="text-xs text-muted-foreground">
                            {attribute.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant={isAdded ? "ghost" : "secondary"}
                        size="sm"
                        onClick={() => handleAddAttribute(attribute.id)}
                        disabled={isAdded}
                      >
                        {isAdded ? 'Added' : 'Add'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
      
      {productAttributes.length === 0 ? (
        <div className="text-center p-6 border border-dashed rounded-lg">
          <Filter className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <h3 className="text-lg font-medium">No Attributes Selected</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Attributes help describe product specifications and allow customers to filter products.
            Click "Add Attribute" to select attributes for this product.
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="Add Attribute"]')?.click()}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add First Attribute
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {productAttributes.map(productAttr => {
            const attribute = getAttributeById(productAttr.attributeId);
            if (!attribute) return null;
            
            return (
              <Card key={productAttr.attributeId}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        {attribute.name}
                      </CardTitle>
                      {isAttributeRequired(attribute.id) && (
                        <Badge variant="default" className="text-xs">Required</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`required-${attribute.id}`}
                        checked={isAttributeRequired(attribute.id)}
                        onCheckedChange={() => handleToggleRequired(attribute.id)}
                      />
                      <Label htmlFor={`required-${attribute.id}`} className="text-xs">
                        Required
                      </Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRemoveAttribute(attribute.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {attribute.description && (
                    <CardDescription>{attribute.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor={`options-${attribute.id}`}>Select options:</Label>
                    <div className="flex flex-wrap gap-2">
                      {attribute.options.map(option => (
                        <Badge
                          key={option.id}
                          variant={getSelectedOptions(attribute.id).includes(option.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleToggleOption(attribute.id, option.id)}
                        >
                          {getSelectedOptions(attribute.id).includes(option.id) && (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          {option.value}
                        </Badge>
                      ))}
                      
                      <Dialog open={isAddingCustomOption && newCustomOptionAttributeId === attribute.id} 
                             onOpenChange={(open) => {
                               if (!open) {
                                 setIsAddingCustomOption(false);
                                 setNewCustomOptionAttributeId(null);
                               }
                             }}>
                        <DialogTrigger asChild>
                          <Badge
                            variant="outline"
                            className="cursor-pointer bg-muted hover:bg-muted/80"
                            onClick={() => {
                              setIsAddingCustomOption(true);
                              setNewCustomOptionAttributeId(attribute.id);
                            }}
                          >
                            <PlusSquare className="h-3 w-3 mr-1" />
                            Custom Option
                          </Badge>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Custom Option</DialogTitle>
                            <DialogDescription>
                              Create a new option for the "{attribute.name}" attribute.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="custom-option">Option Value</Label>
                              <Input
                                id="custom-option"
                                placeholder="Enter new option value"
                                value={newCustomOptionValue}
                                onChange={(e) => setNewCustomOptionValue(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setIsAddingCustomOption(false);
                                setNewCustomOptionAttributeId(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              disabled={!newCustomOptionValue.trim() || isCreatingCustomOption}
                              onClick={handleCreateCustomOption}
                            >
                              {isCreatingCustomOption ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                'Create Option'
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  {!hasSelectedOptions(attribute.id) && (
                    <p className="text-sm text-amber-600">
                      Please select at least one option for this attribute.
                    </p>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttributesStep;