import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { Loader2, Plus, Edit, Trash2, Save, X, ArrowUpDown, Info } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { ApiError } from "@/lib/exceptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminLayout } from "@/components/admin/layout";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Attribute, 
  AttributeOption, 
  ATTRIBUTE_TYPES 
} from "@/types/attribute-types";

function GlobalAttributesPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [selectedOption, setSelectedOption] = useState<AttributeOption | null>(null);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'attribute' | 'option', id: number } | null>(null);
  const [attributeDialogOpen, setAttributeDialogOpen] = useState(false);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [optionMetadataDialogOpen, setOptionMetadataDialogOpen] = useState(false);
  const [attributeFormMode, setAttributeFormMode] = useState<"create" | "edit">("create");
  const [optionFormMode, setOptionFormMode] = useState<"create" | "edit">("create");
  const [optionMetadata, setOptionMetadata] = useState<string>("");

  // Fetch global attributes
  const {
    data: attributesResponse,
    isLoading: attributesLoading,
    error: attributesError,
  } = useQuery({
    queryKey: ["/api/attributes"],
    retry: 1,
    refetchOnMount: true,
    staleTime: 0 // Consider data stale immediately to force refetch
  });
  
  // Extract the attributes data from the standardized response
  const attributes = attributesResponse?.data || [];

  // Fetch attribute options when an attribute is selected
  const {
    data: optionsResponse,
    isLoading: optionsLoading,
    error: optionsError,
  } = useQuery({
    queryKey: ["/api/attributes", selectedAttribute?.id, "options"],
    enabled: !!selectedAttribute?.id,
    refetchOnMount: true,
    staleTime: 0, // Consider data stale immediately to force refetch
    retry: 1,
  });
  
  // Extract the options data from the standardized response
  const options = optionsResponse?.data || [];

  // Create attribute mutation
  const createAttributeMutation = useMutation({
    mutationFn: async (newAttribute: Omit<Attribute, "id">) => {
      const response = await fetch("/api/attributes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newAttribute),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.message || "Failed to create attribute",
          response.status
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attributes"] });
      setAttributeDialogOpen(false);
      toast({
        title: "Attribute created successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create attribute",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update attribute mutation
  const updateAttributeMutation = useMutation({
    mutationFn: async (updatedAttribute: Partial<Attribute> & { id: number }) => {
      const { id, ...data } = updatedAttribute;
      const response = await fetch(`/api/attributes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.message || "Failed to update attribute",
          response.status
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attributes"] });
      setAttributeDialogOpen(false);
      toast({
        title: "Attribute updated successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update attribute",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete attribute mutation
  const deleteAttributeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/attributes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.message || "Failed to delete attribute",
          response.status
        );
      }

      return true;
    },
    onSuccess: () => {
      // Invalidate all attribute-related queries with a more aggressive approach
      queryClient.invalidateQueries({ queryKey: ["/api/attributes"] });
      
      // Also invalidate any product wizard queries that might cache attribute data
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          // This will invalidate any query with a key path containing 'attributes'
          return query.queryKey.some(key => 
            typeof key === 'string' && key.includes('attributes')
          );
        }
      });
      
      setSelectedAttribute(null);
      setConfirmDeleteDialogOpen(false);
      setItemToDelete(null);
      toast({
        title: "Attribute deleted successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete attribute",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create option mutation
  const createOptionMutation = useMutation({
    mutationFn: async (newOption: Omit<AttributeOption, "id">) => {
      if (!selectedAttribute) return null;

      const response = await fetch(`/api/attributes/${selectedAttribute.id}/options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newOption),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.message || "Failed to create option",
          response.status
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/attributes", selectedAttribute?.id, "options"] 
      });
      setOptionDialogOpen(false);
      toast({
        title: "Option created successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create option",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update option mutation
  const updateOptionMutation = useMutation({
    mutationFn: async (updatedOption: Partial<AttributeOption> & { id: number }) => {
      if (!selectedAttribute) return null;
      
      const { id, ...data } = updatedOption;
      const response = await fetch(`/api/attributes/${selectedAttribute.id}/options/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.message || "Failed to update option",
          response.status
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/attributes", selectedAttribute?.id, "options"] 
      });
      setOptionDialogOpen(false);
      setOptionMetadataDialogOpen(false);
      toast({
        title: "Option updated successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update option",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete option mutation
  const deleteOptionMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!selectedAttribute) return null;

      const response = await fetch(`/api/attributes/${selectedAttribute.id}/options/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.message || "Failed to delete option",
          response.status
        );
      }

      return true;
    },
    onSuccess: () => {
      // Invalidate specific options query
      queryClient.invalidateQueries({ 
        queryKey: ["/api/attributes", selectedAttribute?.id, "options"] 
      });
      
      // Also invalidate the main attributes query to ensure any dependent options are updated
      queryClient.invalidateQueries({ 
        queryKey: ["/api/attributes"] 
      });
      
      // Invalidate any product wizard queries that might cache attribute data
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          // This will invalidate any query with a key path containing 'attributes'
          return query.queryKey.some(key => 
            typeof key === 'string' && key.includes('attributes')
          );
        }
      });
      
      setConfirmDeleteDialogOpen(false);
      setItemToDelete(null);
      toast({
        title: "Option deleted successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete option",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reorder options mutation
  const reorderOptionsMutation = useMutation({
    mutationFn: async (optionIds: number[]) => {
      if (!selectedAttribute) return null;

      const response = await fetch(`/api/attributes/${selectedAttribute.id}/options/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ optionIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.message || "Failed to reorder options",
          response.status
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/attributes", selectedAttribute?.id, "options"] 
      });
      toast({
        title: "Options reordered successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reorder options",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler for attribute form submission
  const handleAttributeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const attributeData = {
      name: formData.get("name") as string,
      displayName: formData.get("displayName") as string,
      description: formData.get("description") as string || null,
      attributeType: formData.get("attributeType") as string,
      isFilterable: formData.has("isFilterable"),
      isSwatch: formData.has("isSwatch"),
      isRequired: formData.has("isRequired"),
      isVariant: formData.has("isVariant"),
      validationRules: formData.get("validationRules") as string || null,
    };
    
    if (attributeFormMode === "create") {
      createAttributeMutation.mutate(attributeData);
    } else if (attributeFormMode === "edit" && selectedAttribute) {
      updateAttributeMutation.mutate({
        id: selectedAttribute.id,
        ...attributeData,
      });
    }
  };

  // Handler for option form submission
  const handleOptionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const optionData = {
      value: formData.get("value") as string,
      displayValue: formData.get("displayValue") as string,
      sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
      metadata: selectedOption?.metadata || null,
    };

    // Validate the value field to ensure it's not empty
    if (!optionData.value || optionData.value.trim() === '') {
      toast({
        title: "Value is required",
        description: "Please enter a value for this option",
        variant: "destructive",
      });
      return;
    }
    
    if (optionFormMode === "create") {
      createOptionMutation.mutate(optionData);
    } else if (optionFormMode === "edit" && selectedOption) {
      updateOptionMutation.mutate({
        id: selectedOption.id,
        ...optionData,
      });
    }
  };

  // Show dialog to create a new attribute
  const handleNewAttribute = () => {
    setSelectedAttribute(null);
    setAttributeFormMode("create");
    setAttributeDialogOpen(true);
  };

  // Show dialog to edit an existing attribute
  const handleEditAttribute = (attribute: Attribute) => {
    setSelectedAttribute(attribute);
    setAttributeFormMode("edit");
    setAttributeDialogOpen(true);
  };

  // Handle opening the option dialog for creating a new option
  const handleNewOption = () => {
    setSelectedOption(null);
    setOptionFormMode("create");
    setOptionDialogOpen(true);
  };

  // Handle opening the option dialog for editing an existing option
  const handleEditOption = (option: AttributeOption) => {
    setSelectedOption(option);
    setOptionFormMode("edit");
    setOptionDialogOpen(true);
  };

  // Handle opening the confirm delete dialog
  const handleDeleteClick = (type: 'attribute' | 'option', id: number) => {
    setItemToDelete({ type, id });
    setConfirmDeleteDialogOpen(true);
  };

  // Handle confirming deletion
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'attribute') {
      deleteAttributeMutation.mutate(itemToDelete.id);
    } else if (itemToDelete.type === 'option') {
      deleteOptionMutation.mutate(itemToDelete.id);
    }
  };

  // Handle opening the metadata dialog
  const handleEditMetadata = (option: AttributeOption) => {
    setSelectedOption(option);
    setOptionMetadata(JSON.stringify(option.metadata || {}, null, 2));
    setOptionMetadataDialogOpen(true);
  };

  // Handle saving metadata
  const handleSaveMetadata = () => {
    if (!selectedOption) return;
    
    try {
      const parsedMetadata = optionMetadata ? JSON.parse(optionMetadata) : null;
      
      updateOptionMutation.mutate({
        id: selectedOption.id,
        metadata: parsedMetadata,
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON for metadata",
        variant: "destructive",
      });
    }
  };

  // Handle selecting an attribute to view its options
  const handleSelectAttribute = (attribute: Attribute) => {
    setSelectedAttribute(
      selectedAttribute?.id === attribute.id ? null : attribute
    );
  };

  // Loading state for the attributes
  if (attributesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state for the attributes
  if (attributesError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-screen">
        <h1 className="text-2xl font-bold text-destructive">Error Loading Attributes</h1>
        <p>{(attributesError as Error).message}</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/attributes"] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <AdminLayout title="Global Attributes" subtitle="Manage global attributes that can be assigned to products, categories, and catalogs">
      <Helmet>
        <title>Global Attributes | TeeMeYou Admin</title>
      </Helmet>

      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            {/* Title and subtitle are already in AdminLayout */}
          </div>
          <Button onClick={handleNewAttribute}>
            <Plus className="mr-2 h-4 w-4" />
            New Attribute
          </Button>
        </div>

        {/* Attributes List */}
        <Card>
          <CardHeader>
            <CardTitle>Attributes</CardTitle>
            <CardDescription>
              Click on an attribute to view and manage its options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Filterable</TableHead>
                    <TableHead className="text-center">Swatch</TableHead>
                    <TableHead className="text-center">Required</TableHead>
                    <TableHead className="text-center">Variant</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attributes?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No attributes found. Create your first attribute to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    attributes?.map((attribute: Attribute) => (
                      <TableRow 
                        key={attribute.id}
                        className={selectedAttribute?.id === attribute.id ? "bg-muted/50" : ""}
                      >
                        <TableCell className="font-medium">
                          <Button 
                            variant="link" 
                            onClick={() => handleSelectAttribute(attribute)}
                            className="p-0 h-auto text-left"
                          >
                            {attribute.name}
                          </Button>
                        </TableCell>
                        <TableCell>{attribute.displayName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{attribute.attributeType}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {attribute.isFilterable ? "Yes" : "No"}
                        </TableCell>
                        <TableCell className="text-center">
                          {attribute.isSwatch ? "Yes" : "No"}
                        </TableCell>
                        <TableCell className="text-center">
                          {attribute.isRequired ? "Yes" : "No"}
                        </TableCell>
                        <TableCell className="text-center">
                          {attribute.isVariant ? "Yes" : "No"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/admin/attributes/${attribute.id}/options`)}
                            >
                              Options
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleEditAttribute(attribute)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="icon"
                              onClick={() => handleDeleteClick('attribute', attribute.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Options List - Only shown when an attribute is selected */}
        {selectedAttribute && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Options for {selectedAttribute.displayName}</CardTitle>
                  <CardDescription>
                    Manage the available options for this attribute
                  </CardDescription>
                </div>
                <Button onClick={handleNewOption}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Option
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {optionsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : options?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  No options found for this attribute. Add options to make this attribute selectable.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Order</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Display Value</TableHead>
                        <TableHead className="w-[150px]">Metadata</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {options?.map((option: AttributeOption) => (
                        <TableRow key={option.id}>
                          <TableCell>{option.sortOrder}</TableCell>
                          <TableCell className="font-medium">
                            {option.value || <span className="text-muted-foreground italic">No value set</span>}
                          </TableCell>
                          <TableCell>{option.displayValue}</TableCell>
                          <TableCell>
                            {option.metadata ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditMetadata(option)}
                              >
                                <Info className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => handleEditOption(option)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="icon"
                                onClick={() => handleDeleteClick('option', option.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Attribute Creation/Edit Dialog */}
        <Dialog open={attributeDialogOpen} onOpenChange={setAttributeDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {attributeFormMode === "create" ? "Create New Attribute" : "Edit Attribute"}
              </DialogTitle>
              <DialogDescription>
                Fill in the details for this attribute. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAttributeSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="color"
                    defaultValue={selectedAttribute?.name || ""}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="displayName" className="text-right">
                    Display Name
                  </Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    placeholder="Color"
                    defaultValue={selectedAttribute?.displayName || ""}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Product color selection"
                    defaultValue={selectedAttribute?.description || ""}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="attributeType" className="text-right">
                    Type
                  </Label>
                  <Select 
                    name="attributeType" 
                    defaultValue={selectedAttribute?.attributeType || "select"}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTRIBUTE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Options</Label>
                  <div className="col-span-3 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="isRequired" 
                        name="isRequired"
                        defaultChecked={selectedAttribute?.isRequired || false}
                      />
                      <Label htmlFor="isRequired">Required at checkout</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="isFilterable" 
                        name="isFilterable"
                        defaultChecked={selectedAttribute?.isFilterable || false}
                      />
                      <Label htmlFor="isFilterable">Use for product filtering</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="isSwatch" 
                        name="isSwatch"
                        defaultChecked={selectedAttribute?.isSwatch || false}
                      />
                      <Label htmlFor="isSwatch">Display as color swatch</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="isVariant" 
                        name="isVariant"
                        defaultChecked={selectedAttribute?.isVariant || false}
                      />
                      <Label htmlFor="isVariant">Use for product variants</Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAttributeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAttributeMutation.isPending || updateAttributeMutation.isPending}>
                  {(createAttributeMutation.isPending || updateAttributeMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Option Creation/Edit Dialog */}
        <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {optionFormMode === "create" ? "Add Option" : "Edit Option"}
              </DialogTitle>
              <DialogDescription>
                {optionFormMode === "create" 
                  ? `Add a new option to ${selectedAttribute?.displayName}`
                  : `Edit option for ${selectedAttribute?.displayName}`
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleOptionSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="value" className="text-right">
                    Value
                  </Label>
                  <Input
                    id="value"
                    name="value"
                    placeholder="red"
                    defaultValue={selectedOption?.value || ""}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="displayValue" className="text-right">
                    Display Value
                  </Label>
                  <Input
                    id="displayValue"
                    name="displayValue"
                    placeholder="Red"
                    defaultValue={selectedOption?.displayValue || ""}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sortOrder" className="text-right">
                    Sort Order
                  </Label>
                  <Input
                    id="sortOrder"
                    name="sortOrder"
                    type="number"
                    min="0"
                    defaultValue={selectedOption?.sortOrder || 0}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOptionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createOptionMutation.isPending || updateOptionMutation.isPending}>
                  {(createOptionMutation.isPending || updateOptionMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Option Metadata Dialog */}
        <Dialog open={optionMetadataDialogOpen} onOpenChange={setOptionMetadataDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Metadata</DialogTitle>
              <DialogDescription>
                Edit the metadata for {selectedOption?.displayValue}. Use valid JSON format.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="metadata">Metadata (JSON)</Label>
                <Textarea
                  id="metadata"
                  value={optionMetadata}
                  onChange={(e) => setOptionMetadata(e.target.value)}
                  className="font-mono"
                  rows={10}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOptionMetadataDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveMetadata} disabled={updateOptionMutation.isPending}>
                {updateOptionMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Delete Dialog */}
        <Dialog open={confirmDeleteDialogOpen} onOpenChange={setConfirmDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                {itemToDelete?.type === 'attribute'
                  ? "Are you sure you want to delete this attribute? This action cannot be undone and will also delete all associated options."
                  : "Are you sure you want to delete this option? This action cannot be undone."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={
                  deleteAttributeMutation.isPending || deleteOptionMutation.isPending
                }
              >
                {(deleteAttributeMutation.isPending || deleteOptionMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

export default GlobalAttributesPage;