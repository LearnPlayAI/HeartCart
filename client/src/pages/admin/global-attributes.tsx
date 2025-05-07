import { useState } from "react";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Edit, Plus, ArrowLeft, Save, X } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { GlobalAttribute, GlobalAttributeOption } from "@shared/schema";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const attributeFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  displayName: z.string().min(2, {
    message: "Display name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  attributeType: z.enum(["select", "color", "text", "number", "boolean"]),
  isRequired: z.boolean().default(false),
  isFilterable: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

const optionFormSchema = z.object({
  value: z.string().min(1, {
    message: "Value must be at least 1 character.",
  }),
  displayValue: z.string().min(1, {
    message: "Display value must be at least 1 character.",
  }),
  attributeId: z.number(),
  sortOrder: z.number().default(0),
});

export default function GlobalAttributesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAttribute, setSelectedAttribute] = useState<GlobalAttribute | null>(null);
  const [selectedOption, setSelectedOption] = useState<GlobalAttributeOption | null>(null);
  const [editOption, setEditOption] = useState(false);
  const [editingMode, setEditingMode] = useState<"list" | "create" | "edit">("list");

  // Fetch all global attributes
  const { data: attributes = [], isLoading: isLoadingAttributes } = useQuery({
    queryKey: ["/api/global-attributes"],
    queryFn: async () => {
      const response = await fetch("/api/global-attributes");
      if (!response.ok) throw new Error("Failed to fetch attributes");
      return response.json() as Promise<GlobalAttribute[]>;
    },
  });

  // Fetch options for selected attribute
  const { data: options = [], isLoading: isLoadingOptions } = useQuery({
    queryKey: ["/api/global-attributes", selectedAttribute?.id, "options"],
    queryFn: async () => {
      if (!selectedAttribute) return [];
      const response = await fetch(`/api/global-attributes/${selectedAttribute.id}/options`);
      if (!response.ok) throw new Error("Failed to fetch options");
      return response.json() as Promise<GlobalAttributeOption[]>;
    },
    enabled: !!selectedAttribute,
  });

  // Attribute form
  const attributeForm = useForm<z.infer<typeof attributeFormSchema>>({
    resolver: zodResolver(attributeFormSchema),
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
      attributeType: "select",
      isRequired: false,
      isFilterable: false,
      sortOrder: 0,
    },
  });

  // Option form
  const optionForm = useForm<z.infer<typeof optionFormSchema>>({
    resolver: zodResolver(optionFormSchema),
    defaultValues: {
      value: "",
      displayValue: "",
      attributeId: 0,
      sortOrder: 0,
    },
  });

  // Create attribute mutation
  const createAttributeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof attributeFormSchema>) => {
      const response = await apiRequest("POST", "/api/global-attributes", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create attribute");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-attributes"] });
      toast({
        title: "Success",
        description: "Attribute created successfully",
      });
      setEditingMode("list");
      attributeForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update attribute mutation
  const updateAttributeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof attributeFormSchema> & { id: number }) => {
      const { id, ...rest } = data;
      const response = await apiRequest("PUT", `/api/global-attributes/${id}`, rest);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update attribute");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-attributes"] });
      toast({
        title: "Success",
        description: "Attribute updated successfully",
      });
      setEditingMode("list");
      attributeForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete attribute mutation
  const deleteAttributeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/global-attributes/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete attribute");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-attributes"] });
      toast({
        title: "Success",
        description: "Attribute deleted successfully",
      });
      if (selectedAttribute) setSelectedAttribute(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create option mutation
  const createOptionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof optionFormSchema>) => {
      const response = await apiRequest("POST", "/api/global-attribute-options", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create option");
      }
      return response.json();
    },
    onSuccess: () => {
      if (selectedAttribute) {
        queryClient.invalidateQueries({
          queryKey: ["/api/global-attributes", selectedAttribute.id, "options"],
        });
      }
      toast({
        title: "Success",
        description: "Option created successfully",
      });
      setEditOption(false);
      optionForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update option mutation
  const updateOptionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof optionFormSchema> & { id: number }) => {
      const { id, ...rest } = data;
      const response = await apiRequest("PUT", `/api/global-attribute-options/${id}`, rest);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update option");
      }
      return response.json();
    },
    onSuccess: () => {
      if (selectedAttribute) {
        queryClient.invalidateQueries({
          queryKey: ["/api/global-attributes", selectedAttribute.id, "options"],
        });
      }
      toast({
        title: "Success",
        description: "Option updated successfully",
      });
      setEditOption(false);
      optionForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete option mutation
  const deleteOptionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/global-attribute-options/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete option");
      }
      return response.json();
    },
    onSuccess: () => {
      if (selectedAttribute) {
        queryClient.invalidateQueries({
          queryKey: ["/api/global-attributes", selectedAttribute.id, "options"],
        });
      }
      toast({
        title: "Success",
        description: "Option deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle attribute form submission
  const onAttributeSubmit = (values: z.infer<typeof attributeFormSchema>) => {
    if (editingMode === "edit" && selectedAttribute) {
      updateAttributeMutation.mutate({ ...values, id: selectedAttribute.id });
    } else {
      createAttributeMutation.mutate(values);
    }
  };

  // Handle option form submission
  const onOptionSubmit = (values: z.infer<typeof optionFormSchema>) => {
    if (selectedOption) {
      updateOptionMutation.mutate({ ...values, id: selectedOption.id });
    } else {
      createOptionMutation.mutate(values);
    }
  };

  // Handle attribute edit
  const handleEditAttribute = (attribute: GlobalAttribute) => {
    setSelectedAttribute(attribute);
    attributeForm.reset({
      name: attribute.name,
      displayName: attribute.displayName,
      description: attribute.description || "",
      attributeType: attribute.attributeType as "select" | "color" | "text" | "number" | "boolean",
      isRequired: attribute.isRequired || false,
      isFilterable: false, // Add this field if exists in your schema
      sortOrder: attribute.sortOrder || 0,
    });
    setEditingMode("edit");
  };

  // Handle attribute delete
  const handleDeleteAttribute = (attribute: GlobalAttribute) => {
    if (window.confirm(`Are you sure you want to delete the attribute "${attribute.name}"?`)) {
      deleteAttributeMutation.mutate(attribute.id);
    }
  };

  // Handle option edit
  const handleEditOption = (option: GlobalAttributeOption) => {
    setSelectedOption(option);
    optionForm.reset({
      value: option.value,
      displayValue: option.displayValue,
      attributeId: option.attributeId,
      sortOrder: option.sortOrder || 0,
    });
    setEditOption(true);
  };

  // Handle option delete
  const handleDeleteOption = (option: GlobalAttributeOption) => {
    if (window.confirm(`Are you sure you want to delete the option "${option.displayValue}"?`)) {
      deleteOptionMutation.mutate(option.id);
    }
  };

  // Handle attribute selection
  const handleSelectAttribute = (attribute: GlobalAttribute) => {
    setSelectedAttribute(attribute);
  };

  // Handle new option button
  const handleNewOption = () => {
    if (!selectedAttribute) {
      toast({
        title: "Error",
        description: "Please select an attribute first",
        variant: "destructive",
      });
      return;
    }

    if (selectedAttribute.attributeType !== "select" && selectedAttribute.attributeType !== "color") {
      toast({
        title: "Error",
        description: "Options can only be added to select or color attributes",
        variant: "destructive",
      });
      return;
    }

    setSelectedOption(null);
    optionForm.reset({
      value: "",
      displayValue: "",
      attributeId: selectedAttribute.id,
      sortOrder: 0,
    });
    setEditOption(true);
  };

  // Render attribute list view
  if (editingMode === "list") {
    return (
      <AdminLayout>
        <div className="flex flex-col space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight">Global Attributes</h1>
            <Button onClick={() => {
              setEditingMode("create");
              attributeForm.reset({
                name: "",
                displayName: "",
                description: "",
                attributeType: "select",
                isRequired: false,
                isFilterable: false,
                sortOrder: 0,
              });
            }}>
              <Plus className="mr-2 h-4 w-4" /> Add Attribute
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Attributes</CardTitle>
                <CardDescription>
                  Global attributes that can be used across all products
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAttributes ? (
                  <div className="p-8 text-center">Loading attributes...</div>
                ) : attributes.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No attributes created yet. Click the "Add Attribute" button to create one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attributes.map((attribute) => (
                      <div
                        key={attribute.id}
                        className={`flex justify-between items-center p-3 cursor-pointer rounded-md ${
                          selectedAttribute?.id === attribute.id
                            ? "bg-pink-100 border-pink-300 border"
                            : "hover:bg-gray-100 border border-transparent"
                        }`}
                        onClick={() => handleSelectAttribute(attribute)}
                      >
                        <div>
                          <div className="font-medium">{attribute.name}</div>
                          <div className="text-sm text-gray-500">
                            Type: {attribute.attributeType}
                            {attribute.isRequired && " • Required"}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAttribute(attribute);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAttribute(attribute);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1 md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedAttribute
                      ? `${selectedAttribute.name} Options`
                      : "Attribute Options"}
                  </CardTitle>
                  <CardDescription>
                    {selectedAttribute
                      ? `Manage options for ${selectedAttribute.name}`
                      : "Select an attribute to manage its options"}
                  </CardDescription>
                </div>
                {selectedAttribute && (
                  <Button
                    size="sm"
                    disabled={
                      !selectedAttribute ||
                      (selectedAttribute.attributeType !== "select" &&
                        selectedAttribute.attributeType !== "color")
                    }
                    onClick={handleNewOption}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Option
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {!selectedAttribute ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Select an attribute to view and manage its options
                  </div>
                ) : selectedAttribute.attributeType !== "select" &&
                  selectedAttribute.attributeType !== "color" ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {selectedAttribute.attributeType === "text"
                      ? "Text attributes don't have predefined options. Values will be entered when adding products."
                      : selectedAttribute.attributeType === "number"
                      ? "Number attributes don't have predefined options. Values will be entered when adding products."
                      : "Boolean attributes have built-in Yes/No options. No additional options needed."}
                  </div>
                ) : isLoadingOptions ? (
                  <div className="p-8 text-center">Loading options...</div>
                ) : options.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No options created yet for this attribute. Click the "Add Option" button to create one.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Value</TableHead>
                        <TableHead>Display Label</TableHead>
                        <TableHead>Sort Order</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {options.map((option) => (
                        <TableRow key={option.id}>
                          <TableCell>
                            {selectedAttribute.attributeType === "color" ? (
                              <div className="flex items-center">
                                <div
                                  className="h-6 w-6 rounded-full mr-2"
                                  style={{ backgroundColor: option.value }}
                                ></div>
                                {option.value}
                              </div>
                            ) : (
                              option.value
                            )}
                          </TableCell>
                          <TableCell>{option.displayValue}</TableCell>
                          <TableCell>{option.sortOrder}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditOption(option)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteOption(option)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              {editOption && (
                <Card className="mt-4 border-t">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{selectedOption ? "Edit Option" : "Add Option"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...optionForm}>
                      <form
                        onSubmit={optionForm.handleSubmit(onOptionSubmit)}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={optionForm.control}
                            name="value"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Value</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={
                                      selectedAttribute?.attributeType === "color"
                                        ? "#FF0000"
                                        : "e.g. small, red, cotton"
                                    }
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  {selectedAttribute?.attributeType === "color"
                                    ? "Enter a valid hex color code (e.g. #FF0000)"
                                    : "The actual value stored in the database"}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={optionForm.control}
                            name="displayValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Display Label</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={
                                      selectedAttribute?.attributeType === "color"
                                        ? "Red"
                                        : "e.g. Small, Red, Cotton"
                                    }
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  The label shown to customers
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={optionForm.control}
                          name="sortOrder"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sort Order</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(parseInt(e.target.value) || 0);
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                Lower numbers appear first
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2 pt-2">
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() => {
                              setEditOption(false);
                              setSelectedOption(null);
                              optionForm.reset();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={
                              createOptionMutation.isPending ||
                              updateOptionMutation.isPending
                            }
                          >
                            {selectedOption ? "Update" : "Create"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}
            </Card>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Render attribute create/edit form
  return (
    <AdminLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setEditingMode("list")}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Attributes
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {editingMode === "create" ? "Create Attribute" : `Edit ${selectedAttribute?.name}`}
          </h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Form {...attributeForm}>
              <form onSubmit={attributeForm.handleSubmit(onAttributeSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={attributeForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. color, size, material" {...field} />
                        </FormControl>
                        <FormDescription>
                          This is the internal name used in the system (no spaces).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={attributeForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Color, Size, Material" {...field} />
                        </FormControl>
                        <FormDescription>
                          This is the name shown to customers.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={attributeForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={attributeForm.control}
                    name="attributeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select attribute type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="select">Dropdown (Select)</SelectItem>
                            <SelectItem value="color">Color</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Yes/No (Boolean)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How this attribute will be displayed and stored.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={attributeForm.control}
                    name="sortOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sort Order</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} 
                          />
                        </FormControl>
                        <FormDescription>
                          Attributes with lower numbers appear first
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={attributeForm.control}
                    name="isRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Required</FormLabel>
                          <FormDescription>
                            Make this attribute required when adding to products
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
                  <FormField
                    control={attributeForm.control}
                    name="isFilterable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Filterable</FormLabel>
                          <FormDescription>
                            Allow customers to filter products by this attribute
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
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setEditingMode("list");
                      attributeForm.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createAttributeMutation.isPending || updateAttributeMutation.isPending
                    }
                  >
                    {editingMode === "edit" ? "Update" : "Create"} Attribute
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}