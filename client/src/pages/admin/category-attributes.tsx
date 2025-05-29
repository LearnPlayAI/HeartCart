import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { useParams } from "wouter";
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft, 
  Info, 
  ChevronRight,
  Check,
  X
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { ApiError } from "@/lib/exceptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Attribute, 
  AttributeOption, 
  CatalogAttribute,
  CatalogAttributeOption,
  CategoryAttribute,
  CategoryAttributeOption
} from "@/types/attribute-types";

interface AttributeWithSelection extends Attribute {
  isSelected?: boolean;
  catalogAttributeId?: number | null;
}

function CategoryAttributesPage() {
  const { toast } = useToast();
  const { categoryId } = useParams<{ categoryId: string }>();
  const [selectedAttribute, setSelectedAttribute] = useState<CategoryAttribute | null>(null);
  const [attributeDialogOpen, setAttributeDialogOpen] = useState(false);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [optionMetadataDialogOpen, setOptionMetadataDialogOpen] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [attributeSelectOpen, setAttributeSelectOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<CategoryAttributeOption | null>(null);
  const [optionMetadata, setOptionMetadata] = useState<string>("");
  const [optionFormMode, setOptionFormMode] = useState<"create" | "edit">("create");
  const [itemToDelete, setItemToDelete] = useState<{ type: 'attribute' | 'option', id: number } | null>(null);
  const [selectedGlobalAttributes, setSelectedGlobalAttributes] = useState<AttributeWithSelection[]>([]);
  const [selectedTab, setSelectedTab] = useState<"global" | "catalog">("global");
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>("");

  // Fetch category info
  const {
    data: categoryResponse,
    isLoading: categoryLoading,
    error: categoryError,
  } = useQuery<{ success: boolean, data: any, error?: { message: string } }>({
    queryKey: ["/api/categories", categoryId],
    enabled: !!categoryId,
    retry: 1,
    queryFn: async () => {
      const response = await fetch(`/api/categories/${categoryId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch category");
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to fetch category");
      }
      
      return result;
    }
  });
  
  const category = categoryResponse?.data;

  // Fetch category attributes
  const {
    data: categoryAttributesResponse,
    isLoading: categoryAttributesLoading,
    error: categoryAttributesError,
  } = useQuery<{ success: boolean, data: any[], error?: { message: string } }>({
    queryKey: ["/api/categories", categoryId, "attributes"],
    enabled: !!categoryId,
    retry: 1,
    queryFn: async () => {
      const response = await fetch(`/api/categories/${categoryId}/attributes`);
      if (!response.ok) {
        throw new Error("Failed to fetch category attributes");
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to fetch category attributes");
      }
      
      return result;
    }
  });
  
  const categoryAttributes = categoryAttributesResponse?.data || [];

  // Fetch global attributes (for attribute selection)
  const {
    data: globalAttributesResponse,
    isLoading: globalAttributesLoading,
    error: globalAttributesError,
  } = useQuery<{ success: boolean, data: any[], error?: { message: string } }>({
    queryKey: ["/api/attributes"],
    retry: 1,
    queryFn: async () => {
      const response = await fetch("/api/attributes");
      if (!response.ok) {
        throw new Error("Failed to fetch global attributes");
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to fetch global attributes");
      }
      
      return result;
    }
  });
  
  const globalAttributes = globalAttributesResponse?.data || [];

  // Fetch all catalogs
  const {
    data: catalogsResponse,
    isLoading: catalogsLoading,
    error: catalogsError,
  } = useQuery<{ success: boolean, data: any[], error?: { message: string } }>({
    queryKey: ["/api/catalogs"],
    retry: 1,
    queryFn: async () => {
      const response = await fetch("/api/catalogs");
      if (!response.ok) {
        throw new Error("Failed to fetch catalogs");
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to fetch catalogs");
      }
      
      return result;
    }
  });
  
  const catalogs = catalogsResponse?.data || [];

  // Fetch catalog attributes when a catalog is selected
  const {
    data: catalogAttributesResponse,
    isLoading: catalogAttributesLoading,
    error: catalogAttributesError,
  } = useQuery<{ success: boolean, data: any[], error?: { message: string } }>({
    queryKey: ["/api/catalogs", selectedCatalogId, "attributes"],
    enabled: !!selectedCatalogId && selectedCatalogId !== "",
    retry: 1,
    queryFn: async () => {
      if (!selectedCatalogId || selectedCatalogId === "") {
        return { success: true, data: [] };
      }
      
      const response = await fetch(`/api/catalogs/${selectedCatalogId}/attributes`);
      if (!response.ok) {
        throw new Error("Failed to fetch catalog attributes");
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to fetch catalog attributes");
      }
      
      return result;
    }
  });
  
  const catalogAttributes = catalogAttributesResponse?.data || [];

  // Fetch attribute options when a category attribute is selected
  const {
    data: optionsResponse,
    isLoading: optionsLoading,
    error: optionsError,
  } = useQuery<{ success: boolean, data: any[], error?: { message: string } }>({
    queryKey: ["/api/categories", categoryId, "attributes", selectedAttribute?.attributeId, "options"],
    enabled: !!selectedAttribute?.attributeId && !!categoryId,
    retry: 1,
    queryFn: async () => {
      if (!selectedAttribute?.attributeId || !categoryId) {
        return { success: true, data: [] };
      }
      
      const response = await fetch(`/api/categories/${categoryId}/attributes/${selectedAttribute.attributeId}/options`);
      if (!response.ok) {
        throw new Error("Failed to fetch attribute options");
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to fetch attribute options");
      }
      
      return result;
    }
  });
  
  const options = optionsResponse?.data || [];

  // Update list of global attributes for selection, marking those already added to the category
  useEffect(() => {
    if (globalAttributes && categoryAttributes) {
      const updatedGlobalAttributes = globalAttributes.map((attr: Attribute) => {
        const existingAttr = categoryAttributes.find(
          (catAttr: CategoryAttribute) => catAttr.attributeId === attr.id
        );
        
        return {
          ...attr,
          isSelected: !!existingAttr,
          catalogAttributeId: existingAttr?.catalogAttributeId || null
        };
      });
      setSelectedGlobalAttributes(updatedGlobalAttributes);
    }
  }, [globalAttributes, categoryAttributes]);

  // Add category attribute mutation
  const addCategoryAttributeMutation = useMutation({
    mutationFn: async (newAttribute: {
      attributeId: number;
      catalogAttributeId?: number | null;
      overrideDisplayName?: string | null;
      isRequired?: boolean;
      sortOrder?: number;
    }) => {
      const response = await fetch(`/api/categories/${categoryId}/attributes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newAttribute),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new ApiError(
          result.error?.message || "Failed to add attribute to category",
          response.status
        );
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories", categoryId, "attributes"] });
      
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add attribute to category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update category attribute mutation
  const updateCategoryAttributeMutation = useMutation({
    mutationFn: async (updatedAttribute: Partial<CategoryAttribute> & { id: number }) => {
      const { id, ...data } = updatedAttribute;
      const response = await fetch(`/api/categories/${categoryId}/attributes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new ApiError(
          result.error?.message || "Failed to update category attribute",
          response.status
        );
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories", categoryId, "attributes"] });
      setAttributeDialogOpen(false);
      
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update category attribute",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete category attribute mutation
  const deleteCategoryAttributeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/categories/${categoryId}/attributes/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new ApiError(
          result.error?.message || "Failed to delete category attribute",
          response.status
        );
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories", categoryId, "attributes"] });
      setSelectedAttribute(null);
      setConfirmDeleteDialogOpen(false);
      setItemToDelete(null);
      
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove attribute from category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create option mutation
  const createOptionMutation = useMutation({
    mutationFn: async (newOption: Omit<CategoryAttributeOption, "id">) => {
      if (!selectedAttribute) return null;

      const response = await fetch(`/api/categories/${categoryId}/attributes/${selectedAttribute.attributeId}/options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newOption),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new ApiError(
          result.error?.message || "Failed to create option",
          response.status
        );
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/categories", categoryId, "attributes", selectedAttribute?.attributeId, "options"] 
      });
      setOptionDialogOpen(false);
      
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
    mutationFn: async (updatedOption: Partial<CategoryAttributeOption> & { id: number }) => {
      if (!selectedAttribute) return null;
      
      const { id, ...data } = updatedOption;
      const response = await fetch(`/api/categories/${categoryId}/attributes/${selectedAttribute.attributeId}/options/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new ApiError(
          result.error?.message || "Failed to update option",
          response.status
        );
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/categories", categoryId, "attributes", selectedAttribute?.attributeId, "options"] 
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

      const response = await fetch(`/api/categories/${categoryId}/attributes/${selectedAttribute.attributeId}/options/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new ApiError(
          result.error?.message || "Failed to delete option",
          response.status
        );
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/categories", categoryId, "attributes", selectedAttribute?.attributeId, "options"] 
      });
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

      const response = await fetch(`/api/categories/${categoryId}/attributes/${selectedAttribute.attributeId}/options/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ optionIds }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new ApiError(
          result.error?.message || "Failed to reorder options",
          response.status
        );
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/categories", categoryId, "attributes", selectedAttribute?.attributeId, "options"] 
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

  // Handle attribute form submission
  const handleAttributeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!selectedAttribute) return;

    const attributeData = {
      id: selectedAttribute.id,
      overrideDisplayName: formData.get("overrideDisplayName") as string || null,
      isRequired: formData.has("isRequired"),
      sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
    };
    
    updateCategoryAttributeMutation.mutate(attributeData);
  };

  // Handle option form submission
  const handleOptionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const optionData = {
      categoryAttributeId: selectedAttribute?.id || 0,
      value: formData.get("value") as string,
      displayValue: formData.get("displayValue") as string,
      sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
      baseOptionId: formData.get("baseOptionId") ? parseInt(formData.get("baseOptionId") as string) : null,
      catalogOptionId: formData.get("catalogOptionId") ? parseInt(formData.get("catalogOptionId") as string) : null,
      metadata: selectedOption?.metadata || null,
    };
    
    if (optionFormMode === "create") {
      createOptionMutation.mutate(optionData);
    } else if (optionFormMode === "edit" && selectedOption) {
      updateOptionMutation.mutate({
        id: selectedOption.id,
        ...optionData,
      });
    }
  };

  // Handle global attribute selection
  const handleGlobalAttributeSelection = (attributeId: number, isSelected: boolean) => {
    if (isSelected) {
      // Deselect attribute
      const updatedAttributes = selectedGlobalAttributes.map(attr => 
        attr.id === attributeId ? { ...attr, isSelected: false } : attr
      );
      setSelectedGlobalAttributes(updatedAttributes);
    } else {
      // Select attribute
      const updatedAttributes = selectedGlobalAttributes.map(attr => 
        attr.id === attributeId ? { ...attr, isSelected: true } : attr
      );
      setSelectedGlobalAttributes(updatedAttributes);
    }
  };

  // Handle catalog attribute selection
  const handleCatalogAttributeSelection = (attribute: CatalogAttribute, isSelected: boolean) => {
    if (isSelected) {
      // Deselect catalog attribute
      const updatedAttributes = selectedGlobalAttributes.map(attr => 
        attr.id === attribute.attributeId ? { ...attr, isSelected: false, catalogAttributeId: null } : attr
      );
      setSelectedGlobalAttributes(updatedAttributes);
    } else {
      // Select catalog attribute
      const updatedAttributes = selectedGlobalAttributes.map(attr => 
        attr.id === attribute.attributeId ? { ...attr, isSelected: true, catalogAttributeId: attribute.id } : attr
      );
      setSelectedGlobalAttributes(updatedAttributes);
    }
  };

  // Handle saving selected attributes
  const handleSaveSelectedAttributes = () => {
    const newlySelectedAttributes = selectedGlobalAttributes.filter(
      attr => attr.isSelected && !categoryAttributes?.some(
        (catAttr: CategoryAttribute) => catAttr.attributeId === attr.id
      )
    );

    // Add each newly selected attribute to the category
    newlySelectedAttributes.forEach(attr => {
      addCategoryAttributeMutation.mutate({
        attributeId: attr.id,
        catalogAttributeId: attr.catalogAttributeId || null,
        overrideDisplayName: null,
        isRequired: attr.isRequired,
        sortOrder: 0,
      });
    });

    setAttributeSelectOpen(false);
  };

  // Handle opening the attribute dialog for editing an existing attribute
  const handleEditAttribute = (attribute: CategoryAttribute) => {
    setSelectedAttribute(attribute);
    setAttributeDialogOpen(true);
  };

  // Handle opening the option dialog for creating a new option
  const handleNewOption = () => {
    setSelectedOption(null);
    setOptionFormMode("create");
    setOptionDialogOpen(true);
  };

  // Handle opening the option dialog for editing an existing option
  const handleEditOption = (option: CategoryAttributeOption) => {
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
      deleteCategoryAttributeMutation.mutate(itemToDelete.id);
    } else if (itemToDelete.type === 'option') {
      deleteOptionMutation.mutate(itemToDelete.id);
    }
  };

  // Handle opening the metadata dialog
  const handleEditMetadata = (option: CategoryAttributeOption) => {
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
  const handleSelectAttribute = (attribute: CategoryAttribute) => {
    setSelectedAttribute(
      selectedAttribute?.id === attribute.id ? null : attribute
    );
  };

  // Loading state for the category
  if (categoryLoading || categoryAttributesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state for the category
  if (categoryError || categoryAttributesError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-screen">
        <h1 className="text-2xl font-bold text-destructive">Error Loading Category</h1>
        <p>{((categoryError || categoryAttributesError) as Error).message}</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/categories", categoryId] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Category Attributes | TeeMeYou Admin</title>
      </Helmet>

      <div className="container mx-auto py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" className="mr-2" asChild>
            <a href="/admin/categories">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Categories
            </a>
          </Button>
          <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground" />
          <h1 className="text-3xl font-bold">Attributes for {category?.name}</h1>
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            Manage attributes and their options for the '{category?.name}' category.
            These attributes will be inherited by all products in this category.
          </p>
          <Button onClick={() => setAttributeSelectOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Attributes
          </Button>
        </div>

        {/* Attributes List */}
        <Card>
          <CardHeader>
            <CardTitle>Category Attributes</CardTitle>
            <CardDescription>
              Click on an attribute to view and manage its options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Global Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Required</TableHead>
                    <TableHead className="text-center">Sort Order</TableHead>
                    <TableHead className="text-center">Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryAttributes?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No attributes found for this category. Add attributes to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categoryAttributes?.map((attribute: CategoryAttribute) => (
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
                            {attribute.attribute?.name || "Unknown"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {attribute.overrideDisplayName || 
                            attribute.catalogAttribute?.overrideDisplayName || 
                            attribute.attribute?.displayName || 
                            "Unknown"}
                          {attribute.overrideDisplayName && (
                            <Badge variant="outline" className="ml-2">Overridden</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{attribute.attribute?.attributeType || "Unknown"}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {attribute.isRequired ? "Yes" : "No"}
                        </TableCell>
                        <TableCell className="text-center">
                          {attribute.sortOrder}
                        </TableCell>
                        <TableCell className="text-center">
                          {attribute.catalogAttributeId ? (
                            <Badge variant="secondary">Catalog</Badge>
                          ) : (
                            <Badge>Global</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
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
                  <CardTitle>
                    Options for {selectedAttribute.overrideDisplayName || 
                                selectedAttribute.catalogAttribute?.overrideDisplayName || 
                                selectedAttribute.attribute?.displayName}
                  </CardTitle>
                  <CardDescription>
                    Manage the available options for this attribute in this category
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
                  No category-specific options found for this attribute. Add options to customize this attribute for this category.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Order</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Display Value</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="w-[150px]">Metadata</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {options?.map((option: CategoryAttributeOption) => (
                        <TableRow key={option.id}>
                          <TableCell>{option.sortOrder}</TableCell>
                          <TableCell className="font-medium">{option.value}</TableCell>
                          <TableCell>{option.displayValue}</TableCell>
                          <TableCell>
                            {option.catalogOption ? (
                              <Badge variant="secondary">Catalog</Badge>
                            ) : option.baseOption ? (
                              <Badge>Global</Badge>
                            ) : (
                              <Badge variant="outline">Custom</Badge>
                            )}
                          </TableCell>
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

        {/* Attribute Edit Dialog */}
        <Dialog open={attributeDialogOpen} onOpenChange={setAttributeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category Attribute</DialogTitle>
              <DialogDescription>
                Customize how this attribute appears in this category
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAttributeSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="globalName">Global Attribute</Label>
                    <Input
                      id="globalName"
                      value={selectedAttribute?.attribute?.name || ""}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Base attribute from the {selectedAttribute?.catalogAttributeId ? "catalog" : "global"} attribute library
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overrideDisplayName">Override Display Name (Optional)</Label>
                  <Input
                    id="overrideDisplayName"
                    name="overrideDisplayName"
                    placeholder={selectedAttribute?.catalogAttribute?.overrideDisplayName || selectedAttribute?.attribute?.displayName || ""}
                    defaultValue={selectedAttribute?.overrideDisplayName || ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use the {selectedAttribute?.catalogAttributeId ? "catalog" : "global"} display name
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isRequired" 
                    name="isRequired"
                    defaultChecked={selectedAttribute?.isRequired || false} 
                  />
                  <Label htmlFor="isRequired">Required for products in this category</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    name="sortOrder"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={selectedAttribute?.sortOrder || 0}
                  />
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
                  disabled={updateCategoryAttributeMutation.isPending}
                >
                  {updateCategoryAttributeMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Option Form Dialog */}
        <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {optionFormMode === "create" ? "Create New Option" : "Edit Option"}
              </DialogTitle>
              <DialogDescription>
                {optionFormMode === "create"
                  ? `Add a new option for ${selectedAttribute?.overrideDisplayName || selectedAttribute?.attribute?.displayName}`
                  : `Update the option for ${selectedAttribute?.overrideDisplayName || selectedAttribute?.attribute?.displayName}`}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleOptionSubmit}>
              <div className="grid gap-4 py-4">
                {selectedAttribute?.catalogAttributeId ? (
                  <div className="space-y-2">
                    <Label htmlFor="catalogOptionId">Catalog Option (Optional)</Label>
                    <Select 
                      name="catalogOptionId" 
                      defaultValue={selectedOption?.catalogOptionId?.toString() || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a catalog option or leave empty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Custom Option (No Catalog Base)</SelectItem>
                        {selectedAttribute?.catalogAttribute?.options?.map((option: CatalogAttributeOption) => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.displayValue} ({option.value})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Base this option on a catalog option, or leave empty to create a custom option
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="baseOptionId">Global Option (Optional)</Label>
                    <Select 
                      name="baseOptionId" 
                      defaultValue={selectedOption?.baseOptionId?.toString() || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a global option or leave empty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Custom Option (No Base)</SelectItem>
                        {selectedAttribute?.attribute?.options?.map((option: AttributeOption) => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.displayValue} ({option.value})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Base this option on a global option, or leave empty to create a custom option
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    name="value"
                    placeholder="red"
                    defaultValue={selectedOption?.value || ""}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Internal value, lowercase with no spaces
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayValue">Display Value</Label>
                  <Input
                    id="displayValue"
                    name="displayValue"
                    placeholder="Ruby Red"
                    defaultValue={selectedOption?.displayValue || ""}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Customer-facing value
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    name="sortOrder"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={selectedOption?.sortOrder || 0}
                  />
                </div>

                {selectedOption?.metadata && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Metadata</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditMetadata(selectedOption)}
                      >
                        Edit Metadata
                      </Button>
                    </div>
                    <div className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto">
                      {JSON.stringify(selectedOption.metadata, null, 2)}
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
                  disabled={
                    createOptionMutation.isPending || updateOptionMutation.isPending
                  }
                >
                  {(createOptionMutation.isPending || updateOptionMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {optionFormMode === "create" ? "Create Option" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Option Metadata Dialog */}
        <Dialog open={optionMetadataDialogOpen} onOpenChange={setOptionMetadataDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Metadata</DialogTitle>
              <DialogDescription>
                Edit the metadata for this option in JSON format
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="metadata">Metadata (JSON)</Label>
                <Textarea
                  id="metadata"
                  value={optionMetadata}
                  onChange={(e) => setOptionMetadata(e.target.value)}
                  placeholder='{"hexCode": "#FF0000"}'
                  rows={10}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Enter metadata as valid JSON
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOptionMetadataDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveMetadata}
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

        {/* Confirm Delete Dialog */}
        <AlertDialog open={confirmDeleteDialogOpen} onOpenChange={setConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                {itemToDelete?.type === 'attribute'
                  ? "Are you sure you want to remove this attribute from the category? This action cannot be undone and will also delete all associated category-specific options."
                  : "Are you sure you want to delete this option? This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={
                  deleteCategoryAttributeMutation.isPending || deleteOptionMutation.isPending
                }
              >
                {(deleteCategoryAttributeMutation.isPending || deleteOptionMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Attribute Selection Sheet */}
        <Sheet open={attributeSelectOpen} onOpenChange={setAttributeSelectOpen}>
          <SheetContent className="md:max-w-xl">
            <SheetHeader>
              <SheetTitle>Add Attributes to Category</SheetTitle>
              <SheetDescription>
                Select attributes to add to this category
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6">
              <Tabs 
                onValueChange={(value) => setSelectedTab(value as "global" | "catalog")}
                value={selectedTab}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="global">From Global Attributes</TabsTrigger>
                  <TabsTrigger value="catalog">From Catalogs</TabsTrigger>
                </TabsList>
                
                <TabsContent value="global" className="mt-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {globalAttributesLoading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : selectedGlobalAttributes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                              No global attributes found
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedGlobalAttributes
                            .filter(attr => !categoryAttributes?.some(
                              (catAttr: CategoryAttribute) => 
                                catAttr.attributeId === attr.id && catAttr.catalogAttributeId === null
                            ))
                            .map((attribute) => (
                              <TableRow key={attribute.id}>
                                <TableCell>
                                  <button 
                                    type="button"
                                    className={`flex items-center justify-center h-5 w-5 rounded-full border ${
                                      attribute.isSelected && attribute.catalogAttributeId === null
                                        ? 'bg-primary text-primary-foreground border-primary' 
                                        : 'border-input'
                                    }`}
                                    onClick={() => handleGlobalAttributeSelection(attribute.id, 
                                      attribute.isSelected && attribute.catalogAttributeId === null)}
                                  >
                                    {attribute.isSelected && attribute.catalogAttributeId === null && <Check className="h-3 w-3" />}
                                  </button>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{attribute.displayName}</div>
                                  <div className="text-xs text-muted-foreground">{attribute.name}</div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{attribute.attributeType}</Badge>
                                </TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                
                <TabsContent value="catalog" className="mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="catalogSelect">Select Catalog</Label>
                      <Select 
                        onValueChange={(value) => setSelectedCatalogId(value)}
                        value={selectedCatalogId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a catalog" />
                        </SelectTrigger>
                        <SelectContent>
                          {catalogsLoading ? (
                            <div className="flex justify-center p-2">
                              <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                          ) : catalogs?.length === 0 ? (
                            <div className="p-2 text-center text-muted-foreground">
                              No catalogs found
                            </div>
                          ) : (
                            catalogs?.map((catalog: any) => (
                              <SelectItem key={catalog.id} value={catalog.id.toString()}>
                                {catalog.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedCatalogId && (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]"></TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Type</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {catalogAttributesLoading ? (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center py-4">
                                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                </TableCell>
                              </TableRow>
                            ) : !catalogAttributes || catalogAttributes.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                  No attributes found in this catalog
                                </TableCell>
                              </TableRow>
                            ) : (
                              catalogAttributes.map((attribute: CatalogAttribute) => {
                                const isAlreadySelected = categoryAttributes?.some(
                                  (catAttr: CategoryAttribute) => 
                                    catAttr.attributeId === attribute.attributeId && 
                                    catAttr.catalogAttributeId === attribute.id
                                );
                                
                                const isSelectedInOtherSource = categoryAttributes?.some(
                                  (catAttr: CategoryAttribute) => 
                                    catAttr.attributeId === attribute.attributeId && 
                                    catAttr.catalogAttributeId !== attribute.id
                                );
                                
                                if (isAlreadySelected) return null;
                                
                                const globalAttribute = selectedGlobalAttributes.find(
                                  (attr) => attr.id === attribute.attributeId
                                );
                                
                                if (!globalAttribute) return null;
                                
                                const isSelected = globalAttribute.isSelected && 
                                                  globalAttribute.catalogAttributeId === attribute.id;
                                
                                return (
                                  <TableRow key={attribute.id} className={isSelectedInOtherSource ? "opacity-50" : ""}>
                                    <TableCell>
                                      <button 
                                        type="button"
                                        className={`flex items-center justify-center h-5 w-5 rounded-full border ${
                                          isSelected 
                                            ? 'bg-primary text-primary-foreground border-primary' 
                                            : 'border-input'
                                        }`}
                                        onClick={() => handleCatalogAttributeSelection(attribute, isSelected)}
                                        disabled={isSelectedInOtherSource}
                                      >
                                        {isSelected && <Check className="h-3 w-3" />}
                                      </button>
                                    </TableCell>
                                    <TableCell>
                                      <div className="font-medium">
                                        {attribute.overrideDisplayName || attribute.attribute?.displayName}
                                        {isSelectedInOtherSource && (
                                          <Badge variant="outline" className="ml-2">Already added</Badge>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground">{attribute.attribute?.name}</div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{attribute.attribute?.attributeType}</Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              }).filter(Boolean)
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setAttributeSelectOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSelectedAttributes}
                disabled={addCategoryAttributeMutation.isPending}
              >
                {addCategoryAttributeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Selected
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

export default CategoryAttributesPage;