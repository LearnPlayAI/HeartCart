import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { useParams } from "wouter";
import { useDateFormat } from "@/hooks/use-date-format";
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
  CategoryAttribute,
  CategoryAttributeOption,
  ProductAttribute,
  ProductAttributeOption,
  ProductAttributeValue
} from "@/types/attribute-types";

interface AttributeWithSelection extends Attribute {
  isSelected?: boolean;
  categoryAttributeId?: number | null;
}

function ProductAttributesPage() {
  const { toast } = useToast();
  const { productId } = useParams<{ productId: string }>();
  const { formatISODate } = useDateFormat();
  const [selectedAttribute, setSelectedAttribute] = useState<ProductAttribute | null>(null);
  const [attributeDialogOpen, setAttributeDialogOpen] = useState(false);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [optionMetadataDialogOpen, setOptionMetadataDialogOpen] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [attributeSelectOpen, setAttributeSelectOpen] = useState(false);
  const [attributeValueDialogOpen, setAttributeValueDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ProductAttributeOption | null>(null);
  const [selectedAttributeValue, setSelectedAttributeValue] = useState<ProductAttributeValue | null>(null);
  const [optionMetadata, setOptionMetadata] = useState<string>("");
  const [optionFormMode, setOptionFormMode] = useState<"create" | "edit">("create");
  const [attributeValueFormMode, setAttributeValueFormMode] = useState<"create" | "edit">("create");
  const [itemToDelete, setItemToDelete] = useState<{ type: 'attribute' | 'option' | 'value', id: number } | null>(null);
  const [selectedCategoryAttributes, setSelectedCategoryAttributes] = useState<AttributeWithSelection[]>([]);
  const [activeTab, setActiveTab] = useState<"attributes" | "values">("attributes");

  // Fetch product info
  const {
    data: productResponse,
    isLoading: productLoading,
    error: productError,
  } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["/api/products", productId],
    enabled: !!productId,
    retry: 1,
  });
  
  const product = productResponse?.success ? productResponse.data : undefined;

  // Fetch product attributes
  const {
    data: productAttributesResponse,
    isLoading: productAttributesLoading,
    error: productAttributesError,
  } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["/api/products", productId, "attributes"],
    enabled: !!productId,
    retry: 1,
  });
  
  const productAttributes = productAttributesResponse?.success ? productAttributesResponse.data : undefined;

  // Fetch attribute values
  const {
    data: attributeValuesResponse,
    isLoading: attributeValuesLoading,
    error: attributeValuesError,
  } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["/api/products", productId, "attribute-values"],
    enabled: !!productId,
    retry: 1,
  });
  
  const attributeValues = attributeValuesResponse?.success ? attributeValuesResponse.data : undefined;

  // Fetch category attributes for the product's category
  const {
    data: categoryAttributesResponse,
    isLoading: categoryAttributesLoading,
    error: categoryAttributesError,
  } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["/api/categories", product?.categoryId, "attributes"],
    enabled: !!product?.categoryId,
    retry: 1,
  });
  
  const categoryAttributes = categoryAttributesResponse?.success ? categoryAttributesResponse.data : undefined;

  // Fetch attribute options when a product attribute is selected
  const {
    data: optionsResponse,
    isLoading: optionsLoading,
    error: optionsError,
  } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["/api/products", productId, "attributes", selectedAttribute?.attributeId, "options"],
    enabled: !!selectedAttribute?.attributeId && !!productId,
    retry: 1,
  });
  
  const options = optionsResponse?.success ? optionsResponse.data : undefined;

  // Update list of category attributes for selection, marking those already added to the product
  useEffect(() => {
    if (categoryAttributes && productAttributes) {
      const updatedCategoryAttributes = categoryAttributes.map((attr: CategoryAttribute) => {
        const existingAttr = productAttributes.find(
          (prodAttr: ProductAttribute) => prodAttr.attributeId === attr.attributeId
        );
        
        return {
          ...attr.attribute,
          isSelected: !!existingAttr,
          categoryAttributeId: attr.id
        };
      });
      setSelectedCategoryAttributes(updatedCategoryAttributes);
    }
  }, [categoryAttributes, productAttributes]);

  // Add product attribute mutation
  const addProductAttributeMutation = useMutation({
    mutationFn: async (newAttribute: {
      attributeId: number;
      categoryAttributeId?: number | null;
      overrideDisplayName?: string | null;
      isRequired?: boolean;
      sortOrder?: number;
    }) => {
      const response = await fetch(`/api/products/${productId}/attributes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newAttribute),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new ApiError(
          result.error?.message || "Failed to add attribute to product",
          response.status
        );
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "attributes"] });
      toast({
        title: "Attribute added to product successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add attribute to product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update product attribute mutation
  const updateProductAttributeMutation = useMutation({
    mutationFn: async (updatedAttribute: Partial<ProductAttribute> & { id: number }) => {
      const { id, ...data } = updatedAttribute;
      const response = await fetch(`/api/products/${productId}/attributes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new ApiError(
          result.error?.message || "Failed to update product attribute",
          response.status
        );
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "attributes"] });
      setAttributeDialogOpen(false);
      toast({
        title: "Product attribute updated successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update product attribute",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete product attribute mutation
  const deleteProductAttributeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/products/${productId}/attributes/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new ApiError(
          result.error?.message || "Failed to delete product attribute",
          response.status
        );
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "attributes"] });
      setSelectedAttribute(null);
      setConfirmDeleteDialogOpen(false);
      setItemToDelete(null);
      toast({
        title: "Attribute removed from product successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove attribute from product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create option mutation
  const createOptionMutation = useMutation({
    mutationFn: async (newOption: Omit<ProductAttributeOption, "id">) => {
      if (!selectedAttribute) return null;

      const response = await fetch(`/api/products/${productId}/attributes/${selectedAttribute.attributeId}/options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newOption),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new ApiError(
          result.error?.message || "Failed to create option",
          response.status
        );
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/products", productId, "attributes", selectedAttribute?.attributeId, "options"] 
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
    mutationFn: async (updatedOption: Partial<ProductAttributeOption> & { id: number }) => {
      if (!selectedAttribute) return null;
      
      const { id, ...data } = updatedOption;
      const response = await fetch(`/api/products/${productId}/attributes/${selectedAttribute.attributeId}/options/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new ApiError(
          result.error?.message || "Failed to update option",
          response.status
        );
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/products", productId, "attributes", selectedAttribute?.attributeId, "options"] 
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

      const response = await fetch(`/api/products/${productId}/attributes/${selectedAttribute.attributeId}/options/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new ApiError(
          result.error?.message || "Failed to delete option",
          response.status
        );
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/products", productId, "attributes", selectedAttribute?.attributeId, "options"] 
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

  // Create attribute value mutation
  const createAttributeValueMutation = useMutation({
    mutationFn: async (newValue: Omit<ProductAttributeValue, "id">) => {
      const response = await fetch(`/api/products/${productId}/attribute-values`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newValue),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new ApiError(
          result.error?.message || "Failed to create attribute value",
          response.status
        );
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "attribute-values"] });
      setAttributeValueDialogOpen(false);
      toast({
        title: "Attribute value added successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add attribute value",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update attribute value mutation
  const updateAttributeValueMutation = useMutation({
    mutationFn: async (updatedValue: Partial<ProductAttributeValue> & { id: number }) => {
      const { id, ...data } = updatedValue;
      const response = await fetch(`/api/products/${productId}/attribute-values/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new ApiError(
          result.error?.message || "Failed to update attribute value",
          response.status
        );
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "attribute-values"] });
      setAttributeValueDialogOpen(false);
      toast({
        title: "Attribute value updated successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update attribute value",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete attribute value mutation
  const deleteAttributeValueMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/products/${productId}/attribute-values/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new ApiError(
          result.error?.message || "Failed to delete attribute value",
          response.status
        );
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "attribute-values"] });
      setConfirmDeleteDialogOpen(false);
      setItemToDelete(null);
      toast({
        title: "Attribute value deleted successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete attribute value",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reorder options mutation
  const reorderOptionsMutation = useMutation({
    mutationFn: async (optionIds: number[]) => {
      if (!selectedAttribute) return null;

      const response = await fetch(`/api/products/${productId}/attributes/${selectedAttribute.attributeId}/options/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ optionIds }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new ApiError(
          result.error?.message || "Failed to reorder options",
          response.status
        );
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/products", productId, "attributes", selectedAttribute?.attributeId, "options"] 
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
    
    updateProductAttributeMutation.mutate(attributeData);
  };

  // Handle option form submission
  const handleOptionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const priceAdjStr = formData.get("priceAdjustment") as string;
    const priceAdj = priceAdjStr ? parseFloat(priceAdjStr) : null;
    
    const optionData = {
      productAttributeId: selectedAttribute?.id || 0,
      value: formData.get("value") as string,
      displayValue: formData.get("displayValue") as string,
      sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
      baseOptionId: formData.get("baseOptionId") ? parseInt(formData.get("baseOptionId") as string) : null,
      categoryOptionId: formData.get("categoryOptionId") ? parseInt(formData.get("categoryOptionId") as string) : null,
      priceAdjustment: priceAdj !== null ? priceAdj.toString() : null,
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

  // Handle attribute value form submission
  const handleAttributeValueSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const attributeId = parseInt(formData.get("attributeId") as string);
    const attribute = productAttributes?.find(attr => attr.attributeId === attributeId);
    if (!attribute) return;
    
    const optionId = formData.get("optionId") ? parseInt(formData.get("optionId") as string) : null;
    const priceAdjStr = formData.get("priceAdjustment") as string;
    const priceAdj = priceAdjStr ? parseFloat(priceAdjStr) : null;
    
    let textValue = null;
    let numberValue = null;
    let dateValue = null;
    let booleanValue = null;
    
    // Set the appropriate value based on attribute type
    if (attribute.attribute?.attributeType === 'text') {
      textValue = formData.get("textValue") as string;
    } else if (attribute.attribute?.attributeType === 'number') {
      const numStr = formData.get("numberValue") as string;
      numberValue = numStr ? parseFloat(numStr) : null;
    } else if (attribute.attribute?.attributeType === 'date') {
      const dateStr = formData.get("dateValue") as string;
      dateValue = dateStr || null;
    } else if (attribute.attribute?.attributeType === 'boolean') {
      booleanValue = formData.has("booleanValue");
    }
    
    const valueData = {
      productId: parseInt(productId),
      attributeId,
      optionId,
      sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
      priceAdjustment: priceAdj !== null ? priceAdj.toString() : null,
      textValue,
      numberValue,
      dateValue,
      booleanValue
    };
    
    if (attributeValueFormMode === "create") {
      createAttributeValueMutation.mutate(valueData);
    } else if (attributeValueFormMode === "edit" && selectedAttributeValue) {
      updateAttributeValueMutation.mutate({
        id: selectedAttributeValue.id,
        ...valueData,
      });
    }
  };

  // Handle category attribute selection
  const handleAttributeSelection = (attribute: AttributeWithSelection, isSelected: boolean) => {
    if (isSelected) {
      // Deselect attribute
      const updatedAttributes = selectedCategoryAttributes.map(attr => 
        attr.id === attribute.id ? { ...attr, isSelected: false } : attr
      );
      setSelectedCategoryAttributes(updatedAttributes);
    } else {
      // Select attribute
      const updatedAttributes = selectedCategoryAttributes.map(attr => 
        attr.id === attribute.id ? { ...attr, isSelected: true } : attr
      );
      setSelectedCategoryAttributes(updatedAttributes);
    }
  };

  // Handle saving selected attributes
  const handleSaveSelectedAttributes = () => {
    const newlySelectedAttributes = selectedCategoryAttributes.filter(
      attr => attr.isSelected && !productAttributes?.some(
        (prodAttr: ProductAttribute) => prodAttr.attributeId === attr.id
      )
    );

    // Add each newly selected attribute to the product
    newlySelectedAttributes.forEach(attr => {
      addProductAttributeMutation.mutate({
        attributeId: attr.id,
        categoryAttributeId: attr.categoryAttributeId || null,
        overrideDisplayName: null,
        isRequired: attr.isRequired,
        sortOrder: 0,
      });
    });

    setAttributeSelectOpen(false);
  };

  // Handle opening the attribute dialog for editing an existing attribute
  const handleEditAttribute = (attribute: ProductAttribute) => {
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
  const handleEditOption = (option: ProductAttributeOption) => {
    setSelectedOption(option);
    setOptionFormMode("edit");
    setOptionDialogOpen(true);
  };

  // Handle opening the attribute value dialog for creating a new value
  const handleNewAttributeValue = () => {
    setSelectedAttributeValue(null);
    setAttributeValueFormMode("create");
    setAttributeValueDialogOpen(true);
  };

  // Handle opening the attribute value dialog for editing an existing value
  const handleEditAttributeValue = (value: ProductAttributeValue) => {
    setSelectedAttributeValue(value);
    setAttributeValueFormMode("edit");
    setAttributeValueDialogOpen(true);
  };

  // Handle opening the confirm delete dialog
  const handleDeleteClick = (type: 'attribute' | 'option' | 'value', id: number) => {
    setItemToDelete({ type, id });
    setConfirmDeleteDialogOpen(true);
  };

  // Handle confirming deletion
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'attribute') {
      deleteProductAttributeMutation.mutate(itemToDelete.id);
    } else if (itemToDelete.type === 'option') {
      deleteOptionMutation.mutate(itemToDelete.id);
    } else if (itemToDelete.type === 'value') {
      deleteAttributeValueMutation.mutate(itemToDelete.id);
    }
  };

  // Handle opening the metadata dialog
  const handleEditMetadata = (option: ProductAttributeOption) => {
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
  const handleSelectAttribute = (attribute: ProductAttribute) => {
    setSelectedAttribute(
      selectedAttribute?.id === attribute.id ? null : attribute
    );
  };

  // Loading state for the product
  if (productLoading || productAttributesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state for the product
  if (productError || productAttributesError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-screen">
        <h1 className="text-2xl font-bold text-destructive">Error Loading Product</h1>
        <p>{((productError || productAttributesError) as Error).message}</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/products", productId] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Product Attributes | TeeMeYou Admin</title>
      </Helmet>

      <div className="container mx-auto py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" className="mr-2" asChild>
            <a href={`/admin/products/${productId}/edit`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Product
            </a>
          </Button>
          <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground" />
          <h1 className="text-3xl font-bold truncate">Attributes for {product?.name}</h1>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="attributes">Attribute Definitions</TabsTrigger>
              <TabsTrigger value="values">Attribute Values</TabsTrigger>
            </TabsList>
            
            {activeTab === "attributes" ? (
              <Button onClick={() => setAttributeSelectOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Attributes
              </Button>
            ) : (
              <Button onClick={handleNewAttributeValue}>
                <Plus className="mr-2 h-4 w-4" />
                Add Attribute Value
              </Button>
            )}
          </div>

          <TabsContent value="attributes" className="space-y-4">
            <p className="text-muted-foreground">
              Manage the attribute definitions for this product. These define which attributes
              are available for this product, inheriting from the product category.
            </p>

            {/* Attributes List */}
            <Card>
              <CardHeader>
                <CardTitle>Product Attributes</CardTitle>
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
                      {productAttributes?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No attributes found for this product. Add attributes to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        productAttributes?.map((attribute: ProductAttribute) => (
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
                                attribute.categoryAttribute?.overrideDisplayName || 
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
                              {attribute.categoryAttributeId ? (
                                <Badge variant="secondary">Category</Badge>
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
                                    selectedAttribute.categoryAttribute?.overrideDisplayName || 
                                    selectedAttribute.attribute?.displayName}
                      </CardTitle>
                      <CardDescription>
                        Manage the available options for this attribute in this product
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
                      No product-specific options found for this attribute. Add options to customize this attribute for this product.
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
                            <TableHead>Price Adjustment</TableHead>
                            <TableHead className="w-[150px]">Metadata</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {options?.map((option: ProductAttributeOption) => (
                            <TableRow key={option.id}>
                              <TableCell>{option.sortOrder}</TableCell>
                              <TableCell className="font-medium">{option.value}</TableCell>
                              <TableCell>{option.displayValue}</TableCell>
                              <TableCell>
                                {option.categoryOption ? (
                                  <Badge variant="secondary">Category</Badge>
                                ) : option.baseOption ? (
                                  <Badge>Global</Badge>
                                ) : (
                                  <Badge variant="outline">Custom</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {option.priceAdjustment ? (
                                  <span className={`${parseFloat(option.priceAdjustment) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {parseFloat(option.priceAdjustment) >= 0 ? '+' : ''}
                                    R{parseFloat(option.priceAdjustment).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">None</span>
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
          </TabsContent>

          <TabsContent value="values" className="space-y-4">
            <p className="text-muted-foreground">
              Manage the actual values for this product's attributes. These are the specific values
              assigned to this product, used for filtering and display.
            </p>

            <Card>
              <CardHeader>
                <CardTitle>Product Attribute Values</CardTitle>
                <CardDescription>
                  The specific attribute values assigned to this product
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attributeValuesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : attributeValues?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-md">
                    No attribute values assigned to this product. Add values to enhance your product data.
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Attribute</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Price Adjustment</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attributeValues?.map((value: ProductAttributeValue) => (
                          <TableRow key={value.id}>
                            <TableCell className="font-medium">
                              {value.attribute?.displayName || "Unknown"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{value.attribute?.attributeType || "Unknown"}</Badge>
                            </TableCell>
                            <TableCell>
                              {value.optionId && value.option ? (
                                value.option.displayValue
                              ) : value.textValue ? (
                                value.textValue
                              ) : value.numberValue !== null ? (
                                value.numberValue
                              ) : value.dateValue ? (
                                new Date(value.dateValue).toLocaleDateString()
                              ) : value.booleanValue !== null ? (
                                value.booleanValue ? "Yes" : "No"
                              ) : (
                                <span className="text-muted-foreground">No value</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {value.priceAdjustment ? (
                                <span className={`${parseFloat(value.priceAdjustment) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {parseFloat(value.priceAdjustment) >= 0 ? '+' : ''}
                                  R{parseFloat(value.priceAdjustment).toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={() => handleEditAttributeValue(value)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="icon"
                                  onClick={() => handleDeleteClick('value', value.id)}
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
          </TabsContent>
        </Tabs>

        {/* Attribute Edit Dialog */}
        <Dialog open={attributeDialogOpen} onOpenChange={setAttributeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Product Attribute</DialogTitle>
              <DialogDescription>
                Customize how this attribute appears for this product
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
                      Base attribute from the {selectedAttribute?.categoryAttributeId ? "category" : "global"} attribute library
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overrideDisplayName">Override Display Name (Optional)</Label>
                  <Input
                    id="overrideDisplayName"
                    name="overrideDisplayName"
                    placeholder={selectedAttribute?.categoryAttribute?.overrideDisplayName || selectedAttribute?.attribute?.displayName || ""}
                    defaultValue={selectedAttribute?.overrideDisplayName || ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use the {selectedAttribute?.categoryAttributeId ? "category" : "global"} display name
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isRequired" 
                    name="isRequired"
                    defaultChecked={selectedAttribute?.isRequired || false} 
                  />
                  <Label htmlFor="isRequired">Required for this product</Label>
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
                  disabled={updateProductAttributeMutation.isPending}
                >
                  {updateProductAttributeMutation.isPending && (
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
                {selectedAttribute?.categoryAttributeId ? (
                  <div className="space-y-2">
                    <Label htmlFor="categoryOptionId">Category Option (Optional)</Label>
                    <Select 
                      name="categoryOptionId" 
                      defaultValue={selectedOption?.categoryOptionId?.toString() || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category option or leave empty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Custom Option (No Category Base)</SelectItem>
                        {selectedAttribute?.categoryAttribute?.options?.map((option: CategoryAttributeOption) => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.displayValue} ({option.value})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Base this option on a category option, or leave empty to create a custom option
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

                <div className="space-y-2">
                  <Label htmlFor="priceAdjustment">Price Adjustment (Optional)</Label>
                  <Input
                    id="priceAdjustment"
                    name="priceAdjustment"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    defaultValue={selectedOption?.priceAdjustment || ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Price adjustment for this option (e.g., +50.00 for premium options)
                  </p>
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

        {/* Attribute Value Form Dialog */}
        <Dialog open={attributeValueDialogOpen} onOpenChange={setAttributeValueDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {attributeValueFormMode === "create" ? "Add Attribute Value" : "Edit Attribute Value"}
              </DialogTitle>
              <DialogDescription>
                {attributeValueFormMode === "create"
                  ? "Assign a value to a product attribute"
                  : "Update the attribute value for this product"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAttributeValueSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="attributeId">Attribute</Label>
                  <Select 
                    name="attributeId" 
                    defaultValue={selectedAttributeValue?.attributeId?.toString() || ""}
                    disabled={attributeValueFormMode === "edit"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an attribute" />
                    </SelectTrigger>
                    <SelectContent>
                      {productAttributes?.map((attr: ProductAttribute) => (
                        <SelectItem key={attr.attributeId} value={attr.attributeId.toString()}>
                          {attr.overrideDisplayName || attr.attribute?.displayName} ({attr.attribute?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAttributeValue?.attribute?.attributeType === 'select' ||
                 selectedAttributeValue?.attribute?.attributeType === 'multiselect' ||
                 selectedAttributeValue?.attribute?.attributeType === 'color' ||
                 selectedAttributeValue?.attribute?.attributeType === 'size' ? (
                  <div className="space-y-2">
                    <Label htmlFor="optionId">Option</Label>
                    <Select 
                      name="optionId" 
                      defaultValue={selectedAttributeValue?.optionId?.toString() || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedAttributeValue?.attribute?.options?.map((option: AttributeOption) => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.displayValue}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : selectedAttributeValue?.attribute?.attributeType === 'text' ? (
                  <div className="space-y-2">
                    <Label htmlFor="textValue">Text Value</Label>
                    <Textarea
                      id="textValue"
                      name="textValue"
                      placeholder="Enter text value"
                      defaultValue={selectedAttributeValue?.textValue || ""}
                    />
                  </div>
                ) : selectedAttributeValue?.attribute?.attributeType === 'number' ? (
                  <div className="space-y-2">
                    <Label htmlFor="numberValue">Number Value</Label>
                    <Input
                      id="numberValue"
                      name="numberValue"
                      type="number"
                      step="any"
                      placeholder="0"
                      defaultValue={selectedAttributeValue?.numberValue || ""}
                    />
                  </div>
                ) : selectedAttributeValue?.attribute?.attributeType === 'date' ? (
                  <div className="space-y-2">
                    <Label htmlFor="dateValue">Date Value</Label>
                    <Input
                      id="dateValue"
                      name="dateValue"
                      type="date"
                      defaultValue={selectedAttributeValue?.dateValue ? formatISODate(selectedAttributeValue.dateValue) : ""}
                    />
                  </div>
                ) : selectedAttributeValue?.attribute?.attributeType === 'boolean' ? (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="booleanValue" 
                      name="booleanValue"
                      defaultChecked={selectedAttributeValue?.booleanValue || false} 
                    />
                    <Label htmlFor="booleanValue">Boolean Value</Label>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    name="sortOrder"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={selectedAttributeValue?.sortOrder || 0}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priceAdjustment">Price Adjustment (Optional)</Label>
                  <Input
                    id="priceAdjustment"
                    name="priceAdjustment"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    defaultValue={selectedAttributeValue?.priceAdjustment || ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Price adjustment for this value (e.g., +50.00 for premium options)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAttributeValueDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createAttributeValueMutation.isPending || updateAttributeValueMutation.isPending
                  }
                >
                  {(createAttributeValueMutation.isPending || updateAttributeValueMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {attributeValueFormMode === "create" ? "Add Value" : "Save Changes"}
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
                  ? "Are you sure you want to remove this attribute from the product? This action cannot be undone and will also delete all associated product-specific options."
                  : itemToDelete?.type === 'option'
                  ? "Are you sure you want to delete this option? This action cannot be undone."
                  : "Are you sure you want to delete this attribute value? This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={
                  deleteProductAttributeMutation.isPending || 
                  deleteOptionMutation.isPending ||
                  deleteAttributeValueMutation.isPending
                }
              >
                {(deleteProductAttributeMutation.isPending || 
                  deleteOptionMutation.isPending ||
                  deleteAttributeValueMutation.isPending) && (
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
              <SheetTitle>Add Attributes to Product</SheetTitle>
              <SheetDescription>
                Select category attributes to add to this product
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryAttributesLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : selectedCategoryAttributes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                        No category attributes found. Add attributes to the product category first.
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedCategoryAttributes
                      .filter(attr => !productAttributes?.some(
                        (prodAttr: ProductAttribute) => prodAttr.attributeId === attr.id
                      ))
                      .map((attribute) => (
                        <TableRow key={attribute.id}>
                          <TableCell>
                            <button 
                              type="button"
                              className={`flex items-center justify-center h-5 w-5 rounded-full border ${
                                attribute.isSelected
                                  ? 'bg-primary text-primary-foreground border-primary' 
                                  : 'border-input'
                              }`}
                              onClick={() => handleAttributeSelection(attribute, attribute.isSelected)}
                            >
                              {attribute.isSelected && <Check className="h-3 w-3" />}
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
            
            <div className="mt-6 flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setAttributeSelectOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSelectedAttributes}
                disabled={addProductAttributeMutation.isPending}
              >
                {addProductAttributeMutation.isPending && (
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

export default ProductAttributesPage;