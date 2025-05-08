import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminLayout } from "@/components/admin/layout";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Trash, Loader2 } from "lucide-react";

// Define types for attribute data
type Attribute = {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  attributeType: "number" | "boolean" | "select" | "image" | "text" | "color" | "size" | "multiselect" | "date" | "file";
  isFilterable: boolean;
  isSwatch: boolean;
  isRequired: boolean;
  isVariant: boolean;
  validationRules: string | null;
  createdAt: string;
  updatedAt: string;
};

// Create a schema for attribute form validation
const attributeFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  displayName: z.string().min(1, "Display name is required").max(100, "Display name must be 100 characters or less"),
  description: z.string().nullable(),
  attributeType: z.enum([
    "number", "boolean", "select", "image", "text", "color", "size", "multiselect", "date", "file"
  ], {
    required_error: "Please select an attribute type",
  }),
  isFilterable: z.boolean().default(false),
  isSwatch: z.boolean().default(false),
  isRequired: z.boolean().default(false),
  isVariant: z.boolean().default(false),
  validationRules: z.string().nullable()
});

type AttributeFormValues = z.infer<typeof attributeFormSchema>;

export default function AttributeEditor() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEditMode = !!id;
  const attributeId = isEditMode ? parseInt(id) : 0;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Set up form with schema validation
  const form = useForm<AttributeFormValues>({
    resolver: zodResolver(attributeFormSchema),
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
      attributeType: "text",
      isFilterable: false,
      isSwatch: false,
      isRequired: false,
      isVariant: false,
      validationRules: null
    }
  });

  // Fetch attribute data for edit mode
  const { data: attributeResponse, isLoading: attributeLoading } = useQuery({
    queryKey: ["/api/attributes", attributeId],
    queryFn: async () => {
      if (!isEditMode) return null;
      const response = await fetch(`/api/attributes/${attributeId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch attribute");
      }
      return response.json();
    },
    enabled: isEditMode
  });

  // Extract attribute data from the standardized response
  const attribute = attributeResponse?.data;

  // Populate form with attribute data when in edit mode
  useEffect(() => {
    if (attribute) {
      form.reset({
        name: attribute.name,
        displayName: attribute.displayName,
        description: attribute.description,
        attributeType: attribute.attributeType,
        isFilterable: attribute.isFilterable,
        isSwatch: attribute.isSwatch,
        isRequired: attribute.isRequired,
        isVariant: attribute.isVariant,
        validationRules: attribute.validationRules
      });
    }
  }, [attribute, form]);

  // Create attribute mutation
  const createAttributeMutation = useMutation({
    mutationFn: async (newAttribute: AttributeFormValues) => {
      const response = await fetch("/api/attributes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newAttribute),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create attribute");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attributes"] });
      toast({
        title: "Attribute created successfully",
        variant: "default",
      });
      navigate("/admin/global-attributes");
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
    mutationFn: async (updatedAttribute: AttributeFormValues) => {
      const response = await fetch(`/api/attributes/${attributeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedAttribute),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update attribute");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attributes"] });
      toast({
        title: "Attribute updated successfully",
        variant: "default",
      });
      navigate("/admin/global-attributes");
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
    mutationFn: async () => {
      const response = await fetch(`/api/attributes/${attributeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete attribute");
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attributes"] });
      toast({
        title: "Attribute deleted successfully",
        variant: "default",
      });
      navigate("/admin/global-attributes");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete attribute",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler for form submission
  const onSubmit = (values: AttributeFormValues) => {
    if (isEditMode) {
      updateAttributeMutation.mutate(values);
    } else {
      createAttributeMutation.mutate(values);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this attribute? This action cannot be undone.")) {
      deleteAttributeMutation.mutate();
    }
  };

  const isPending = createAttributeMutation.isPending || updateAttributeMutation.isPending;

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/admin/global-attributes")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Attributes
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditMode ? "Edit Attribute" : "Create Attribute"}
            </h1>
          </div>
          {isEditMode && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteAttributeMutation.isPending}
            >
              {deleteAttributeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash className="h-4 w-4 mr-2" />
              )}
              Delete Attribute
            </Button>
          )}
        </div>

        {attributeLoading && isEditMode ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{isEditMode ? "Edit Attribute Details" : "Create New Attribute"}</CardTitle>
              <CardDescription>
                {isEditMode 
                  ? "Update the attribute's properties below."
                  : "Fill in the information below to create a new attribute."
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Attribute Name</FormLabel>
                          <FormControl>
                            <Input placeholder="color_attr" {...field} />
                          </FormControl>
                          <FormDescription>
                            Internal name, lowercase with no spaces
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Color" {...field} />
                          </FormControl>
                          <FormDescription>
                            Customer-facing name
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe this attribute" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="attributeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attribute Type</FormLabel>
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
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="select">Select</SelectItem>
                            <SelectItem value="multiselect">Multi-Select</SelectItem>
                            <SelectItem value="color">Color</SelectItem>
                            <SelectItem value="size">Size</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="file">File</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The type of data this attribute will store
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="isFilterable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Filterable</FormLabel>
                              <FormDescription>
                                Allow customers to filter products by this attribute
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="isSwatch"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Display as Swatch</FormLabel>
                              <FormDescription>
                                Show this attribute as a visual swatch (for colors, patterns, etc.)
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="isRequired"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Required</FormLabel>
                              <FormDescription>
                                Make this attribute required for products
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="isVariant"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Use for Variants</FormLabel>
                              <FormDescription>
                                Use this attribute to create product variants
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="validationRules"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Validation Rules (JSON, Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder='{"min": 1, "max": 100}' 
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter validation rules as JSON if needed
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <CardFooter className="flex justify-end px-0 pb-0">
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      {isEditMode ? "Update Attribute" : "Create Attribute"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}