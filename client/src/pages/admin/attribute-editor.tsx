import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { Loader2, Save, ArrowLeft } from "lucide-react";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Attribute } from "@/types/attribute-types";

function AttributeEditorPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams();
  const isNewAttribute = params.id === "new";
  const attributeId = !isNewAttribute ? parseInt(params.id as string) : undefined;
  
  // Fetch available attribute types
  const { 
    data: attributeTypesResponse,
    isLoading: attributeTypesLoading,
  } = useQuery({
    queryKey: ["/api/attributes/types"],
    retry: 2,
  });
  
  const attributeTypes = attributeTypesResponse?.data || ["text", "select"];
  
  const [formData, setFormData] = useState<Partial<Attribute>>({
    name: "",
    displayName: "",
    description: "",
    attributeType: "select", // Default to select
    isFilterable: false,
    isSwatch: false,
    isRequired: false,
    isVariant: false,
    validationRules: "",
  });

  // Fetch attribute if editing
  const {
    data: attributeResponse,
    isLoading: attributeLoading,
    error: attributeError,
  } = useQuery({
    queryKey: ["/api/attributes", attributeId],
    enabled: !isNewAttribute && !!attributeId,
    retry: 1,
  });

  // Extract the attribute data from the standardized response
  const attribute = attributeResponse?.data;

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
      
      navigate("/admin/attributes");
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
      
      navigate("/admin/attributes");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update attribute",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update form data when attribute is loaded
  useEffect(() => {
    if (attribute) {
      setFormData({
        name: attribute.name,
        displayName: attribute.displayName,
        description: attribute.description || "",
        attributeType: attribute.attributeType,
        isFilterable: attribute.isFilterable,
        isSwatch: attribute.isSwatch,
        isRequired: attribute.isRequired,
        isVariant: attribute.isVariant,
        validationRules: attribute.validationRules || "",
      });
    }
  }, [attribute]);

  // Handler for form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const attributeData = {
      name: formData.name!,
      displayName: formData.displayName!,
      description: formData.description || null,
      attributeType: formData.attributeType!,
      isFilterable: !!formData.isFilterable,
      isSwatch: !!formData.isSwatch,
      isRequired: !!formData.isRequired,
      isVariant: !!formData.isVariant,
      validationRules: formData.validationRules || null,
    };
    
    if (isNewAttribute) {
      createAttributeMutation.mutate(attributeData);
    } else if (attributeId) {
      updateAttributeMutation.mutate({
        id: attributeId,
        ...attributeData,
      });
    }
  };

  // Handler for input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handler for checkbox changes
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  // Handler for select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Loading state
  if (!isNewAttribute && attributeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (!isNewAttribute && attributeError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-screen">
        <h1 className="text-2xl font-bold text-destructive">Error Loading Attribute</h1>
        <p>{(attributeError as Error).message}</p>
        <Button onClick={() => navigate("/admin/attributes")}>
          Back to Attributes
        </Button>
      </div>
    );
  }

  return (
    <AdminLayout 
      title={isNewAttribute ? "Create New Attribute" : "Edit Attribute"} 
      subtitle={isNewAttribute ? "Add a new global attribute to your store" : `Editing attribute: ${attribute?.displayName || ""}`}
    >
      <Helmet>
        <title>{isNewAttribute ? "Create New Attribute" : "Edit Attribute"} | HeartCart Admin</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate("/admin/attributes")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Attributes
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isNewAttribute ? "Create New Attribute" : "Edit Attribute"}</CardTitle>
            <CardDescription>
              {isNewAttribute 
                ? "Create a new global attribute that can be used across products." 
                : "Update the attribute's properties below."}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="color"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Internal name, lowercase with no spaces
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    placeholder="Color"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Customer-facing name
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Enter a description for this attribute"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attributeType">Attribute Type</Label>
                <Select
                  name="attributeType"
                  value={formData.attributeType}
                  onValueChange={(value) => handleSelectChange("attributeType", value)}
                  disabled={!isNewAttribute || attributeTypesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select attribute type" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributeTypesLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm">Loading types...</span>
                      </div>
                    ) : Array.isArray(attributeTypes) && attributeTypes.length > 0 ? (
                      attributeTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))
                    ) : (
                      // Fallback if no types are returned from API
                      ["text", "number", "select", "color", "size", "date", "boolean"].map(type => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {!isNewAttribute && (
                  <p className="text-xs text-muted-foreground">
                    Attribute type cannot be changed after creation
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="isFilterable" 
                      name="isFilterable"
                      checked={formData.isFilterable}
                      onCheckedChange={(checked) => handleCheckboxChange("isFilterable", checked as boolean)}
                    />
                    <Label htmlFor="isFilterable">Filterable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="isSwatch" 
                      name="isSwatch"
                      checked={formData.isSwatch}
                      onCheckedChange={(checked) => handleCheckboxChange("isSwatch", checked as boolean)}
                    />
                    <Label htmlFor="isSwatch">Display as Swatch</Label>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="isRequired" 
                      name="isRequired"
                      checked={formData.isRequired}
                      onCheckedChange={(checked) => handleCheckboxChange("isRequired", checked as boolean)}
                    />
                    <Label htmlFor="isRequired">Required</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="isVariant" 
                      name="isVariant"
                      checked={formData.isVariant}
                      onCheckedChange={(checked) => handleCheckboxChange("isVariant", checked as boolean)}
                    />
                    <Label htmlFor="isVariant">Use for Variants</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="validationRules">Validation Rules (JSON, Optional)</Label>
                <Textarea
                  id="validationRules"
                  name="validationRules"
                  placeholder='{"min": 1, "max": 100}'
                  value={formData.validationRules}
                  onChange={handleInputChange}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Enter validation rules as JSON if needed
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/attributes")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createAttributeMutation.isPending || updateAttributeMutation.isPending
                }
              >
                {(createAttributeMutation.isPending || updateAttributeMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isNewAttribute ? "Create Attribute" : "Save Changes"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </AdminLayout>
  );
}

export default AttributeEditorPage;