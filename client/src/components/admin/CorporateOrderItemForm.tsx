import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const corporateOrderItemSchema = z.object({
  employeeName: z.string().min(1, "Employee name is required"),
  employeeEmail: z.string().email("Valid email is required"),
  productName: z.string().min(1, "Product name is required"),
  productDescription: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0.01, "Unit price must be greater than 0"),
  notes: z.string().optional(),
});

type CorporateOrderItemFormData = z.infer<typeof corporateOrderItemSchema>;

interface CorporateOrderItemFormProps {
  corporateOrderId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CorporateOrderItemForm({ 
  corporateOrderId, 
  onSuccess, 
  onCancel 
}: CorporateOrderItemFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CorporateOrderItemFormData>({
    resolver: zodResolver(corporateOrderItemSchema),
    defaultValues: {
      employeeName: "",
      employeeEmail: "",
      productName: "",
      productDescription: "",
      quantity: 1,
      unitPrice: 0,
      notes: "",
    },
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: (data: CorporateOrderItemFormData) => {
      const payload = {
        corporateOrderId,
        ...data,
        totalPrice: data.quantity * data.unitPrice,
      };
      return apiRequest('POST', '/api/admin/corporate-order-items', payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item added to corporate order successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/corporate-orders', corporateOrderId] });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add item to corporate order",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CorporateOrderItemFormData) => {
    addItemMutation.mutate(data);
  };

  const calculateTotalPrice = () => {
    const quantity = form.watch("quantity") || 0;
    const unitPrice = form.watch("unitPrice") || 0;
    return quantity * unitPrice;
  };

  return (
    <div className="space-y-6">
      {/* Add Item Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Item
          </CardTitle>
          <CardDescription>
            Add a new item for an employee to this corporate order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Employee Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Employee Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeName">Employee Name *</Label>
                  <Input
                    id="employeeName"
                    {...form.register("employeeName")}
                    placeholder="John Doe"
                  />
                  {form.formState.errors.employeeName && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.employeeName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeEmail">Employee Email *</Label>
                  <Input
                    id="employeeEmail"
                    type="email"
                    {...form.register("employeeEmail")}
                    placeholder="john.doe@company.com"
                  />
                  {form.formState.errors.employeeEmail && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.employeeEmail.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Product Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Product Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productName">Product Name *</Label>
                  <Input
                    id="productName"
                    {...form.register("productName")}
                    placeholder="HeartCart T-Shirt"
                  />
                  {form.formState.errors.productName && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.productName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productDescription">Product Description</Label>
                  <Input
                    id="productDescription"
                    {...form.register("productDescription")}
                    placeholder="Size L, Navy Blue"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pricing Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    {...form.register("quantity", { valueAsNumber: true })}
                    placeholder="1"
                  />
                  {form.formState.errors.quantity && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.quantity.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Unit Price (R) *</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...form.register("unitPrice", { valueAsNumber: true })}
                    placeholder="99.00"
                  />
                  {form.formState.errors.unitPrice && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.unitPrice.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Total Price Display */}
              <div className="p-4 bg-pink-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Price:</span>
                  <span className="text-2xl font-bold text-pink-600">
                    R {calculateTotalPrice().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Any special instructions or notes..."
                rows={3}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addItemMutation.isPending}
                className="bg-pink-600 hover:bg-pink-700 order-1 sm:order-2"
              >
                {addItemMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Item to Order
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}