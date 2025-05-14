/**
 * Basic Info Step Component
 * 
 * First step in the product creation wizard for entering essential product details.
 */

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import slugify from "slugify";
import { Check, Loader2 } from "lucide-react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ProductDraft } from "@shared/schema";

// Form validation schema
const basicInfoSchema = z.object({
  name: z.string().min(1, { message: "Product name is required" }),
  slug: z.string().min(1, { message: "URL slug is required" }),
  sku: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.coerce.number({ 
    required_error: "Category is required",
    invalid_type_error: "Category must be a number" 
  }).min(1, { message: "Category is required" }),
  brand: z.string().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

// Define the form field types
type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;

interface BasicInfoStepProps {
  draft: ProductDraft;
  onChange: (field: string, value: any) => void;
  onSave: (data: any) => void;
  errors?: string[];
}

export function BasicInfoStep({
  draft,
  onChange,
  onSave,
  errors = [],
}: BasicInfoStepProps) {
  const [nameChanged, setNameChanged] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!draft.slug);
  
  // Fetch categories
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/categories');
      return response.data || [];
    },
  });
  
  // Form setup
  const form = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: draft.name || "",
      slug: draft.slug || "",
      sku: draft.sku || "",
      description: draft.description || "",
      categoryId: draft.categoryId || 0,
      brand: draft.brand || "",
      isActive: draft.isActive === false ? false : true,
      isFeatured: draft.isFeatured || false,
    },
  });
  
  // Generate slug from name
  useEffect(() => {
    if (autoSlug && nameChanged && form.getValues("name")) {
      const name = form.getValues("name");
      const newSlug = slugify(name, {
        lower: true,
        strict: true,
        trim: true,
      });
      form.setValue("slug", newSlug);
      onChange("slug", newSlug);
    }
  }, [form.watch("name"), autoSlug, nameChanged]);
  
  // Submit handler
  const onSubmit = (data: BasicInfoFormValues) => {
    // Update all values at once
    onSave(data);
  };
  
  // Field change handler
  const handleFieldChange = (field: string, value: any) => {
    if (field === "name") {
      setNameChanged(true);
    } else if (field === "slug") {
      // If user manually edits slug, turn off auto-slug
      setAutoSlug(false);
    }
    
    onChange(field, value);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Basic Information</h3>
        <p className="text-sm text-muted-foreground">
          Enter the essential details about your product.
        </p>
      </div>
      
      {/* Form error display */}
      {errors && errors.length > 0 && (
        <div className="bg-destructive/10 text-destructive rounded p-3 mb-6">
          <p className="font-semibold">Please correct the following errors:</p>
          <ul className="list-disc list-inside">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter product name"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange("name", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Product SKU */}
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter product SKU"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange("sku", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    A unique identifier for your product
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Product Slug */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between">
                    <FormLabel>URL Slug *</FormLabel>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="auto-slug"
                        checked={autoSlug}
                        onCheckedChange={(checked) => {
                          setAutoSlug(checked);
                          if (checked && form.getValues("name")) {
                            const newSlug = slugify(form.getValues("name"), {
                              lower: true,
                              strict: true,
                              trim: true,
                            });
                            form.setValue("slug", newSlug);
                            handleFieldChange("slug", newSlug);
                          }
                        }}
                      />
                      <label
                        htmlFor="auto-slug"
                        className="text-xs cursor-pointer text-muted-foreground"
                      >
                        Auto-generate
                      </label>
                    </div>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="product-url-slug"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange("slug", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be used in the product URL
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Category */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select
                    value={field.value ? field.value.toString() : ""}
                    onValueChange={(value) => {
                      field.onChange(parseInt(value));
                      handleFieldChange("categoryId", parseInt(value));
                    }}
                    disabled={isCategoriesLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isCategoriesLoading ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="ml-2">Loading...</span>
                        </div>
                      ) : (
                        categories?.map((category: any) => (
                          <SelectItem
                            key={category.id}
                            value={category.id.toString()}
                          >
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Brand */}
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter brand name"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange("brand", e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter product description"
                    className="min-h-32"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange("description", e.target.value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Describe your product in detail
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Status Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>
                      Determines if the product is visible in the store
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        handleFieldChange("isActive", checked);
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Feature Product</FormLabel>
                    <FormDescription>
                      Display this product in featured sections
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        handleFieldChange("isFeatured", checked);
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          
          {/* Save button - hidden in wizard mode */}
          <div className="hidden">
            <Button type="submit">
              <Check className="mr-2 h-4 w-4" />
              Save Basic Info
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}