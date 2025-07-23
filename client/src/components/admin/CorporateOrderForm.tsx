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
  companyName: z.string().min(1, "Company name is required"),
  companyAddress: z.string().optional(),
  contactPerson: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional(),
  orderDescription: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  paymentStatus: z.string().min(1, "Payment status is required"),
  paymentMethod: z.string().optional(),
  totalItemsValue: z.string().min(1, "Items value is required"),
  totalPackagingCosts: z.string().min(1, "Packaging costs are required"),
  totalShippingCosts: z.string().min(1, "Shipping costs are required"),
  adminNotes: z.string().optional(),
});

type CorporateOrderFormData = z.infer<typeof corporateOrderSchema>;

interface CorporateOrder {
  id: number;
  orderNumber: string;
  companyName: string;
  companyAddress: string | null;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string | null;
  orderDescription: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  totalItemsValue: string;
  totalPackagingCosts: string;
  totalShippingCosts: string;
  totalInvoiceAmount: string;
  invoiceGenerated: boolean;
  invoicePath: string | null;
  adminNotes: string | null;
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
      companyName: order?.companyName || "",
      companyAddress: order?.companyAddress || "",
      contactPerson: order?.contactPerson || "",
      contactEmail: order?.contactEmail || "",
      contactPhone: order?.contactPhone || "",
      orderDescription: order?.orderDescription || "",
      status: order?.status || "pending",
      paymentStatus: order?.paymentStatus || "pending",
      paymentMethod: order?.paymentMethod || "",
      totalItemsValue: order?.totalItemsValue || "0.00",
      totalPackagingCosts: order?.totalPackagingCosts || "20.00",
      totalShippingCosts: order?.totalShippingCosts || "85.00",
      adminNotes: order?.adminNotes || "",
    },
  });

  // Create or update corporate order mutation
  const saveMutation = useMutation({
    mutationFn: (data: CorporateOrderFormData) => {
      const payload = {
        ...data,
        totalInvoiceAmount: (
          parseFloat(data.totalItemsValue) + 
          parseFloat(data.totalPackagingCosts) + 
          parseFloat(data.totalShippingCosts)
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
    const itemsValue = parseFloat(form.watch("totalItemsValue") || "0");
    const packagingCosts = parseFloat(form.watch("totalPackagingCosts") || "0");
    const shippingCosts = parseFloat(form.watch("totalShippingCosts") || "0");
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
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  {...form.register("companyName")}
                  placeholder="Enter company name"
                />
                {form.formState.errors.companyName && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.companyName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Name *</Label>
                <Input
                  id="contactPerson"
                  {...form.register("contactPerson")}
                  placeholder="Enter contact person's name"
                />
                {form.formState.errors.contactPerson && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.contactPerson.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  {...form.register("contactEmail")}
                  placeholder="contact@company.com"
                />
                {form.formState.errors.contactEmail && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.contactEmail.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  {...form.register("contactPhone")}
                  placeholder="+27 XX XXX XXXX"
                />
              </div>
            </div>

            {/* Company Address and Order Description */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Company Address</Label>
                <Textarea
                  id="companyAddress"
                  {...form.register("companyAddress")}
                  placeholder="Enter company address..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orderDescription">Order Description</Label>
                <Textarea
                  id="orderDescription"
                  {...form.register("orderDescription")}
                  placeholder="Describe the order requirements..."
                  rows={3}
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
                <Label htmlFor="totalItemsValue">Items Value (R) *</Label>
                <Input
                  id="totalItemsValue"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("totalItemsValue")}
                  placeholder="0.00"
                />
                {form.formState.errors.totalItemsValue && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.totalItemsValue.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalPackagingCosts">Packaging Costs (R) *</Label>
                <Input
                  id="totalPackagingCosts"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("totalPackagingCosts")}
                  placeholder="20.00"
                />
                {form.formState.errors.totalPackagingCosts && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.totalPackagingCosts.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalShippingCosts">Shipping Costs (R) *</Label>
                <Input
                  id="totalShippingCosts"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("totalShippingCosts")}
                  placeholder="85.00"
                />
                {form.formState.errors.totalShippingCosts && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.totalShippingCosts.message}
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
              <Label htmlFor="adminNotes">Admin Notes</Label>
              <Textarea
                id="adminNotes"
                {...form.register("adminNotes")}
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