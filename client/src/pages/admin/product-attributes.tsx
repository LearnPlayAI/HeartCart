import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';
import { 
  ProductAttributeValue, 
  InsertProductAttributeValue,
  ProductAttributeCombination,
  InsertProductAttributeCombination,
  CategoryAttribute
} from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Form validation schemas
const attributeValueFormSchema = z.object({
  productId: z.number(),
  attributeId: z.number(),
  value: z.string().min(1, "Value is required"),
  priceAdjustment: z.string().transform(val => parseFloat(val) || 0)
});

const combinationFormSchema = z.object({
  productId: z.number(),
  combinationHash: z.string().min(1, "Combination hash is required"),
  priceAdjustment: z.string().transform(val => parseFloat(val) || 0)
});

// Interface for form data
interface AttributeValueFormData {
  productId: number;
  attributeId: number;
  value: string;
  priceAdjustment: string; // String for the input, converted to number on submit
}

interface CombinationFormData {
  productId: number;
  combinationHash: string; 
  priceAdjustment: string; // String for the input, converted to number on submit
}

interface AttributeValueWithDetails extends ProductAttributeValue {
  attributeName?: string;
  attributeDisplayName?: string;
  optionDisplayValue?: string;
}

export default function ProductAttributes() {
  const [, setLocation] = useLocation();
  const { productId } = useParams<{ productId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Tab state
  const [activeTab, setActiveTab] = useState("values");
  
  // States for attribute values
  const [currentAttributeValue, setCurrentAttributeValue] = useState<AttributeValueWithDetails | null>(null);
  const [attributeValueForm, setAttributeValueForm] = useState<AttributeValueFormData>({
    productId: parseInt(productId),
    attributeId: 0,
    value: '',
    priceAdjustment: '0'
  });
  
  // States for combinations
  const [selectedCombination, setSelectedCombination] = useState<ProductAttributeCombination | null>(null);
  const [combinationForm, setCombinationForm] = useState<CombinationFormData>({
    productId: parseInt(productId),
    combinationHash: '',
    priceAdjustment: '0'
  });
  
  // State for selected attribute values when creating combinations
  const [selectedValues, setSelectedValues] = useState<{[key: number]: string}>({});
  
  // Fetch product data
  const { data: product } = useQuery({
    queryKey: ['/api/products', productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Failed to fetch product");
      return res.json();
    },
    enabled: !!productId
  });
  
  // Fetch category attributes based on product's category
  const { data: categoryAttributes, isLoading: attributesLoading } = useQuery({
    queryKey: ['/api/categories', product?.categoryId, 'attributes'],
    queryFn: async () => {
      if (!product?.categoryId) return [];
      const res = await fetch(`/api/categories/${product.categoryId}/attributes`);
      if (!res.ok) throw new Error("Failed to fetch category attributes");
      return res.json();
    },
    enabled: !!product?.categoryId
  });
  
  // Fetch attribute values for this product
  const { data: attributeValues, isLoading: valuesLoading } = useQuery({
    queryKey: ['/api/products', productId, 'attributes'],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}/attributes`);
      if (!res.ok) throw new Error("Failed to fetch attribute values");
      return res.json();
    },
    enabled: !!productId
  });
  
  // Fetch attribute combinations for this product
  const { data: combinations, isLoading: combinationsLoading } = useQuery({
    queryKey: ['/api/products', productId, 'combinations'],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}/combinations`);
      if (!res.ok) throw new Error("Failed to fetch combinations");
      return res.json();
    },
    enabled: !!productId
  });
  
  // Enhanced attribute values with attribute details
  const [enhancedAttributeValues, setEnhancedAttributeValues] = useState<AttributeValueWithDetails[]>([]);
  
  // Update enhanced attribute values when data changes
  useEffect(() => {
    if (attributeValues && categoryAttributes) {
      const enhanced = attributeValues.map((value: ProductAttributeValue) => {
        const attribute = categoryAttributes.find((attr: CategoryAttribute) => attr.id === value.attributeId);
        
        // For select/radio/color attributes, try to find the display value
        let optionDisplayValue = value.value;
        if (attribute && ['select', 'radio', 'color'].includes(attribute.attributeType)) {
          // Here we'd need to fetch the option's display value, but for now we'll use the value
          // In a complete implementation, we'd fetch options for each attribute
        }
        
        return {
          ...value,
          attributeName: attribute?.name || 'Unknown',
          attributeDisplayName: attribute?.displayName || 'Unknown',
          optionDisplayValue
        };
      });
      setEnhancedAttributeValues(enhanced);
    }
  }, [attributeValues, categoryAttributes]);
  
  // Mutations for attribute values
  const createAttributeValueMutation = useMutation({
    mutationFn: async (data: AttributeValueFormData) => {
      return await apiRequest('POST', '/api/product-attribute-values', {
        ...data,
        priceAdjustment: parseFloat(data.priceAdjustment)
      });
    },
    onSuccess: () => {
      toast({
        title: "Attribute Value Created",
        description: "The attribute value has been successfully added to the product",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'attributes'] });
      resetAttributeValueForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create attribute value",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const updateAttributeValueMutation = useMutation({
    mutationFn: async (data: AttributeValueFormData & { id: number }) => {
      const { id, ...valueData } = data;
      return await apiRequest('PUT', `/api/product-attribute-values/${id}`, {
        ...valueData,
        priceAdjustment: parseFloat(valueData.priceAdjustment)
      });
    },
    onSuccess: () => {
      toast({
        title: "Attribute Value Updated",
        description: "The attribute value has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'attributes'] });
      resetAttributeValueForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update attribute value",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const deleteAttributeValueMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/product-attribute-values/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Attribute Value Deleted",
        description: "The attribute value has been successfully removed from the product",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'attributes'] });
      setCurrentAttributeValue(null);
      resetAttributeValueForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete attribute value",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutations for combinations
  const createCombinationMutation = useMutation({
    mutationFn: async (data: CombinationFormData) => {
      return await apiRequest('POST', '/api/product-attribute-combinations', {
        ...data,
        priceAdjustment: parseFloat(data.priceAdjustment)
      });
    },
    onSuccess: () => {
      toast({
        title: "Combination Created",
        description: "The attribute combination has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'combinations'] });
      resetCombinationForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create combination",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const updateCombinationMutation = useMutation({
    mutationFn: async (data: CombinationFormData & { id: number }) => {
      const { id, ...combinationData } = data;
      return await apiRequest('PUT', `/api/product-attribute-combinations/${id}`, {
        ...combinationData,
        priceAdjustment: parseFloat(combinationData.priceAdjustment)
      });
    },
    onSuccess: () => {
      toast({
        title: "Combination Updated",
        description: "The attribute combination has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'combinations'] });
      resetCombinationForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update combination",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const deleteCombinationMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/product-attribute-combinations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Combination Deleted",
        description: "The attribute combination has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'combinations'] });
      setSelectedCombination(null);
      resetCombinationForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete combination",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission for attribute values
  const handleAttributeValueSubmit = () => {
    try {
      // Validate form data
      attributeValueFormSchema.parse(attributeValueForm);
      
      if (currentAttributeValue) {
        // Update existing attribute value
        updateAttributeValueMutation.mutate({
          ...attributeValueForm,
          id: currentAttributeValue.id
        });
      } else {
        // Create new attribute value
        createAttributeValueMutation.mutate(attributeValueForm);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };
  
  // Handle form submission for combinations
  const handleCombinationSubmit = () => {
    try {
      // Validate form data
      combinationFormSchema.parse(combinationForm);
      
      if (selectedCombination) {
        // Update existing combination
        updateCombinationMutation.mutate({
          ...combinationForm,
          id: selectedCombination.id
        });
      } else {
        // Create new combination
        createCombinationMutation.mutate(combinationForm);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };
  
  // Handle attribute selection for creating combinations
  const handleAttributeValueSelect = (attributeId: number, value: string) => {
    setSelectedValues(prev => ({
      ...prev,
      [attributeId]: value
    }));
  };
  
  // Generate combination hash from selected values
  const generateCombinationHash = () => {
    const sortedEntries = Object.entries(selectedValues)
      .sort(([a], [b]) => parseInt(a) - parseInt(b));
    
    const hash = sortedEntries
      .map(([attributeId, value]) => `${attributeId}:${value}`)
      .join('|');
    
    setCombinationForm({
      ...combinationForm,
      combinationHash: hash
    });
  };
  
  // Reset form for attribute values
  const resetAttributeValueForm = () => {
    setAttributeValueForm({
      productId: parseInt(productId),
      attributeId: 0,
      value: '',
      priceAdjustment: '0'
    });
    setCurrentAttributeValue(null);
  };
  
  // Reset form for combinations
  const resetCombinationForm = () => {
    setCombinationForm({
      productId: parseInt(productId),
      combinationHash: '',
      priceAdjustment: '0'
    });
    setSelectedCombination(null);
    setSelectedValues({});
  };
  
  // Select attribute value for editing
  const selectAttributeValue = (value: AttributeValueWithDetails) => {
    setCurrentAttributeValue(value);
    setAttributeValueForm({
      productId: value.productId,
      attributeId: value.attributeId,
      value: value.value,
      priceAdjustment: value.priceAdjustment.toString()
    });
  };
  
  // Select combination for editing
  const selectCombination = (combination: ProductAttributeCombination) => {
    setSelectedCombination(combination);
    setCombinationForm({
      productId: combination.productId,
      combinationHash: combination.combinationHash,
      priceAdjustment: combination.priceAdjustment.toString()
    });
    
    // Parse the combination hash to set selected values
    const newSelectedValues: {[key: number]: string} = {};
    combination.combinationHash.split('|').forEach(part => {
      const [attributeId, value] = part.split(':');
      if (attributeId && value) {
        newSelectedValues[parseInt(attributeId)] = value;
      }
    });
    setSelectedValues(newSelectedValues);
  };
  
  // Handle attribute value deletion
  const handleDeleteAttributeValue = () => {
    if (!currentAttributeValue) return;
    
    if (confirm("Are you sure you want to delete this attribute value?")) {
      deleteAttributeValueMutation.mutate(currentAttributeValue.id);
    }
  };
  
  // Handle combination deletion
  const handleDeleteCombination = () => {
    if (!selectedCombination) return;
    
    if (confirm("Are you sure you want to delete this combination?")) {
      deleteCombinationMutation.mutate(selectedCombination.id);
    }
  };
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              className="mr-2"
              onClick={() => setLocation(`/admin/products/${productId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Product
            </Button>
            <h1 className="text-2xl font-bold">
              Attributes for {product?.name || 'Product'}
            </h1>
          </div>
          <Badge variant="outline" className="text-sm">
            Product ID: {productId}
          </Badge>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="values">Attribute Values</TabsTrigger>
            <TabsTrigger value="combinations">Combinations & Pricing</TabsTrigger>
          </TabsList>
          
          {/* Attribute Values Tab */}
          <TabsContent value="values">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Attribute Values List */}
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Assigned Values</CardTitle>
                    <CardDescription>
                      Attributes assigned to this product
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {valuesLoading ? (
                      <p>Loading attribute values...</p>
                    ) : enhancedAttributeValues?.length === 0 ? (
                      <p>No attribute values assigned. Add your first attribute value.</p>
                    ) : (
                      <div className="space-y-2">
                        {enhancedAttributeValues?.map((value) => (
                          <div 
                            key={value.id}
                            className={`p-3 border rounded cursor-pointer hover:bg-accent/50 ${
                              currentAttributeValue?.id === value.id ? 'bg-accent' : ''
                            }`}
                            onClick={() => selectAttributeValue(value)}
                          >
                            <div className="flex justify-between">
                              <p className="font-medium">{value.attributeDisplayName}</p>
                              {value.priceAdjustment !== '0' && (
                                <Badge variant={parseFloat(value.priceAdjustment.toString()) > 0 ? "default" : "destructive"}>
                                  {parseFloat(value.priceAdjustment.toString()) > 0 ? '+' : ''}{value.priceAdjustment}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{value.optionDisplayValue || value.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <Button
                      className="w-full mt-4"
                      onClick={resetAttributeValueForm}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Attribute Value
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              {/* Attribute Value Form */}
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {currentAttributeValue ? `Edit ${currentAttributeValue.attributeDisplayName}` : 'Add Attribute Value'}
                    </CardTitle>
                    <CardDescription>
                      {currentAttributeValue 
                        ? 'Update this attribute value for the product'
                        : 'Assign a new attribute value to this product'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="attributeId">Attribute</Label>
                        <Select
                          value={attributeValueForm.attributeId.toString()}
                          onValueChange={(value) => setAttributeValueForm({
                            ...attributeValueForm,
                            attributeId: parseInt(value)
                          })}
                          disabled={!!currentAttributeValue}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an attribute" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryAttributes?.map((attribute: CategoryAttribute) => (
                              <SelectItem key={attribute.id} value={attribute.id.toString()}>
                                {attribute.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="value">Value</Label>
                        <Input 
                          id="value"
                          placeholder="Attribute value" 
                          value={attributeValueForm.value}
                          onChange={(e) => setAttributeValueForm({
                            ...attributeValueForm,
                            value: e.target.value
                          })}
                        />
                        <p className="text-sm text-muted-foreground">
                          Enter the value for this attribute (e.g. "Red" for color, "Large" for size)
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="priceAdjustment">Price Adjustment</Label>
                        <Input 
                          id="priceAdjustment"
                          type="number"
                          step="0.01"
                          placeholder="0.00" 
                          value={attributeValueForm.priceAdjustment}
                          onChange={(e) => setAttributeValueForm({
                            ...attributeValueForm,
                            priceAdjustment: e.target.value
                          })}
                        />
                        <p className="text-sm text-muted-foreground">
                          Amount to adjust the product's price for this attribute value (can be positive or negative)
                        </p>
                      </div>
                      
                      <div className="flex justify-between pt-4">
                        {currentAttributeValue && (
                          <Button
                            variant="destructive"
                            onClick={handleDeleteAttributeValue}
                            disabled={deleteAttributeValueMutation.isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Value
                          </Button>
                        )}
                        
                        <Button
                          onClick={handleAttributeValueSubmit}
                          disabled={createAttributeValueMutation.isPending || updateAttributeValueMutation.isPending}
                          className={currentAttributeValue ? '' : 'ml-auto'}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {currentAttributeValue ? 'Update Value' : 'Add Value'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Combinations Tab */}
          <TabsContent value="combinations">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Combinations List */}
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Attribute Combinations</CardTitle>
                    <CardDescription>
                      Defined price variations for attribute combinations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {combinationsLoading ? (
                      <p>Loading combinations...</p>
                    ) : combinations?.length === 0 ? (
                      <p>No combinations defined. Create your first combination.</p>
                    ) : (
                      <div className="space-y-2">
                        {combinations?.map((combination: ProductAttributeCombination) => (
                          <div 
                            key={combination.id}
                            className={`p-3 border rounded cursor-pointer hover:bg-accent/50 ${
                              selectedCombination?.id === combination.id ? 'bg-accent' : ''
                            }`}
                            onClick={() => selectCombination(combination)}
                          >
                            <div className="flex justify-between">
                              <p className="font-medium">Combination {combination.id}</p>
                              <Badge variant={parseFloat(combination.priceAdjustment.toString()) > 0 ? "default" : "destructive"}>
                                {parseFloat(combination.priceAdjustment.toString()) > 0 ? '+' : ''}{combination.priceAdjustment}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{combination.combinationHash}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <Button
                      className="w-full mt-4"
                      onClick={resetCombinationForm}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create New Combination
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              {/* Combination Builder */}
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedCombination ? `Edit Combination` : 'Create Combination'}
                    </CardTitle>
                    <CardDescription>
                      {selectedCombination 
                        ? 'Update this attribute combination and its price adjustment'
                        : 'Define a new attribute combination with price adjustment'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Attribute Selector */}
                      <div className="space-y-2">
                        <h3 className="font-medium">Select Attribute Values</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Attribute</TableHead>
                              <TableHead>Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {attributesLoading ? (
                              <TableRow>
                                <TableCell colSpan={2}>Loading attributes...</TableCell>
                              </TableRow>
                            ) : categoryAttributes?.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={2}>No attributes defined for this category</TableCell>
                              </TableRow>
                            ) : (
                              categoryAttributes?.map((attribute: CategoryAttribute) => {
                                const attributeValues = enhancedAttributeValues?.filter(
                                  (value) => value.attributeId === attribute.id
                                );
                                
                                return (
                                  <TableRow key={attribute.id}>
                                    <TableCell className="font-medium">{attribute.displayName}</TableCell>
                                    <TableCell>
                                      {attributeValues?.length === 0 ? (
                                        <span className="text-sm text-muted-foreground">No values assigned</span>
                                      ) : (
                                        <Select
                                          value={selectedValues[attribute.id] || ''}
                                          onValueChange={(value) => handleAttributeValueSelect(attribute.id, value)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a value" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {attributeValues?.map((value) => (
                                              <SelectItem key={value.id} value={value.value}>
                                                {value.optionDisplayValue || value.value}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                        
                        <Button
                          className="mt-2"
                          onClick={generateCombinationHash}
                          disabled={Object.keys(selectedValues).length === 0}
                        >
                          Generate Combination
                        </Button>
                      </div>
                      
                      {/* Combination Hash */}
                      <div className="space-y-2">
                        <Label htmlFor="combinationHash">Combination Hash</Label>
                        <Input 
                          id="combinationHash"
                          value={combinationForm.combinationHash}
                          onChange={(e) => setCombinationForm({
                            ...combinationForm,
                            combinationHash: e.target.value
                          })}
                          readOnly
                        />
                        <p className="text-sm text-muted-foreground">
                          A unique identifier for this combination of attribute values
                        </p>
                      </div>
                      
                      {/* Price Adjustment */}
                      <div className="space-y-2">
                        <Label htmlFor="combinationPrice">Price Adjustment</Label>
                        <Input 
                          id="combinationPrice"
                          type="number"
                          step="0.01"
                          placeholder="0.00" 
                          value={combinationForm.priceAdjustment}
                          onChange={(e) => setCombinationForm({
                            ...combinationForm,
                            priceAdjustment: e.target.value
                          })}
                        />
                        <p className="text-sm text-muted-foreground">
                          Amount to adjust the product's price for this specific combination of attributes
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex justify-between pt-4">
                        {selectedCombination && (
                          <Button
                            variant="destructive"
                            onClick={handleDeleteCombination}
                            disabled={deleteCombinationMutation.isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Combination
                          </Button>
                        )}
                        
                        <Button
                          onClick={handleCombinationSubmit}
                          disabled={
                            createCombinationMutation.isPending || 
                            updateCombinationMutation.isPending || 
                            !combinationForm.combinationHash
                          }
                          className={selectedCombination ? '' : 'ml-auto'}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {selectedCombination ? 'Update Combination' : 'Create Combination'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}