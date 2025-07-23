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
import { Loader2, Truck, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const corporateOrderShipmentSchema = z.object({
  shipmentNumber: z.string().min(1, "Shipment number is required"),
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientEmail: z.string().email("Valid email is required"),
  recipientPhone: z.string().optional(),
  shippingAddress: z.string().min(1, "Shipping address is required"),
  pudoLockerName: z.string().optional(),
  pudoLockerAddress: z.string().optional(),
  trackingNumber: z.string().optional(),
  shippingCost: z.number().min(0, "Shipping cost must be 0 or greater"),
  status: z.string().min(1, "Status is required"),
  notes: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
});

type CorporateOrderShipmentFormData = z.infer<typeof corporateOrderShipmentSchema>;

interface CorporateOrderShipmentFormProps {
  corporateOrderId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CorporateOrderShipmentForm({ 
  corporateOrderId, 
  onSuccess, 
  onCancel 
}: CorporateOrderShipmentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CorporateOrderShipmentFormData>({
    resolver: zodResolver(corporateOrderShipmentSchema),
    defaultValues: {
      shipmentNumber: "",
      recipientName: "",
      recipientEmail: "",
      recipientPhone: "",
      shippingAddress: "",
      pudoLockerName: "",
      pudoLockerAddress: "",
      trackingNumber: "",
      shippingCost: 85.00,
      status: "pending",
      notes: "",
      expectedDeliveryDate: "",
    },
  });

  // Create shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: (data: CorporateOrderShipmentFormData) => {
      const payload = {
        corporateOrderId,
        ...data,
      };
      return apiRequest('POST', '/api/admin/corporate-order-shipments', payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shipment created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/corporate-orders', corporateOrderId] });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create shipment",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CorporateOrderShipmentFormData) => {
    createShipmentMutation.mutate(data);
  };

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "preparing", label: "Preparing" },
    { value: "shipped", label: "Shipped" },
    { value: "in_transit", label: "In Transit" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="space-y-6">
      {/* Create Shipment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Create New Shipment
          </CardTitle>
          <CardDescription>
            Create a new shipment for individual employee delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Shipment Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Shipment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipmentNumber">Shipment Number *</Label>
                  <Input
                    id="shipmentNumber"
                    {...form.register("shipmentNumber")}
                    placeholder="SHIP-001"
                  />
                  {form.formState.errors.shipmentNumber && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.shipmentNumber.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
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
              </div>
            </div>

            {/* Recipient Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recipient Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Recipient Name *</Label>
                  <Input
                    id="recipientName"
                    {...form.register("recipientName")}
                    placeholder="John Doe"
                  />
                  {form.formState.errors.recipientName && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.recipientName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Recipient Email *</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    {...form.register("recipientEmail")}
                    placeholder="john.doe@company.com"
                  />
                  {form.formState.errors.recipientEmail && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.recipientEmail.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientPhone">Recipient Phone</Label>
                <Input
                  id="recipientPhone"
                  {...form.register("recipientPhone")}
                  placeholder="+27 XX XXX XXXX"
                />
              </div>
            </div>

            {/* Delivery Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Delivery Information</h3>
              <div className="space-y-2">
                <Label htmlFor="shippingAddress">Shipping Address *</Label>
                <Textarea
                  id="shippingAddress"
                  {...form.register("shippingAddress")}
                  placeholder="123 Main Street, City, Province, Postal Code"
                  rows={3}
                />
                {form.formState.errors.shippingAddress && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.shippingAddress.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pudoLockerName">PUDO Locker Name</Label>
                  <Input
                    id="pudoLockerName"
                    {...form.register("pudoLockerName")}
                    placeholder="Locker Name (if applicable)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pudoLockerAddress">PUDO Locker Address</Label>
                  <Input
                    id="pudoLockerAddress"
                    {...form.register("pudoLockerAddress")}
                    placeholder="Locker Address (if applicable)"
                  />
                </div>
              </div>
            </div>

            {/* Tracking & Costs */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tracking & Costs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trackingNumber">Tracking Number</Label>
                  <Input
                    id="trackingNumber"
                    {...form.register("trackingNumber")}
                    placeholder="TRK123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shippingCost">Shipping Cost (R) *</Label>
                  <Input
                    id="shippingCost"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register("shippingCost", { valueAsNumber: true })}
                    placeholder="85.00"
                  />
                  {form.formState.errors.shippingCost && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.shippingCost.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
                <Input
                  id="expectedDeliveryDate"
                  type="date"
                  {...form.register("expectedDeliveryDate")}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Any special delivery instructions or notes..."
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
                disabled={createShipmentMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 order-1 sm:order-2"
              >
                {createShipmentMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Shipment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}