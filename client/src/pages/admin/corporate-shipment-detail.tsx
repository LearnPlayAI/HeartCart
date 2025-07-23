import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Package, Truck, MapPin, Calendar, User, Phone, Mail, FileText, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import AdminLayout from "@/components/admin/layout";

interface CorporateOrderItem {
  id: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  employeeName: string;
  employeeEmail: string;
  employeePhone: string;
  employeeAddress: string;
  size?: string;
  color?: string;
}

interface CorporateShipment {
  id: number;
  corporateOrderId: number;
  packageId: string;
  employeeName: string;
  deliveryAddress: string;
  specialInstructions?: string;
  estimatedDeliveryDate?: string;
  trackingNumber?: string;
  shippingStatus: string;
  shippingProvider?: string;
  shippingCost?: string;
  pudoTrackingUrl?: string;
  actualDeliveryDate?: string;
  deliveryNotes?: string;
  createdAt: string;
  updatedAt: string;
  items: CorporateOrderItem[];
}

export default function CorporateShipmentDetailPage() {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<CorporateShipment>>({});

  // Fetch shipment details
  const { data: shipmentData, isLoading } = useQuery({
    queryKey: [`/api/admin/corporate-shipments/${shipmentId}`],
    queryFn: () => apiRequest('GET', `/api/admin/corporate-shipments/${shipmentId}`),
    enabled: !!shipmentId
  });

  // Update shipment mutation
  const updateShipmentMutation = useMutation({
    mutationFn: async (updateData: Partial<CorporateShipment>) => {
      const response = await apiRequest('PUT', `/api/admin/corporate-shipments/${shipmentId}`, updateData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shipment updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/corporate-shipments/${shipmentId}`] });
      setEditMode(false);
      setEditData({});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update shipment",
        variant: "destructive",
      });
    },
  });

  const shipment = shipmentData?.shipment;

  const handleEdit = () => {
    setEditMode(true);
    setEditData({
      trackingNumber: shipment?.trackingNumber || "",
      shippingStatus: shipment?.shippingStatus || "pending",
      shippingProvider: shipment?.shippingProvider || "",
      shippingCost: shipment?.shippingCost || "",
      pudoTrackingUrl: shipment?.pudoTrackingUrl || "",
      actualDeliveryDate: shipment?.actualDeliveryDate || "",
      deliveryNotes: shipment?.deliveryNotes || "",
      specialInstructions: shipment?.specialInstructions || "",
    });
  };

  const handleSave = () => {
    updateShipmentMutation.mutate(editData);
  };

  const handleCancel = () => {
    setEditMode(false);
    setEditData({});
  };

  const handleBackNavigation = () => {
    // Navigate back to corporate order detail page
    if (shipment?.corporateOrderId) {
      navigate(`/admin/corporate-orders/${shipment.corporateOrderId}`);
    } else {
      navigate('/admin/corporate-orders');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'secondary';
      case 'processing': return 'default';
      case 'shipped': return 'default';
      case 'in_transit': return 'default';
      case 'out_for_delivery': return 'default';
      case 'delivered': return 'default';
      case 'failed_delivery': return 'destructive';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleBackNavigation}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Corporate Orders
            </Button>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!shipment) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleBackNavigation}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Corporate Orders
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Shipment Not Found</h3>
              <p className="text-muted-foreground">
                The requested shipment could not be found.
              </p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleBackNavigation}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Corporate Order
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Employee Shipment: {shipment.packageId}</h1>
              <p className="text-muted-foreground">
                Shipment for {shipment.employeeName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!editMode ? (
              <Button onClick={handleEdit}>
                <FileText className="h-4 w-4 mr-2" />
                Edit Shipment
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={updateShipmentMutation.isPending}
                >
                  {updateShipmentMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee & Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Employee & Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Employee Name</Label>
                  <p className="font-medium">{shipment.employeeName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Email</Label>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    {shipment.items[0]?.employeeEmail || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Phone</Label>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    {shipment.items[0]?.employeePhone || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Delivery Address</Label>
                  <p className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <span>{shipment.deliveryAddress}</span>
                  </p>
                </div>
                {(shipment.specialInstructions || editMode) && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Special Instructions</Label>
                    {editMode ? (
                      <Textarea
                        value={editData.specialInstructions || ""}
                        onChange={(e) => setEditData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                        placeholder="Special delivery instructions"
                        rows={3}
                      />
                    ) : (
                      <p>{shipment.specialInstructions || "None"}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shipping & Tracking Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping & Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Shipping Status</Label>
                  {editMode ? (
                    <Select
                      value={editData.shippingStatus || ""}
                      onValueChange={(value) => setEditData(prev => ({ ...prev, shippingStatus: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="failed_delivery">Failed Delivery</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(shipment.shippingStatus)}>
                        {shipment.shippingStatus.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Tracking Number</Label>
                  {editMode ? (
                    <Input
                      value={editData.trackingNumber || ""}
                      onChange={(e) => setEditData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                      placeholder="Enter tracking number"
                    />
                  ) : (
                    <p className="font-mono text-sm bg-gray-50 p-2 rounded">
                      {shipment.trackingNumber || "Not assigned"}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Shipping Provider</Label>
                  {editMode ? (
                    <Select
                      value={editData.shippingProvider || ""}
                      onValueChange={(value) => setEditData(prev => ({ ...prev, shippingProvider: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PUDO">PUDO Lockers</SelectItem>
                        <SelectItem value="PostNet">PostNet</SelectItem>
                        <SelectItem value="CourierGuy">The Courier Guy</SelectItem>
                        <SelectItem value="FastWay">Fastway Couriers</SelectItem>
                        <SelectItem value="DawnWing">Dawn Wing</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p>{shipment.shippingProvider || "Not specified"}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Shipping Cost</Label>
                  {editMode ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editData.shippingCost || ""}
                      onChange={(e) => setEditData(prev => ({ ...prev, shippingCost: e.target.value }))}
                      placeholder="0.00"
                    />
                  ) : (
                    <p>{shipment.shippingCost ? formatCurrency(parseFloat(shipment.shippingCost)) : "Not specified"}</p>
                  )}
                </div>

                {(shipment.pudoTrackingUrl || editMode) && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">PUDO Tracking URL</Label>
                    {editMode ? (
                      <Input
                        value={editData.pudoTrackingUrl || ""}
                        onChange={(e) => setEditData(prev => ({ ...prev, pudoTrackingUrl: e.target.value }))}
                        placeholder="https://pudo.co.za/track/..."
                      />
                    ) : (
                      shipment.pudoTrackingUrl ? (
                        <a 
                          href={shipment.pudoTrackingUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-pink-600 hover:text-pink-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Track Package
                        </a>
                      ) : (
                        <p>Not available</p>
                      )
                    )}
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-gray-600">Estimated Delivery Date</Label>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    {shipment.estimatedDeliveryDate || "Not set"}
                  </p>
                </div>

                {(shipment.actualDeliveryDate || editMode) && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Actual Delivery Date</Label>
                    {editMode ? (
                      <Input
                        type="date"
                        value={editData.actualDeliveryDate || ""}
                        onChange={(e) => setEditData(prev => ({ ...prev, actualDeliveryDate: e.target.value }))}
                      />
                    ) : (
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        {shipment.actualDeliveryDate || "Not delivered"}
                      </p>
                    )}
                  </div>
                )}

                {(shipment.deliveryNotes || editMode) && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Delivery Notes</Label>
                    {editMode ? (
                      <Textarea
                        value={editData.deliveryNotes || ""}
                        onChange={(e) => setEditData(prev => ({ ...prev, deliveryNotes: e.target.value }))}
                        placeholder="Notes about the delivery"
                        rows={3}
                      />
                    ) : (
                      <p>{shipment.deliveryNotes || "None"}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shipment Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Items in This Shipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {shipment.items.map((item: CorporateOrderItem) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.productName}</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>SKU: {item.productSku}</div>
                      <div>Quantity: {item.quantity}</div>
                      {item.size && <div>Size: {item.size}</div>}
                      {item.color && <div>Color: {item.color}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(parseFloat(item.totalPrice))}</p>
                    <p className="text-sm text-gray-600">{formatCurrency(parseFloat(item.unitPrice))} each</p>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center font-medium">
                  <span>Total Shipment Value:</span>
                  <span>
                    {formatCurrency(
                      shipment.items.reduce((total: number, item: CorporateOrderItem) => 
                        total + parseFloat(item.totalPrice), 0
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}