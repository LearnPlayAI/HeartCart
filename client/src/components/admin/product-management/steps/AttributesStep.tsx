/**
 * Attributes Step
 * 
 * This component handles the product attributes and variations,
 * allowing users to select attributes from the centralized attribute system
 * and create product-specific attribute values.
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  Plus, 
  Trash2, 
  Info, 
  RefreshCw, 
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDraftContext } from '../DraftContext';
import { apiRequest } from '@/lib/queryClient';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Type definitions for attributes
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
  const { toast } = useToast();
  const { draft, updateDraft, saveDraft, loading } = useDraftContext();
  const [saving, setSaving] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<number[]>([]);
  const [productAttributes, setProductAttributes] = useState<ProductAttribute[]>([]);
  const [newAttributeId, setNewAttributeId] = useState<number | null>(null);
  const [newCustomValue, setNewCustomValue] = useState<string>('');
  const [newCustomDisplayValue, setNewCustomDisplayValue] = useState<string>('');
  const [activeAttributeId, setActiveAttributeId] = useState<number | null>(null);
  
  // Fetch all available attributes from the system
  const { data: attributes, isLoading: attributesLoading } = useQuery({
    queryKey: ['/api/attributes'],
    enabled: true,
  });
  
  // Fetch product attributes if draft exists
  const { data: draftAttributes, isLoading: draftAttributesLoading, refetch: refetchDraftAttributes } = useQuery({
    queryKey: ['/api/product-drafts/attributes', draft?.id],
    enabled: !!draft?.id,
  });
  
  // Load product attributes from draft when available
  useEffect(() => {
    if (draftAttributes?.success && draftAttributes.data) {
      setProductAttributes(draftAttributes.data);
      
      // Extract selected attribute IDs
      const attributeIds = draftAttributes.data.map((attr: ProductAttribute) => attr.attributeId);
      setSelectedAttributes(attributeIds);
    }
  }, [draftAttributes]);
  
  // Add attribute mutation
  const addAttributeMutation = useMutation({
    mutationFn: async (attributeId: number) => {
      if (!draft?.id) throw new Error('No draft ID found');
      
      return apiRequest(`/api/product-drafts/${draft.id}/attributes`, {
        method: 'POST',
        body: JSON.stringify({
          attributeId,
        }),
      });
    },
    onSuccess: () => {
      refetchDraftAttributes();
      setNewAttributeId(null);
      toast({
        title: 'Attribute Added',
        description: 'The attribute has been added to the product.',
      });
    },
    onError: (error) => {
      console.error('Add attribute error:', error);
      toast({
        title: 'Error Adding Attribute',
        description: 'There was a problem adding the attribute. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Remove attribute mutation
  const removeAttributeMutation = useMutation({
    mutationFn: async (attributeId: number) => {
      if (!draft?.id) throw new Error('No draft ID found');
      
      return apiRequest(`/api/product-drafts/${draft.id}/attributes/${attributeId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, attributeId) => {
      // Update local state
      setSelectedAttributes(prev => prev.filter(id => id !== attributeId));
      setProductAttributes(prev => prev.filter(attr => attr.attributeId !== attributeId));
      
      toast({
        title: 'Attribute Removed',
        description: 'The attribute has been removed from the product.',
      });
    },
    onError: (error) => {
      console.error('Remove attribute error:', error);
      toast({
        title: 'Error Removing Attribute',
        description: 'There was a problem removing the attribute. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Add attribute value mutation
  const addAttributeValueMutation = useMutation({
    mutationFn: async ({ 
      attributeId, 
      value, 
      displayValue, 
      attributeOptionId = null 
    }: { 
      attributeId: number;
      value: string;
      displayValue: string;
      attributeOptionId?: number | null;
    }) => {
      if (!draft?.id) throw new Error('No draft ID found');
      
      return apiRequest(`/api/product-drafts/${draft.id}/attributes/${attributeId}/values`, {
        method: 'POST',
        body: JSON.stringify({
          value,
          displayValue,
          attributeOptionId,
        }),
      });
    },
    onSuccess: () => {
      refetchDraftAttributes();
      setNewCustomValue('');
      setNewCustomDisplayValue('');
      
      toast({
        title: 'Value Added',
        description: 'The attribute value has been added to the product.',
      });
    },
    onError: (error) => {
      console.error('Add attribute value error:', error);
      toast({
        title: 'Error Adding Value',
        description: 'There was a problem adding the attribute value. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Remove attribute value mutation
  const removeAttributeValueMutation = useMutation({
    mutationFn: async ({ 
      attributeId, 
      valueId 
    }: { 
      attributeId: number;
      valueId: number;
    }) => {
      if (!draft?.id) throw new Error('No draft ID found');
      
      return apiRequest(`/api/product-drafts/${draft.id}/attributes/${attributeId}/values/${valueId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      refetchDraftAttributes();
      
      toast({
        title: 'Value Removed',
        description: 'The attribute value has been removed from the product.',
      });
    },
    onError: (error) => {
      console.error('Remove attribute value error:', error);
      toast({
        title: 'Error Removing Value',
        description: 'There was a problem removing the attribute value. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Handle attribute selection
  const handleAddAttribute = () => {
    if (newAttributeId) {
      addAttributeMutation.mutate(newAttributeId);
    }
  };
  
  // Handle attribute removal
  const handleRemoveAttribute = (attributeId: number) => {
    if (window.confirm('Are you sure you want to remove this attribute? All associated values will be removed.')) {
      removeAttributeMutation.mutate(attributeId);
    }
  };
  
  // Handle attribute value addition from existing options
  const handleAddAttributeValueFromOption = (attributeId: number, option: AttributeOption) => {
    addAttributeValueMutation.mutate({
      attributeId,
      value: option.value,
      displayValue: option.displayValue,
      attributeOptionId: option.id,
    });
  };
  
  // Handle custom attribute value addition
  const handleAddCustomAttributeValue = (attributeId: number) => {
    if (!newCustomValue || !newCustomDisplayValue) {
      toast({
        title: 'Missing Values',
        description: 'Please provide both value and display value.',
        variant: 'destructive',
      });
      return;
    }
    
    addAttributeValueMutation.mutate({
      attributeId,
      value: newCustomValue,
      displayValue: newCustomDisplayValue,
    });
  };
  
  // Handle attribute value removal
  const handleRemoveAttributeValue = (attributeId: number, valueId?: number) => {
    if (!valueId) return;
    
    if (window.confirm('Are you sure you want to remove this attribute value?')) {
      removeAttributeValueMutation.mutate({
        attributeId,
        valueId,
      });
    }
  };
  
  // Find attribute by ID
  const findAttribute = (attributeId: number) => {
    return attributes?.data?.find((attr: Attribute) => attr.id === attributeId);
  };
  
  // Get attribute values for a specific attribute
  const getAttributeValues = (attributeId: number) => {
    const productAttribute = productAttributes.find(attr => attr.attributeId === attributeId);
    return productAttribute?.values || [];
  };
  
  // Get unused attribute options
  const getUnusedAttributeOptions = (attributeId: number) => {
    const attribute = findAttribute(attributeId);
    if (!attribute || !attribute.options) return [];
    
    const productAttribute = productAttributes.find(attr => attr.attributeId === attributeId);
    if (!productAttribute) return attribute.options;
    
    // Filter out options that are already used in the product
    return attribute.options.filter(option => 
      !productAttribute.values.some(value => value.attributeOptionId === option.id)
    );
  };
  
  // Continue to next step
  const handleContinue = async () => {
    onNext();
  };
  
  const isLoading = attributesLoading || draftAttributesLoading || loading;
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Product Attributes</h2>
        <p className="text-muted-foreground">
          Add and manage attributes for your product, such as color, size, material, etc.
        </p>
      </div>
      
      <Separator className="my-6" />
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select
                  disabled={isLoading}
                  value={newAttributeId?.toString() || ''}
                  onValueChange={(value) => setNewAttributeId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an attribute to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes?.data?.filter((attr: Attribute) => 
                      !selectedAttributes.includes(attr.id)
                    ).map((attr: Attribute) => (
                      <SelectItem key={attr.id} value={attr.id.toString()}>
                        {attr.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleAddAttribute} 
                disabled={!newAttributeId || addAttributeMutation.isPending || isLoading}
              >
                {addAttributeMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add Attribute
              </Button>
            </div>
            
            {productAttributes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Info className="h-12 w-12 text-muted-foreground mb-2" />
                <h3 className="text-lg font-semibold">No Attributes Yet</h3>
                <p className="text-muted-foreground">
                  Select attributes from the dropdown above to add them to your product.
                </p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {productAttributes.map((productAttr) => {
                  const attribute = findAttribute(productAttr.attributeId);
                  const unusedOptions = getUnusedAttributeOptions(productAttr.attributeId);
                  
                  return (
                    <AccordionItem key={productAttr.attributeId} value={productAttr.attributeId.toString()}>
                      <AccordionTrigger 
                        onClick={() => setActiveAttributeId(productAttr.attributeId)}
                        className="hover:bg-muted/50 rounded-md px-4 -mx-4"
                      >
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center">
                            <span>{attribute?.displayName}</span>
                            <Badge className="ml-2" variant="outline">
                              {productAttr.values.length} value{productAttr.values.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent accordion from toggling
                              handleRemoveAttribute(productAttr.attributeId);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {/* Attribute description */}
                          {attribute?.description && (
                            <Alert>
                              <Info className="h-4 w-4" />
                              <AlertDescription>
                                {attribute.description}
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {/* Values table */}
                          {productAttr.values.length > 0 && (
                            <div className="border rounded-md">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Value</TableHead>
                                    <TableHead>Display Value</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {productAttr.values.map((value) => (
                                    <TableRow key={value.id || value.value}>
                                      <TableCell>{value.value}</TableCell>
                                      <TableCell>{value.displayValue}</TableCell>
                                      <TableCell>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleRemoveAttributeValue(
                                            productAttr.attributeId, 
                                            value.id
                                          )}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                          
                          {/* Add existing option */}
                          {unusedOptions.length > 0 && (
                            <div className="space-y-2">
                              <Label>Add From Existing Options</Label>
                              <div className="flex flex-wrap gap-2">
                                {unusedOptions.map((option) => (
                                  <Badge 
                                    key={option.id}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-primary/10"
                                    onClick={() => handleAddAttributeValueFromOption(
                                      productAttr.attributeId, 
                                      option
                                    )}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    {option.displayValue}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Add custom value */}
                          <div className="space-y-2">
                            <Label>Add Custom Value</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Value (internal)"
                                value={newCustomValue}
                                onChange={(e) => setNewCustomValue(e.target.value)}
                                className="flex-1"
                              />
                              <Input
                                placeholder="Display Value (visible)"
                                value={newCustomDisplayValue}
                                onChange={(e) => setNewCustomDisplayValue(e.target.value)}
                                className="flex-1"
                              />
                              <Button
                                onClick={() => handleAddCustomAttributeValue(productAttr.attributeId)}
                                disabled={!newCustomValue || !newCustomDisplayValue}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end gap-4">
        <Button 
          onClick={handleContinue} 
          disabled={loading || saving}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}