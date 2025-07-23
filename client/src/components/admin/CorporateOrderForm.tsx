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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const corporateOrderSchema = z.object({
  corporateCompanyName: z.string().min(1, "Company name is required"),
  corporateContactName: z.string().min(1, "Contact name is required"),
  corporateContactEmail: z.string().email("Valid email is required"),
  corporateContactPhone: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  paymentStatus: z.string().min(1, "Payment status is required"),
  paymentMethod: z.string().optional(),
  itemsValue: z.string().min(1, "Items value is required"),
  packagingCosts: z.string().min(1, "Packaging costs are required"),
  shippingCosts: z.string().min(1, "Shipping costs are required"),
  notes: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
});

type CorporateOrderFormData = z.infer<typeof corporateOrderSchema>;

interface CorporateOrder {
  id: number;
  orderNumber: string;
  corporateCompanyName: string;
  corporateContactName: string;
  corporateContactEmail: string;
  corporateContactPhone: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  itemsValue: string;
  packagingCosts: string;
  shippingCosts: string;
  totalAmount: string;
  notes: string | null;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdByAdminId: number;
}

interface CorporateOrderFormProps {
  order?: CorporateOrder;
  onSuccess?: () => void;
}

export function CorporateOrderForm({ order, onSuccess }: CorporateOrderFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CorporateOrderFormData>({
    resolver: zodResolver(corporateOrderSchema),
    defaultValues: {
      corporateCompanyName: order?.corporateCompanyName || "",
      corporateContactName: order?.corporateContactName || "",
      corporateContactEmail: order?.corporateContactEmail || "",
      corporateContactPhone: order?.corporateContactPhone || "",
      status: order?.status || "pending",
      paymentStatus: order?.paymentStatus || "pending",
      paymentMethod: order?.paymentMethod || "",
      itemsValue: order?.itemsValue || "0.00",
      packagingCosts: order?.packagingCosts || "20.00",
      shippingCosts: order?.shippingCosts || "85.00",
      notes: order?.notes || "",
      expectedDeliveryDate: order?.expectedDeliveryDate || "",
    },
  });

  // Create or update corporate order mutation
  const saveMutation = useMutation({
    mutationFn: (data: CorporateOrderFormData) => {
      const payload = {
        ...data,
        totalAmount: (
          parseFloat(data.itemsValue) + 
          parseFloat(data.packagingCosts) + 
          parseFloat(data.shippingCosts)
        ).toFixed(2)
      };

      if (order) {
        return apiRequest('PATCH', `/api/admin/corporate-orders/${order.id}`, payload);
      } else {
        return apiRequest('POST', '/api/admin/corporate-orders', payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: order ? "Corporate order updated successfully" : "Corporate order created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/corporate-orders'] });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${order ? 'update' : 'create'} corporate order`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CorporateOrderFormData) => {
    saveMutation.mutate(data);
  };

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "processing", label: "Processing" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const paymentStatusOptions = [
    { value: "pending", label: "Pending" },
    { value: "paid", label: "Paid" },
    { value: "partial", label: "Partial" },
    { value: "refunded", label: "Refunded" },
  ];

  const paymentMethodOptions = [
    { value: "eft", label: "EFT Transfer" },
    { value: "card", label: "Credit Card" },
    { value: "cash", label: "Cash" },
    { value: "cheque", label: "Cheque" },
    { value: "store_credit", label: "Store Credit" },
  ];

  const calculateTotal = () => {
    const itemsValue = parseFloat(form.watch("itemsValue") || "0");
    const packagingCosts = parseFloat(form.watch("packagingCosts") || "0");
    const shippingCosts = parseFloat(form.watch("shippingCosts") || "0");
    return itemsValue + packagingCosts + shippingCosts;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Details about the corporate client</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="corporateCompanyName">Company Name *</Label>
                <Input
                  id="corporateCompanyName"
                  {...form.register("corporateCompanyName")}
                  placeholder="Enter company name"
                />
                {form.formState.errors.corporateCompanyName && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.corporateCompanyName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="corporateContactName">Contact Name *</Label>
                <Input
                  id="corporateContactName"
                  {...form.register("corporateContactName")}
                  placeholder="Enter contact person's name"
                />
                {form.formState.errors.corporateContactName && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.corporateContactName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="corporateContactEmail">Contact Email *</Label>
                <Input
                  id="corporateContactEmail"
                  type="email"
                  {...form.register("corporateContactEmail")}
                  placeholder="contact@company.com"
                />
                {form.formState.errors.corporateContactEmail && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.corporateContactEmail.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="corporateContactPhone">Contact Phone</Label>
                <Input
                  id="corporateContactPhone"
                  {...form.register("corporateContactPhone")}
                  placeholder="+27 XX XXX XXXX"
                />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Status</CardTitle>
          <CardDescription>Current status and payment information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Order Status *</Label>
              <Select 
                value={form.watch("status")} 
                onValueChange={(value) => form.setValue("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.status && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.status.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Payment Status *</Label>
              <Select 
                value={form.watch("paymentStatus")} 
                onValueChange={(value) => form.setValue("paymentStatus", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  {paymentStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.paymentStatus && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.paymentStatus.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select 
                value={form.watch("paymentMethod") || ""} 
                onValueChange={(value) => form.setValue("paymentMethod", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial Information</CardTitle>
          <CardDescription>Order costs and pricing details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="itemsValue">Items Value (R) *</Label>
                <Input
                  id="itemsValue"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("itemsValue")}
                  placeholder="0.00"
                />
                {form.formState.errors.itemsValue && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.itemsValue.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="packagingCosts">Packaging Costs (R) *</Label>
                <Input
                  id="packagingCosts"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("packagingCosts")}
                  placeholder="20.00"
                />
                {form.formState.errors.packagingCosts && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.packagingCosts.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingCosts">Shipping Costs (R) *</Label>
                <Input
                  id="shippingCosts"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("shippingCosts")}
                  placeholder="85.00"
                />
                {form.formState.errors.shippingCosts && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.shippingCosts.message}
                  </p>
                )}
              </div>
            </div>

            {/* Total Calculation Display */}
            <div className="p-4 bg-pink-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Amount:</span>
                <span className="text-2xl font-bold text-pink-600">
                  R {calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
          <CardDescription>Notes and delivery details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
              <Input
                id="expectedDeliveryDate"
                type="date"
                {...form.register("expectedDeliveryDate")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Add any additional notes about this order..."
                rows={4}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          onClick={form.handleSubmit(onSubmit)}
          disabled={saveMutation.isPending}
          className="bg-pink-600 hover:bg-pink-700 min-w-32"
        >
          {saveMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {order ? "Update Order" : "Create Order"}
        </Button>
      </div>
    </div>
  );
}