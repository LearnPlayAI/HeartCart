import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { AdminLayout } from '@/components/admin/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, ArrowLeft, Trash2, Save, MoveVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CategoryAttribute, CategoryAttributeOption } from '@shared/schema';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Form validation schema
const attributeFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  description: z.string().optional().nullable(),
  attributeType: z.enum(["select", "radio", "color", "text"]),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().default(0)
});

const optionFormSchema = z.object({
  value: z.string().min(1, "Value is required"),
  displayValue: z.string().min(1, "Display value is required"),
  sortOrder: z.number().default(0)
});

// Interface for form data
interface AttributeFormData {
  name: string;
  displayName: string;
  description: string | null;
  attributeType: "select" | "radio" | "color" | "text";
  isRequired: boolean;
  sortOrder: number;
}

interface OptionFormData {
  value: string;
  displayValue: string;
  sortOrder: number;
}

export default function CategoryAttributes() {
  const [, setLocation] = useLocation();
  const { categoryId } = useParams<{ categoryId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for the current attribute being edited
  const [currentAttribute, setCurrentAttribute] = useState<CategoryAttribute | null>(null);
  const [attributeForm, setAttributeForm] = useState<AttributeFormData>({
    name: '',
    displayName: '',
    description: null,
    attributeType: 'select',
    isRequired: false,
    sortOrder: 0
  });
  
  // State for option management
  const [newOption, setNewOption] = useState<OptionFormData>({
    value: '',
    displayValue: '',
    sortOrder: 0
  });
  
  // Fetch category data
  const { data: category } = useQuery({
    queryKey: ['/api/categories', categoryId],
    queryFn: async () => {
      const res = await fetch(`/api/categories/${categoryId}`);
      if (!res.ok) throw new Error("Failed to fetch category");
      return res.json();
    },
    enabled: !!categoryId
  });
  
  // Fetch category attributes
  const { data: attributes, isLoading: attributesLoading } = useQuery({
    queryKey: ['/api/categories', categoryId, 'attributes'],
    queryFn: async () => {
      const res = await fetch(`/api/categories/${categoryId}/attributes`);
      if (!res.ok) throw new Error("Failed to fetch attributes");
      return res.json();
    },
    enabled: !!categoryId
  });
  
  // Fetch attribute options
  const { data: options, isLoading: optionsLoading } = useQuery({
    queryKey: ['/api/category-attributes', currentAttribute?.id, 'options'],
    queryFn: async () => {
      const res = await fetch(`/api/category-attributes/${currentAttribute?.id}/options`);
      if (!res.ok) throw new Error("Failed to fetch options");
      return res.json();
    },
    enabled: !!currentAttribute?.id
  });
  
  // Mutations
  const createAttributeMutation = useMutation({
    mutationFn: async (data: AttributeFormData) => {
      const attributeData = {
        ...data,
        categoryId: parseInt(categoryId)
      };
      return await apiRequest('POST', '/api/category-attributes', attributeData);
    },
    onSuccess: () => {
      toast({
        title: "Attribute Created",
        description: "The attribute has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories', categoryId, 'attributes'] });
      resetAttributeForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create attribute",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const updateAttributeMutation = useMutation({
    mutationFn: async (data: AttributeFormData & { id: number }) => {
      const { id, ...attributeData } = data;
      return await apiRequest('PUT', `/api/category-attributes/${id}`, attributeData);
    },
    onSuccess: () => {
      toast({
        title: "Attribute Updated",
        description: "The attribute has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories', categoryId, 'attributes'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update attribute",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const deleteAttributeMutation = useMutation({
    mutationFn: async (attributeId: number) => {
      return await apiRequest('DELETE', `/api/category-attributes/${attributeId}`);
    },
    onSuccess: () => {
      toast({
        title: "Attribute Deleted",
        description: "The attribute has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories', categoryId, 'attributes'] });
      setCurrentAttribute(null);
      resetAttributeForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete attribute",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const createOptionMutation = useMutation({
    mutationFn: async (data: OptionFormData) => {
      const optionData = {
        ...data,
        attributeId: currentAttribute?.id
      };
      return await apiRequest('POST', '/api/category-attribute-options', optionData);
    },
    onSuccess: () => {
      toast({
        title: "Option Created",
        description: "The option has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/category-attributes', currentAttribute?.id, 'options'] });
      setNewOption({
        value: '',
        displayValue: '',
        sortOrder: (options?.length || 0) + 1
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create option",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const deleteOptionMutation = useMutation({
    mutationFn: async (optionId: number) => {
      return await apiRequest('DELETE', `/api/category-attribute-options/${optionId}`);
    },
    onSuccess: () => {
      toast({
        title: "Option Deleted",
        description: "The option has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/category-attributes', currentAttribute?.id, 'options'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete option",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const handleAttributeSubmit = () => {
    try {
      // Validate form data
      attributeFormSchema.parse(attributeForm);
      
      if (currentAttribute) {
        // Update existing attribute
        updateAttributeMutation.mutate({
          ...attributeForm,
          id: currentAttribute.id
        });
      } else {
        // Create new attribute
        createAttributeMutation.mutate(attributeForm);
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
  
  const handleOptionSubmit = () => {
    try {
      // Validate form data
      optionFormSchema.parse(newOption);
      
      // Create new option
      createOptionMutation.mutate(newOption);
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
  
  // Handle attribute selection
  const handleSelectAttribute = (attribute: CategoryAttribute) => {
    setCurrentAttribute(attribute);
    setAttributeForm({
      name: attribute.name,
      displayName: attribute.displayName,
      description: attribute.description,
      attributeType: attribute.attributeType as "select" | "radio" | "color" | "text",
      isRequired: attribute.isRequired,
      sortOrder: attribute.sortOrder
    });
  };
  
  // Handle attribute deletion
  const handleDeleteAttribute = () => {
    if (!currentAttribute) return;
    
    if (confirm("Are you sure you want to delete this attribute? This will also delete all options associated with it.")) {
      deleteAttributeMutation.mutate(currentAttribute.id);
    }
  };
  
  // Handle option deletion
  const handleDeleteOption = (optionId: number) => {
    if (confirm("Are you sure you want to delete this option?")) {
      deleteOptionMutation.mutate(optionId);
    }
  };
  
  // Reset form
  const resetAttributeForm = () => {
    setAttributeForm({
      name: '',
      displayName: '',
      description: null,
      attributeType: 'select',
      isRequired: false,
      sortOrder: attributes?.length || 0
    });
    setCurrentAttribute(null);
  };
  
  // Handle drag and drop reordering for attributes
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    // Handle attribute reordering
    if (result.type === 'attributes' || !result.type) {
      if (!attributes) return;
      
      const items = Array.from(attributes);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      
      // Update sort orders
      const updatedAttributes = items.map((item, index) => ({
        ...item,
        sortOrder: index
      }));
      
      // Update all attributes with new sort orders
      updatedAttributes.forEach(attr => {
        updateAttributeMutation.mutate({
          ...attr,
          id: attr.id
        });
      });
    }
    
    // Handle option reordering
    if (result.type === 'options') {
      if (!options) return;
      
      const items = Array.from(options);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      
      // Update sort orders
      const updatedOptions = items.map((item, index) => ({
        ...item,
        sortOrder: index
      }));
      
      // Update all options with new sort orders
      updatedOptions.forEach(opt => {
        updateOptionMutation.mutate({
          value: opt.value,
          displayValue: opt.displayValue,
          sortOrder: opt.sortOrder,
          id: opt.id
        });
      });
    }
  };
  
  // Handle option mutation
  const updateOptionMutation = useMutation({
    mutationFn: async (data: { value: string, displayValue: string, sortOrder: number, id: number }) => {
      const { id, ...optionData } = data;
      return await apiRequest('PUT', `/api/category-attribute-options/${id}`, optionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/category-attributes', currentAttribute?.id, 'options'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update option order",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update form values when attributes are loaded
  useEffect(() => {
    if (!currentAttribute && attributes?.length > 0) {
      setAttributeForm({
        ...attributeForm,
        sortOrder: attributes.length
      });
    }
  }, [attributes]);
  
  // Update option sort order when options are loaded
  useEffect(() => {
    if (options?.length > 0) {
      setNewOption({
        ...newOption,
        sortOrder: options.length
      });
    } else {
      setNewOption({
        ...newOption,
        sortOrder: 0
      });
    }
  }, [options]);
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-2"
            onClick={() => setLocation('/admin/categories')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Categories
          </Button>
          <h1 className="text-2xl font-bold">
            Attributes for {category?.name || 'Category'}
          </h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Attributes List */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Attributes</CardTitle>
                <CardDescription>
                  Manage product attributes for this category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attributesLoading ? (
                  <p>Loading attributes...</p>
                ) : attributes?.length === 0 ? (
                  <p>No attributes found. Create your first attribute.</p>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="attributes-list">
                      {(provided) => (
                        <div 
                          className="space-y-2"
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                        >
                          {attributes?.map((attribute: CategoryAttribute, index) => (
                            <Draggable 
                              key={attribute.id.toString()} 
                              draggableId={attribute.id.toString()} 
                              index={index}
                            >
                              {(provided) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`p-3 border rounded cursor-pointer flex justify-between items-center ${
                                    currentAttribute?.id === attribute.id ? 'bg-accent' : 'hover:bg-accent/50'
                                  }`}
                                  onClick={() => handleSelectAttribute(attribute)}
                                >
                                  <div>
                                    <p className="font-medium">{attribute.displayName}</p>
                                    <p className="text-sm text-muted-foreground">{attribute.attributeType}</p>
                                  </div>
                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-move"
                                  >
                                    <MoveVertical className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
                
                <Button
                  className="w-full mt-4"
                  onClick={resetAttributeForm}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Attribute
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Attribute Form */}
          <div className="md:col-span-2">
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Attribute Details</TabsTrigger>
                <TabsTrigger 
                  value="options"
                  disabled={!currentAttribute || currentAttribute.attributeType === "text"}
                >
                  Attribute Options
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {currentAttribute ? `Edit ${currentAttribute.displayName}` : 'Create New Attribute'}
                    </CardTitle>
                    <CardDescription>
                      {currentAttribute 
                        ? 'Update this attribute\'s properties'
                        : 'Define a new attribute for products in this category'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Internal Name</Label>
                          <Input 
                            id="name"
                            placeholder="e.g. size_type" 
                            value={attributeForm.name}
                            onChange={(e) => setAttributeForm({
                              ...attributeForm,
                              name: e.target.value
                            })}
                          />
                          <p className="text-sm text-muted-foreground">
                            Used internally, no spaces or special characters
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="displayName">Display Name</Label>
                          <Input 
                            id="displayName"
                            placeholder="e.g. Size" 
                            value={attributeForm.displayName}
                            onChange={(e) => setAttributeForm({
                              ...attributeForm,
                              displayName: e.target.value
                            })}
                          />
                          <p className="text-sm text-muted-foreground">
                            Displayed to customers
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input 
                          id="description"
                          placeholder="Optional description of this attribute"
                          value={attributeForm.description || ''}
                          onChange={(e) => setAttributeForm({
                            ...attributeForm,
                            description: e.target.value || null
                          })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="attributeType">Attribute Type</Label>
                        <Select
                          value={attributeForm.attributeType}
                          onValueChange={(value: "select" | "radio" | "color" | "text") => setAttributeForm({
                            ...attributeForm,
                            attributeType: value
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select attribute type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="select">Dropdown Menu</SelectItem>
                            <SelectItem value="radio">Radio Buttons</SelectItem>
                            <SelectItem value="color">Color Swatch</SelectItem>
                            <SelectItem value="text">Text Input</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          Determines how this attribute will be displayed
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isRequired"
                          checked={attributeForm.isRequired}
                          onCheckedChange={(checked) => setAttributeForm({
                            ...attributeForm,
                            isRequired: checked as boolean
                          })}
                        />
                        <Label htmlFor="isRequired">Required</Label>
                        <p className="text-sm text-muted-foreground ml-2">
                          If checked, customers must select a value for this attribute
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="sortOrder">Sort Order</Label>
                        <Input 
                          id="sortOrder"
                          type="number"
                          value={attributeForm.sortOrder.toString()}
                          onChange={(e) => setAttributeForm({
                            ...attributeForm,
                            sortOrder: parseInt(e.target.value) || 0
                          })}
                        />
                        <p className="text-sm text-muted-foreground">
                          Determines the display order of attributes
                        </p>
                      </div>
                      
                      <div className="flex justify-between pt-4">
                        {currentAttribute && (
                          <Button
                            variant="destructive"
                            onClick={handleDeleteAttribute}
                            disabled={deleteAttributeMutation.isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Attribute
                          </Button>
                        )}
                        
                        <Button
                          onClick={handleAttributeSubmit}
                          disabled={createAttributeMutation.isPending || updateAttributeMutation.isPending}
                          className={currentAttribute ? '' : 'ml-auto'}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {currentAttribute ? 'Update Attribute' : 'Create Attribute'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="options">
                <Card>
                  <CardHeader>
                    <CardTitle>Attribute Options</CardTitle>
                    <CardDescription>
                      Manage options for {currentAttribute?.displayName || 'this attribute'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!currentAttribute ? (
                      <p>Select an attribute to manage its options</p>
                    ) : currentAttribute.attributeType === "text" ? (
                      <p>Text attributes don't have predefined options</p>
                    ) : optionsLoading ? (
                      <p>Loading options...</p>
                    ) : (
                      <div className="space-y-6">
                        {/* Options List */}
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="text-left p-3">Option Value</th>
                                <th className="text-left p-3">Display Value</th>
                                <th className="text-left p-3">Order</th>
                                <th className="text-right p-3">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {options?.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="p-4 text-center">No options defined yet</td>
                                </tr>
                              ) : (
                                options?.map((option: CategoryAttributeOption) => (
                                  <tr key={option.id} className="border-t">
                                    <td className="p-3">{option.value}</td>
                                    <td className="p-3">{option.displayValue}</td>
                                    <td className="p-3">{option.sortOrder}</td>
                                    <td className="p-3 text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() => handleDeleteOption(option.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Add New Option */}
                        <div className="border p-4 rounded-md">
                          <h3 className="font-medium mb-3">Add New Option</h3>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label htmlFor="option_value">Value</Label>
                              <Input 
                                id="option_value"
                                placeholder="Internal value"
                                value={newOption.value}
                                onChange={(e) => setNewOption({
                                  ...newOption,
                                  value: e.target.value
                                })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="option_display">Display Value</Label>
                              <Input 
                                id="option_display"
                                placeholder="Customer-facing value"
                                value={newOption.displayValue}
                                onChange={(e) => setNewOption({
                                  ...newOption,
                                  displayValue: e.target.value
                                })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="option_order">Order</Label>
                              <Input 
                                id="option_order"
                                type="number"
                                value={newOption.sortOrder.toString()}
                                onChange={(e) => setNewOption({
                                  ...newOption,
                                  sortOrder: parseInt(e.target.value) || 0
                                })}
                              />
                            </div>
                          </div>
                          <Button
                            className="mt-3"
                            onClick={handleOptionSubmit}
                            disabled={createOptionMutation.isPending}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Option
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}