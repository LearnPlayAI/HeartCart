/**
 * Global Attributes Management Page
 * 
 * This page allows administrators to manage global attributes and their options
 * using the centralized attribute system. Global attributes can be assigned to products
 * during product creation or editing.
 */

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { 
  Loader2, Plus, Edit, Trash2, Save, X, ArrowUpDown, 
  Info, HelpCircle, Eye, Search, Check 
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [attributeFilter, setAttributeFilter] = useState<string | null>(null);
  const [nextAttributeSortOrder, setNextAttributeSortOrder] = useState<number>(0);
  const [nextOptionSortOrder, setNextOptionSortOrder] = useState<number>(0);

  // Fetch global attributes from the centralized attribute system
  const {
    data: attributesResponse,
    isLoading: attributesLoading,
    error: attributesError,
    refetch: refetchAttributes
  } = useQuery({
    queryKey: ["/api/attributes"],
    retry: 1,
    refetchOnMount: true,
    staleTime: 0 // Consider data stale immediately to force refetch
  });
  
  // Extract the attributes data from the standardized response
  const attributes = attributesResponse?.data || [];
  
  // Effect to refetch attributes when navigating back to this page
  useEffect(() => {
    refetchAttributes();
  }, [refetchAttributes]);

  // Effect to calculate next available sort orders
  useEffect(() => {
    if (attributes && attributes.length > 0) {
      const maxSortOrder = Math.max(...attributes.map(attr => attr.sortOrder || 0));
      setNextAttributeSortOrder(maxSortOrder + 1);
    } else {
      setNextAttributeSortOrder(0);
    }
  }, [attributes]);

  // Fetch attribute options when an attribute is selected
  const {
    data: optionsResponse,
    isLoading: optionsLoading,
    error: optionsError,
    refetch: refetchOptions
  } = useQuery({
    queryKey: ["/api/attributes", selectedAttribute?.id, "options"],
    queryFn: async () => {
      console.log(`Fetching options for attribute ID: ${selectedAttribute?.id}`);
      if (!selectedAttribute?.id) {
        return { success: true, data: [] };
      }
      try {
        // Direct API call with fetch to avoid any potential issues with the wrapper
        const response = await fetch(`/api/attributes/${selectedAttribute.id}/options`);
        if (!response.ok) {
          throw new Error(`Failed to fetch options: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Options direct fetch response:', data);
        return data;
      } catch (err) {
        console.error('Error fetching options:', err);
        throw err;
      }
    },
    enabled: !!selectedAttribute?.id,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0, // Consider data stale immediately to force refetch
    retry: 2,
  });
  
  // Extract the options data from the standardized response
  const options = optionsResponse?.data || [];
  
  // Debug log the options
  useEffect(() => {
    if (selectedAttribute) {
      console.log(`Selected attribute: ${selectedAttribute.name} (ID: ${selectedAttribute.id})`);
      console.log('Options loaded:', options);
    }
  }, [selectedAttribute, options]);

  // Calculate next option sort order when options change
  useEffect(() => {
    if (selectedAttribute && options && options.length > 0) {
      const maxSortOrder = Math.max(...options.map(opt => opt.sortOrder || 0));
      setNextOptionSortOrder(maxSortOrder + 1);
    } else {
      setNextOptionSortOrder(0);
    }
  }, [selectedAttribute, options]);

  // Create attribute mutation
  const createAttributeMutation = useMutation({
    mutationFn: async (newAttribute: Omit<Attribute, "id">) => {
      const response = await apiRequest("POST", "/api/attributes", newAttribute);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attributes"] });
      setAttributeDialogOpen(false);
      
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
      const response = await apiRequest("PUT", `/api/attributes/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attributes"] });
      setAttributeDialogOpen(false);
      
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
      const response = await apiRequest("DELETE", `/api/attributes/${id}`);
      return response;
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
    mutationFn: async (newOption: { value: string, displayValue: string, sortOrder: number, attributeId?: number }) => {
      const attributeId = newOption.attributeId || selectedAttribute?.id;
      if (!attributeId) return null;

      try {
        const payload = {
          value: newOption.value,
          displayValue: newOption.displayValue || newOption.value,
          sortOrder: newOption.sortOrder || 0,
          attributeId: attributeId
        };
        
        console.log("Creating option with payload:", payload);
        
        // Use direct fetch for more reliable behavior
        const response = await fetch(
          `/api/attributes/${attributeId}/options`, 
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP error ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error creating option:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('Successfully created option');
      
      // Invalidate both options and attributes
      queryClient.invalidateQueries({ 
        queryKey: ["/api/attributes", selectedAttribute?.id, "options"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/attributes"] 
      });
      setOptionDialogOpen(false);
      
      // Explicitly refetch options to ensure UI updates with a small delay to ensure DB consistency
      setTimeout(() => {
        if (selectedAttribute) {
          console.log('Refetching options after creation');
          refetchOptions();
        }
      }, 300);
      
      
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
      const response = await apiRequest(
        "PUT", 
        `/api/attributes/${selectedAttribute.id}/options/${id}`, 
        {
          value: data.value,
          displayValue: data.displayValue || data.value,
          metadata: data.metadata || null,
          sortOrder: data.sortOrder || 0
        }
      );
      return response;
    },
    onSuccess: () => {
      // Invalidate both the specific attribute options and the attributes list
      queryClient.invalidateQueries({ 
        queryKey: ["/api/attributes", selectedAttribute?.id, "options"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/attributes"] 
      });
      setOptionDialogOpen(false);
      setOptionMetadataDialogOpen(false);
      
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

      try {
        // Use direct fetch for more reliability
        const response = await fetch(
          `/api/attributes/${selectedAttribute.id}/options/${id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP error ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error deleting option:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Successfully deleted option");
      
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
      
      // Explicitly refetch options to ensure UI is updated immediately with a delay to ensure DB consistency
      setTimeout(() => {
        if (selectedAttribute) {
          console.log('Refetching options after deletion');
          refetchOptions();
        }
      }, 300);
      
      setConfirmDeleteDialogOpen(false);
      setItemToDelete(null);
      
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

      const response = await apiRequest(
        "POST", 
        `/api/attributes/${selectedAttribute.id}/options/reorder`, 
        { optionIds }
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/attributes", selectedAttribute?.id, "options"] 
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
      displayInProductSummary: formData.has("displayInProductSummary"),
      // sortOrder will be auto-generated by backend for new attributes
      ...(attributeFormMode === "edit" && { sortOrder: parseInt(formData.get("sortOrder") as string) || 0 }),
    };
    
    // Validate the form data - at minimum we need name, displayName, and attributeType
    if (!attributeData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    
    if (!attributeData.displayName.trim()) {
      toast({ title: "Display Name is required", variant: "destructive" });
      return;
    }
    
    if (!attributeData.attributeType) {
      toast({ title: "Attribute Type is required", variant: "destructive" });
      return;
    }
    
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
    
    const value = formData.get("value") as string;
    const displayValue = formData.get("displayValue") as string;
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;

    // Validate the value field to ensure it's not empty
    if (!value || value.trim() === '') {
      toast({
        title: "Value is required",
        description: "Please enter a value for this option",
        variant: "destructive",
      });
      return;
    }
    
    // Create simple option data with only the required fields
    if (optionFormMode === "create") {
      if (!selectedAttribute?.id) {
        toast({
          title: "Error",
          description: "No attribute selected. Please select an attribute first.",
          variant: "destructive",
        });
        return;
      }
      
      createOptionMutation.mutate({
        value, 
        displayValue: displayValue || value,
        sortOrder,
        attributeId: selectedAttribute.id
      });
    } else if (optionFormMode === "edit" && selectedOption) {
      updateOptionMutation.mutate({
        id: selectedOption.id,
        value,
        displayValue: displayValue || value,
        sortOrder,
        metadata: selectedOption.metadata
      });
    }
  };

  // Handler for metadata submission
  const handleMetadataSubmit = () => {
    if (!selectedOption) return;
    
    try {
      // Try to parse the metadata JSON
      const parsedMetadata = optionMetadata ? JSON.parse(optionMetadata) : null;
      
      // Update the option with the new metadata
      updateOptionMutation.mutate({
        id: selectedOption.id,
        metadata: parsedMetadata,
        value: selectedOption.value,
        displayValue: selectedOption.displayValue,
        sortOrder: selectedOption.sortOrder,
      });
      
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON for the metadata",
        variant: "destructive",
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

  // Handle editing the metadata for an option
  const handleEditMetadata = (option: AttributeOption) => {
    setSelectedOption(option);
    setOptionMetadata(option.metadata ? JSON.stringify(option.metadata, null, 2) : "");
    setOptionMetadataDialogOpen(true);
  };

  // Handle selecting an attribute to view its options
  const handleSelectAttribute = (attribute: Attribute) => {
    // If already selected, toggle off
    if (selectedAttribute?.id === attribute.id) {
      setSelectedAttribute(null);
    } else {
      console.log(`Selecting attribute: ${attribute.name} (ID: ${attribute.id})`);
      setSelectedAttribute(attribute);
      
      // Force a manual refetch of options
      setTimeout(() => {
        console.log('Manual refetch of options for attribute:', attribute.id);
        refetchOptions();
      }, 100);
    }
  };

  // Handle confirming deletion of an attribute or option
  const handleDeleteClick = (type: 'attribute' | 'option', id: number) => {
    setItemToDelete({ type, id });
    setConfirmDeleteDialogOpen(true);
  };

  // Handle confirming deletion
  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'attribute') {
      deleteAttributeMutation.mutate(itemToDelete.id);
    } else {
      deleteOptionMutation.mutate(itemToDelete.id);
    }
  };

  // Filter attributes based on search term
  const filteredAttributes = attributes.filter(attr => 
    attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attr.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (attr.description && attr.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ).filter(attr => 
    !attributeFilter || attributeFilter === "all" || attr.attributeType === attributeFilter
  );

  return (
    <AdminLayout title="Global Attributes" subtitle="Manage global attributes in the centralized attribute system">
      <Helmet>
        <title>Global Attributes | TeeMeYou Admin</title>
      </Helmet>

      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 w-full">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search attributes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select 
              value={attributeFilter || ""}
              onValueChange={(value) => setAttributeFilter(value || null)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ATTRIBUTE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleNewAttribute}>
            <Plus className="mr-2 h-4 w-4" />
            New Attribute
          </Button>
        </div>

        {/* Attributes List */}
        <Card>
          <CardHeader>
            <CardTitle>Global Attributes</CardTitle>
            <CardDescription>
              These attributes can be assigned to products during creation or editing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attributesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : attributes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-md">
                No attributes found. Create your first attribute to get started.
              </div>
            ) : filteredAttributes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-md">
                No attributes match your search criteria.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Filterable</TableHead>
                      <TableHead className="text-center">Required</TableHead>
                      <TableHead className="text-center">Show in Summary</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttributes.map((attribute: Attribute) => (
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
                          {attribute.isFilterable ? (
                            <Check className="h-4 w-4 text-primary mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {attribute.isRequired ? (
                            <Check className="h-4 w-4 text-primary mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {attribute.displayInProductSummary ? (
                            <Check className="h-4 w-4 text-primary mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleSelectAttribute(attribute)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View Options</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleEditAttribute(attribute)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit Attribute</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => handleDeleteClick('attribute', attribute.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete Attribute</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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

        {/* Options List - Only shown when an attribute is selected */}
        {selectedAttribute && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Options for {selectedAttribute.displayName}</CardTitle>
                  <CardDescription>
                    Manage the options for this attribute. These options will be available 
                    when a product has this attribute assigned.
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
              ) : !options || options.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  No options found for this attribute. Add options to make this attribute selectable.
                  <pre className="text-xs text-gray-500 mt-2">
                    Debug: {JSON.stringify({
                      attributeId: selectedAttribute?.id, 
                      hasOptionsResponse: !!optionsResponse,
                      options: options
                    }, null, 2)}
                  </pre>
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
                      {options?.filter(option => option.value && option.value.trim() !== '').map((option: AttributeOption) => (
                        <TableRow key={option.id}>
                          <TableCell>{option.sortOrder}</TableCell>
                          <TableCell className="font-medium">
                            {option.value}
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
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleEditOption(option)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit Option</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => handleDeleteClick('option', option.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete Option</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
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
        
        {/* Guide Card - Help for users */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="h-5 w-5 mr-2" />
              How to Use the Centralized Attribute System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>What are global attributes?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    Global attributes define characteristics of products that customers can select during purchase, 
                    such as Size, Color, or Material. They're centrally managed and can be reused across many products.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>How to create and manage attributes?</AccordionTrigger>
                <AccordionContent>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Click "New Attribute" to create a global attribute (e.g., "Color")</li>
                    <li>Add options to your attribute (e.g., "Red", "Blue", "Green")</li>
                    <li>During product creation, select which attributes apply to each product</li>
                    <li>Customers will see these options when viewing the product</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Using attributes during product creation</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    When creating or editing a product, you'll see these global attributes in the "Attributes" tab. 
                    You can enable which ones apply to each product, and mark them as required if customers must select 
                    an option before adding to cart.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>About custom product attributes</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    For one-time attributes that only apply to specific products, you can create custom attributes 
                    during product creation. These won't appear here in the global attributes list.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* New/Edit Attribute Dialog */}
      <Dialog open={attributeDialogOpen} onOpenChange={setAttributeDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{attributeFormMode === "create" ? "Create New Attribute" : "Edit Attribute"}</DialogTitle>
            <DialogDescription>
              {attributeFormMode === "create" 
                ? "Add a new global attribute that can be assigned to products" 
                : "Modify the properties of this attribute"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAttributeSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name*
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. color"
                  className="col-span-3"
                  defaultValue={selectedAttribute?.name || ""}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="displayName" className="text-right">
                  Display Name*
                </Label>
                <Input
                  id="displayName"
                  name="displayName"
                  placeholder="e.g. Color"
                  className="col-span-3"
                  defaultValue={selectedAttribute?.displayName || ""}
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
                  placeholder="A short description of this attribute"
                  className="col-span-3"
                  defaultValue={selectedAttribute?.description || ""}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="attributeType" className="text-right">
                  Type*
                </Label>
                <Select
                  name="attributeType"
                  defaultValue={selectedAttribute?.attributeType || "select"}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select attribute type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTRIBUTE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sortOrder" className="text-right">
                  Sort Order
                </Label>
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  placeholder="0"
                  className="col-span-3"
                  defaultValue={attributeFormMode === "create" ? nextAttributeSortOrder : (selectedAttribute?.sortOrder || 0)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Options</Label>
                <div className="col-span-3 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isFilterable"
                      name="isFilterable"
                      defaultChecked={selectedAttribute?.isFilterable || false}
                    />
                    <Label htmlFor="isFilterable" className="text-sm font-normal">
                      Show in product filters
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isRequired"
                      name="isRequired"
                      defaultChecked={selectedAttribute?.isRequired || false}
                    />
                    <Label htmlFor="isRequired" className="text-sm font-normal">
                      Required for checkout (default)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isSwatch"
                      name="isSwatch"
                      defaultChecked={selectedAttribute?.isSwatch || false}
                    />
                    <Label htmlFor="isSwatch" className="text-sm font-normal">
                      Show as color/texture swatch
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="displayInProductSummary"
                      name="displayInProductSummary"
                      defaultChecked={selectedAttribute?.displayInProductSummary || false}
                    />
                    <Label htmlFor="displayInProductSummary" className="text-sm font-normal">
                      Show in product summary (default)
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setAttributeDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createAttributeMutation.isPending || updateAttributeMutation.isPending}
              >
                {(createAttributeMutation.isPending || updateAttributeMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {attributeFormMode === "create" ? "Create Attribute" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New/Edit Option Dialog */}
      <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {optionFormMode === "create" ? "Add Option" : "Edit Option"}
            </DialogTitle>
            <DialogDescription>
              {optionFormMode === "create"
                ? `Add a new option for the ${selectedAttribute?.displayName} attribute`
                : `Edit this option for the ${selectedAttribute?.displayName} attribute`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOptionSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="value" className="text-right">
                  Value*
                </Label>
                <Input
                  id="value"
                  name="value"
                  placeholder="e.g. red"
                  className="col-span-3"
                  defaultValue={selectedOption?.value || ""}
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
                  placeholder="e.g. Ruby Red"
                  className="col-span-3"
                  defaultValue={selectedOption?.displayValue || ""}
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
                  placeholder="0"
                  className="col-span-3"
                  defaultValue={optionFormMode === "create" ? nextOptionSortOrder : (selectedOption?.sortOrder || 0)}
                />
              </div>
              {/* For color attributes, show color picker */}
              {selectedAttribute?.attributeType === 'color' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="colorHex" className="text-right">
                    Color Hex
                  </Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input
                      id="colorHex"
                      name="colorHex"
                      type="text"
                      placeholder="#RRGGBB"
                      className="flex-1"
                      defaultValue={selectedOption?.metadata?.hexColor || ""}
                    />
                    <div 
                      className="w-8 h-8 border rounded"
                      style={{ backgroundColor: selectedOption?.metadata?.hexColor || '#ffffff' }}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOptionDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createOptionMutation.isPending || updateOptionMutation.isPending}
              >
                {(createOptionMutation.isPending || updateOptionMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {optionFormMode === "create" ? "Add Option" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Option Metadata Dialog */}
      <Dialog open={optionMetadataDialogOpen} onOpenChange={setOptionMetadataDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Metadata for {selectedOption?.displayValue}</DialogTitle>
            <DialogDescription>
              Edit the JSON metadata for this option. For example, you can add a hex color code for color attributes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <Label htmlFor="metadata" className="font-medium">
                Metadata (JSON)
              </Label>
              <Textarea
                id="metadata"
                name="metadata"
                placeholder='{"hexColor": "#ff0000", "someProperty": "someValue"}'
                className="font-mono"
                rows={8}
                value={optionMetadata}
                onChange={(e) => setOptionMetadata(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter valid JSON. For color swatches, use the format: {`{"hexColor": "#ff0000"}`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOptionMetadataDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleMetadataSubmit}
              disabled={updateOptionMutation.isPending}
            >
              {updateOptionMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Metadata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Deletion */}
      <AlertDialog open={confirmDeleteDialogOpen} onOpenChange={setConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {itemToDelete?.type === 'attribute' 
                ? 'Are you sure you want to delete this attribute?' 
                : 'Are you sure you want to delete this option?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'attribute' 
                ? 'This will permanently delete the attribute and all of its options. This action cannot be undone.' 
                : 'This will permanently delete this option. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              {itemToDelete?.type === 'attribute' 
                ? (deleteAttributeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />)
                : (deleteOptionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />)
              }
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

export default GlobalAttributesPage;