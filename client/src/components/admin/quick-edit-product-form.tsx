import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type Product = {
  id: number;
  name: string;
  price: number;
  listPrice?: number;
  stockQuantity: number;
  sku: string;
  isActive: boolean;
  catalogId: number;
};

// Quick edit form schema
const quickEditSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters"),
  price: z
    .number()
    .min(0.01, "Price must be greater than 0")
    .or(z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number)),
  listPrice: z
    .number()
    .min(0, "List price must be 0 or greater")
    .or(z.string().regex(/^\d*(\.\d{1,2})?$/).transform(s => s ? Number(s) : undefined))
    .optional(),
  sku: z.string().min(1, "SKU is required"),
  stockQuantity: z.number().int().min(0, "Stock quantity must be 0 or greater")
    .or(z.string().regex(/^\d+$/).transform(Number)),
  isActive: z.boolean(),
});

type QuickEditFormValues = z.infer<typeof quickEditSchema>;

type QuickEditProductFormProps = {
  product: Product;
  onCancel: () => void;
  onSaved: () => void;
};

export function QuickEditProductForm({
  product,
  onCancel,
  onSaved,
}: QuickEditProductFormProps) {
  const { toast } = useToast();
  
  // Initialize the form with product values
  const form = useForm<QuickEditFormValues>({
    resolver: zodResolver(quickEditSchema),
    defaultValues: {
      name: product.name,
      price: product.price,
      listPrice: product.listPrice || undefined,
      sku: product.sku,
      stockQuantity: product.stockQuantity,
      isActive: product.isActive,
    },
  });

  // Mutation for updating product data
  const { mutate: updateProduct, isPending } = useMutation({
    mutationFn: async (data: QuickEditFormValues) => {
      // Use centralized error handling in apiRequest
      const response = await apiRequest("PATCH", `/api/products/${product.id}/quick-edit`, data);
      return await response.json();
    },
    onSuccess: () => {
      
      queryClient.invalidateQueries({ queryKey: [`/api/catalogs/${product.catalogId}/products`] });
      onSaved();
    },
    onError: (error: any) => {
      console.error("Product quick edit error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: QuickEditFormValues) => {
    updateProduct(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="Product name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input placeholder="SKU" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (R)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    placeholder="0.00" 
                    {...field}
                    onChange={(e) => {
                      field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="listPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>List Price (R)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    placeholder="0.00" 
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                      field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value));
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Original price (for discounts)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stockQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock Quantity</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    placeholder="0" 
                    {...field}
                    onChange={(e) => {
                      field.onChange(e.target.value === '' ? '' : parseInt(e.target.value));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Active Status</FormLabel>
                <FormDescription>
                  Set whether this product is visible to customers
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

        <div className="flex justify-end space-x-2 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}