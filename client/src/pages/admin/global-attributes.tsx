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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Edit, Plus } from "lucide-react";
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

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  type: z.enum(["select", "color", "text", "number", "boolean"]),
  isRequired: z.boolean().default(false),
  isFilterable: z.boolean().default(false),
});

const optionFormSchema = z.object({
  value: z.string().min(1, {
    message: "Value must be at least 1 character.",
  }),
  label: z.string().min(1, {
    message: "Label must be at least 1 character.",
  }),
  attributeId: z.number(),
  sortOrder: z.number().default(0),
});

export default function GlobalAttributesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [attributeDialogOpen, setAttributeDialogOpen] = useState(false);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<GlobalAttribute | null>(null);
  const [selectedOption, setSelectedOption] = useState<GlobalAttributeOption | null>(null);
  const [editMode, setEditMode] = useState(false);

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
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "select",
      isRequired: false,
      isFilterable: false,
    },
  });

  // Option form
  const optionForm = useForm<z.infer<typeof optionFormSchema>>({
    resolver: zodResolver(optionFormSchema),
    defaultValues: {
      value: "",
      label: "",
      attributeId: 0,
      sortOrder: 0,
    },
  });

  // Create attribute mutation
  const createAttributeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
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
      setAttributeDialogOpen(false);
      form.reset();
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
    mutationFn: async (data: z.infer<typeof formSchema> & { id: number }) => {
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
      setAttributeDialogOpen(false);
      form.reset();
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
      setOptionDialogOpen(false);
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
      setOptionDialogOpen(false);
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
  const onAttributeSubmit = (values: z.infer<typeof formSchema>) => {
    if (editMode && selectedAttribute) {
      updateAttributeMutation.mutate({ ...values, id: selectedAttribute.id });
    } else {
      createAttributeMutation.mutate(values);
    }
  };

  // Handle option form submission
  const onOptionSubmit = (values: z.infer<typeof optionFormSchema>) => {
    if (editMode && selectedOption) {
      updateOptionMutation.mutate({ ...values, id: selectedOption.id });
    } else {
      createOptionMutation.mutate(values);
    }
  };

  // Handle attribute edit
  const handleEditAttribute = (attribute: GlobalAttribute) => {
    setEditMode(true);
    setSelectedAttribute(attribute);
    form.reset({
      name: attribute.name,
      description: attribute.description || "",
      type: attribute.type as "select" | "color" | "text" | "number" | "boolean",
      isRequired: attribute.isRequired,
      isFilterable: attribute.isFilterable,
    });
    setAttributeDialogOpen(true);
  };

  // Handle attribute delete
  const handleDeleteAttribute = (attribute: GlobalAttribute) => {
    if (window.confirm(`Are you sure you want to delete the attribute "${attribute.name}"?`)) {
      deleteAttributeMutation.mutate(attribute.id);
    }
  };

  // Handle option edit
  const handleEditOption = (option: GlobalAttributeOption) => {
    setEditMode(true);
    setSelectedOption(option);
    optionForm.reset({
      value: option.value,
      label: option.label,
      attributeId: option.attributeId,
      sortOrder: option.sortOrder,
    });
    setOptionDialogOpen(true);
  };

  // Handle option delete
  const handleDeleteOption = (option: GlobalAttributeOption) => {
    if (window.confirm(`Are you sure you want to delete the option "${option.label}"?`)) {
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

    setEditMode(false);
    setSelectedOption(null);
    optionForm.reset({
      value: "",
      label: "",
      attributeId: selectedAttribute.id,
      sortOrder: options.length,
    });
    setOptionDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Global Attributes Management</h1>
          <Dialog open={attributeDialogOpen} onOpenChange={setAttributeDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditMode(false);
                  setSelectedAttribute(null);
                  form.reset({
                    name: "",
                    description: "",
                    type: "select",
                    isRequired: false,
                    isFilterable: false,
                  });
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add New Attribute
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editMode ? "Edit Attribute" : "Create New Attribute"}</DialogTitle>
                <DialogDescription>
                  {editMode
                    ? "Update the attribute details below."
                    : "Global attributes can be used across all products regardless of their category."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onAttributeSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Color, Size, Material, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="A description of this attribute" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
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
                              <SelectValue placeholder="Select a type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="select">Dropdown Select</SelectItem>
                            <SelectItem value="color">Color</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Yes/No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="isRequired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Required</FormLabel>
                            <FormDescription>
                              If this attribute is required for all products
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
                      control={form.control}
                      name="isFilterable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Filterable</FormLabel>
                            <FormDescription>
                              If this attribute can be used for filtering
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
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAttributeDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createAttributeMutation.isPending || updateAttributeMutation.isPending}>
                      {editMode ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Attributes</CardTitle>
              <CardDescription>Select an attribute to manage its options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAttributes ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : attributes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">
                          No attributes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      attributes.map((attribute) => (
                        <TableRow
                          key={attribute.id}
                          className={
                            selectedAttribute?.id === attribute.id
                              ? "bg-muted cursor-pointer"
                              : "cursor-pointer hover:bg-muted/50"
                          }
                          onClick={() => handleSelectAttribute(attribute)}
                        >
                          <TableCell className="font-medium">{attribute.name}</TableCell>
                          <TableCell>{attribute.type}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditAttribute(attribute);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAttribute(attribute);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    {selectedAttribute ? `Options for "${selectedAttribute.name}"` : "Options"}
                  </CardTitle>
                  <CardDescription>
                    {selectedAttribute
                      ? `Manage options for the ${selectedAttribute.name} attribute`
                      : "Select an attribute to manage its options"}
                  </CardDescription>
                </div>
                {selectedAttribute && selectedAttribute.type === "select" && (
                  <Button onClick={handleNewOption}>
                    <Plus className="mr-2 h-4 w-4" /> Add Option
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[60vh] overflow-y-auto">
                {!selectedAttribute ? (
                  <div className="text-center p-8 text-muted-foreground">
                    Please select an attribute from the left panel to manage its options
                  </div>
                ) : selectedAttribute.type !== "select" ? (
                  <div className="text-center p-8 text-muted-foreground">
                    The attribute type "{selectedAttribute.type}" does not support options
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Value</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Sort Order</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingOptions ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : options.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            No options found
                          </TableCell>
                        </TableRow>
                      ) : (
                        options.map((option) => (
                          <TableRow key={option.id}>
                            <TableCell>{option.value}</TableCell>
                            <TableCell>{option.label}</TableCell>
                            <TableCell>{option.sortOrder}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditOption(option)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteOption(option)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Option Dialog */}
      <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Option" : "Add New Option"}</DialogTitle>
            <DialogDescription>
              {editMode
                ? "Update the option details below."
                : `Add a new option for the "${selectedAttribute?.name}" attribute.`}
            </DialogDescription>
          </DialogHeader>
          <Form {...optionForm}>
            <form onSubmit={optionForm.handleSubmit(onOptionSubmit)} className="space-y-4">
              <FormField
                control={optionForm.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Internal value (e.g., 'red', 'small')"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Internal value used in the system. Should be unique for this attribute.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={optionForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Display label (e.g., 'Red', 'Small')"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The label shown to users in the interface.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Controls the display order of options. Lower numbers appear first.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOptionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createOptionMutation.isPending || updateOptionMutation.isPending}>
                  {editMode ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}