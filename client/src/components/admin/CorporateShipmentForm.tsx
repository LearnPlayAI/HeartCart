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

const corporateShipmentSchema = z.object({
  employeeName: z.string().min(1, "Employee name is required"),
  employeeAddress: z.string().min(1, "Employee address is required"),
  employeeCity: z.string().min(1, "City is required"),
  employeePostalCode: z.string().min(1, "Postal code is required"),
  packageContents: z.string().min(1, "Package contents are required"),
  pudoShippingCost: z.string().min(1, "Shipping cost is required"),
  pudoTrackingNumber: z.string().optional(),
  shipmentStatus: z.string().min(1, "Shipment status is required"),
  notes: z.string().optional(),
});

type CorporateShipmentFormData = z.infer<typeof corporateShipmentSchema>;

interface CorporateShipment {
  id: number;
  corporateOrderId: number;
  employeeName: string;
  employeeAddress: string;
  employeeCity: string;
  employeePostalCode: string;
  packageContents: any;
  pudoShippingCost: string;
  pudoTrackingNumber: string | null;
  shipmentStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CorporateShipmentFormProps {
  corporateOrderId: number;
  shipment?: CorporateShipment;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CorporateShipmentForm({ corporateOrderId, shipment, onSuccess, onCancel }: CorporateShipmentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CorporateShipmentFormData>({
    resolver: zodResolver(corporateShipmentSchema),
    defaultValues: {
      employeeName: shipment?.employeeName || "",
      employeeAddress: shipment?.employeeAddress || "",
      employeeCity: shipment?.employeeCity || "",
      employeePostalCode: shipment?.employeePostalCode || "",
      packageContents: typeof shipment?.packageContents === 'string' 
        ? shipment.packageContents 
        : JSON.stringify(shipment?.packageContents || ""),
      pudoShippingCost: shipment?.pudoShippingCost || "85.00",
      pudoTrackingNumber: shipment?.pudoTrackingNumber || "",
      shipmentStatus: shipment?.shipmentStatus || "pending",
      notes: shipment?.notes || "",
    },
  });

  // Create or update corporate shipment mutation
  const saveMutation = useMutation({
    mutationFn: (data: CorporateShipmentFormData) => {
      if (shipment) {
        return apiRequest('PATCH', `/api/admin/corporate-orders/${corporateOrderId}/shipments/${shipment.id}`, data);
      } else {
        return apiRequest('POST', `/api/admin/corporate-orders/${corporateOrderId}/shipments`, data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: shipment ? "Shipment updated successfully" : "Shipment created successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${shipment ? 'update' : 'create'} shipment`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CorporateShipmentFormData) => {
    saveMutation.mutate(data);
  };

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "shipped", label: "Shipped" },
    { value: "in_transit", label: "In Transit" },
    { value: "delivered", label: "Delivered" },
    { value: "returned", label: "Returned" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const commonCities = [
    "Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth",
    "Bloemfontein", "East London", "Polokwane", "Nelspruit", "Kimberley"
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{shipment ? "Edit Shipment" : "Create Shipment"}</CardTitle>
        <CardDescription>
          {shipment ? "Update the shipment details" : "Create a new shipment for individual employee delivery"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Employee Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Employee Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeName">Employee Name *</Label>
                <Input
                  id="employeeName"
                  {...form.register("employeeName")}
                  placeholder="Enter employee's full name"
                />
                {form.formState.errors.employeeName && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.employeeName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeCity">City *</Label>
                <Select 
                  value={form.watch("employeeCity")} 
                  onValueChange={(value) => form.setValue("employeeCity", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.employeeCity && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.employeeCity.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeAddress">Address *</Label>
              <Input
                id="employeeAddress"
                {...form.register("employeeAddress")}
                placeholder="Enter street address"
              />
              {form.formState.errors.employeeAddress && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.employeeAddress.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeePostalCode">Postal Code *</Label>
              <Input
                id="employeePostalCode"
                {...form.register("employeePostalCode")}
                placeholder="Enter postal code"
              />
              {form.formState.errors.employeePostalCode && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.employeePostalCode.message}
                </p>
              )}
            </div>
          </div>

          {/* Package Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Package Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="packageContents">Package Contents *</Label>
              <Textarea
                id="packageContents"
                {...form.register("packageContents")}
                placeholder="Describe the items being shipped to this employee..."
                rows={3}
              />
              {form.formState.errors.packageContents && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.packageContents.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pudoShippingCost">Shipping Cost (R) *</Label>
                <Input
                  id="pudoShippingCost"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("pudoShippingCost")}
                  placeholder="85.00"
                />
                {form.formState.errors.pudoShippingCost && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.pudoShippingCost.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pudoTrackingNumber">Tracking Number</Label>
                <Input
                  id="pudoTrackingNumber"
                  {...form.register("pudoTrackingNumber")}
                  placeholder="Enter tracking number when available"
                />
              </div>
            </div>
          </div>

          {/* Shipment Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Shipment Status</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shipmentStatus">Status *</Label>
                <Select 
                  value={form.watch("shipmentStatus")} 
                  onValueChange={(value) => form.setValue("shipmentStatus", value)}
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
                {form.formState.errors.shipmentStatus && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.shipmentStatus.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Add any additional notes about this shipment..."
                rows={3}
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {shipment ? "Update Shipment" : "Create Shipment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}